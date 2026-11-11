import React from 'react';
import ExportButtons from '../ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'start' | 'end' | 'center';
  /** Value for display. Defaults to row[key]. */
  render?: (row: T) => React.ReactNode;
  /** Plain value for export and totals. Defaults to row[key]. */
  value?: (row: T) => string | number | null | undefined;
  /** Add this column up in a totals row. */
  total?: boolean;
  money?: boolean;
}

export const money = (n: unknown) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface Props<T> {
  title: string;
  filename: string;
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: string;
  rowKey?: (row: T, index: number) => string | number;
  rowClassName?: (row: T) => string;
  /** Extra controls (filters) shown left of the export buttons. */
  toolbar?: React.ReactNode;
  summary?: { label: string; value: string | number }[];
}

function ReportTable<T>({ title, filename, columns, rows, loading, empty, rowKey, rowClassName, toolbar, summary }: Props<T>) {
  const raw = (row: T, c: Column<T>) => (c.value ? c.value(row) : (row as any)[c.key]);
  const shown = (row: T, c: Column<T>) => {
    if (c.render) return c.render(row);
    const v = raw(row, c);
    return c.money ? money(v) : v ?? '';
  };
  const hasTotals = columns.some((c) => c.total);
  const totals = columns.map((c) => (c.total ? rows.reduce((s, r) => s + (Number(raw(r, c)) || 0), 0) : null));

  const exportRows = () => rows.map((r) => columns.map((c) => {
    const v = raw(r, c);
    return typeof v === 'number' ? v : String(v ?? '');
  }));

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">{toolbar}</div>
        <ExportButtons
          onExportExcel={() => exportToExcel(columns.map((c) => c.label), exportRows(), filename, 'Report', summary)}
          onExportPDF={() => exportToPDF(columns.map((c) => c.label), exportRows(), filename, title, summary)}
        />
      </div>
      {summary && summary.length > 0 && (
        <div className="card-body border-bottom py-3">
          <div className="row g-3">
            {summary.map((s) => (
              <div className="col-6 col-md-3" key={s.label}>
                <div className="text-muted fs-12">{s.label}</div>
                <div className="fw-bold fs-16">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="thead-light">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={c.align === 'end' ? 'text-end' : c.align === 'center' ? 'text-center' : ''}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center text-muted py-4">{empty || 'Nothing to show for this period.'}</td></tr>
              ) : rows.map((r, i) => (
                <tr key={rowKey ? rowKey(r, i) : i} className={rowClassName ? rowClassName(r) : ''}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === 'end' ? 'text-end' : c.align === 'center' ? 'text-center' : ''}
                      style={c.align === 'end' ? { fontVariantNumeric: 'tabular-nums' } : undefined}>
                      {shown(r, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {hasTotals && rows.length > 0 && !loading && (
              <tfoot>
                <tr className="fw-bold">
                  {columns.map((c, i) => (
                    <td key={c.key} className={c.align === 'end' ? 'text-end' : ''}>
                      {i === 0 ? 'Total' : totals[i] != null ? (c.money ? money(totals[i]) : totals[i]) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportTable;

/** Date range inputs used by most pharmacy reports. */
export const DateRange: React.FC<{ from: string; to: string; onChange: (from: string, to: string) => void }> = ({ from, to, onChange }) => (
  <>
    <label className="d-flex align-items-center gap-1 mb-0">
      <span className="fs-12 text-muted">From</span>
      <input type="date" className="form-control form-control-sm" value={from} onChange={(e) => onChange(e.target.value, to)} />
    </label>
    <label className="d-flex align-items-center gap-1 mb-0">
      <span className="fs-12 text-muted">To</span>
      <input type="date" className="form-control form-control-sm" value={to} onChange={(e) => onChange(from, e.target.value)} />
    </label>
  </>
);

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };

export const expiryBadge = (status: string, days: number | null | undefined) => {
  const cls = status === 'Expired' ? 'bg-danger' : status === 'Critical' ? 'bg-danger-transparent text-danger' : status === 'Warning' ? 'bg-warning text-dark' : status === 'Watch' ? 'bg-info-transparent text-info' : 'bg-success-transparent text-success';
  const label = days == null ? 'No expiry' : days < 0 ? `Expired ${-days}d ago` : days === 0 ? 'Expires today' : `${days} days left`;
  return <span className={`badge ${cls}`}>{label}</span>;
};
