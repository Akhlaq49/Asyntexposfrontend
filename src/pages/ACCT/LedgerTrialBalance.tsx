import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, TrialBalance, amount, yearStart, localDate, showDate, errorText } from '../../services/ACCT/accountingService';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc } from '../../utils/printDocument';

const COLUMNS = ['Code', 'Account', 'Opening Dr', 'Opening Cr', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr'];

/** Accounting > Trial Balance: each account's opening balance, the period's debits and credits, and its closing balance */
const LedgerTrialBalance: React.FC = () => {
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(localDate(new Date()));
  const [data, setData] = useState<TrialBalance | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => svc.trialBalance({ from, to }).then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e, 'Could not load the trial balance.'))), 250);
    return () => clearTimeout(t);
  }, [from, to]);

  const side = (n: number) => ({ dr: n > 0 ? n : 0, cr: n < 0 ? -n : 0 });
  const title = `Trial Balance ${showDate(from)} to ${showDate(to)}`;
  const n2 = (v: number) => Math.round(v * 100) / 100;
  /** the table as rows (numbers, 0 = blank side) for Excel / PDF, with the totals row last */
  const exportRows = (d: TrialBalance): (string | number)[][] => [
    ...d.rows.map((r) => [r.code, r.name, n2(side(r.opening).dr), n2(side(r.opening).cr), n2(r.debit), n2(r.credit), n2(r.closingDebit), n2(r.closingCredit)]),
    ['', 'Total', n2(d.rows.reduce((s, r) => s + side(r.opening).dr, 0)), n2(d.rows.reduce((s, r) => s + side(r.opening).cr, 0)),
      n2(d.totals.debit), n2(d.totals.credit), n2(d.totals.closingDebit), n2(d.totals.closingCredit)],
  ];
  const fileName = `trial-balance-${from}-to-${to}`;
  const print = () => {
    if (!data) return;
    const rows = exportRows(data);
    const cell = (v: string | number, i: number) => i < 2 ? `<td>${esc(String(v))}</td>` : `<td class="r">${typeof v === 'number' && v ? amount(v) : ''}</td>`;
    printDocument(title, 'TRIAL BALANCE', `${showDate(from)} to ${showDate(to)} - ${data.balanced ? 'balanced' : 'NOT balanced'}`, `
      <table><thead><tr><th rowspan="2">Code</th><th rowspan="2">Account</th><th colspan="2" class="r">Opening</th><th colspan="2" class="r">This period</th><th colspan="2" class="r">Closing</th></tr>
        <tr>${['Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit'].map((h) => `<th class="r">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, -1).map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr class="total">${rows[rows.length - 1].map((v, i) => i < 2 ? `<th>${esc(String(v))}</th>` : `<th class="r">${amount(Number(v))}</th>`).join('')}</tr></tfoot></table>`);
  };
  return (
    <>
      <PageHeader title="Trial Balance" subtitle="Debits and credits of every account - the two totals are always equal" breadcrumbs={[{ title: 'Accounting' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">From</label><input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} />
        {data && <span className={`ms-auto badge ${data.balanced ? 'bg-success' : 'bg-danger'} tb-status`}>{data.balanced ? 'Balanced' : 'Not balanced'}</span>}
        <div className={`d-flex gap-2 ${data ? '' : 'ms-auto'}`}>
          <button className="btn btn-sm btn-success tb-excel" disabled={!data} onClick={() => data && exportToExcel(COLUMNS, exportRows(data), fileName, 'Trial Balance')}><i className="ti ti-file-spreadsheet me-1" />Excel</button>
          <button className="btn btn-sm btn-danger tb-pdf" disabled={!data} onClick={() => data && exportToPDF(COLUMNS, exportRows(data), fileName, title)}><i className="ti ti-file-type-pdf me-1" />PDF</button>
          <button className="btn btn-sm btn-dark tb-print" disabled={!data} onClick={print}><i className="ti ti-printer me-1" />Print</button>
        </div>
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {data && (
        <div className="card"><div className="card-body p-0"><div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead className="thead-light">
              <tr><th rowSpan={2}>Code</th><th rowSpan={2}>Account</th><th colSpan={2} className="text-center">Opening</th><th colSpan={2} className="text-center">This period</th><th colSpan={2} className="text-center">Closing</th></tr>
              <tr>{['Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit'].map((h, i) => <th key={i} className="text-end">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="text-muted">{r.code}</td>
                  <td><Link to={`/account-ledger/${r.id}?from=${from}&to=${to}`}>{r.name}</Link></td>
                  <td className="text-end">{amount(side(r.opening).dr)}</td><td className="text-end">{amount(side(r.opening).cr)}</td>
                  <td className="text-end">{amount(r.debit)}</td><td className="text-end">{amount(r.credit)}</td>
                  <td className="text-end fw-semibold">{amount(r.closingDebit)}</td><td className="text-end fw-semibold">{amount(r.closingCredit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="table-primary">
              <th colSpan={2}>Total</th>
              <th className="text-end">{amount(data.rows.reduce((s, r) => s + side(r.opening).dr, 0))}</th><th className="text-end">{amount(data.rows.reduce((s, r) => s + side(r.opening).cr, 0))}</th>
              <th className="text-end">{amount(data.totals.debit)}</th><th className="text-end">{amount(data.totals.credit)}</th>
              <th className="text-end">{amount(data.totals.closingDebit)}</th><th className="text-end">{amount(data.totals.closingCredit)}</th>
            </tr></tfoot>
          </table>
        </div></div></div>
      )}
    </>
  );
};

export default LedgerTrialBalance;
