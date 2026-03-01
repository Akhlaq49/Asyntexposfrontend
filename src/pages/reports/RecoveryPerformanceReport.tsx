import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getRecoveryPerformance, RecoveryPerformance } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const RecoveryPerformanceReport: React.FC = () => {
  const [data, setData] = useState<RecoveryPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getRecoveryPerformance(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Recovery Performance" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Risk & Compliance' }]} />

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
                  const cols = ['Month', 'Overdue Amount', 'Recovered', 'Recovery Rate (%)'];
                  const rows = data.monthlyRecovery.map(m => [m.month, m.overdueAmount, m.recovered, m.recoveryRate.toFixed(1)]);
                  exportToExcel(cols, rows, 'Recovery-Performance-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Month', 'Overdue Amount', 'Recovered', 'Recovery Rate (%)'];
                  const rows = data.monthlyRecovery.map(m => [m.month, `Rs ${m.overdueAmount.toLocaleString()}`, `Rs ${m.recovered.toLocaleString()}`, `${m.recoveryRate.toFixed(1)}%`]);
                  exportToPDF(cols, rows, 'Recovery-Performance-Report', 'Recovery Performance Report', [
                    { label: 'Total Overdue', value: `Rs ${data.totalOverdueAmount.toLocaleString()}` },
                    { label: 'Amount Recovered', value: `Rs ${data.amountRecovered.toLocaleString()}` },
                    { label: 'Recovery Rate', value: `${data.recoveryRate.toFixed(1)}%` },
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
            <div className="col-md-3 mb-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Overdue</h6>
                  <h4 className="text-danger">Rs {data.totalOverdueAmount.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h6 className="text-muted">Recovered</h6>
                  <h4 className="text-success">Rs {data.amountRecovered.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">Recovery Rate</h6>
                  <h4 className="text-primary">{data.recoveryRate.toFixed(1)}%</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h6 className="text-muted">Entries</h6>
                  <h4>{data.recoveredEntries} / {data.totalOverdueEntries}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Rate Bar */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="mb-2">Overall Recovery Rate</h6>
              <div className="progress" style={{ height: '30px' }}>
                <div
                  className={`progress-bar ${data.recoveryRate >= 80 ? 'bg-success' : data.recoveryRate >= 50 ? 'bg-warning' : 'bg-danger'}`}
                  style={{ width: `${Math.min(data.recoveryRate, 100)}%` }}
                >
                  {data.recoveryRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Recovery */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Monthly Recovery Trend</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Overdue Amount</th>
                      <th>Recovered</th>
                      <th>Recovery Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyRecovery.map((m, i) => (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td className="text-danger">Rs {m.overdueAmount.toLocaleString()}</td>
                        <td className="text-success">Rs {m.recovered.toLocaleString()}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar ${m.recoveryRate >= 80 ? 'bg-success' : m.recoveryRate >= 50 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${Math.min(m.recoveryRate, 100)}%` }}
                              />
                            </div>
                            <span className="small">{m.recoveryRate.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.monthlyRecovery.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-muted">No data</td></tr>
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

export default RecoveryPerformanceReport;
