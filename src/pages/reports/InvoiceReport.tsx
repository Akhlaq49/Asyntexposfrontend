import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getInvoiceReport, InvoiceReportDto } from '../../services/reportService';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

const fmt = (v: number) => `Rs ${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const InvoiceReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<InvoiceReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getInvoiceReport(from || undefined, to || undefined)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const filtered = (data?.items ?? []).filter(i =>
    !search || i.invoiceNo.toLowerCase().includes(search.toLowerCase()) || i.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  const cols = [t('reports.invoice_no'), t('common.customer'), t('reports.due_date'), t('common.amount'), t('common.paid'), t('reports.amount_due'), t('common.status')];
  const rows = filtered.map(i => [i.invoiceNo, i.customerName, i.dueDate, i.amount.toFixed(2), i.paid.toFixed(2), i.amountDue.toFixed(2), i.status]);
  const statusBadge = (s: string) => s === 'Paid' ? 'bg-success' : s === 'Overdue' ? 'bg-danger' : 'bg-warning';

  return (
    <>
      <PageHeader title={t('reports.invoice_report')} breadcrumbs={[{ title: t('reports.reports') }, { title: t('reports.invoice_report') }]} />

      {data && (
        <div className="row mb-3">
          {[
            { label: t('reports.total_amount'), value: fmt(data.totalAmount), icon: 'ti-currency-dollar', color: 'primary' },
            { label: t('reports.total_paid'), value: fmt(data.totalPaid), icon: 'ti-check', color: 'success' },
            { label: t('reports.total_unpaid'), value: fmt(data.totalUnpaid), icon: 'ti-clock', color: 'warning' },
            { label: t('common.overdue'), value: fmt(data.overdue), icon: 'ti-alert-triangle', color: 'danger' },
          ].map((c, i) => (
            <div className="col-xl-3 col-sm-6" key={i}>
              <div className="card"><div className="card-body d-flex align-items-center">
                <span className={`avatar avatar-md bg-${c.color}-transparent me-2`}><i className={`ti ${c.icon}`}></i></span>
                <div><p className="mb-0 text-muted">{c.label}</p><h5 className="mb-0">{c.value}</h5></div>
              </div></div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <input type="date" className="form-control form-control-sm" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 160 }} />
            <input type="date" className="form-control form-control-sm" value={to} onChange={e => setTo(e.target.value)} style={{ width: 160 }} />
            <button className="btn btn-primary btn-sm" onClick={load}>{t('common.apply')}</button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder={t('common.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <ExportButtons onExportExcel={() => exportToExcel(cols, rows, 'invoice-report')}
              onExportPDF={() => exportToPDF(cols, rows, 'invoice-report', t('reports.invoice_report'), [
                { label: t('reports.total_amount'), value: fmt(data?.totalAmount ?? 0) }, { label: t('reports.total_paid'), value: fmt(data?.totalPaid ?? 0) },
              ])} />
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
                      <td>{item.invoiceNo}</td><td>{item.customerName}</td><td>{item.dueDate}</td>
                      <td>{item.amount.toFixed(2)}</td><td>{item.paid.toFixed(2)}</td><td>{item.amountDue.toFixed(2)}</td>
                      <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
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

export default InvoiceReport;

