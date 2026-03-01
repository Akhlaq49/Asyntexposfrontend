import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getPurchaseReport, PurchaseReportItemDto } from '../../services/reportService';

const PurchaseReport: React.FC = () => {
  const [items, setItems] = useState<PurchaseReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getPurchaseReport(from || undefined, to || undefined); setItems(r.items); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const cols = ['Reference', 'SKU', 'Due Date', 'Product Name', 'Category', 'In Stock Qty', 'Purchase Qty', 'Purchase Amount'];
  const rows = filtered.map(i => [i.reference, i.sku, i.dueDate, i.productName, i.category, i.inStockQty, i.purchaseQty, i.purchaseAmount.toFixed(2)]);

  return (
    <>
      <PageHeader title="Purchase Report" breadcrumbs={[{ title: 'Reports' }, { title: 'Purchase Report' }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'purchase-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'purchase-report', 'Purchase Report')} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <div className="table-responsive"><table className="table table-hover">
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">No data found</td></tr>
                  : filtered.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.reference}</td><td>{item.sku}</td><td>{item.dueDate}</td><td>{item.productName}</td>
                      <td>{item.category}</td><td>{item.inStockQty}</td><td>{item.purchaseQty}</td><td>{item.purchaseAmount.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
};

export default PurchaseReport;

