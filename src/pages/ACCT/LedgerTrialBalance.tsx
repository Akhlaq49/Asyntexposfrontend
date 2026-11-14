import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, TrialBalance, Comparison, AccountBalances, yearStart, localDate, showDate, errorText } from '../../services/ACCT/accountingService';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc } from '../../utils/printDocument';
import {
  TB_LAYOUTS, TbLayout, TbView, COMPARE_WITH, CompareWith, comparisonDates,
  buildTrialBalanceView, buildComparisonView, buildAccumulatedView, formatTbValue, tbExportTable,
} from '../../utils/trialBalanceLayouts';

const PREF_KEY = 'trialBalance.view';
interface Pref { layout: TbLayout; grouped: boolean; compareWith: CompareWith }
const loadPref = (): Pref => {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return {
      layout: TB_LAYOUTS.some((l) => l.id === p.layout) ? p.layout : 'movement',
      grouped: p.grouped !== false,
      compareWith: COMPARE_WITH.some((c) => c.id === p.compareWith) ? p.compareWith : 'lastYear',
    };
  } catch { return { layout: 'movement', grouped: true, compareWith: 'lastYear' }; }
};

/** The two header rows: column bands (Opening / This period / ...) when the layout has them, then the labels */
const headerRows = (view: TbView) => {
  const banded = view.columns.some((c) => c.band);
  const bands: { label: string; span: number }[] = [];
  view.columns.forEach((c) => {
    const last = bands[bands.length - 1];
    if (last && last.label === (c.band || '') && c.band) last.span++; else bands.push({ label: c.band || '', span: 1 });
  });
  return { banded, bands };
};
/** A total cell: blank when the column has no total, 0.00 when it is zero */
const totalText = (v: number, kind: TbView['columns'][number]['kind'], split: boolean) =>
  !Number.isFinite(v) ? '' : formatTbValue(v, split && kind !== 'percent' ? 'amount' : kind) || '0.00';

