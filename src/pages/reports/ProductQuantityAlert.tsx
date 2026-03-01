import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getProductQtyAlertReport, ProductQtyAlertItemDto } from '../../services/reportService';

const ProductQuantityAlert: React.FC = () => {
  const [items, setItems] = useState<ProductQtyAlertItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getProductQtyAlertReport()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const cols = ['SKU', 'Serial No', 'Product Name', 'Total Quantity', 'Alert Quantity'];
  const rows = filtered.map(i => [i.sku, i.serialNo, i.productName, i.totalQuantity, i.alertQuantity]);

  return (
    <>
      <PageHeader title="Quantity Alert" breadcrumbs={[{ title: 'Reports' }, { title: 'Quantity Alert' }]} />

      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><Link className="nav-link" to="/product-report">Product Report</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/product-expiry-report">Product Expiry</Link></li>
        <li className="nav-item"><Link className="nav-link active" to="/product-quantity-alert">Quantity Alert</Link></li>
      </ul>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={load}><i className="ti ti-refresh me-1"></i>Refresh</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'product-qty-alert')}
              onExportPDF={() => exportToPDF(cols, rows, 'product-qty-alert', 'Product Quantity Alert')} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <div className="table-responsive"><table className="table table-hover">
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">No data found</td></tr>
                  : filtered.map((item, idx) => (
                    <tr key={idx} className={item.totalQuantity <= item.alertQuantity ? 'table-warning' : ''}>
                      <td>{item.sku}</td><td>{item.serialNo}</td><td>{item.productName}</td>
                      <td>{item.totalQuantity}</td><td>{item.alertQuantity}</td>
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

export default ProductQuantityAlert;

