import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getInstallmentCollectionReport, InstallmentCollectionReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const InstallmentCollectionReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getInstallmentCollectionReport(fromDate || undefined, toDate || undefined);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title={t('reports.installment_collection_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.financial') }]} />

      {/* Filters */}
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
                  const cols = [t('common.date'), t('reports.count'), t('common.amount')];
                  const rows = data.collectionByDate.map(r => [new Date(r.date).toLocaleDateString(), r.count, r.amount]);
                  exportToExcel(cols, rows, 'Installment-Collection-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('common.date'), t('reports.count'), t('common.amount')];
                  const rows = data.collectionByDate.map(r => [new Date(r.date).toLocaleDateString(), r.count, r.amount]);
                  exportToPDF(cols, rows, 'Installment-Collection-Report', t('reports.installment_collection_report'), [
                    { label: t('reports.total_due'), value: data.totalInstallmentsDue },
                    { label: t('reports.total_collected'), value: data.totalCollected },
                    { label: t('common.pending'), value: data.pendingCount },
                    { label: t('reports.late_payments'), value: data.latePayments },
                    { label: t('reports.amount_due'), value: `Rs ${data.totalAmountDue.toLocaleString()}` },
                    { label: t('reports.amount_collected'), value: `Rs ${data.totalAmountCollected.toLocaleString()}` },
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
              { label: t('reports.total_due'), value: data.totalInstallmentsDue, color: 'primary' },
              { label: t('reports.total_collected'), value: data.totalCollected, color: 'success' },
              { label: t('common.pending'), value: data.pendingCount, color: 'warning' },
              { label: t('reports.late_payments'), value: data.latePayments, color: 'danger' },
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

          {/* Amount Cards */}
          <div className="row mb-4">
            {[
              { label: t('reports.amount_due'), value: data.totalAmountDue },
              { label: t('reports.amount_collected'), value: data.totalAmountCollected },
              { label: t('reports.pending_amount'), value: data.pendingAmount },
              { label: t('reports.late_amount'), value: data.lateAmount },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className="card">
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4>Rs {c.value.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Collection By Date */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.collection_by_date')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr><th>{t('common.date')}</th><th>{t('reports.count')}</th><th>{t('common.amount')}</th></tr>
                  </thead>
                  <tbody>
                    {data.collectionByDate.map((r, i) => (
                      <tr key={i}>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td>{r.count}</td>
                        <td>Rs {r.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.collectionByDate.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-muted">{t('reports.no_data_available')}</td></tr>
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

export default InstallmentCollectionReport;
