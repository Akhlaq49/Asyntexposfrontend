import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getIncomeReport, IncomeReportItemDto } from '../../services/reportService';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

const IncomeReport: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<IncomeReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getIncomeReport(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.reference.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
  );

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  const totalIncome = filtered.reduce((sum, i) => sum + i.amount, 0);
  const cols = [t('common.reference'), t('common.date'), t('common.store'), t('common.category'), t('common.notes'), t('common.amount'), t('common.payment_method')];
  const rows = filtered.map(i => [i.reference, i.date, i.store, i.category, i.notes, i.amount.toFixed(2), i.paymentMethod]);

  return (
    <>
      <PageHeader title={t('reports.income_report')} breadcrumbs={[{ title: t('reports.reports') }, { title: t('reports.income_report') }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>{t('common.apply')}</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder={t('common.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'income-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'income-report', t('reports.income_report'), [
                { label: t('reports.total_income'), value: `Rs ${totalIncome.toFixed(2)}` },
              ])} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <>
              <div className="mb-3"><strong>{t('reports.total_income')}: </strong>Rs {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="table-responsive"><table className="table table-hover">
                <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {paginatedData.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">{t('reports.no_data_found')}</td></tr>
                    : paginatedData.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.reference}</td><td>{item.date}</td><td>{item.store}</td><td>{item.category}</td>
                        <td>{item.notes}</td><td>{item.amount.toFixed(2)}</td><td>{item.paymentMethod}</td>
                      </tr>
                    ))}
                </tbody>
              </table></div>
            </>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default IncomeReport;

