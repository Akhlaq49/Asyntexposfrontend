import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import suite, { ProductStock, Variant, VariantAttr, VariantMatrix } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';
import LevelPricesPanel from './LevelPricesPanel';

/** Stock of one product at each branch, batch by batch. */
export const ProductLocationStock: React.FC<{ productId: number }> = ({ productId }) => {
  const [data, setData] = useState<ProductStock | null>(null);
  useEffect(() => { suite.productStock(productId).then(setData).catch(() => setData(null)); }, [productId]);
  if (!data) return null;
  return (
    <div>
      {data.locations.length === 0 && <p className="text-muted mb-0">No stock at any location.</p>}
      <div className="row g-2">
        {data.locations.map((l) => (
          <div key={l.locationId ?? 0} className="col-md-6 col-xl-4">
            <div className="border rounded p-2">
              <div className="d-flex justify-content-between"><b>{l.location}</b><span>{l.quantity}{l.sellable !== l.quantity && <span className="text-danger fs-12"> ({l.quantity - l.sellable} expired)</span>}</span></div>
              <div className="fs-12 text-muted">{l.batches.map((b) => `${b.batchNo}${b.expiryDate ? ` (${b.expiryDate.slice(0, 7)})` : ''}: ${b.quantity}`).join(' · ')}</div>
            </div>
          </div>
        ))}
      </div>
      {data.noBatch !== 0 && <p className="text-danger fs-12 mt-2 mb-0">{data.noBatch} unit(s) are not placed at any location. Use a stock adjustment to correct them.</p>}
    </div>
  );
};

/** Urdu and Arabic name and dosage note for receipts and the counter. */
export const ProductTranslations: React.FC<{ productId: number }> = ({ productId }) => {
  const [rows, setRows] = useState<{ lang: string; name: string; usageNote?: string }[]>([{ lang: 'ur', name: '' }, { lang: 'ar', name: '' }]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    suite.productTranslations(productId).then((t) => setRows(['ur', 'ar'].map((lang) => {
      const f = t.find((x) => x.lang === lang);
      return { lang, name: f?.name ?? '', usageNote: f?.usageNote ?? '' };
    }))).catch(() => undefined);
  }, [productId]);
  const save = async () => {
    setBusy(true);
    try { await suite.saveTranslations(productId, rows); Swal.fire({ icon: 'success', title: 'Saved', timer: 1000, showConfirmButton: false }); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
    finally { setBusy(false); }
  };
  return (
    <div>
      {rows.map((r, i) => (
        <div className="row g-2 mb-2" key={r.lang} dir={r.lang === 'en' ? 'ltr' : 'rtl'}>
          <div className="col-md-5"><label className="form-label">{r.lang === 'ur' ? 'اردو نام (Urdu name)' : 'الاسم بالعربية (Arabic name)'}</label>
            <input className="form-control" value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></div>
          <div className="col-md-7"><label className="form-label">{r.lang === 'ur' ? 'استعمال کی ہدایت (dosage note on receipt)' : 'طريقة الاستعمال'}</label>
            <input className="form-control" value={r.usageNote ?? ''} placeholder={r.lang === 'ur' ? 'مثلاً: کھانے کے بعد، دن میں دو بار' : ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, usageNote: e.target.value } : x)))} /></div>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => void save()}>Save translations</button>
    </div>
  );
};

