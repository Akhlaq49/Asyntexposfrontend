import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, GlBalances as Data, LedgerAccount, MONTHS, ROOT_LABEL, RootType, amount, errorText, localDate } from '../../services/ACCT/accountingService';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc } from '../../utils/printDocument';
import { formatTbValue } from '../../utils/trialBalanceLayouts';

const ROOTS: RootType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const signed = (v: number) => formatTbValue(v, 'signed') || '0.00';
const monthLabel = (iso: string) => { const d = new Date(iso.slice(0, 10) + 'T00:00:00'); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
/** "2026" for a year starting in January, else "2025-26" */
const yearLabel = (year: number, startMonth: number) => (startMonth === 1 ? String(year) : `${year}-${String((year + 1) % 100).padStart(2, '0')}`);

/**
 * Accounting > GL Balances: one or more accounts by month for a financial year - balance carried forward, each month's
 * debits, credits and balance, and the cumulative balance (balance display). A month opens its line items (the ledger).
 */
const GlBalances: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [startMonth, setStartMonth] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

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
  const single = selected.length === 1 ? selected[0] : null;
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
                          <label htmlFor={`gl-${a.id}`} className="form-check-label small"><span className="text-muted me-1">{a.code}</span>{a.name}</label>
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
                  <tr className="table-light"><td /><td className="fw-semibold">Balance carried forward</td><td /><td /><td />
                    <td className="text-end fw-semibold text-nowrap">{signed(data.carryforward)}</td></tr>
                  {data.periods.map((p) => {
                    const from = p.from.slice(0, 10), to = p.to.slice(0, 10);
                    const future = from > localDate(new Date());
                    return (
                      <tr key={p.period} className={future ? 'text-muted' : ''}>
                        <td>{p.period}</td>
                        <td>{single && (p.debit || p.credit)
                          ? <Link to={`/account-ledger/${single}?from=${from}&to=${to}`} title="Open the line items">{monthLabel(p.from)}</Link>
                          : monthLabel(p.from)}</td>
                        <td className="text-end">{amount(p.debit)}</td>
                        <td className="text-end">{amount(p.credit)}</td>
                        <td className="text-end text-nowrap">{formatTbValue(p.balance, 'signed')}</td>
                        <td className="text-end text-nowrap fw-semibold">{future && !p.debit && !p.credit ? '' : signed(p.cumulative)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="table-primary">
                  <th colSpan={2}>Total</th>
                  <th className="text-end">{amount(data.totals.debit) || '0.00'}</th><th className="text-end">{amount(data.totals.credit) || '0.00'}</th>
                  <th className="text-end text-nowrap">{signed(data.totals.balance)}</th><th className="text-end text-nowrap">{signed(data.totals.closing)}</th>
                </tr></tfoot>
              </table>
              {single && <div className="px-3 py-2 small text-muted">Click a month to see its line items.</div>}
            </div></div></div>
          )}
        </div>
      </div>
    </>
  );
};

export default GlBalances;
