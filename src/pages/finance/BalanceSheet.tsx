import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { printDocument, esc, printMoney } from '../../utils/printDocument';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

interface Detail { reference: string; name: string; date?: string | null; amount: number; info?: string | null }
interface Line { key: string; label: string; amount: number; hint: string; details: Detail[] }
interface Section { title: string; lines: Line[]; total: number }
interface BalanceSheetData {
  asOf: string;
  assets: { current: Section; nonCurrent: Section; total: number };
  liabilities: { current: Section; nonCurrent: Section; total: number };
  equity: Section;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
  ratios: { currentRatio?: number | null; quickRatio?: number | null; debtToEquity?: number | null; workingCapital: number };
  notes: string[];
}

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const money = (n: number) => `${n < 0 ? '-' : ''}Rs ${Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const showDate = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Reports > Balance Sheet: what the business owns, owes and what belongs to the owner, on a date */
const BalanceSheet: React.FC = () => {
  const [asOf, setAsOf] = useState(localDate(new Date()));
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async (date: string) => {
    setLoading(true); setError('');
    try { setData((await api.get<BalanceSheetData>('/reports/balance-sheet', { params: { asOf: date } })).data); }
    catch { setError('Could not load the balance sheet.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(asOf); }, [asOf, load]);

  const presets = (() => {
    const now = new Date();
    return [
      { label: 'Today', date: localDate(now) },
      { label: 'End of last month', date: localDate(new Date(now.getFullYear(), now.getMonth(), 0)) },
      { label: 'End of last year', date: localDate(new Date(now.getFullYear() - 1, 11, 31)) },
    ];
  })();

  /* ---- export / print ---- */
  const allSections = (d: BalanceSheetData) => [
    { group: 'ASSETS', s: d.assets.current }, { group: 'ASSETS', s: d.assets.nonCurrent },
    { group: 'LIABILITIES', s: d.liabilities.current }, { group: 'LIABILITIES', s: d.liabilities.nonCurrent },
    { group: "OWNER'S EQUITY", s: d.equity },
  ];
  const exportRows = (d: BalanceSheetData) => {
    const rows: (string | number)[][] = [];
    allSections(d).forEach(({ group, s }) => {
      rows.push([group, s.title, '']);
      s.lines.forEach((l) => rows.push(['', `   ${l.label}`, l.amount.toFixed(2)]));
      rows.push(['', `Total ${s.title.toLowerCase()}`, s.total.toFixed(2)]);
    });
    rows.push(['', 'TOTAL ASSETS', d.assets.total.toFixed(2)]);
    rows.push(['', 'TOTAL LIABILITIES + EQUITY', d.totalLiabilitiesAndEquity.toFixed(2)]);
    return rows;
  };
  const title = data ? `Balance Sheet as on ${showDate(data.asOf)}` : 'Balance Sheet';
  const print = () => {
    if (!data) return;
    const block = (s: Section) => `<tr><th colspan="2" style="background:#f2f2f2">${esc(s.title)}</th></tr>` +
      s.lines.map((l) => `<tr><td style="padding-left:18px">${esc(l.label)}</td><td class="r">${printMoney(l.amount).replace('Rs -', '-Rs ')}</td></tr>`).join('') +
      `<tr><th class="r">Total ${esc(s.title.toLowerCase())}</th><th class="r">${printMoney(s.total)}</th></tr>`;
    printDocument(title, 'BALANCE SHEET', `As on ${showDate(data.asOf)}`, `
      <div style="display:flex;gap:16px;align-items:flex-start">
        <table style="flex:1"><thead><tr><th>Assets</th><th class="r">Amount</th></tr></thead><tbody>
          ${block(data.assets.current)}${block(data.assets.nonCurrent)}</tbody>
          <tfoot><tr class="total"><th>Total assets</th><th class="r">${printMoney(data.assets.total)}</th></tr></tfoot></table>
        <table style="flex:1"><thead><tr><th>Liabilities &amp; owner's equity</th><th class="r">Amount</th></tr></thead><tbody>
          ${block(data.liabilities.current)}${block(data.liabilities.nonCurrent)}${block(data.equity)}</tbody>
          <tfoot><tr class="total"><th>Total liabilities + equity</th><th class="r">${printMoney(data.totalLiabilitiesAndEquity)}</th></tr></tfoot></table>
      </div>
      <p style="margin-top:14px;font-size:12px;color:#555">Working capital: ${printMoney(data.ratios.workingCapital)}
        ${data.ratios.currentRatio != null ? ` &nbsp;|&nbsp; Current ratio: ${data.ratios.currentRatio}` : ''}
        ${data.ratios.debtToEquity != null ? ` &nbsp;|&nbsp; Debt to equity: ${data.ratios.debtToEquity}` : ''}</p>
      ${data.notes.length ? `<p style="font-size:12px;color:#555">${data.notes.map(esc).join('<br>')}</p>` : ''}`);
  };

  const LineRow: React.FC<{ l: Line }> = ({ l }) => {
    const isOpen = !!open[l.key];
    const canOpen = l.details.length > 0;
    return (
      <>
        <tr role={canOpen ? 'button' : undefined} onClick={() => canOpen && setOpen({ ...open, [l.key]: !isOpen })}>
          <td className="ps-4">
            {canOpen ? <i className={`ti ti-chevron-${isOpen ? 'down' : 'right'} me-1 text-muted`} /> : <span className="me-3" />}
            {l.label}
            <i className="ti ti-info-circle ms-1 text-muted" title={l.hint} />
          </td>
          <td className={`text-end text-nowrap ${l.amount < 0 ? 'text-danger' : ''}`}>{money(l.amount)}</td>
        </tr>
        {isOpen && (
          <tr><td colSpan={2} className="p-0">
            <div className="bg-light px-4 py-2" style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="table table-sm mb-0 bg-transparent">
                <tbody>
                  {l.details.map((d, i) => (
                    <tr key={i}>
                      <td className="small">{d.reference && <span className="fw-semibold me-2">{d.reference}</span>}{d.name}</td>
                      <td className="small text-muted">{d.date ? showDate(d.date.slice(0, 10)) : ''}</td>
                      <td className="small text-muted">{d.info}</td>
                      <td className="small text-end text-nowrap">{money(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td></tr>
        )}
      </>
    );
  };
  const SectionRows: React.FC<{ s: Section }> = ({ s }) => (
    <>
      <tr className="table-light"><th colSpan={2}>{s.title}</th></tr>
      {s.lines.map((l) => <LineRow key={l.key} l={l} />)}
      <tr><td className="text-end fw-semibold">Total {s.title.toLowerCase()}</td><td className="text-end fw-semibold text-nowrap">{money(s.total)}</td></tr>
    </>
  );

  return (
    <>
      <PageHeader title="Balance Sheet" subtitle="What the business owns, what it owes and what belongs to the owner" breadcrumbs={[{ title: 'Reports' }]} />

      <div className="card">
        <div className="card-body d-flex align-items-center flex-wrap gap-2">
          <label className="form-label mb-0 me-1">As on</label>
          <input type="date" className="form-control" style={{ width: 180 }} value={asOf} max={localDate(new Date())} onChange={(e) => e.target.value && setAsOf(e.target.value)} />
          {presets.map((p) => (
            <button key={p.label} type="button" className={`btn btn-sm ${asOf === p.date ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setAsOf(p.date)}>{p.label}</button>
          ))}
          <div className="ms-auto d-flex gap-2">
            <Link to="/capital-loans" className="btn btn-sm btn-outline-secondary"><i className="ti ti-building-bank me-1" />Capital &amp; Loans</Link>
            <button className="btn btn-sm btn-success" disabled={!data} onClick={() => data && exportToExcel(['Group', 'Item', 'Amount (Rs)'], exportRows(data), 'balance-sheet', 'Balance Sheet')}><i className="ti ti-file-spreadsheet me-1" />Excel</button>
            <button className="btn btn-sm btn-danger" disabled={!data} onClick={() => data && exportToPDF(['Group', 'Item', 'Amount (Rs)'], exportRows(data), 'balance-sheet', title)}><i className="ti ti-file-type-pdf me-1" />PDF</button>
            <button className="btn btn-sm btn-dark" disabled={!data} onClick={print}><i className="ti ti-printer me-1" />Print</button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && !data ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : data && (
        <>
          <div className="row g-3 mb-3">
            {[
              { label: 'Total assets', value: money(data.assets.total), cls: 'primary', icon: 'ti-building-warehouse' },
              { label: 'Total liabilities', value: money(data.liabilities.total), cls: 'danger', icon: 'ti-receipt-2' },
              { label: "Owner's equity", value: money(data.equity.total), cls: 'success', icon: 'ti-user-dollar' },
              { label: 'Working capital', value: money(data.ratios.workingCapital), cls: 'info', icon: 'ti-arrows-exchange',
                sub: data.ratios.currentRatio != null ? `Current ratio ${data.ratios.currentRatio}${data.ratios.quickRatio != null ? ` | Quick ${data.ratios.quickRatio}` : ''}` : 'No current liabilities' },
            ].map((c) => (
              <div className="col-sm-6 col-xl-3" key={c.label}>
                <div className="card mb-0 h-100"><div className="card-body d-flex align-items-center">
                  <span className={`avatar avatar-lg bg-${c.cls}-transparent text-${c.cls} me-3`}><i className={`ti ${c.icon}`} style={{ fontSize: 22 }} /></span>
                  <div><p className="mb-1 text-muted">{c.label}</p><h5 className="mb-0">{c.value}</h5>{c.sub && <small className="text-muted">{c.sub}</small>}</div>
                </div></div>
              </div>
            ))}
          </div>

          <div className={`alert py-2 ${data.balanced ? 'alert-success' : 'alert-danger'}`}>
            {data.balanced
              ? <><i className="ti ti-circle-check me-1" />Balanced: total assets {money(data.assets.total)} = liabilities + owner's equity {money(data.totalLiabilitiesAndEquity)}.</>
              : <>Not balanced: assets {money(data.assets.total)}, liabilities + equity {money(data.totalLiabilitiesAndEquity)}.</>}
            {loading && <span className="spinner-border spinner-border-sm ms-2" />}
          </div>
          {data.notes.map((n) => <div key={n} className="alert alert-warning py-2"><i className="ti ti-alert-triangle me-1" />{n}</div>)}

          <div className="row g-3">
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header"><h5 className="mb-0">Assets <small className="text-muted fw-normal">- what the business owns</small></h5></div>
                <div className="card-body p-0">
                  <table className="table mb-0 align-middle">
                    <tbody><SectionRows s={data.assets.current} /><SectionRows s={data.assets.nonCurrent} /></tbody>
                    <tfoot><tr className="table-primary"><th>Total assets</th><th className="text-end text-nowrap">{money(data.assets.total)}</th></tr></tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header"><h5 className="mb-0">Liabilities &amp; owner's equity <small className="text-muted fw-normal">- what it owes and the owner's share</small></h5></div>
                <div className="card-body p-0">
                  <table className="table mb-0 align-middle">
                    <tbody>
                      <SectionRows s={data.liabilities.current} /><SectionRows s={data.liabilities.nonCurrent} />
                      <tr><td className="text-end fw-semibold">Total liabilities</td><td className="text-end fw-semibold text-nowrap">{money(data.liabilities.total)}</td></tr>
                      <SectionRows s={data.equity} />
                    </tbody>
                    <tfoot><tr className="table-primary"><th>Total liabilities + equity</th><th className="text-end text-nowrap">{money(data.totalLiabilitiesAndEquity)}</th></tr></tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <p className="text-muted small mt-3 mb-0">
            Click a line to see what makes it up. Cash and bank come from every payment in Transactions; stock is valued at its average purchase cost.
            Record the owner's capital, drawings, loans and fixed assets under <Link to="/capital-loans">Finance &gt; Capital &amp; Loans</Link>.
            {data.ratios.debtToEquity != null && <> Debt to equity: {data.ratios.debtToEquity}.</>}
          </p>
        </>
      )}
    </>
  );
};

export default BalanceSheet;
