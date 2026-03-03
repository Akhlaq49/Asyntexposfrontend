import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getInstallmentProfitLoss, InstallmentProfitLoss } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const InstallmentProfitLossReport: React.FC = () => {
  const { t } = useTranslation();
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
      <PageHeader title={t('reports.installment_profit_loss')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.financial') }]} />

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
                  const cols = [t('reports.month'), t('reports.collections'), t('reports.interest'), t('reports.down_payments'), t('reports.expenses'), t('reports.net_profit')];
                  const rows = data.monthlyBreakdown.map(m => [m.month, m.collections, m.interest, m.downPayments, m.expenses, m.netProfit]);
                  exportToExcel(cols, rows, 'Installment-Profit-Loss-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('reports.month'), t('reports.collections'), t('reports.interest'), t('reports.down_payments'), t('reports.expenses'), t('reports.net_profit')];
                  const rows = data.monthlyBreakdown.map(m => [m.month, `Rs ${m.collections.toLocaleString()}`, `Rs ${m.interest.toLocaleString()}`, `Rs ${m.downPayments.toLocaleString()}`, `Rs ${m.expenses.toLocaleString()}`, `Rs ${m.netProfit.toLocaleString()}`]);
                  exportToPDF(cols, rows, 'Installment-Profit-Loss-Report', t('reports.installment_profit_loss'), [
                    { label: t('reports.gross_revenue'), value: `Rs ${data.grossRevenue.toLocaleString()}` },
                    { label: t('reports.total_collected'), value: `Rs ${data.totalCollected.toLocaleString()}` },
                    { label: t('reports.interest_earned'), value: `Rs ${data.interestEarned.toLocaleString()}` },
                    { label: t('reports.net_profit'), value: `Rs ${data.netProfit.toLocaleString()}` },
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
              { label: t('reports.gross_revenue'), value: data.grossRevenue, color: 'primary' },
              { label: t('reports.total_collected'), value: data.totalCollected, color: 'success' },
              { label: t('reports.interest_earned'), value: data.interestEarned, color: 'info' },
              { label: t('reports.total_expenses'), value: data.totalExpenses, color: 'danger' },
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
                  <h6 className="text-muted">{t('reports.net_profit')}</h6>
                  <h3 className={data.netProfit >= 0 ? 'text-success' : 'text-danger'}>Rs {data.netProfit.toLocaleString()}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.bad_debts')}</h6>
                  <h4 className="text-warning">Rs {data.badDebts.toLocaleString()}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.down_payments')}</h6>
                  <h4>Rs {data.totalDownPayments.toLocaleString()}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.monthly_breakdown')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('reports.month')}</th>
                      <th>{t('reports.collections')}</th>
                      <th>{t('reports.interest')}</th>
                      <th>{t('reports.down_payments')}</th>
                      <th>{t('reports.expenses')}</th>
                      <th>{t('reports.net_profit')}</th>
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
                      <tr><td colSpan={6} className="text-center text-muted">{t('reports.no_data_available')}</td></tr>
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

export default InstallmentProfitLossReport;
