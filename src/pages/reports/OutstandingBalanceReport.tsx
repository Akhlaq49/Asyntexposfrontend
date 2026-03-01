import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getOutstandingBalanceReport, OutstandingBalanceReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const OutstandingBalanceReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOutstandingBalanceReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Outstanding Balance Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Financial' }]} />

      {data && (
        <div className="d-flex justify-content-end mb-3">
          <ExportButtons
            onExportExcel={() => {
              const cols = ['Customer', 'Phone', 'Product', 'Remaining Balance', 'Overdue Amount', 'Max Days Overdue'];
              const rows = data.customers.map(c => [c.customerName, c.phone || '-', c.productName, c.remainingBalance, c.overdueAmount, c.maxDaysOverdue]);
              exportToExcel(cols, rows, 'Outstanding-Balance-Report');
            }}
            onExportPDF={() => {
              const cols = ['Customer', 'Phone', 'Product', 'Remaining Balance', 'Overdue Amount', 'Max Days Overdue'];
              const rows = data.customers.map(c => [c.customerName, c.phone || '-', c.productName, `Rs ${c.remainingBalance.toLocaleString()}`, `Rs ${c.overdueAmount.toLocaleString()}`, c.maxDaysOverdue]);
              exportToPDF(cols, rows, 'Outstanding-Balance-Report', 'Outstanding Balance Report', [
                { label: 'Total Outstanding', value: `Rs ${data.totalOutstanding.toLocaleString()}` },
                { label: 'Total Overdue', value: `Rs ${data.totalOverdue.toLocaleString()}` },
                { label: 'Total Customers', value: data.totalCustomers },
              ]);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Outstanding</h6>
                  <h3 className="text-primary">Rs {data.totalOutstanding.toLocaleString()}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Overdue</h6>
                  <h3 className="text-danger">Rs {data.totalOverdue.toLocaleString()}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Customers</h6>
                  <h3 className="text-info">{data.totalCustomers}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Aging Buckets */}
          <div className="card mb-4">
            <div className="card-header"><h5 className="card-title mb-0">Aging Buckets</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered text-center">
                  <thead>
                    <tr>
                      <th>Bucket</th>
                      <th>0–30 Days</th>
                      <th>31–60 Days</th>
                      <th>61–90 Days</th>
                      <th>90+ Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="fw-bold">Amount</td>
                      <td>Rs {data.aging.days0To30.toLocaleString()}</td>
                      <td>Rs {data.aging.days31To60.toLocaleString()}</td>
                      <td>Rs {data.aging.days61To90.toLocaleString()}</td>
                      <td className="text-danger fw-bold">Rs {data.aging.days90Plus.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Count</td>
                      <td>{data.aging.count0To30}</td>
                      <td>{data.aging.count31To60}</td>
                      <td>{data.aging.count61To90}</td>
                      <td className="text-danger fw-bold">{data.aging.count90Plus}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Customer Breakdown */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Customer-wise Outstanding</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Product</th>
                      <th>Remaining Balance</th>
                      <th>Overdue Amount</th>
                      <th>Max Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((c, i) => (
                      <tr key={i}>
                        <td>{c.customerName}</td>
                        <td>{c.phone || '-'}</td>
                        <td>{c.productName}</td>
                        <td>Rs {c.remainingBalance.toLocaleString()}</td>
                        <td className={c.overdueAmount > 0 ? 'text-danger fw-bold' : ''}>Rs {c.overdueAmount.toLocaleString()}</td>
                        <td>{c.maxDaysOverdue}</td>
                      </tr>
                    ))}
                    {data.customers.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted">No data available</td></tr>
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

export default OutstandingBalanceReport;
