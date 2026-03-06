import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getDefaultersReport, DefaultersReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const DefaultersReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDefaultersReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = { 'Critical': 'danger', 'Warning': 'warning', 'Overdue': 'info' };
    const statusLabels: Record<string, string> = { 'Critical': t('reports.critical'), 'Warning': t('reports.warning'), 'Overdue': t('common.overdue') };
    return <span className={`badge bg-${colorMap[status] || 'secondary'}`}>{statusLabels[status] || status}</span>;
  };

  return (
    <>
      <PageHeader title={t('reports.defaulters_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('common.customer') }]} />

      {data && (
        <div className="d-flex justify-content-end mb-3">
          <ExportButtons
            onExportExcel={() => {
              const cols = [t('common.customer'), t('common.phone'), t('common.product'), t('reports.missed'), t('reports.overdue_amount'), t('reports.days_overdue'), t('reports.last_paid'), t('common.status')];
              const rows = data.defaulters.map(d => [d.customerName, d.phone || '-', d.productName, d.missedInstallments, d.overdueAmount, d.maxDaysOverdue, d.lastPaidDate ? new Date(d.lastPaidDate).toLocaleDateString() : t('reports.never'), d.status]);
              exportToExcel(cols, rows, 'Defaulters-Report');
            }}
            onExportPDF={() => {
              const cols = [t('common.customer'), t('common.phone'), t('common.product'), t('reports.missed'), t('reports.overdue_amount'), t('reports.days_overdue'), t('reports.last_paid'), t('common.status')];
              const rows = data.defaulters.map(d => [d.customerName, d.phone || '-', d.productName, d.missedInstallments, `Rs ${d.overdueAmount.toLocaleString()}`, d.maxDaysOverdue, d.lastPaidDate ? new Date(d.lastPaidDate).toLocaleDateString() : t('reports.never'), d.status]);
              exportToPDF(cols, rows, 'Defaulters-Report', t('reports.defaulters_report'), [
                { label: t('reports.total_defaulters'), value: data.totalDefaulters },
                { label: t('reports.total_defaulted_amount'), value: `Rs ${data.totalDefaultedAmount.toLocaleString()}` },
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
            <div className="col-md-6 mb-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_defaulters')}</h6>
                  <h3 className="text-danger">{data.totalDefaulters}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_defaulted_amount')}</h6>
                  <h3 className="text-warning">Rs {data.totalDefaultedAmount.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.defaulter_list')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('common.customer')}</th>
                      <th>{t('common.phone')}</th>
                      <th>{t('common.product')}</th>
                      <th>{t('reports.missed')}</th>
                      <th>{t('reports.overdue_amount')}</th>
                      <th>{t('reports.days_overdue')}</th>
                      <th>{t('reports.last_paid')}</th>
                      <th>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.defaulters.map((d, i) => (
                      <tr key={i}>
                        <td>{d.customerName}</td>
                        <td>{d.phone ? <><a href={`tel:${d.phone}`} title="Call" className="text-primary me-1"><i className="ti ti-phone-call"></i></a>{d.phone}</> : '-'}</td>
                        <td>{d.productName}</td>
                        <td className="text-danger fw-bold">{d.missedInstallments}</td>
                        <td>Rs {d.overdueAmount.toLocaleString()}</td>
                        <td>{d.maxDaysOverdue}</td>
                        <td>{d.lastPaidDate ? new Date(d.lastPaidDate).toLocaleDateString() : t('reports.never')}</td>
                        <td>{getStatusBadge(d.status)}</td>
                      </tr>
                    ))}
                    {data.defaulters.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-muted">{t('reports.no_defaulters_found')}</td></tr>
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

export default DefaultersReport;
