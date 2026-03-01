import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getUpcomingDueReport, UpcomingDueReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const UpcomingDueReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = () => {
    setLoading(true);
    getUpcomingDueReport(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusBadge = (status: string) => {
    const m: Record<string, string> = { Paid: 'success', Pending: 'warning', Overdue: 'danger' };
    return <span className={`badge bg-${m[status] || 'secondary'}`}>{status}</span>;
  };

  return (
    <>
      <PageHeader title="Upcoming Due Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Operational' }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Days Ahead</label>
              <select className="form-select" value={days} onChange={e => setDays(parseInt(e.target.value))}>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>Apply</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = ['Due Date', 'Customer', 'Phone', 'Address', 'Product', 'Inst #', 'Amount', 'Status'];
                  const rows = data.items.map(item => [new Date(item.dueDate).toLocaleDateString(), item.customerName, item.phone || '-', item.address || '-', item.productName, item.installmentNo, item.amountDue, item.status]);
                  exportToExcel(cols, rows, 'Upcoming-Due-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Due Date', 'Customer', 'Phone', 'Product', 'Inst #', 'Amount', 'Status'];
                  const rows = data.items.map(item => [new Date(item.dueDate).toLocaleDateString(), item.customerName, item.phone || '-', item.productName, item.installmentNo, `Rs ${item.amountDue.toLocaleString()}`, item.status]);
                  exportToPDF(cols, rows, 'Upcoming-Due-Report', `Upcoming Due Report (Next ${days} Days)`, [
                    { label: 'Upcoming Installments', value: data.totalUpcoming },
                    { label: 'Total Amount Due', value: `Rs ${data.totalAmountDue.toLocaleString()}` },
                  ]);
                }}
              />}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h6 className="text-muted">Upcoming Installments</h6>
                  <h3 className="text-info">{data.totalUpcoming}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Amount Due</h6>
                  <h3 className="text-warning">Rs {data.totalAmountDue.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Upcoming Installments (Next {days} Days)</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Due Date</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Product</th>
                      <th>Inst #</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i}>
                        <td>{new Date(item.dueDate).toLocaleDateString()}</td>
                        <td className="fw-bold">{item.customerName}</td>
                        <td>{item.phone || '-'}</td>
                        <td>{item.address || '-'}</td>
                        <td>{item.productName}</td>
                        <td>{item.installmentNo}</td>
                        <td>Rs {item.amountDue.toLocaleString()}</td>
                        <td>{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                    {data.items.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-muted">No upcoming installments</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-warning">Failed to load report data.</div>
      )}
    </>
  );
};

export default UpcomingDueReport;
