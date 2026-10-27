import Swal from 'sweetalert2';
import api from '../services/api';

/** A converted quotation waiting for its goods: no stock taken out, not counted as a sale yet */
export const QUEUED = 'Queued';
export const isQueued = (status?: string | null) => (status || '').trim().toLowerCase() === 'queued';

/** Ask, then mark a queued order as sold (takes the goods out of stock; counted as a sale from today). Returns true when done. */
export async function markQueuedAsSold(sale: { id: number; reference: string; customerName?: string; grandTotal?: number }): Promise<boolean> {
  const ask = await Swal.fire({
    title: `Convert ${sale.reference} to a sale?`,
    html: `The goods${sale.customerName ? ` for <b>${sale.customerName}</b>` : ''} are taken out of stock and the sale${sale.grandTotal ? ` of <b>Rs ${Number(sale.grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>` : ''} is counted from today.`,
    icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, convert to sale', cancelButtonText: 'No', confirmButtonColor: '#28a745',
  });
  if (!ask.isConfirmed) return false;
  try {
    await api.post(`/sales/${sale.id}/mark-sold`);
    await Swal.fire({ icon: 'success', title: 'Converted', text: `${sale.reference} is now a sale.`, timer: 1800, showConfirmButton: false });
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
