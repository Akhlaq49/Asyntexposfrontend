import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, LedgerCheck, VOUCHER_LABEL, showDate, errorText } from '../../services/accountingService';

/**
 * Accounting > Settings: the lock date (nothing dated on or before it can be added, changed or deleted), the health
 * of the ledger (unbalanced entries, posting errors) and products whose quantity was changed without a document.
 */
const AccountingSettings: React.FC = () => {
  const [data, setData] = useState<LedgerCheck | null>(null);
  const [lockDate, setLockDate] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const show = (d: LedgerCheck) => { setData(d); setLockDate(d.lockDate ? d.lockDate.slice(0, 10) : ''); };
  useEffect(() => { svc.settings().then(show).catch((e) => setError(errorText(e, 'Could not load the settings.'))); }, []);

  const save = async (value: string | null) => {
    try { show(await svc.saveSettings(value)); setMsg(value ? `Locked up to ${showDate(value)}.` : 'Nothing is locked.'); setError(''); }
    catch (e) { setError(errorText(e, 'Could not save the lock date.')); }
  };
  const rebuild = async () => {
    setBusy(true);
    try { show(await svc.rebuild()); setMsg('The ledger was rebuilt from the documents.'); setError(''); }
    catch (e) { setError(errorText(e, 'Could not rebuild the ledger.')); }
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="Accounting Settings" subtitle="Lock date and the health of the books" breadcrumbs={[{ title: 'Accounting' }]} />
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {data && (
        <div className="row g-3">
          <div className="col-lg-6"><div className="card h-100">
            <div className="card-header"><h5 className="mb-0">Lock date</h5></div>
            <div className="card-body">
              <p className="text-muted small">Once a period is checked (for example a month or year is finished), lock it: sales, purchases, payments,
                returns and expenses dated on or before the lock date can no longer be added, changed or deleted.</p>
              <div className="d-flex gap-2 align-items-center">
                <input type="date" className="form-control lock-date" style={{ width: 180 }} value={lockDate} onChange={(e) => setLockDate(e.target.value)} />
                <button className="btn btn-primary lock-save" disabled={!lockDate} onClick={() => save(lockDate)}>Lock</button>
                {data.lockDate && <button className="btn btn-light border lock-clear" onClick={() => save(null)}>Unlock</button>}
              </div>
              <div className="mt-2 small">{data.lockDate ? <>Locked up to <b>{showDate(data.lockDate)}</b>.</> : 'Nothing is locked.'}</div>
            </div>
          </div></div>
          <div className="col-lg-6"><div className="card h-100">
            <div className="card-header"><h5 className="mb-0">Health of the books</h5></div>
            <div className="card-body">
              <ul className="list-unstyled mb-3">
                <li><i className="ti ti-file-text me-1" />{data.entries} journal entr{data.entries === 1 ? 'y' : 'ies'}, built {data.rebuiltAt ? showDate(data.rebuiltAt) : 'never'}</li>
                <li className={data.unbalanced.length ? 'text-danger' : 'text-success'}>
                  <i className={`ti ${data.unbalanced.length ? 'ti-alert-triangle' : 'ti-circle-check'} me-1`} />
                  {data.unbalanced.length ? `${data.unbalanced.length} entries don't balance` : 'Every entry balances (debits = credits)'}</li>
                {data.lastError && <li className="text-danger"><i className="ti ti-alert-triangle me-1" />Last posting error: {data.lastError}</li>}
              </ul>
              {data.unbalanced.map((u) => <div key={u.id} className="small text-danger">{VOUCHER_LABEL[u.voucherType] || u.voucherType} {u.reference}</div>)}
              <button className="btn btn-outline-primary rebuild-btn" disabled={busy} onClick={rebuild}>{busy ? 'Rebuilding...' : 'Rebuild the ledger from the documents'}</button>
              <div className="small text-muted mt-2">Posts every document again. Safe at any time; the lock date is not checked.</div>
            </div>
          </div></div>
          <div className="col-12"><div className="card">
            <div className="card-header"><h5 className="mb-0">Stock changed without a document ({data.stockMismatches.length})</h5>
              <small className="text-muted">The quantity on these products was changed directly, so the books can't see the change. Record the difference as a stock entry (or a purchase), so the books match.</small></div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0 stock-mismatch">
                <thead className="thead-light"><tr><th>Product</th><th className="text-end">Quantity</th><th className="text-end">From documents</th><th className="text-end">Difference</th></tr></thead>
                <tbody>
                  {data.stockMismatches.length === 0 ? <tr><td colSpan={4} className="text-center text-muted py-3">Every product's quantity matches its documents.</td></tr>
                    : data.stockMismatches.map((m) => (
                      <tr key={m.productId}><td>{m.productName} <small className="text-muted">{m.sku}</small></td><td className="text-end">{m.quantity}</td>
                        <td className="text-end">{m.fromMovements}</td><td className="text-end fw-semibold">{m.difference > 0 ? '+' : ''}{m.difference}</td></tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div></div>
        </div>
      )}
    </>
  );
};

export default AccountingSettings;
