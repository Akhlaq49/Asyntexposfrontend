import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getSalesReport, SalesReportDto } from '../../services/reportService';

const fmt = (v: number) => `Rs ${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const SalesReport: React.FC = () => {
  const [data, setData] = useState<SalesReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getSalesReport(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = (data?.items ?? []).filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const cols = ['SKU', 'Product Name', 'Brand', 'Category', 'Sold Qty', 'Sold Amount', 'In Stock Qty'];
  const rows = filtered.map(i => [i.sku, i.productName, i.brand, i.category, i.soldQty, i.soldAmount.toFixed(2), i.inStockQty]);

  return (
    <>
      <PageHeader title="Sales Report" breadcrumbs={[{ title: 'Reports' }, { title: 'Sales Report' }]} />

      {data && (
        <div className="row mb-3">
          {[
            { label: 'Total Amount', value: fmt(data.totalAmount), icon: 'ti-currency-dollar', color: 'primary' },
            { label: 'Total Paid', value: fmt(data.totalPaid), icon: 'ti-check', color: 'success' },
            { label: 'Total Unpaid', value: fmt(data.totalUnpaid), icon: 'ti-clock', color: 'warning' },
            { label: 'Overdue', value: fmt(data.overdue), icon: 'ti-alert-triangle', color: 'danger' },
          ].map((c, i) => (
            <div className="col-xl-3 col-sm-6" key={i}>
              <div className="card"><div className="card-body d-flex align-items-center">
                <span className={`avatar avatar-md bg-${c.color}-transparent me-2`}><i className={`ti ${c.icon}`}></i></span>
                <div><p className="mb-0 text-muted">{c.label}</p><h5 className="mb-0">{c.value}</h5></div>
              </div></div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'sales-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'sales-report', 'Sales Report', [
                { label: 'Total Amount', value: fmt(data?.totalAmount ?? 0) }, { label: 'Total Paid', value: fmt(data?.totalPaid ?? 0) },
              ])} />
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
                      <td>{item.sku}</td><td>{item.productName}</td><td>{item.brand}</td><td>{item.category}</td>
                      <td>{item.soldQty}</td><td>{item.soldAmount.toFixed(2)}</td><td>{item.inStockQty}</td>
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

export default SalesReport;

