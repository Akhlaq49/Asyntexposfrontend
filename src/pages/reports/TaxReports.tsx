import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import ExportButtons from '../../components/ExportButtons';
import DateFilters, { DateFilterValue, EMPTY_DATE_FILTER, matchesDateFilter, describeDateFilter } from '../../components/common/DateFilters';
import { usePagination } from '../../utils/usePagination';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printReport } from '../../utils/printReport';

interface TaxLine { date: string; direction: 'Collected' | 'Paid'; document: string; party?: string | null; taxName: string; rate?: number | null; amount: number }

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const showDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Reports > Tax Report: tax collected on sales vs tax paid on purchases, by tax type */
const TaxReports: React.FC = () => {
  const [lines, setLines] = useState<TaxLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState('');
  const [taxName, setTaxName] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);

  useEffect(() => {
    api.get<{ lines: TaxLine[] }>('/reports/tax-report').then((r) => setLines(r.data.lines))
      .catch(() => setError('Could not load the tax report.')).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((l) => matchesDateFilter(l.date, dateFilter) && (!direction || l.direction === direction) && (!taxName || l.taxName === taxName) &&
      (!q || [l.document, l.party, l.taxName].some((v) => (v || '').toLowerCase().includes(q))));
  }, [lines, dateFilter, direction, taxName, search]);
  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);
  useEffect(() => { setCurrentPage(1); }, [dateFilter, direction, taxName, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const collected = filtered.filter((l) => l.direction === 'Collected').reduce((s, l) => s + l.amount, 0);
  const paid = filtered.filter((l) => l.direction === 'Paid').reduce((s, l) => s + l.amount, 0);
  const taxNames = [...new Set(lines.map((l) => l.taxName))].sort();
  const byTax = taxNames.map((n) => ({
    name: n,
    collected: filtered.filter((l) => l.taxName === n && l.direction === 'Collected').reduce((s, l) => s + l.amount, 0),
    paid: filtered.filter((l) => l.taxName === n && l.direction === 'Paid').reduce((s, l) => s + l.amount, 0),
  })).filter((t) => t.collected || t.paid);

  const title = `Tax Report${describeDateFilter(dateFilter) ? ` (${describeDateFilter(dateFilter)})` : ''}`;
  const cols = ['Date', 'Type', 'Document', 'Customer / supplier', 'Tax', 'Rate', 'Amount'];
  const rows = filtered.map((l) => [showDate(l.date), l.direction === 'Collected' ? 'Collected on sale' : 'Paid on purchase', l.document, l.party || '', l.taxName, l.rate != null ? `${l.rate}%` : '', money(l.amount)]);
  const summary = [
    { label: 'Tax collected on sales', value: money(collected) },
    { label: 'Tax paid on purchases', value: money(paid) },
    { label: 'Tax to pay (collected minus paid)', value: money(collected - paid) },
    ...byTax.map((t) => ({ label: `${t.name}: collected / paid`, value: `${money(t.collected)} / ${money(t.paid)}` })),
  ];

  return (
    <>
      <PageHeader title="Tax Report" subtitle="Tax collected on sales and paid on purchases" breadcrumbs={[{ title: 'Reports' }]} />
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3 mb-3">
        {[{ label: 'Collected on sales', value: collected, cls: 'success' }, { label: 'Paid on purchases', value: paid, cls: 'danger' }, { label: 'Tax to pay (collected minus paid)', value: collected - paid, cls: collected - paid >= 0 ? 'primary' : 'warning' }].map((c) => (
          <div className="col-md-4" key={c.label}><div className="card mb-0"><div className="card-body"><p className="mb-1 text-muted">{c.label}</p><h5 className={`mb-0 text-${c.cls}`}>{money(c.value)}</h5></div></div></div>
        ))}
      </div>
      {byTax.length > 0 && (
        <div className="card mb-3"><div className="card-body p-0">
          <table className="table table-sm mb-0">
            <thead className="thead-light"><tr><th>Tax</th><th className="text-end">Collected</th><th className="text-end">Paid</th><th className="text-end">Net</th></tr></thead>
            <tbody>{byTax.map((t) => <tr key={t.name}><td className="fw-semibold">{t.name}</td><td className="text-end">{money(t.collected)}</td><td className="text-end">{money(t.paid)}</td><td className="text-end">{money(t.collected - t.paid)}</td></tr>)}</tbody>
          </table>
        </div></div>
      )}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <input className="form-control" style={{ maxWidth: 240 }} placeholder="Search document, customer, supplier, tax" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="d-flex gap-2 flex-wrap">
            <select className="form-select" style={{ width: 190 }} value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="">Collected &amp; paid</option><option value="Collected">Collected on sales</option><option value="Paid">Paid on purchases</option>
            </select>
            <select className="form-select" style={{ width: 160 }} value={taxName} onChange={(e) => setTaxName(e.target.value)}>
              <option value="">All taxes</option>{taxNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'tax-report', 'Tax Report', summary)}
              onExportPDF={() => exportToPDF(cols, rows, 'tax-report', title, summary)}
              onPrint={() => printReport(cols, rows, 'tax-report', title, summary)} />
          </div>
          <div className="w-100"><DateFilters value={dateFilter} onChange={setDateFilter} /></div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="thead-light"><tr>{cols.map((c, i) => <th key={c} className={i >= 5 ? 'text-end' : ''}>{c}</th>)}</tr></thead>
                <tbody>
                  {paginatedData.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-5">No tax recorded in this period.</td></tr>
                    : paginatedData.map((l, i) => (
                      <tr key={`${l.document}-${l.taxName}-${i}`}>
                        <td className="text-nowrap">{showDate(l.date)}</td>
                        <td>{l.direction === 'Collected' ? <span className="badge bg-success">Collected on sale</span> : <span className="badge bg-danger">Paid on purchase</span>}</td>
                        <td>{l.document}</td><td>{l.party || '-'}</td><td>{l.taxName}</td>
                        <td className="text-end">{l.rate != null ? `${l.rate}%` : '-'}</td><td className="text-end fw-semibold">{money(l.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default TaxReports;
