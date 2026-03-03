import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getInstallmentSalesSummary, InstallmentSalesSummary } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const InstallmentSalesSummaryReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<InstallmentSalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getInstallmentSalesSummary(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title={t('reports.installment_sales_summary')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.sales') }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">{t('common.from_date')}</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('common.to_date')}</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>{t('reports.apply_filter')}</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = [t('reports.month'), t('reports.contracts'), t('reports.down_payments'), t('reports.financed_amount')];
                  const rows = data.monthlySales.map(m => [m.month, m.contracts, m.downPayments, m.financedAmount]);
                  exportToExcel(cols, rows, 'Installment-Sales-Summary');
                }}
                onExportPDF={() => {
                  const cols = [t('reports.month'), t('reports.contracts'), t('reports.down_payments'), t('reports.financed_amount')];
                  const rows = data.monthlySales.map(m => [m.month, m.contracts, `Rs ${m.downPayments.toLocaleString()}`, `Rs ${m.financedAmount.toLocaleString()}`]);
                  exportToPDF(cols, rows, 'Installment-Sales-Summary', t('reports.installment_sales_summary'), [
                    { label: t('reports.total_contracts'), value: data.totalContracts },
                    { label: t('common.active'), value: data.activeContracts },
                    { label: t('common.completed'), value: data.completedContracts },
                    { label: t('reports.total_down_payments'), value: `Rs ${data.totalDownPayments.toLocaleString()}` },
                    { label: t('reports.total_revenue'), value: `Rs ${data.totalRevenue.toLocaleString()}` },
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
          {/* Contract Summary */}
          <div className="row mb-4">
            {[
              { label: t('reports.total_contracts'), value: data.totalContracts, color: 'primary' },
              { label: t('common.active'), value: data.activeContracts, color: 'success' },
              { label: t('common.completed'), value: data.completedContracts, color: 'info' },
              { label: t('reports.cancelled'), value: data.cancelledContracts, color: 'danger' },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h3 className={`text-${c.color}`}>{c.value}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Financial Summary */}
          <div className="row mb-4">
            {[
              { label: t('reports.total_down_payments'), value: data.totalDownPayments },
              { label: t('reports.total_financed'), value: data.totalFinancedAmount },
              { label: t('reports.total_revenue'), value: data.totalRevenue },
            ].map((c, i) => (
              <div className="col-md-4 mb-3" key={i}>
                <div className="card">
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4>Rs {c.value.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tenure Breakdown */}
          <div className="card mb-4">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.tenure_breakdown')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr><th>{t('reports.tenure')}</th><th>{t('reports.contracts')}</th><th>{t('reports.total_amount')}</th></tr>
                  </thead>
                  <tbody>
                    {data.tenureBreakdown.map((t, i) => (
                      <tr key={i}>
                        <td>{t.tenureLabel}</td>
                        <td>{t.count}</td>
                        <td>Rs {t.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.tenureBreakdown.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-muted">{t('reports.no_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Monthly Sales */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.monthly_sales_trend')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr><th>{t('reports.month')}</th><th>{t('reports.contracts')}</th><th>{t('reports.down_payments')}</th><th>{t('reports.financed_amount')}</th></tr>
                  </thead>
                  <tbody>
                    {data.monthlySales.map((m, i) => (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td>{m.contracts}</td>
                        <td>Rs {m.downPayments.toLocaleString()}</td>
                        <td>Rs {m.financedAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.monthlySales.length === 0 && (
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

export default InstallmentSalesSummaryReport;
