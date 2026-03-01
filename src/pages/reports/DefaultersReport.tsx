import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getDefaultersReport, DefaultersReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DefaultersReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDefaultersReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = { 'Critical': 'danger', 'Warning': 'warning', 'Overdue': 'info' };
    return <span className={`badge bg-${colorMap[status] || 'secondary'}`}>{status}</span>;
  };

  return (
    <>
      <PageHeader title="Defaulters Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Customer' }]} />

      {data && (
        <div className="d-flex justify-content-end mb-3">
          <ExportButtons
            onExportExcel={() => {
              const cols = ['Customer', 'Phone', 'Product', 'Missed', 'Overdue Amount', 'Days Overdue', 'Last Paid', 'Status'];
              const rows = data.defaulters.map(d => [d.customerName, d.phone || '-', d.productName, d.missedInstallments, d.overdueAmount, d.maxDaysOverdue, d.lastPaidDate ? new Date(d.lastPaidDate).toLocaleDateString() : 'Never', d.status]);
              exportToExcel(cols, rows, 'Defaulters-Report');
            }}
            onExportPDF={() => {
              const cols = ['Customer', 'Phone', 'Product', 'Missed', 'Overdue Amount', 'Days Overdue', 'Last Paid', 'Status'];
              const rows = data.defaulters.map(d => [d.customerName, d.phone || '-', d.productName, d.missedInstallments, `Rs ${d.overdueAmount.toLocaleString()}`, d.maxDaysOverdue, d.lastPaidDate ? new Date(d.lastPaidDate).toLocaleDateString() : 'Never', d.status]);
              exportToPDF(cols, rows, 'Defaulters-Report', 'Defaulters Report', [
                { label: 'Total Defaulters', value: data.totalDefaulters },
                { label: 'Total Defaulted Amount', value: `Rs ${data.totalDefaultedAmount.toLocaleString()}` },
              ]);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Defaulters</h6>
                  <h3 className="text-danger">{data.totalDefaulters}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Defaulted Amount</h6>
                  <h3 className="text-warning">Rs {data.totalDefaultedAmount.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Defaulter List</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Product</th>
                      <th>Missed</th>
                      <th>Overdue Amount</th>
                      <th>Days Overdue</th>
                      <th>Last Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.defaulters.map((d, i) => (
                      <tr key={i}>
                        <td>{d.customerName}</td>
                        <td>{d.phone || '-'}</td>
                        <td>{d.productName}</td>
                        <td className="text-danger fw-bold">{d.missedInstallments}</td>
                        <td>Rs {d.overdueAmount.toLocaleString()}</td>
                        <td>{d.maxDaysOverdue}</td>
                        <td>{d.lastPaidDate ? new Date(d.lastPaidDate).toLocaleDateString() : 'Never'}</td>
                        <td>{getStatusBadge(d.status)}</td>
                      </tr>
                    ))}
                    {data.defaulters.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-muted">No defaulters found</td></tr>
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

export default DefaultersReport;
