import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ReportTable, { Column, money } from '../../components/pharmacy/ReportTable';
import suite, { LocationSummaryRow, StockMatrix } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

/** One screen across all branches: stock value, expiry exposure, sales, and stock of each product at each location. */
const HeadOffice: React.FC = () => {
  const [tab, setTab] = useState<'branches' | 'stock'>('branches');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));
  const [summary, setSummary] = useState<LocationSummaryRow[]>([]);
  const [unassigned, setUnassigned] = useState<{ bills: number; total: number } | null>(null);
  const [matrix, setMatrix] = useState<StockMatrix | null>(null);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mismatch, setMismatch] = useState<number | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const s = await suite.summary(from, to);
      setSummary(s.rows);
      setUnassigned(s.salesWithoutLocation);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
    finally { setLoading(false); }
  }, [from, to]);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try { setMatrix(await suite.stockMatrix({ search: search || undefined, lowOnly })); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
    finally { setLoading(false); }
  }, [search, lowOnly]);

  useEffect(() => { if (tab === 'branches') void loadSummary(); }, [tab, loadSummary]);
  useEffect(() => { if (tab === 'stock') void loadMatrix(); }, [tab, lowOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { suite.reconcile().then((r) => setMismatch(r.mismatched)).catch(() => setMismatch(null)); }, []);

  const cols: Column<LocationSummaryRow>[] = [
    { key: 'name', label: 'Location', render: (r) => <>{r.name}{r.isDefault && <span className="badge bg-primary ms-2">Default</span>}<div className="text-muted fs-12">{r.type}</div></>, value: (r) => r.name },
    { key: 'stockUnits', label: 'Units in stock', align: 'end', total: true },
    { key: 'stockValue', label: 'Stock at cost (Rs)', align: 'end', money: true, total: true },
    { key: 'nearExpiryValue', label: 'Expiring in 90 days (Rs)', align: 'end', money: true, total: true, render: (r) => <span className={r.nearExpiryValue > 0 ? 'text-warning fw-medium' : ''}>{money(r.nearExpiryValue)}</span> },
    { key: 'expiredValue', label: 'Expired (Rs)', align: 'end', money: true, total: true, render: (r) => <span className={r.expiredValue > 0 ? 'text-danger fw-medium' : ''}>{money(r.expiredValue)}</span> },
    { key: 'bills', label: 'Bills', align: 'end', total: true },
    { key: 'sales', label: 'Sales (Rs)', align: 'end', money: true, total: true },
    { key: 'due', label: 'Unpaid (Rs)', align: 'end', money: true, total: true },
    { key: 'incomingTransfers', label: 'Incoming', align: 'end', render: (r) => (r.incomingTransfers ? <Link to="/stock-transfer">{r.incomingTransfers} in transit</Link> : '') },
    { key: 'requestsToFulfil', label: 'Requests', align: 'end', render: (r) => (r.requestsToFulfil ? <Link to="/stock-requests">{r.requestsToFulfil} to fulfil</Link> : '') },
  ];

  return (
    <>
      <PageHeader title="Head Office" subtitle="All branches and warehouses in one place." breadcrumbs={[{ title: 'Stock' }, { title: 'Head Office' }]} />
      {mismatch !== null && mismatch > 0 && (
        <div className="alert alert-warning">{mismatch} product(s) have a total that does not match their batches. Open the <Link to="/stock-ledger">stock ledger</Link> to trace them.</div>
      )}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button type="button" className={`nav-link ${tab === 'branches' ? 'active' : ''}`} onClick={() => setTab('branches')}>Branch overview</button></li>
        <li className="nav-item"><button type="button" className={`nav-link ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Stock by location</button></li>
      </ul>

      {tab === 'branches' && (
        <>
          <ReportTable title="Branch overview" filename="branch-overview" columns={cols} rows={summary} loading={loading}
            toolbar={<>
              <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
              <span>to</span>
              <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
            </>} />
          {unassigned && unassigned.bills > 0 && <p className="text-muted fs-12">{unassigned.bills} older bills (Rs {money(unassigned.total)}) have no branch recorded.</p>}
        </>
      )}

      {tab === 'stock' && matrix && (
        <ReportTable title="Stock by location" filename="stock-by-location" loading={loading}
          rows={matrix.rows}
          rowClassName={(r) => (r.lowAt.length ? 'table-warning' : '')}
          columns={[
            { key: 'productName', label: 'Product', render: (r) => <>{r.productName}{r.genericName && <div className="text-muted fs-12">{r.genericName}</div>}</>, value: (r) => r.productName },
            ...matrix.locations.map((l) => ({
              key: `l${l.id}`, label: l.name, align: 'end' as const, total: true,
              value: (r: StockMatrix['rows'][number]) => r.perLocation[String(l.id)] ?? 0,
              render: (r: StockMatrix['rows'][number]) => <span className={r.lowAt.includes(l.id) ? 'text-danger fw-bold' : ''}>{r.perLocation[String(l.id)] ?? 0}</span>,
            })),
            { key: 'noBatch', label: 'Unplaced', align: 'end', render: (r) => (r.noBatch ? <span className="text-danger">{r.noBatch}</span> : '') },
            { key: 'total', label: 'Total', align: 'end', total: true },
            { key: 'costValue', label: 'Value at cost (Rs)', align: 'end', money: true, total: true },
          ]}
          toolbar={<>
            <input className="form-control form-control-sm" style={{ width: 220 }} placeholder="Search product" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loadMatrix()} aria-label="Search product" />
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void loadMatrix()}>Search</button>
            <label className="form-check mb-0 ms-2"><input type="checkbox" className="form-check-input" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /><span className="form-check-label">Only below minimum</span></label>
          </>} />
      )}
    </>
  );
};

export default HeadOffice;
