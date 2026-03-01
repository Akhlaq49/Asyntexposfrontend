import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getInstallmentProfitLoss, InstallmentProfitLoss } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const InstallmentProfitLossReport: React.FC = () => {
  const [data, setData] = useState<InstallmentProfitLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getInstallmentProfitLoss(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Installment Profit & Loss" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Financial' }]} />

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
                  const cols = ['Month', 'Collections', 'Interest', 'Down Payments', 'Expenses', 'Net Profit'];
                  const rows = data.monthlyBreakdown.map(m => [m.month, m.collections, m.interest, m.downPayments, m.expenses, m.netProfit]);
                  exportToExcel(cols, rows, 'Installment-Profit-Loss-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Month', 'Collections', 'Interest', 'Down Payments', 'Expenses', 'Net Profit'];
                  const rows = data.monthlyBreakdown.map(m => [m.month, `Rs ${m.collections.toLocaleString()}`, `Rs ${m.interest.toLocaleString()}`, `Rs ${m.downPayments.toLocaleString()}`, `Rs ${m.expenses.toLocaleString()}`, `Rs ${m.netProfit.toLocaleString()}`]);
                  exportToPDF(cols, rows, 'Installment-Profit-Loss-Report', 'Installment Profit & Loss', [
                    { label: 'Gross Revenue', value: `Rs ${data.grossRevenue.toLocaleString()}` },
                    { label: 'Total Collected', value: `Rs ${data.totalCollected.toLocaleString()}` },
                    { label: 'Interest Earned', value: `Rs ${data.interestEarned.toLocaleString()}` },
                    { label: 'Net Profit', value: `Rs ${data.netProfit.toLocaleString()}` },
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
          {/* Revenue Cards */}
          <div className="row mb-4">
            {[
              { label: 'Gross Revenue', value: data.grossRevenue, color: 'primary' },
              { label: 'Total Collected', value: data.totalCollected, color: 'success' },
              { label: 'Interest Earned', value: data.interestEarned, color: 'info' },
              { label: 'Total Expenses', value: data.totalExpenses, color: 'danger' },
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

          {/* Net Profit Card */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <div className={`card border-${data.netProfit >= 0 ? 'success' : 'danger'}`}>
                <div className="card-body text-center">
                  <h6 className="text-muted">Net Profit</h6>
                  <h3 className={data.netProfit >= 0 ? 'text-success' : 'text-danger'}>Rs {data.netProfit.toLocaleString()}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h6 className="text-muted">Bad Debts</h6>
                  <h4 className="text-warning">Rs {data.badDebts.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h6 className="text-muted">Down Payments</h6>
                  <h4>Rs {data.totalDownPayments.toLocaleString()}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Monthly Breakdown</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Collections</th>
                      <th>Interest</th>
                      <th>Down Payments</th>
                      <th>Expenses</th>
                      <th>Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyBreakdown.map((m, i) => (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td>Rs {m.collections.toLocaleString()}</td>
                        <td>Rs {m.interest.toLocaleString()}</td>
                        <td>Rs {m.downPayments.toLocaleString()}</td>
                        <td className="text-danger">Rs {m.expenses.toLocaleString()}</td>
                        <td className={m.netProfit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>Rs {m.netProfit.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.monthlyBreakdown.length === 0 && (
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

export default InstallmentProfitLossReport;
