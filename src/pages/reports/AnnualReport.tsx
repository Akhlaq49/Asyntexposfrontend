import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getAnnualReport, AnnualReportDto } from '../../services/reportService';

const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 });

const AnnualReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnnualReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getAnnualReport(year)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, []);

  const months = data?.months ?? [];
  const totals = data?.totals;

  const cols = [t('reports.month'), t('reports.sales'), t('reports.purchases'), t('reports.returns'), t('reports.profit')];
  const rows = months.map(m => [m.month, fmt(m.sales), fmt(m.purchases), fmt(m.returns), fmt(m.profit)]);
  if (totals) rows.push([t('common.total'), fmt(totals.sales), fmt(totals.purchases), fmt(totals.returns), fmt(totals.profit)]);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <PageHeader title={t('reports.annual_report')} breadcrumbs={[{ title: t('reports.reports') }, { title: t('reports.annual_report') }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <select className="form-select form-select-sm" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 120 }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={load}>{t('reports.apply')}</button>
          </div>
          <ExportButtons onExportExcel={() => exportToExcel(cols, rows, `annual-report-${year}`)}
            onExportPDF={() => exportToPDF(cols, rows, `annual-report-${year}`, t('reports.annual_report_year', { year }))} />
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : months.length === 0 ? (
            <p className="text-center py-4">{t('reports.no_data_found')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="table-light">
                  <tr><th>{t('reports.month')}</th><th>{t('reports.sales')}</th><th>{t('reports.purchases')}</th><th>{t('reports.returns')}</th><th>{t('reports.profit')}</th></tr>
                </thead>
                <tbody>
                  {months.map(m => (
                    <tr key={m.month}>
                      <td>{m.month}</td><td>{fmt(m.sales)}</td><td>{fmt(m.purchases)}</td>
                      <td>{fmt(m.returns)}</td>
                      <td className={m.profit >= 0 ? 'text-success' : 'text-danger'}>{fmt(m.profit)}</td>
                    </tr>
                  ))}
                  {totals && (
                    <tr className="table-primary fw-bold">
                      <td>{t('common.total')}</td><td>{fmt(totals.sales)}</td><td>{fmt(totals.purchases)}</td>
                      <td>{fmt(totals.returns)}</td>
                      <td className={totals.profit >= 0 ? 'text-success' : 'text-danger'}>{fmt(totals.profit)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AnnualReport;

