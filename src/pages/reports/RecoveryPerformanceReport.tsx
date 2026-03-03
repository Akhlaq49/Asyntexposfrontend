import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getRecoveryPerformance, RecoveryPerformance } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const RecoveryPerformanceReport: React.FC = () => {
  const { t } = useTranslation();
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
      <PageHeader title={t('reports.recovery_performance')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.risk_compliance') }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">{t('reports.from_date')}</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('reports.to_date')}</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>{t('reports.apply_filter')}</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = [t('reports.month'), t('reports.overdue_amount'), t('reports.recovered'), t('reports.recovery_rate_pct')];
                  const rows = data.monthlyRecovery.map(m => [m.month, m.overdueAmount, m.recovered, m.recoveryRate.toFixed(1)]);
                  exportToExcel(cols, rows, 'Recovery-Performance-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('reports.month'), t('reports.overdue_amount'), t('reports.recovered'), t('reports.recovery_rate_pct')];
                  const rows = data.monthlyRecovery.map(m => [m.month, `Rs ${m.overdueAmount.toLocaleString()}`, `Rs ${m.recovered.toLocaleString()}`, `${m.recoveryRate.toFixed(1)}%`]);
                  exportToPDF(cols, rows, 'Recovery-Performance-Report', t('reports.recovery_performance'), [
                    { label: t('reports.total_overdue'), value: `Rs ${data.totalOverdueAmount.toLocaleString()}` },
                    { label: t('reports.amount_recovered'), value: `Rs ${data.amountRecovered.toLocaleString()}` },
                    { label: t('reports.recovery_rate'), value: `${data.recoveryRate.toFixed(1)}%` },
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
                  <h6 className="text-muted">{t('reports.total_overdue')}</h6>
                  <h4 className="text-danger">Rs {data.totalOverdueAmount.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.recovered')}</h6>
                  <h4 className="text-success">Rs {data.amountRecovered.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.recovery_rate')}</h6>
                  <h4 className="text-primary">{data.recoveryRate.toFixed(1)}%</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.entries')}</h6>
                  <h4>{data.recoveredEntries} / {data.totalOverdueEntries}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Rate Bar */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="mb-2">{t('reports.overall_recovery_rate')}</h6>
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
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.monthly_recovery_trend')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('reports.month')}</th>
                      <th>{t('reports.overdue_amount')}</th>
                      <th>{t('reports.recovered')}</th>
                      <th>{t('reports.recovery_rate')}</th>
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
                      <tr><td colSpan={4} className="text-center text-muted">{t('reports.no_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-warning">{t('reports.failed_to_load_report')}</div>
      )}
    </>
  );
};

export default RecoveryPerformanceReport;
