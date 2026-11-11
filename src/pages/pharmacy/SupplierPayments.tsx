import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import ReportTable, { Column, money } from '../../components/pharmacy/ReportTable';
import pharmacyService, { SupplierDue, apiError } from '../../services/pharmacyService';

type Ledger = Awaited<ReturnType<typeof pharmacyService.getSupplierLedger>>;

const SupplierPayments: React.FC = () => {
  const [dues, setDues] = useState<SupplierDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDues(await pharmacyService.getSupplierDues()); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load suppliers', text: apiError(err) }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openLedger = async (supplier: string) => {
    setLedgerLoading(true);
    try { setLedger(await pharmacyService.getSupplierLedger(supplier)); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load ledger', text: apiError(err) }); }
    finally { setLedgerLoading(false); }
  };

  const pay = async (d: SupplierDue) => {
    const { value, isConfirmed } = await Swal.fire({
      title: `Pay ${d.supplier}`,
      html:
        `<p class="mb-2">Balance due: <b>Rs ${money(d.balance)}</b>. The payment clears the oldest unpaid purchases first.</p>` +
        `<label class="form-label w-100 text-start">Amount (Rs)<input id="sp-amt" type="number" min="1" class="form-control" value="${Math.max(0, Math.round(d.balance))}"></label>` +
        `<label class="form-label w-100 text-start mt-2">Paid by<select id="sp-type" class="form-select"><option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>Card</option></select></label>` +
        `<label class="form-label w-100 text-start mt-2">Reference (cheque / transfer no.)<input id="sp-ref" class="form-control"></label>` +
        `<label class="form-label w-100 text-start mt-2">Date<input id="sp-date" type="date" class="form-control" value="${new Date().toISOString().slice(0, 10)}"></label>`,
      showCancelButton: true,
      confirmButtonText: 'Record payment',
      preConfirm: () => {
        const amount = Number((document.getElementById('sp-amt') as HTMLInputElement).value);
        if (!(amount > 0)) { Swal.showValidationMessage('Enter an amount above zero'); return false; }
        return {
          amount,
          paymentType: (document.getElementById('sp-type') as HTMLSelectElement).value,
          reference: (document.getElementById('sp-ref') as HTMLInputElement).value || undefined,
          paymentDate: (document.getElementById('sp-date') as HTMLInputElement).value,
        };
      },
    });
    if (!isConfirmed || !value) return;
    try {
      const res = await pharmacyService.paySupplier({ supplierName: d.supplier, ...value });
      Swal.fire({
        icon: 'success', title: 'Payment recorded',
        html: res.applied.map((a) => `${a.reference}: Rs ${money(a.amount)}`).join('<br/>') + (res.advance > 0 ? `<br/>Advance kept: Rs ${money(res.advance)}` : ''),
      });
      void load();
      if (ledger?.supplier === d.supplier) void openLedger(d.supplier);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not record payment', text: apiError(err) });
    }
  };

  const columns: Column<SupplierDue>[] = [
    { key: 'supplier', label: 'Supplier', render: (r) => <button type="button" className="btn btn-link p-0 text-start" onClick={() => void openLedger(r.supplier)}>{r.supplier}</button>, value: (r) => r.supplier },
    { key: 'purchases', label: 'Bills', align: 'end' },
    { key: 'totalPurchased', label: 'Purchased (Rs)', align: 'end', money: true, total: true },
    { key: 'paid', label: 'Paid (Rs)', align: 'end', money: true, total: true },
    { key: 'returns', label: 'Returns (Rs)', align: 'end', money: true, total: true },
    { key: 'balance', label: 'Balance (Rs)', align: 'end', total: true, money: true, render: (r) => <span className={r.balance > 0 ? 'fw-bold text-danger' : 'text-success'}>{money(r.balance)}</span> },
    { key: 'lastPurchase', label: 'Last purchase' },
    {
      key: 'act', label: '', value: () => '',
      render: (r) => (
        <div className="d-flex gap-1 justify-content-end">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void openLedger(r.supplier)}>Ledger</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => void pay(r)} disabled={r.balance <= 0}>Pay</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Supplier Payments" subtitle="What you owe each distributor, payments made and the full ledger" breadcrumbs={[{ title: 'Purchases' }]} />
      <ReportTable title="Supplier Dues" filename="supplier-dues" columns={columns} rows={dues} loading={loading} rowKey={(r) => r.supplier} empty="No supplier purchases yet." />

      {(ledger || ledgerLoading) && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Ledger: {ledger?.supplier}</h5>
            <div className="d-flex align-items-center gap-3">
              {ledger && <span className="fw-bold">Balance Rs {money(ledger.balance)}</span>}
              <button type="button" className="btn-close" aria-label="Close ledger" onClick={() => setLedger(null)} />
            </div>
          </div>
          <div className="card-body p-0">
            {ledgerLoading ? <div className="text-center py-4"><span className="spinner-border spinner-border-sm" /></div> : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th className="text-end">Bill (Rs)</th><th className="text-end">Paid / returned (Rs)</th><th className="text-end">Balance (Rs)</th><th>Notes</th></tr></thead>
                  <tbody>
                    {ledger?.entries.map((e, i) => (
                      <tr key={i}>
                        <td>{e.date}</td>
                        <td><span className={`badge ${e.type === 'Purchase' ? 'bg-primary-transparent text-primary' : e.type === 'Return' ? 'bg-warning text-dark' : 'bg-success-transparent text-success'}`}>{e.type}</span></td>
                        <td>{e.reference}</td>
                        <td className="text-end">{e.debit ? money(e.debit) : ''}</td>
                        <td className="text-end">{e.credit ? money(e.credit) : ''}</td>
                        <td className="text-end fw-medium">{money(e.balance)}</td>
                        <td className="text-muted fs-12">{e.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SupplierPayments;
