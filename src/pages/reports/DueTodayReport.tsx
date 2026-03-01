import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getDueTodayReport, DueTodayReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DueTodayReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    getDueTodayReport()
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
      <PageHeader title="Due Today Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Operational' }]} />

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Due Today</h6>
                  <h3 className="text-primary">{data.totalDueToday}</h3>
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
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Installments Due Today</h5>
              <button className="btn btn-sm btn-outline-primary" onClick={fetchData}>
                <i className="ti ti-refresh me-1"></i>Refresh
              </button>
              <ExportButtons
                onExportExcel={() => {
                  const cols = ['Plan ID', 'Customer', 'Phone', 'Address', 'Product', 'Inst #', 'Amount Due', 'Status'];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.address || '-', item.productName, item.installmentNo, item.amountDue, item.status]);
                  exportToExcel(cols, rows, 'Due-Today-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Plan ID', 'Customer', 'Phone', 'Product', 'Inst #', 'Amount Due', 'Status'];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.productName, item.installmentNo, `Rs ${item.amountDue.toLocaleString()}`, item.status]);
                  exportToPDF(cols, rows, 'Due-Today-Report', 'Due Today Report', [
                    { label: 'Total Due Today', value: data.totalDueToday },
                    { label: 'Total Amount Due', value: `Rs ${data.totalAmountDue.toLocaleString()}` },
                  ]);
                }}
              />
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Plan ID</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Product</th>
                      <th>Inst #</th>
                      <th>Amount Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.planId}</td>
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
                      <tr><td colSpan={8} className="text-center text-muted">No installments due today</td></tr>
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

export default DueTodayReport;
