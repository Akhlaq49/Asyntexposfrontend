import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, ProfitLoss, PlRow, money, monthStart, yearStart, localDate, errorText } from '../../services/ACCT/accountingService';

/**
 * Accounting > Profit & Loss from the ledger. Accrual: a sale counts when it is made, with the cost of the goods sold
 * (not the purchases). Cash: a sale counts as it is paid.
 */
const LedgerProfitLoss: React.FC = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(localDate(new Date()));
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual');
  const [data, setData] = useState<ProfitLoss | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => svc.profitAndLoss({ from, to, basis }).then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e, 'Could not load the profit and loss.'))), 250);
    return () => clearTimeout(t);
  }, [from, to, basis]);

  const rows = (list: PlRow[]) => list.map((r) => (
    <tr key={r.accountId}><td className="text-muted" style={{ width: 80 }}>{r.code}</td>
      <td><Link to={`/account-ledger/${r.accountId}?from=${from}&to=${to}`}>{r.name}</Link></td>
      <td className="text-end text-nowrap">{money(r.amount)}</td></tr>
  ));
  return (
    <>
      <PageHeader title="Profit & Loss" subtitle="Income less expenses for a period, from the books" breadcrumbs={[{ title: 'Accounting' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">From</label><input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="btn btn-sm btn-outline-primary" onClick={() => { setFrom(monthStart()); setTo(localDate(new Date())); }}>This month</button>
        <button className="btn btn-sm btn-outline-primary" onClick={() => { setFrom(yearStart()); setTo(localDate(new Date())); }}>This year</button>
        <div className="btn-group ms-auto" role="group">
          <button className={`btn btn-sm ${basis === 'accrual' ? 'btn-primary' : 'btn-outline-primary'} basis-accrual`} onClick={() => setBasis('accrual')} title="A sale counts when it is made">Accrual</button>
          <button className={`btn btn-sm ${basis === 'cash' ? 'btn-primary' : 'btn-outline-primary'} basis-cash`} onClick={() => setBasis('cash')} title="A sale counts as it is paid">Cash</button>
        </div>
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {data && (
        <>
          <div className="row g-3 mb-3">
            {[{ l: 'Income', v: data.totalIncome, c: 'primary' }, { l: 'Gross profit', v: data.grossProfit, c: 'info', s: 'Sales less returns less cost of goods sold' },
              { l: 'Expenses', v: data.totalExpenses, c: 'danger' }, { l: data.netProfit >= 0 ? 'Net profit' : 'Net loss', v: data.netProfit, c: data.netProfit >= 0 ? 'success' : 'danger' }].map((k) => (
              <div key={k.l} className="col-md-3 col-sm-6"><div className="card mb-0 h-100"><div className="card-body">
                <div className="text-muted small">{k.l}</div><h4 className={`mb-0 text-${k.c} pl-${k.l.split(' ')[0].toLowerCase()}`}>{money(k.v)}</h4>{k.s && <small className="text-muted">{k.s}</small>}
              </div></div></div>
            ))}
          </div>
          <div className="card"><div className="card-body p-0">
            <table className="table align-middle mb-0">
              <tbody>
                <tr className="table-light"><th colSpan={3}>Income</th></tr>
                {rows(data.income)}
                <tr className="fw-bold"><td></td><td>Total income</td><td className="text-end">{money(data.totalIncome)}</td></tr>
                <tr className="table-light"><th colSpan={3}>Expenses</th></tr>
                {rows(data.expenses)}
                <tr className="fw-bold"><td></td><td>Total expenses</td><td className="text-end">{money(data.totalExpenses)}</td></tr>
              </tbody>
              <tfoot><tr className={data.netProfit >= 0 ? 'table-success' : 'table-danger'}><th></th><th>{data.netProfit >= 0 ? 'Net profit' : 'Net loss'}</th><th className="text-end">{money(data.netProfit)}</th></tr></tfoot>
            </table>
          </div>
          <div className="card-footer small text-muted">
            {data.basis === 'accrual' ? 'Accrual basis: sales count on their date, with the cost of the goods sold; purchases go into stock, not expenses.'
              : 'Cash basis: each sale (and its cost) counts in proportion to what the customer has paid in the period.'} Sales tax collected is owed to the government, not income.
          </div></div>
        </>
      )}
    </>
  );
};

export default LedgerProfitLoss;
