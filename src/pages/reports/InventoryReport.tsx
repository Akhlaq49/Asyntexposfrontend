import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getInventoryReport, InventoryReportItemDto } from '../../services/reportService';

const InventoryReport: React.FC = () => {
  const [items, setItems] = useState<InventoryReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getInventoryReport()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const cols = ['SKU', 'Product Name', 'Category', 'Unit', 'In Stock'];
  const rows = filtered.map(i => [i.sku, i.productName, i.category, i.unit, i.inStock]);

  return (
    <>
      <PageHeader title="Inventory Report" breadcrumbs={[{ title: 'Reports' }, { title: 'Inventory Report' }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={load}><i className="ti ti-refresh me-1"></i>Refresh</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'inventory-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'inventory-report', 'Inventory Report')} />
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
                      <td>{item.sku}</td><td>{item.productName}</td><td>{item.category}</td><td>{item.unit}</td><td>{item.inStock}</td>
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

export default InventoryReport;

