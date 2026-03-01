import React, { useState, useEffect } from 'react';
import { getBalanceSheet, BalanceSheetData } from '../../services/financeService';

const BalanceSheet: React.FC = () => {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStore, setFilterStore] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterDate) params.date = filterDate;
      if (filterStore) params.store = filterStore;
      const res = await getBalanceSheet(params);
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Balance Sheet</h4><h6>View your financial position</h6></div></div>
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
              <label className="form-label">As of Date</label>
              <input type="date" className="form-control" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
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

      {loading ? (
        <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
      ) : data ? (
        <div className="row">
          {/* Assets */}
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header bg-primary-transparent"><h5 className="card-title mb-0 text-primary"><i className="ti ti-trending-up me-2"></i>Assets</h5></div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="thead-light"><tr><th>Account</th><th className="text-end">Amount</th></tr></thead>
                    <tbody>
                      {data.assets.map((item, idx) => (
                        <tr key={idx}><td>{item.accountName}</td><td className="text-end">${item.amount.toFixed(2)}</td></tr>
                      ))}
                      {data.assets.length === 0 && <tr><td colSpan={2} className="text-center text-muted py-3">No assets found</td></tr>}
                    </tbody>
                    <tfoot className="table-dark"><tr><th>Total Assets</th><th className="text-end">${data.totalAssets.toFixed(2)}</th></tr></tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header bg-danger-transparent"><h5 className="card-title mb-0 text-danger"><i className="ti ti-trending-down me-2"></i>Liabilities</h5></div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="thead-light"><tr><th>Account</th><th className="text-end">Amount</th></tr></thead>
                    <tbody>
                      {data.liabilities.map((item, idx) => (
                        <tr key={idx}><td>{item.accountName}</td><td className="text-end">${item.amount.toFixed(2)}</td></tr>
                      ))}
                      {data.liabilities.length === 0 && <tr><td colSpan={2} className="text-center text-muted py-3">No liabilities found</td></tr>}
                    </tbody>
                    <tfoot><tr className="table-secondary"><th>Total Liabilities</th><th className="text-end">${data.totalLiabilities.toFixed(2)}</th></tr></tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header bg-success-transparent"><h5 className="card-title mb-0 text-success"><i className="ti ti-wallet me-2"></i>Equity</h5></div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center"><span className="fw-medium">Owner's Equity</span><h5 className="mb-0 fw-bold text-success">${data.equity.toFixed(2)}</h5></div>
              </div>
            </div>
            <div className="card bg-light border">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center"><span className="fw-bold fs-16">Total Liabilities & Equity</span><h4 className="mb-0 fw-bold">${(data.totalLiabilities + data.equity).toFixed(2)}</h4></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-5"><p className="text-muted">No data available</p></div>
      )}
    </>
  );
};

export default BalanceSheet;

