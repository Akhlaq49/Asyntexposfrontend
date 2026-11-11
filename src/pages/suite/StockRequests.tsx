import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/suite/Modal';
import { LocationSelect, ProductSearch, statusBadge, useLocations } from '../../components/suite/Pickers';
import suite, { StockRequest } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

/** Branches ask a warehouse for stock; the warehouse approves and dispatches; the branch receives the transfer. */
const StockRequests: React.FC = () => {
  const locations = useLocations();
  const [rows, setRows] = useState<StockRequest[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState<number | ''>('');
  const [to, setTo] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ productId: number; productName: string; requestedQty: number }[]>([]);
  const [approving, setApproving] = useState<StockRequest | null>(null);
  const [approved, setApproved] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await suite.requests(status || undefined)); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load requests', text: apiError(err) }); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (lines.length === 0) { Swal.fire({ icon: 'info', title: 'Add at least one product' }); return; }
    try {
      await suite.createRequest({ fromLocationId: from || undefined, toLocationId: to || undefined, notes: notes || undefined, submit: true,
        items: lines.map((l) => ({ productId: l.productId, requestedQty: l.requestedQty })) });
      setCreating(false); setLines([]); setNotes('');
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not send the request', text: apiError(err) }); }
  };

  const generate = async () => {
    try {
      const r = await suite.generateReorder();
      Swal.fire({ icon: r.created ? 'success' : 'info', title: r.created ? `${r.created} request(s) raised` : 'Nothing below minimum',
        text: r.created ? r.references.join(', ') : 'Set minimum / maximum stock per branch on Branches & Warehouses.' });
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not generate', text: apiError(err) }); }
  };

  const approve = async () => {
    if (!approving) return;
    try {
      const r = await suite.approveRequest(approving.id, approving.items.map((i) => ({ itemId: i.id, approvedQty: approved[i.id] ?? i.requestedQty })));
      Swal.fire({ icon: 'success', title: `Dispatched as ${r.referenceNumber}`, text: 'The branch confirms receipt on the Stock Transfers page.' });
      setApproving(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not approve', text: apiError(err) }); }
  };

  const reject = async (r: StockRequest) => {
    const { value, isConfirmed } = await Swal.fire({ title: `Reject ${r.reference}?`, input: 'text', inputLabel: 'Reason (optional)', showCancelButton: true, confirmButtonText: 'Reject' });
    if (!isConfirmed) return;
    try { await suite.rejectRequest(r.id, value || undefined); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not reject', text: apiError(err) }); }
  };

  return (
    <>
      <PageHeader title="Stock Requisitions" subtitle="Branches request stock; the warehouse fulfils it as a transfer."
        breadcrumbs={[{ title: 'Stock' }, { title: 'Requisitions' }]}
        actions={<div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-primary" onClick={() => void generate()}><i className="ti ti-refresh me-1" />Generate reorder</button>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><i className="ti ti-plus me-1" />New request</button>
        </div>} />
      <div className="card">
        <div className="card-header">
          <select className="form-select form-select-sm" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All requests</option><option>Submitted</option><option>Approved</option><option>Fulfilled</option><option>Rejected</option><option>Draft</option>
          </select>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead><tr><th>Reference</th><th>Branch</th><th>From</th><th>Items</th><th>Status</th><th>By</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">No requests.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="fw-medium">{r.reference}<div className="text-muted fs-12">{r.createdAt}{r.source === 'AutoReorder' && ' · auto'}</div></td>
                  <td>{r.toLocation}</td>
                  <td>{r.fromLocation}</td>
                  <td className="fs-13">{r.items.map((i) => <div key={i.id}>{i.productName}: {i.requestedQty}{i.approvedQty != null && i.approvedQty !== i.requestedQty && <span className="text-muted"> → {i.approvedQty}</span>}</div>)}</td>
                  <td>{statusBadge(r.status)}{r.notes && <div className="text-muted fs-12">{r.notes}</div>}</td>
                  <td className="fs-12">{r.requestedBy}{r.approvedBy && <div className="text-muted">approved: {r.approvedBy}</div>}</td>
                  <td className="text-end text-nowrap">
                    {(r.status === 'Submitted' || r.status === 'Draft') && <>
                      <button type="button" className="btn btn-sm btn-primary me-1" onClick={() => { setApproving(r); setApproved(Object.fromEntries(r.items.map((i) => [i.id, i.requestedQty]))); }}>Approve</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void reject(r)}>Reject</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={creating} title="Request stock" onClose={() => setCreating(false)} size="lg"
        footer={<><button type="button" className="btn btn-light" onClick={() => setCreating(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void create()}>Send request</button></>}>
        <div className="row g-3 mb-3">
          <div className="col-md-6"><label className="form-label">For branch</label>
            <LocationSelect locations={locations} value={to} onChange={setTo} allowAll="My branch" ariaLabel="Requesting branch" /></div>
          <div className="col-md-6"><label className="form-label">From warehouse</label>
            <LocationSelect locations={locations} value={from} onChange={setFrom} allowAll="Branch's usual supplier" ariaLabel="Supplying warehouse" /></div>
        </div>
        <ProductSearch onPick={(p) => !lines.some((l) => l.productId === p.id) && setLines([...lines, { productId: p.id, productName: p.productName, requestedQty: 1 }])} />
        <table className="table table-sm align-middle mt-2">
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.productId}>
                <td>{l.productName}</td>
                <td style={{ width: 140 }}><input type="number" min={1} className="form-control form-control-sm" value={l.requestedQty} aria-label={`Quantity for ${l.productName}`}
                  onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, requestedQty: Number(e.target.value) } : x)))} /></td>
                <td style={{ width: 40 }}><button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove"><i className="ti ti-x" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <input className="form-control" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
      </Modal>

      <Modal show={!!approving} title={`Approve ${approving?.reference ?? ''}`} onClose={() => setApproving(null)}
        footer={<><button type="button" className="btn btn-light" onClick={() => setApproving(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void approve()}>Approve and dispatch</button></>}>
        <p className="text-muted fs-13">Set what the warehouse will send. Stock is picked earliest expiry first and leaves the warehouse now.</p>
        <table className="table table-sm align-middle">
          <thead><tr><th>Product</th><th className="text-end">Asked</th><th style={{ width: 120 }}>Send</th></tr></thead>
          <tbody>
            {approving?.items.map((i) => (
              <tr key={i.id}>
                <td>{i.productName}</td><td className="text-end">{i.requestedQty}</td>
                <td><input type="number" min={0} className="form-control form-control-sm" value={approved[i.id] ?? i.requestedQty} aria-label={`Send ${i.productName}`}
                  onChange={(e) => setApproved({ ...approved, [i.id]: Math.max(0, Number(e.target.value)) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </>
  );
};

export default StockRequests;
