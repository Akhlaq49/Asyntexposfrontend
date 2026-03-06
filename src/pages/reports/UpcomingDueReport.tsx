import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getUpcomingDueReport, UpcomingDueReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const UpcomingDueReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = () => {
    setLoading(true);
    getUpcomingDueReport(days)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusBadge = (status: string) => {
    const m: Record<string, string> = { Paid: 'success', Pending: 'warning', Overdue: 'danger' };
    return <span className={`badge bg-${m[status] || 'secondary'}`}>{status}</span>;
  };

  return (
    <>
      <PageHeader title={t('reports.upcoming_due_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.operational') }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">{t('reports.days_ahead')}</label>
              <select className="form-select" value={days} onChange={e => setDays(parseInt(e.target.value))}>
                <option value={3}>{t('reports.x_days', { count: 3 })}</option>
                <option value={7}>{t('reports.x_days', { count: 7 })}</option>
                <option value={14}>{t('reports.x_days', { count: 14 })}</option>
                <option value={30}>{t('reports.x_days', { count: 30 })}</option>
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>{t('reports.apply')}</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = [t('reports.due_date'), t('common.customer'), t('common.phone'), t('common.address'), t('common.product'), t('reports.inst_no'), t('common.amount'), t('common.status')];
                  const rows = data.items.map(item => [new Date(item.dueDate).toLocaleDateString(), item.customerName, item.phone || '-', item.address || '-', item.productName, item.installmentNo, item.amountDue, item.status]);
                  exportToExcel(cols, rows, 'Upcoming-Due-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('reports.due_date'), t('common.customer'), t('common.phone'), t('common.product'), t('reports.inst_no'), t('common.amount'), t('common.status')];
                  const rows = data.items.map(item => [new Date(item.dueDate).toLocaleDateString(), item.customerName, item.phone || '-', item.productName, item.installmentNo, `Rs ${item.amountDue.toLocaleString()}`, item.status]);
                  exportToPDF(cols, rows, 'Upcoming-Due-Report', t('reports.upcoming_installments_next_days', { days }), [
                    { label: t('reports.upcoming_installments'), value: data.totalUpcoming },
                    { label: t('reports.total_amount_due'), value: `Rs ${data.totalAmountDue.toLocaleString()}` },
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
            <div className="col-md-6 mb-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.upcoming_installments')}</h6>
                  <h3 className="text-info">{data.totalUpcoming}</h3>
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
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.upcoming_installments_next_days', { days })}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('reports.due_date')}</th>
                      <th>{t('common.customer')}</th>
                      <th>{t('common.phone')}</th>
                      <th>{t('common.address')}</th>
                      <th>{t('common.product')}</th>
                      <th>{t('reports.inst_no')}</th>
                      <th>{t('common.amount')}</th>
                      <th>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i}>
                        <td>{new Date(item.dueDate).toLocaleDateString()}</td>
                        <td className="fw-bold">{item.customerName}</td>
                        <td>{item.phone ? <><a href={`tel:${item.phone}`} title="Call" className="text-primary me-1"><i className="ti ti-phone-call"></i></a>{item.phone}</> : '-'}</td>
                        <td>{item.address || '-'}</td>
                        <td>{item.productName}</td>
                        <td>{item.installmentNo}</td>
                        <td>Rs {item.amountDue.toLocaleString()}</td>
                        <td>{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                    {data.items.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-muted">{t('reports.no_upcoming_installments')}</td></tr>
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

export default UpcomingDueReport;
