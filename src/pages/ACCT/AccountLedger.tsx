import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, AccountLedger as Data, RootType, VOUCHER_LABEL, amount, money, showDate, yearStart, localDate, errorText } from '../../services/ACCT/accountingService';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc } from '../../utils/printDocument';
import { formatTbValue } from '../../utils/trialBalanceLayouts';

/** one or more accounts' entries, ready to show: one account in its own direction (Rs ...), several added together
    as debit + / credit - (... Dr / ... Cr), like GL Balances */
interface Row { date: string; voucherType: string; reference: string | null; description: string | null; party: string; account: string; debit: number; credit: number; balance: number }
interface View { accounts: Data['account'][]; opening: number; rows: Row[]; totalDebit: number; totalCredit: number; closing: number }

const debitNormal = (root: RootType) => root === 'Asset' || root === 'Expense';

const toView = (ledgers: Data[]): View => {
  const label = (d: Data) => `${d.account.code} ${d.account.name}`;
  const party = (r: Data['rows'][number]) => [r.partyName, r.note].filter(Boolean).join(' · ');
  if (ledgers.length === 1) {
    const d = ledgers[0];
    return {
      accounts: [d.account], opening: d.opening, totalDebit: d.totalDebit, totalCredit: d.totalCredit, closing: d.closing,
      rows: d.rows.map((r) => ({ ...r, party: party(r), account: label(d) })),
    };
  }
  // several accounts: their balances in one direction (debit +), the entries in date order with one running balance
  const opening = ledgers.reduce((s, d) => s + (debitNormal(d.account.rootType) ? d.opening : -d.opening), 0);
  const merged = ledgers.flatMap((d) => d.rows.map((r) => ({ r, d })))
    .sort((x, y) => x.r.date.localeCompare(y.r.date) || x.r.entryId - y.r.entryId);
  let running = opening;
  const rows = merged.map(({ r, d }) => {
    running += r.debit - r.credit;
    return { date: r.date, voucherType: r.voucherType, reference: r.reference, description: r.description, party: party(r), account: label(d), debit: r.debit, credit: r.credit, balance: running };
  });
  return {
    accounts: ledgers.map((d) => d.account), opening, rows, closing: running,
    totalDebit: rows.reduce((s, r) => s + r.debit, 0), totalCredit: rows.reduce((s, r) => s + r.credit, 0),
  };
};

/**
 * Accounting > account ledger: the entries of one account - or of several added together (/account-ledger/12,34, from
 * GL Balances) - with a running balance; a customer / supplier statement when a party is chosen. Excel, PDF and print.
 */
