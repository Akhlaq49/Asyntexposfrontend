import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getPurchaseReport, PurchaseReportItemDto } from '../../services/reportService';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

const PurchaseReport: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<PurchaseReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getPurchaseReport(from || undefined, to || undefined); setItems(r.items); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  const cols = [t('common.reference'), t('common.sku'), t('reports.due_date'), t('common.product_name'), t('common.category'), t('reports.in_stock_qty'), t('reports.purchase_qty'), t('reports.purchase_amount')];
  const rows = filtered.map(i => [i.reference, i.sku, i.dueDate, i.productName, i.category, i.inStockQty, i.purchaseQty, i.purchaseAmount.toFixed(2)]);

  return (
    <>
      <PageHeader title={t('reports.purchase_report')} breadcrumbs={[{ title: t('reports.reports') }, { title: t('reports.purchase_report') }]} />
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>{t('common.apply')}</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder={t('common.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'purchase-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'purchase-report', t('reports.purchase_report'))} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <div className="table-responsive"><table className="table table-hover">
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {paginatedData.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">{t('reports.no_data_found')}</td></tr>
                  : paginatedData.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.reference}</td><td>{item.sku}</td><td>{item.dueDate}</td><td>{item.productName}</td>
                      <td>{item.category}</td><td>{item.inStockQty}</td><td>{item.purchaseQty}</td><td>{item.purchaseAmount.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default PurchaseReport;

