import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getDueTodayReport, DueTodayReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DueTodayReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    getDueTodayReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusBadge = (status: string) => {
    const m: Record<string, string> = { Paid: 'success', Pending: 'warning', Overdue: 'danger' };
    const statusLabels: Record<string, string> = { Paid: t('common.paid'), Pending: t('common.pending'), Overdue: t('common.overdue') };
    return <span className={`badge bg-${m[status] || 'secondary'}`}>{statusLabels[status] || status}</span>;
  };

  return (
    <>
      <PageHeader title={t('reports.due_today_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.operational') }]} />

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_due_today')}</h6>
                  <h3 className="text-primary">{data.totalDueToday}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_amount_due')}</h6>
                  <h3 className="text-warning">Rs {data.totalAmountDue.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">{t('reports.installments_due_today')}</h5>
              <button className="btn btn-sm btn-outline-primary" onClick={fetchData}>
                <i className="ti ti-refresh me-1"></i>{t('common.refresh')}
              </button>
              <ExportButtons
                onExportExcel={() => {
                  const cols = [t('reports.plan_id'), t('common.customer'), t('common.phone'), t('common.address'), t('common.product'), t('reports.inst_no'), t('reports.amount_due'), t('common.status')];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.address || '-', item.productName, item.installmentNo, item.amountDue, item.status]);
                  exportToExcel(cols, rows, 'Due-Today-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('reports.plan_id'), t('common.customer'), t('common.phone'), t('common.product'), t('reports.inst_no'), t('reports.amount_due'), t('common.status')];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.productName, item.installmentNo, `Rs ${item.amountDue.toLocaleString()}`, item.status]);
                  exportToPDF(cols, rows, 'Due-Today-Report', t('reports.due_today_report'), [
                    { label: t('reports.total_due_today'), value: data.totalDueToday },
                    { label: t('reports.total_amount_due'), value: `Rs ${data.totalAmountDue.toLocaleString()}` },
                  ]);
                }}
              />
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('reports.plan_id')}</th>
                      <th>{t('common.customer')}</th>
                      <th>{t('common.phone')}</th>
                      <th>{t('common.address')}</th>
                      <th>{t('common.product')}</th>
                      <th>{t('reports.inst_no')}</th>
                      <th>{t('reports.amount_due')}</th>
                      <th>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.planId}</td>
                        <td className="fw-bold">{item.customerName}</td>
                        <td>{item.phone || '-'}</td>
                        <td>{item.address || '-'}</td>
                        <td>{item.productName}</td>
                        <td>{item.installmentNo}</td>
                        <td>Rs {item.amountDue.toLocaleString()}</td>
                        <td>{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                    {data.items.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-muted">{t('reports.no_installments_due_today')}</td></tr>
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

export default DueTodayReport;
