import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import ReportTable, { Column, money } from '../../components/pharmacy/ReportTable';
import Modal from '../../components/suite/Modal';
import suite, { CustomerAccount, CustomerBalance, PriceLevel, Statement, today } from '../../services/suiteService';
import pharmacyService, { apiError } from '../../services/pharmacyService';

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

/** Credit customers: balances, terms, on-account receipts and statements. */
const CustomerAccounts: React.FC = () => {
  const [rows, setRows] = useState<CustomerBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dueOnly, setDueOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<PriceLevel[]>([]);
  const [terms, setTerms] = useState<CustomerAccount | null>(null);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [stFrom, setStFrom] = useState(daysAgo(90));
  const [stTo, setStTo] = useState(today());
  const [receiveFor, setReceiveFor] = useState<CustomerBalance | null>(null);
  const [rc, setRc] = useState({ amount: '', paymentMethod: 'Cash', chequeNo: '', notes: '', receiptDate: today() });
  const [busy, setBusy] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await suite.balances(search || undefined, dueOnly);
      setRows(r.rows);
      setTotal(r.totalReceivable);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not load accounts', text: apiError(err) }); }
    finally { setLoading(false); }
  }, [search, dueOnly]);
  useEffect(() => { void load(); }, [dueOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    suite.priceLevels().then(setLevels).catch(() => setLevels([]));
    pharmacyService.getSettings().then((s) => setPharmacyName(s.pharmacyName)).catch(() => undefined);
  }, []);

  const openTerms = async (id: number) => {
    try { setTerms(await suite.account(id)); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
  };

  const saveTerms = async () => {
    if (!terms) return;
    setBusy(true);
    try {
      await suite.saveAccount(terms.id, terms);
      setTerms(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const openStatement = async (id: number, from = stFrom, to = stTo) => {
    try { setStatement(await suite.statement(id, from, to)); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load statement', text: apiError(err) }); }
  };

  const receive = async () => {
    if (!receiveFor) return;
    const amount = Number(rc.amount);
    if (!(amount > 0)) { Swal.fire({ icon: 'info', title: 'Enter an amount' }); return; }
    setBusy(true);
    try {
      const r = await suite.receive({ customerId: receiveFor.id, amount, paymentMethod: rc.paymentMethod, chequeNo: rc.chequeNo || undefined, notes: rc.notes || undefined, receiptDate: rc.receiptDate });
      Swal.fire({ icon: 'success', title: `Receipt ${r.reference}`, html: `Rs ${money(r.amount)} received.<br/>Applied to bills: Rs ${money(r.allocated)}${r.advance > 0 ? `<br/>Kept as advance: Rs ${money(r.advance)}` : ''}<br/>Balance now: <b>Rs ${money(r.balance)}</b>` });
      setReceiveFor(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not record the receipt', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const adjust = async (c: CustomerBalance) => {
    const { value, isConfirmed } = await Swal.fire({
      title: `Adjust ${c.fullName}'s account`,
      html: '<select id="aj-type" class="form-select mb-2"><option value="Adjustment">Adjustment</option><option value="Opening">Opening balance</option><option value="WriteOff">Write off (bad debt)</option></select>'
        + '<select id="aj-dir" class="form-select mb-2"><option value="credit">Reduce what they owe</option><option value="debit">Increase what they owe</option></select>'
        + '<input id="aj-amt" type="number" min="1" class="form-control mb-2" placeholder="Amount (Rs)"><input id="aj-note" class="form-control" placeholder="Reason">',
      showCancelButton: true, confirmButtonText: 'Save',
      preConfirm: () => {
        const amt = Number((document.getElementById('aj-amt') as HTMLInputElement).value);
        if (!(amt > 0)) { Swal.showValidationMessage('Enter an amount'); return false; }
        const dir = (document.getElementById('aj-dir') as HTMLSelectElement).value;
        return { entryType: (document.getElementById('aj-type') as HTMLSelectElement).value, debit: dir === 'debit' ? amt : 0, credit: dir === 'credit' ? amt : 0,
          narration: (document.getElementById('aj-note') as HTMLInputElement).value };
      },
    });
    if (!isConfirmed || !value) return;
    try { await suite.addAdjustment({ customerId: c.id, ...value }); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  const printStatement = () => {
    if (!statement) return;
    const s = statement;
    const rowsHtml = s.rows.map((r) => `<tr><td>${r.date}</td><td>${r.type}</td><td>${r.reference}</td><td>${r.narration ?? ''}</td><td class="n">${r.debit ? money(r.debit) : ''}</td><td class="n">${r.credit ? money(r.credit) : ''}</td><td class="n">${money(r.balance)}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Statement</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:5px;text-align:left}.n{text-align:right}h2{margin:0}</style></head><body>
      <h2>${pharmacyName || 'Statement of account'}</h2><p>Statement for <b>${s.customer.fullName}</b>${s.customer.phone ? ` · ${s.customer.phone}` : ''}${s.customer.ntn ? ` · NTN ${s.customer.ntn}` : ''}<br/>${s.from ?? 'Start'} to ${s.to ?? today()}</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Details</th><th class="n">Debit</th><th class="n">Credit</th><th class="n">Balance</th></tr></thead>
      <tbody><tr><td colspan="6">Opening balance</td><td class="n">${money(s.openingBalance)}</td></tr>${rowsHtml}</tbody>
      <tfoot><tr><th colspan="4">Closing balance</th><th class="n">${money(s.totalDebit)}</th><th class="n">${money(s.totalCredit)}</th><th class="n">${money(s.closingBalance)}</th></tr></tfoot></table>
      ${s.overdueBills ? `<p><b>${s.overdueBills} bill(s) overdue: Rs ${money(s.overdueAmount)}</b></p>` : ''}</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const shareStatement = () => {
    if (!statement) return;
    const s = statement;
    const text = `${pharmacyName ? pharmacyName + '\n' : ''}Statement for ${s.customer.fullName}\n${s.from ?? 'Start'} to ${s.to ?? today()}\nOpening: Rs ${money(s.openingBalance)}\nBills: Rs ${money(s.totalDebit)}\nPaid / credited: Rs ${money(s.totalCredit)}\nBalance due: Rs ${money(s.closingBalance)}${s.overdueBills ? `\nOverdue: Rs ${money(s.overdueAmount)}` : ''}`;
    const phone = (s.customer.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const cols: Column<CustomerBalance>[] = [
    { key: 'fullName', label: 'Customer', render: (r) => <>{r.fullName}{r.customerType && <span className="badge bg-light text-dark ms-2">{r.customerType}</span>}{r.creditBlocked && <span className="badge bg-danger ms-1">On hold</span>}<div className="text-muted fs-12">{r.phone}</div></>, value: (r) => r.fullName },
    { key: 'creditLimit', label: 'Limit (Rs)', align: 'end', render: (r) => (r.creditLimit != null ? money(r.creditLimit) : 'No limit'), value: (r) => r.creditLimit ?? '' },
    { key: 'creditDays', label: 'Days', align: 'end' },
    { key: 'oldestDueDays', label: 'Oldest due', align: 'end', render: (r) => (r.oldestDueDays != null ? <span className={r.overdue ? 'text-danger fw-bold' : ''}>{r.oldestDueDays} days</span> : '') },
    { key: 'advance', label: 'Advance (Rs)', align: 'end', money: true },
    { key: 'balance', label: 'Balance (Rs)', align: 'end', money: true, total: true, render: (r) => <span className={r.overLimit ? 'text-danger fw-bold' : r.balance > 0 ? 'fw-medium' : 'text-success'}>{money(r.balance)}</span> },
    {
      key: 'act', label: '', value: () => '', render: (r) => (
        <div className="d-flex gap-1 justify-content-end">
          <button type="button" className="btn btn-sm btn-success" onClick={() => { setReceiveFor(r); setRc({ amount: r.balance > 0 ? String(Math.round(r.balance)) : '', paymentMethod: 'Cash', chequeNo: '', notes: '', receiptDate: today() }); }}>Receive</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void openStatement(r.id)}>Statement</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void openTerms(r.id)}>Terms</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void adjust(r)} aria-label="Adjust"><i className="ti ti-adjustments" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Customer Accounts" subtitle="Credit customers: what they owe, their limits, payments and statements." breadcrumbs={[{ title: 'Sales' }, { title: 'Customer Accounts' }]} />
      <ReportTable title="Customer accounts" filename="customer-accounts" columns={cols} rows={rows} loading={loading}
        summary={[{ label: 'Total receivable (Rs)', value: money(total) }, { label: 'Over limit', value: rows.filter((r) => r.overLimit).length }, { label: 'Overdue', value: rows.filter((r) => r.overdue).length }]}
        toolbar={<>
          <input className="form-control form-control-sm" style={{ width: 220 }} placeholder="Name or phone" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load()} aria-label="Search customers" />
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void load()}>Search</button>
          <label className="form-check mb-0 ms-2"><input type="checkbox" className="form-check-input" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} /><span className="form-check-label">Only customers who owe</span></label>
        </>} />

      <Modal show={!!receiveFor} title={`Receive payment: ${receiveFor?.fullName ?? ''}`} onClose={() => setReceiveFor(null)}
        footer={<><button type="button" className="btn btn-light" onClick={() => setReceiveFor(null)}>Cancel</button>
          <button type="button" className="btn btn-success" disabled={busy} onClick={() => void receive()}>Save receipt</button></>}>
        <p className="fs-13">Balance: <b>Rs {money(receiveFor?.balance)}</b>. The payment settles the oldest bills first; anything extra is kept as an advance.</p>
        <div className="row g-2">
          <div className="col-6"><label className="form-label">Amount (Rs)</label><input type="number" min={1} className="form-control" value={rc.amount} onChange={(e) => setRc({ ...rc, amount: e.target.value })} /></div>
          <div className="col-6"><label className="form-label">Paid by</label>
            <select className="form-select" value={rc.paymentMethod} onChange={(e) => setRc({ ...rc, paymentMethod: e.target.value })}><option>Cash</option><option>Card</option><option>Bank</option><option>Cheque</option></select></div>
          {rc.paymentMethod === 'Cheque' && <div className="col-6"><label className="form-label">Cheque no.</label><input className="form-control" value={rc.chequeNo} onChange={(e) => setRc({ ...rc, chequeNo: e.target.value })} /></div>}
          <div className="col-6"><label className="form-label">Date</label><input type="date" className="form-control" value={rc.receiptDate} onChange={(e) => setRc({ ...rc, receiptDate: e.target.value })} /></div>
          <div className="col-12"><label className="form-label">Notes</label><input className="form-control" value={rc.notes} onChange={(e) => setRc({ ...rc, notes: e.target.value })} /></div>
        </div>
      </Modal>

      <Modal show={!!terms} title={`Credit terms: ${terms?.fullName ?? ''}`} onClose={() => setTerms(null)}
        footer={<><button type="button" className="btn btn-light" onClick={() => setTerms(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveTerms()}>Save</button></>}>
        {terms && (
          <div className="row g-2">
            <div className="col-12 fs-13 mb-1">Balance Rs <b>{money(terms.balance)}</b>{terms.available != null && <> · available Rs {money(terms.available)}</>}{terms.overdueBills > 0 && <span className="text-danger"> · {terms.overdueBills} overdue</span>}</div>
            <div className="col-6"><label className="form-label">Customer type</label>
              <select className="form-select" value={terms.customerType ?? ''} onChange={(e) => setTerms({ ...terms, customerType: e.target.value || null })}>
                <option value="">Retail</option><option>Wholesale</option><option>Distributor</option><option>Institution</option>
              </select></div>
            <div className="col-6"><label className="form-label">Price level</label>
              <select className="form-select" value={terms.priceLevelId ?? ''} onChange={(e) => setTerms({ ...terms, priceLevelId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Normal price</option>{levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
            <div className="col-6"><label className="form-label">Credit limit (Rs)</label>
              <input type="number" min={0} className="form-control" placeholder="No limit" value={terms.creditLimit ?? ''} onChange={(e) => setTerms({ ...terms, creditLimit: e.target.value === '' ? null : Number(e.target.value) })} /></div>
            <div className="col-6"><label className="form-label">Credit days</label>
              <input type="number" min={0} className="form-control" placeholder="Not set" value={terms.creditDays ?? ''} onChange={(e) => setTerms({ ...terms, creditDays: e.target.value === '' ? null : Number(e.target.value) })} /></div>
            <div className="col-6"><label className="form-label">Opening balance (Rs)</label>
              <input type="number" className="form-control" value={terms.openingBalance} onChange={(e) => setTerms({ ...terms, openingBalance: Number(e.target.value) })} /></div>
            <div className="col-6"><label className="form-label">NTN</label><input className="form-control" value={terms.ntn ?? ''} onChange={(e) => setTerms({ ...terms, ntn: e.target.value })} /></div>
            <div className="col-6"><label className="form-label">STRN</label><input className="form-control" value={terms.strn ?? ''} onChange={(e) => setTerms({ ...terms, strn: e.target.value })} /></div>
            <div className="col-6 d-flex align-items-end"><label className="form-check"><input type="checkbox" className="form-check-input" checked={terms.creditBlocked} onChange={(e) => setTerms({ ...terms, creditBlocked: e.target.checked })} /><span className="form-check-label">Put credit on hold</span></label></div>
          </div>
        )}
      </Modal>

      <Modal show={!!statement} title={`Statement: ${statement?.customer.fullName ?? ''}`} onClose={() => setStatement(null)} size="xl"
        footer={<><button type="button" className="btn btn-outline-success" onClick={shareStatement}><i className="ti ti-brand-whatsapp me-1" />WhatsApp</button>
          <button type="button" className="btn btn-primary" onClick={printStatement}><i className="ti ti-printer me-1" />Print</button></>}>
        {statement && (
          <>
            <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
              <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={stFrom} onChange={(e) => setStFrom(e.target.value)} aria-label="From" />
              <span>to</span>
              <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={stTo} onChange={(e) => setStTo(e.target.value)} aria-label="To" />
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void openStatement(statement.customer.id, stFrom, stTo)}>Show</button>
              <span className="ms-auto fs-13">Current balance <b>Rs {money(statement.currentBalance)}</b>{statement.overdueBills > 0 && <span className="text-danger"> · Rs {money(statement.overdueAmount)} overdue</span>}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Details</th><th className="text-end">Debit</th><th className="text-end">Credit</th><th className="text-end">Balance</th></tr></thead>
                <tbody>
                  <tr className="table-light"><td colSpan={6}>Opening balance</td><td className="text-end">{money(statement.openingBalance)}</td></tr>
                  {statement.rows.map((r, i) => (
                    <tr key={i}><td>{r.date}</td><td>{r.type}</td><td>{r.reference}</td><td className="fs-12">{r.narration}</td>
                      <td className="text-end">{r.debit ? money(r.debit) : ''}</td><td className="text-end">{r.credit ? money(r.credit) : ''}</td><td className="text-end fw-medium">{money(r.balance)}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr className="fw-bold"><td colSpan={4}>Closing balance</td><td className="text-end">{money(statement.totalDebit)}</td><td className="text-end">{money(statement.totalCredit)}</td><td className="text-end">{money(statement.closingBalance)}</td></tr></tfoot>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default CustomerAccounts;
