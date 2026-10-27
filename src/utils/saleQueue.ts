import Swal from 'sweetalert2';
import api from '../services/api';

/** A converted quotation waiting for its goods: no stock taken out, not counted as a sale yet */
export const QUEUED = 'Queued';
export const isQueued = (status?: string | null) => (status || '').trim().toLowerCase() === 'queued';

const rs = (n: number) => 'Rs ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

/** Ask (and take the balance still due), then mark a queued order as sold: the goods leave stock, the sale counts from today,
 *  and a fully paid order becomes Completed / Paid. Returns true when done. */
export async function markQueuedAsSold(sale: { id: number; reference: string; customerName?: string; grandTotal?: number; paid?: number; due?: number }): Promise<boolean> {
  const total = Number(sale.grandTotal || 0), paid = Number(sale.paid || 0);
  const due = Math.max(0, sale.due != null ? Number(sale.due) : total - paid);
  const ask = await Swal.fire({
    title: `Convert ${sale.reference} to a sale?`,
    html: `<div style="text-align:left;font-size:14px">
      The goods${sale.customerName ? ` for <b>${sale.customerName}</b>` : ''} are taken out of stock and the sale is counted from today.
      <table style="width:100%;margin:10px 0;font-size:13px">
        <tr><td>Total</td><td style="text-align:right"><b>${rs(total)}</b></td></tr>
        <tr><td>Already paid</td><td style="text-align:right">${rs(paid)}</td></tr>
        <tr><td>Balance due</td><td style="text-align:right;color:${due > 0 ? '#dc3545' : '#28a745'}"><b>${rs(due)}</b></td></tr>
      </table>
      ${due > 0 ? `<label style="font-weight:600">Balance received now</label>
      <input id="ms-amount" type="number" min="0" max="${due}" step="0.01" value="${due}" class="swal2-input" style="width:100%;margin:4px 0 8px">
      <label style="font-weight:600">Payment type</label>
      <select id="ms-type" class="swal2-select" style="width:100%;margin:4px 0"><option>Cash</option><option>Online</option></select>
      <small style="color:#6c757d;display:block;margin-top:6px">Full balance received = Completed / Paid. Less = Pending with the rest due.</small>` : '<small style="color:#28a745">Fully paid - it will be Completed / Paid.</small>'}
    </div>`,
    icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, convert to sale', cancelButtonText: 'No', confirmButtonColor: '#28a745',
    preConfirm: () => {
      if (due <= 0) return { paidAmount: 0, paymentType: 'Cash' };
      const amount = Number((document.getElementById('ms-amount') as HTMLInputElement)?.value || 0);
      if (!(amount >= 0) || amount > due + 0.01) { Swal.showValidationMessage(`Enter an amount from 0 to ${rs(due)}`); return false; }
      return { paidAmount: amount, paymentType: (document.getElementById('ms-type') as HTMLSelectElement)?.value || 'Cash' };
    },
  });
  if (!ask.isConfirmed) return false;
  try {
    const res = await api.post(`/sales/${sale.id}/mark-sold`, ask.value);
    const done = res.data as { status?: string; paymentStatus?: string; due?: number };
    await Swal.fire({ icon: 'success', title: 'Converted', text: `${sale.reference} is now a sale - ${done?.status ?? ''} / ${done?.paymentStatus ?? ''}${done?.due ? `, ${rs(done.due)} still due` : ''}.`, timer: 2400, showConfirmButton: false });
    return true;
  } catch (err: any) {
    await Swal.fire({ icon: 'warning', title: 'Not yet', text: err?.response?.data?.message || 'Could not convert the order to a sale.' });
    return false;
  }
}

/* ── GET /sales/queue ── */
export type QueueStage = 'NotOrdered' | 'Waiting' | 'Ready';
export interface QueueLine { productId: number; productName: string; needed: number; ordered: number; received: number; inStock: number; stage: QueueStage }
export interface QueuePo { id: number; poNumber: string; status: string; supplierName: string; total: number }
export interface QueueOrder {
  saleId: number; reference: string; quotationId?: number | null; quotationReference?: string | null; customerName: string; queuedAt: string;
  grandTotal: number; paid: number; due: number; paymentStatus: string; stage: QueueStage; lines: QueueLine[]; purchaseOrders: QueuePo[];
}
export interface SoldOrder { saleId: number; reference: string; quotationReference?: string | null; customerName: string; saleDate: string; grandTotal: number; paid: number; due: number }
export const getSaleQueue = async () => (await api.get<{ queue: QueueOrder[]; sold: SoldOrder[] }>('/sales/queue')).data;
/** the purchase orders of a queued order that still count (not cancelled) */
export const activePurchaseOrders = (o: QueueOrder) => o.purchaseOrders.filter((p) => p.status !== 'Cancelled');
