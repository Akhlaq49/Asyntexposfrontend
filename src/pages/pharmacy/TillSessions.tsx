import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import ReportTable, { Column, DateRange, daysAgo, money, ymd } from '../../components/pharmacy/ReportTable';
import pharmacyService, { TillSummary, apiError } from '../../services/pharmacyService';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/** Shift closing history: expected cash against cash counted, per cashier. */
const TillSessions: React.FC = () => {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(ymd(new Date()));
  const [user, setUser] = useState('');
  const [rows, setRows] = useState<TillSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await pharmacyService.getTillHistory({ from, to, user: user || undefined })); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load till sessions', text: apiError(err) }); }
    finally { setLoading(false); }
  }, [from, to, user]);

  useEffect(() => { void load(); }, [load]);

  const columns: Column<TillSummary>[] = [
    { key: 'userName', label: 'Cashier' },
    { key: 'store', label: 'Branch' },
    { key: 'openedAt', label: 'Opened', value: (r) => when(r.openedAt) },
    { key: 'closedAt', label: 'Closed', value: (r) => when(r.closedAt), render: (r) => (r.status === 'Open' ? <span className="badge bg-success">Open</span> : when(r.closedAt)) },
    { key: 'bills', label: 'Bills', align: 'end', total: true },
    { key: 'openingCash', label: 'Opening', align: 'end', money: true },
    { key: 'cashSales', label: 'Cash sales', align: 'end', money: true, total: true },
    { key: 'cashRefunds', label: 'Refunds', align: 'end', money: true, total: true },
    { key: 'expectedCash', label: 'Expected cash', align: 'end', money: true, total: true },
    { key: 'countedCash', label: 'Counted', align: 'end', money: true, total: true },
    {
      key: 'difference', label: 'Difference', align: 'end', total: true, money: true,
      render: (r) => (r.difference == null ? '' : <span className={Math.abs(r.difference) < 1 ? 'text-success' : 'text-danger fw-bold'}>{money(r.difference)}</span>),
    },
    { key: 'cardSales', label: 'Card', align: 'end', money: true, total: true },
    { key: 'creditSales', label: 'Credit', align: 'end', money: true, total: true },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <>
      <PageHeader title="Till Sessions" subtitle="Shift openings and closings with cash counted against cash expected" breadcrumbs={[{ title: 'Sales' }]} />
      <ReportTable title="Till Sessions" filename="till-sessions" columns={columns} rows={rows} loading={loading} rowKey={(r) => r.id}
        rowClassName={(r) => (r.difference != null && Math.abs(r.difference) >= 1 ? 'table-warning' : '')}
        empty="No shifts in this period."
        toolbar={(
          <>
            <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
            <input className="form-control form-control-sm" style={{ width: 150 }} placeholder="Cashier (all)" value={user} onChange={(e) => setUser(e.target.value)} aria-label="Cashier" />
          </>
        )} />
    </>
  );
};

export default TillSessions;
