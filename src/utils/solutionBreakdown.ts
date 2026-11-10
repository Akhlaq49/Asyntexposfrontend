// xlsx-js-style: SheetJS that also writes cell styles (the floor colours)
import * as XLSX from 'xlsx-js-style';

/**
 * Drawing to Solution: the suggested solution as a product breakdown per area, in the layout of the company's
 * quotation sheets (e.g. "Mrs. Sobia Malik"): the client's name; every floor over its rooms; a row per product with
 * its unit price, quantity and total and how many go to each room; then installation charges and the total.
 *
 * Where the drawing reader placed a product in rooms, those numbers are used. Otherwise (a building-size package
 * quantity, or a company without drawing rules) the quantity is spread over the rooms that suit the product, the way
 * the sheets are made by hand: switches in every room (more where there are more points), touch panels and curtains
 * in lounges and drawing rooms, locks at the entrance and master bedrooms, IR remotes where there is an AC / TV,
 * gas sensors in kitchens, motion sensors on stairs and passages ... A product that suits no room (an EV charger)
 * keeps its quantity in Qty only.
 */
export const WHOLE_FLOOR = 'Whole floor';

/** each floor's colour (floor heading) and a lighter shade of it (its rooms' headings), in turn; on the page and the Excel */
export const FLOOR_COLORS = [
  { floor: 'F4B183', room: 'FBE5D6' },   // orange
  { floor: 'A9D18E', room: 'E2F0D9' },   // green
  { floor: '9DC3E6', room: 'DEEBF7' },   // blue
  { floor: 'FFD966', room: 'FFF2CC' },   // yellow
  { floor: 'B4A7D6', room: 'E4DFEC' },   // purple
  { floor: 'F4A6A6', room: 'FBE1E1' },   // red
];
export const floorColor = (index: number) => FLOOR_COLORS[index % FLOOR_COLORS.length];
const UNASSIGNED = 'Unassigned';

