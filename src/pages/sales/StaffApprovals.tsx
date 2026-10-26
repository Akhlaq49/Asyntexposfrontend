import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { printQuotation } from '../../utils/quotationPrint';

interface Line { productName: string; quantity: number; totalCost: number }
interface Approval {
  id: number; quotationId: number; quotationReference: string; customerName: string; grandTotal: number; quotationDate?: string | null;
  requestedByName: string; requestedAt: string; message?: string | null; recipientNames: string; sentToMe: boolean; status: string;
  decidedByName?: string | null; decidedAt?: string | null; decisionNote?: string | null; quotationExists: boolean; quotationChanged: boolean;
  saleReference?: string | null; items: Line[];
}

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const BADGE: Record<string, string> = { Pending: 'bg-warning', Approved: 'bg-success', Discarded: 'bg-danger', Withdrawn: 'bg-secondary', Cancelled: 'bg-secondary' };
const TABS = ['Pending', 'Approved', 'Discarded', 'All'];

/** Sales > Staff Approvals: quotations staff sent to the Admin / Super Admin, to approve or discard */
const StaffApprovals: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const [tab, setTab] = useState('Pending');
  const [all, setAll] = useState(false);
  const [rows, setRows] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [decide, setDecide] = useState<{ a: Approval; action: 'approve' | 'discard' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [decideError, setDecideError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api.get<Approval[]>('/quotation-approvals', { params: { all } })).data); }
    catch (e: any) { setError(e?.response?.data?.message || 'Could not load the requests.'); }
    setLoading(false);
  }, [all]);
  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [load, isAdmin]);

  const counts = useMemo(() => ({
    Pending: rows.filter((r) => r.status === 'Pending').length,
    Approved: rows.filter((r) => r.status === 'Approved').length,
    Discarded: rows.filter((r) => r.status === 'Discarded').length,
    All: rows.length,
  } as Record<string, number>), [rows]);
  const shown = rows.filter((r) => tab === 'All' || r.status === tab);

  const submit = async () => {
    if (!decide) return;
    if (decide.action === 'discard' && !note.trim()) { setDecideError('Write the reason for discarding it - the staff member will see it.'); return; }
    setBusy(true); setDecideError('');
    try {
      await api.post(`/quotation-approvals/${decide.a.id}/${decide.action}`, { note: note.trim() || undefined });
      setNotice(decide.action === 'approve'
        ? `${decide.a.quotationReference} approved - ${decide.a.requestedByName} can now convert it to a sale.`
        : `${decide.a.quotationReference} discarded - ${decide.a.requestedByName} will see your reason.`);
      setDecide(null); setNote(''); await load();
    } catch (e: any) { setDecideError(e?.response?.data?.message || 'Could not save.'); await load(); }
    setBusy(false);
  };

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Staff Approvals" subtitle="Quotations sent by staff for approval" breadcrumbs={[{ title: 'Sales' }]} />
        <div className="alert alert-info">Only an Admin or Super Admin can approve quotations. Send yours from <Link to="/quotation-list">Quotations</Link> with "Send for approval".</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Staff Approvals" subtitle="Quotations staff sent to you - approve them so they can be converted to a sale, or discard them with a reason" breadcrumbs={[{ title: 'Sales' }]} />
      {notice && <div className="alert alert-success py-2 d-flex justify-content-between">{notice}<button type="button" className="btn-close" onClick={() => setNotice('')} /></div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <ul className="nav nav-pills">
            {TABS.map((t) => (
              <li className="nav-item" key={t}>
                <a href="#" className={`nav-link py-1 ${tab === t ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setTab(t); }}>
                  {t}{counts[t] > 0 && <span className={`badge ms-1 ${t === 'Pending' && tab !== t ? 'bg-danger' : 'bg-light text-dark'}`}>{counts[t]}</span>}
                </a>
              </li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-3">
            <div className="form-check form-switch mb-0">
              <input className="form-check-input" type="checkbox" id="appr-all-req" checked={all} onChange={(e) => setAll(e.target.checked)} />
              <label className="form-check-label" htmlFor="appr-all-req">Show requests sent to other admins too</label>
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={load} title="Refresh"><i className="ti ti-refresh" /></button>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : shown.length === 0 ? (
            <div className="text-center text-muted py-5">{tab === 'Pending' ? 'Nothing waiting for approval.' : 'No requests here.'}</div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="thead-light"><tr><th>Quotation</th><th>Customer</th><th>Products</th><th className="text-end">Total</th><th>Sent by</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
                <tbody>
                  {shown.map((a) => (
                    <React.Fragment key={a.id}>
                      <tr>
                        <td>
                          <a href="#" className="fw-semibold" onClick={(e) => { e.preventDefault(); setOpen(open === a.id ? null : a.id); }}>{a.quotationReference}</a>
                          {a.quotationDate && <div><small className="text-muted">{a.quotationDate}</small></div>}
                        </td>
                        <td>{a.customerName || '-'}</td>
                        <td title={a.items.map((i) => `${i.productName} x ${i.quantity}`).join('\n')}>
                          {a.items[0] ? <>{a.items[0].productName} x {a.items[0].quantity}{a.items.length > 1 && <small className="text-muted"> +{a.items.length - 1} more</small>}</> : '-'}
                        </td>
                        <td className="text-end text-nowrap fw-semibold">{money(a.grandTotal)}</td>
                        <td>
                          {a.requestedByName}<div><small className="text-muted">{when(a.requestedAt)}</small></div>
                          {!a.sentToMe && <div><small className="text-muted">to {a.recipientNames}</small></div>}
                        </td>
                        <td>
                          <span className={`badge ${BADGE[a.status] || 'bg-secondary'}`}>{a.status === 'Withdrawn' ? 'Taken back' : a.status}</span>
                          {a.decidedByName && a.status !== 'Pending' && a.status !== 'Withdrawn' && <div><small className="text-muted">by {a.decidedByName}{a.decidedAt ? `, ${when(a.decidedAt)}` : ''}</small></div>}
                          {a.decisionNote && a.status !== 'Pending' && <div><small className="text-muted">"{a.decisionNote}"</small></div>}
                          {a.saleReference && <div><small className="text-success">Converted: {a.saleReference}</small></div>}
                        </td>
                        <td className="text-end text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="Details" onClick={() => setOpen(open === a.id ? null : a.id)}><i className={`ti ti-chevron-${open === a.id ? 'up' : 'down'}`} /></button>
                          {a.quotationExists && <button type="button" className="btn btn-sm btn-outline-dark me-1" title="Print the quotation" onClick={() => printQuotation(a.quotationId)}><i className="ti ti-printer" /></button>}
                          {a.status === 'Pending' && a.sentToMe && (
                            <>
                              <button type="button" className="btn btn-sm btn-success me-1" onClick={() => { setDecide({ a, action: 'approve' }); setNote(''); setDecideError(''); }}><i className="ti ti-check me-1" />Approve</button>
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setDecide({ a, action: 'discard' }); setNote(''); setDecideError(''); }}><i className="ti ti-x me-1" />Discard</button>
                            </>
                          )}
                        </td>
                      </tr>
                      {open === a.id && (
                        <tr><td colSpan={7} className="bg-light">
                          {a.message && <p className="mb-2"><strong>Message from {a.requestedByName}:</strong> {a.message}</p>}
                          {!a.quotationExists && <p className="text-danger mb-2">The quotation was deleted.</p>}
                          {a.quotationChanged && <p className="text-warning mb-2">The quotation total changed after it was sent.</p>}
                          <table className="table table-sm mb-0 bg-white" style={{ maxWidth: 700 }}>
                            <thead><tr><th>Product</th><th className="text-end">Qty</th><th className="text-end">Total</th></tr></thead>
                            <tbody>{a.items.map((i, n) => <tr key={n}><td>{i.productName}</td><td className="text-end">{i.quantity}</td><td className="text-end">{money(i.totalCost)}</td></tr>)}</tbody>
                            <tfoot><tr className="fw-bold"><td colSpan={2} className="text-end">Quotation total</td><td className="text-end">{money(a.grandTotal)}</td></tr></tfoot>
                          </table>
                          <small className="text-muted d-block mt-2">Sent to {a.recipientNames}. Open it in full (print, terms) from <Link to="/quotation-list">Quotations</Link>.</small>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {decide && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{decide.action === 'approve' ? 'Approve' : 'Discard'} {decide.a.quotationReference}</h4>
                <button type="button" className="btn-close" onClick={() => setDecide(null)} disabled={busy} />
              </div>
              <div className="modal-body">
                <p className="mb-2">{decide.a.customerName} - <strong>{money(decide.a.grandTotal)}</strong>, sent by {decide.a.requestedByName}.</p>
                <p className="text-muted small">{decide.action === 'approve'
                  ? `${decide.a.requestedByName} will then be able to convert it to a sale.`
                  : `${decide.a.requestedByName} will see your reason and can change the quotation and send it again.`}</p>
                <label className="form-label mb-1">{decide.action === 'approve' ? <>Note <small className="text-muted">(optional)</small></> : <>Reason<span className="text-danger ms-1">*</span></>}</label>
                <textarea className="form-control" rows={3} maxLength={500} autoFocus value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={decide.action === 'approve' ? 'e.g. OK, deliver after payment' : 'e.g. Discount too high - keep it under 5%'} />
                {decideError && <div className="alert alert-danger py-2 mt-3 mb-0">{decideError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-dark me-auto" onClick={() => printQuotation(decide.a.quotationId)} disabled={busy}><i className="ti ti-printer me-1" />Print quotation</button>
                <button type="button" className="btn btn-secondary" onClick={() => setDecide(null)} disabled={busy}>Cancel</button>
                <button type="button" className={`btn ${decide.action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={submit} disabled={busy}>
                  {busy ? 'Saving...' : decide.action === 'approve' ? 'Approve' : 'Discard'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffApprovals;
