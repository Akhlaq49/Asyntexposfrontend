import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getDailyCashFlowReport, DailyCashFlowReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DailyCashFlowReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getDailyCashFlowReport(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Daily Cash Flow Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Financial' }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
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
                  const cols = ['Date', 'Cash Collected', 'Online Payments', 'Down Payments', 'Expenses', 'Net Flow'];
                  const rows = data.dailyEntries.map(e => [new Date(e.date).toLocaleDateString(), e.cashCollected, e.onlinePayments, e.downPayments, e.expenses, e.netFlow]);
                  exportToExcel(cols, rows, 'Daily-Cash-Flow-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Date', 'Cash Collected', 'Online Payments', 'Down Payments', 'Expenses', 'Net Flow'];
                  const rows = data.dailyEntries.map(e => [new Date(e.date).toLocaleDateString(), `Rs ${e.cashCollected.toLocaleString()}`, `Rs ${e.onlinePayments.toLocaleString()}`, `Rs ${e.downPayments.toLocaleString()}`, `Rs ${e.expenses.toLocaleString()}`, `Rs ${e.netFlow.toLocaleString()}`]);
                  exportToPDF(cols, rows, 'Daily-Cash-Flow-Report', 'Daily Cash Flow Report', [
                    { label: 'Opening Balance', value: `Rs ${data.openingBalance.toLocaleString()}` },
                    { label: 'Cash Collected', value: `Rs ${data.cashCollected.toLocaleString()}` },
                    { label: 'Closing Balance', value: `Rs ${data.closingBalance.toLocaleString()}` },
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
          {/* Summary Cards */}
          <div className="row mb-4">
            {[
              { label: 'Opening Balance', value: data.openingBalance, color: 'info' },
              { label: 'Cash Collected', value: data.cashCollected, color: 'success' },
              { label: 'Down Payments', value: data.downPayments, color: 'primary' },
              { label: 'Expenses', value: data.expenses, color: 'danger' },
              { label: 'Closing Balance', value: data.closingBalance, color: 'dark' },
            ].map((c, i) => (
              <div className="col mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4 className={`text-${c.color}`}>Rs {c.value.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Entries Table */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Daily Breakdown</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Cash Collected</th>
                      <th>Online Payments</th>
                      <th>Down Payments</th>
                      <th>Expenses</th>
                      <th>Net Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyEntries.map((e, i) => (
                      <tr key={i}>
                        <td>{new Date(e.date).toLocaleDateString()}</td>
                        <td>Rs {e.cashCollected.toLocaleString()}</td>
                        <td>Rs {e.onlinePayments.toLocaleString()}</td>
                        <td>Rs {e.downPayments.toLocaleString()}</td>
                        <td className="text-danger">Rs {e.expenses.toLocaleString()}</td>
                        <td className={e.netFlow >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>Rs {e.netFlow.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.dailyEntries.length === 0 && (
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

export default DailyCashFlowReport;