/** what a solution line brings (drawingService SolutionLineResult) */
export interface BreakdownLine {
  itemId: number; name: string; productId: number | null; productName: string | null; quantity: number;
  groupName?: string | null;
  unitPrice?: number | null;
  /** quantity per "Floor / Area" (or per floor name alone: the whole floor), as placed by the drawing reader */
  areas: Record<string, number>;
}
/** a reviewed drawing's floor (drawingService DrawingFloor) */
export interface BreakdownFloorIn {
  name: string;
  areas: { name: string; roomType?: string | null; items?: Record<string, number> }[];
}
export interface BreakdownRow {
  product: string;
  /** null: no price (not in the inventory, or the product's price is 0) */
  unitPrice: number | null;
  quantity: number;
  total: number | null;
  /** quantity per column (floors' rooms in order); null = none */
  byArea: (number | null)[];
  /** all of the quantity is in the rooms shown */
  inAreas: boolean;
  /** the rooms were chosen here (the drawing reader didn't place this product) */
  spread: boolean;
}
export interface SolutionBreakdown {
  floors: { name: string; areas: string[] }[];
  rows: BreakdownRow[];
  subtotal: number;
  installation: number;
  total: number;
  /** every product has a price */
  priced: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Room { key: string; floor: number; name: string; type: string; points: Record<string, number> }
const pts = (r: Room, ...k: string[]) => k.reduce((s, x) => s + (r.points[x] || 0), 0);
const named = (r: Room, re: RegExp) => re.test(r.name);
const LIVING = new Set(['lounge', 'dining']);
/** sheet / title-block text the reader can take for a room ("SEAT SWITCH DRAWING", "DRAWING REGISTER", an office
 *  address); "DRAWING ROOM" and "DRAWING / DINING" are rooms */
const TITLE_TEXT = /\b(drawing(?!\s*(room|rm|\/|\\|&|and|din))|layout|register|title|copyright|confidential|issued|office|scale|sheet|plan)\b/i;

/** the kind of product, from its name / group: which rooms it goes to */
type Kind = 'switch' | 'panel' | 'lock' | 'curtain' | 'rail' | 'ir' | 'gas' | 'smoke' | 'motion' | 'climate' | 'door' | 'camera' | 'none';
export function productKind(name: string): Kind {
  const n = name.toLowerCase();
  if (/curtain\s*(track|rail)|\btrack\b|\brail\b/.test(n)) return 'rail';
  if (/curtain|blind|shade/.test(n)) return 'curtain';
  if (/\block\b|smart\s*lock/.test(n)) return 'lock';
  if (/\bgas\b|leak/.test(n)) return 'gas';
  if (/smoke|fire/.test(n)) return 'smoke';
  if (/motion|presence|\bpir\b|occupancy/.test(n)) return 'motion';
  if (/\bir\b|remote|blaster/.test(n)) return 'ir';
  if (/temp|humid|climate|thermostat/.test(n)) return 'climate';
  if (/intercom|door\s*bell|doorbell|gate|door\s*phone|video\s*door/.test(n)) return 'door';
  if (/camera|cctv/.test(n)) return 'camera';
  if (/panel|hpad|touch|screen|display/.test(n)) return 'panel';
  if (/switch|gang|dimmer|socket/.test(n)) return 'switch';
  return 'none';
}

/** the rooms a kind of product goes to, best first; weights for switch boards */
function roomsFor(kind: Kind, rooms: Room[]): { rooms: Room[]; weight?: (r: Room) => number } {
  const by = (...tests: ((r: Room) => boolean)[]) => {
    const out: Room[] = [];
    for (const t of tests) for (const r of rooms) if (t(r) && !out.includes(r)) out.push(r);
    return out;
  };
  switch (kind) {
    case 'switch': return { rooms, weight: (r) => 1 + pts(r, 'light', 'fan', 'exhaust_fan', 'switch', 'socket_5A', 'socket_15A', 'curtain') };
    case 'panel': return { rooms: by((r) => LIVING.has(r.type), (r) => r.type === 'bedroom') };
    case 'lock': {
      // the main door (one entrance: the room with the main door point or named so, else the first foyer / porch),
      // then the master bedrooms, then the other bedrooms
      const door = rooms.find((r) => pts(r, 'main_door') > 0 || named(r, /entr|main\s*door/i)) ?? rooms.find((r) => named(r, /foyer|porch/i));
      return { rooms: by((r) => r === door, (r) => r.type === 'bedroom' && named(r, /master|\bm\.?\s*bed/i), (r) => r.type === 'bedroom') };
    }
    case 'curtain': case 'rail': return { rooms: by((r) => LIVING.has(r.type) || pts(r, 'curtain') > 0, (r) => r.type === 'bedroom') };
    case 'ir': return { rooms: by((r) => pts(r, 'ac_point', 'tv_point') > 0, (r) => r.type === 'bedroom' || LIVING.has(r.type)) };
    case 'gas': return { rooms: by((r) => r.type === 'kitchen') };
    case 'smoke': return { rooms: by((r) => pts(r, 'smoke_detector') > 0, (r) => r.type === 'kitchen', (r) => LIVING.has(r.type) || r.type === 'bedroom') };
    case 'motion': return { rooms: by((r) => r.type === 'stairs' || r.type === 'corridor', (r) => r.type === 'garage') };
    case 'door': return { rooms: by((r) => named(r, /entr|main|gate|porch|foyer/i) || pts(r, 'bell', 'intercom', 'main_door') > 0, (r) => r.type === 'corridor') };
    case 'camera': return { rooms: by((r) => pts(r, 'cctv') > 0, (r) => r.type === 'garage' || named(r, /porch|entr|gate|lawn/i)) };
    default: return { rooms: [] };
  }
}

/** n whole units over the rooms: with weights, one each (heaviest first) then the rest by weight; else in turn */
function spread(n: number, rooms: Room[], weight?: (r: Room) => number): Map<string, number> {
  const out = new Map<string, number>();
  if (n <= 0 || rooms.length === 0) return out;
  const add = (r: Room, k: number) => out.set(r.key, (out.get(r.key) || 0) + k);
  if (!weight) { for (let i = 0; i < n; i++) add(rooms[i % rooms.length], 1); return out; }
  const order = [...rooms].sort((a, b) => weight(b) - weight(a));
  const first = Math.min(n, order.length);
  order.slice(0, first).forEach((r) => add(r, 1));
  let left = n - first;
  if (left > 0) {
    const total = order.reduce((s, r) => s + weight(r), 0);
    const shares = order.map((r) => ({ r, exact: (left * weight(r)) / total }));
    shares.forEach((s) => { const k = Math.floor(s.exact); if (k) add(s.r, k); });
    left -= shares.reduce((s, x) => s + Math.floor(x.exact), 0);
    shares.sort((a, b) => (b.exact % 1) - (a.exact % 1)).slice(0, left).forEach((s) => add(s.r, 1));
  }
  return out;
}

export function solutionBreakdown(lines: BreakdownLine[], floors: BreakdownFloorIn[], installation = 0): SolutionBreakdown {
  // the rooms of the reviewed drawing ("Unassigned" is not a room); every room is a column, as on the sheets
  const rooms: Room[] = floors.flatMap((f, fi) => f.areas.filter((a) => a.name !== UNASSIGNED).map((a) => ({
    key: `${f.name} / ${a.name}`, floor: fi, name: a.name, type: (a.roomType || '').toLowerCase(), points: a.items || {},
  })));

  // one row per inventory product (two catalogue items can be the same product); items not in the inventory by name
  type Acc = { product: string; group: string; unitPrice: number | null; quantity: number; areas: Record<string, number>; open: number };
  const merged = new Map<string, Acc>();
  for (const l of lines) {
    if (!l.quantity) continue;
    const key = l.productId != null ? `p${l.productId}` : `i${l.itemId}`;
    const price = l.unitPrice != null && l.unitPrice > 0 ? l.unitPrice : null;
    const row = merged.get(key) ?? { product: l.productName || l.name, group: l.groupName || '', unitPrice: price, quantity: 0, areas: {}, open: 0 };
    row.quantity = round2(row.quantity + l.quantity);
    if (row.unitPrice == null) row.unitPrice = price;
    const placed = Object.values(l.areas || {}).reduce((s, q) => s + q, 0);
    for (const [a, q] of Object.entries(l.areas || {})) row.areas[a] = round2((row.areas[a] || 0) + q);
    row.open = round2(row.open + Math.max(0, l.quantity - placed));   // not placed by the reader
    merged.set(key, row);
  }

  // place what the reader didn't: curtain motors first, so the rail follows them
  const accs = [...merged.values()];
  const spreadRows = new Set<Acc>();
  // the kind from the product's name, else from its group ("Touch Panel", "Smart Access" ...)
  const kinds = new Map(accs.map((a) => { const k = productKind(a.product); return [a, k !== 'none' ? k : productKind(a.group)]; }));
  // a temperature / humidity sensor is for a whole floor
  const floorRooms: Room[] = floors.filter((f) => f.areas.some((a) => a.name !== UNASSIGNED)).map((f, fi) => ({ key: f.name, floor: fi, name: f.name, type: 'floor', points: {} }));
  // products go to rooms with electrical points on the drawing: text the reader took for a room (the title block,
  // "DRAWING REGISTER", an office address) has none
  const withPoints = rooms.filter((r) => Object.values(r.points).some((n) => n > 0) && !TITLE_TEXT.test(r.name));
  const placeIn = withPoints.length ? withPoints : rooms;
  const motorRooms = new Map<string, number>();
  // products of the same kind take turns over the rooms (Smart Panel Echo and Q2: one lounge each)
  const turn = new Map<Kind, number>();
  const ordered = [...accs].sort((a, b) => Number(kinds.get(a) === 'rail') - Number(kinds.get(b) === 'rail'));
  for (const a of ordered) {
    const whole = Math.floor(a.open);
    if (whole <= 0) continue;
    const kind = kinds.get(a)!;
    let target = kind === 'climate' ? { rooms: floorRooms } as ReturnType<typeof roomsFor> : roomsFor(kind, placeIn);
    if (kind === 'rail' && motorRooms.size) {
      const withMotor = placeIn.filter((r) => motorRooms.has(r.key));
      target = { rooms: withMotor, weight: (r) => motorRooms.get(r.key) || 0 };
    }
    const start = target.weight ? 0 : (turn.get(kind) || 0) % Math.max(1, target.rooms.length);
    const got = spread(whole, [...target.rooms.slice(start), ...target.rooms.slice(0, start)], target.weight);
    turn.set(kind, (turn.get(kind) || 0) + whole);
    if (!got.size) continue;
    got.forEach((q, k) => { a.areas[k] = round2((a.areas[k] || 0) + q); if (kind === 'curtain') motorRooms.set(k, (motorRooms.get(k) || 0) + q); });
    spreadRows.add(a);
  }

  // the columns, as on the sheets: the rooms that get products, floor by floor in the drawing's order (+ "Whole floor"
  // when something is for a floor); when nothing is placed anywhere, the rooms with points, so the layout stays
  const used = new Set(accs.flatMap((a) => Object.entries(a.areas).filter(([, q]) => q).map(([k]) => k)));
  if (used.size === 0) placeIn.forEach((r) => used.add(r.key));
  const cols = floors.map((f) => ({
    name: f.name,
    areas: [...new Set(f.areas.map((a) => a.name))].filter((a) => used.has(`${f.name} / ${a}`)).concat(used.has(f.name) ? [WHOLE_FLOOR] : []),
  })).filter((f) => f.areas.length > 0);
  const keys = cols.flatMap((f) => f.areas.map((a) => (a === WHOLE_FLOOR ? f.name : `${f.name} / ${a}`)));

  const rows: BreakdownRow[] = accs.map((a) => {
    const byArea = keys.map((k) => a.areas[k] || null);
    return {
      product: a.product, unitPrice: a.unitPrice, quantity: a.quantity,
      total: a.unitPrice == null ? null : round2(a.unitPrice * a.quantity),
      byArea, inAreas: round2(byArea.reduce<number>((s, v) => s + (v || 0), 0)) === a.quantity, spread: spreadRows.has(a),
    };
  });
  const subtotal = round2(rows.reduce((s, r) => s + (r.total || 0), 0));
  const inst = installation > 0 ? installation : 0;
  return { floors: cols, rows, subtotal, installation: inst, total: round2(subtotal + inst), priced: rows.every((r) => r.unitPrice != null) };
}

const colName = (c: number) => XLSX.utils.encode_col(c);
const addr = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
/** the sample sheets' number format (accounting, no decimals, "-" for 0) */
const ACCOUNTING = '_-* #,##0_-;\\-* #,##0_-;_-* "-"??_-;_-@_-';

/** The breakdown as an Excel sheet, laid out like the company's sheets (Mrs. Sobia Malik): row 1 the client,
 *  row 2 each floor over its rooms, row 3 the headings, then a row per product (Qty = its rooms added up,
 *  Total = price x qty, as formulas), the subtotal, installation charges and the total. */
export function breakdownSheet(b: SolutionBreakdown, client: string): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const FIRST = 4;   // column E: the first room
  const areas = b.floors.flatMap((f) => f.areas);
  const last = FIRST + Math.max(areas.length, 1) - 1;
  const set = (r: number, c: number, cell: XLSX.CellObject) => { ws[addr(r, c)] = cell; };
  const thin = { style: 'thin', color: { rgb: '999999' } };
  const box = { top: thin, bottom: thin, left: thin, right: thin };
  const head = (fill: string) => ({ font: { bold: true }, fill: { patternType: 'solid', fgColor: { rgb: fill } }, border: box,
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
  const style = (r: number, c: number, st: object) => { const a = addr(r, c); ws[a] = { ...(ws[a] || { t: 'z' }), s: st } as XLSX.CellObject; };
  const text = (r: number, c: number, v: string) => set(r, c, { t: 's', v });
  const money = (r: number, c: number, v: number, f?: string) => set(r, c, { t: 'n', v, z: ACCOUNTING, ...(f ? { f } : {}) });

  text(0, 0, client.toUpperCase());
  style(0, 0, { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(last, 3) } });
  let c = FIRST;
  b.floors.forEach((f, i) => {
    const color = floorColor(i);
    text(1, c, f.name);
    if (f.areas.length > 1) merges.push({ s: { r: 1, c }, e: { r: 1, c: c + f.areas.length - 1 } });
    // the floor in its colour; its rooms in a lighter shade of it
    for (let k = 0; k < f.areas.length; k++) {
      style(1, c + k, head(color.floor));
      text(2, c + k, f.areas[k]);
      style(2, c + k, head(color.room));
    }
    c += f.areas.length;
  });
  ['Product', 'Unit Price', 'Qty', 'Total'].forEach((h, k) => { text(2, k, h); style(2, k, head('D9D9D9')); });

  let r = 3;
  for (const row of b.rows) {
    const x = r + 1;   // the Excel row number
    text(r, 0, row.product);
    if (row.unitPrice != null) money(r, 1, row.unitPrice);
    row.byArea.forEach((v, k) => { if (v) set(r, FIRST + k, { t: 'n', v }); });
    if (areas.length && row.inAreas) set(r, 2, { t: 'n', v: row.quantity, f: `SUM(${colName(FIRST)}${x}:${colName(last)}${x})` });
    else set(r, 2, { t: 'n', v: row.quantity });   // (in no room, e.g. an EV charger)
    money(r, 3, row.total ?? 0, `B${x}*C${x}`);
    r++;
  }
  const end = r;   // Excel row number of the last product
  money(r, 3, b.subtotal, end >= 4 ? `SUM(D4:D${end})` : undefined);   // the subtotal (unlabelled, as on the sheets)
  const sub = r + 1;
  r++;
  text(r, 0, 'Installation charges');
  money(r, 1, b.installation);
  set(r, 2, { t: 'n', v: 1 });
  money(r, 3, b.installation, `B${r + 1}*C${r + 1}`);
  r++;
  text(r, 0, 'Total');
  money(r, 3, b.total, `SUM(D${sub}:D${r})`);
  style(r, 0, { font: { bold: true } });
  style(r, 3, { font: { bold: true }, fill: { patternType: 'solid', fgColor: { rgb: '92D050' } }, numFmt: ACCOUNTING });   // green, as on the sample
  if (!b.priced) text(r + 2, 0, 'Prices missing for some products - enter them in column B and the totals update.');

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: b.priced ? r : r + 2, c: Math.max(last, 3) } });
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 37 }, { wch: 11 }, { wch: 6 }, { wch: 13 }, ...areas.map((a) => ({ wch: Math.min(16, Math.max(8, a.length + 1)) }))];
  ws['!rows'] = [{}, {}, { hpt: 30 }];
  return ws;
}

/** Downloads the breakdown as an Excel file (with the floor colours) */
export function downloadBreakdown(b: SolutionBreakdown, client: string, fileName: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, breakdownSheet(b, client), 'Solution');
  XLSX.writeFile(wb, fileName);
}
