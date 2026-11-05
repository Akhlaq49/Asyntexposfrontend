import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { catalogService as svc, CatalogData, CatalogUnmatched, ImportKind, ImportReport, familiesOf } from '../../../services/catalogService';

const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;
// (the price-list import is not offered: prices and descriptions come from the inventory products)
const FILES: { kind: ImportKind; title: string; hint: string }[] = [
  { kind: 'categorization', title: 'Categorization', hint: 'Categories, and their families with a tick for each plan (Standard / Premium).' },
  { kind: 'packages', title: 'Package items', hint: 'The products the drawing reader suggests from - one row per product, and how many of it each building size needs. No prices: the price and description come from the inventory product.' },
];
const LABEL: Record<string, string> = {
  rows: 'Rows', newSkus: 'New SKUs', updatedSkus: 'SKUs updated', newProducts: 'New products', priceList: 'Price list', priceListCreated: 'New price list',
  active: 'Made active', categories: 'Categories', families: 'Families', familiesCreated: 'Families created', tiersChanged: 'Tier ticks changed',
  matched: 'Matched', unmatched: 'Waiting to be mapped', linesWritten: 'Package lines written', linesRemoved: 'Package lines removed',
  duplicateModelCodes: 'Duplicate model codes (not fixed)', rowsWithoutPrice: 'Rows without a price', priceDifferences: 'Price differences between files',
  productsNotOnPriceList: 'Products not on the price list', notInInventory: 'Not in the inventory (price typed on the quotation)',
  productsRemoved: 'No longer suggested (not in this file)', notes: 'Notes', changes: 'Changes', unknownCategories: 'Category names not found',
  packageSizes: 'Package sizes', newPackageSizes: 'Package sizes created', noFamily: 'Products without a family - choose it below (Names to map)',
  tierConflicts: 'Package lines whose family is not in that tier',
};

/** the first sheet, as text cells - what the importer reads (the columns come from the company's import profile) */
const readRows = async (file: File) => {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<(string | null)[]>(ws, { header: 1, raw: false, defval: null, blankrows: false })
    .map((r) => r.map((c) => (c == null ? null : String(c))));
};

/** a header the company's import profile accepts: its first name for the field, in title case */
const headerOf = (profile: any, path: string[], fallback: string) => {
  let node = profile?.headers;
  for (const k of path) node = node?.[k];
  const name = Array.isArray(node) ? node[0] : typeof node === 'string' ? node : null;
  return name ? String(name).replace(/\b\w/g, (c) => c.toUpperCase()) : fallback;
};

/**
 * The Excel template for a file kind - its headers are the ones the company's import profile reads, so the filled
 * file imports as it is. The categorization template lists the company's categories and families (re-importing
 * them changes nothing); the package-items template is empty: the Product column and one column per building size.
 */
/** the building sizes every package-items template has (the company's own sizes are added after them) */
const STANDARD_SIZES = ['1 BHK', '2 BHK', '5 Marla', '10 Marla', '1 Kanal', '2 Kanal', '5 Kanal', '10 Kanal'];
const rank = (name: string) => {
  const i = STANDARD_SIZES.findIndex((n) => n.toLowerCase() === name.trim().toLowerCase().replace(/\s+/g, ' '));
  return i < 0 ? STANDARD_SIZES.length : i;
};

