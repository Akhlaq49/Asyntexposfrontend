import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getLateFeeReport, LateFeeReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const LateFeeReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getLateFeeReport(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title={t('reports.late_fee_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.operational') }]} />

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
                  const cols = [t('reports.plan_id'), t('common.customer'), t('common.phone'), t('reports.inst_no'), t('reports.due_date'), t('reports.paid_date'), t('reports.days_late'), t('reports.late_fee'), t('common.status')];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.installmentNo, new Date(item.dueDate).toLocaleDateString(), item.paidDate ? new Date(item.paidDate).toLocaleDateString() : '-', item.daysLate, item.lateFeeAmount, item.isPaid ? t('common.paid') : t('common.unpaid')]);
                  exportToExcel(cols, rows, 'Late-Fee-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('reports.plan_id'), t('common.customer'), t('common.phone'), t('reports.inst_no'), t('reports.due_date'), t('reports.paid_date'), t('reports.days_late'), t('reports.late_fee'), t('common.status')];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.installmentNo, new Date(item.dueDate).toLocaleDateString(), item.paidDate ? new Date(item.paidDate).toLocaleDateString() : '-', item.daysLate, `Rs ${item.lateFeeAmount.toLocaleString()}`, item.isPaid ? t('common.paid') : t('common.unpaid')]);
                  exportToPDF(cols, rows, 'Late-Fee-Report', t('reports.late_fee_report'), [
                    { label: t('reports.total_late_fees'), value: `Rs ${data.totalLateFees.toLocaleString()}` },
                    { label: t('reports.paid_late_fees'), value: `Rs ${data.paidLateFees.toLocaleString()}` },
                    { label: t('reports.unpaid_late_fees'), value: `Rs ${data.unpaidLateFees.toLocaleString()}` },
                    { label: t('reports.total_late_entries'), value: data.totalLateEntries },
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
            {[
              { label: t('reports.total_late_fees'), value: `Rs ${data.totalLateFees.toLocaleString()}`, color: 'primary' },
              { label: t('reports.paid_late_fees'), value: `Rs ${data.paidLateFees.toLocaleString()}`, color: 'success' },
              { label: t('reports.unpaid_late_fees'), value: `Rs ${data.unpaidLateFees.toLocaleString()}`, color: 'danger' },
              { label: t('reports.total_late_entries'), value: data.totalLateEntries.toString(), color: 'warning' },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4 className={`text-${c.color}`}>{c.value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.late_fee_details')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('reports.plan_id')}</th>
                      <th>{t('common.customer')}</th>
                      <th>{t('common.phone')}</th>
                      <th>{t('reports.inst_no')}</th>
                      <th>{t('reports.due_date')}</th>
                      <th>{t('reports.paid_date')}</th>
                      <th>{t('reports.days_late')}</th>
                      <th>{t('reports.late_fee')}</th>
                      <th>{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.planId}</td>
                        <td>{item.customerName}</td>
                        <td>{item.phone || '-'}</td>
                        <td>{item.installmentNo}</td>
                        <td>{new Date(item.dueDate).toLocaleDateString()}</td>
                        <td>{item.paidDate ? new Date(item.paidDate).toLocaleDateString() : '-'}</td>
                        <td className="text-danger fw-bold">{item.daysLate}</td>
                        <td>Rs {item.lateFeeAmount.toLocaleString()}</td>
                        <td>
                          <span className={`badge bg-${item.isPaid ? 'success' : 'danger'}`}>
                            {item.isPaid ? t('common.paid') : t('common.unpaid')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.items.length === 0 && (
                      <tr><td colSpan={9} className="text-center text-muted">{t('reports.no_late_fee_data')}</td></tr>
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

export default LateFeeReport;
