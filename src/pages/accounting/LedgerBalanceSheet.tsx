import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, BalanceSheet, BsRow, money, localDate, errorText } from '../../services/accountingService';

/**
 * Accounting > Balance Sheet from the ledger: account balances on a date. Customers and suppliers are each on the
 * side of their own balance (an advance is not netted against a debt). It balances only if every entry did.
 */
const LedgerBalanceSheet: React.FC = () => {
  const [asOf, setAsOf] = useState(localDate(new Date()));
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => { svc.balanceSheet(asOf).then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e, 'Could not load the balance sheet.'))); }, [asOf]);

  const rows = (list: BsRow[], side: string) => list.flatMap((r) => {
    const key = `${side}-${r.accountId}-${r.name}`;
    return [
      <tr key={key}>
        <td>
          {r.parties ? <button type="button" className="btn btn-link p-0 text-reset text-start" onClick={() => setOpen({ ...open, [key]: !open[key] })}>
            <i className={`ti ti-chevron-${open[key] ? 'down' : 'right'} me-1`} />{r.name} <small className="text-muted">({r.parties.length})</small></button>
            : r.accountId ? <Link to={`/account-ledger/${r.accountId}?to=${asOf}`} className="text-reset">{r.name}</Link> : <b>{r.name}</b>}
        </td>
        <td className="text-end text-nowrap">{money(r.amount)}</td>
      </tr>,
      ...(r.parties && open[key] ? r.parties.map((p, i) => (
        <tr key={key + i} className="small text-muted"><td style={{ paddingLeft: 32 }}><Link to={`/account-ledger/${r.accountId}?to=${asOf}&party=${encodeURIComponent(p.name)}`}>{p.name}</Link></td><td className="text-end">{money(p.balance)}</td></tr>
      )) : []),
    ];
  });

  return (
    <>
      <PageHeader title="Balance Sheet (books)" subtitle="What the business owns, owes and what belongs to the owner - from the ledger" breadcrumbs={[{ title: 'Accounting' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">As on</label><input type="date" className="form-control" style={{ width: 170 }} value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} />
        {data && <span className={`ms-auto badge ${data.balanced ? 'bg-success' : 'bg-danger'} bs-status`}>{data.balanced ? 'Assets = liabilities + equity' : 'Does not balance - check Accounting Settings'}</span>}
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {data && (
        <div className="row g-3">
          <div className="col-lg-6"><div className="card h-100">
            <div className="card-header"><h5 className="mb-0">Assets <small className="text-muted fw-normal">what the business owns</small></h5></div>
            <div className="card-body p-0"><table className="table mb-0 align-middle"><tbody>{rows(data.assets, 'a')}</tbody>
              <tfoot><tr className="table-primary"><th>Total assets</th><th className="text-end bs-assets">{money(data.totalAssets)}</th></tr></tfoot></table></div>
          </div></div>
          <div className="col-lg-6"><div className="card h-100">
            <div className="card-header"><h5 className="mb-0">Liabilities &amp; equity <small className="text-muted fw-normal">what it owes, and the owner's share</small></h5></div>
            <div className="card-body p-0"><table className="table mb-0 align-middle">
              <tbody>
                <tr className="table-light"><th colSpan={2}>Liabilities</th></tr>
                {data.liabilities.length ? rows(data.liabilities, 'l') : <tr><td colSpan={2} className="text-muted">Nothing owed</td></tr>}
                <tr className="fw-semibold"><td>Total liabilities</td><td className="text-end">{money(data.totalLiabilities)}</td></tr>
                <tr className="table-light"><th colSpan={2}>Equity</th></tr>
                {rows(data.equity, 'e')}
                <tr className="fw-semibold"><td>Total equity</td><td className="text-end">{money(data.totalEquity)}</td></tr>
              </tbody>
              <tfoot><tr className="table-primary"><th>Total liabilities &amp; equity</th><th className="text-end bs-le">{money(data.totalLiabilitiesAndEquity)}</th></tr></tfoot>
            </table></div>
          </div></div>
        </div>
      )}
    </>
  );
};

export default LedgerBalanceSheet;
