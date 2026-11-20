import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { getSalePrices, profitPercent, SalePriceRow, saveSalePrices } from '../../services/INVT/purchasePriceService';

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;

/**
 * Inventory > Sale Prices: the sale price of each product, set here. The purchase price is the unit cost of the
 * product's latest received purchase (a product not bought yet costs its sale price: no profit), and
 * profit = sale price - purchase price.
 */
const SalePrices: React.FC = () => {
  const [rows, setRows] = useState<SalePriceRow[] | null>(null);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [onlyNotBought, setOnlyNotBought] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getSalePrices().then(setRows).catch((e) => setError(errorText(e, 'Could not load the prices.'))); }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter((r) => (!onlyNotBought || !r.purchasedFrom) &&
      (!q || [r.productName, r.sku, r.model, r.color].some((v) => (v || '').toLowerCase().includes(q))));
  }, [rows, search, onlyNotBought]);
  const changed = Object.entries(edits).filter(([id, v]) => {
    const r = rows?.find((x) => x.productId === Number(id));
    return r && v !== '' && Number(v) !== r.salePrice;
  });
  const invalid = Object.values(edits).some((v) => v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0));
  const notBought = (rows || []).filter((r) => !r.purchasedFrom).length;
  const lossMaking = (rows || []).filter((r) => r.purchasedFrom && r.profit < 0).length;

  const save = async () => {
    if (invalid) { setError('A sale price must be a number of 0 or more.'); return; }
    setSaving(true);
    try {
      setRows(await saveSalePrices(changed.map(([id, v]) => ({ productId: Number(id), salePrice: Number(v) }))));
      setEdits({}); setError(''); setMsg(`${changed.length} sale price${changed.length === 1 ? '' : 's'} saved.`);
    } catch (e) { setError(errorText(e, 'Could not save the sale prices.')); }
    setSaving(false);
  };

  return (
    <>
      <PageHeader title="Sale Prices" subtitle="Set the sale price of each product; profit = sale price - purchase price (from the latest received purchase)" breadcrumbs={[{ title: 'Inventory' }]} />
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {msg && !error && <div className="alert alert-success py-2">{msg}</div>}
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <input className="form-control sp-search" style={{ width: 280 }} placeholder="Search product, SKU, model or colour" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="text-muted small">{rows ? `${shown.length} of ${rows.length} products` : ''}</span>
        {notBought > 0 && (
          <button type="button" className={`btn btn-sm ${onlyNotBought ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setOnlyNotBought((v) => !v)}
            title="These products have no received purchase yet, so their purchase price is their sale price (no profit)">
            {notBought} not purchased yet
          </button>
        )}
        {lossMaking > 0 && <span className="badge bg-danger">{lossMaking} selling below purchase price</span>}
        <div className="ms-auto d-flex gap-2">
          {changed.length > 0 && <button className="btn btn-light border" onClick={() => setEdits({})}>Undo changes</button>}
          <button className="btn btn-primary sp-save" disabled={saving || changed.length === 0} onClick={save}>{saving ? 'Saving...' : `Save${changed.length ? ` (${changed.length})` : ''}`}</button>
        </div>
      </div></div>
      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table align-middle mb-0 sale-prices">
          <thead className="thead-light"><tr>
            <th>Product</th>
            <th className="text-end">Purchase price</th>
            <th className="text-end" style={{ width: 190 }}>Sale price</th>
            <th className="text-end">Profit</th>
            <th>Purchased from</th>
          </tr></thead>
          <tbody>
            {!rows ? <tr><td colSpan={5} className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></td></tr>
              : shown.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-muted">No products match.</td></tr>
              : shown.map((r) => {
                const value = edits[r.productId] ?? String(r.salePrice);
                const sale = value === '' || Number.isNaN(Number(value)) ? r.salePrice : Number(value);
                // a product not bought yet costs its (new) sale price: no profit until it is purchased
                const cost = r.purchasedFrom ? r.purchasePrice : sale;
                const profit = sale - cost;
                return (
                  <tr key={r.productId} data-product={r.productId}>
                    <td><div className="fw-semibold">{r.productName}</div><small className="text-muted">{[r.sku, r.model, r.color].filter(Boolean).join(' · ')}</small></td>
                    <td className="text-end text-nowrap">{r.purchasedFrom ? money(cost) : <span className="text-muted" title="Not purchased yet: the sale price is used">{money(cost)}</span>}</td>
                    <td className="text-end">
                      <input type="number" min={0} step="any" className={`form-control form-control-sm text-end sp-input ${value !== '' && Number(value) < 0 ? 'is-invalid' : ''}`}
                        value={value} onChange={(e) => setEdits({ ...edits, [r.productId]: e.target.value })} aria-label={`Sale price of ${r.productName}`} />
                    </td>
                    <td className={`text-end text-nowrap fw-semibold ${profit < 0 ? 'text-danger' : profit > 0 ? 'text-success' : 'text-muted'}`}>
                      {money(profit)} <small className="fw-normal text-muted">({profitPercent(sale, cost)}%)</small>
                    </td>
                    <td className="small text-nowrap">
                      {r.purchasedFrom
                        ? <span className="text-muted"><Link to="/purchase-list">{r.purchasedFrom}</Link> · {day(r.purchasedOn)}</span>
                        : <span className="badge bg-warning-subtle text-warning-emphasis border">Not purchased yet</span>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div></div></div>
    </>
  );
};

export default SalePrices;