/** Accounting > Trial Balance: every account's balance in the layout chosen */
const LedgerTrialBalance: React.FC = () => {
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(localDate(new Date()));
  const [pref, setPref] = useState(loadPref);
  const { layout, grouped, compareWith } = pref;
  const [custom, setCustom] = useState(() => comparisonDates(yearStart(), localDate(new Date()), 'lastYear'));
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [cmp, setCmp] = useState<Comparison | null>(null);
  const [acc, setAcc] = useState<AccountBalances | null>(null);
  const [error, setError] = useState('');

  const { cmpFrom, cmpTo } = compareWith === 'custom' ? custom : comparisonDates(from, to, compareWith);

  useEffect(() => {
    if (!from || !to) return;
    const fail = (e: unknown) => setError(errorText(e, 'Could not load the trial balance.'));
    const t = setTimeout(() => {
      if (layout === 'comparison') {
        if (!cmpFrom || !cmpTo) return;
        svc.comparison({ from, to, cmpFrom, cmpTo }).then((d) => { setCmp(d); setError(''); }).catch(fail);
      } else if (layout === 'accumulated') svc.accountBalances({ from, to }).then((d) => { setAcc(d); setError(''); }).catch(fail);
      else svc.trialBalance({ from, to }).then((d) => { setTb(d); setError(''); }).catch(fail);
    }, 250);
    return () => clearTimeout(t);
  }, [layout, from, to, cmpFrom, cmpTo]);

  const choose = (p: Partial<Pref>) => {
    const next = { ...pref, ...p };
    setPref(next);
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* the choice just isn't remembered */ }
  };

  const view = useMemo(() => {
    if (layout === 'comparison') return cmp ? buildComparisonView(cmp, grouped) : null;
    if (layout === 'accumulated') return acc ? buildAccumulatedView(acc, grouped) : null;
    return tb ? buildTrialBalanceView(tb, layout, grouped) : null;
  }, [layout, tb, cmp, acc, grouped]);

  // balanced: every total debits = total credits (or the one total row's debit = credit columns)
  const balanced = view ? view.totals.length === 2
    ? view.totals[0].values.every((v, i) => !Number.isFinite(v) || !Number.isFinite(view.totals[1].values[i]) || Math.abs(v - view.totals[1].values[i]) < 0.005)
    : tb?.balanced ?? true : true;

  const layoutInfo = TB_LAYOUTS.find((l) => l.id === layout)!;
  const period = layout === 'comparison'
    ? `${showDate(from)} to ${showDate(to)} compared with ${showDate(cmpFrom)} to ${showDate(cmpTo)}`
    : `${showDate(from)} to ${showDate(to)}`;
  const title = `Trial Balance ${period}`;
  const fileName = `trial-balance-${layout}-${from}-to-${to}`;
  const width = view ? view.columns.length + 2 : 2;
  const split = !!view && view.totals.length > 1;
  const cells = (values: number[], bold = false) => view!.columns.map((c, i) => (
    <td key={i} className={`text-end text-nowrap ${bold ? 'fw-semibold' : ''} ${c.kind === 'percent' ? (values[i] > 0 ? 'text-success' : values[i] < 0 ? 'text-danger' : '') : ''}`}>
      {formatTbValue(values[i], c.kind)}</td>
  ));

  const exportExcel = () => { if (!view) return; const t = tbExportTable(view); exportToExcel(t.columns, t.rows, fileName, 'Trial Balance'); };
  const exportPdf = () => { if (!view) return; const t = tbExportTable(view); exportToPDF(t.columns, t.rows, fileName, `${title} (${layoutInfo.label})`); };
  const print = () => {
    if (!view) return;
    const { banded, bands } = headerRows(view);
    const vals = (values: number[], tag = 'td') => view.columns.map((c, i) => `<${tag} class="r">${esc(formatTbValue(values[i], c.kind))}</${tag}>`).join('');
    // two header rows when columns are banded: a column without a band spans both rows
    const head = banded
      ? `<tr><th rowspan="2">Code</th><th rowspan="2">Account</th>${bands.map((b, bi) => b.label
        ? `<th colspan="${b.span}" class="r">${esc(b.label)}</th>`
        : `<th rowspan="2" class="r">${esc(view.columns[bands.slice(0, bi).reduce((s, x) => s + x.span, 0)].label)}</th>`).join('')}</tr>
         <tr>${view.columns.filter((c) => c.band).map((c) => `<th class="r">${esc(c.label)}</th>`).join('')}</tr>`
      : `<tr><th>Code</th><th>Account</th>${view.columns.map((c) => `<th class="r">${esc(c.label)}</th>`).join('')}</tr>`;
    const body = view.sections.map((s) => [
      s.title ? `<tr><th colspan="${width}" style="text-align:left;background:#eef0f4">${esc(s.title)}</th></tr>` : '',
      ...s.lines.map((l) => `<tr><td>${esc(l.code)}</td><td>${esc(l.name)}</td>${vals(l.values)}</tr>`),
      s.subtotal ? `<tr><td></td><td><b>${esc(s.title)} total</b></td>${vals(s.subtotal, 'th')}</tr>` : '',
    ].join('')).join('');
    const foot = view.totals.map((t) => `<tr class="total"><th colspan="2">${esc(t.label)}</th>${view.columns.map((c, i) =>
      `<th class="r">${esc(totalText(t.values[i], c.kind, split))}</th>`).join('')}</tr>`).join('');
    printDocument(title, 'TRIAL BALANCE', `${period} - ${layoutInfo.label} - ${balanced ? 'balanced' : 'NOT balanced'}`,
      `<table><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>`);
  };

  const hdr = view ? headerRows(view) : null;
  const colStart = (bi: number) => hdr!.bands.slice(0, bi).reduce((s, x) => s + x.span, 0);
  return (
    <>
      <PageHeader title="Trial Balance" subtitle="Debits and credits of every account - the two totals are always equal" breadcrumbs={[{ title: 'Accounting' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">{layout === 'comparison' ? 'Reporting period' : 'From'}</label>
        <input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} />
        {view && <span className={`ms-auto badge ${balanced ? 'bg-success' : 'bg-danger'} tb-status`}>{balanced ? 'Balanced' : 'Not balanced'}</span>}
        <div className={`d-flex gap-2 ${view ? '' : 'ms-auto'}`}>
          <button className="btn btn-sm btn-success tb-excel" disabled={!view} onClick={exportExcel}><i className="ti ti-file-spreadsheet me-1" />Excel</button>
          <button className="btn btn-sm btn-danger tb-pdf" disabled={!view} onClick={exportPdf}><i className="ti ti-file-type-pdf me-1" />PDF</button>
          <button className="btn btn-sm btn-dark tb-print" disabled={!view} onClick={print}><i className="ti ti-printer me-1" />Print</button>
        </div>

        {layout === 'comparison' && (
          <div className="w-100 d-flex flex-wrap gap-2 align-items-center">
            <label className="mb-0">Compare with</label>
            <select className="form-select" style={{ width: 210 }} value={compareWith} onChange={(e) => {
              const mode = e.target.value as CompareWith;
              if (mode === 'custom') setCustom({ cmpFrom, cmpTo });       // start from the dates shown now
              choose({ compareWith: mode });
            }}>
              {COMPARE_WITH.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {compareWith === 'custom' ? (<>
              <input type="date" className="form-control" style={{ width: 170 }} value={custom.cmpFrom} onChange={(e) => setCustom({ ...custom, cmpFrom: e.target.value })} />
              <label className="mb-0">to</label>
              <input type="date" className="form-control" style={{ width: 170 }} value={custom.cmpTo} onChange={(e) => setCustom({ ...custom, cmpTo: e.target.value })} />
            </>) : <span className="small text-muted">{showDate(cmpFrom)} to {showDate(cmpTo)}</span>}
          </div>
        )}

        <div className="w-100 d-flex flex-wrap gap-3 align-items-center border-top pt-2 mt-1">
          <span className="small fw-medium">Layout</span>
          <div className="btn-group btn-group-sm flex-wrap" role="group" aria-label="Trial balance layout">
            {TB_LAYOUTS.map((l) => (
              <button key={l.id} type="button" title={l.help} className={`btn ${layout === l.id ? 'btn-primary' : 'btn-outline-primary'} tb-layout-${l.id}`}
                onClick={() => choose({ layout: l.id })}>{l.label}</button>
            ))}
          </div>
          <div className="form-check mb-0">
            <input id="tb-grouped" type="checkbox" className="form-check-input" checked={grouped} onChange={(e) => choose({ grouped: e.target.checked })} />
            <label htmlFor="tb-grouped" className="form-check-label small">Group by type, with subtotals</label>
          </div>
          <span className="small text-muted">{layoutInfo.help}
            {layout === 'accumulated' && acc && <> Financial year starts <b>{showDate(acc.fiscalYearStart)}</b> (change it in Accounting Settings).</>}</span>
        </div>
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {view && hdr && (
        <div className="card"><div className="card-body p-0"><div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead className="thead-light">
              {hdr.banded ? (<>
                <tr><th rowSpan={2}>Code</th><th rowSpan={2}>Account</th>
                  {hdr.bands.map((b, i) => b.label
                    ? <th key={i} colSpan={b.span} className="text-center">{b.label}</th>
                    : <th key={i} rowSpan={2} className="text-end">{view.columns[colStart(i)].label}</th>)}</tr>
                <tr>{view.columns.map((c, i) => c.band ? <th key={i} className="text-end">{c.label}</th> : null)}</tr>
              </>) : (
                <tr><th style={{ width: 110 }}>Code</th><th>Account</th>{view.columns.map((c, i) => <th key={i} className="text-end" style={{ width: 170 }}>{c.label}</th>)}</tr>
              )}
            </thead>
            {view.sections.every((s) => s.lines.length === 0)
              ? <tbody><tr><td colSpan={width} className="text-center py-4 text-muted">No entries for these dates.</td></tr></tbody>
              : view.sections.map((s, si) => (
                <tbody key={si}>
                  {s.title && <tr className="table-light"><th colSpan={width} className="text-uppercase small">{s.title}</th></tr>}
                  {s.lines.map((l) => (
                    <tr key={`${l.id}-${l.name}`}>
                      <td className="text-muted">{l.code}</td>
                      <td>{l.id ? <Link to={`/account-ledger/${l.id}?from=${from}&to=${to}`}>{l.name}</Link> : <i>{l.name}</i>}</td>
                      {cells(l.values)}
                    </tr>
                  ))}
                  {s.subtotal && <tr className="border-top"><td /><td className="fw-semibold">{s.title} total</td>{cells(s.subtotal, true)}</tr>}
                </tbody>
              ))}
            <tfoot>
              {view.totals.map((t) => (
                <tr key={t.label} className="table-primary">
                  <th colSpan={2}>{t.label}</th>
                  {view.columns.map((c, i) => <th key={i} className="text-end text-nowrap">{totalText(t.values[i], c.kind, split)}</th>)}
                </tr>
              ))}
            </tfoot>
          </table>
        </div></div></div>
      )}
    </>
  );
};

export default LedgerTrialBalance;
