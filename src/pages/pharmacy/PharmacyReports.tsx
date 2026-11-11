import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import ReportTable, { Column, DateRange, daysAgo, money, ymd } from '../../components/pharmacy/ReportTable';
import pharmacyService, { apiError } from '../../services/pharmacyService';
import { mediaUrl } from '../../services/api';
import { usePermissions } from '../../context/PermissionContext';

type Row = Record<string, any>;

interface ReportDef {
  title: string;
  subtitle: string;
  endpoint: string;
  dated: boolean;
  /** Pulls rows (and a summary) out of the response. */
  shape: (data: any) => { rows: Row[]; summary?: { label: string; value: string | number }[] };
  columns: Column<Row>[];
}

const dateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const REPORTS: Record<string, ReportDef> = {
  'daily-sales': {
    title: 'Daily Sales',
    subtitle: 'Bills, discounts, tax and payment split for each day, less returns',
    endpoint: 'daily-sales', dated: true,
    shape: (d) => ({ rows: d }),
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'bills', label: 'Bills', align: 'end', total: true },
      { key: 'gross', label: 'Gross', align: 'end', money: true, total: true },
      { key: 'discount', label: 'Discount', align: 'end', money: true, total: true },
      { key: 'tax', label: 'Tax', align: 'end', money: true, total: true },
      { key: 'net', label: 'Net sales', align: 'end', money: true, total: true },
      { key: 'cash', label: 'Cash', align: 'end', money: true, total: true },
      { key: 'card', label: 'Card', align: 'end', money: true, total: true },
      { key: 'credit', label: 'Credit', align: 'end', money: true, total: true },
      { key: 'returns', label: 'Returns', align: 'end', money: true, total: true },
      { key: 'netAfterReturns', label: 'Net after returns', align: 'end', money: true, total: true },
    ],
  },
  'item-margin': {
    title: 'Item Margin',
    subtitle: 'Revenue, cost and profit per medicine, using the batch cost of each sale',
    endpoint: 'item-margin', dated: true,
    shape: (d) => ({
      rows: d.items,
      summary: [
        { label: 'Revenue (excl. tax)', value: `Rs ${money(d.totalRevenue)}` },
        { label: 'Cost', value: `Rs ${money(d.totalCost)}` },
        { label: 'Profit', value: `Rs ${money(d.totalProfit)}` },
        { label: 'Margin', value: `${d.marginPercent}%` },
      ],
    }),
    columns: [
      { key: 'productName', label: 'Medicine', render: (r) => <><div className="fw-medium">{r.productName}{r.costMissing && <span className="badge bg-warning text-dark ms-1" title="No purchase cost recorded">no cost</span>}</div><div className="fs-12 text-muted">{r.genericName}</div></>, value: (r) => r.productName },
      { key: 'quantity', label: 'Units sold', align: 'end', total: true },
      { key: 'revenue', label: 'Revenue', align: 'end', money: true, total: true },
      { key: 'cost', label: 'Cost', align: 'end', money: true, total: true },
      { key: 'profit', label: 'Profit', align: 'end', money: true, total: true, render: (r) => <span className={r.profit < 0 ? 'text-danger fw-bold' : ''}>{money(r.profit)}</span> },
      { key: 'marginPercent', label: 'Margin %', align: 'end' },
    ],
  },
  'dead-stock': {
    title: 'Slow-moving Stock',
    subtitle: 'Items in stock with no sale in the chosen number of days',
    endpoint: 'dead-stock', dated: false,
    shape: (d) => ({ rows: d.items, summary: [{ label: `Stock value with no sale in ${d.days} days`, value: `Rs ${money(d.totalValue)}` }] }),
    columns: [
      { key: 'productName', label: 'Medicine', render: (r) => <><div className="fw-medium">{r.productName}</div><div className="fs-12 text-muted">{r.genericName}</div></>, value: (r) => r.productName },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'stock', label: 'Stock', align: 'end', total: true },
      { key: 'stockValue', label: 'Cost value', align: 'end', money: true, total: true },
      { key: 'lastSold', label: 'Last sold', render: (r) => r.lastSold || <span className="text-muted">Never</span>, value: (r) => r.lastSold || 'Never' },
      { key: 'daysSinceSale', label: 'Days idle', align: 'end' },
      { key: 'nearestExpiry', label: 'Nearest expiry' },
    ],
  },
  'credit-ageing': {
    title: 'Credit Ageing',
    subtitle: 'Unpaid customer balances by how long they have been outstanding',
    endpoint: 'credit-ageing', dated: false,
    shape: (d) => ({
      rows: d.customers,
      summary: [
        { label: '0–30 days', value: `Rs ${money(d.totals.days0to30)}` },
        { label: '31–60 days', value: `Rs ${money(d.totals.days31to60)}` },
        { label: '61–90 days', value: `Rs ${money(d.totals.days61to90)}` },
        { label: 'Over 90 days', value: `Rs ${money(d.totals.over90)}` },
      ],
    }),
    columns: [
      { key: 'customerName', label: 'Customer' },
      { key: 'phone', label: 'Phone' },
      { key: 'bills', label: 'Open bills', align: 'end' },
      { key: 'oldestBill', label: 'Oldest bill' },
      { key: 'days0to30', label: '0–30', align: 'end', money: true, total: true },
      { key: 'days31to60', label: '31–60', align: 'end', money: true, total: true },
      { key: 'days61to90', label: '61–90', align: 'end', money: true, total: true },
      { key: 'over90', label: '90+', align: 'end', money: true, total: true, render: (r) => <span className={r.over90 > 0 ? 'text-danger fw-bold' : ''}>{money(r.over90)}</span> },
      { key: 'total', label: 'Total due', align: 'end', money: true, total: true },
    ],
  },
  'branch-sales': {
    title: 'Branch Sales',
    subtitle: 'Sales, average bill and gross profit per branch',
    endpoint: 'branch-sales', dated: true,
    shape: (d) => ({ rows: d }),
    columns: [
      { key: 'store', label: 'Branch' },
      { key: 'bills', label: 'Bills', align: 'end', total: true },
      { key: 'revenue', label: 'Sales', align: 'end', money: true, total: true },
      { key: 'averageBill', label: 'Average bill', align: 'end', money: true },
      { key: 'grossProfit', label: 'Gross profit', align: 'end', money: true, total: true },
      { key: 'due', label: 'Unpaid', align: 'end', money: true, total: true },
    ],
  },
  'controlled-register': {
    title: 'Controlled Medicine Register',
    subtitle: 'Every sale of a controlled medicine with patient, doctor and batch',
    endpoint: 'controlled-register', dated: true,
    shape: (d) => ({ rows: d }),
    columns: [] as Column<Row>[],
  },
  'prescription-log': {
    title: 'Prescription Sales Log',
    subtitle: 'Every sale of a prescription-only medicine',
    endpoint: 'prescription-log', dated: true,
    shape: (d) => ({ rows: d }),
    columns: [] as Column<Row>[],
  },
};

