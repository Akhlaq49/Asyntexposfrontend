import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getSupplierReport, SupplierReportItemDto } from '../../services/reportService';

const SupplierReport: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<SupplierReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getSupplierReport(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.supplier.toLowerCase().includes(search.toLowerCase()) || i.reference.toLowerCase().includes(search.toLowerCase())
  );

  const cols = [t('common.reference'), t('reports.id'), t('reports.supplier'), t('reports.total_items'), t('common.amount'), t('reports.payment_method'), t('common.status')];
  const rows = filtered.map(i => [i.reference, i.id, i.supplier, i.totalItems, i.amount.toFixed(2), i.paymentMethod, i.status]);
  const statusBadge = (s: string) => s === 'Received' ? 'bg-success' : s === 'Pending' ? 'bg-warning' : 'bg-secondary';

  return (
    <>
      <PageHeader title={t('reports.supplier_report')} breadcrumbs={[{ title: t('reports.reports') }, { title: t('reports.supplier_report') }]} />

      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><Link className="nav-link active" to="/supplier-report">{t('reports.supplier_report')}</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/supplier-due-report">{t('reports.supplier_due_report')}</Link></li>
      </ul>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>{t('reports.apply')}</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder={t('reports.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'supplier-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'supplier-report', t('reports.supplier_report'))} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <div className="table-responsive"><table className="table table-hover">
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">{t('reports.no_data_found')}</td></tr>
                  : filtered.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.reference}</td><td>{item.id}</td><td>{item.supplier}</td><td>{item.totalItems}</td>
                      <td>{item.amount.toFixed(2)}</td><td>{item.paymentMethod}</td>
                      <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
};

export default SupplierReport;

