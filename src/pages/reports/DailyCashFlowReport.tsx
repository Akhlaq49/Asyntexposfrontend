import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getDailyCashFlowReport, DailyCashFlowReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DailyCashFlowReport: React.FC = () => {
  const { t } = useTranslation();
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
      <PageHeader title={t('reports.daily_cash_flow_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.financial') }]} />

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
                  const cols = [t('common.date'), t('reports.cash_collected'), t('reports.online_payments'), t('reports.down_payments'), t('reports.expenses'), t('reports.net_flow')];
                  const rows = data.dailyEntries.map(e => [new Date(e.date).toLocaleDateString(), e.cashCollected, e.onlinePayments, e.downPayments, e.expenses, e.netFlow]);
                  exportToExcel(cols, rows, 'Daily-Cash-Flow-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('common.date'), t('reports.cash_collected'), t('reports.online_payments'), t('reports.down_payments'), t('reports.expenses'), t('reports.net_flow')];
                  const rows = data.dailyEntries.map(e => [new Date(e.date).toLocaleDateString(), `Rs ${e.cashCollected.toLocaleString()}`, `Rs ${e.onlinePayments.toLocaleString()}`, `Rs ${e.downPayments.toLocaleString()}`, `Rs ${e.expenses.toLocaleString()}`, `Rs ${e.netFlow.toLocaleString()}`]);
                  exportToPDF(cols, rows, 'Daily-Cash-Flow-Report', t('reports.daily_cash_flow_report'), [
                    { label: t('reports.opening_balance'), value: `Rs ${data.openingBalance.toLocaleString()}` },
                    { label: t('reports.cash_collected'), value: `Rs ${data.cashCollected.toLocaleString()}` },
                    { label: t('reports.closing_balance'), value: `Rs ${data.closingBalance.toLocaleString()}` },
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
              { label: t('reports.opening_balance'), value: data.openingBalance, color: 'info' },
              { label: t('reports.cash_collected'), value: data.cashCollected, color: 'success' },
              { label: t('reports.down_payments'), value: data.downPayments, color: 'primary' },
              { label: t('reports.expenses'), value: data.expenses, color: 'danger' },
              { label: t('reports.closing_balance'), value: data.closingBalance, color: 'dark' },
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
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.daily_breakdown')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('reports.cash_collected')}</th>
                      <th>{t('reports.online_payments')}</th>
                      <th>{t('reports.down_payments')}</th>
                      <th>{t('reports.expenses')}</th>
                      <th>{t('reports.net_flow')}</th>
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

export default DailyCashFlowReport;