const rxColumns: Column<Row>[] = [
  { key: 'date', label: 'Date', render: (r) => dateTime(r.date), value: (r) => dateTime(r.date) },
  { key: 'billNo', label: 'Bill' },
  { key: 'patient', label: 'Patient' },
  { key: 'doctor', label: 'Doctor', render: (r) => r.doctor || <span className="text-danger">Not recorded</span>, value: (r) => r.doctor },
  { key: 'product', label: 'Medicine' },
  { key: 'quantity', label: 'Qty', align: 'end', total: true, render: (r) => `${r.unitQuantity} ${r.unit !== 'Unit' ? r.unit.toLowerCase() + (r.unitQuantity > 1 ? 's' : '') : ''}`, value: (r) => r.quantity },
  { key: 'batch', label: 'Batch' },
  { key: 'soldBy', label: 'Sold by' },
  { key: 'prescription', label: 'Rx', value: (r) => (r.prescription ? 'Yes' : 'No'), render: (r) => (r.prescription ? <a href={mediaUrl(r.prescription)} target="_blank" rel="noreferrer">View</a> : '') },
];
REPORTS['controlled-register'].columns = rxColumns;
REPORTS['prescription-log'].columns = rxColumns;

export const PHARMACY_REPORT_LINKS = Object.entries(REPORTS).map(([key, r]) => ({ key, title: r.title }));

const PharmacyReports: React.FC = () => {
  const { report = 'daily-sales' } = useParams();
  const { canAccessPath } = usePermissions();
  const def = REPORTS[report] ?? REPORTS['daily-sales'];
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(ymd(new Date()));
  const [idleDays, setIdleDays] = useState(90);
  const [store, setStore] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<{ label: string; value: string | number }[] | undefined>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = def.dated ? { from, to, store: store || undefined } : {};
      if (report === 'dead-stock') params.days = idleDays;
      const data = await pharmacyService.report(def.endpoint, params);
      const shaped = def.shape(data);
      setRows(shaped.rows || []);
      setSummary(shaped.summary);
    } catch (err) {
      setRows([]);
      Swal.fire({ icon: 'error', title: `Could not load ${def.title}`, text: apiError(err) });
    } finally {
      setLoading(false);
    }
  }, [def, from, to, idleDays, store, report]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <PageHeader title={def.title} subtitle={def.subtitle} breadcrumbs={[{ title: 'Reports' }]} />
      <ul className="nav nav-pills mb-3 flex-wrap gap-1">
        {Object.entries(REPORTS).filter(([key]) => key === report || canAccessPath(`/pharmacy-reports/${key}`)).map(([key, r]) => (
          <li className="nav-item" key={key}>
            <Link to={`/pharmacy-reports/${key}`} className={`nav-link py-1 px-3 ${key === report ? 'active' : ''}`}>{r.title}</Link>
          </li>
        ))}
      </ul>
      <ReportTable
        title={def.title}
        filename={report}
        columns={def.columns}
        rows={rows}
        loading={loading}
        summary={summary}
        toolbar={(
          <>
            {def.dated && <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />}
            {(report === 'daily-sales' || report === 'item-margin') && (
              <input className="form-control form-control-sm" style={{ width: 150 }} placeholder="Branch (all)" value={store} onChange={(e) => setStore(e.target.value)} aria-label="Branch" />
            )}
            {report === 'dead-stock' && (
              <select className="form-select form-select-sm" style={{ width: 180 }} value={idleDays} onChange={(e) => setIdleDays(Number(e.target.value))} aria-label="Days without a sale">
                <option value={30}>No sale in 30 days</option>
                <option value={60}>No sale in 60 days</option>
                <option value={90}>No sale in 90 days</option>
                <option value={180}>No sale in 180 days</option>
              </select>
            )}
          </>
        )}
      />
    </>
  );
};

export default PharmacyReports;
