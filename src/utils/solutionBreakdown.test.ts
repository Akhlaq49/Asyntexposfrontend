import { describe, expect, it } from 'vitest';
import { breakdownSheet, floorColor, productKind, solutionBreakdown, WHOLE_FLOOR } from './solutionBreakdown';

// Mrs. Sobia Malik's house, as the reader gives it (floors, rooms with their type and points)
const room = (name: string, roomType: string, items: Record<string, number> = {}) => ({ name, roomType, items });
const sobia = [
  { name: 'Ground floor', areas: [room('Entrance', 'corridor', { main_door: 1, light: 2 }), room('Ent.StairLobby', 'corridor', { light: 2 }), room('Passage wide', 'corridor', { light: 3 }),
    room('Pow. Room', 'bath', { light: 1 }), room('Lounge', 'lounge', { light: 8, ac_point: 1, tv_point: 1 }), room('Kitchen', 'kitchen', { light: 4 }),
    room('M.Bed & Bath', 'bedroom', { light: 7, ac_point: 1 }), room('stairs', 'stairs', { light: 2 }), room('Unassigned', '', { light: 5 })] },
  { name: 'FIRST FLOOR', areas: [room('Foyer', 'corridor', { light: 2 }), room('M.Bed1', 'bedroom', { light: 6, ac_point: 1 }), room('Lounge', 'lounge', { light: 6, ac_point: 1 }),
    room('Bed 1', 'bedroom', { light: 9, ac_point: 1 }), room('M.Bed2', 'bedroom', { light: 6, ac_point: 1 })] },
  { name: 'BASEMENT', areas: [room('Passage wide', 'corridor', { light: 4 }), room('Lobby', 'corridor', { light: 2 }), room('M.Bed &Bath', 'bedroom', { light: 6, ac_point: 1 }),
    room('Bed1& Bath', 'bedroom', { light: 6, ac_point: 1 }), room('Drw\\Din', 'dining', { light: 6, ac_point: 1 })] },
];
let id = 0;
const line = (name: string, quantity: number, unitPrice: number | null, areas: Record<string, number> = {}, productId: number | null = ++id) =>
  ({ itemId: ++id, name, productId, productName: name, quantity, unitPrice, areas });
// the sample's products; none placed in a room by the reader (a company without drawing rules: all from the package)
const products = [
  line('Smart Panel Q2', 3, 78300), line('Smart Lock i5', 4, 90555), line('Piano Switch 3 Gang', 28, 17980),
  line('Smart Curtain Motor 1.5NM', 3, 33495), line('Curtain Rail 1meter', 15, 9765), line('Motion Sensor', 1, 14738),
  line('Gas Sensor', 1, 18684), line('IR Remote Controll', 7, 12058), line('EV Charger 11kW', 1, 280000),
];
const b = solutionBreakdown(products, sobia, 130000);
const row = (name: string) => b.rows.find((r) => r.product === name)!;
const cols = b.floors.flatMap((f) => f.areas.map((a) => `${f.name} / ${a}`));
const placed = (name: string) => Object.fromEntries(row(name).byArea.map((v, k) => [cols[k], v]).filter(([, v]) => v));

