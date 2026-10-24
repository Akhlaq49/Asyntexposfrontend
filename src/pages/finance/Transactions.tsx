import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import DateFilters, { DateFilterValue, EMPTY_DATE_FILTER, matchesDateFilter, describeDateFilter } from '../../components/common/DateFilters';
import { usePagination } from '../../utils/usePagination';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc, printMoney } from '../../utils/printDocument';

/** One money movement (from GET /api/transactions) */
interface Transaction {
  key: string;
  date: string;
  kind: 'Sale payment' | 'Supplier payment' | 'Supplier refund' | 'Expense' | string;
  direction: 'In' | 'Out';
  amount: number;
  method?: string | null;
  reference?: string | null;
  document?: string | null;
  purchaseOrderNo?: string | null;
  purchaseOrderId?: number | null;
  party?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

const KINDS = ['Sale payment', 'Supplier payment', 'Supplier refund', 'Customer refund', 'Expense'];
const KIND_BADGE: Record<string, string> = {
  'Sale payment': 'bg-success', 'Supplier payment': 'bg-danger', 'Supplier refund': 'bg-info', 'Customer refund': 'bg-secondary', Expense: 'bg-warning',
};
const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const showDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Finance > Transactions: every money movement in one place -
 * payments received on sales, payments to suppliers, refunds from suppliers and expenses.
 */
const Transactions: React.FC = () => {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
  const [kind, setKind] = useState('');
  const [direction, setDirection] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api.get<{ transactions: Transaction[] }>('/transactions')).data.transactions); }
    catch { setError('Could not load the transactions.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) =>
      matchesDateFilter(t.date, dateFilter) &&
      (!kind || t.kind === kind) &&
      (!direction || t.direction === direction) &&
      (!q || [t.reference, t.document, t.purchaseOrderNo, t.party, t.notes, t.method, t.createdBy].some((v) => (v || '').toLowerCase().includes(q))));
  }, [rows, dateFilter, kind, direction, search]);
  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);
  useEffect(() => { setCurrentPage(1); }, [dateFilter, kind, direction, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const moneyIn = filtered.filter((t) => t.direction === 'In').reduce((s, t) => s + t.amount, 0);
  const moneyOut = filtered.filter((t) => t.direction === 'Out').reduce((s, t) => s + t.amount, 0);
  const filterNote = [describeDateFilter(dateFilter), kind, direction && (direction === 'In' ? 'Money in' : 'Money out'), search.trim() && `Search: "${search.trim()}"`].filter(Boolean).join(' | ');

  /* ---- export / print (current filters) ---- */
  const cols = ['Date', 'Type', 'Reference', 'Document', 'PO No.', 'Party', 'Method', 'In', 'Out', 'Notes'];
  const exportRows = () => filtered.map((t) => [showDate(t.date), t.kind, t.reference || '', t.document || '', t.purchaseOrderNo || '', t.party || '', t.method || '',
    t.direction === 'In' ? t.amount.toFixed(2) : '', t.direction === 'Out' ? t.amount.toFixed(2) : '', t.notes || '']);
  const summary = [{ label: 'Money in', value: money(moneyIn) }, { label: 'Money out', value: money(moneyOut) }, { label: 'Net', value: money(moneyIn - moneyOut) }];
  const print = () => {
    const body = filtered.map((t) => `<tr><td>${esc(showDate(t.date))}</td><td>${esc(t.kind)}</td><td>${esc(t.reference || '-')}</td><td>${esc(t.document || '-')}${t.purchaseOrderNo ? `<br><small>${esc(t.purchaseOrderNo)}</small>` : ''}</td>
      <td>${esc(t.party || '-')}</td><td>${esc(t.method || '-')}</td><td class="r">${t.direction === 'In' ? printMoney(t.amount) : ''}</td><td class="r">${t.direction === 'Out' ? printMoney(t.amount) : ''}</td></tr>`).join('');
    printDocument('Transactions', 'TRANSACTIONS', filterNote || 'All transactions', `
      <table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Document</th><th>Party</th><th>Method</th><th class="r">In</th><th class="r">Out</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr class="total"><th colspan="6" class="r">Totals</th><th class="r">${printMoney(moneyIn)}</th><th class="r">${printMoney(moneyOut)}</th></tr>
        <tr class="total"><th colspan="6" class="r">Net</th><th colspan="2" class="r">${printMoney(moneyIn - moneyOut)}</th></tr></tfoot></table>`);
  };

  return (
    <>
      {/* own header: the shared PageHeader's export icons are placeholders, these ones work */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Transactions</h4>
            <h6>Every payment received and paid, with the document it belongs to</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" title="PDF" onClick={(e) => { e.preventDefault(); exportToPDF(cols, exportRows(), 'transactions', filterNote ? `Transactions - ${filterNote}` : 'Transactions', summary); }}><img src="/assets/img/icons/pdf.svg" alt="pdf" /></a></li>
          <li><a href="#" title="Excel" onClick={(e) => { e.preventDefault(); exportToExcel(cols, exportRows(), 'transactions', 'Transactions', summary); }}><img src="/assets/img/icons/excel.svg" alt="excel" /></a></li>
          <li><a href="#" title="Print" onClick={(e) => { e.preventDefault(); print(); }}><i className="ti ti-printer" /></a></li>
          <li><a href="#" title="Refresh" onClick={(e) => { e.preventDefault(); load(); }}><i className="ti ti-refresh" /></a></li>
        </ul>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* totals for the current filters */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Money in', value: money(moneyIn), icon: 'ti-arrow-down-left', cls: 'success', dir: 'In' },
          { label: 'Money out', value: money(moneyOut), icon: 'ti-arrow-up-right', cls: 'danger', dir: 'Out' },
          { label: 'Net', value: money(moneyIn - moneyOut), icon: 'ti-scale', cls: moneyIn - moneyOut >= 0 ? 'primary' : 'warning', dir: '' },
          { label: 'Transactions', value: String(filtered.length), icon: 'ti-arrows-exchange', cls: 'info', dir: '' },
        ].map((c) => (
          <div className="col-sm-6 col-xl-3" key={c.label}>
            <div className="card mb-0" role={c.dir ? 'button' : undefined} onClick={() => c.dir && setDirection(direction === c.dir ? '' : c.dir)}>
              <div className="card-body d-flex align-items-center">
                <span className={`avatar avatar-lg bg-${c.cls}-transparent text-${c.cls} me-3`}><i className={`ti ${c.icon}`} style={{ fontSize: 22 }} /></span>
                <div><p className="mb-1 text-muted">{c.label}</p><h5 className="mb-0">{c.value}</h5></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <input className="form-control" style={{ maxWidth: 280 }} placeholder="Search reference, party, PO, notes" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="d-flex gap-2">
            <select className="form-select" style={{ width: 190 }} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All types</option>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className="form-select" style={{ width: 150 }} value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="">In &amp; out</option>
              <option value="In">Money in</option>
              <option value="Out">Money out</option>
            </select>
          </div>
          <div className="w-100 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <DateFilters value={dateFilter} onChange={setDateFilter} />
            <small className="text-muted">{filtered.length} of {rows.length} transaction(s)</small>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="thead-light">
                  <tr><th>Date</th><th>Type</th><th>Reference</th><th>Document</th><th>Party</th><th>Method</th><th className="text-end">In</th><th className="text-end">Out</th><th>Notes</th><th>By</th></tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={10} className="text-center text-muted py-5">{rows.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}</td></tr>
                  ) : paginatedData.map((t) => (
                    <tr key={t.key}>
                      <td className="text-nowrap">{showDate(t.date)}</td>
                      <td><span className={`badge ${KIND_BADGE[t.kind] || 'bg-secondary'}`}>{t.kind}</span></td>
                      <td>{t.reference || '-'}</td>
                      <td>
                        {t.document || '-'}
                        {t.purchaseOrderNo && <div><small><Link to="/purchase-orders">{t.purchaseOrderNo}</Link></small></div>}
                      </td>
                      <td>{t.party || '-'}</td>
                      <td>{t.method || '-'}</td>
                      <td className="text-end text-success fw-semibold text-nowrap">{t.direction === 'In' ? money(t.amount) : ''}</td>
                      <td className="text-end text-danger fw-semibold text-nowrap">{t.direction === 'Out' ? money(t.amount) : ''}</td>
                      <td style={{ maxWidth: 220 }}><small>{t.notes || ''}</small></td>
                      <td><small>{t.createdBy || ''}</small></td>
                    </tr>
                  ))}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr className="fw-bold">
                      <td colSpan={6} className="text-end">Totals ({filtered.length})</td>
                      <td className="text-end text-success text-nowrap">{money(moneyIn)}</td>
                      <td className="text-end text-danger text-nowrap">{money(moneyOut)}</td>
                      <td colSpan={2}>Net: {money(moneyIn - moneyOut)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default Transactions;
