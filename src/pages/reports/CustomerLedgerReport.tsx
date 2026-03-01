import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getCustomerLedger, CustomerLedger } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const CustomerLedgerReport: React.FC = () => {
  const [data, setData] = useState<CustomerLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    const id = parseInt(customerId);
    if (isNaN(id) || id <= 0) { setError('Please enter a valid Customer ID'); return; }
    setError('');
    setLoading(true);
    try { setData(await getCustomerLedger(id)); }
    catch (err) { console.error(err); setError('Customer not found or no data available.'); setData(null); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader title="Customer Ledger" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Customer' }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Customer ID</label>
              <input type="number" className="form-control" placeholder="Enter Customer ID" value={customerId} onChange={e => setCustomerId(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>Load Ledger</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Running Balance', 'Reference'];
                  const rows = data.transactions.map(t => [new Date(t.date).toLocaleDateString(), t.type, t.description, t.debit, t.credit, t.runningBalance, t.reference || '-']);
                  exportToExcel(cols, rows, `Customer-Ledger-${data.customerName}`);
                }}
                onExportPDF={() => {
                  const cols = ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance', 'Reference'];
                  const rows = data.transactions.map(t => [new Date(t.date).toLocaleDateString(), t.type, t.description, t.debit > 0 ? `Rs ${t.debit.toLocaleString()}` : '-', t.credit > 0 ? `Rs ${t.credit.toLocaleString()}` : '-', `Rs ${t.runningBalance.toLocaleString()}`, t.reference || '-']);
                  exportToPDF(cols, rows, `Customer-Ledger-${data.customerName}`, `Customer Ledger - ${data.customerName}`, [
                    { label: 'Customer', value: data.customerName },
                    { label: 'Phone', value: data.phone || '-' },
                    { label: 'Total Purchases', value: `Rs ${data.totalPurchases.toLocaleString()}` },
                    { label: 'Total Paid', value: `Rs ${data.totalPaid.toLocaleString()}` },
                    { label: 'Remaining Balance', value: `Rs ${data.remainingBalance.toLocaleString()}` },
                  ]);
                }}
              />}
            </div>
          </div>
          {error && <div className="text-danger mt-2">{error}</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          {/* Customer Info */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3"><strong>Name:</strong> {data.customerName}</div>
                <div className="col-md-3"><strong>Phone:</strong> {data.phone || '-'}</div>
                <div className="col-md-3"><strong>Address:</strong> {data.address || '-'}</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="row mb-4">
            {[
              { label: 'Total Purchases', value: data.totalPurchases, color: 'primary' },
              { label: 'Total Paid', value: data.totalPaid, color: 'success' },
              { label: 'Remaining Balance', value: data.remainingBalance, color: 'warning' },
              { label: 'Total Penalties', value: data.totalPenalties, color: 'danger' },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4 className={`text-${c.color}`}>Rs {c.value.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Transaction History</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Running Balance</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t, i) => (
                      <tr key={i}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td><span className={`badge bg-${t.type === 'Payment' ? 'success' : t.type === 'Penalty' ? 'danger' : 'primary'}`}>{t.type}</span></td>
                        <td>{t.description}</td>
                        <td>{t.debit > 0 ? `Rs ${t.debit.toLocaleString()}` : '-'}</td>
                        <td>{t.credit > 0 ? `Rs ${t.credit.toLocaleString()}` : '-'}</td>
                        <td className="fw-bold">Rs {t.runningBalance.toLocaleString()}</td>
                        <td>{t.reference || '-'}</td>
                      </tr>
                    ))}
                    {data.transactions.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted">No transactions</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};

export default CustomerLedgerReport;
