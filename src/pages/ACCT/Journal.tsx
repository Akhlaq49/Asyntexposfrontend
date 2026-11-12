import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingService as svc, JournalPage, VOUCHER_LABEL, amount, showDate, monthStart, localDate, errorText } from '../../services/ACCT/accountingService';

/** Accounting > Journal: every entry the documents posted, with its debit and credit lines (they always balance) */
const Journal: React.FC = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(localDate(new Date()));
  const [voucherType, setVoucherType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JournalPage | null>(null);
  const [error, setError] = useState('');
  // collapsed: one row per entry; clicking an entry's row opens or closes just that one
  const [collapsed, setCollapsed] = useState(false);
  const [toggled, setToggled] = useState<Set<number>>(new Set());
  const isOpen = (id: number) => collapsed === toggled.has(id);
  const toggle = (id: number) => setToggled((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setAll = (c: boolean) => { setCollapsed(c); setToggled(new Set()); };

  useEffect(() => {
    const t = setTimeout(() => svc.journal({ from, to, voucherType: voucherType || undefined, search: search || undefined, page, pageSize: 50 })
      .then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e, 'Could not load the journal.'))), 250);
    return () => clearTimeout(t);
  }, [from, to, voucherType, search, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <PageHeader title="Journal" subtitle="Every accounting entry, as the documents posted it" breadcrumbs={[{ title: 'Accounting' }]} />
      <div className="card"><div className="card-body d-flex flex-wrap gap-2 align-items-center">
        <label className="mb-0">From</label><input type="date" className="form-control" style={{ width: 170 }} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <label className="mb-0">to</label><input type="date" className="form-control" style={{ width: 170 }} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <select className="form-select" style={{ width: 200 }} value={voucherType} onChange={(e) => { setVoucherType(e.target.value); setPage(1); }}>
          <option value="">All documents</option>
          {Object.entries(VOUCHER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="form-control" style={{ width: 220 }} placeholder="Reference or description" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {data && <span className="ms-auto text-muted small">{data.total} entr{data.total === 1 ? 'y' : 'ies'}</span>}
        <div className="btn-group btn-group-sm" role="group" aria-label="Show entry lines">
          <button type="button" className={`btn ${!collapsed && toggled.size === 0 ? 'btn-primary' : 'btn-outline-primary'} journal-expand`} onClick={() => setAll(false)}>
            <i className="ti ti-arrows-maximize me-1" />Expand all</button>
          <button type="button" className={`btn ${collapsed && toggled.size === 0 ? 'btn-primary' : 'btn-outline-primary'} journal-collapse`} onClick={() => setAll(true)}>
            <i className="ti ti-arrows-minimize me-1" />Collapse all</button>
        </div>
      </div></div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="card"><div className="card-body p-0">
        <table className="table table-sm align-middle mb-0 journal-table">
          <thead className="thead-light"><tr><th style={{ width: 110 }}>Date</th><th>Account</th><th>Party / note</th><th className="text-end" style={{ width: 130 }}>Debit</th><th className="text-end" style={{ width: 130 }}>Credit</th></tr></thead>
          {!data ? <tbody><tr><td colSpan={5} className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" /></td></tr></tbody>
            : data.entries.length === 0 ? <tbody><tr><td colSpan={5} className="text-center py-4 text-muted">No entries in this period.</td></tr></tbody>
            : data.entries.map((e) => (
              <tbody key={e.id} className="border-bottom" data-entry={e.id}>
                <tr className="table-light" role="button" title={isOpen(e.id) ? 'Hide the lines' : 'Show the lines'} onClick={() => toggle(e.id)}>
                  <td className="text-nowrap"><i className={`ti ${isOpen(e.id) ? 'ti-chevron-down' : 'ti-chevron-right'} me-1 text-muted`} />{showDate(e.date)}</td>
                  <td colSpan={2}><span className="badge bg-light text-dark border me-2">{VOUCHER_LABEL[e.voucherType] || e.voucherType}</span>
                    <b>{e.reference}</b> <span className="text-muted">{e.description}</span></td>
                  {isOpen(e.id) ? <td colSpan={2} />
                    : <><td className="text-end text-muted small">{amount(e.lines.reduce((s, l) => s + l.debit, 0))}</td><td className="text-end text-muted small">{amount(e.lines.reduce((s, l) => s + l.credit, 0))}</td></>}
                </tr>
                {isOpen(e.id) && e.lines.map((l, i) => (
                  <tr key={i}>
                    <td></td>
                    <td style={{ paddingLeft: l.credit ? 40 : 12 }}><Link to={`/account-ledger/${l.accountId}`} className="text-reset"><span className="text-muted me-1">{l.code}</span>{l.account}</Link></td>
                    <td className="small text-muted">{[l.partyName, l.note].filter(Boolean).join(' · ')}</td>
                    <td className="text-end">{amount(l.debit)}</td>
                    <td className="text-end">{amount(l.credit)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
        </table>
      </div>
      {pages > 1 && <div className="card-footer d-flex justify-content-end gap-2 align-items-center">
        <button className="btn btn-sm btn-light border" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="small">Page {page} of {pages}</span>
        <button className="btn btn-sm btn-light border" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>}
      </div>
    </>
  );
};

export default Journal;
