import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import { DateRange, daysAgo, ymd } from '../../components/pharmacy/ReportTable';
import pharmacyService, { apiError } from '../../services/pharmacyService';

type Log = Awaited<ReturnType<typeof pharmacyService.getAuditLogs>>['items'][number];

const ACTIONS = ['', 'PriceChanged', 'StockChanged', 'StockAdjusted', 'WrittenOff', 'Refund', 'Deleted', 'Updated', 'Created', 'Payment', 'TillOpened', 'TillClosed', 'BatchUpdated'];

/** Turns the stored JSON into a short readable line. */
const describe = (details: string | null) => {
  if (!details) return '';
  try {
    const obj = JSON.parse(details);
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  } catch {
    return details;
  }
};

const AuditLog: React.FC = () => {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(ymd(new Date()));
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ totalCount: number; items: Log[] }>({ totalCount: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await pharmacyService.getAuditLogs({ from, to, user: user || undefined, action: action || undefined, page, pageSize })); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load the activity log', text: apiError(err, 'Only an admin can view the activity log.') }); }
    finally { setLoading(false); }
  }, [from, to, user, action, page]);

  useEffect(() => { void load(); }, [load]);
  const pages = Math.max(1, Math.ceil(data.totalCount / pageSize));

  return (
    <>
      <PageHeader title="Activity Log" subtitle="Price changes, stock adjustments, deletions, refunds and shift closings, with who did them" breadcrumbs={[{ title: 'User Management' }]} />
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-2 align-items-center">
          <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
          <input className="form-control form-control-sm" style={{ width: 150 }} placeholder="User (all)" value={user} onChange={(e) => { setUser(e.target.value); setPage(1); }} aria-label="User" />
          <select className="form-select form-select-sm" style={{ width: 170 }} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Action">
            {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All actions'}</option>)}
          </select>
          <span className="ms-auto text-muted fs-13">{data.totalCount} entries</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0 align-middle">
              <thead><tr><th>When</th><th>User</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                ) : data.items.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted py-4">No activity in this period.</td></tr>
                ) : data.items.map((l) => (
                  <tr key={l.id}>
                    <td className="text-nowrap">{new Date(l.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{l.userName}</td>
                    <td><span className={`badge ${l.action === 'Deleted' ? 'bg-danger' : l.action === 'PriceChanged' ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>{l.action}</span></td>
                    <td className="text-nowrap">{l.entityType} {l.entityId}</td>
                    <td className="fs-13" style={{ maxWidth: 520, wordBreak: 'break-word' }}>{describe(l.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {pages > 1 && (
          <div className="card-footer d-flex justify-content-end gap-2 align-items-center">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="fs-13">Page {page} of {pages}</span>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </>
  );
};

export default AuditLog;
