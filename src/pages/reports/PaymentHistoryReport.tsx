import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getPaymentHistoryReport, PaymentHistoryReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const PaymentHistoryReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerId, setCustomerId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const cid = customerId ? parseInt(customerId) : undefined;
      setData(await getPaymentHistoryReport(cid, fromDate || undefined, toDate || undefined));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Payment History Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Customer' }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Customer ID (optional)</label>
              <input type="number" className="form-control" placeholder="All Customers" value={customerId} onChange={e => setCustomerId(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>Apply Filter</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = ['Date', 'Customer', 'Phone', 'Product', 'Installment #', 'Amount', 'Method'];
                  const rows = data.payments.map(p => [new Date(p.paidDate).toLocaleDateString(), p.customerName, p.phone || '-', p.productName, p.installmentNo, p.amount, p.paymentMethod]);
                  exportToExcel(cols, rows, 'Payment-History-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Date', 'Customer', 'Phone', 'Product', 'Inst #', 'Amount', 'Method'];
                  const rows = data.payments.map(p => [new Date(p.paidDate).toLocaleDateString(), p.customerName, p.phone || '-', p.productName, p.installmentNo, `Rs ${p.amount.toLocaleString()}`, p.paymentMethod]);
                  exportToPDF(cols, rows, 'Payment-History-Report', 'Payment History Report', [
                    { label: 'Total Payments', value: data.totalPayments },
                    { label: 'Total Amount', value: `Rs ${data.totalAmount.toLocaleString()}` },
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
            <div className="col-md-4 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Payments</h6>
                  <h3 className="text-primary">{data.totalPayments}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Amount</h6>
                  <h3 className="text-success">Rs {data.totalAmount.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Summary */}
          {data.methodSummary.length > 0 && (
            <div className="card mb-4">
              <div className="card-header"><h5 className="card-title mb-0">By Payment Method</h5></div>
              <div className="card-body">
                <div className="row">
                  {data.methodSummary.map((m, i) => (
                    <div className="col-md-3 mb-3" key={i}>
                      <div className="card">
                        <div className="card-body text-center">
                          <h6 className="text-muted">{m.method || 'Unknown'}</h6>
                          <h5>{m.count} payments</h5>
                          <p className="mb-0 text-success">Rs {m.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payments Table */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Payment Details</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Product</th>
                      <th>Installment #</th>
                      <th>Amount</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.paidDate).toLocaleDateString()}</td>
                        <td>{p.customerName}</td>
                        <td>{p.phone || '-'}</td>
                        <td>{p.productName}</td>
                        <td>{p.installmentNo}</td>
                        <td>Rs {p.amount.toLocaleString()}</td>
                        <td><span className="badge bg-info">{p.paymentMethod}</span></td>
                      </tr>
                    ))}
                    {data.payments.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted">No payments found</td></tr>
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

export default PaymentHistoryReport;
