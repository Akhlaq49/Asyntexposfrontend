import React, { useState, useEffect } from 'react';
import { getTrialBalance, TrialBalanceData } from '../../services/financeService';

const TrialBalance: React.FC = () => {
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStore, setFilterStore] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (filterStore) params.store = filterStore;
      const res = await getTrialBalance(params);
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Trial Balance</h4><h6>Review your debits and credits</h6></div></div>
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
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Store</label>
              <input type="text" className="form-control" placeholder="All Stores" value={filterStore} onChange={e => setFilterStore(e.target.value)} />
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
                  <tr><th>#</th><th>Account Name</th><th className="text-end">Debit ($)</th><th className="text-end">Credit ($)</th></tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{item.accountName}</td>
                      <td className="text-end">{item.debit > 0 ? item.debit.toFixed(2) : '-'}</td>
                      <td className="text-end">{item.credit > 0 ? item.credit.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                  {data.items.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No data for the selected period</td></tr>}
                </tbody>
                <tfoot className="table-dark">
                  <tr>
                    <th colSpan={2}>Totals</th>
                    <th className="text-end">{data.totalDebit.toFixed(2)}</th>
                    <th className="text-end">{data.totalCredit.toFixed(2)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center p-5"><p className="text-muted">No data available</p></div>
          )}
        </div>
      </div>

      {data && (
        <div className="row mt-3">
          <div className="col-md-4">
            <div className="card border-primary"><div className="card-body text-center"><small className="text-muted">Total Debit</small><h4 className="fw-bold text-primary mb-0">${data.totalDebit.toFixed(2)}</h4></div></div>
          </div>
          <div className="col-md-4">
            <div className="card border-success"><div className="card-body text-center"><small className="text-muted">Total Credit</small><h4 className="fw-bold text-success mb-0">${data.totalCredit.toFixed(2)}</h4></div></div>
          </div>
          <div className="col-md-4">
            <div className={`card ${Math.abs(data.totalDebit - data.totalCredit) < 0.01 ? 'border-success' : 'border-danger'}`}><div className="card-body text-center"><small className="text-muted">Difference</small><h4 className={`fw-bold mb-0 ${Math.abs(data.totalDebit - data.totalCredit) < 0.01 ? 'text-success' : 'text-danger'}`}>${Math.abs(data.totalDebit - data.totalCredit).toFixed(2)}</h4>{Math.abs(data.totalDebit - data.totalCredit) < 0.01 && <span className="badge bg-success mt-1">Balanced</span>}</div></div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrialBalance;

