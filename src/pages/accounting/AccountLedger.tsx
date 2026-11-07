import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, AccountLedger as Data, VOUCHER_LABEL, amount, money, showDate, yearStart, localDate, errorText } from '../../services/accountingService';

/** Accounting > account ledger: one account's entries with a running balance (a customer / supplier statement when a party is chosen) */
const AccountLedger: React.FC = () => {
  const { id } = useParams();
  const [query, setQuery] = useSearchParams();
  const [from, setFrom] = useState(query.get('from') || yearStart());
  const [to, setTo] = useState(query.get('to') || localDate(new Date()));
  const [party, setParty] = useState(query.get('party') || '');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(Object.fromEntries(Object.entries({ from, to, party }).filter(([, v]) => v)), { replace: true });
      svc.ledger(Number(id), { from, to, party: party || undefined }).then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e, 'Could not load the ledger.')));
    }, 250);
    return () => clearTimeout(t);
  }, [id, from, to, party, setQuery]);

  return (
    <>
      <PageHeader title={data ? `${data.account.code} ${data.account.name}` : 'Account ledger'} subtitle="Every entry on this account, with the balance after each one" breadcrumbs={[{ title: 'Accounting' }, { title: 'Chart of Accounts', path: '/chart-of-accounts' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">From</label><input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} />
        <input className="form-control ledger-party" style={{ width: 240 }} placeholder="Customer / supplier name (statement)" value={party} onChange={(e) => setParty(e.target.value)} />
        <Link to="/chart-of-accounts" className="btn btn-sm btn-outline-secondary ms-auto">All accounts</Link>
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {data && (
        <div className="card"><div className="card-body p-0">
          <table className="table table-sm align-middle mb-0 ledger-table">
            <thead className="thead-light"><tr><th style={{ width: 110 }}>Date</th><th>Document</th><th>Party / note</th><th className="text-end">Debit</th><th className="text-end">Credit</th><th className="text-end">Balance</th></tr></thead>
            <tbody>
              <tr className="table-light"><td colSpan={5}><b>Opening balance</b></td><td className="text-end fw-bold">{money(data.opening)}</td></tr>
              {data.rows.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-3">No entries in this period.</td></tr>}
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td className="text-nowrap">{showDate(r.date)}</td>
                  <td><span className="badge bg-light text-dark border me-1">{VOUCHER_LABEL[r.voucherType] || r.voucherType}</span>{r.reference} <small className="text-muted">{r.description}</small></td>
                  <td className="small text-muted">{[r.partyName, r.note].filter(Boolean).join(' · ')}</td>
                  <td className="text-end">{amount(r.debit)}</td><td className="text-end">{amount(r.credit)}</td>
                  <td className="text-end text-nowrap">{money(r.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="table-primary"><th colSpan={3}>Closing balance</th><th className="text-end">{amount(data.totalDebit)}</th><th className="text-end">{amount(data.totalCredit)}</th><th className="text-end text-nowrap ledger-closing">{money(data.closing)}</th></tr></tfoot>
          </table>
        </div></div>
      )}
    </>
  );
};

export default AccountLedger;
