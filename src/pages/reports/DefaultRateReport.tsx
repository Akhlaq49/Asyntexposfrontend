import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getDefaultRateReport, DefaultRateReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DefaultRateReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDefaultRateReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Default Rate Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Risk & Compliance' }]} />

      {data && (
        <div className="d-flex justify-content-end mb-3">
          <ExportButtons
            onExportExcel={() => {
              const cols = ['Month', 'Total Active', 'New Defaults', 'Default Rate (%)'];
              const rows = data.monthlyTrend.map(m => [m.month, m.totalActive, m.newDefaults, m.defaultRate.toFixed(1)]);
              exportToExcel(cols, rows, 'Default-Rate-Report');
            }}
            onExportPDF={() => {
              const cols = ['Month', 'Total Active', 'New Defaults', 'Default Rate (%)'];
              const rows = data.monthlyTrend.map(m => [m.month, m.totalActive, m.newDefaults, `${m.defaultRate.toFixed(1)}%`]);
              exportToPDF(cols, rows, 'Default-Rate-Report', 'Default Rate Report', [
                { label: 'Total Financed Customers', value: data.totalFinancedCustomers },
                { label: 'Number of Defaulters', value: data.numberOfDefaulters },
                { label: 'Default Rate', value: `${data.defaultPercentage.toFixed(1)}%` },
                { label: 'Total Financed Amount', value: `Rs ${data.totalFinancedAmount.toLocaleString()}` },
                { label: 'Defaulted Amount', value: `Rs ${data.defaultedAmount.toLocaleString()}` },
              ]);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          <div className="row mb-4">
            {[
              { label: 'Total Financed Customers', value: data.totalFinancedCustomers.toString(), color: 'primary' },
              { label: 'Number of Defaulters', value: data.numberOfDefaulters.toString(), color: 'danger' },
              { label: 'Default Rate', value: `${data.defaultPercentage.toFixed(1)}%`, color: 'warning' },
            ].map((c, i) => (
              <div className="col-md-4 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h3 className={`text-${c.color}`}>{c.value}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Financed Amount</h6>
                  <h4>Rs {data.totalFinancedAmount.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="text-muted">Defaulted Amount</h6>
                  <h4 className="text-danger">Rs {data.defaultedAmount.toLocaleString()}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Default Rate Progress Bar */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="mb-2">Default Rate</h6>
              <div className="progress" style={{ height: '30px' }}>
                <div
                  className={`progress-bar ${data.defaultPercentage > 20 ? 'bg-danger' : data.defaultPercentage > 10 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(data.defaultPercentage, 100)}%` }}
                >
                  {data.defaultPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Monthly Default Trend</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Total Active</th>
                      <th>New Defaults</th>
                      <th>Default Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyTrend.map((m, i) => (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td>{m.totalActive}</td>
                        <td className={m.newDefaults > 0 ? 'text-danger fw-bold' : ''}>{m.newDefaults}</td>
                        <td>
                          <span className={`badge bg-${m.defaultRate > 20 ? 'danger' : m.defaultRate > 10 ? 'warning' : 'success'}`}>
                            {m.defaultRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.monthlyTrend.length === 0 && (
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

export default DefaultRateReport;