/** Colour / size matrix: generate variants, see stock per cell, edit SKUs and prices. */
export const ProductVariantsPanel: React.FC<{ productId: number; productName: string }> = ({ productId, productName }) => {
  const [attrs, setAttrs] = useState<VariantAttr[]>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof suite.productVariants>> | null>(null);
  const [matrix, setMatrix] = useState<VariantMatrix | null>(null);
  const [measure, setMeasure] = useState<'stock' | 'sales'>('stock');
  const [pick, setPick] = useState<{ attributeId: number; values: string[] }[]>([]);
  const [articleNo, setArticleNo] = useState('');
  const [editing, setEditing] = useState<Variant | null>(null);

  const load = useCallback(async () => {
    const [a, d] = await Promise.all([suite.variantAttributes(), suite.productVariants(productId)]);
    setAttrs(a); setData(d); setArticleNo(d.product.articleNo ?? d.product.sku ?? '');
    if (d.variants.length) setMatrix(await suite.variantMatrix(productId, { measure }));
  }, [productId, measure]);
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  const toggle = (attributeId: number, value: string) => {
    const cur = pick.find((p) => p.attributeId === attributeId);
    if (!cur) { setPick([...pick, { attributeId, values: [value] }]); return; }
    const values = cur.values.includes(value) ? cur.values.filter((v) => v !== value) : [...cur.values, value];
    setPick(values.length ? pick.map((p) => (p.attributeId === attributeId ? { ...p, values } : p)) : pick.filter((p) => p.attributeId !== attributeId));
  };

  const generate = async () => {
    if (pick.length === 0) { Swal.fire({ icon: 'info', title: 'Pick values first', text: 'For example Black, White and S, M, L.' }); return; }
    try {
      const r = await suite.generateVariants(productId, { articleNo, options: pick });
      Swal.fire({ icon: 'success', title: `${r.created} variant(s) created`, text: `${productName} now has ${r.total} sizes/colours, each with its own barcode.` });
      setPick([]);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not create variants', text: apiError(err) }); }
  };

  const saveVariant = async () => {
    if (!editing) return;
    try { await suite.updateVariant(editing.id, editing); setEditing(null); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  if (!data) return <div className="text-center py-2"><span className="spinner-border spinner-border-sm" /></div>;
  const cell = (row: string, col: string) => matrix?.cells.find((c) => c.row === row && c.column === col);

  return (
    <div>
      {data.variants.length > 0 && matrix && (
        <div className="mb-3">
          <div className="d-flex gap-2 align-items-center mb-2">
            <b>{data.options.map((o) => o.name).join(' × ')}</b>
            <div className="btn-group btn-group-sm ms-auto">
              <button type="button" className={`btn ${measure === 'stock' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setMeasure('stock')}>Stock</button>
              <button type="button" className={`btn ${measure === 'sales' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setMeasure('sales')}>Sold (30 days)</button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered table-sm text-center mb-1">
              <thead><tr><th />{matrix.columns.map((c) => <th key={c}>{c || '—'}</th>)}<th>Total</th></tr></thead>
              <tbody>
                {matrix.rows.map((r) => (
                  <tr key={r}><th className="text-start">{r || '—'}</th>
                    {matrix.columns.map((c) => { const x = cell(r, c); return <td key={c} className={x && x.value === 0 && measure === 'stock' ? 'text-muted' : 'fw-medium'} title={x?.sku}>{x ? x.value : ''}</td>; })}
                    <td className="fw-bold">{matrix.cells.filter((x) => x.row === r).reduce((s, x) => s + x.value, 0)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted fs-12">Receive stock per size/colour with the grid on the purchase screen.</p>
          <details>
            <summary className="fs-13">SKUs, barcodes and prices ({data.variants.length})</summary>
            <table className="table table-sm mt-2"><thead><tr><th>Variant</th><th>SKU / barcode</th><th className="text-end">Price</th><th className="text-end">Stock</th><th /></tr></thead>
              <tbody>{data.variants.map((v) => (
                <tr key={v.id} className={v.isActive ? '' : 'text-muted'}><td>{[v.option1, v.option2, v.option3].filter(Boolean).join(' / ')}</td><td className="fs-12">{v.sku}{v.barcode && v.barcode !== v.sku && <div>{v.barcode}</div>}</td>
                  <td className="text-end">{v.price ?? <span className="text-muted">{data.product.price}</span>}</td><td className="text-end">{v.stock}</td>
                  <td className="text-end"><button type="button" className="btn btn-sm btn-link" onClick={() => setEditing({ ...v })}>Edit</button></td></tr>
              ))}</tbody></table>
          </details>
        </div>
      )}

      <div className="border rounded p-3">
        <div className="fw-medium mb-2">{data.variants.length ? 'Add more sizes / colours' : 'Sell this article in sizes or colours'}</div>
        <div className="mb-2" style={{ maxWidth: 260 }}><label className="form-label fs-13">Article no. (SKU prefix)</label><input className="form-control form-control-sm" value={articleNo} onChange={(e) => setArticleNo(e.target.value)} /></div>
        {attrs.length === 0 && <p className="text-muted fs-13">Create attributes such as Size and Colour under Inventory → Variant Attributes first.</p>}
        {attrs.map((a) => (
          <div key={a.id} className="mb-2"><span className="fs-13 me-2">{a.name}:</span>
            {a.values.map((v) => {
              const on = pick.find((p) => p.attributeId === a.id)?.values.includes(v.value);
              return <button key={v.id} type="button" className={`btn btn-sm me-1 mb-1 ${on ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => toggle(a.id, v.value)}>{v.value}</button>;
            })}
          </div>
        ))}
        {attrs.length > 0 && <button type="button" className="btn btn-sm btn-primary" onClick={() => void generate()}>Create variants</button>}
        <div className="text-muted fs-12 mt-2">The first attribute picked becomes the grid rows, the second the columns. Stock moves to per-variant once variants exist.</div>
      </div>

      {editing && (
        <div className="border rounded p-3 mt-3">
          <div className="fw-medium mb-2">{[editing.option1, editing.option2, editing.option3].filter(Boolean).join(' / ')}</div>
          <div className="row g-2">
            <div className="col-md-3"><input className="form-control form-control-sm" value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} aria-label="SKU" /></div>
            <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Barcode" value={editing.barcode ?? ''} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} aria-label="Barcode" /></div>
            <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Price" value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Price" /></div>
            <div className="col-md-2 d-flex align-items-center"><label className="form-check mb-0"><input type="checkbox" className="form-check-input" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /><span className="form-check-label fs-13">Active</span></label></div>
            <div className="col-md-2 d-flex gap-1"><button type="button" className="btn btn-sm btn-primary" onClick={() => void saveVariant()}>Save</button><button type="button" className="btn btn-sm btn-light" onClick={() => setEditing(null)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Extra sections on the product edit page. */
const ProductSuitePanels: React.FC<{ productId: number; productName: string; retailPrice: number; isMedicine?: boolean }> = ({ productId, productName, retailPrice, isMedicine }) => {
  const [open, setOpen] = useState<string>('stock');
  const section = (key: string, title: string, body: React.ReactNode) => (
    <div className="card mb-3">
      <button type="button" className="card-header bg-transparent d-flex justify-content-between align-items-center border-0 w-100 text-start" onClick={() => setOpen(open === key ? '' : key)} aria-expanded={open === key}>
        <h5 className="mb-0">{title}</h5><i className={`ti ti-chevron-${open === key ? 'up' : 'down'}`} />
      </button>
      {open === key && <div className="card-body pt-0">{body}</div>}
    </div>
  );
  return (
    <>
      {section('stock', 'Stock by branch', <ProductLocationStock productId={productId} />)}
      {section('levels', 'Wholesale & distributor prices', <LevelPricesPanel productId={productId} retailPrice={retailPrice} />)}
      {section('lang', 'Urdu / Arabic name', <ProductTranslations productId={productId} />)}
      {!isMedicine && section('variants', 'Sizes & colours', <ProductVariantsPanel productId={productId} productName={productName} />)}
    </>
  );
};

export default ProductSuitePanels;
