import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getCustomerReport, CustomerReportItemDto } from '../../services/reportService';

const CustomerReport: React.FC = () => {
  const [items, setItems] = useState<CustomerReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getCustomerReport(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.customer.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())
  );

  const cols = ['Reference', 'Code', 'Customer', 'Total Orders', 'Amount', 'Payment Method', 'Status'];
  const rows = filtered.map(i => [i.reference, i.code, i.customer, i.totalOrders, i.amount.toFixed(2), i.paymentMethod, i.status]);
  const statusBadge = (s: string) => s === 'Completed' ? 'bg-success' : s === 'Pending' ? 'bg-warning' : 'bg-secondary';

  return (
    <>
      <PageHeader title="Customer Report" breadcrumbs={[{ title: 'Reports' }, { title: 'Customer Report' }]} />

      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><Link className="nav-link active" to="/customer-report">Customer Report</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/customer-due-report">Customer Due Report</Link></li>
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
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'customer-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'customer-report', 'Customer Report')} />
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
                      <td>{item.reference}</td><td>{item.code}</td><td>{item.customer}</td><td>{item.totalOrders}</td>
                      <td>{item.amount.toFixed(2)}</td><td>{item.paymentMethod}</td>
                      <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
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

export default CustomerReport;

