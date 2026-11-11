import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/suite/Modal';
import { LocationSelect, ProductSearch, statusBadge, useLocations } from '../../components/suite/Pickers';
import suite, { Transfer } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

interface Line { productId: number; productName: string; quantity: number; available?: number }

/** Stock moves between locations in two steps: dispatch (stock leaves, in transit) and receive (stock arrives). */
const Transfers: React.FC = () => {
  const locations = useLocations();
  const [rows, setRows] = useState<Transfer[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState<number | ''>('');
  const [to, setTo] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [receiving, setReceiving] = useState<Transfer | null>(null);
  const [received, setReceived] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await suite.transfers()); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load transfers', text: apiError(err) }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const addLine = async (p: { id: number; productName: string }) => {
    if (lines.some((l) => l.productId === p.id)) return;
    let available: number | undefined;
    if (from) {
      try {
        const s = await suite.productStock(p.id);
        available = s.locations.find((l) => l.locationId === from)?.sellable ?? 0;
      } catch { /* shown as unknown */ }
    }
    setLines((ls) => [...ls, { productId: p.id, productName: p.productName, quantity: 1, available }]);
  };

  const submit = async (mode: 'draft' | 'dispatch') => {
    if (!from || !to) { Swal.fire({ icon: 'info', title: 'Choose both locations' }); return; }
    if (lines.length === 0) { Swal.fire({ icon: 'info', title: 'Add at least one product' }); return; }
    setBusy(true);
    try {
      const r = await suite.createTransfer({ fromLocationId: from, toLocationId: to, mode, notes: notes || undefined, items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) });
      Swal.fire({ icon: 'success', title: mode === 'dispatch' ? `${r.referenceNumber} dispatched` : `${r.referenceNumber} saved as draft`, text: mode === 'dispatch' ? 'The stock is in transit until the receiving branch confirms it.' : undefined });
      setCreating(false); setLines([]); setNotes('');
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not create the transfer', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const act = async (t: Transfer, action: 'dispatch' | 'cancel' | 'delete') => {
    const labels = { dispatch: 'Dispatch now?', cancel: 'Cancel this transfer?', delete: 'Delete this draft?' };
    const ok = await Swal.fire({ icon: 'question', title: labels[action], text: action === 'cancel' && t.status === 'Dispatched' ? 'The stock goes back to the sending location.' : undefined, showCancelButton: true });
    if (!ok.isConfirmed) return;
    try {
      if (action === 'dispatch') await suite.dispatchTransfer(t.id);
      else if (action === 'cancel') await suite.cancelTransfer(t.id);
      else await suite.deleteTransfer(t.id);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not update', text: apiError(err) }); }
  };

  const openReceive = (t: Transfer) => {
    setReceiving(t);
    setReceived(Object.fromEntries(t.items.map((i) => [i.id, i.quantity])));
  };

  const confirmReceive = async () => {
    if (!receiving) return;
    setBusy(true);
    try {
      const r = await suite.receiveTransfer(receiving.id, receiving.items.map((i) => ({ itemId: i.id, receivedQty: received[i.id] ?? i.quantity })));
      Swal.fire({ icon: r.shortBy > 0 ? 'warning' : 'success', title: 'Stock received', text: r.shortBy > 0 ? `${r.shortBy} unit(s) short have been recorded on the transfer.` : undefined });
      setReceiving(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not receive', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const shown = rows.filter((r) => !status || r.status === status);

  return (
    <>
      <PageHeader title="Stock Transfers" subtitle="Move stock between branches and warehouses. Batches and expiry dates travel with the stock."
        breadcrumbs={[{ title: 'Stock' }, { title: 'Stock Transfers' }]}
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><i className="ti ti-plus me-1" />New transfer</button>} />
      <div className="card">
        <div className="card-header d-flex gap-2 align-items-center">
          <select className="form-select form-select-sm" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All transfers</option><option>Draft</option><option>Dispatched</option><option>Received</option><option>Cancelled</option>
          </select>
          <span className="text-muted fs-13">{rows.filter((r) => r.status === 'Dispatched').length} in transit</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead><tr><th>Reference</th><th>From</th><th>To</th><th className="text-end">Units</th><th>Status</th><th>Dispatched</th><th>Received</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">No transfers.</td></tr>}
              {shown.map((t) => (
                <tr key={t.id}>
                  <td className="fw-medium">{t.referenceNumber}<div className="text-muted fs-12">{t.date}</div></td>
                  <td>{t.warehouseFrom}</td>
                  <td>{t.warehouseTo}</td>
                  <td className="text-end">{t.quantityTransferred}</td>
                  <td>{statusBadge(t.status)}{t.notes && <div className="text-muted fs-12">{t.notes}</div>}</td>
                  <td className="fs-12">{t.dispatchedAt}{t.dispatchedBy && <div className="text-muted">{t.dispatchedBy}</div>}</td>
                  <td className="fs-12">{t.receivedAt}{t.receivedBy && <div className="text-muted">{t.receivedBy}</div>}</td>
                  <td className="text-end text-nowrap">
                    {t.status === 'Draft' && <button type="button" className="btn btn-sm btn-primary me-1" onClick={() => void act(t, 'dispatch')}>Dispatch</button>}
                    {t.status === 'Dispatched' && <button type="button" className="btn btn-sm btn-success me-1" onClick={() => openReceive(t)}>Receive</button>}
                    {(t.status === 'Draft' || t.status === 'Dispatched') && <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => void act(t, 'cancel')}>Cancel</button>}
                    {(t.status === 'Draft' || t.status === 'Cancelled') && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void act(t, 'delete')} aria-label="Delete"><i className="ti ti-trash" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={creating} title="New transfer" onClose={() => setCreating(false)} size="lg"
        footer={<>
          <button type="button" className="btn btn-light" onClick={() => setCreating(false)}>Cancel</button>
          <button type="button" className="btn btn-outline-primary" disabled={busy} onClick={() => void submit('draft')}>Save as draft</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submit('dispatch')}>{busy && <span className="spinner-border spinner-border-sm me-1" />}Dispatch now</button>
        </>}>
        <div className="row g-3 mb-3">
          <div className="col-md-6"><label className="form-label">From</label>
            <LocationSelect locations={locations} value={from} onChange={(v) => { setFrom(v); setLines([]); }} allowAll="Choose…" ariaLabel="From location" /></div>
          <div className="col-md-6"><label className="form-label">To</label>
            <LocationSelect locations={locations.filter((l) => l.id !== from)} value={to} onChange={setTo} allowAll="Choose…" ariaLabel="To location" /></div>
        </div>
        <div className="mb-2"><ProductSearch onPick={(p) => void addLine(p)} placeholder={from ? 'Add product' : 'Choose the sending location first'} /></div>
        <table className="table table-sm align-middle">
          <thead><tr><th>Product</th><th className="text-end">Available at sender</th><th style={{ width: 130 }}>Send (units)</th><th /></tr></thead>
          <tbody>
            {lines.length === 0 && <tr><td colSpan={4} className="text-muted">No products yet. Earliest-expiry batches are sent first.</td></tr>}
            {lines.map((l, i) => (
              <tr key={l.productId}>
                <td>{l.productName}</td>
                <td className={`text-end ${l.available !== undefined && l.quantity > l.available ? 'text-danger fw-bold' : ''}`}>{l.available ?? '—'}</td>
                <td><input type="number" min={1} className="form-control form-control-sm" value={l.quantity} aria-label={`Quantity for ${l.productName}`}
                  onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} /></td>
                <td><button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove"><i className="ti ti-x" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <label className="form-label">Notes</label>
        <input className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Modal>

      <Modal show={!!receiving} title={`Receive ${receiving?.referenceNumber ?? ''}`} onClose={() => setReceiving(null)} size="lg"
        footer={<><button type="button" className="btn btn-light" onClick={() => setReceiving(null)}>Cancel</button>
          <button type="button" className="btn btn-success" disabled={busy} onClick={() => void confirmReceive()}>Confirm receipt</button></>}>
        <p className="text-muted fs-13">Enter what actually arrived. Anything short is recorded on the transfer and in the activity log.</p>
        <table className="table table-sm align-middle">
          <thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th className="text-end">Sent</th><th style={{ width: 120 }}>Received</th></tr></thead>
          <tbody>
            {receiving?.items.map((i) => (
              <tr key={i.id}>
                <td>{i.productName}</td><td>{i.batchNo}</td><td>{i.expiryDate}</td><td className="text-end">{i.quantity}</td>
                <td><input type="number" min={0} max={i.quantity} className="form-control form-control-sm" value={received[i.id] ?? i.quantity} aria-label={`Received ${i.productName}`}
                  onChange={(e) => setReceived({ ...received, [i.id]: Math.min(i.quantity, Math.max(0, Number(e.target.value))) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </>
  );
};

export default Transfers;
