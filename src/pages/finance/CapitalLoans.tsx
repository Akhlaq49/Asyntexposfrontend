import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import { PAYMENT_METHODS } from '../../services/purchaseOrderService';

interface Entry { id: number; type: string; typeLabel: string; direction?: 'In' | 'Out' | null; name: string; amount: number; method: string; date: string; reference?: string | null; notes?: string | null; createdBy?: string | null }
interface Balance { name: string; balance: number }
interface Asset { name: string; cost: number; bookValue: number }

const TYPES: { type: string; label: string; help: string; nameLabel: string; namePlaceholder: string; cls: string }[] = [
  { type: 'OwnerInvestment', label: 'Owner investment', help: 'Money the owner puts into the business (also the starting cash).', nameLabel: 'Owner', namePlaceholder: 'e.g. Owner name', cls: 'success' },
  { type: 'OwnerDrawing', label: 'Owner drawing', help: 'Money the owner takes out for personal use.', nameLabel: 'Owner', namePlaceholder: 'e.g. Owner name', cls: 'warning' },
  { type: 'LoanReceived', label: 'Loan received', help: 'Money borrowed from a bank or a person.', nameLabel: 'Lender', namePlaceholder: 'e.g. Meezan Bank', cls: 'info' },
  { type: 'LoanRepayment', label: 'Loan repayment', help: 'Paying back part of a loan.', nameLabel: 'Lender', namePlaceholder: 'Choose the loan', cls: 'secondary' },
  { type: 'AssetPurchase', label: 'Fixed asset purchase', help: 'Furniture, equipment, computers, vehicles ... bought for the business (not for resale).', nameLabel: 'Asset', namePlaceholder: 'e.g. Shop furniture', cls: 'primary' },
  { type: 'Depreciation', label: 'Depreciation', help: 'Value a fixed asset has lost through use and age (no money moves).', nameLabel: 'Asset', namePlaceholder: 'Choose the asset', cls: 'dark' },
];
const meta = (t: string) => TYPES.find((x) => x.type === t) || TYPES[0];
const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const showDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Finance > Capital & Loans: the owner's capital and drawings, loans and fixed assets (used by the Balance Sheet) */
const CapitalLoans: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loans, setLoans] = useState<Balance[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState<{ type: string; name: string; amount: string; method: string; date: string; reference: string; notes: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = (await api.get<{ entries: Entry[]; loans: Balance[]; assets: Asset[] }>('/finance-entries')).data;
      setEntries(r.entries); setLoans(r.loans); setAssets(r.assets);
    } catch { setError('Could not load the entries.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const sum = (t: string) => entries.filter((e) => e.type === t).reduce((s, e) => s + e.amount, 0);
    return {
      capital: sum('OwnerInvestment') - sum('OwnerDrawing'),
      loans: loans.reduce((s, l) => s + l.balance, 0),
      assets: assets.reduce((s, a) => s + a.bookValue, 0),
    };
  }, [entries, loans, assets]);

  const openNew = (type: string) => { setForm({ type, name: '', amount: '', method: 'Cash', date: localDate(), reference: '', notes: '' }); setFormError(''); };
  const suggestions = form ? (form.type.startsWith('Loan') ? loans.filter((l) => form.type === 'LoanReceived' || l.balance > 0).map((l) => ({ name: l.name, info: `owed ${money(l.balance)}` }))
    : form.type === 'AssetPurchase' || form.type === 'Depreciation' ? assets.filter((a) => form.type === 'AssetPurchase' || a.bookValue > 0).map((a) => ({ name: a.name, info: `worth ${money(a.bookValue)}` }))
    : Array.from(new Set(entries.filter((e) => e.type.startsWith('Owner')).map((e) => e.name))).map((n) => ({ name: n, info: '' }))) : [];

  const save = async () => {
    if (!form) return;
    setFormError('');
    const amount = Number(form.amount) || 0;
    if (!form.name.trim()) { setFormError(`Enter the ${meta(form.type).nameLabel.toLowerCase()}.`); return; }
    if (amount <= 0) { setFormError('Enter an amount greater than 0.'); return; }
    setSaving(true);
    try {
      await api.post('/finance-entries', { ...form, amount });
      setNotice(`${meta(form.type).label} of ${money(amount)} recorded (${form.name.trim()}).`);
      setForm(null); await load();
    } catch (e: any) { setFormError(e?.response?.data?.message || 'Could not save.'); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    try { await api.delete(`/finance-entries/${deleteId}`); setNotice('Entry deleted.'); await load(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Could not delete.'); }
    setDeleteId(null);
  };

  const shown = entries.filter((e) => !typeFilter || e.type === typeFilter);
  const m = form ? meta(form.type) : null;

  return (
    <>
      <PageHeader title="Capital & Loans" subtitle="Owner's capital and drawings, loans and fixed assets - shown on the Balance Sheet" breadcrumbs={[{ title: 'Finance' }]} />
      {notice && <div className="alert alert-success py-2 d-flex justify-content-between">{notice}<button type="button" className="btn-close" onClick={() => setNotice('')} /></div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3 mb-3">
        {[
          { label: "Owner's capital (net of drawings)", value: totals.capital, cls: 'success', icon: 'ti-user-dollar' },
          { label: 'Loans outstanding', value: totals.loans, cls: 'danger', icon: 'ti-building-bank' },
          { label: 'Fixed assets (book value)', value: totals.assets, cls: 'primary', icon: 'ti-armchair' },
        ].map((c) => (
          <div className="col-md-4" key={c.label}>
            <div className="card mb-0"><div className="card-body d-flex align-items-center">
              <span className={`avatar avatar-lg bg-${c.cls}-transparent text-${c.cls} me-3`}><i className={`ti ${c.icon}`} style={{ fontSize: 22 }} /></span>
              <div><p className="mb-1 text-muted">{c.label}</p><h5 className="mb-0">{money(c.value)}</h5></div>
            </div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <p className="mb-2 fw-medium">Record</p>
          <div className="d-flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.type} type="button" className={`btn btn-outline-${t.cls}`} title={t.help} onClick={() => openNew(t.type)}>
                <i className="ti ti-plus me-1" />{t.label}
              </button>
            ))}
            <Link to="/balance-sheet" className="btn btn-link ms-auto"><i className="ti ti-scale me-1" />View Balance Sheet</Link>
          </div>
        </div>
      </div>

      {(loans.length > 0 || assets.length > 0) && (
        <div className="row g-3 mb-3">
          {loans.length > 0 && (
            <div className="col-md-6"><div className="card h-100 mb-0"><div className="card-header"><h6 className="mb-0">Loans</h6></div>
              <div className="card-body p-0"><table className="table table-sm mb-0"><tbody>
                {loans.map((l) => <tr key={l.name}><td className="ps-3">{l.name}</td><td className="text-end pe-3">{l.balance > 0 ? money(l.balance) : <span className="badge bg-success">Repaid</span>}</td></tr>)}
              </tbody></table></div></div></div>
          )}
          {assets.length > 0 && (
            <div className="col-md-6"><div className="card h-100 mb-0"><div className="card-header"><h6 className="mb-0">Fixed assets</h6></div>
              <div className="card-body p-0"><table className="table table-sm mb-0"><thead><tr><th className="ps-3">Asset</th><th className="text-end">Cost</th><th className="text-end pe-3">Book value</th></tr></thead><tbody>
                {assets.map((a) => <tr key={a.name}><td className="ps-3">{a.name}</td><td className="text-end">{money(a.cost)}</td><td className="text-end pe-3">{money(a.bookValue)}</td></tr>)}
              </tbody></table></div></div></div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="mb-0">All entries</h6>
          <select className="form-select" style={{ width: 220 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="thead-light"><tr><th>Date</th><th>Type</th><th>Owner / lender / asset</th><th>Method</th><th>Reference</th><th className="text-end">Amount</th><th>Notes</th><th /></tr></thead>
                <tbody>
                  {shown.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-5">Nothing recorded yet. Start with the owner's investment (the money the business started with).</td></tr>
                  ) : shown.map((e) => (
                    <tr key={e.id}>
                      <td className="text-nowrap">{showDate(e.date)}</td>
                      <td><span className={`badge bg-${meta(e.type).cls}`}>{e.typeLabel}</span></td>
                      <td>{e.name}</td>
                      <td>{e.type === 'Depreciation' ? '-' : e.method}</td>
                      <td>{e.reference || '-'}</td>
                      <td className={`text-end text-nowrap fw-semibold ${e.direction === 'In' ? 'text-success' : e.direction === 'Out' ? 'text-danger' : ''}`}>
                        {e.direction === 'Out' ? '- ' : e.direction === 'In' ? '+ ' : ''}{money(e.amount)}
                      </td>
                      <td style={{ maxWidth: 240 }}><small>{e.notes}</small></td>
                      <td className="text-end"><a href="#" className="text-danger" title="Delete" onClick={(ev) => { ev.preventDefault(); setDeleteId(e.id); }}><i className="ti ti-trash" /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {form && m && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{m.label}</h4>
                <button type="button" className="btn-close" onClick={() => setForm(null)} disabled={saving} />
              </div>
              <div className="modal-body">
                <p className="text-muted small">{m.help}</p>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label mb-1">{m.nameLabel}</label>
                    <input className="form-control" list="finance-names" maxLength={150} placeholder={m.namePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                    <datalist id="finance-names">{suggestions.map((s) => <option key={s.name} value={s.name}>{s.info}</option>)}</datalist>
                  </div>
                  <div className="col-6">
                    <label className="form-label mb-1">Amount (Rs)</label>
                    <input type="number" min={0} step="0.01" className="form-control" value={form.amount}
                      onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="col-6">
                    <label className="form-label mb-1">Date</label>
                    <input type="date" className="form-control" max={localDate()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  {form.type !== 'Depreciation' && (
                    <div className="col-6">
                      <label className="form-label mb-1">Paid / received by</label>
                      <select className="form-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{PAYMENT_METHODS.map((x) => <option key={x}>{x}</option>)}</select>
                    </div>
                  )}
                  <div className="col-6">
                    <label className="form-label mb-1">Reference <small className="text-muted">(optional)</small></label>
                    <input className="form-control" maxLength={60} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label mb-1">Notes <small className="text-muted">(optional)</small></label>
                    <input className="form-control" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <AdminDeleteModal show={deleteId != null} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </>
  );
};

export default CapitalLoans;
