import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawingService, checkFile, Extraction, ReadProgress, DrawingArea, Suggestion, Choices, SUPPORTED_LINES, SolutionLineResult,
} from '../../services/drawingService';
import { solutionPackageService, PackageSize } from '../../services/solutionPackageService';

type Plan = 'standard' | 'premium';
const money = (n: number | null | undefined) => (n == null ? '-' : `PKR ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;
/** what the quotation form is filled with (Sales > Quotations), see QuotationList */
export interface DrawingEstimate {
  description: string;
  items: { productId: number; productName: string; quantity: number }[];
  /** not in the inventory (no SKU): a line of its own; unitPrice = its packages-file price, if any */
  unlinked: { name: string; quantity: number; unitPrice?: number | null }[];
}

const POINT_LABELS: Record<string, string> = {
  light: 'Light', fan: 'Fan', exhaust_fan: 'Exhaust fan', socket_5A: 'Socket 5A', socket_15A: 'Socket 15A', switch: 'Switch',
  ac_point: 'AC point', geyser: 'Geyser', tv_point: 'TV point', data_point: 'Data point', db_panel: 'DB / panel', bell: 'Bell',
  cctv: 'CCTV', intercom: 'Intercom', curtain: 'Curtain', smoke_detector: 'Smoke detector', main_door: 'Main door',
};
const ROOM_TYPES = ['bedroom', 'lounge', 'dining', 'kitchen', 'bath', 'dressing', 'corridor', 'stairs', 'store', 'garage', 'laundry', 'servant', 'study', 'lawn', 'balcony'];
const USAGE_LABEL: Record<string, string> = { standard: 'Standard only', premium: 'Premium only', both: 'Both', none: 'Not categorised' };
const PROJECT_LABEL: Record<string, string> = {
  projectName: 'Project', client: 'Client', drawingNumber: 'Drawing no.', scale: 'Scale', date: 'Date', architect: 'Architect / engineer', plotSize: 'Plot size',
};

/**
 * Sales > Drawing to Solution: upload an electrical drawing, review the rooms and points read from it,
 * choose Standard or Premium, and get the suggested solution from Inventory > Solution Packages.
 */
const DrawingSolution: React.FC = () => {
  const navigate = useNavigate();
  const [running, setRunning] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<ReadProgress | null>(null);
  const left = useRef(false);   // the page was left: stop checking on the reading
  // reset on mount too: React StrictMode mounts, unmounts and mounts again, which would leave this stuck at true
  useEffect(() => { left.current = false; return () => { left.current = true; }; }, []);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [sizes, setSizes] = useState<PackageSize[]>([]);
  const [sizeId, setSizeId] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Suggestion | null>(null);
  const [asking, setAsking] = useState<Suggestion | null>(null);
  const [choices, setChoices] = useState<Choices>({});
  const [extraType, setExtraType] = useState('');
  // does the client already use another company's automation? the areas ticked get a Matter gateway each
  const [otherUses, setOtherUses] = useState<'' | 'yes' | 'no'>('');
  const [otherCompany, setOtherCompany] = useState('');
  const [otherAreas, setOtherAreas] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    drawingService.status().then(setRunning).catch(() => setRunning(false));
    solutionPackageService.getAll().then((d) => setSizes(d.sizes)).catch(() => setSizes([]));
  }, []);

  // ── step 1: upload ──
  const pick = (f: File | null) => { setFile(f); setFileError(f ? checkFile(f) || '' : ''); };
  const read = async () => {
    if (!file) { setFileError('Choose the drawing file.'); return; }
    const problem = checkFile(file);
    if (problem) { setFileError(problem); return; }
    setReading(true); setProgress(null); setFileError(''); setResult(null); setAsking(null); setPlan(null); setError(''); setOtherUses(''); setOtherCompany(''); setOtherAreas(new Set());
    try { const ex = await drawingService.extract(file, setProgress, () => left.current); if (!left.current) setExtraction(ex); }
    catch (err) { if (left.current) return; setExtraction(null); setFileError(errorText(err, 'The drawing could not be read.')); }
    setReading(false); setProgress(null);
  };

  // ── step 2: review ──
  const pointTypes = useMemo(() => {
    if (!extraction) return [];
    const found = new Set<string>();
    extraction.floors.forEach((f) => f.areas.forEach((a) => Object.keys(a.items).forEach((k) => found.add(k))));
    return (extraction.pointTypes || Object.keys(POINT_LABELS)).filter((t) => found.has(t)).concat([...found].filter((t) => !(extraction.pointTypes || []).includes(t)));
  }, [extraction]);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const columns = [...pointTypes, ...extraColumns.filter((c) => !pointTypes.includes(c))];

  const edit = (fi: number, ai: number, change: (a: DrawingArea) => DrawingArea) => {
    if (!extraction) return;
    setResult(null); setAsking(null);
    setExtraction({ ...extraction, floors: extraction.floors.map((f, i) => i !== fi ? f : { ...f, areas: f.areas.map((a, j) => j !== ai ? a : change(a)) }) });
  };
  const setCount = (fi: number, ai: number, type: string, value: string) => edit(fi, ai, (a) => {
    const items = { ...a.items };
    const n = Math.max(0, Math.floor(Number(value) || 0));
    if (n) items[type] = n; else delete items[type];
    return { ...a, items };
  });
  const addArea = (fi: number) => {
    if (!extraction) return;
    setResult(null);
    setExtraction({ ...extraction, floors: extraction.floors.map((f, i) => i !== fi ? f : {
      ...f, areas: [...f.areas.filter((a) => a.name !== 'Unassigned'), { name: 'New area', roomType: null, areaSqft: null, dimensions: null, items: {}, confidence: 1 }, ...f.areas.filter((a) => a.name === 'Unassigned')],
    }) });
  };
  const removeArea = (fi: number, ai: number) => {
    if (!extraction) return;
    setResult(null);
    setExtraction({ ...extraction, floors: extraction.floors.map((f, i) => i !== fi ? f : { ...f, areas: f.areas.filter((_, j) => j !== ai) }) });
  };
  const unassignedLeft = extraction ? extraction.floors.reduce((n, f) => n + f.areas.filter((a) => a.name === 'Unassigned').reduce((m, a) => m + Object.values(a.items).reduce((x, y) => x + y, 0), 0), 0) : 0;

  // ── step 3: plan -> suggestion ──
  // the house portion-wise (floor -> its areas) for the "other company" question; "Unassigned" isn't a room
  const areaKey = (floor: string, area: string) => `${floor} / ${area}`;
  const housePortions = useMemo(() => (extraction?.floors || []).map((f) => ({
    floor: f.name, areas: f.areas.filter((a) => a.name !== 'Unassigned').map((a) => ({ key: areaKey(f.name, a.name), name: a.name })),
  })).filter((f) => f.areas.length > 0), [extraction]);
  // areas renamed / removed in the review table drop out of the ticked list
  const tickedAreas = housePortions.flatMap((f) => f.areas.map((a) => a.key)).filter((k) => otherAreas.has(k));
  const otherBrand = otherUses === 'yes' ? { company: otherCompany.trim(), areas: tickedAreas } : null;
  const otherReady = otherUses === 'no' || (otherUses === 'yes' && otherCompany.trim() !== '' && tickedAreas.length > 0);
  const otherChanged = () => { setResult(null); setAsking(null); };
  const tick = (keys: string[], on: boolean) => {
    setOtherAreas((prev) => { const n = new Set(prev); keys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
    otherChanged();
  };

  const run = async (p: Plan, answer: Choices | null) => {
    if (!extraction) return;
    if (!otherReady) { setError("Answer whether the client uses another company's automation products (and tick those areas)."); return; }
    setSuggesting(true); setError('');
    try {
      const res = await drawingService.suggest(extraction, p, answer, sizeId ? Number(sizeId) : null, otherBrand);
      if (res.needsConfirmation) {
        setAsking(res);
        setChoices(Object.fromEntries(res.toConfirm.map((c) => [String(c.itemId), choices[String(c.itemId)] || 'use'])));
      } else { setResult(res); setAsking(null); }
    } catch (err) { setError(errorText(err, 'Could not work out the solution.')); }
    setSuggesting(false);
  };
  const choosePlan = (p: Plan) => { setPlan(p); setResult(null); setAsking(null); };
  const switchPlan = () => { const p: Plan = plan === 'premium' ? 'standard' : 'premium'; setPlan(p); setResult(null); run(p, null); };

  // ── exports (all from the same result, so the totals match) ──
  const title = () => extraction?.project.projectName || extraction?.fileName.replace(/\.[^.]+$/, '') || 'Drawing';
  const rows = (r: Suggestion) => r.lines.map((l) => [l.name, l.groupName || '', USAGE_LABEL[l.usage], l.source === 'drawing' ? 'Drawing' : l.source === 'choice' ? 'Your choice' : l.source === 'other' ? 'Other company' : 'Package',
    l.quantity, l.productName || 'Not in inventory', l.unitPrice == null ? '' : money(l.unitPrice), l.lineTotal == null ? '' : money(l.lineTotal)]);
  const exportExcel = () => {
    if (!result || !extraction) return;
    const head = [[`${title()} - ${result.plan === 'premium' ? 'Premium' : 'Standard'} solution`], [`Building size: ${result.size?.name || '-'} (${result.size?.reason || ''})`],
      ...Object.entries(extraction.project).map(([k, v]) => [`${PROJECT_LABEL[k] || k}: ${v}`]), []];
    const table = [['Item', 'Group', 'Rule', 'From', 'Quantity', 'Inventory product', 'Unit price', 'Total'], ...rows(result),
      ['Total', '', '', '', result.totals.quantity, '', '', money(result.totals.amount ?? 0)]];
    const areaRows = [['Floor / area', 'Item', 'Quantity'], ...result.lines.flatMap((l) => Object.entries(l.areas).map(([a, q]) => [a, l.name, q]))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...head, ...table]), 'Solution');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(areaRows), 'Area-wise');
    XLSX.writeFile(wb, `${title()} - ${result.plan} solution.xlsx`);
  };
  const exportPdf = () => {
    if (!result || !extraction) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.text(`${title()} - ${result.plan === 'premium' ? 'Premium' : 'Standard'} solution`, 14, 15);
    doc.setFontSize(9);
    const info = [`Building size: ${result.size?.name || '-'} (${result.size?.reason || ''})`, ...Object.entries(extraction.project).map(([k, v]) => `${PROJECT_LABEL[k] || k}: ${v}`)];
    info.forEach((t, i) => doc.text(t, 14, 22 + i * 5));
    autoTable(doc, {
      startY: 24 + info.length * 5,
      head: [['Item', 'Group', 'Rule', 'From', 'Quantity', 'Inventory product', 'Unit price', 'Total']],
      body: rows(result).map((r) => r.map(String)),
      foot: [['Total', '', '', '', String(result.totals.quantity), '', '', money(result.totals.amount ?? 0)]],
      styles: { fontSize: 8 }, headStyles: { fillColor: [254, 159, 67] }, footStyles: { fillColor: [240, 240, 240], textColor: 20 },
    });
    doc.save(`${title()} - ${result.plan} solution.pdf`);
  };

  /** the estimate goes to the normal quotation form; prices, discounts and taxes are set there */
  const createQuotation = () => {
    if (!result || !extraction) return;
    const byProduct = new Map<number, { productId: number; productName: string; quantity: number }>();
    const unlinked: DrawingEstimate['unlinked'] = [];
    for (const l of result.lines) {
      // quotation quantities are whole units: a package quantity like 12.5 m of rail is rounded up
      const quantity = Math.ceil(l.quantity);
      if (l.productId == null) { unlinked.push({ name: l.name, quantity, unitPrice: l.unitPrice ?? null }); continue; }
      const e = byProduct.get(l.productId);
      if (e) e.quantity += quantity;
      else byProduct.set(l.productId, { productId: l.productId, productName: l.productName || l.name, quantity });
    }
    const estimate: DrawingEstimate = {
      description: `${title()} - ${result.plan === 'premium' ? 'Premium' : 'Standard'} solution${result.size ? ` (${result.size.name})` : ''}, estimated from the drawing ${extraction.fileName}`
        + (otherBrand ? `. The client uses ${otherBrand.company} automation in ${otherBrand.areas.length} area(s) - Matter gateways included` : ''),
      items: [...byProduct.values()], unlinked,
    };
    navigate('/quotation-list', { state: { drawingEstimate: estimate } });
  };

  const sourceBadge = (l: SolutionLineResult) => l.source === 'drawing'
    ? <span className="badge badge-soft-success" title={l.detail}>Drawing</span>
    : l.source === 'choice' ? <span className="badge badge-soft-warning" title={l.detail}>Your choice</span>
    : l.source === 'other' ? <span className="badge badge-soft-info" title={l.detail}>Other company</span>
      : <span className="badge badge-soft-secondary" title={l.detail}>Package</span>;

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Drawing to Solution</h4>
            <h6>Upload the electrical drawing, check what was read, and get the Standard or Premium solution</h6>
          </div>
        </div>
      </div>

      {running === false && (
        <div className="alert alert-warning py-2">The drawing reader (Drawing2Quote service) is not running, so drawings can't be read right now.</div>
      )}

      {/* 1. upload */}
      <div className="card">
        <div className="card-header"><h5 className="card-title mb-0">1. Upload the drawing</h5></div>
        <div className="card-body">
          <div className="alert alert-info py-2 small drawing-supported">
            {SUPPORTED_LINES.map((line) => <div key={line}>{line}</div>)}
          </div>
          <div className="d-flex gap-2 align-items-start flex-wrap">
            <input ref={fileInput} type="file" className="form-control drawing-file" style={{ maxWidth: 480 }} accept=".dxf,.pdf,.jpg,.jpeg,.png,.bmp,.tif,.tiff,.gif,.webp"
              onChange={(e) => pick(e.target.files?.[0] || null)} />
            <button type="button" className="btn btn-primary" disabled={!file || reading} onClick={read}>
              <i className="ti ti-file-search me-1"></i>{reading ? 'Reading the drawing...' : 'Read Drawing'}
            </button>
          </div>
          {reading && (
            <div className="mt-3 drawing-progress">
              <div className="small mb-1">{progress?.message || 'Uploading the drawing...'}</div>
              <div className="progress" style={{ height: 8 }}>
                {progress?.pages
                  ? <div className="progress-bar" style={{ width: `${Math.round((progress.page - 1) / progress.pages * 100)}%` }} />
                  : <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }} />}
              </div>
              <small className="text-muted">You can keep this page open while it reads; a drawing read once is quick the next time.</small>
            </div>
          )}
          {fileError && <div className="alert alert-danger py-2 mt-3 mb-0 drawing-error">{fileError}</div>}
        </div>
      </div>

      {extraction && (
        <>
          {/* 2. review */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title mb-0">2. Check what was read - {extraction.fileName}</h5>
              <small className="text-muted">{extraction.totals.points} points · {extraction.totals.areaSqft} sq ft of rooms · {extraction.fileType.toUpperCase()}</small>
            </div>
            <div className="card-body">
              {Object.keys(extraction.project).length > 0 && (
                <div className="d-flex flex-wrap gap-3 mb-3 small">
                  {Object.entries(extraction.project).map(([k, v]) => <div key={k}><span className="text-muted">{PROJECT_LABEL[k] || k}:</span> <b>{v}</b></div>)}
                </div>
              )}
              {extraction.electrical === false && (
                <div className="alert alert-danger py-2 small">
                  <i className="ti ti-alert-circle me-1"></i><b>Not an electrical drawing.</b> It has no electrical legend or
                  points (an architectural layout), so the suggested solution is based on the rooms and areas found only -
                  lights, switches and sockets are estimated per room.
                </div>
              )}
              {extraction.warnings.filter((w) => !w.startsWith('Not an electrical drawing')).length > 0 && (
                <div className="alert alert-warning py-2 small">
                  {extraction.warnings.filter((w) => !w.startsWith('Not an electrical drawing'))
                    .map((w, i) => <div key={i}><i className="ti ti-alert-triangle me-1"></i>{w}</div>)}
                </div>
              )}
              <details className="mb-3 small">
                <summary className="text-muted">How the drawing was read ({extraction.log.length} steps)</summary>
                <ul className="mb-0 mt-2">{extraction.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
                {extraction.legend.length > 0 && <div className="mt-2">Legend: {extraction.legend.map((l) => `${l.description} = ${POINT_LABELS[l.type] || l.type}`).join(' · ')}</div>}
              </details>

              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <small className="text-muted">Correct any count, rename areas, and move the "Unassigned" points into their rooms.</small>
                <select className="form-select form-select-sm ms-auto" style={{ width: 'auto' }} value={extraType} onChange={(e) => setExtraType(e.target.value)}>
                  <option value="">Add a point column...</option>
                  {Object.keys(POINT_LABELS).filter((t) => !columns.includes(t)).map((t) => <option key={t} value={t}>{POINT_LABELS[t]}</option>)}
                </select>
                <button type="button" className="btn btn-sm btn-light border" disabled={!extraType} onClick={() => { setExtraColumns([...extraColumns, extraType]); setExtraType(''); }}>Add</button>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-sm align-middle review-table">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ minWidth: 180 }}>Area</th><th style={{ minWidth: 120 }}>Room type</th><th style={{ width: 90 }}>Sq ft</th>
                      {columns.map((c) => <th key={c} className="text-center" style={{ whiteSpace: 'normal', minWidth: 66 }}>{POINT_LABELS[c] || c}</th>)}
                      <th className="text-center">Confidence</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraction.floors.map((f, fi) => (
                      <React.Fragment key={f.name}>
                        <tr className="table-light"><td colSpan={columns.length + 5} className="fw-bold text-primary">{f.name}
                          <button type="button" className="btn btn-link btn-sm py-0" onClick={() => addArea(fi)}><i className="ti ti-plus"></i> Add area</button></td></tr>
                        {f.areas.map((a, ai) => {
                          const unassigned = a.name === 'Unassigned';
                          return (
                            <tr key={ai} className={unassigned ? 'table-warning' : ''}>
                              <td>{unassigned ? <b>Unassigned</b> : (
                                <input className="form-control form-control-sm" style={{ minWidth: 170 }} value={a.name} aria-label="Area name" onChange={(e) => edit(fi, ai, (x) => ({ ...x, name: e.target.value }))} />)}
                                {a.dimensions && <small className="text-muted">{a.dimensions}</small>}
                              </td>
                              <td>{!unassigned && (
                                <select className="form-select form-select-sm" style={{ minWidth: 115 }} value={a.roomType || ''} onChange={(e) => edit(fi, ai, (x) => ({ ...x, roomType: e.target.value || null }))}>
                                  <option value="">-</option>
                                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>)}
                              </td>
                              <td>{!unassigned && (
                                <input type="number" min={0} className="form-control form-control-sm" style={{ minWidth: 80 }} value={a.areaSqft ?? ''} onChange={(e) => edit(fi, ai, (x) => ({ ...x, areaSqft: e.target.value === '' ? null : Number(e.target.value) }))} />)}
                              </td>
                              {columns.map((c) => (
                                <td key={c} className="p-1">
                                  <input type="number" min={0} className="form-control form-control-sm text-center" style={{ minWidth: 58 }} placeholder="0" aria-label={`${f.name} ${a.name} ${c}`}
                                    value={a.items[c] || ''} onChange={(e) => setCount(fi, ai, c, e.target.value)} />
                                </td>
                              ))}
                              <td className="text-center">{unassigned ? '-' : <span className={`badge ${a.confidence >= 0.85 ? 'badge-soft-success' : a.confidence >= 0.7 ? 'badge-soft-warning' : 'badge-soft-danger'}`}>{Math.round(a.confidence * 100)}%</span>}</td>
                              <td><button type="button" className="btn btn-sm btn-light border p-1 lh-1" title="Remove area" onClick={() => removeArea(fi, ai)}><i className="ti ti-trash"></i></button></td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {unassignedLeft > 0 && <small className="text-warning">{unassignedLeft} point(s) are still unassigned - they are counted in the solution, but not in any room.</small>}
            </div>
          </div>

          {/* 3. plan */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">3. Choose the solution</h5></div>
            <div className="card-body d-flex align-items-end gap-4 flex-wrap">
              <div>
                <label className="form-label mb-1">Building size</label>
                <select className="form-select drawing-size" style={{ minWidth: 220 }} value={sizeId} onChange={(e) => { setSizeId(e.target.value); setResult(null); setAsking(null); }}>
                  <option value="">Work it out from the drawing</option>
                  {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label mb-1 d-block">Plan</label>
                {(['standard', 'premium'] as const).map((p) => (
                  <div key={p} className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="plan" id={`plan-${p}`} checked={plan === p} onChange={() => choosePlan(p)} />
                    <label className="form-check-label" htmlFor={`plan-${p}`}>{p === 'standard' ? 'Standard' : 'Premium'}</label>
                  </div>
                ))}
              </div>
            </div>
            {/* another company's automation -> Matter gateways */}
            <div className="card-body border-top other-brand">
              <label className="form-label d-block mb-1">Is the client using automation products of any other company?</label>
              {(['yes', 'no'] as const).map((v) => (
                <div key={v} className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" name="other-uses" id={`other-${v}`} checked={otherUses === v}
                    onChange={() => { setOtherUses(v); otherChanged(); }} />
                  <label className="form-check-label" htmlFor={`other-${v}`}>{v === 'yes' ? 'Yes' : 'No'}</label>
                </div>
              ))}
              {otherUses === 'yes' && (
                <div className="mt-3">
                  <div className="mb-3" style={{ maxWidth: 420 }}>
                    <label className="form-label mb-1" htmlFor="other-company">Company name<span className="text-danger ms-1">*</span></label>
                    <input id="other-company" className="form-control" placeholder="e.g. Sonoff, Tuya, Schneider" value={otherCompany}
                      onChange={(e) => { setOtherCompany(e.target.value); otherChanged(); }} />
                  </div>
                  <label className="form-label mb-1 d-block">Where is it used? Tick the areas (one Matter gateway per area)</label>
                  {housePortions.length === 0 && <small className="text-muted">No areas were read from the drawing - add them in the table above.</small>}
                  {housePortions.map((f) => {
                    const ticked = f.areas.filter((a) => otherAreas.has(a.key)).length;
                    return (
                      <details key={f.floor} className="border rounded mb-2 other-floor">
                        <summary className="px-3 py-2" style={{ cursor: 'pointer' }}>
                          <span className="fw-semibold">{f.floor}</span>
                          <small className={`ms-2 ${ticked ? 'text-primary' : 'text-muted'}`}>{ticked} of {f.areas.length} area(s) ticked</small>
                        </summary>
                        <div className="px-3 pb-2">
                          <div className="mb-1">
                            <button type="button" className="btn btn-link btn-sm p-0 me-3" onClick={() => tick(f.areas.map((a) => a.key), true)}>Tick all</button>
                            <button type="button" className="btn btn-link btn-sm p-0" onClick={() => tick(f.areas.map((a) => a.key), false)}>Clear</button>
                          </div>
                          <div className="d-flex flex-wrap gap-3">
                            {f.areas.map((a) => (
                              <div key={a.key} className="form-check">
                                <input className="form-check-input" type="checkbox" id={`oa-${a.key}`} aria-label={a.key} checked={otherAreas.has(a.key)}
                                  onChange={(e) => tick([a.key], e.target.checked)} />
                                <label className="form-check-label" htmlFor={`oa-${a.key}`}>{a.name}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                  {tickedAreas.length > 0 && (
                    <div className="small mt-1 gateway-count"><i className="ti ti-router me-1"></i>
                      <b>{tickedAreas.length}</b> Matter gateway(s) will be added to the solution</div>
                  )}
                </div>
              )}
            </div>
            <div className="card-body border-top d-flex align-items-center gap-3 flex-wrap">
              <button type="button" className="btn btn-success" disabled={!plan || !otherReady || suggesting} onClick={() => plan && run(plan, null)}>
                <i className="ti ti-wand me-1"></i>{suggesting ? 'Working it out...' : 'Suggest Solution'}
              </button>
              {(!plan || !otherReady) && <small className="text-muted">
                {!plan ? 'Choose Standard or Premium' : otherUses === '' ? "Answer whether the client uses another company's automation"
                  : otherCompany.trim() === '' ? "Enter the other company's name" : 'Tick the areas where it is used'} - nothing is worked out until you do.</small>}
            </div>
            {error && <div className="card-body pt-0"><div className="alert alert-danger py-2 mb-0">{error}</div></div>}
          </div>

          {/* 4. result */}
          {result && (
            <div className="card drawing-result">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="card-title mb-0">{title()} - {result.plan === 'premium' ? 'Premium' : 'Standard'} solution</h5>
                  <small className="text-muted">{result.size ? `${result.size.name}: ${result.size.reason}` : 'No building sizes yet'}
                    {extraction.project.client ? ` · Client: ${extraction.project.client}` : ''}</small>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-primary" disabled={suggesting} onClick={switchPlan}>
                    <i className="ti ti-switch-horizontal me-1"></i>Switch to {result.plan === 'premium' ? 'Standard' : 'Premium'}</button>
                  {result.plan === 'premium' && <button type="button" className="btn btn-light border" disabled={suggesting} onClick={() => run('premium', null)}>Change Premium choices</button>}
                  <button type="button" className="btn btn-primary create-quotation" disabled={suggesting || result.lines.length === 0} onClick={createQuotation}>
                    <i className="ti ti-file-invoice me-1"></i>Create Quotation</button>
                  <button type="button" className="btn btn-light border" onClick={exportExcel}><img src="/assets/img/icons/excel.svg" alt="" width={16} className="me-1" />Excel</button>
                  <button type="button" className="btn btn-light border" onClick={exportPdf}><img src="/assets/img/icons/pdf.svg" alt="" width={16} className="me-1" />PDF</button>
                </div>
              </div>
              <div className="card-body">
                {result.size?.uncertain && <div className="alert alert-warning py-2">The building size couldn't be worked out from the drawing - choose it above.</div>}
                <div className="table-responsive">
                  <table className="table table-bordered align-middle result-table">
                    <thead className="thead-light">
                      <tr><th>Item</th><th>Group</th><th>Rule</th><th>From</th><th className="text-center">Quantity</th><th className="text-center">Package qty</th><th>Inventory product</th><th className="text-end">Unit price</th><th className="text-end">Total</th></tr>
                    </thead>
                    <tbody>
                      {result.lines.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-4">No items - enter quantities under Inventory &gt; Solution Packages.</td></tr>
                      ) : result.lines.map((l) => (
                        <tr key={l.itemId}>
                          <td style={{ whiteSpace: 'normal', minWidth: 240, maxWidth: 360 }}>
                            <div className="fw-semibold">{l.name}</div>
                            <small className="text-muted">{l.detail}</small>
                            {Object.keys(l.areas).length > 0 && (
                              <details><summary className="small text-primary">Area-wise</summary>
                                <ul className="small mb-0">{Object.entries(l.areas).map(([a, q]) => <li key={a}>{a}: {q}</li>)}</ul></details>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'normal' }}>{l.groupName || '-'}</td>
                          <td><small>{USAGE_LABEL[l.usage]}</small></td>
                          <td>{sourceBadge(l)}</td>
                          <td className="text-center fw-bold">{l.quantity}</td>
                          <td className="text-center text-muted">{l.baseline || '-'}</td>
                          <td style={{ whiteSpace: 'normal' }}>{l.productName || <span className="badge badge-soft-danger not-in-inventory" title="Suggested by the drawing reader but not in the inventory. On the quotation it is added as a line whose price you type in.">Not in inventory</span>}</td>
                          <td className="text-end text-nowrap result-price">{l.unitPrice == null ? '' : l.unitPrice === 0 ? <span className="badge badge-soft-warning" title="This product's price is 0 - set it on the product">No price</span> : money(l.unitPrice)}</td>
                          <td className="text-end text-nowrap fw-semibold result-line-total">{l.lineTotal == null ? '' : money(l.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {result.lines.length > 0 && (
                      <tfoot><tr className="fw-bold bg-light"><td colSpan={4}>Total ({result.totals.items} items)</td><td className="text-center result-quantity">{result.totals.quantity}</td><td></td><td>{result.totals.unlinked > 0 && <small className="text-danger fw-normal">{result.totals.unlinked} not linked</small>}</td>
                        <td className="text-end">{(result.totals.unpriced ?? 0) > 0 && <small className="text-warning fw-normal">{result.totals.unpriced} without a price</small>}</td>
                        <td className="text-end text-nowrap result-amount">{money(result.totals.amount ?? 0)}</td></tr></tfoot>
                    )}
                  </table>
                </div>
                {result.notes.length > 0 && (
                  <div className="small mt-2">{result.notes.map((n, i) => <div key={i} className="text-muted"><i className="ti ti-info-circle me-1"></i>{n}</div>)}</div>
                )}
                {result.leftOut.length > 0 && (
                  <details className="mt-2 small"><summary className="text-muted">{result.leftOut.length} item(s) left out</summary>
                    <ul className="mb-0 mt-1">{result.leftOut.map((l) => <li key={l.itemId}>{l.name} ({l.quantity}) - {l.reason}</li>)}</ul></details>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Premium: the products ticked for both solutions */}
      {asking && (
        <div className="modal fade show d-block drawing-confirm" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Premium solution{asking.size ? ` - ${asking.size.name}` : ''}: confirm products</h4>
                <button type="button" className="btn-close" onClick={() => setAsking(null)} />
              </div>
              <div className="modal-body">
                <p>These products are ticked for <b>both</b> Standard and Premium, and a Premium-only product can be used instead. Choose what to use in this Premium solution (applies to all areas). Other products are used as they are.</p>
                {asking.toConfirm.map((c) => {
                  const key = String(c.itemId);
                  const options = [{ value: 'use', label: `Use ${c.name}` }, ...(c.alternatives || []).map((a) => ({ value: String(a.itemId), label: `Use ${a.name} instead (Premium only)` })),
                    { value: 'skip', label: 'Don\'t use it' }];
                  return (
                    <div key={key} className="border rounded p-2 mb-2">
                      <div className="fw-semibold">{c.name} <span className="text-muted fw-normal">x {c.quantity}</span> <small className="text-muted">· {c.groupName} · {c.detail}</small></div>
                      <div className="d-flex flex-wrap gap-3 mt-1">
                        {options.map((o) => (
                          <div key={o.value} className="form-check">
                            <input className="form-check-input" type="radio" name={`c-${key}`} id={`c-${key}-${o.value}`} checked={(choices[key] || 'use') === o.value}
                              onChange={() => setChoices({ ...choices, [key]: o.value })} />
                            <label className="form-check-label" htmlFor={`c-${key}-${o.value}`}>{o.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAsking(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={suggesting} onClick={() => run('premium', choices)}>{suggesting ? 'Working it out...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DrawingSolution;
