import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import {
  voucherService as svc, voucherTotals, Voucher, VoucherPage, VoucherAccount, PartyType,
  ROOT_LABEL, RootType, amount, money, showDate, yearStart, localDate, errorText,
} from '../../services/ACCT/accountingService';
import { getParties, Party } from '../../services/PRTY/partyService';
import { printJournalVoucher } from '../../utils/documentPrints';

/**
 * Accounting > Journal Vouchers: entries typed in by hand, for what no other document posts - reclasses, corrections,
 * depreciation / amortization, accruals. Saved = posted to the books. A mistake is undone with Reverse.
 */
interface FormLine { key: number; accountId: string; debit: string; credit: string; partyId: string; partyName: string; note: string }
interface Form { id: number | null; reference: string; date: string; description: string; lines: FormLine[] }

let nextKey = 1;
const blankLine = (): FormLine => ({ key: nextKey++, accountId: '', debit: '', credit: '', partyId: '', partyName: '', note: '' });
const ROOTS: RootType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const PARTY_LABEL: Record<PartyType, string> = { Customer: 'customer', Supplier: 'supplier', Lender: 'lender' };
const noSigns = (e: React.KeyboardEvent) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); };

const JournalVouchers: React.FC = () => {
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(localDate(new Date()));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<VoucherPage | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const [accounts, setAccounts] = useState<VoucherAccount[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);

  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Voucher | null>(null);
  const [reversing, setReversing] = useState<{ voucher: Voucher; date: string; description: string; error: string; saving: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Voucher | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const t = setTimeout(() => svc.list({ from, to, search: search || undefined, page, pageSize: 50 })
      .then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e, 'Could not load the journal vouchers.'))), 250);
    return () => clearTimeout(t);
  }, [from, to, search, page, reload]);

  // accounts and parties are loaded the first time the form opens
  const loadLookups = useCallback(async () => {
    if (accounts.length > 0) return;
    const [a, c, s] = await Promise.all([svc.accounts(), getParties('Customer'), getParties('Supplier')]);
    setAccounts(a); setCustomers(c); setSuppliers(s);
  }, [accounts.length]);

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const grouped = useMemo(() => ROOTS.map((r) => ({ root: r, list: accounts.filter((a) => a.rootType === r) })).filter((g) => g.list.length > 0), [accounts]);

  const say = (text: string) => { setNotice(text); setTimeout(() => setNotice(''), 4000); };

  const openNew = async () => {
    setFormError('');
    setForm({ id: null, reference: '', date: localDate(new Date()), description: '', lines: [blankLine(), blankLine()] });
    try { await loadLookups(); } catch (e) { setFormError(errorText(e, 'Could not load the accounts.')); }
  };

  const openEdit = async (v: Voucher) => {
    setFormError('');
    try { await loadLookups(); } catch (e) { setFormError(errorText(e, 'Could not load the accounts.')); }
    setForm({
      id: v.id, reference: v.reference, date: v.date.slice(0, 10), description: v.description,
      lines: v.lines.map((l) => ({
        key: nextKey++, accountId: String(l.accountId), debit: l.debit ? String(l.debit) : '', credit: l.credit ? String(l.credit) : '',
        partyId: l.partyId ? String(l.partyId) : '', partyName: l.partyName || '', note: l.note || '',
      })),
    });
  };

  // suppliers are kept by name on the books: find the supplier again by name when editing
  useEffect(() => {
    if (!form || suppliers.length === 0) return;
    let changed = false;
    const lines = form.lines.map((l) => {
      if (l.partyId || !l.partyName || accountById.get(Number(l.accountId))?.partyType !== 'Supplier') return l;
      const s = suppliers.find((x) => x.fullName.trim().toLowerCase() === l.partyName.trim().toLowerCase());
      if (!s) return l;
      changed = true;
      return { ...l, partyId: String(s.id) };
    });
    if (changed) setForm({ ...form, lines });
  }, [form, suppliers, accountById]);

  const setLine = (key: number, patch: Partial<FormLine>) => form && setForm({ ...form, lines: form.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });
  const addLine = () => form && setForm({ ...form, lines: [...form.lines, blankLine()] });
  const removeLine = (key: number) => form && form.lines.length > 2 && setForm({ ...form, lines: form.lines.filter((l) => l.key !== key) });

  const totals = voucherTotals(form?.lines ?? []);

  const save = async () => {
    if (!form) return;
    const lines = form.lines.filter((l) => l.accountId || Number(l.debit) || Number(l.credit));
    setSaving(true); setFormError('');
    try {
      const body = {
        date: form.date, description: form.description,
        lines: lines.map((l) => ({
          accountId: Number(l.accountId) || 0, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0,
          partyId: l.partyId ? Number(l.partyId) : null, partyName: l.partyName.trim() || null, note: l.note.trim() || null,
        })),
      };
      const v = form.id ? await svc.update(form.id, body) : await svc.create(body);
      setForm(null);
      say(`${v.reference} ${form.id ? 'updated' : 'saved'} and posted to the books.`);
      setReload((n) => n + 1);
    } catch (e) {
      setFormError(errorText(e, 'Could not save the voucher.'));
    } finally {
      setSaving(false);
    }
  };

  const reverse = async () => {
    if (!reversing) return;
    setReversing({ ...reversing, saving: true, error: '' });
    try {
      const r = await svc.reverse(reversing.voucher.id, { date: reversing.date, description: reversing.description.trim() || undefined });
      setReversing(null);
      say(`${reversing.voucher.reference} reversed by ${r.reference}.`);
      setReload((n) => n + 1);
    } catch (e) {
      setReversing({ ...reversing, saving: false, error: errorText(e, 'Could not reverse the voucher.') });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await svc.remove(deleting.id);          // AdminDeleteModal shows the error if this fails
    say(`${deleting.reference} deleted.`);
    setDeleting(null);
    setReload((n) => n + 1);
  };

  const partyCell = (l: FormLine) => {
    const type = accountById.get(Number(l.accountId))?.partyType;
    if (!type) return <span className="text-muted small">-</span>;
    if (type === 'Lender') {
      return <input className="form-control form-control-sm" maxLength={150} placeholder="Bank or person" value={l.partyName}
        onChange={(e) => setLine(l.key, { partyName: e.target.value, partyId: '' })} />;
    }
    const list = type === 'Customer' ? customers : suppliers;
    return (
      <select className="form-select form-select-sm" value={l.partyId}
        onChange={(e) => setLine(l.key, { partyId: e.target.value, partyName: list.find((p) => String(p.id) === e.target.value)?.fullName || '' })}>
        <option value="">Choose the {PARTY_LABEL[type]}...</option>
        {list.map((p) => <option key={p.id} value={p.id}>{p.fullName}{p.code ? ` (${p.code})` : ''}</option>)}
      </select>
    );
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const locked = (v: Voucher) => v.reversalOfId != null || v.reversedById != null;

  return (
    <>
      <PageHeader title="Journal Vouchers" subtitle="Entries you post yourself: reclasses, corrections, depreciation, accruals"
        breadcrumbs={[{ title: 'Accounting' }]}
        actions={<button type="button" className="btn btn-primary" onClick={openNew}><i className="ti ti-plus me-1" />New Voucher</button>} />

      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">From</label><input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <input className="form-control" style={{ width: 240 }} placeholder="Reference or description" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {data && <span className="ms-auto text-muted small">{data.total} voucher{data.total === 1 ? '' : 's'}</span>}
      </div></div>

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="thead-light"><tr>
            <th style={{ width: 110 }}>Date</th><th style={{ width: 100 }}>Reference</th><th>Description</th>
            <th className="text-end" style={{ width: 140 }}>Amount</th><th style={{ width: 130 }}>Created by</th><th className="text-end">Actions</th>
          </tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={6} className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></td></tr>
              : data.vouchers.length === 0 ? <tr><td colSpan={6} className="text-center py-5 text-muted">No journal vouchers in this period. Click <b>New Voucher</b> to post one.</td></tr>
              : data.vouchers.map((v) => (
                <tr key={v.id}>
                  <td className="text-nowrap">{showDate(v.date)}</td>
                  <td className="fw-semibold">{v.reference}</td>
                  <td>
                    {v.description}
                    {v.reversalOfReference && <span className="badge bg-warning-transparent text-warning border ms-2">Reversal of {v.reversalOfReference}</span>}
                    {v.reversedByReference && <span className="badge bg-secondary-transparent text-secondary border ms-2">Reversed by {v.reversedByReference}</span>}
                  </td>
                  <td className="text-end text-nowrap">{money(v.total)}</td>
                  <td className="small">{v.createdBy || '-'}</td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => setViewing(v)}>View</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" disabled={locked(v)}
                      title={locked(v) ? 'A reversed voucher or a reversal can\'t be edited' : undefined} onClick={() => openEdit(v)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-outline-warning me-1" disabled={locked(v)}
                      title={v.reversedByReference ? `Already reversed by ${v.reversedByReference}` : v.reversalOfReference ? 'A reversal can\'t be reversed' : 'Post the opposite entry'}
                      onClick={() => setReversing({ voucher: v, date: localDate(new Date()), description: '', error: '', saving: false })}>Reverse</button>
                    <button type="button" className="btn btn-sm btn-outline-dark me-1" onClick={() => printJournalVoucher(v)}>Print</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={v.reversedById != null}
                      title={v.reversedByReference ? `Delete ${v.reversedByReference} first` : undefined} onClick={() => setDeleting(v)}>Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div></div>
      {pages > 1 && <div className="card-footer d-flex justify-content-end gap-2 align-items-center">
        <button className="btn btn-sm btn-light border" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="small">Page {page} of {pages}</span>
        <button className="btn btn-sm btn-light border" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>}
      </div>

      {/* new / edit */}
      {form && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{form.id ? `Edit ${form.reference}` : 'New journal voucher'}</h4>
                <button type="button" className="btn-close" onClick={() => setForm(null)} disabled={saving} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">Choose the accounts and put each amount in Debit or Credit. Total debits must equal total credits. Stock can't be used here: its value comes from purchases and sales.</p>
                <div className="row g-3 mb-3">
                  <div className="col-md-3">
                    <label className="form-label mb-1">Date</label>
                    <input type="date" className="form-control" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="col-md-9">
                    <label className="form-label mb-1">Description</label>
                    <input className="form-control" maxLength={300} placeholder="e.g. Reclass rent wrongly posted to Office expenses" value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus />
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="thead-light"><tr>
                      <th style={{ width: 32 }}>#</th><th style={{ minWidth: 240 }}>Account</th><th style={{ minWidth: 190 }}>Customer / supplier / lender</th>
                      <th style={{ width: 140 }} className="text-end">Debit</th><th style={{ width: 140 }} className="text-end">Credit</th><th style={{ minWidth: 160 }}>Note</th><th style={{ width: 40 }} />
                    </tr></thead>
                    <tbody>
                      {form.lines.map((l, i) => (
                        <tr key={l.key}>
                          <td className="text-muted">{i + 1}</td>
                          <td>
                            <select className="form-select form-select-sm" value={l.accountId}
                              onChange={(e) => setLine(l.key, { accountId: e.target.value, partyId: '', partyName: '' })}>
                              <option value="">Choose an account...</option>
                              {grouped.map((g) => (
                                <optgroup key={g.root} label={ROOT_LABEL[g.root]}>
                                  {g.list.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                          <td>{partyCell(l)}</td>
                          <td><input type="number" min={0} step="0.01" className="form-control form-control-sm text-end" value={l.debit} onKeyDown={noSigns}
                            onChange={(e) => setLine(l.key, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} /></td>
                          <td><input type="number" min={0} step="0.01" className="form-control form-control-sm text-end" value={l.credit} onKeyDown={noSigns}
                            onChange={(e) => setLine(l.key, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} /></td>
                          <td><input className="form-control form-control-sm" maxLength={300} value={l.note} onChange={(e) => setLine(l.key, { note: e.target.value })} /></td>
                          <td><button type="button" className="btn btn-sm btn-link text-danger p-0" title="Remove line" disabled={form.lines.length <= 2}
                            onClick={() => removeLine(l.key)}><i className="ti ti-x" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}><button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}><i className="ti ti-plus me-1" />Add line</button></td>
                        <th className="text-end">{money(totals.debit)}</th>
                        <th className="text-end">{money(totals.credit)}</th>
                        <td colSpan={2} className={totals.balanced ? 'text-success small' : 'text-danger small'}>
                          {totals.balanced ? <><i className="ti ti-check me-1" />Balanced</> : totals.debit === 0 && totals.credit === 0 ? 'Enter the amounts' : `Difference ${money(Math.abs(totals.difference))}`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !totals.balanced}
                  title={totals.balanced ? undefined : 'Total debits must equal total credits'}>{saving ? 'Saving...' : 'Save & Post'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* view */}
      {viewing && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{viewing.reference} <small className="text-muted fs-14">{showDate(viewing.date)}</small></h4>
                <button type="button" className="btn-close" onClick={() => setViewing(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-1">{viewing.description}</p>
                <p className="small text-muted">
                  Created by {viewing.createdBy || '-'}
                  {viewing.reversalOfReference && <> · reversal of <b>{viewing.reversalOfReference}</b></>}
                  {viewing.reversedByReference && <> · reversed by <b>{viewing.reversedByReference}</b></>}
                </p>
                <table className="table table-sm mb-0">
                  <thead className="thead-light"><tr><th>Account</th><th>Party / note</th><th className="text-end">Debit</th><th className="text-end">Credit</th></tr></thead>
                  <tbody>
                    {viewing.lines.map((l) => (
                      <tr key={l.id}>
                        <td style={{ paddingLeft: l.credit ? 32 : 8 }}><span className="text-muted me-1">{l.code}</span>{l.account}</td>
                        <td className="small text-muted">{[l.partyName, l.note].filter(Boolean).join(' · ')}</td>
                        <td className="text-end">{amount(l.debit)}</td>
                        <td className="text-end">{amount(l.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th colSpan={2} className="text-end">Total</th><th className="text-end">{money(viewing.total)}</th><th className="text-end">{money(viewing.total)}</th></tr></tfoot>
                </table>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-dark" onClick={() => printJournalVoucher(viewing)}>Print</button>
                <button type="button" className="btn btn-secondary" onClick={() => setViewing(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* reverse */}
      {reversing && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Reverse {reversing.voucher.reference}</h4>
                <button type="button" className="btn-close" onClick={() => setReversing(null)} disabled={reversing.saving} />
              </div>
              <div className="modal-body">
                <p className="text-muted small">This posts a new voucher with the same lines, debit and credit swapped, so {reversing.voucher.reference} no longer counts from that date on. The original stays in the books for the record.</p>
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label mb-1">Reversal date</label>
                    <input type="date" className="form-control" min={reversing.voucher.date.slice(0, 10)} value={reversing.date}
                      onChange={(e) => setReversing({ ...reversing, date: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label mb-1">Description <small className="text-muted">(optional)</small></label>
                    <input className="form-control" maxLength={300} placeholder={`Reversal of ${reversing.voucher.reference}`} value={reversing.description}
                      onChange={(e) => setReversing({ ...reversing, description: e.target.value })} />
                  </div>
                </div>
                {reversing.error && <div className="alert alert-danger py-2 mt-3 mb-0">{reversing.error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReversing(null)} disabled={reversing.saving}>Cancel</button>
                <button type="button" className="btn btn-warning" onClick={reverse} disabled={reversing.saving || !reversing.date}>{reversing.saving ? 'Reversing...' : 'Reverse'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={deleting != null} onClose={() => setDeleting(null)} onConfirm={confirmDelete}
        title={deleting ? `Delete ${deleting.reference}?` : undefined}
        message="The voucher and its entry are removed from the books. To keep a record instead, use Reverse." />
    </>
  );
};

export default JournalVouchers;
