import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getProductReport, ProductReportItemDto } from '../../services/reportService';

const ProductReport: React.FC = () => {
  const [items, setItems] = useState<ProductReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getProductReport(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const cols = ['SKU', 'Product Name', 'Category', 'Brand', 'Qty', 'Price', 'Total Ordered', 'Revenue'];
  const rows = filtered.map(i => [i.sku, i.productName, i.category, i.brand, i.qty, i.price.toFixed(2), i.totalOrdered, i.revenue.toFixed(2)]);

  return (
    <>
      <PageHeader title="Product Report" breadcrumbs={[{ title: 'Reports' }, { title: 'Product Report' }]} />

      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><Link className="nav-link active" to="/product-report">Product Report</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/product-expiry-report">Product Expiry</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/product-quantity-alert">Quantity Alert</Link></li>
      </ul>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'product-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'product-report', 'Product Report')} />
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
                      <td>{item.sku}</td><td>{item.productName}</td><td>{item.category}</td><td>{item.brand}</td>
                      <td>{item.qty}</td><td>{item.price.toFixed(2)}</td><td>{item.totalOrdered}</td><td>{item.revenue.toFixed(2)}</td>
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

export default ProductReport;

