import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getIncomeReport, IncomeReportItemDto } from '../../services/reportService';

const IncomeReport: React.FC = () => {
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

  const totalIncome = filtered.reduce((sum, i) => sum + i.amount, 0);
  const cols = ['Reference', 'Date', 'Store', 'Category', 'Notes', 'Amount', 'Payment Method'];
  const rows = filtered.map(i => [i.reference, i.date, i.store, i.category, i.notes, i.amount.toFixed(2), i.paymentMethod]);

  return (
    <>
      <PageHeader title="Income Report" breadcrumbs={[{ title: 'Reports' }, { title: 'Income Report' }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>Apply</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'income-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'income-report', 'Income Report', [
                { label: 'Total Income', value: `Rs ${totalIncome.toFixed(2)}` },
              ])} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <>
              <div className="mb-3"><strong>Total Income: </strong>Rs {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="table-responsive"><table className="table table-hover">
                <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">No data found</td></tr>
                    : filtered.map((item, idx) => (
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
    </>
  );
};

export default IncomeReport;

