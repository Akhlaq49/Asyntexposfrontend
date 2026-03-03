import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getDefaultRateReport, DefaultRateReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DefaultRateReport: React.FC = () => {
  const { t } = useTranslation();
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
      <PageHeader title={t('reports.default_rate_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.risk_compliance') }]} />

      {data && (
        <div className="d-flex justify-content-end mb-3">
          <ExportButtons
            onExportExcel={() => {
              const cols = [t('reports.month'), t('reports.total_active'), t('reports.new_defaults'), t('reports.default_rate_pct')];
              const rows = data.monthlyTrend.map(m => [m.month, m.totalActive, m.newDefaults, m.defaultRate.toFixed(1)]);
              exportToExcel(cols, rows, 'Default-Rate-Report');
            }}
            onExportPDF={() => {
              const cols = [t('reports.month'), t('reports.total_active'), t('reports.new_defaults'), t('reports.default_rate_pct')];
              const rows = data.monthlyTrend.map(m => [m.month, m.totalActive, m.newDefaults, `${m.defaultRate.toFixed(1)}%`]);
              exportToPDF(cols, rows, 'Default-Rate-Report', t('reports.default_rate_report'), [
                { label: t('reports.total_financed_customers'), value: data.totalFinancedCustomers },
                { label: t('reports.number_of_defaulters'), value: data.numberOfDefaulters },
                { label: t('reports.default_rate'), value: `${data.defaultPercentage.toFixed(1)}%` },
                { label: t('reports.total_financed_amount'), value: `Rs ${data.totalFinancedAmount.toLocaleString()}` },
                { label: t('reports.defaulted_amount'), value: `Rs ${data.defaultedAmount.toLocaleString()}` },
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
              { label: t('reports.total_financed_customers'), value: data.totalFinancedCustomers.toString(), color: 'primary' },
              { label: t('reports.number_of_defaulters'), value: data.numberOfDefaulters.toString(), color: 'danger' },
              { label: t('reports.default_rate'), value: `${data.defaultPercentage.toFixed(1)}%`, color: 'warning' },
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
                  <h6 className="text-muted">{t('reports.total_financed_amount')}</h6>
                  <h4>Rs {data.totalFinancedAmount.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.defaulted_amount')}</h6>
                  <h4 className="text-danger">Rs {data.defaultedAmount.toLocaleString()}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Default Rate Progress Bar */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="mb-2">{t('reports.default_rate')}</h6>
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
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.monthly_default_trend')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('reports.month')}</th>
                      <th>{t('reports.total_active')}</th>
                      <th>{t('reports.new_defaults')}</th>
                      <th>{t('reports.default_rate')}</th>
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

export default DefaultRateReport;
