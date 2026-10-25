import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import ExportButtons from '../../components/ExportButtons';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import DateFilters, { DateFilterValue, EMPTY_DATE_FILTER, matchesDateFilter, describeDateFilter } from '../../components/common/DateFilters';
import { usePagination } from '../../utils/usePagination';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printReport } from '../../utils/printReport';
import { printDocument, esc, printMoney } from '../../utils/printDocument';
import { PAYMENT_METHODS } from '../../services/purchaseOrderService';

interface ReturnItem { id: number; purchaseItemId: number; productId?: number | null; productName: string; quantity: number; unitCost: number; total: number }
interface ReturnRefund { id: number; amount: number; method: string; reference?: string | null; date: string; notes?: string | null; createdBy?: string | null }
interface PurchaseReturn {
  id: number; reference: string; purchaseId: number; purchaseReference: string; purchaseOrderId?: number | null; supplierName: string; returnDate: string;
  total: number; credited: number; refunded: number; due: number; status: string; notes?: string | null; createdBy?: string | null;
  items: ReturnItem[]; refunds: ReturnRefund[];
}
interface ReturnableLine { purchaseItemId: number; productId?: number | null; productName: string; quantity: number; unitCost: number; returned: number; inStock?: number | null; returnable: number }
interface PurchaseLookup {
  purchaseId: number; reference: string; purchaseOrderId?: number | null; supplierName: string; date: string; total: number; paid: number; due: number;
  itemsTotal: number; extrasRate: number; items: ReturnableLine[]; previousReturns: string[];
}

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const showDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);
const r2 = (n: number) => Math.round(n * 100) / 100;
const STATUS_BADGE: Record<string, string> = { Settled: 'bg-success', 'Partly settled': 'bg-warning', 'Refund pending': 'bg-danger' };
const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.response?.data?.error || fallback;

