import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, GlBalances as Data, JournalEntryRow, LedgerAccount, LedgerRow, MONTHS, ROOT_LABEL, RootType, VOUCHER_LABEL, amount, errorText, localDate, showDate } from '../../services/ACCT/accountingService';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc } from '../../utils/printDocument';
import { formatTbValue } from '../../utils/trialBalanceLayouts';

const ROOTS: RootType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const signed = (v: number) => formatTbValue(v, 'signed') || '0.00';
const monthLabel = (iso: string) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00'); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
/** "2026" for a year starting in January, else "2025-26" */
const yearLabel = (year: number, startMonth: number) => (startMonth === 1 ? String(year) : `${year}-${String((year + 1) % 100).padStart(2, '0')}`);

type Posting = LedgerRow & { account: string };
/** a click that is the second half of a double-click does nothing (a double-click opens, it doesn't open and close) */
const firstClick = (e: React.MouseEvent) => e.detail <= 1;

/**
 * The postings (vouchers) on the chosen accounts between two dates, with their count and totals. A posting opens its
 * whole voucher: every debit and credit line of that entry, on every account.
 */
const Postings: React.FC<{ accounts: Data['accounts']; from?: string; to: string; title: string }> = ({ accounts, from, to, title }) => {
  const [rows, setRows] = useState<Posting[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [vouchers, setVouchers] = useState<Record<number, JournalEntryRow | string>>({});

  useEffect(() => {
    let live = true;
    setRows(null); setError('');
    Promise.all(accounts.map((a) => svc.ledger(a.id, { from, to }).then((d) => d.rows.map((r) => ({ ...r, account: `${a.code} ${a.name}` })))))
      .then((lists) => { if (live) setRows(lists.flat().sort((x, y) => x.date.localeCompare(y.date) || x.entryId - y.entryId)); })
      .catch((e) => { if (live) setError(errorText(e, 'Could not load the postings.')); });
    return () => { live = false; };
  }, [accounts, from, to]);

  const toggle = (entryId: number) => {
    if (open === entryId) { setOpen(null); return; }
    setOpen(entryId);
    if (!vouchers[entryId]) svc.entry(entryId)
      .then((v) => setVouchers((m) => ({ ...m, [entryId]: v })))
      .catch((e) => setVouchers((m) => ({ ...m, [entryId]: errorText(e, 'Could not load the voucher.') })));
  };

  if (error) return <div className="text-danger small p-2">{error}</div>;
  if (!rows) return <div className="text-muted small p-2">Loading the postings...</div>;
  const count = new Set(rows.map((r) => r.entryId)).size;
  const many = accounts.length > 1;
  const debit = rows.reduce((s, r) => s + r.debit, 0), credit = rows.reduce((s, r) => s + r.credit, 0);
  return (
    <div className="gl-postings p-2">
      <div className="small fw-semibold mb-1">{title}: {count} voucher{count === 1 ? '' : 's'} posted
        {count > 0 && <span className="text-muted fw-normal"> - click a voucher to see all its lines</span>}</div>
      {rows.length > 0 && (
        <table className="table table-sm table-bordered mb-0 bg-white">
          <thead><tr>
            <th style={{ width: 95 }}>Date</th><th>Voucher</th><th>Description</th><th>Party / note</th>{many && <th>Account</th>}
            <th className="text-end">Debit</th><th className="text-end">Credit</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const v = vouchers[r.entryId];
              return (
                <React.Fragment key={`${r.entryId}-${i}`}>
                  <tr className="gl-posting" style={{ cursor: 'pointer' }} onClick={(e) => firstClick(e) && toggle(r.entryId)}>
                    <td className="text-nowrap">{showDate(r.date)}</td>
                    <td className="text-nowrap"><i className={`ti ti-chevron-${open === r.entryId ? 'down' : 'right'} me-1`} />
                      <span className="badge bg-light text-dark border me-1">{VOUCHER_LABEL[r.voucherType] || r.voucherType}</span>{r.reference}</td>
                    <td className="small">{r.description}</td>
                    <td className="small text-muted">{[r.partyName, r.note].filter(Boolean).join(' · ')}</td>
                    {many && <td className="small">{r.account}</td>}
                    <td className="text-end">{amount(r.debit)}</td><td className="text-end">{amount(r.credit)}</td>
                  </tr>
                  {open === r.entryId && (
                    <tr><td colSpan={many ? 7 : 6} className="bg-light">
                      {!v ? <span className="small text-muted">Loading the voucher...</span>
                        : typeof v === 'string' ? <span className="small text-danger">{v}</span>
                        : (
                          <div className="gl-voucher">
                            <div className="small mb-1"><b>{VOUCHER_LABEL[v.voucherType] || v.voucherType} {v.reference}</b> - {showDate(v.date)}
                              {v.description && <span className="text-muted"> - {v.description}</span>}</div>
                            <table className="table table-sm mb-0">
                              <thead><tr><th>Account</th><th>Party / note</th><th className="text-end">Debit</th><th className="text-end">Credit</th></tr></thead>
                              <tbody>{v.lines.map((l, j) => (
                                <tr key={j}><td><span className="text-muted me-1">{l.code}</span>{l.account}</td>
                                  <td className="small text-muted">{[l.partyName, l.note].filter(Boolean).join(' · ')}</td>
                                  <td className="text-end">{amount(l.debit)}</td><td className="text-end">{amount(l.credit)}</td></tr>
                              ))}</tbody>
                              <tfoot><tr><th colSpan={2}>Total</th>
                                <th className="text-end">{amount(v.lines.reduce((s, l) => s + l.debit, 0))}</th>
                                <th className="text-end">{amount(v.lines.reduce((s, l) => s + l.credit, 0))}</th></tr></tfoot>
                            </table>
                          </div>
                        )}
                    </td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr><th colSpan={many ? 5 : 4}>Total of these postings</th><th className="text-end">{amount(debit)}</th><th className="text-end">{amount(credit)}</th></tr></tfoot>
        </table>
      )}
    </div>
  );
};

/** the day before an ISO date (yyyy-mm-dd) */
const dayBefore = (iso: string) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00'); d.setDate(d.getDate() - 1); return localDate(d); };

/**
 * Accounting > GL Balances: one or more accounts by month for a financial year - balance carried forward, each month's
 * debits, credits and balance, and the cumulative balance (balance display). Clicking a month (the carried-forward line,
 * the year's total) opens its postings right there, and a posting opens its whole voucher. Double-clicking an account
 * on the left shows that account alone.
 */
const GlBalances: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [startMonth, setStartMonth] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  // the line whose postings are open: 'cf' (carried forward), a period number, or 'year'
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setExpanded(null), [data]);
  const expand = (key: string) => setExpanded((k) => (k === key ? null : key));

  const selected = useMemo(() => (params.get('accounts') || '').split(',').map(Number).filter((n) => n > 0), [params]);
  const thisYear = (() => { const d = new Date(); return d.getMonth() + 1 >= startMonth ? d.getFullYear() : d.getFullYear() - 1; })();
  const year = Number(params.get('year')) || thisYear;
  const update = (ids: number[], y = year) => setParams({ ...(ids.length ? { accounts: ids.join(',') } : {}), year: String(y) }, { replace: true });

  useEffect(() => {
    svc.accounts().then(setAccounts).catch((e) => setError(errorText(e, 'Could not load the accounts.')));
    svc.settings().then((s) => setStartMonth(s.fiscalYearStartMonth || 1)).catch(() => { /* January */ });
  }, []);

  useEffect(() => {
    if (selected.length === 0) { setData(null); return; }
    const t = setTimeout(() => svc.glBalances(selected, year).then((d) => { setData(d); setError(''); })
      .catch((e) => setError(errorText(e, 'Could not load the balances.'))), 200);
    return () => clearTimeout(t);
  }, [selected, year]);

  const postable = accounts.filter((a) => !a.isGroup);
  const shown = postable.filter((a) => !search || `${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: number) => update(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const years = Array.from({ length: 8 }, (_, i) => thisYear + 1 - i);

  const names = data ? data.accounts.map((a) => `${a.code} ${a.name}`).join(', ') : '';
  const title = `GL Balances ${yearLabel(year, startMonth)}`;
  const tableRows = (d: Data): (string | number)[][] => [
    ['', 'Balance carried forward', '', '', '', d.carryforward],
    ...d.periods.map((p) => [p.period, monthLabel(p.from), p.debit, p.credit, p.balance, p.cumulative]),
    ['', 'Total', d.totals.debit, d.totals.credit, d.totals.balance, d.totals.closing],
  ];
  const COLUMNS = ['Period', 'Month', 'Debit', 'Credit', 'Balance (Dr + / Cr -)', 'Cum. balance (Dr + / Cr -)'];
  const print = () => {
    if (!data) return;
    const row = (r: (string | number)[], tag = 'td') => `<tr>${r.map((v, i) => `<${tag}${i > 1 ? ' class="r"' : ''}>${esc(typeof v === 'number' && i > 1
      ? (i >= 4 ? formatTbValue(v, 'signed') : amount(v)) : String(v))}</${tag}>`).join('')}</tr>`;
    const rows = tableRows(data);
    printDocument(title, 'GL BALANCES', `${names} - financial year ${yearLabel(year, startMonth)}`, `
      <table><thead><tr>${['Period', 'Month', 'Debit', 'Credit', 'Balance', 'Cum. balance'].map((h, i) => `<th${i > 1 ? ' class="r"' : ''}>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, -1).map((r) => row(r)).join('')}</tbody><tfoot>${row(rows[rows.length - 1], 'th').replace('<tr>', '<tr class="total">')}</tfoot></table>`);
  };

  return (
    <>
      <PageHeader title="GL Balances" subtitle="Debit, credit and balance of one or more accounts, month by month" breadcrumbs={[{ title: 'Accounting' }]} />
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card mb-0 h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="mb-0">Accounts <span className="text-muted small">({selected.length} chosen)</span></h6>
              {selected.length > 0 && <button className="btn btn-sm btn-link p-0" onClick={() => update([])}>Clear</button>}
            </div>
            <div className="card-body">
              <input className="form-control form-control-sm mb-2" placeholder="Search code or name" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {ROOTS.map((root) => {
                  const list = shown.filter((a) => a.rootType === root);
                  if (list.length === 0) return null;
                  return (
                    <div key={root} className="mb-2">
                      <div className="small text-uppercase text-muted fw-semibold mb-1">{ROOT_LABEL[root]}</div>
                      {list.map((a) => (
                        <div key={a.id} className="form-check">
                          <input id={`gl-${a.id}`} type="checkbox" className="form-check-input" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                          <label htmlFor={`gl-${a.id}`} className="form-check-label small" title="Double-click to show this account alone"
                            onDoubleClick={() => update([a.id])}><span className="text-muted me-1">{a.code}</span>{a.name}</label>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card mb-3"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
            <label className="mb-0">Financial year</label>
            <select className="form-select" style={{ width: 140 }} value={year} onChange={(e) => update(selected, Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{yearLabel(y, startMonth)}</option>)}
            </select>
            {data && <span className="small text-muted">{monthLabel(data.fiscalYearStart)} to {monthLabel(data.fiscalYearEnd)}</span>}
            <div className="ms-auto d-flex gap-2">
              <button className="btn btn-sm btn-success" disabled={!data} onClick={() => data && exportToExcel(COLUMNS, tableRows(data), `gl-balances-${year}`, 'GL Balances')}><i className="ti ti-file-spreadsheet me-1" />Excel</button>
              <button className="btn btn-sm btn-danger" disabled={!data} onClick={() => data && exportToPDF(COLUMNS, tableRows(data), `gl-balances-${year}`, `${title} - ${names}`)}><i className="ti ti-file-type-pdf me-1" />PDF</button>
              <button className="btn btn-sm btn-dark" disabled={!data} onClick={print}><i className="ti ti-printer me-1" />Print</button>
            </div>
          </div></div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {selected.length === 0 ? (
            <div className="card"><div className="card-body text-center text-muted py-5">Choose one or more accounts on the left. Several accounts are added together.</div></div>
          ) : data && (
            <div className="card"><div className="card-body p-0"><div className="table-responsive">
              {data.accounts.length > 1 && <div className="px-3 pt-2 small text-muted">Added together: {names}</div>}
              <table className="table table-sm table-hover align-middle mb-0 gl-balances">
                <thead className="thead-light"><tr>
                  <th style={{ width: 70 }}>Period</th><th>Month</th><th className="text-end">Debit</th><th className="text-end">Credit</th>
                  <th className="text-end">Balance</th><th className="text-end">Cum. balance</th>
                </tr></thead>
                <tbody>
                  {(() => {
                    const yearStart = data.fiscalYearStart.slice(0, 10);
                    const canOpen = data.carryforward !== 0;
                    return (
                      <>
                        <tr className={`table-light${canOpen ? ' gl-open' : ''}`} style={canOpen ? { cursor: 'pointer' } : undefined}
                          onClick={(e) => canOpen && firstClick(e) && expand('cf')}>
                          <td>{canOpen && <i className={`ti ti-chevron-${expanded === 'cf' ? 'down' : 'right'}`} />}</td>
                          <td className="fw-semibold">Balance carried forward</td><td /><td /><td />
                          <td className="text-end fw-semibold text-nowrap">{signed(data.carryforward)}</td>
                        </tr>
                        {expanded === 'cf' && <tr><td colSpan={6} className="p-0">
                          <Postings accounts={data.accounts} to={dayBefore(yearStart)} title={`Before ${monthLabel(data.fiscalYearStart)}`} /></td></tr>}
                      </>
                    );
                  })()}
                  {data.periods.map((p) => {
                    const from = p.from.slice(0, 10), to = p.to.slice(0, 10);
                    const future = from > localDate(new Date());
                    const canOpen = !!(p.debit || p.credit);
                    const key = String(p.period);
                    return (
                      <React.Fragment key={p.period}>
                        <tr className={`${future ? 'text-muted' : ''}${canOpen ? ' gl-open' : ''}${expanded === key ? ' table-active' : ''}`}
                          style={canOpen ? { cursor: 'pointer' } : undefined} title={canOpen ? 'Click to see the vouchers posted this month' : undefined}
                          onClick={(e) => canOpen && firstClick(e) && expand(key)}>
                          <td>{p.period}{canOpen && <i className={`ti ti-chevron-${expanded === key ? 'down' : 'right'} ms-1`} />}</td>
                          <td>{monthLabel(p.from)}
                            {/* one detail button per account: its own ledger for this month (filter, Excel, PDF) */}
                            {canOpen && data.accounts.map((a) => (
                              <Link key={a.id} to={`/account-ledger/${a.id}?from=${from}&to=${to}`} className="ms-2 small text-nowrap gl-ledger-link"
                                title={`Open ${a.code} ${a.name} in the account ledger (filter, Excel, PDF)`} onClick={(e) => e.stopPropagation()}>
                                <i className="ti ti-external-link" />{data.accounts.length > 1 && <span className="ms-1">{a.code}</span>}
                              </Link>
                            ))}</td>
                          <td className="text-end">{amount(p.debit)}</td>
                          <td className="text-end">{amount(p.credit)}</td>
                          <td className="text-end text-nowrap">{formatTbValue(p.balance, 'signed')}</td>
                          <td className="text-end text-nowrap fw-semibold">{future && !p.debit && !p.credit ? '' : signed(p.cumulative)}</td>
                        </tr>
                        {expanded === key && <tr><td colSpan={6} className="p-0">
                          <Postings accounts={data.accounts} from={from} to={to} title={monthLabel(p.from)} /></td></tr>}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-primary gl-open" style={{ cursor: data.totals.debit || data.totals.credit ? 'pointer' : undefined }}
                    title="Click to see every voucher of the year" onClick={(e) => (data.totals.debit || data.totals.credit) && firstClick(e) && expand('year')}>
                    <th colSpan={2}>Total{(data.totals.debit || data.totals.credit) ? <i className={`ti ti-chevron-${expanded === 'year' ? 'down' : 'right'} ms-1`} /> : null}</th>
                    <th className="text-end">{amount(data.totals.debit) || '0.00'}</th><th className="text-end">{amount(data.totals.credit) || '0.00'}</th>
                    <th className="text-end text-nowrap">{signed(data.totals.balance)}</th><th className="text-end text-nowrap">{signed(data.totals.closing)}</th>
                  </tr>
                  {expanded === 'year' && <tr><td colSpan={6} className="p-0">
                    <Postings accounts={data.accounts} from={data.fiscalYearStart.slice(0, 10)} to={data.fiscalYearEnd.slice(0, 10)} title={`Financial year ${yearLabel(year, startMonth)}`} /></td></tr>}
                </tfoot>
              </table>
              <div className="px-3 py-2 small text-muted">Click a month (or the carried-forward line, or the total) to see the vouchers posted; click a voucher to see all its lines.</div>
            </div></div></div>
          )}
        </div>
      </div>
    </>
  );
};

export default GlBalances;
