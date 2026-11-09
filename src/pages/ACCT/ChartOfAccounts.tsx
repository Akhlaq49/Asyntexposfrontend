import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, LedgerAccount, ROOT_LABEL, RootType, money, errorText } from '../../services/ACCT/accountingService';

/** an account no posting rule uses: added by the company, or one of the chart's optional accounts ("coa:") */
const optional = (key?: string | null) => !key || key.startsWith('coa:');

type Form = { id: number | null; parentId: number | null; code: string; name: string; isActive: boolean };

/**
 * Accounting > Chart of Accounts: the company's accounts as a tree (Assets, Liabilities, Equity, Income, Expenses)
 * with their balances. The accounts the posting rules use can be renamed but not deleted; a company can add its own.
 */
const ChartOfAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => { svc.accounts().then(setAccounts).catch((e) => setError(errorText(e, 'Could not load the accounts.'))); }, []);

  const save = async () => {
    if (!form) return;
    try {
      setAccounts(form.id ? await svc.updateAccount(form.id, { code: form.code, name: form.name, isActive: form.isActive })
        : await svc.addAccount({ code: form.code, name: form.name, parentId: form.parentId! }));
      setForm(null);
    } catch (e) { setFormError(errorText(e, 'Could not save the account.')); }
  };
  const remove = async (a: LedgerAccount) => {
    if (!window.confirm(`Delete the account "${a.name}"?`)) return;
    try { setAccounts(await svc.deleteAccount(a.id)); } catch (e) { setError(errorText(e, 'Could not delete the account.')); }
  };

  if (!accounts) return <><PageHeader title="Chart of Accounts" breadcrumbs={[{ title: 'Accounting' }]} />{error ? <div className="alert alert-danger">{error}</div> : <div className="text-center py-5"><div className="spinner-border text-primary" /></div>}</>;
  const children = (id: number | null) => accounts.filter((a) => a.parentId === id).sort((a, b) => a.code.localeCompare(b.code));
  const total = (a: LedgerAccount): number => a.isGroup ? children(a.id).reduce((s, c) => s + total(c), 0) : a.balance;
  const rows = (parent: number | null, depth: number): React.ReactNode[] => children(parent).flatMap((a) => [
    <tr key={a.id} className={a.isGroup ? (depth === 0 ? 'table-light fw-bold' : 'fw-semibold') : ''} data-account={a.code}>
      <td className="text-muted text-nowrap">{a.code}</td>
      <td style={{ paddingLeft: 12 + depth * 22 }}>
        {a.isGroup ? a.name : <Link to={`/account-ledger/${a.id}`}>{a.name}</Link>}
        {!a.isActive && <span className="badge bg-light text-muted border ms-2">inactive</span>}
        {!optional(a.systemKey) && !a.isGroup && <i className="ti ti-lock text-muted ms-2" title="Used by the posting rules: can be renamed, not deleted" />}
      </td>
      <td className="text-end text-nowrap">{money(total(a))}</td>
      <td className="text-end text-nowrap">
        {a.isGroup && <button type="button" className="btn btn-sm btn-outline-primary me-2 btn-action" title="Add an account here" onClick={() => { setFormError(''); setForm({ id: null, parentId: a.id, code: '', name: '', isActive: true }); }}>Add Account</button>}
        <button type="button" className="btn btn-sm btn-outline-primary me-2 btn-action" title="Rename" onClick={() => { setFormError(''); setForm({ id: a.id, parentId: a.parentId, code: a.code, name: a.name, isActive: a.isActive }); }}>Rename</button>
        {optional(a.systemKey) && !a.hasEntries && !accounts.some((c) => c.parentId === a.id) && <button type="button" className="btn btn-sm btn-outline-danger btn-action" title="Delete" onClick={() => remove(a)}>Delete</button>}
      </td>
    </tr>,
    ...rows(a.id, depth + 1),
  ]);

  return (
    <>
      <PageHeader title="Chart of Accounts" subtitle="Every account the books use, with its balance today" breadcrumbs={[{ title: 'Accounting' }]} />
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="card">
        <div className="card-body p-0">
          <table className="table align-middle mb-0 chart-of-accounts">
            <thead className="thead-light"><tr><th style={{ width: 90 }}>Code</th><th>Account</th><th className="text-end">Balance</th><th style={{ width: 110 }}></th></tr></thead>
            <tbody>{rows(null, 0)}</tbody>
          </table>
        </div>
        <div className="card-footer small text-muted">
          Balances are in each account's normal direction: {(['Asset', 'Expense'] as RootType[]).map((r) => ROOT_LABEL[r]).join(' and ')} as debits, the others as credits.
          Accounts with <i className="ti ti-lock" /> are used by the posting rules.
        </div>
      </div>

      {form && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{form.id ? 'Edit account' : `New account under ${accounts.find((a) => a.id === form.parentId)?.name}`}</h5>
              <button type="button" className="btn-close" onClick={() => setForm(null)} /></div>
            <div className="modal-body">
              {formError && <div className="alert alert-danger py-2">{formError}</div>}
              <div className="row g-2">
                <div className="col-4"><label className="form-label">Code</label><input className="form-control account-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div className="col-8"><label className="form-label">Name</label><input className="form-control account-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              {form.id && optional(accounts.find((a) => a.id === form.id)?.systemKey) && (
                <div className="form-check mt-3"><input id="acc-active" type="checkbox" className="form-check-input" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  <label htmlFor="acc-active" className="form-check-label">Active</label></div>
              )}
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => setForm(null)}>Cancel</button><button type="button" className="btn btn-primary account-save" onClick={save}>Save</button></div>
          </div></div>
        </div>
      )}
    </>
  );
};

export default ChartOfAccounts;