/** Purchases > Purchase Return: send received goods back to the supplier */
const PurchaseReturns: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
  const [view, setView] = useState<PurchaseReturn | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* new return */
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState('');
  const [found, setFound] = useState<PurchaseLookup | null>(null);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [returnDate, setReturnDate] = useState(today());
  const [credit, setCredit] = useState('');
  const [refund, setRefund] = useState('');
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  /* refund received later */
  const [refundFor, setRefundFor] = useState<PurchaseReturn | null>(null);
  const [rf, setRf] = useState({ amount: '', method: 'Cash', date: today(), reference: '', notes: '' });
  const [rfError, setRfError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await api.get<PurchaseReturn[]>('/purchase-returns')).data); }
    catch { setError('Could not load the purchase returns.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const find = async (reference?: string) => {
    const r = (reference ?? ref).trim();
    setFormError(''); setFound(null); setQty({});
    if (!r) { setFormError('Enter the purchase reference.'); return; }
    setBusy(true);
    try {
      const data = (await api.get<PurchaseLookup>('/purchase-returns/purchase-lookup', { params: { reference: r } })).data;
      setFound(data); setCredit(''); setRefund('');
    } catch (e) { setFormError(errMsg(e, 'Could not find that purchase.')); }
    setBusy(false);
  };

  const openNew = (reference = '') => {
    setOpen(true); setRef(reference); setFound(null); setQty({}); setReturnDate(today()); setCredit(''); setRefund('');
    setRefundMethod('Cash'); setNotes(''); setFormError('');
    if (reference) find(reference);
  };

  // opened from Purchases ("Return goods"): /purchase-returns?ref=PUR-001
  useEffect(() => {
    const r = params.get('ref');
    if (r) { openNew(r); params.delete('ref'); setParams(params, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* value of what is going back (same as the server: unit cost x qty, plus the purchase's tax / discount share) */
  const linesValue = found ? found.items.reduce((s, i) => s + i.unitCost * (Number(qty[i.purchaseItemId]) || 0), 0) : 0;
  const value = Math.max(0, r2(linesValue * (1 + (found?.extrasRate || 0))));
  const maxCredit = found ? Math.max(0, Math.min(value, found.due)) : 0;
  // the settlement follows the value until the user types their own amounts
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!found || touched) return;
    const c = r2(maxCredit);
    setCredit(c > 0 ? String(c) : '');
    setRefund(value - c > 0 ? String(r2(value - c)) : '');
  }, [value, maxCredit, found, touched]);
  const creditN = Number(credit) || 0;
  const refundN = Number(refund) || 0;
  const stillOwed = r2(value - creditN - refundN);

  const save = async () => {
    if (!found) return;
    setFormError('');
    const lines = found.items.map((i) => ({ purchaseItemId: i.purchaseItemId, quantity: Number(qty[i.purchaseItemId]) || 0 })).filter((l) => l.quantity > 0);
    if (lines.length === 0) { setFormError('Enter the quantity going back for at least one product.'); return; }
    if (creditN > maxCredit + 0.001) { setFormError(maxCredit <= 0 ? `Nothing is owed on ${found.reference}, so nothing can be deducted from it.` : `At most ${money(maxCredit)} can be deducted from what is owed.`); return; }
    if (creditN + refundN > value + 0.001) { setFormError(`Deducted + refunded can't be more than the value returned (${money(value)}).`); return; }
    setBusy(true);
    try {
      const saved = (await api.post<PurchaseReturn>('/purchase-returns', { purchaseId: found.purchaseId, lines, returnDate, credit: creditN, refund: refundN, refundMethod, notes })).data;
      const units = saved.items.reduce((s, i) => s + i.quantity, 0);
      setNotice(`Return ${saved.reference} saved for ${saved.purchaseReference}: ${units} item(s) taken out of stock, value ${money(saved.total)}` +
        (saved.credited ? `, ${money(saved.credited)} deducted from what you owe` : '') + (saved.refunded ? `, ${money(saved.refunded)} refunded` : '') +
        (saved.due > 0 ? `, ${money(saved.due)} still to come back from the supplier.` : '.'));
      setOpen(false); setTouched(false);
      await load();
    } catch (e) { setFormError(errMsg(e, 'Could not save the return.')); }
    setBusy(false);
  };

  const saveRefund = async () => {
    if (!refundFor) return;
    const amount = Number(rf.amount) || 0;
    setRfError('');
    if (amount <= 0) { setRfError('Enter an amount greater than 0.'); return; }
    if (amount > refundFor.due + 0.001) { setRfError(`Only ${money(refundFor.due)} is still to come back.`); return; }
    setBusy(true);
    try {
      const r = (await api.post<PurchaseReturn>(`/purchase-returns/${refundFor.id}/refunds`, { ...rf, amount })).data;
      setNotice(`Refund of ${money(amount)} recorded on ${r.reference}.`);
      setRefundFor(null); await load();
    } catch (e) { setRfError(errMsg(e, 'Could not save the refund.')); }
    setBusy(false);
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    const r = rows.find((x) => x.id === deleteId);
    try {
      await api.delete(`/purchase-returns/${deleteId}`);
      setRows((list) => list.filter((x) => x.id !== deleteId));
      setNotice(`Return ${r?.reference} deleted - the goods are back in stock${r?.credited ? ' and the deduction on ' + r.purchaseReference + ' was removed' : ''}.`);
    } catch (e) { setError(errMsg(e, 'Could not delete the return.')); }
    setDeleteId(null); load();
  };

  /* ---- list ---- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!status || r.status === status) && matchesDateFilter(r.returnDate, dateFilter) &&
      (!q || [r.reference, r.purchaseReference, r.supplierName, ...r.items.map((i) => i.productName)].some((v) => (v || '').toLowerCase().includes(q))));
  }, [rows, search, status, dateFilter]);
  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);
  useEffect(() => { setCurrentPage(1); }, [search, status, dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const sum = (k: 'total' | 'credited' | 'refunded' | 'due') => filtered.reduce((s, r) => s + r[k], 0);
  const cols = ['Date', 'Return', 'Purchase', 'Supplier', 'Products', 'Value', 'Deducted', 'Refunded', 'Still to come back', 'Status'];
  const exportRows = filtered.map((r) => [showDate(r.returnDate), r.reference, r.purchaseReference, r.supplierName,
    r.items.map((i) => `${i.productName} x ${i.quantity}`).join(', '), r.total.toFixed(2), r.credited.toFixed(2), r.refunded.toFixed(2), r.due.toFixed(2), r.status]);
  const summary = [{ label: 'Value returned', value: money(sum('total')) }, { label: 'Deducted', value: money(sum('credited')) },
    { label: 'Refunded', value: money(sum('refunded')) }, { label: 'Still to come back', value: money(sum('due')) }];
  const title = `Purchase Returns${describeDateFilter(dateFilter) ? ` (${describeDateFilter(dateFilter)})` : ''}`;

  const printOne = (r: PurchaseReturn) => {
    const lines = r.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.productName)}</td><td class="r">${i.quantity}</td><td class="r">${printMoney(i.unitCost)}</td><td class="r">${printMoney(i.total)}</td></tr>`).join('');
    const itemsTotal = r.items.reduce((s, i) => s + i.total, 0);
    const adj = r2(r.total - itemsTotal);
    const refunds = r.refunds.map((f) => `<tr><td>${esc(showDate(f.date))}</td><td>${esc(f.method)}</td><td>${esc(f.reference || '-')}</td><td class="r">${printMoney(f.amount)}</td></tr>`).join('');
    printDocument(`Purchase Return ${r.reference}`, 'PURCHASE RETURN', r.reference, `
      <table class="info"><tr><th>Supplier</th><td>${esc(r.supplierName)}</td><th>Return date</th><td>${esc(showDate(r.returnDate))}</td></tr>
        <tr><th>Purchase</th><td>${esc(r.purchaseReference)}</td><th>Status</th><td>${esc(r.status)}</td></tr>
        ${r.notes ? `<tr><th>Reason</th><td colspan="3">${esc(r.notes)}</td></tr>` : ''}</table>
      <br><table><thead><tr><th>#</th><th>Product</th><th class="r">Qty returned</th><th class="r">Unit cost</th><th class="r">Total</th></tr></thead><tbody>${lines}</tbody>
      <tfoot>${adj !== 0 ? `<tr><th colspan="4" class="r">${adj > 0 ? 'Tax share' : 'Discount share'}</th><th class="r">${printMoney(Math.abs(adj))}</th></tr>` : ''}
        <tr class="total"><th colspan="4" class="r">Value returned</th><th class="r">${printMoney(r.total)}</th></tr>
        ${r.credited ? `<tr><th colspan="4" class="r">Deducted from ${esc(r.purchaseReference)}</th><th class="r">${printMoney(r.credited)}</th></tr>` : ''}
        ${r.refunded ? `<tr><th colspan="4" class="r">Refunded by supplier</th><th class="r">${printMoney(r.refunded)}</th></tr>` : ''}
        ${r.due > 0 ? `<tr><th colspan="4" class="r">Still to come back</th><th class="r">${printMoney(r.due)}</th></tr>` : ''}</tfoot></table>
      ${refunds ? `<br><b>Refunds received</b><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${refunds}</tbody></table>` : ''}
      <div class="sign"><div>Returned by</div><div>Received by (supplier)</div></div>`);
  };

  return (
    <>
      <PageHeader title="Purchase Returns" subtitle="Goods sent back to suppliers" breadcrumbs={[{ title: 'Purchases' }]} />
      <div className="d-flex justify-content-end mb-3">
        <button type="button" className="btn btn-primary" onClick={() => openNew()}><i className="ti ti-truck-return me-1"></i>Return a purchase</button>
      </div>
      {notice && <div className="alert alert-success py-2 d-flex justify-content-between align-items-start">{notice}<button type="button" className="btn-close ms-2" onClick={() => setNotice('')} /></div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3 mb-3">
        {[{ label: 'Value returned', value: sum('total'), cls: 'primary', icon: 'ti-truck-return' }, { label: 'Deducted from bills', value: sum('credited'), cls: 'info', icon: 'ti-receipt-2' },
          { label: 'Refunded', value: sum('refunded'), cls: 'success', icon: 'ti-cash' }, { label: 'Still to come back', value: sum('due'), cls: 'danger', icon: 'ti-hourglass' }].map((c) => (
          <div className="col-sm-6 col-xl-3" key={c.label}>
            <div className="card mb-0"><div className="card-body d-flex align-items-center">
              <span className={`avatar avatar-lg bg-${c.cls}-transparent text-${c.cls} me-3`}><i className={`ti ${c.icon}`} style={{ fontSize: 22 }} /></span>
              <div><p className="mb-1 text-muted">{c.label}</p><h5 className="mb-0">{money(c.value)}</h5></div>
            </div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <input className="form-control" style={{ maxWidth: 300 }} placeholder="Search return, purchase, supplier, product" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="d-flex gap-2 flex-wrap">
            <select className="form-select" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.keys(STATUS_BADGE).map((s) => <option key={s}>{s}</option>)}
            </select>
            <ExportButtons onExportExcel={() => exportToExcel(cols, exportRows, 'purchase-returns', 'Purchase Returns', summary)}
              onExportPDF={() => exportToPDF(cols, exportRows, 'purchase-returns', title, summary)}
              onPrint={() => printReport(cols, exportRows, 'purchase-returns', title, summary)} />
          </div>
          <div className="w-100"><DateFilters value={dateFilter} onChange={setDateFilter} /></div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="thead-light"><tr><th>Date</th><th>Return</th><th>Purchase</th><th>Supplier</th><th>Products</th><th className="text-end">Value</th>
                  <th className="text-end">Deducted</th><th className="text-end">Refunded</th><th className="text-end">To come back</th><th>Status</th><th className="text-center">Actions</th></tr></thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={11} className="text-center text-muted py-5">{rows.length === 0 ? 'No purchase returns yet. Use "Return a purchase" to send goods back to a supplier.' : 'No returns match your filters.'}</td></tr>
                  ) : paginatedData.map((r) => (
                    <tr key={r.id}>
                      <td className="text-nowrap">{showDate(r.returnDate)}</td>
                      <td><a href="#" onClick={(e) => { e.preventDefault(); setView(r); }}>{r.reference}</a></td>
                      <td>{r.purchaseReference}</td>
                      <td>{r.supplierName}</td>
                      <td title={r.items.map((i) => `${i.productName} x ${i.quantity}`).join('\n')}>
                        {r.items[0]?.productName} x {r.items[0]?.quantity}{r.items.length > 1 && <small className="text-muted"> ... +{r.items.length - 1} more</small>}
                      </td>
                      <td className="text-end text-nowrap">{money(r.total)}</td>
                      <td className="text-end text-nowrap">{r.credited ? money(r.credited) : '-'}</td>
                      <td className="text-end text-nowrap">{r.refunded ? money(r.refunded) : '-'}</td>
                      <td className="text-end text-nowrap fw-semibold">{r.due > 0 ? <span className="text-danger">{money(r.due)}</span> : '-'}</td>
                      <td><span className={`badge ${STATUS_BADGE[r.status] || 'bg-secondary'}`}>{r.status}</span></td>
                      <td className="text-center text-nowrap">
                        {r.due > 0 && (
                          <button type="button" className="btn btn-sm btn-success me-1 py-0 px-2" title="Money received back from the supplier"
                            onClick={() => { setRefundFor(r); setRf({ amount: String(r.due), method: 'Cash', date: today(), reference: '', notes: '' }); setRfError(''); }}>
                            <i className="ti ti-cash me-1"></i>Refund received
                          </button>
                        )}
                        <a href="#" className="me-2 text-dark" title="View" onClick={(e) => { e.preventDefault(); setView(r); }}><i className="ti ti-eye"></i></a>
                        <a href="#" className="me-2 text-dark" title="Print" onClick={(e) => { e.preventDefault(); printOne(r); }}><i className="ti ti-printer"></i></a>
                        <a href="#" className="text-danger" title="Delete (puts the goods back in stock)" onClick={(e) => { e.preventDefault(); setDeleteId(r.id); }}><i className="ti ti-trash"></i></a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />

      {/* ===== Return a purchase ===== */}
      {open && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Return a purchase</h4>
                <button type="button" className="btn-close" onClick={() => { setOpen(false); setTouched(false); }} disabled={busy} />
              </div>
              <div className="modal-body">
                <label className="form-label mb-1">Purchase reference</label>
                <div className="d-flex gap-2" style={{ maxWidth: 460 }}>
                  <input className="form-control" placeholder="e.g. PUR-001 or PO-0001-GR1" value={ref} onChange={(e) => setRef(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setTouched(false); find(); } }} autoFocus />
                  <button type="button" className="btn btn-outline-primary" onClick={() => { setTouched(false); find(); }} disabled={busy}>Find</button>
                </div>
                <small className="text-muted">The reference shown on the Purchases page (purchase order deliveries are PO-0001-GR1, GR2 ...).</small>

                {found && (
                  <>
                    <div className="row g-2 my-3">
                      {[{ l: 'Supplier', v: found.supplierName }, { l: 'Purchase date', v: showDate(found.date) }, { l: 'Total', v: money(found.total) },
                        { l: 'Paid', v: money(found.paid) }, { l: 'Still owed', v: money(Math.max(0, found.due)) }].map((c) => (
                        <div className="col" key={c.l}><div className="border rounded p-2 h-100"><small className="text-muted d-block">{c.l}</small><span className="fw-semibold">{c.v}</span></div></div>
                      ))}
                    </div>
                    {found.previousReturns.length > 0 && <div className="alert alert-info py-2">Already returned from this purchase: {found.previousReturns.join(', ')}</div>}
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead className="thead-light"><tr><th>Product</th><th className="text-end">Received</th><th className="text-end">Returned</th><th className="text-end">In stock</th>
                          <th className="text-end">Unit cost</th><th style={{ width: 140 }}>Returning now</th><th className="text-end">Value</th></tr></thead>
                        <tbody>
                          {found.items.map((i) => {
                            const q = Number(qty[i.purchaseItemId]) || 0;
                            return (
                              <tr key={i.purchaseItemId}>
                                <td>{i.productName}</td>
                                <td className="text-end">{i.quantity}</td>
                                <td className="text-end">{i.returned || '-'}</td>
                                <td className="text-end">{i.inStock ?? '-'}</td>
                                <td className="text-end text-nowrap">{money(i.unitCost)}</td>
                                <td>
                                  <input type="number" min={0} max={i.returnable} step={1} className="form-control form-control-sm" disabled={i.returnable <= 0}
                                    placeholder={i.returnable <= 0 ? 'none left' : `max ${i.returnable}`} value={qty[i.purchaseItemId] ?? ''}
                                    onKeyDown={(e) => { if (['.', ',', 'e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                                    onChange={(e) => {
                                      const n = Math.min(i.returnable, Math.max(0, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)));
                                      setQty({ ...qty, [i.purchaseItemId]: e.target.value === '' ? '' : String(n) }); setTouched(false);
                                    }} />
                                </td>
                                <td className="text-end text-nowrap">{q ? money(i.unitCost * q) : ''}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label mb-1">Return date</label>
                        <input type="date" className="form-control" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                      </div>
                      <div className="col-md-9">
                        <label className="form-label mb-1">Reason / notes <small className="text-muted">(optional)</small></label>
                        <input className="form-control" maxLength={500} placeholder="e.g. damaged on delivery" value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                    </div>

                    <div className="border rounded p-3 mt-3 bg-light">
                      <div className="d-flex justify-content-between mb-2"><span>Value returned{found.extrasRate !== 0 && <small className="text-muted"> (incl. share of the purchase's tax / discount)</small>}</span>
                        <strong>{money(value)}</strong></div>
                      <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                          <label className="form-label mb-1">Deduct from what you owe on {found.reference}</label>
                          <input type="number" min={0} step="0.01" className="form-control" disabled={maxCredit <= 0} value={credit}
                            placeholder={maxCredit <= 0 ? 'nothing owed' : `max ${money(maxCredit)}`} onChange={(e) => { setCredit(e.target.value); setTouched(true); }} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-1">Refunded by the supplier now</label>
                          <input type="number" min={0} step="0.01" className="form-control" value={refund} onChange={(e) => { setRefund(e.target.value); setTouched(true); }} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-1">Refund method</label>
                          <select className="form-select" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} disabled={refundN <= 0}>
                            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className={`mt-2 ${stillOwed < 0 ? 'text-danger' : 'text-muted'}`}>
                        {stillOwed > 0 ? <>The supplier will still owe you <strong>{money(stillOwed)}</strong> - record it with "Refund received" when it comes.</>
                          : stillOwed < 0 ? <>Deducted + refunded is {money(-stillOwed)} more than the value returned.</> : value > 0 ? 'Fully settled.' : ''}
                      </div>
                    </div>
                  </>
                )}
                {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setOpen(false); setTouched(false); }} disabled={busy}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !found || value <= 0}>{busy ? 'Saving...' : 'Save return'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Refund received later ===== */}
      {refundFor && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Refund received - {refundFor.reference}</h4>
                <button type="button" className="btn-close" onClick={() => setRefundFor(null)} disabled={busy} />
              </div>
              <div className="modal-body">
                <p className="mb-3">{refundFor.supplierName} still owes <strong>{money(refundFor.due)}</strong> for the goods returned from {refundFor.purchaseReference}.</p>
                <div className="row g-3">
                  <div className="col-6"><label className="form-label mb-1">Amount (Rs)</label>
                    <input type="number" min={0} step="0.01" className="form-control" value={rf.amount} onChange={(e) => setRf({ ...rf, amount: e.target.value })} /></div>
                  <div className="col-6"><label className="form-label mb-1">Date</label>
                    <input type="date" className="form-control" value={rf.date} onChange={(e) => setRf({ ...rf, date: e.target.value })} /></div>
                  <div className="col-6"><label className="form-label mb-1">Method</label>
                    <select className="form-select" value={rf.method} onChange={(e) => setRf({ ...rf, method: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
                  <div className="col-6"><label className="form-label mb-1">Reference <small className="text-muted">(optional)</small></label>
                    <input className="form-control" maxLength={60} value={rf.reference} onChange={(e) => setRf({ ...rf, reference: e.target.value })} /></div>
                  <div className="col-12"><label className="form-label mb-1">Notes <small className="text-muted">(optional)</small></label>
                    <input className="form-control" maxLength={500} value={rf.notes} onChange={(e) => setRf({ ...rf, notes: e.target.value })} /></div>
                </div>
                {rfError && <div className="alert alert-danger py-2 mt-3 mb-0">{rfError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRefundFor(null)} disabled={busy}>Cancel</button>
                <button type="button" className="btn btn-success" onClick={saveRefund} disabled={busy}>{busy ? 'Saving...' : 'Record refund'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== View ===== */}
      {view && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{view.reference} <span className={`badge ${STATUS_BADGE[view.status] || 'bg-secondary'} ms-2`}>{view.status}</span></h4>
                <button type="button" className="btn-close" onClick={() => setView(null)} />
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6"><small className="text-muted d-block">Supplier</small>{view.supplierName}</div>
                  <div className="col-md-3"><small className="text-muted d-block">Purchase</small>{view.purchaseReference}</div>
                  <div className="col-md-3"><small className="text-muted d-block">Return date</small>{showDate(view.returnDate)}</div>
                  {view.notes && <div className="col-12 mt-2"><small className="text-muted d-block">Reason / notes</small>{view.notes}</div>}
                </div>
                <table className="table table-sm">
                  <thead className="thead-light"><tr><th>Product</th><th className="text-end">Qty</th><th className="text-end">Unit cost</th><th className="text-end">Total</th></tr></thead>
                  <tbody>{view.items.map((i) => <tr key={i.id}><td>{i.productName}</td><td className="text-end">{i.quantity}</td><td className="text-end">{money(i.unitCost)}</td><td className="text-end">{money(i.total)}</td></tr>)}</tbody>
                  <tfoot>
                    <tr className="fw-bold"><td colSpan={3} className="text-end">Value returned</td><td className="text-end">{money(view.total)}</td></tr>
                    {view.credited > 0 && <tr><td colSpan={3} className="text-end">Deducted from {view.purchaseReference}</td><td className="text-end">{money(view.credited)}</td></tr>}
                    {view.refunded > 0 && <tr><td colSpan={3} className="text-end">Refunded</td><td className="text-end">{money(view.refunded)}</td></tr>}
                    {view.due > 0 && <tr className="text-danger"><td colSpan={3} className="text-end">Still to come back</td><td className="text-end">{money(view.due)}</td></tr>}
                  </tfoot>
                </table>
                {view.refunds.length > 0 && (<>
                  <h6 className="mt-3">Refunds received</h6>
                  <table className="table table-sm mb-0">
                    <thead className="thead-light"><tr><th>Date</th><th>Method</th><th>Reference</th><th className="text-end">Amount</th></tr></thead>
                    <tbody>{view.refunds.map((f) => <tr key={f.id}><td>{showDate(f.date)}</td><td>{f.method}</td><td>{f.reference || '-'}</td><td className="text-end">{money(f.amount)}</td></tr>)}</tbody>
                  </table>
                </>)}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => printOne(view)}><i className="ti ti-printer me-1"></i>Print</button>
                <button type="button" className="btn btn-secondary" onClick={() => setView(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={deleteId != null} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </>
  );
};

export default PurchaseReturns;
