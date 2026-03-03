import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getExpenseReport, ExpenseReportItemDto } from '../../services/reportService';

const ExpenseReport: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExpenseReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getExpenseReport(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.expenseName.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpense = filtered.reduce((sum, i) => sum + i.amount, 0);
  const cols = [t('reports.expense_name'), t('common.category'), t('common.description'), t('common.date'), t('common.amount'), t('common.status')];
  const rows = filtered.map(i => [i.expenseName, i.category, i.description, i.date, i.amount.toFixed(2), i.status]);
  const statusBadge = (s: string) => s === 'Approved' ? 'bg-success' : 'bg-warning';

  return (
    <>
      <PageHeader title={t('reports.expense_report')} breadcrumbs={[{ title: t('reports.reports') }, { title: t('reports.expense_report') }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>{t('common.apply')}</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder={t('common.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'expense-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'expense-report', t('reports.expense_report'), [
                { label: t('reports.total_expense'), value: `Rs ${totalExpense.toFixed(2)}` },
              ])} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <>
              <div className="mb-3"><strong>{t('reports.total_expense')}: </strong>Rs {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="table-responsive"><table className="table table-hover">
                <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">{t('reports.no_data_found')}</td></tr>
                    : filtered.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.expenseName}</td><td>{item.category}</td><td>{item.description}</td><td>{item.date}</td>
                        <td>{item.amount.toFixed(2)}</td>
                        <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table></div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ExpenseReport;