describe('product breakdown per area (the pattern of the Mrs. Sobia Malik sheet)', () => {
  it('every floor over its rooms that get products, in the drawing order ("Unassigned" is not a room)', () => {
    expect(b.floors).toEqual([
      { name: 'Ground floor', areas: ['Entrance', 'Ent.StairLobby', 'Passage wide', 'Pow. Room', 'Lounge', 'Kitchen', 'M.Bed & Bath', 'stairs'] },
      { name: 'FIRST FLOOR', areas: ['Foyer', 'M.Bed1', 'Lounge', 'Bed 1', 'M.Bed2'] },
      { name: 'BASEMENT', areas: ['Passage wide', 'Lobby', 'M.Bed &Bath', 'Bed1& Bath', 'Drw\\Din'] },
    ]);
  });

  it('switches go to every room, more where there are more points; Qty = the rooms added up', () => {
    const r = row('Piano Switch 3 Gang');
    expect(r.byArea.every((v) => (v || 0) >= 1)).toBe(true);
    expect(r.byArea.reduce<number>((s, v) => s + (v || 0), 0)).toBe(28);
    expect(r.inAreas && r.spread).toBe(true);
    expect(placed('Piano Switch 3 Gang')['FIRST FLOOR / Bed 1']).toBeGreaterThan(placed('Piano Switch 3 Gang')['Ground floor / Pow. Room']);
  });

  it('touch panels in the lounges and drawing/dining room', () => {
    expect(placed('Smart Panel Q2')).toEqual({ 'Ground floor / Lounge': 1, 'FIRST FLOOR / Lounge': 1, 'BASEMENT / Drw\\Din': 1 });
  });

  it('locks at the entrance, then the master bedrooms', () => {
    expect(placed('Smart Lock i5')).toEqual({ 'Ground floor / Entrance': 1, 'Ground floor / M.Bed & Bath': 1, 'FIRST FLOOR / M.Bed1': 1, 'FIRST FLOOR / M.Bed2': 1 });
  });

  it('curtain motors in the lounges; the rail follows the motors', () => {
    expect(placed('Smart Curtain Motor 1.5NM')).toEqual({ 'Ground floor / Lounge': 1, 'FIRST FLOOR / Lounge': 1, 'BASEMENT / Drw\\Din': 1 });
    expect(placed('Curtain Rail 1meter')).toEqual({ 'Ground floor / Lounge': 5, 'FIRST FLOOR / Lounge': 5, 'BASEMENT / Drw\\Din': 5 });
  });

  it('gas sensor in the kitchen, motion sensor on the stairs / passages, IR remotes where there is an AC or TV', () => {
    expect(placed('Gas Sensor')).toEqual({ 'Ground floor / Kitchen': 1 });
    expect(Object.keys(placed('Motion Sensor'))).toHaveLength(1);
    expect(['Ground floor / stairs', 'Ground floor / Entrance']).toContain(Object.keys(placed('Motion Sensor'))[0]);
    expect(row('IR Remote Controll').byArea.reduce<number>((s, v) => s + (v || 0), 0)).toBe(7);
    expect(Object.keys(placed('IR Remote Controll')).every((k) => /Lounge|Bed|Drw/.test(k))).toBe(true);
  });

  it('a product that suits no room (EV charger) keeps its quantity in Qty only, as on the sheet', () => {
    expect(row('EV Charger 11kW')).toMatchObject({ quantity: 1, inAreas: false, spread: false });
    expect(row('EV Charger 11kW').byArea.every((v) => v == null)).toBe(true);
  });

  it('the sample\'s totals: products 1,745,348 + installation 130,000 = 1,875,348', () => {
    expect(b.subtotal).toBe(1745348);
    expect(b.total).toBe(1875348);
  });

  it('where the reader placed a product, its rooms are kept as they are', () => {
    const r = solutionBreakdown([line('Gas Sensor', 2, 18684, { 'BASEMENT / Lobby': 2 })], sobia);
    expect(r.rows[0]).toMatchObject({ byArea: expect.arrayContaining([2]), inAreas: true, spread: false });
  });

  it('text taken for a room (no electrical points: title block, "DRAWING REGISTER") gets no products and no column', () => {
    const withJunk = [{ ...sobia[0], areas: [room('DRAWING REGISTER 1', 'lounge'), ...sobia[0].areas] }, sobia[1], sobia[2]];
    const r = solutionBreakdown(products, withJunk);
    expect(r.floors[0].areas).not.toContain('DRAWING REGISTER 1');
    expect(r.floors[0].areas[0]).toBe('Entrance');
  });

  it('sheet titles with points drawn on them ("SEAT SWITCH DRAWING") are not rooms; "DRAWING ROOM" is', () => {
    const f = [{ name: 'Basement', areas: [room('SEAT SWITCH DRAWING', 'lounge', { light: 3 }), room('DRAWING ROOM 1', 'lounge', { light: 2 }), room('HEAD OFFICE LAHORE', 'study', { light: 4 })] }];
    const r = solutionBreakdown([line('Smart Panel Q2', 1, 78300)], f);
    expect(r.floors).toEqual([{ name: 'Basement', areas: ['DRAWING ROOM 1'] }]);
  });

  it('two products of the same kind take turns: one touch panel per lounge', () => {
    const r = solutionBreakdown([line('Harmony HPAD Echo', 1, 217047), line('Harmony HPAD Q2', 1, 78300)], sobia);
    expect(r.rows[0].byArea.findIndex((v) => v)).not.toBe(r.rows[1].byArea.findIndex((v) => v));
  });

  it('nothing placed anywhere: the rooms with points are still the columns', () => {
    const r = solutionBreakdown([line('EV Charger 11kW', 1, 280000)], sobia);
    expect(r.floors.map((f) => f.areas.length)).toEqual([8, 5, 5]);
  });

  it('a temperature / humidity sensor goes to whole floors', () => {
    const r = solutionBreakdown([line('Temp and Humidity Sensor', 3, 9000)], sobia);
    expect(r.floors.every((f) => f.areas.includes(WHOLE_FLOOR))).toBe(true);
  });

  it('the same inventory product from two catalogue items is one row; no price -> no total, flagged', () => {
    const r = solutionBreakdown([line('Piano Switch', 2, 17980, {}, 50), line('Piano Switch', 3, 17980, {}, 50), line('Intercom', 1, null, {}, null)], sobia);
    expect(r.rows.map((x) => [x.product, x.quantity])).toEqual([['Piano Switch', 5], ['Intercom', 1]]);
    expect(r.rows[1].total).toBeNull();
    expect(r.priced).toBe(false);
  });

  it.each([['Harmony HPAD Q2', 'panel'], ['Innshield Smart Door Lock i5', 'lock'], ['Innswitch Piano 3 Gang White', 'switch'], ['Curtain Track/1m', 'rail'],
    ['Motility Smart Curtain Motor 1.5Nm', 'curtain'], ['IR Blaster', 'ir'], ['Smoke Sensor', 'smoke'], ['Human Presence Sensor', 'motion'], ['EV Charger 22KW', 'none']])('%s is a %s', (n, k) =>
    expect(productKind(n)).toBe(k));
});

