import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import {
  createProduct, getProducts, getCategories, getBrands, getUnits, getWarranties, type DropdownOption,
} from '../../services/productService';
import { useFieldVisibility } from '../../utils/useFieldVisibility';

/**
 * Bulk add products from Excel:
 *  1. download a template with the typed fields only (no Category / Brand / Unit / Warranty - those are dropdowns)
 *  2. upload the filled sheet: the rows are counted, then added one after another;
 *     for each product the dropdown fields are chosen at that time
 */

// the typed fields of the Add Product form, in sheet order
const COLUMNS = [
  { key: 'productName', header: 'Product Name', hint: 'Required' },
  { key: 'sku', header: 'SKU', hint: 'Leave empty to generate one' },
  { key: 'color', header: 'Color', hint: 'e.g. White, Black' },
  { key: 'model', header: 'Model', hint: 'e.g. 1 Gang Matrix' },
  { key: 'description', header: 'Description', hint: 'Maximum 60 words' },
  { key: 'quantity', header: 'Quantity', hint: 'Whole number, 0 or more (empty = 0)' },
  { key: 'price', header: 'Price', hint: 'Number, e.g. 2500' },
] as const;
type Key = typeof COLUMNS[number]['key'];
type Row = Record<Key, string> & { line: number };
type Picks = { category: string; brand: string; unit: string; warranty: string };
type Done = { line: number; name: string; status: 'added' | 'skipped' | 'failed'; message?: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/** problems in a row that stop it being added */
const rowProblems = (r: Row) => {
  const p: string[] = [];
  if (!r.productName.trim()) p.push('Product Name is empty');
  if (r.quantity.trim() && !/^\d+$/.test(r.quantity.trim())) p.push(`Quantity "${r.quantity}" is not a whole number`);
  if (r.price.trim() && (isNaN(Number(r.price)) || Number(r.price) < 0)) p.push(`Price "${r.price}" is not a number`);
  if (r.color.length > 100) p.push('Color is longer than 100 characters');
  if (r.model.length > 150) p.push('Model is longer than 150 characters');
  return p;
};

interface Props { onClose: () => void; onAdded: () => void }

const BulkAddProducts: React.FC<Props> = ({ onClose, onAdded }) => {
  const { isVisible } = useFieldVisibility('AddProduct');
  const fileRef = useRef<HTMLInputElement>(null);
  const [opts, setOpts] = useState<{ categories: DropdownOption[]; brands: DropdownOption[]; units: DropdownOption[]; warranties: DropdownOption[] }>(
    { categories: [], brands: [], units: [], warranties: [] });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Picks>({ category: '', brand: '', unit: '', warranty: '' });
  const [done, setDone] = useState<Done[]>([]);
  const [saving, setSaving] = useState(false);
  // images for the product on screen only - cleared when moving to the next product
  const imageRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const clearImages = () => setImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.url)); return []; });
  const addImages = (files: FileList | null) => {
    const picked = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    setImages((prev) => [...prev, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    if (imageRef.current) imageRef.current.value = '';
  };
  const removeImage = (n: number) => setImages((prev) => { URL.revokeObjectURL(prev[n].url); return prev.filter((_, i) => i !== n); });
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [existingSkus, setExistingSkus] = useState<string[]>([]);   // to warn about a SKU already in use

  useEffect(() => {
    Promise.all([getCategories(), getBrands(), getUnits(), getWarranties()])
      .then(([categories, brands, units, warranties]) => setOpts({ categories, brands, units, warranties }))
      .catch(() => setError('Could not load categories, brands and units.'));
    getProducts().then((p) => setExistingSkus(p.map((x) => x.sku))).catch(() => {});
  }, []);

  // only the fields shown on the Add Product form go in the sheet
  const columns = useMemo(() => COLUMNS.filter((c) => c.key === 'productName' || isVisible(c.key)), [isVisible]);
  const dropdowns = useMemo(() => ([
    { key: 'category', label: 'Category', list: opts.categories, manage: '/category-list' },
    { key: 'brand', label: 'Brand', list: opts.brands, manage: '/brand-list' },
    { key: 'unit', label: 'Unit', list: opts.units, manage: '/units' },
    { key: 'warranty', label: 'Warranty', list: opts.warranties, manage: '/warranty' },
  ] as const).filter((d) => isVisible(d.key)), [opts, isVisible]);

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header)]);
    sheet['!cols'] = columns.map((c) => ({ wch: c.key === 'description' ? 50 : c.key === 'productName' ? 32 : 16 }));
    const help = XLSX.utils.aoa_to_sheet([
      ['How to fill the Products sheet'],
      [],
      ['Column', 'What to enter'],
      ...columns.map((c) => [c.header, c.hint]),
      [],
      ['One product per row, starting from row 2. Keep the header row as it is.'],
      ['Category, Brand, Unit and Warranty are not in the sheet - you choose them for each product while uploading.'],
    ]);
    help['!cols'] = [{ wch: 18 }, { wch: 90 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Products');
    XLSX.utils.book_append_sheet(book, help, 'How to fill');
    XLSX.writeFile(book, 'Products - bulk add template.xlsx');
  };

  const readFile = async (file: File) => {
    setError(''); setFileName(file.name);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setError('Upload the Excel file (.xlsx) made from the template.'); return; }
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = book.Sheets['Products'] || book.Sheets[book.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '', blankrows: false });
      const head = (grid[0] || []).map((h) => norm(String(h)));
      const at = (key: Key) => head.indexOf(norm(COLUMNS.find((c) => c.key === key)!.header));
      if (at('productName') < 0) { setError('The "Product Name" column was not found. Use the template and keep its header row.'); return; }
      const found: Row[] = [];
      grid.slice(1).forEach((cells, i) => {
        const r = { line: i + 2 } as Row;
        COLUMNS.forEach((c) => { const n = at(c.key); r[c.key] = n >= 0 ? String(cells[n] ?? '').trim() : ''; });
        if (COLUMNS.some((c) => r[c.key] !== '')) found.push(r);      // empty rows are not products
      });
      if (found.length === 0) { setError('The sheet has no products - fill in at least one row under the header.'); return; }
      setRows(found); setIndex(0); setDone([]);
    } catch {
      setError('This file could not be read. Use the template, fill it in and save it as .xlsx.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const row = rows && index < rows.length ? rows[index] : null;
  const problems = row ? rowProblems(row) : [];
  const skuTaken = useMemo(() => {
    if (!row?.sku) return '';
    const sku = row.sku.toLowerCase();
    if (existingSkus.some((s) => (s || '').toLowerCase() === sku)) return 'A product with this SKU already exists.';
    if (rows!.some((r, i) => i < index && r.sku.toLowerCase() === sku && done.find((d) => d.line === r.line)?.status === 'added'))
      return 'This SKU was already used by an earlier row of the sheet.';
    return '';
  }, [row, rows, index, existingSkus, done]);

  const next = (d: Done) => { setDone((prev) => [...prev, d]); setIndex((i) => i + 1); setError(''); clearImages(); };

  const add = async () => {
    if (!row || problems.length) return;
    setSaving(true); setError('');
    try {
      const price = Number(row.price) || 0;
      await createProduct({
        productName: row.productName,
        slug: row.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: row.sku, sellingType: 'pos',
        category: picks.category, brand: picks.brand, unit: picks.unit, warranty: picks.warranty,
        color: row.color, model: row.model, description: row.description,
        productType: 'single',
        quantity: Math.max(0, Math.floor(Number(row.quantity) || 0)),
        price, taxType: '', tax: '', taxesJson: '[]', discountType: '', discountValue: 0, quantityAlert: 0,
        images: images.map((i) => i.file),
      });
      next({ line: row.line, name: row.productName, status: 'added' });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'The product could not be added.');
    } finally {
      setSaving(false);
    }
  };

  const added = done.filter((d) => d.status === 'added').length;
  const close = () => { if (added) onAdded(); onClose(); };
  const finished = rows !== null && index >= rows.length;

  return (
    <div className="modal fade show d-block bulk-add-products" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Bulk add products</h4>
            <button type="button" className="btn-close" onClick={close} aria-label="Close" disabled={saving}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}

            {/* 1-2: template and upload */}
            {rows === null && (
              <>
                <div className="d-flex align-items-start gap-3 mb-4">
                  <span className="badge bg-primary rounded-pill mt-1">1</span>
                  <div className="flex-fill">
                    <div className="fw-semibold">Download the Excel template and fill it in</div>
                    <small className="text-muted d-block mb-2">
                      Columns: {columns.map((c) => c.header).join(', ')}. One product per row.
                      Category, Brand and Unit are not in the sheet - you choose them for each product while uploading.
                    </small>
                    <button type="button" className="btn btn-outline-success btn-sm bulk-template" onClick={downloadTemplate}>
                      <i className="ti ti-file-spreadsheet me-1"></i>Download template
                    </button>
                  </div>
                </div>
                <div className="d-flex align-items-start gap-3">
                  <span className="badge bg-primary rounded-pill mt-1">2</span>
                  <div className="flex-fill">
                    <div className="fw-semibold">Upload the filled sheet</div>
                    <small className="text-muted d-block mb-2">The products are added one by one - you choose the dropdown fields for each.</small>
                    <input ref={fileRef} type="file" className="form-control bulk-file" accept=".xlsx,.xls,.csv"
                      onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
                  </div>
                </div>
              </>
            )}

            {/* 3: one product at a time */}
            {row && (
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-semibold bulk-position">Product {index + 1} of {rows!.length}</div>
                  <small className="text-muted">{fileName} - row {row.line} · {added} added so far</small>
                </div>
                <div className="progress mb-3" style={{ height: 6 }}>
                  <div className="progress-bar" style={{ width: `${(index / rows!.length) * 100}%` }}></div>
                </div>

                <table className="table table-sm table-bordered mb-3 bulk-row" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <tbody>
                    {columns.map((c) => (
                      <tr key={c.key}>
                        <th className="bg-light" style={{ width: 160 }}>{c.header}</th>
                        <td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row[c.key] || <span className="text-muted">{c.key === 'sku' ? '(generated)' : c.key === 'quantity' ? '0' : '-'}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {problems.length > 0 && (
                  <div className="alert alert-warning py-2">
                    This row can't be added: {problems.join('; ')}. Fix it in the sheet and upload it again, or skip it.
                  </div>
                )}
                {skuTaken && <div className="alert alert-warning py-2">{skuTaken}</div>}

                <div className="row">
                  {dropdowns.map((d) => (
                    <div key={d.key} className="col-sm-6 mb-3">
                      <label className="form-label mb-1" htmlFor={`bulk-${d.key}`}>{d.label}</label>
                      <select id={`bulk-${d.key}`} className="form-select" value={picks[d.key]}
                        onChange={(e) => setPicks((p) => ({ ...p, [d.key]: e.target.value }))}>
                        <option value="">Select</option>
                        {d.list.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {d.list.length === 0 && <small className="text-muted">None yet - add them on the <Link to={d.manage} onClick={close}>{d.label}</Link> page.</small>}
                    </div>
                  ))}
                </div>
                <div className="mb-3">
                  <label className="form-label mb-1 d-block">Images <small className="text-muted">(optional, for this product only)</small></label>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {images.map((img, n) => (
                      <div key={img.url} className="position-relative border rounded" style={{ width: 72, height: 72 }}>
                        <img src={img.url} alt={img.file.name} className="w-100 h-100 rounded" style={{ objectFit: 'cover' }} />
                        <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 p-0 lh-1"
                          style={{ width: 20, height: 20 }} aria-label={`Remove ${img.file.name}`} onClick={() => removeImage(n)}>&times;</button>
                      </div>
                    ))}
                    <label className="btn btn-outline-primary btn-sm mb-0">
                      <i className="ti ti-photo-plus me-1"></i>Add images
                      <input ref={imageRef} type="file" accept="image/*" multiple hidden className="bulk-images"
                        onChange={(e) => addImages(e.target.files)} />
                    </label>
                  </div>
                </div>
                <small className="text-muted">Category, brand, unit and warranty stay selected for the next product - change them when it needs different ones.</small>
              </>
            )}

            {/* 4: summary */}
            {finished && (
              <div className="bulk-summary">
                <div className="alert alert-success py-2">
                  Done: <b>{added}</b> added, {done.filter((d) => d.status === 'skipped').length} skipped, out of {rows!.length} row(s).
                </div>
                {done.some((d) => d.status !== 'added') && (
                  <table className="table table-sm">
                    <thead><tr><th>Row</th><th>Product</th><th>Result</th></tr></thead>
                    <tbody>
                      {done.filter((d) => d.status !== 'added').map((d) => (
                        <tr key={d.line}><td>{d.line}</td><td>{d.name || '-'}</td><td>{d.message || d.status}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            {row ? (
              <>
                <button type="button" className="btn btn-secondary me-auto" disabled={saving}
                  onClick={() => { setIndex(rows!.length); setDone((p) => [...p, ...rows!.slice(index).map((r) => ({ line: r.line, name: r.productName, status: 'skipped' as const, message: 'stopped before it' }))]); }}>
                  Stop
                </button>
                <button type="button" className="btn btn-outline-secondary" disabled={saving}
                  onClick={() => next({ line: row.line, name: row.productName, status: 'skipped', message: problems.length ? problems.join('; ') : 'skipped by you' })}>
                  Skip
                </button>
                <button type="button" className="btn btn-primary" disabled={saving || problems.length > 0 || !!skuTaken} onClick={add}>
                  {saving ? 'Adding...' : index + 1 < rows!.length ? 'Add & next' : 'Add & finish'}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={close}>{finished ? 'Close' : 'Cancel'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddProducts;
