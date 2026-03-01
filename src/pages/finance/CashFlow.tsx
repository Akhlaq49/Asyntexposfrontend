import React, { useState, useEffect } from 'react';
import { getCashFlow, CashFlowData } from '../../services/financeService';

const CashFlow: React.FC = () => {
  const [data, setData] = useState<CashFlowData | null>(null);
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
      const res = await getCashFlow(params);
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const renderSection = (title: string, items: { description: string; amount: number }[], total: number, colorClass: string, iconClass: string) => (
    <div className="card">
      <div className={`card-header bg-${colorClass}-transparent`}>
        <h5 className={`card-title mb-0 text-${colorClass}`}><i className={`ti ti-${iconClass} me-2`}></i>{title}</h5>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead className="thead-light"><tr><th>Description</th><th className="text-end">Amount ($)</th></tr></thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}><td>{item.description}</td><td className={`text-end ${item.amount >= 0 ? 'text-success' : 'text-danger'}`}>{item.amount >= 0 ? '' : '-'}${Math.abs(item.amount).toFixed(2)}</td></tr>
              ))}
              {items.length === 0 && <tr><td colSpan={2} className="text-center text-muted py-3">No items</td></tr>}
            </tbody>
            <tfoot className="table-secondary">
              <tr><th>Subtotal</th><th className={`text-end ${total >= 0 ? 'text-success' : 'text-danger'}`}>{total >= 0 ? '' : '-'}${Math.abs(total).toFixed(2)}</th></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Cash Flow Statement</h4><h6>Track your cash inflows and outflows</h6></div></div>
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

      {loading ? (
        <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
      ) : data ? (
        <>
          {renderSection('Operating Activities', data.operatingActivities, data.totalOperating, 'primary', 'activity')}
          {renderSection('Investing Activities', data.investingActivities, data.totalInvesting, 'warning', 'chart-line')}
          {renderSection('Financing Activities', data.financingActivities, data.totalFinancing, 'info', 'building-bank')}

          <div className={`card ${data.netCashFlow >= 0 ? 'border-success' : 'border-danger'}`}>
            <div className="card-body py-4">
              <div className="d-flex justify-content-between align-items-center">
                <div><h5 className="fw-bold mb-1">Net Cash Flow</h5><small className="text-muted">Total of all activities</small></div>
                <h3 className={`fw-bold mb-0 ${data.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                  {data.netCashFlow >= 0 ? '' : '-'}${Math.abs(data.netCashFlow).toFixed(2)}
                </h3>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="row">
            <div className="col-md-4"><div className="card"><div className="card-body text-center"><small className="text-muted">Operating</small><h5 className={`fw-bold mb-0 ${data.totalOperating >= 0 ? 'text-success' : 'text-danger'}`}>${data.totalOperating.toFixed(2)}</h5></div></div></div>
            <div className="col-md-4"><div className="card"><div className="card-body text-center"><small className="text-muted">Investing</small><h5 className={`fw-bold mb-0 ${data.totalInvesting >= 0 ? 'text-success' : 'text-danger'}`}>${data.totalInvesting.toFixed(2)}</h5></div></div></div>
            <div className="col-md-4"><div className="card"><div className="card-body text-center"><small className="text-muted">Financing</small><h5 className={`fw-bold mb-0 ${data.totalFinancing >= 0 ? 'text-success' : 'text-danger'}`}>${data.totalFinancing.toFixed(2)}</h5></div></div></div>
          </div>
        </>
      ) : (
        <div className="text-center p-5"><p className="text-muted">No data available</p></div>
      )}
    </>
  );
};

export default CashFlow;

