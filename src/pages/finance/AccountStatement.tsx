import React, { useState, useEffect } from 'react';
import { getAccountStatement, getBankAccounts, AccountStatementData, BankAccount } from '../../services/financeService';

const AccountStatement: React.FC = () => {
  const [data, setData] = useState<AccountStatementData | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAccountId, setFilterAccountId] = useState<number | ''>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const fetchAccounts = async () => {
    try { const res = await getBankAccounts(); setAccounts(res.data); } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterAccountId) params.accountId = filterAccountId;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const res = await getAccountStatement(params);
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); fetchData(); }, []);

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Account Statement</h4><h6>View detailed transaction history</h6></div></div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" title="Pdf" onClick={e => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="pdf" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Excel" onClick={e => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="excel" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Print" onClick={e => { e.preventDefault(); window.print(); }}><i className="ti ti-printer"></i></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Refresh" onClick={e => { e.preventDefault(); fetchData(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row align-items-end g-3">
            <div className="col-md-3">
              <label className="form-label">Account</label>
              <select className="form-select" value={filterAccountId} onChange={e => setFilterAccountId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.holderName} - {a.bankName}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={fetchData}><i className="ti ti-filter me-1"></i>Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
          ) : data ? (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="text-end">Amount ($)</th>
                    <th>Type</th>
                    <th className="text-end">Balance ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><span className="fw-medium">{entry.referenceNumber}</span></td>
                      <td>{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</td>
                      <td>{entry.category}</td>
                      <td>{entry.description}</td>
                      <td className={`text-end fw-medium ${entry.transactionType === 'Credit' ? 'text-success' : 'text-danger'}`}>
                        {entry.transactionType === 'Credit' ? '+' : '-'}${entry.amount.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge fs-10 ${entry.transactionType === 'Credit' ? 'bg-success' : 'bg-danger'}`}>
                          {entry.transactionType}
                        </span>
                      </td>
                      <td className="text-end fw-medium">${entry.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.entries.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-4">No transactions found for the selected criteria</td></tr>
                  )}
                </tbody>
                {data.entries.length > 0 && (
                  <tfoot className="table-dark">
                    <tr>
                      <th colSpan={7}>Closing Balance</th>
                      <th className="text-end">${data.closingBalance.toFixed(2)}</th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <div className="text-center p-5"><p className="text-muted">No data available</p></div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {data && data.entries.length > 0 && (
        <div className="row mt-3">
          <div className="col-md-3">
            <div className="card border-success"><div className="card-body text-center"><small className="text-muted">Total Credits</small><h5 className="fw-bold text-success mb-0">${data.entries.filter(e => e.transactionType === 'Credit').reduce((s, e) => s + e.amount, 0).toFixed(2)}</h5></div></div>
          </div>
          <div className="col-md-3">
            <div className="card border-danger"><div className="card-body text-center"><small className="text-muted">Total Debits</small><h5 className="fw-bold text-danger mb-0">${data.entries.filter(e => e.transactionType === 'Debit').reduce((s, e) => s + e.amount, 0).toFixed(2)}</h5></div></div>
          </div>
          <div className="col-md-3">
            <div className="card border-primary"><div className="card-body text-center"><small className="text-muted">Total Transactions</small><h5 className="fw-bold text-primary mb-0">{data.entries.length}</h5></div></div>
          </div>
          <div className="col-md-3">
            <div className="card border-info"><div className="card-body text-center"><small className="text-muted">Closing Balance</small><h5 className="fw-bold text-info mb-0">${data.closingBalance.toFixed(2)}</h5></div></div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountStatement;

