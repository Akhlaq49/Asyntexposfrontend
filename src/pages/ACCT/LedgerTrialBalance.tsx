import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, TrialBalance, yearStart, localDate, showDate, errorText } from '../../services/ACCT/accountingService';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc } from '../../utils/printDocument';
import { TB_LAYOUTS, TbLayout, TbView, buildTrialBalanceView, formatTbValue, tbExportTable } from '../../utils/trialBalanceLayouts';

const PREF_KEY = 'trialBalance.view';
const loadPref = (): { layout: TbLayout; grouped: boolean } => {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return { layout: TB_LAYOUTS.some((l) => l.id === p.layout) ? p.layout : 'movement', grouped: p.grouped !== false };
  } catch { return { layout: 'movement', grouped: true }; }
};

/** The two header rows: column bands (Opening / This period / Closing) when the layout has them, then the labels */
const headerRows = (view: TbView) => {
  const banded = view.columns.some((c) => c.band);
  const bands: { label: string; span: number }[] = [];
  view.columns.forEach((c) => {
    const last = bands[bands.length - 1];
    if (last && last.label === c.band) last.span++; else bands.push({ label: c.band || '', span: 1 });
  });
  return { banded, bands };
};

/** Accounting > Trial Balance: every account's balance in the layout chosen (standard, movement or extended) */
const LedgerTrialBalance: React.FC = () => {
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(localDate(new Date()));
  const [data, setData] = useState<TrialBalance | null>(null);
  const [error, setError] = useState('');
  const [{ layout, grouped }, setPref] = useState(loadPref);

  useEffect(() => {
    const t = setTimeout(() => svc.trialBalance({ from, to }).then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e, 'Could not load the trial balance.'))), 250);
    return () => clearTimeout(t);
  }, [from, to]);

  const choose = (p: { layout: TbLayout; grouped: boolean }) => {
    setPref(p);
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* the choice just isn't remembered */ }
  };

  const view = useMemo(() => (data ? buildTrialBalanceView(data, layout, grouped) : null), [data, layout, grouped]);
  const layoutInfo = TB_LAYOUTS.find((l) => l.id === layout)!;
  const title = `Trial Balance ${showDate(from)} to ${showDate(to)}`;
  const fileName = `trial-balance-${layout}-${from}-to-${to}`;
  const width = view ? view.columns.length + 2 : 2;
  const cells = (values: number[], bold = false) => view!.columns.map((c, i) => (
    <td key={i} className={`text-end text-nowrap ${bold ? 'fw-semibold' : ''}`}>{formatTbValue(values[i], c.kind)}</td>
  ));

  const exportExcel = () => { if (!view) return; const t = tbExportTable(view); exportToExcel(t.columns, t.rows, fileName, 'Trial Balance'); };
  const exportPdf = () => { if (!view) return; const t = tbExportTable(view); exportToPDF(t.columns, t.rows, fileName, `${title} (${layoutInfo.label})`); };
  const print = () => {
    if (!view || !data) return;
    const { banded, bands } = headerRows(view);
    const vals = (values: number[], tag = 'td') => view.columns.map((c, i) => `<${tag} class="r">${esc(formatTbValue(values[i], c.kind))}</${tag}>`).join('');
    const head = banded
      ? `<tr><th rowspan="2">Code</th><th rowspan="2">Account</th>${bands.map((b) => `<th colspan="${b.span}" class="r">${esc(b.label)}</th>`).join('')}</tr>
         <tr>${view.columns.map((c) => `<th class="r">${esc(c.label)}</th>`).join('')}</tr>`
      : `<tr><th>Code</th><th>Account</th>${view.columns.map((c) => `<th class="r">${esc(c.label)}</th>`).join('')}</tr>`;
    const body = view.sections.map((s) => [
      s.title ? `<tr><th colspan="${width}" style="text-align:left;background:#eef0f4">${esc(s.title)}</th></tr>` : '',
      ...s.lines.map((l) => `<tr><td>${esc(l.code)}</td><td>${esc(l.name)}</td>${vals(l.values)}</tr>`),
      s.subtotal ? `<tr><td></td><td><b>${esc(s.title)} total</b></td>${vals(s.subtotal, 'th')}</tr>` : '',
    ].join('')).join('');
    const foot = view.totals.map((t) => `<tr class="total"><th colspan="2">${esc(t.label)}</th>${view.totals.length > 1
      ? t.values.map((v) => `<th class="r">${esc(formatTbValue(v, 'amount'))}</th>`).join('') : vals(t.values, 'th')}</tr>`).join('');
    printDocument(title, 'TRIAL BALANCE', `${showDate(from)} to ${showDate(to)} - ${layoutInfo.label} - ${data.balanced ? 'balanced' : 'NOT balanced'}`,
      `<table><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>`);
  };

  const hdr = view ? headerRows(view) : null;
  return (
    <>
      <PageHeader title="Trial Balance" subtitle="Debits and credits of every account - the two totals are always equal" breadcrumbs={[{ title: 'Accounting' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">From</label><input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} />
        {data && <span className={`ms-auto badge ${data.balanced ? 'bg-success' : 'bg-danger'} tb-status`}>{data.balanced ? 'Balanced' : 'Not balanced'}</span>}
        <div className={`d-flex gap-2 ${data ? '' : 'ms-auto'}`}>
          <button className="btn btn-sm btn-success tb-excel" disabled={!view} onClick={exportExcel}><i className="ti ti-file-spreadsheet me-1" />Excel</button>
          <button className="btn btn-sm btn-danger tb-pdf" disabled={!view} onClick={exportPdf}><i className="ti ti-file-type-pdf me-1" />PDF</button>
          <button className="btn btn-sm btn-dark tb-print" disabled={!view} onClick={print}><i className="ti ti-printer me-1" />Print</button>
        </div>
        <div className="w-100 d-flex flex-wrap gap-3 align-items-center border-top pt-2 mt-1">
          <span className="small fw-medium">Layout</span>
          <div className="btn-group btn-group-sm" role="group" aria-label="Trial balance layout">
            {TB_LAYOUTS.map((l) => (
              <button key={l.id} type="button" title={l.help} className={`btn ${layout === l.id ? 'btn-primary' : 'btn-outline-primary'} tb-layout-${l.id}`}
                onClick={() => choose({ layout: l.id, grouped })}>{l.label}</button>
            ))}
          </div>
          <div className="form-check mb-0">
            <input id="tb-grouped" type="checkbox" className="form-check-input" checked={grouped} onChange={(e) => choose({ layout, grouped: e.target.checked })} />
            <label htmlFor="tb-grouped" className="form-check-label small">Group by type, with subtotals</label>
          </div>
          <span className="small text-muted">{layoutInfo.help}</span>
        </div>
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {view && hdr && (
        <div className="card"><div className="card-body p-0"><div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead className="thead-light">
              {hdr.banded ? (<>
                <tr><th rowSpan={2}>Code</th><th rowSpan={2}>Account</th>{hdr.bands.map((b, i) => <th key={i} colSpan={b.span} className="text-center">{b.label}</th>)}</tr>
                <tr>{view.columns.map((c, i) => <th key={i} className="text-end">{c.label}</th>)}</tr>
              </>) : (
                <tr><th style={{ width: 110 }}>Code</th><th>Account</th>{view.columns.map((c, i) => <th key={i} className="text-end" style={{ width: 170 }}>{c.label}</th>)}</tr>
              )}
            </thead>
            {view.sections.length === 0 || view.sections.every((s) => s.lines.length === 0)
              ? <tbody><tr><td colSpan={width} className="text-center py-4 text-muted">No entries up to this date.</td></tr></tbody>
              : view.sections.map((s, si) => (
                <tbody key={si}>
                  {s.title && <tr className="table-light"><th colSpan={width} className="text-uppercase small">{s.title}</th></tr>}
                  {s.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="text-muted">{l.code}</td>
                      <td><Link to={`/account-ledger/${l.id}?from=${from}&to=${to}`}>{l.name}</Link></td>
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
                  {view.columns.map((c, i) => <th key={i} className="text-end text-nowrap">{formatTbValue(t.values[i], view.totals.length > 1 ? 'amount' : c.kind) || '0.00'}</th>)}
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
