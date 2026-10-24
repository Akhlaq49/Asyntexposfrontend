import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import ExportButtons from '../../components/ExportButtons';
import DateFilters, { DateFilterValue, EMPTY_DATE_FILTER, matchesDateFilter, describeDateFilter } from '../../components/common/DateFilters';
import { usePagination } from '../../utils/usePagination';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printReport } from '../../utils/printReport';

interface SoldLine { date: string; saleReference: string; customer?: string | null; productId: number; productName: string; sku?: string | null; quantity: number; unitPrice: number; discount: number; total: number }

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const showDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Stock > Sold Stock: what was sold - by product, or every sale line */
const SoldStock: React.FC = () => {
  const [lines, setLines] = useState<SoldLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'product' | 'lines'>('product');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);

  useEffect(() => {
    api.get<SoldLine[]>('/reports/sold-stock').then((r) => setLines(r.data))
      .catch(() => setError('Could not load the sold stock.')).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((l) => matchesDateFilter(l.date, dateFilter) &&
      (!q || [l.productName, l.sku, l.saleReference, l.customer].some((v) => (v || '').toLowerCase().includes(q))));
  }, [lines, search, dateFilter]);
  const byProduct = useMemo(() => {
    const map = new Map<number, { productName: string; sku?: string | null; quantity: number; total: number; sales: Set<string> }>();
    filtered.forEach((l) => {
      const p = map.get(l.productId) || { productName: l.productName, sku: l.sku, quantity: 0, total: 0, sales: new Set<string>() };
      p.quantity += l.quantity; p.total += l.total; p.sales.add(l.saleReference);
      map.set(l.productId, p);
    });
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }, [filtered]);

  const shown: unknown[] = view === 'product' ? byProduct : filtered;
  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(shown);
  useEffect(() => { setCurrentPage(1); }, [view, search, dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalQty = filtered.reduce((s, l) => s + l.quantity, 0);
  const totalAmount = filtered.reduce((s, l) => s + l.total, 0);
  const title = `Sold Stock${view === 'product' ? ' by product' : ''}${describeDateFilter(dateFilter) ? ` (${describeDateFilter(dateFilter)})` : ''}`;
  const cols = view === 'product' ? ['Product', 'SKU', 'Qty sold', 'Sales', 'Amount'] : ['Date', 'Sale', 'Customer', 'Product', 'Qty', 'Unit price', 'Discount', 'Total'];
  const rows = view === 'product'
    ? byProduct.map((p) => [p.productName, p.sku || '', p.quantity, p.sales.size, money(p.total)])
    : filtered.map((l) => [showDate(l.date), l.saleReference, l.customer || '', l.productName, l.quantity, money(l.unitPrice), money(l.discount), money(l.total)]);
  const summary = [{ label: 'Units sold', value: totalQty }, { label: 'Amount', value: money(totalAmount) }, { label: 'Products', value: byProduct.length }];

  return (
    <>
      <PageHeader title="Sold Stock" subtitle="What was sold, by product or sale" breadcrumbs={[{ title: 'Reports' }]} />
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3 mb-3">
        {[{ label: 'Units sold', value: String(totalQty), cls: 'primary' }, { label: 'Sales amount', value: money(totalAmount), cls: 'success' }, { label: 'Products sold', value: String(byProduct.length), cls: 'info' }].map((c) => (
          <div className="col-md-4" key={c.label}><div className="card mb-0"><div className="card-body"><p className="mb-1 text-muted">{c.label}</p><h5 className={`mb-0 text-${c.cls}`}>{c.value}</h5></div></div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <input className="form-control" style={{ maxWidth: 240 }} placeholder="Search product, sale, customer" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="d-flex gap-2 flex-wrap">
            <div className="btn-group">
              <button className={`btn btn-sm ${view === 'product' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setView('product')}>By product</button>
              <button className={`btn btn-sm ${view === 'lines' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setView('lines')}>Every sale line</button>
            </div>
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'sold-stock', 'Sold Stock', summary)}
              onExportPDF={() => exportToPDF(cols, rows, 'sold-stock', title, summary)}
              onPrint={() => printReport(cols, rows, 'sold-stock', title, summary)} />
          </div>
          <div className="w-100"><DateFilters value={dateFilter} onChange={setDateFilter} /></div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="thead-light"><tr>{cols.map((c, i) => <th key={c} className={i >= (view === 'product' ? 2 : 4) ? 'text-end' : ''}>{c}</th>)}</tr></thead>
                <tbody>
                  {paginatedData.length === 0 ? <tr><td colSpan={cols.length} className="text-center text-muted py-5">Nothing sold in this period.</td></tr>
                    : view === 'product'
                      ? (paginatedData as typeof byProduct).map((p) => (
                        <tr key={p.productName + p.sku}><td>{p.productName}</td><td>{p.sku || '-'}</td><td className="text-end fw-semibold">{p.quantity}</td><td className="text-end">{p.sales.size}</td><td className="text-end">{money(p.total)}</td></tr>))
                      : (paginatedData as SoldLine[]).map((l, i) => (
                        <tr key={`${l.saleReference}-${l.productId}-${i}`}><td className="text-nowrap">{showDate(l.date)}</td><td>{l.saleReference}</td><td>{l.customer || '-'}</td><td>{l.productName}</td>
                          <td className="text-end fw-semibold">{l.quantity}</td><td className="text-end">{money(l.unitPrice)}</td><td className="text-end">{money(l.discount)}</td><td className="text-end">{money(l.total)}</td></tr>))}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot><tr className="fw-bold">
                    <td colSpan={view === 'product' ? 2 : 4} className="text-end">Totals</td>
                    <td className="text-end">{totalQty}</td>
                    {view === 'product' ? <><td /><td className="text-end">{money(totalAmount)}</td></> : <><td colSpan={2} /><td className="text-end">{money(totalAmount)}</td></>}
                  </tr></tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={shown.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default SoldStock;
