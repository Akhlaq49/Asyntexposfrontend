import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getPurchasePrices, marginPercent, PurchasePriceRow, savePurchasePrices } from '../../services/INVT/purchasePriceService';

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;

/**
 * Inventory > Purchase Prices: what the company pays for each inventory product. Purchase orders start from these
 * prices, and quotations show their profit against them. A new product starts at its end user price less 10,000.
 */
const PurchasePrices: React.FC = () => {
  const [rows, setRows] = useState<PurchasePriceRow[] | null>(null);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getPurchasePrices().then(setRows).catch((e) => setError(errorText(e, 'Could not load the purchase prices.'))); }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter((r) => !q || [r.productName, r.sku, r.model, r.color].some((v) => (v || '').toLowerCase().includes(q)));
  }, [rows, search]);
  const changed = Object.entries(edits).filter(([id, v]) => {
    const r = rows?.find((x) => x.productId === Number(id));
    return r && v !== '' && Number(v) !== r.purchasePrice;
  });
  const invalid = Object.values(edits).some((v) => v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0));

  const save = async () => {
    if (invalid) { setError('A purchase price must be a number of 0 or more.'); return; }
    setSaving(true);
    try {
      setRows(await savePurchasePrices(changed.map(([id, v]) => ({ productId: Number(id), purchasePrice: Number(v) }))));
      setEdits({}); setError(''); setMsg(`${changed.length} purchase price${changed.length === 1 ? '' : 's'} saved.`);
    } catch (e) { setError(errorText(e, 'Could not save the purchase prices.')); }
    setSaving(false);
  };

  return (
    <>
      <PageHeader title="Purchase Prices" subtitle="What you pay for each product: purchase orders start from it, quotations show their profit against it" breadcrumbs={[{ title: 'Inventory' }]} />
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {msg && !error && <div className="alert alert-success py-2">{msg}</div>}
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <input className="form-control pp-search" style={{ width: 280 }} placeholder="Search product, SKU, model or colour" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="text-muted small">{rows ? `${shown.length} of ${rows.length} products` : ''}</span>
        <div className="ms-auto d-flex gap-2">
          {changed.length > 0 && <button className="btn btn-light border" onClick={() => setEdits({})}>Undo changes</button>}
          <button className="btn btn-primary pp-save" disabled={saving || changed.length === 0} onClick={save}>{saving ? 'Saving...' : `Save${changed.length ? ` (${changed.length})` : ''}`}</button>
        </div>
      </div></div>
      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table align-middle mb-0 purchase-prices">
          <thead className="thead-light"><tr><th>Product</th><th className="text-end">End user price</th><th className="text-end" style={{ width: 190 }}>Purchase price</th><th className="text-end">Margin</th><th>Last changed</th></tr></thead>
          <tbody>
            {!rows ? <tr><td colSpan={5} className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></td></tr>
              : shown.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-muted">No products match.</td></tr>
              : shown.map((r) => {
                const value = edits[r.productId] ?? String(r.purchasePrice);
                const price = value === '' || Number.isNaN(Number(value)) ? r.purchasePrice : Number(value);
                const margin = r.endUserPrice - price;
                return (
                  <tr key={r.productId} data-product={r.productId}>
                    <td><div className="fw-semibold">{r.productName}</div><small className="text-muted">{[r.sku, r.model, r.color].filter(Boolean).join(' · ')}</small></td>
                    <td className="text-end text-nowrap">{money(r.endUserPrice)}</td>
                    <td className="text-end">
                      <input type="number" min={0} step="any" className={`form-control form-control-sm text-end pp-input ${value !== '' && Number(value) < 0 ? 'is-invalid' : ''}`}
                        value={value} onChange={(e) => setEdits({ ...edits, [r.productId]: e.target.value })} aria-label={`Purchase price of ${r.productName}`} />
                    </td>
                    <td className={`text-end text-nowrap ${margin < 0 ? 'text-danger' : ''}`}>{money(margin)} <small className="text-muted">({marginPercent(r.endUserPrice, price)}%)</small></td>
                    <td className="small text-muted text-nowrap">{new Date(r.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{r.updatedBy ? ` · ${r.updatedBy}` : ''}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div></div></div>
    </>
  );
};

export default PurchasePrices;