const AccountLedger: React.FC = () => {
  const { id } = useParams();
  const ids = useMemo(() => [...new Set((id || '').split(',').map(Number).filter((n) => n > 0))], [id]);
  const [query, setQuery] = useSearchParams();
  const [from, setFrom] = useState(query.get('from') || yearStart());
  const [to, setTo] = useState(query.get('to') || localDate(new Date()));
  const [party, setParty] = useState(query.get('party') || '');
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setQuery(Object.fromEntries(Object.entries({ from, to, party }).filter(([, v]) => v)), { replace: true });
      Promise.all(ids.map((a) => svc.ledger(a, { from, to, party: party || undefined })))
        .then((list) => { if (live) { setView(toView(list)); setError(''); } })
        .catch((e) => { if (live) setError(errorText(e, 'Could not load the ledger.')); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [ids, from, to, party, setQuery]);

  const many = (view?.accounts.length ?? ids.length) > 1;
  /** a balance: one account in its own direction, several as ... Dr / ... Cr */
  const bal = (v: number) => (many ? formatTbValue(v, 'signed') || '0.00' : money(v));
  const names = view ? view.accounts.map((a) => `${a.code} ${a.name}`).join(', ') : '';
  const title = !view ? 'Account ledger' : many ? `${view.accounts.length} accounts` : names;
  const period = `${showDate(from)} to ${showDate(to)}${party ? ` - ${party}` : ''}`;
  const file = view ? `ledger-${view.accounts.map((a) => a.code).join('-')}-${from}-to-${to}` : 'ledger';
  const summary = view ? [{ label: many ? 'Accounts' : 'Account', value: names }, { label: 'Period', value: period }] : [];

  const columns = ['Date', 'Document', 'Description', 'Party / note', ...(many ? ['Account'] : []), 'Debit', 'Credit', many ? 'Balance (Dr + / Cr -)' : 'Balance'];
  /** the rows for Excel / PDF / print: Excel gets numbers (to add up there), the PDF and print the amounts written out */
  const exportRows = (v: View, written = false): (string | number)[][] => {
    const a = (n: number) => (written ? amount(n) : n || '');
    const b = (n: number) => (written ? bal(n) : n);
    const blank = many ? ['', '', '', '', ''] : ['', '', '', ''];
    return [
      ['', 'Opening balance', ...blank, b(v.opening)].slice(0, columns.length),
      ...v.rows.map((r) => [showDate(r.date), `${VOUCHER_LABEL[r.voucherType] || r.voucherType} ${r.reference || ''}`.trim(), r.description || '',
        r.party.replace(/ · /g, ' - '), ...(many ? [r.account] : []), a(r.debit), a(r.credit), b(r.balance)]),
      ['', 'Closing balance', '', '', ...(many ? [''] : []), a(v.totalDebit), a(v.totalCredit), b(v.closing)],
    ];
  };
  const numberFrom = columns.length - 3;      // Debit, Credit, Balance are right-aligned
  const print = () => {
    if (!view) return;
    const rows = exportRows(view, true);
    const cell = (v: string | number, i: number, tag = 'td') => `<${tag}${i >= numberFrom ? ' class="r"' : ''}>${esc(String(v))}</${tag}>`;
    const row = (r: (string | number)[], tag = 'td', cls = '') => `<tr${cls ? ` class="${cls}"` : ''}>${r.map((v, i) => cell(v, i, tag)).join('')}</tr>`;
    printDocument(`Ledger ${title}`, 'ACCOUNT LEDGER', `${names} - ${period}`, `
      <table><thead><tr>${columns.map((h, i) => `<th${i >= numberFrom ? ' class="r"' : ''}>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, -1).map((r) => row(r)).join('')}</tbody>
      <tfoot>${row(rows[rows.length - 1], 'th', 'total')}</tfoot></table>`);
  };
  const span = many ? 6 : 5;      // the columns before Balance on screen

  return (
    <>
      <PageHeader title={title} subtitle={many ? `Every entry on these accounts, added together: ${names}` : 'Every entry on this account, with the balance after each one'}
        breadcrumbs={[{ title: 'Accounting' }, { title: 'Chart of Accounts', path: '/chart-of-accounts' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">From</label><input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} />
        <input className="form-control ledger-party" style={{ width: 240 }} placeholder="Customer / supplier name (statement)" value={party} onChange={(e) => setParty(e.target.value)} />
        <div className="ms-auto d-flex gap-2">
          <button className="btn btn-sm btn-success ledger-excel" disabled={!view} onClick={() => view && exportToExcel(columns, exportRows(view), file, 'Ledger', summary)}><i className="ti ti-file-spreadsheet me-1" />Excel</button>
          <button className="btn btn-sm btn-danger ledger-pdf" disabled={!view} onClick={() => view && exportToPDF(columns, exportRows(view, true), file, `Ledger ${title}`, summary)}><i className="ti ti-file-type-pdf me-1" />PDF</button>
          <button className="btn btn-sm btn-dark ledger-print" disabled={!view} onClick={print}><i className="ti ti-printer me-1" />Print</button>
          <Link to="/chart-of-accounts" className="btn btn-sm btn-outline-secondary">All accounts</Link>
        </div>
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {view && (
        <div className="card"><div className="card-body p-0">
          <table className="table table-sm align-middle mb-0 ledger-table">
            <thead className="thead-light"><tr>
              <th style={{ width: 110 }}>Date</th><th>Document</th><th>Party / note</th>{many && <th>Account</th>}
              <th className="text-end">Debit</th><th className="text-end">Credit</th><th className="text-end">Balance</th>
            </tr></thead>
            <tbody>
              <tr className="table-light"><td colSpan={span}><b>Opening balance</b></td><td className="text-end fw-bold">{bal(view.opening)}</td></tr>
              {view.rows.length === 0 && <tr><td colSpan={span + 1} className="text-center text-muted py-3">No entries in this period.</td></tr>}
              {view.rows.map((r, i) => (
                <tr key={i}>
                  <td className="text-nowrap">{showDate(r.date)}</td>
                  <td><span className="badge bg-light text-dark border me-1">{VOUCHER_LABEL[r.voucherType] || r.voucherType}</span>{r.reference} <small className="text-muted">{r.description}</small></td>
                  <td className="small text-muted">{r.party}</td>
                  {many && <td className="small">{r.account}</td>}
                  <td className="text-end">{amount(r.debit)}</td><td className="text-end">{amount(r.credit)}</td>
                  <td className="text-end text-nowrap">{bal(r.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="table-primary">
              <th colSpan={many ? 4 : 3}>Closing balance</th><th className="text-end">{amount(view.totalDebit)}</th><th className="text-end">{amount(view.totalCredit)}</th>
              <th className="text-end text-nowrap ledger-closing">{bal(view.closing)}</th>
            </tr></tfoot>
          </table>
        </div></div>
      )}
    </>
  );
};

export default AccountLedger;