const downloadTemplate = (kind: ImportKind, cat: CatalogData | null, profileJson: string | undefined) => {
  let profile: any = null;
  try { profile = profileJson ? JSON.parse(profileJson) : null; } catch { profile = null; }
  let rows: (string | number | null)[][];
  let widths: number[];
  let help: string[][];
  let file: string;
  if (kind === 'categorization') {
    const tiers = cat?.tiers || [];
    const tierCode = (code: string, fb: string) => headerOf(profile, ['tiers', code], fb);
    const tierCols = tiers.length ? tiers.map((t) => ({ id: t.id, header: tierCode(t.code, `${t.name} Solution`) }))
      : [{ id: 0, header: tierCode('standard', 'Standard Solution') }, { id: -1, header: tierCode('premium', 'Premium Solution') }];
    rows = [[headerOf(profile, ['name'], 'Product Name'), ...tierCols.map((t) => t.header)]];
    for (const g of cat?.groups || []) {
      rows.push([g.name, ...tierCols.map(() => null)]);
      for (const f of g.families) rows.push([f.name, ...tierCols.map((t) => (f.tierIds.includes(t.id) ? '✓' : null))]);
    }
    widths = [40, ...tierCols.map(() => 20)];
    file = 'Categorization template.xlsx';
    help = [
      ['Category row', 'Only the name, no ticks, e.g. "Lighting Control". The rows under it are its families.'],
      ['Family row', 'The family name (a kind of product, e.g. "Smart Switches") and a tick (✓ or any text) under each solution it is used in.'],
      [],
      ['', 'A family ticked under Standard is suggested in Standard plans, under Premium in Premium plans; both = both plans.'],
      ['', 'A new company gets its categories and families created from this file. Afterwards new names wait on the Import tab to be mapped.'],
    ];
  } else {
    // always the standard building sizes, then any other size the company added
    const own = (cat?.sizes || []).map((z) => z.name);
    const key = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');
    const sizes = [...STANDARD_SIZES.filter((n) => !own.some((o) => key(o) === key(n))), ...own]
      .sort((a, b) => rank(a) - rank(b)).map((name) => ({ name }));
    rows = [[headerOf(profile, ['name'], 'Product'), ...sizes.map((z) => z.name)]];
    widths = [40, ...sizes.map(() => 14)];
    file = 'Package items template.xlsx';
    help = [
      [rows[0][0] as string, 'Required. The product name as in the inventory (Products). Its price and description are taken from the inventory.'],
      ['Size columns', `One column per building size (${sizes.map((z) => z.name).join(', ')}): how many of the product that size needs. Decimals are fine (12.5 m). Empty = none.`],
      [],
      ['', 'This file is the whole list: the drawing reader suggests only these products. A product left out is no longer suggested.'],
      ['', 'A name not found in the inventory waits on the Import tab: pick the inventory product it is, or keep it as "not in the inventory" (its price is typed on the quotation).'],
      ['', 'Keep the size column names: each one is a building size. A new company gets these sizes when it uploads the file.'],
      ['', 'The quantity is used in every plan (Standard / Premium) the product\'s family is ticked for in the categorization.'],
    ];
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  const helpSheet = XLSX.utils.aoa_to_sheet([['How to fill the first sheet'], [], ['Column', 'What to enter'], ...help]);
  helpSheet['!cols'] = [{ wch: 20 }, { wch: 110 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, kind === 'categorization' ? 'Categorization' : 'Package items');
  XLSX.utils.book_append_sheet(book, helpSheet, 'How to fill');
  XLSX.writeFile(book, file);
};

const Report: React.FC<{ report: ImportReport }> = ({ report }) => (
  <div className="import-report small">
    {Object.entries(report).filter(([k]) => !['file', 'kind'].includes(k)).map(([k, v]) => Array.isArray(v) ? (
      v.length === 0 ? null : (
        <details key={k} className="mt-1" open={v.length <= 5}>
          <summary className={/duplicate|difference|without|noFamily|Conflict|unknown/i.test(k) ? 'text-warning' : ''}>{LABEL[k] || k}: {v.length}</summary>
          <ul className="mb-1">{v.map((x, i) => <li key={i}>{typeof x === 'object' ? `${(x as any).model}: ${((x as any).rows || []).join('; ')}` : String(x)}</li>)}</ul>
        </details>
      )
    ) : <div key={k}><span className="text-muted">{LABEL[k] || k}:</span> <b>{typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)}</b></div>)}
  </div>
);

/**
 * Import tab: the company's two files (categorization, package items), the names that matched nothing
 * (map them once - they are saved as other names) and the import profiles
 * (where each file's columns are - per company).
 */
const CatalogImport: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [cat, setCat] = useState<CatalogData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<ImportKind | null>(null);
  const [reports, setReports] = useState<Partial<Record<ImportKind, ImportReport>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<ImportKind, string>>>({});
  const [picks, setPicks] = useState<Record<number, { target: string; family: string }>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [profileMsg, setProfileMsg] = useState('');

  const load = () => svc.get().then(setCat).catch((err) => setError(errorText(err, 'Could not load the catalogue.')));
  useEffect(() => {
    load();
    svc.profiles().then((p) => setProfiles(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, JSON.stringify(v, null, 2)])))).catch(() => undefined);
  }, []);
  const apply = (c: CatalogData) => { setCat(c); onChanged(); };

  const importFile = async (kind: ImportKind, file: File | undefined) => {
    if (!file) return;
    setBusy(kind); setFileErrors((e) => ({ ...e, [kind]: '' }));
    try {
      const rows = await readRows(file);
      const report = await svc.importFile(kind, file.name, rows);
      setReports((r) => ({ ...r, [kind]: report }));
      await load(); onChanged();
    } catch (err) { setFileErrors((e) => ({ ...e, [kind]: errorText(err, 'The file could not be imported.') })); }
    setBusy(null);
  };

  const rowOf = (u: CatalogUnmatched) => { try { return JSON.parse(u.rowJson); } catch { return {}; } };
  const pickOf = (u: CatalogUnmatched) => picks[u.id] || { target: rowOf(u).productId ? String(rowOf(u).productId) : '', family: '' };
  const map = async (u: CatalogUnmatched) => {
    const pick = pickOf(u);
    if (!pick.target) { setError(`Choose what "${u.name}" is.`); return; }
    if (u.kind === 'packages' && !pick.family && (pick.target === 'new' || !cat?.products.find((p) => p.id === Number(pick.target))?.familyId)) {
      setError(`Choose the family of "${u.name}": its quantities go to the plans (Standard / Premium) its family is ticked for.`); return;
    }
    try {
      const body = u.kind === 'packages'
        ? (pick.target === 'new' ? { create: true, newFamilyId: pick.family ? Number(pick.family) : null }
          : { catalogProductId: Number(pick.target), newFamilyId: pick.family ? Number(pick.family) : null })
        : (pick.target.startsWith('group:') ? { create: true, groupId: Number(pick.target.slice(6)) } : { familyId: Number(pick.target) });
      apply(await svc.map(u.id, body)); setError('');
    } catch (err) { setError(errorText(err, 'Could not map the name.')); }
  };

  const saveProfile = async (kind: ImportKind) => {
    try {
      const saved = await svc.saveProfile(kind, JSON.parse(profiles[kind] || '{}'));
      setProfiles((p) => ({ ...p, [kind]: JSON.stringify(saved, null, 2) })); setProfileMsg(`${kind}: saved`);
    } catch (err: any) { setProfileMsg(`${kind}: ${err instanceof SyntaxError ? 'not valid JSON' : errorText(err, 'not saved')}`); }
  };
  const resetProfile = async (kind: ImportKind) => {
    const p = await svc.resetProfile(kind);
    setProfiles((x) => ({ ...x, [kind]: JSON.stringify(p, null, 2) })); setProfileMsg(`${kind}: back to the default`);
  };

  if (!cat) return <div className="card"><div className="card-body">{error || 'Loading...'}</div></div>;
  const families = familiesOf(cat);
  const describe = (u: CatalogUnmatched) => {
    try {
      const row = JSON.parse(u.rowJson);
      if (u.kind === 'packages') {
        const q = Object.entries(row.quantities || {}).map(([sizeId, n]) => `${cat.sizes.find((s) => s.id === Number(sizeId))?.name || sizeId}: ${n}`);
        return `${row.productId ? 'in the inventory - choose its family; ' : 'not found in the inventory; '}${q.length ? q.join(', ') : 'no quantities'}`;
      }
      return `${row.category ? `in ${row.category}; ` : ''}${(row.tiers || []).join(' + ') || 'no tier ticked'}`;
    } catch { return ''; }
  };

  return (
    <>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row">
        {FILES.map((f, i) => (
          <div key={f.kind} className="col-lg-6">
            <div className="card">
              <div className="card-header"><h5 className="card-title mb-0">{i + 1}. {f.title}</h5></div>
              <div className="card-body">
                <p className="small text-muted">{f.hint}</p>
                <div className="small fw-semibold mb-1">a. Download the template and fill it in</div>
                <button type="button" className={`btn btn-outline-success btn-sm mb-3 template-${f.kind}`} onClick={() => downloadTemplate(f.kind, cat, profiles[f.kind])}>
                  <i className="ti ti-file-spreadsheet me-1"></i>Download template
                </button>
                <div className="small fw-semibold mb-1">b. Upload the filled file</div>
                <input type="file" accept=".xlsx,.xls,.csv" className={`form-control import-${f.kind}`} disabled={busy !== null}
                  onChange={(e) => { importFile(f.kind, e.target.files?.[0]); e.target.value = ''; }} />
                {busy === f.kind && <div className="small text-muted mt-2">Importing...</div>}
                {fileErrors[f.kind] && <div className="alert alert-danger py-2 mt-2 mb-0 small">{fileErrors[f.kind]}</div>}
                {reports[f.kind] && <div className={`mt-2 report-${f.kind}`}><Report report={reports[f.kind]!} /></div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card unmatched-card">
        <div className="card-header"><h5 className="card-title mb-0">Names to map ({cat.unmatched.length})</h5>
          <small className="text-muted">Names in a file that matched nothing, and package items whose family is not set. Nothing is guessed: choose what each one is - it is saved as another name, so the next import matches it.</small></div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="thead-light"><tr><th>File</th><th>Name</th><th>In the file</th><th style={{ minWidth: 280 }}>It is</th><th style={{ minWidth: 200 }}>Family</th><th></th></tr></thead>
              <tbody>
                {cat.unmatched.length === 0 ? <tr><td colSpan={6} className="text-center py-3 text-muted">Nothing to map.</td></tr> : cat.unmatched.map((u) => {
                  const pick = pickOf(u);
                  const set = (p: Partial<typeof pick>) => setPicks((x) => ({ ...x, [u.id]: { ...pick, ...p } }));
                  return (
                    <tr key={u.id} data-unmatched={u.name}>
                      <td className="text-nowrap">{u.kind === 'packages' ? 'package items' : u.kind}</td>
                      <td className="fw-semibold">{u.name}</td>
                      <td className="small text-muted">{describe(u)}</td>
                      <td>
                        <select className="form-select form-select-sm map-target" value={pick.target} onChange={(e) => set({ target: e.target.value })}>
                          <option value="">Choose...</option>
                          {u.kind === 'packages' ? (
                            <>
                              <option value="new">Not in the inventory - price typed on the quotation</option>
                              <optgroup label="Inventory product">{cat.products.filter((p) => p.skus.length > 0).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                              {cat.products.some((p) => p.skus.length === 0) && (
                                <optgroup label="Not in the inventory">{cat.products.filter((p) => p.skus.length === 0).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                              )}
                            </>
                          ) : (
                            <>
                              <optgroup label="New family in category">{cat.groups.map((g) => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}</optgroup>
                              <optgroup label="Family">{families.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.groupName})</option>)}</optgroup>
                            </>
                          )}
                        </select>
                      </td>
                      <td>
                        {u.kind === 'packages' && (
                          <select className="form-select form-select-sm map-family" value={pick.family} onChange={(e) => set({ family: e.target.value })}>
                            <option value="">{pick.target && pick.target !== 'new' ? 'Keep its family' : 'Choose the family...'}</option>
                            {cat.groups.map((g) => <optgroup key={g.id} label={g.name}>{g.families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>)}
                          </select>
                        )}
                      </td>
                      <td className="text-nowrap">
                        <button type="button" className="btn btn-sm btn-primary me-1 map-btn" onClick={() => map(u)}>Map</button>
                        <button type="button" className="btn btn-sm btn-light border" title="Not needed" onClick={async () => apply(await svc.dismiss(u.id))}>Dismiss</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <details className="card">
        <summary className="card-header" style={{ cursor: 'pointer' }}><b>Import profiles</b> <small className="text-muted ms-2">where each file's columns are - this company's own; header names are matched ignoring case and spaces</small></summary>
        <div className="card-body">
          {profileMsg && <div className="alert alert-info py-2">{profileMsg}</div>}
          <div className="row">
            {FILES.map((f) => (
              <div key={f.kind} className="col-lg-6">
                <label className="form-label fw-semibold">{f.title}</label>
                <textarea className="form-control font-monospace small" rows={14} value={profiles[f.kind] || ''} onChange={(e) => setProfiles((p) => ({ ...p, [f.kind]: e.target.value }))} />
                <div className="d-flex gap-2 mt-2">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => saveProfile(f.kind)}>Save</button>
                  <button type="button" className="btn btn-sm btn-light border" onClick={() => resetProfile(f.kind)}>Default</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </>
  );
};

export default CatalogImport;