describe('breakdown Excel sheet (laid out like the sample)', () => {
  const ws = breakdownSheet(b, 'Mrs. Sobia Malik');
  const last = 4 + cols.length - 1;   // 0-based column of the last room

  it('row 1 the client; row 2 each floor over its rooms (merged); row 3 the headings', () => {
    expect(ws.A1.v).toBe('MRS. SOBIA MALIK');
    expect([ws.E2.v, ws.M2.v, ws.R2.v]).toEqual(['Ground floor', 'FIRST FLOOR', 'BASEMENT']);
    expect(ws['!merges']).toEqual(expect.arrayContaining([{ s: { r: 1, c: 4 }, e: { r: 1, c: 11 } }, { s: { r: 1, c: 12 }, e: { r: 1, c: 16 } }]));
    expect(['A3', 'B3', 'C3', 'D3', 'E3', 'M3', 'V3'].map((a) => ws[a].v)).toEqual(['Product', 'Unit Price', 'Qty', 'Total', 'Entrance', 'Foyer', 'Drw\\Din']);
    expect(last).toBe(21);   // column V, as in the sample
  });

  it('a row per product: Qty = SUM of its rooms, Total = price x qty', () => {
    expect(ws.A4.v).toBe('Smart Panel Q2');
    expect(ws.C4).toMatchObject({ v: 3, f: 'SUM(E4:V4)' });
    expect(ws.D4).toMatchObject({ v: 234900, f: 'B4*C4' });
    expect(ws.C12.f).toBeUndefined();   // EV charger: in no room
  });

  it('each floor heading in its own colour, its rooms in a lighter shade of it; the total green', () => {
    const fill = (a: string) => (ws[a].s as { fill: { fgColor: { rgb: string } } }).fill.fgColor.rgb;
    expect([fill('E2'), fill('M2'), fill('R2')]).toEqual([floorColor(0).floor, floorColor(1).floor, floorColor(2).floor]);
    expect(new Set([fill('E2'), fill('M2'), fill('R2')]).size).toBe(3);
    expect([fill('E3'), fill('L3'), fill('M3'), fill('V3')]).toEqual([floorColor(0).room, floorColor(0).room, floorColor(1).room, floorColor(2).room]);
    expect(fill('K2')).toBe(floorColor(0).floor);   // across the floor's merged heading
    expect(fill('D15')).toBe('92D050');
  });

  it('then the subtotal, installation charges (qty 1) and the total', () => {
    expect(ws.D13).toMatchObject({ v: 1745348, f: 'SUM(D4:D12)' });
    expect([ws.A14.v, ws.B14.v, ws.C14.v, ws.D14.f]).toEqual(['Installation charges', 130000, 1, 'B14*C14']);
    expect([ws.A15.v, ws.D15.v, ws.D15.f]).toEqual(['Total', 1875348, 'SUM(D13:D14)']);
  });
});
