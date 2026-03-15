import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getProductExpiryReport, ProductExpiryReportItemDto } from '../../services/reportService';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

const ProductExpiryReport: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ProductExpiryReportItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getProductExpiryReport()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search || i.productName.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  const cols = [t('common.sku'), t('reports.serial_no'), t('common.product_name'), t('reports.manufactured_date'), t('reports.expired_date')];
  const rows = filtered.map(i => [i.sku, i.serialNo, i.productName, i.manufacturedDate, i.expiredDate]);

  const isExpired = (d: string) => { try { return new Date(d) < new Date(); } catch { return false; } };

  return (
    <>
      <PageHeader title={t('reports.product_expiry_report')} breadcrumbs={[{ title: t('reports.reports') }, { title: t('reports.product_expiry') }]} />

      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><Link className="nav-link" to="/product-report">{t('reports.product_report')}</Link></li>
        <li className="nav-item"><Link className="nav-link active" to="/product-expiry-report">{t('reports.product_expiry')}</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/product-quantity-alert">{t('reports.quantity_alert')}</Link></li>
      </ul>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={load}><i className="ti ti-refresh me-1"></i>{t('common.refresh')}</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'product-expiry-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'product-expiry-report', t('reports.product_expiry_report'))} />
          </div>
        </div>
        <div className="card-body">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <div className="table-responsive"><table className="table table-hover">
              <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {paginatedData.length === 0 ? <tr><td colSpan={cols.length} className="text-center py-4">{t('reports.no_data_found')}</td></tr>
                  : paginatedData.map((item, idx) => (
                    <tr key={idx} className={isExpired(item.expiredDate) ? 'table-danger' : ''}>
                      <td>{item.sku}</td><td>{item.serialNo}</td><td>{item.productName}</td>
                      <td>{item.manufacturedDate}</td><td>{item.expiredDate}</td>
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

export default ProductExpiryReport;

