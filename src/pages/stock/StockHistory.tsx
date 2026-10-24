import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import ExportButtons from '../../components/ExportButtons';
import DateFilters, { DateFilterValue, EMPTY_DATE_FILTER, matchesDateFilter, describeDateFilter } from '../../components/common/DateFilters';
import { usePagination } from '../../utils/usePagination';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printReport } from '../../utils/printReport';

interface Movement { date: string; productId: number; productName: string; sku?: string | null; type: string; reference?: string | null; party?: string | null; qtyIn: number; qtyOut: number }
interface StockProduct { id: number; name: string; sku?: string | null; currentStock: number }

const TYPES = ['Opening stock', 'Purchase', 'Goods received', 'Stock added', 'Sale', 'Sale return'];
const TYPE_BADGE: Record<string, string> = { 'Opening stock': 'bg-secondary', Purchase: 'bg-info', 'Goods received': 'bg-primary', 'Stock added': 'bg-success', Sale: 'bg-danger', 'Sale return': 'bg-warning' };
const showDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Stock > Stock History: every movement in and out of stock, per product */
const StockHistory: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);

  useEffect(() => {
    api.get<{ movements: Movement[]; products: StockProduct[] }>('/reports/stock-history')
      .then((r) => { setMovements(r.data.movements); setProducts(r.data.products); })
      .catch(() => setError('Could not load the stock history.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => (!productId || m.productId === Number(productId)) && (!type || m.type === type) &&
      matchesDateFilter(m.date, dateFilter) &&
      (!q || [m.productName, m.sku, m.reference, m.party].some((v) => (v || '').toLowerCase().includes(q))));
  }, [movements, productId, type, search, dateFilter]);
  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);
  useEffect(() => { setCurrentPage(1); }, [productId, type, search, dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalIn = filtered.reduce((s, m) => s + m.qtyIn, 0);
  const totalOut = filtered.reduce((s, m) => s + m.qtyOut, 0);
  const selected = products.find((p) => p.id === Number(productId));
  const title = `Stock History${selected ? ` - ${selected.name}` : ''}${describeDateFilter(dateFilter) ? ` (${describeDateFilter(dateFilter)})` : ''}`;
  const cols = ['Date', 'Product', 'SKU', 'Movement', 'Reference', 'Supplier / customer / by', 'In', 'Out'];
  const rows = filtered.map((m) => [showDate(m.date), m.productName, m.sku || '', m.type, m.reference || '', m.party || '', m.qtyIn || '', m.qtyOut || '']);
  const summary = [{ label: 'Total in', value: totalIn }, { label: 'Total out', value: totalOut }, ...(selected ? [{ label: 'Current stock', value: selected.currentStock }] : [])];

  return (
    <>
      <PageHeader title="Stock History" subtitle="Every movement in and out of stock" breadcrumbs={[{ title: 'Reports' }]} />
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3 mb-3">
        {[
          { label: 'Stock in', value: totalIn, cls: 'success', icon: 'ti-arrow-down-left' },
          { label: 'Stock out', value: totalOut, cls: 'danger', icon: 'ti-arrow-up-right' },
          { label: selected ? `Current stock - ${selected.name}` : 'Movements', value: selected ? selected.currentStock : filtered.length, cls: 'primary', icon: 'ti-stack-2' },
        ].map((c) => (
          <div className="col-md-4" key={c.label}>
            <div className="card mb-0"><div className="card-body d-flex align-items-center">
              <span className={`avatar avatar-lg bg-${c.cls}-transparent text-${c.cls} me-3`}><i className={`ti ${c.icon}`} style={{ fontSize: 22 }} /></span>
              <div><p className="mb-1 text-muted">{c.label}</p><h5 className="mb-0">{c.value}</h5></div>
            </div></div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <input className="form-control" style={{ maxWidth: 240 }} placeholder="Search product, reference, party" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="d-flex gap-2 flex-wrap">
            <select className="form-select" style={{ width: 230 }} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">All products</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
            </select>
            <select className="form-select" style={{ width: 170 }} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All movements</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'stock-history', 'Stock History', summary)}
              onExportPDF={() => exportToPDF(cols, rows, 'stock-history', title, summary)}
              onPrint={() => printReport(cols, rows, 'stock-history', title, summary)} />
          </div>
          <div className="w-100"><DateFilters value={dateFilter} onChange={setDateFilter} /></div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="thead-light"><tr><th>Date</th><th>Product</th><th>Movement</th><th>Reference</th><th>Supplier / customer / by</th><th className="text-end">In</th><th className="text-end">Out</th></tr></thead>
                <tbody>
                  {paginatedData.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-5">No stock movements found.</td></tr>
                    : paginatedData.map((m, i) => (
                      <tr key={`${m.type}-${m.reference}-${m.productId}-${i}`}>
                        <td className="text-nowrap">{showDate(m.date)}</td>
                        <td>{m.productName}{m.sku && <div><small className="text-muted">{m.sku}</small></div>}</td>
                        <td><span className={`badge ${TYPE_BADGE[m.type] || 'bg-secondary'}`}>{m.type}</span></td>
                        <td>{m.reference || '-'}</td>
                        <td>{m.party || '-'}</td>
                        <td className="text-end text-success fw-semibold">{m.qtyIn || ''}</td>
                        <td className="text-end text-danger fw-semibold">{m.qtyOut || ''}</td>
                      </tr>
                    ))}
                </tbody>
                {filtered.length > 0 && <tfoot><tr className="fw-bold"><td colSpan={5} className="text-end">Totals</td><td className="text-end text-success">{totalIn}</td><td className="text-end text-danger">{totalOut}</td></tr></tfoot>}
              </table>
            </div>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default StockHistory;
