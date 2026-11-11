import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import suite, { MedicineMaster } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

/** The shared medicine catalogue: search registered medicines, add them to this pharmacy, apply official price changes. */
const MedicineCatalogue: React.FC = () => {
  const [tab, setTab] = useState<'search' | 'prices'>('search');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ medicine: MedicineMaster; productId: number | null }[]>([]);
  const [stats, setStats] = useState<{ medicines: number; interactions: number; lastPriceUpdate?: string; linkedProducts: number } | null>(null);
  const [changes, setChanges] = useState<{ productId: number; productName: string; currentPrice: number; newPrice: number; boxPrice: number; priceUpdatedOn?: string }[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { suite.catalogueStats().then(setStats).catch(() => setStats(null)); }, []);
  useEffect(() => {
    if (tab !== 'prices') return;
    suite.priceChanges().then((c) => { setChanges(c); setPicked(c.map((x) => x.productId)); }).catch((err) => Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }));
  }, [tab]);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = window.setTimeout(() => {
      const barcode = /^\d{8,}$/.test(q.trim()) ? q.trim() : undefined;
      suite.searchCatalogue(barcode ? '' : q.trim(), barcode).then(setResults).catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const add = async (m: MedicineMaster) => {
    setBusy(true);
    try {
      const r = await suite.importMedicine(m.id);
      setResults((rs) => rs.map((x) => (x.medicine.id === m.id ? { ...x, productId: r.productId } : x)));
      Swal.fire({ icon: 'success', title: 'Added to your products', html: `Set the rack and opening stock on the <a href="/edit-product/${r.productId}">product page</a>.` });
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not add', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (picked.length === 0) return;
    const ok = await Swal.fire({ icon: 'question', title: `Update ${picked.length} price(s)?`, showCancelButton: true });
    if (!ok.isConfirmed) return;
    try {
      const r = await suite.applyPriceChanges(picked);
      Swal.fire({ icon: 'success', title: `${r.changed} price(s) updated` });
      setTab('search'); setTimeout(() => setTab('prices'), 0);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not update', text: apiError(err) }); }
  };

  return (
    <>
      <PageHeader title="Medicine Catalogue" subtitle="Registered medicines with generic, strength, pack size and retail price, ready to add to your products."
        breadcrumbs={[{ title: 'Inventory' }, { title: 'Medicine Catalogue' }]} />
      {stats && (
        <div className="alert alert-light border d-flex flex-wrap gap-4 py-2">
          <span><b>{stats.medicines.toLocaleString()}</b> medicines in the catalogue</span>
          <span><b>{stats.linkedProducts}</b> of your products linked</span>
          <span><b>{stats.interactions}</b> interaction pairs</span>
          {stats.lastPriceUpdate && <span>Prices updated {stats.lastPriceUpdate.slice(0, 10)}</span>}
        </div>
      )}
      {stats && stats.medicines === 0 && <div className="alert alert-warning">The catalogue has not been loaded on this server yet. It is maintained centrally by Asyntex.</div>}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button type="button" className={`nav-link ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>Search and add</button></li>
        <li className="nav-item"><button type="button" className={`nav-link ${tab === 'prices' ? 'active' : ''}`} onClick={() => setTab('prices')}>Price changes</button></li>
      </ul>

      {tab === 'search' && (
        <div className="card">
          <div className="card-header"><input className="form-control" style={{ maxWidth: 420 }} placeholder="Brand, generic name or barcode" value={q} autoFocus onChange={(e) => setQ(e.target.value)} aria-label="Search catalogue" /></div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead><tr><th>Brand</th><th>Generic</th><th>Strength / form</th><th>Pack</th><th>Company</th><th>Schedule</th><th className="text-end">Retail (pack)</th><th /></tr></thead>
              <tbody>
                {results.length === 0 && <tr><td colSpan={8} className="text-muted text-center py-4">{q.length < 2 ? 'Type at least two letters.' : 'No match.'}</td></tr>}
                {results.map(({ medicine: m, productId }) => (
                  <tr key={m.id}>
                    <td className="fw-medium">{m.brandName}<div className="text-muted fs-12">{m.registrationNo}</div></td>
                    <td>{m.genericName}</td>
                    <td>{[m.strength, m.dosageForm].filter(Boolean).join(' · ')}</td>
                    <td>{m.packSize ?? (m.unitsPerStrip ? `${m.unitsPerStrip} x ${m.stripsPerBox ?? 1}` : '')}</td>
                    <td>{m.manufacturer}</td>
                    <td>{m.schedule && <span className={`badge ${m.schedule === 'Controlled' ? 'bg-danger' : m.schedule === 'Rx' ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>{m.schedule}</span>}</td>
                    <td className="text-end">{m.maxRetailPrice ?? ''}</td>
                    <td className="text-end">{productId
                      ? <Link to={`/edit-product/${productId}`} className="btn btn-sm btn-outline-secondary">In your products</Link>
                      : <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => void add(m)}>Add</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'prices' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span className="text-muted fs-13">Catalogue retail price (per pack) divided by the pack size gives the new price per unit.</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={picked.length === 0} onClick={() => void apply()}>Update {picked.length} price(s)</button>
          </div>
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead><tr><th style={{ width: 40 }}><input type="checkbox" className="form-check-input" checked={picked.length === changes.length && changes.length > 0} onChange={(e) => setPicked(e.target.checked ? changes.map((c) => c.productId) : [])} aria-label="Select all" /></th><th>Product</th><th className="text-end">Now</th><th className="text-end">New</th><th className="text-end">Pack price</th><th>Changed on</th></tr></thead>
              <tbody>
                {changes.length === 0 && <tr><td colSpan={6} className="text-muted text-center py-4">All linked products already match the catalogue.</td></tr>}
                {changes.map((c) => (
                  <tr key={c.productId}>
                    <td><input type="checkbox" className="form-check-input" checked={picked.includes(c.productId)} onChange={(e) => setPicked(e.target.checked ? [...picked, c.productId] : picked.filter((x) => x !== c.productId))} aria-label={`Select ${c.productName}`} /></td>
                    <td>{c.productName}</td><td className="text-end">{c.currentPrice}</td>
                    <td className={`text-end fw-medium ${c.newPrice > c.currentPrice ? 'text-danger' : 'text-success'}`}>{c.newPrice}</td>
                    <td className="text-end">{c.boxPrice}</td><td>{c.priceUpdatedOn?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default MedicineCatalogue;
