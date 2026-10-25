import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { addPurchasePayment, PurchasePayment, PAYMENT_METHODS } from '../../services/purchaseOrderService';

interface PaymentsResult { purchaseId: number; reference: string; total: number; paid: number; due: number; paymentStatus: string; payments: PurchasePayment[] }

interface Props {
  purchase: { id: number; reference: string; supplierName: string; total: number; paid: number };
  onClose: () => void;
  /** called after a payment / refund is saved, with the purchase's new paid amount and payment status */
  onSaved: (r: { paid: number; paymentStatus: string }) => void;
}

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const showDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pay the supplier (now or later, in parts) or record money back, against one purchase; shows the payment history */
const PurchasePaymentModal: React.FC<Props> = ({ purchase, onClose, onSaved }) => {
  const [info, setInfo] = useState<PaymentsResult | null>(null);
  const [loadError, setLoadError] = useState('');
  const [type, setType] = useState<'Payment' | 'Refund'>('Payment');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api.get<PaymentsResult>(`/purchases/${purchase.id}/payments`)
      .then((r) => { setInfo(r.data); setAmount(r.data.due > 0 ? String(round2(r.data.due)) : ''); })
      .catch(() => setLoadError('Could not load the payments of this purchase.'));
  }, [purchase.id]);

  const total = info?.total ?? purchase.total;
  const paid = info?.paid ?? purchase.paid;
  // money actually paid (return credits only lower what is owed, they can't come back as a refund)
  const cashPaid = info ? round2(info.payments.reduce((s, p) => s + (p.method === 'Return credit' ? 0 : p.type === 'Refund' ? -p.amount : p.amount), 0)) : paid;
  const due = round2(total - paid);
  const value = Number(amount) || 0;

  const save = async () => {
    setError('');
    if (value <= 0) { setError('Enter an amount greater than 0.'); return; }
    if (type === 'Refund' && value > cashPaid) { setError(`Only ${money(cashPaid)} has been paid, so at most that much can come back.`); return; }
    setSaving(true);
    try {
      const r = await addPurchasePayment(purchase.id, { type, amount: round2(value), method, date, reference: reference.trim() || undefined, notes: notes.trim() || undefined });
      setInfo({ ...(info as PaymentsResult), ...r, reference: info?.reference ?? purchase.reference });
      onSaved({ paid: r.paid, paymentStatus: r.paymentStatus });
      setSaved(`${type === 'Refund' ? 'Refund' : 'Payment'} of ${money(value)} recorded.`);
      setType('Payment'); setReference(''); setNotes('');
      setAmount(r.due > 0 ? String(round2(r.due)) : '');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Payments - {purchase.reference}</h4>
            <button type="button" className="btn-close" onClick={onClose} disabled={saving} />
          </div>
          <div className="modal-body">
            {loadError && <div className="alert alert-danger py-2">{loadError}</div>}
            <div className="row g-2 mb-3 text-center">
              {[{ l: 'Supplier', v: purchase.supplierName || '-' }, { l: 'Total', v: money(total) }, { l: 'Paid', v: money(paid) },
                { l: due >= 0 ? 'Due' : 'Overpaid', v: money(Math.abs(due)), cls: due > 0 ? 'text-danger' : 'text-success' }].map((c) => (
                <div className="col-6 col-md-3" key={c.l}>
                  <div className="border rounded p-2"><small className="text-muted d-block">{c.l}</small><span className={`fw-semibold ${c.cls || ''}`}>{c.v}</span></div>
                </div>
              ))}
            </div>

            {saved && <div className="alert alert-success py-2">{saved}</div>}

            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label mb-1">Type</label>
                <div className="btn-group w-100">
                  <button type="button" className={`btn ${type === 'Payment' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => { setType('Payment'); setAmount(due > 0 ? String(due) : ''); }}>Pay supplier</button>
                  <button type="button" className={`btn ${type === 'Refund' ? 'btn-warning' : 'btn-outline-warning'}`} disabled={cashPaid <= 0} onClick={() => { setType('Refund'); setAmount(''); }}>Refund</button>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label mb-1">Amount (Rs)</label>
                <input type="number" min={0} step="0.01" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {type === 'Payment' && value > Math.max(0, due) && <small className="text-warning">More than the amount due - it will be recorded as an extra payment.</small>}
              </div>
              <div className="col-md-4">
                <label className="form-label mb-1">Date</label>
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label mb-1">Method</label>
                <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label mb-1">Reference <small className="text-muted">(optional)</small></label>
                <input className="form-control" value={reference} maxLength={60} placeholder="cheque / transfer no." onChange={(e) => setReference(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label mb-1">Notes <small className="text-muted">(optional)</small></label>
                <input className="form-control" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}

            <h6 className="mt-4 mb-2">Payment history</h6>
            {!info ? <div className="text-muted small">Loading...</div> : info.payments.length === 0 ? <div className="text-muted small">Nothing paid yet.</div> : (
              <div className="table-responsive">
                <table className="table table-sm mb-0 align-middle">
                  <thead className="thead-light"><tr><th>Date</th><th>Type</th><th>Reference</th><th>Method</th><th className="text-end">Amount</th><th>Notes</th></tr></thead>
                  <tbody>
                    {info.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="text-nowrap">{showDate(p.date)}</td>
                        <td>{p.method === 'Return credit' ? <span className="badge bg-info" title="Goods returned - deducted from what is owed">Return credit</span> : p.type === 'Refund' ? <span className="badge bg-warning">Refund (in)</span> : <span className="badge bg-success">Payment (out)</span>}</td>
                        <td>{p.reference || '-'}</td>
                        <td>{p.method}</td>
                        <td className="text-end text-nowrap">{p.type === 'Refund' ? '- ' : ''}{money(p.amount)}</td>
                        <td><small>{p.notes || ''}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Close</button>
            <button type="button" className={`btn ${type === 'Refund' ? 'btn-warning' : 'btn-success'}`} onClick={save} disabled={saving || !info}>
              {saving ? 'Saving...' : type === 'Refund' ? 'Record refund' : 'Record payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasePaymentModal;
