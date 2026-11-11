import React, { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import pharmacyService, { ReturnableSale, apiError } from '../../services/pharmacyService';
import { money } from './ReportTable';

type Condition = 'Saleable' | 'Damaged' | 'Expired';
interface LineState { qty: string; condition: Condition }

interface Props { show: boolean; onClose: () => void; onSaved: () => void }

/**
 * Return against the original bill: only what was sold can come back, saleable stock
 * goes back into the batch it was sold from, damaged or expired items are recorded only.
 */
const BillReturnModal: React.FC<Props> = ({ show, onClose, onSaved }) => {
  const [billNo, setBillNo] = useState('');
  const [sale, setSale] = useState<ReturnableSale | null>(null);
  const [lines, setLines] = useState<Record<number, LineState>>({});
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [finding, setFinding] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!show) return null;

  const reset = () => { setBillNo(''); setSale(null); setLines({}); setRefundMethod('Cash'); };
  const close = () => { reset(); onClose(); };

  const find = async () => {
    if (!billNo.trim()) return;
    setFinding(true);
    try {
      const id = await pharmacyService.findSaleByReference(billNo.trim());
      const s = await pharmacyService.getReturnable(id);
      setSale(s);
      setLines(Object.fromEntries(s.items.map((i) => [i.saleItemId, { qty: '', condition: 'Saleable' as Condition }])));
      setRefundMethod(s.customerId ? 'Cash' : 'Cash');
    } catch (err) {
      setSale(null);
      Swal.fire({ icon: 'warning', title: 'Bill not found', text: apiError(err, `No bill ${billNo}.`) });
    } finally {
      setFinding(false);
    }
  };

  const chosen = sale ? sale.items.filter((i) => Number(lines[i.saleItemId]?.qty) > 0) : [];
  const refund = chosen.reduce((s, i) => s + Number(lines[i.saleItemId].qty) * i.unitPrice, 0);

  const save = async () => {
    if (!sale || chosen.length === 0) { Swal.fire({ icon: 'info', title: 'Enter a quantity to return' }); return; }
    const over = chosen.find((i) => Number(lines[i.saleItemId].qty) > i.returnableQuantity);
    if (over) { Swal.fire({ icon: 'warning', title: 'Too many', text: `Only ${over.returnableQuantity} of ${over.productName} can still be returned.` }); return; }
    setSaving(true);
    try {
      const total = Math.round(refund * 100) / 100;
      const paidOut = refundMethod === 'Credit note' ? 0 : total;
      await api.post('/salesreturns', {
        saleId: sale.id,
        refundMethod,
        customerId: sale.customerId,
        customerName: sale.customerName,
        productName: chosen[0].productName,
        productId: chosen[0].productId,
        orderTax: 0, discount: 0, shipping: 0,
        grandTotal: total, paid: paidOut, due: total - paidOut,
        status: 'Received',
        paymentStatus: paidOut >= total ? 'Paid' : 'Unpaid',
        returnDate: new Date().toISOString(),
        items: chosen.map((i) => {
          const qty = Number(lines[i.saleItemId].qty);
          return {
            productId: i.productId, saleItemId: i.saleItemId, productName: i.productName,
            netUnitPrice: i.unitPrice, stock: 0, quantity: qty, discount: 0, taxPercent: 0,
            subtotal: Math.round(qty * i.unitPrice * 100) / 100, condition: lines[i.saleItemId].condition,
          };
        }),
      });
      const back = chosen.filter((i) => lines[i.saleItemId].condition === 'Saleable').length;
      Swal.fire({ icon: 'success', title: 'Return saved', text: `Refund Rs ${money(total)} (${refundMethod}). ${back} item(s) back in stock.` });
      reset();
      onSaved();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not save the return', text: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Return from bill">
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Return from bill</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={close} />
            </div>
            <div className="modal-body">
              <div className="d-flex gap-2 mb-3" style={{ maxWidth: 420 }}>
                <input className="form-control" placeholder="Bill number, e.g. SL104" value={billNo} autoFocus
                  onChange={(e) => setBillNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void find(); }} aria-label="Bill number" />
                <button type="button" className="btn btn-primary" onClick={() => void find()} disabled={finding}>
                  {finding ? <span className="spinner-border spinner-border-sm" /> : 'Find'}
                </button>
              </div>

              {sale && (
                <>
                  <p className="mb-2">Bill <b>{sale.reference}</b> · {sale.saleDate} · {sale.customerName} · Rs {money(sale.grandTotal)}</p>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr><th>Medicine</th><th>Batch</th><th className="text-end">Sold</th><th className="text-end">Returned</th><th className="text-end">Price / unit</th><th style={{ width: 110 }}>Return qty</th><th style={{ width: 150 }}>Condition</th><th className="text-end">Refund</th></tr>
                      </thead>
                      <tbody>
                        {sale.items.map((i) => {
                          const l = lines[i.saleItemId] ?? { qty: '', condition: 'Saleable' };
                          const disabled = i.returnableQuantity <= 0;
                          return (
                            <tr key={i.saleItemId} className={disabled ? 'text-muted' : ''}>
                              <td>{i.productName}{i.saleUnit !== 'Unit' && <div className="fs-12 text-muted">sold as {i.unitQuantity} {i.saleUnit.toLowerCase()}(s)</div>}</td>
                              <td className="fs-12">{i.batchInfo}</td>
                              <td className="text-end">{i.soldQuantity}</td>
                              <td className="text-end">{i.returnedQuantity || ''}</td>
                              <td className="text-end">{money(i.unitPrice)}</td>
                              <td>
                                <input type="number" min={0} max={i.returnableQuantity} className="form-control form-control-sm" disabled={disabled}
                                  placeholder={disabled ? 'none left' : `max ${i.returnableQuantity}`} value={l.qty} aria-label={`Return quantity for ${i.productName}`}
                                  onChange={(e) => setLines((p) => ({ ...p, [i.saleItemId]: { ...l, qty: e.target.value } }))} />
                              </td>
                              <td>
                                <select className="form-select form-select-sm" disabled={disabled} value={l.condition} aria-label={`Condition of ${i.productName}`}
                                  onChange={(e) => setLines((p) => ({ ...p, [i.saleItemId]: { ...l, condition: e.target.value as Condition } }))}>
                                  <option value="Saleable">Saleable: back to stock</option>
                                  <option value="Damaged">Damaged: record only</option>
                                  <option value="Expired">Expired: record only</option>
                                </select>
                              </td>
                              <td className="text-end">{money((Number(l.qty) || 0) * i.unitPrice)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted fs-12">Quantities are in single units (tablets, bottles), the same as on the bill.</p>
                  <div className="d-flex justify-content-end align-items-center gap-3 flex-wrap">
                    <label className="d-flex align-items-center gap-2 mb-0">
                      <span>Refund by</span>
                      <select className="form-select form-select-sm" style={{ width: 150 }} value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                        <option>Cash</option>
                        <option>Card</option>
                        {sale.customerId && <option>Credit note</option>}
                      </select>
                    </label>
                    <span className="fw-bold fs-16">Refund Rs {money(refund)}</span>
                    <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving || chosen.length === 0}>
                      {saving && <span className="spinner-border spinner-border-sm me-1" />}Save return
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={close} />
    </>
  );
};

export default BillReturnModal;
