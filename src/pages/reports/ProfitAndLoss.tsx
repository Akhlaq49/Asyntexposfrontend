import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getProfitAndLoss, ProfitAndLossDto } from '../../services/reportService';

const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2 });

const ProfitAndLoss: React.FC = () => {
  const [data, setData] = useState<ProfitAndLossDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getProfitAndLoss(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const months = data?.months ?? [];
  const incomeRows = [
    { label: 'Sales', key: 'sales' as const },
    { label: 'Service', key: 'service' as const },
    { label: 'Purchase Return', key: 'purchaseReturn' as const },
  ];
  const expenseRows = [
    { label: 'Purchase Expense', key: 'purchaseExpense' as const },
    { label: 'Sales Return', key: 'salesReturn' as const },
  ];

  const exportCols = ['Category', ...months.map(m => m.month)];
  const exportRows = [
    ['--- Income ---', ...months.map(() => '')],
    ...incomeRows.map(r => [r.label, ...months.map(m => fmt(m[r.key]))]),
    ['Gross Profit', ...months.map(m => fmt(m.grossProfit))],
    ['--- Expense ---', ...months.map(() => '')],
    ...expenseRows.map(r => [r.label, ...months.map(m => fmt(m[r.key]))]),
    ['Total Expense', ...months.map(m => fmt(m.totalExpense))],
    ['Net Profit', ...months.map(m => fmt(m.netProfit))],
  ];

  return (
    <>
      <PageHeader title="Profit & Loss" breadcrumbs={[{ title: 'Reports' }, { title: 'Profit & Loss' }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
          </div>
          <ExportButtons onExportExcel={() => exportToExcel(exportCols, exportRows, 'profit-and-loss')}
            onExportPDF={() => exportToPDF(exportCols, exportRows, 'profit-and-loss', 'Profit & Loss Report')} />
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : months.length === 0 ? (
            <p className="text-center py-4">No data found</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr><th>Category</th>{months.map(m => <th key={m.month}>{m.month}</th>)}</tr>
                </thead>
                <tbody>
                  <tr className="table-info"><td colSpan={months.length + 1}><strong>Income</strong></td></tr>
                  {incomeRows.map(r => (
                    <tr key={r.key}><td>{r.label}</td>{months.map(m => <td key={m.month}>{fmt(m[r.key])}</td>)}</tr>
                  ))}
                  <tr className="table-success fw-bold"><td>Gross Profit</td>{months.map(m => <td key={m.month}>{fmt(m.grossProfit)}</td>)}</tr>

                  <tr className="table-warning"><td colSpan={months.length + 1}><strong>Expense</strong></td></tr>
                  {expenseRows.map(r => (
                    <tr key={r.key}><td>{r.label}</td>{months.map(m => <td key={m.month}>{fmt(m[r.key])}</td>)}</tr>
                  ))}
                  <tr className="table-danger fw-bold"><td>Total Expense</td>{months.map(m => <td key={m.month}>{fmt(m.totalExpense)}</td>)}</tr>

                  <tr className="table-primary fw-bold"><td>Net Profit</td>{months.map(m => <td key={m.month}>{fmt(m.netProfit)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfitAndLoss;

