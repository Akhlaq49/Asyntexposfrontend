import api from '../services/api';
import { printDocument, openPrintWindow, esc, printMoney } from './printDocument';
import { loadTermsPrintHtml } from './termsConditions';

/* Single-document prints on the letterhead: sale invoice, purchase, sales return, expense voucher. */

const day = (d?: string | null) => {
  if (!d) return '-';
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const row = (label: string, value: number, opts: { minus?: boolean; total?: boolean; cols: number }) =>
  `<tr${opts.total ? ' class="total"' : ''}><${opts.total ? 'th' : 'td'} colspan="${opts.cols - 1}" class="r">${esc(label)}</${opts.total ? 'th' : 'td'}><${opts.total ? 'th' : 'td'} class="r">${opts.minus ? '- ' : ''}${printMoney(value)}</${opts.total ? 'th' : 'td'}></tr>`;

/* ---------------- sale invoice ---------------- */

export interface PrintableSale {
  id: number; reference: string; customerName: string; biller?: string; saleDate: string;
  status?: string; paymentStatus?: string; notes?: string | null;
  orderTax: number; discount: number; shipping: number; grandTotal: number; paid: number; due: number;
  /** installation, testing and commissioning (sales made from a quotation) */
  installationCharges?: number;
  items: { productName: string; quantity: number; purchasePrice: number; discount: number; unitCost: number; totalCost: number }[];
  payments: { reference: string; payingAmount: number; paymentType: string; paymentDate: string; description?: string | null }[];
  taxes?: { taxName: string; percent: number; amount: number }[];
  quotationReference?: string | null; quotationTerms?: string | null;
}

/** Sale invoice: items, taxes, totals, payments - and the quotation's terms when the sale came from one */
export async function printSaleInvoice(sale: PrintableSale) {
  const win = openPrintWindow();
  let s = sale;
  try { s = (await api.get<PrintableSale>(`/sales/${sale.id}`)).data; } catch { /* print what the list has */ }
  const terms = s.quotationReference ? await loadTermsPrintHtml(s.quotationTerms) : '';
  const saleDisc = s.items.some((i) => i.discount > 0);   // no discount anywhere -> no discount column
  const saleCols = saleDisc ? 6 : 5;
  const items = s.items.map((i, n) => `<tr><td class="c">${n + 1}</td><td>${esc(i.productName)}</td><td class="r">${i.quantity}</td>
    <td class="r">${printMoney(i.purchasePrice)}</td>${saleDisc ? `<td class="r">${i.discount ? printMoney(i.discount) : '-'}</td>` : ''}<td class="r">${printMoney(i.totalCost)}</td></tr>`).join('');
  const subTotal = s.items.reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const taxRows = s.taxes && s.taxes.length
    ? s.taxes.map((t) => row(`${t.taxName} (${t.percent}%)`, t.amount, { cols: saleCols })).join('')
    : (s.orderTax ? row('Order tax', s.orderTax, { cols: saleCols }) : '');
  const payRows = s.payments.map((p) => `<tr><td>${esc(day(p.paymentDate))}</td><td>${esc(p.reference || '-')}</td><td>${esc(p.paymentType)}</td><td>${esc(p.description || '-')}</td><td class="r">${printMoney(p.payingAmount)}</td></tr>`).join('');
  printDocument(`Invoice ${s.reference}`, 'SALES INVOICE', s.reference, `
    <table class="info" style="margin-bottom:14px"><tbody>
      <tr><th>Customer</th><td>${esc(s.customerName)}</td><th>Date</th><td>${esc(day(s.saleDate))}</td></tr>
      <tr><th>Sold by</th><td>${esc(s.biller || '-')}</td><th>Payment</th><td>${esc(s.paymentStatus || '-')}</td></tr>
      ${s.quotationReference ? `<tr><th>Quotation</th><td>${esc(s.quotationReference)}</td><th>Status</th><td>${esc(s.status || '-')}</td></tr>` : ''}
    </tbody></table>
    <table><thead><tr><th class="c" style="width:36px">#</th><th>Product</th><th class="r">Qty</th><th class="r">Unit price</th>${saleDisc ? '<th class="r">Item discount<br><small>(per unit)</small></th>' : ''}<th class="r">Total</th></tr></thead>
      <tbody>${items}</tbody>
      <tfoot>
        ${row('Subtotal', subTotal, { cols: saleCols })}
        ${s.discount ? row('Overall discount', s.discount, { cols: saleCols, minus: true }) : ''}${taxRows}${s.shipping ? row('Shipping', s.shipping, { cols: saleCols }) : ''}${s.installationCharges ? row('Installation, Testing and Commissioning', s.installationCharges, { cols: saleCols }) : ''}
        ${row('Grand total', s.grandTotal, { cols: saleCols, total: true })}
        ${row('Paid', s.paid, { cols: saleCols })}
        ${row(s.due > 0 ? 'Balance due' : 'Balance', Math.max(0, s.due), { cols: saleCols, total: true })}
      </tfoot></table>
    <h3 style="font-size:15px;margin:18px 0 6px">Payments received</h3>
    ${payRows ? `<table><thead><tr><th>Date</th><th>Reference</th><th>Method</th><th>Notes</th><th class="r">Amount</th></tr></thead><tbody>${payRows}</tbody></table>` : '<p style="color:#555">No payment received yet.</p>'}
    ${s.notes ? `<p style="margin-top:14px"><strong>Notes:</strong> ${esc(s.notes)}</p>` : ''}
    <div class="sign"><div>Customer signature</div><div>Authorised signature</div></div>
    ${terms}`, win, { stamp: true });
}

/* ---------------- purchase ---------------- */

export interface PrintablePurchase {
  id: number; reference: string; supplierName: string; supplierRef?: string; date: string; status: string; paymentStatus: string;
  orderTax: number; discount: number; shipping: number; total: number; paid: number; due: number; notes?: string;
  items?: { productName: string; quantity: number; purchasePrice: number; discount: number; taxAmount: number; totalCost: number }[];
}

/** Purchase voucher: items, totals and every payment / refund made to the supplier */
export async function printPurchase(purchase: PrintablePurchase) {
  const win = openPrintWindow();
  let p = purchase;
  let payments: { type: string; amount: number; method: string; reference?: string | null; date: string; notes?: string | null; createdBy?: string | null }[] = [];
  try {
    const [full, pays] = await Promise.all([
      api.get<PrintablePurchase>(`/purchases/${purchase.id}`).then((r) => r.data),
      api.get<{ payments: typeof payments }>(`/purchases/${purchase.id}/payments`).then((r) => r.data.payments).catch(() => []),
    ]);
    p = full; payments = pays;
  } catch { /* print what the list has */ }
  const pDisc = (p.items || []).some((i) => i.discount > 0), pTax = (p.items || []).some((i) => i.taxAmount > 0);
  const pCols = 5 + (pDisc ? 1 : 0) + (pTax ? 1 : 0);
  const items = (p.items || []).map((i, n) => `<tr><td class="c">${n + 1}</td><td>${esc(i.productName)}</td><td class="r">${i.quantity}</td>
    <td class="r">${printMoney(i.purchasePrice)}</td>${pDisc ? `<td class="r">${i.discount ? printMoney(i.discount) : '-'}</td>` : ''}${pTax ? `<td class="r">${i.taxAmount ? printMoney(i.taxAmount) : '-'}</td>` : ''}<td class="r">${printMoney(i.totalCost)}</td></tr>`).join('');
  const payRows = payments.map((x) => `<tr><td>${esc(day(x.date))}</td><td>${x.type === 'Refund' ? 'Refund from supplier' : 'Payment to supplier'}</td><td>${esc(x.method)}</td>
    <td>${esc(x.reference || '-')}</td><td>${esc(x.notes || '-')}</td><td class="r">${x.type === 'Refund' ? '- ' : ''}${printMoney(x.amount)}</td></tr>`).join('');
  printDocument(`Purchase ${p.reference}`, 'PURCHASE', p.reference, `
    <table class="info" style="margin-bottom:14px"><tbody>
      <tr><th>Supplier</th><td>${esc(p.supplierName)}</td><th>Date</th><td>${esc(day(p.date))}</td></tr>
      <tr><th>Supplier ref.</th><td>${esc(p.supplierRef || '-')}</td><th>Status</th><td>${esc(p.status)} / ${esc(p.paymentStatus)}</td></tr>
    </tbody></table>
    <table><thead><tr><th class="c" style="width:36px">#</th><th>Product</th><th class="r">Qty</th><th class="r">Unit cost</th>${pDisc ? '<th class="r">Discount</th>' : ''}${pTax ? '<th class="r">Tax</th>' : ''}<th class="r">Total</th></tr></thead>
      <tbody>${items || `<tr><td colspan="${pCols}" class="c">No product lines</td></tr>`}</tbody>
      <tfoot>
        ${p.orderTax ? row('Order tax', p.orderTax, { cols: pCols }) : ''}${p.discount ? row('Discount', p.discount, { cols: pCols, minus: true }) : ''}${p.shipping ? row('Shipping / charges', p.shipping, { cols: pCols }) : ''}
        ${row('Total', p.total, { cols: pCols, total: true })}
        ${row('Paid', p.paid, { cols: pCols })}
        ${row(p.due < 0 ? 'Overpaid' : 'Balance due', Math.abs(p.due), { cols: pCols, total: true })}
      </tfoot></table>
    <h3 style="font-size:15px;margin:18px 0 6px">Payments</h3>
    ${payRows ? `<table><thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Reference</th><th>Notes</th><th class="r">Amount</th></tr></thead><tbody>${payRows}</tbody></table>` : '<p style="color:#555">No payment made yet.</p>'}
    ${p.notes ? `<p style="margin-top:14px"><strong>Notes:</strong> ${esc(p.notes)}</p>` : ''}
    <div class="sign"><div>Received by</div><div>Supplier signature</div></div>`, win, { stamp: true });
}

/* ---------------- sales return ---------------- */

export interface PrintableSalesReturn {
  id: number; reference: string; customerName: string; returnDate: string; status: string; paymentStatus: string;
  orderTax: number; discount: number; shipping: number; grandTotal: number; paid: number; due: number;
  items: { productName: string; netUnitPrice: number; quantity: number; discount: number; taxPercent: number; subtotal: number }[];
}

/** Sales return: loads the full return (the list has no product lines) */
export async function printSalesReturn(ret: PrintableSalesReturn) {
  const win = openPrintWindow();
  let r = ret;
  try { r = (await api.get<PrintableSalesReturn>(`/salesreturns/${ret.id}`)).data; } catch { /* print what the list has */ }
  const rDisc = r.items.some((i) => i.discount > 0), rTax = r.items.some((i) => i.taxPercent > 0);
  const rCols = 5 + (rDisc ? 1 : 0) + (rTax ? 1 : 0);
  const items = r.items.map((i, n) => `<tr><td class="c">${n + 1}</td><td>${esc(i.productName)}</td><td class="r">${i.quantity}</td>
    <td class="r">${printMoney(i.netUnitPrice)}</td>${rDisc ? `<td class="r">${i.discount ? printMoney(i.discount) : '-'}</td>` : ''}${rTax ? `<td class="r">${i.taxPercent ? `${i.taxPercent}%` : '-'}</td>` : ''}<td class="r">${printMoney(i.subtotal)}</td></tr>`).join('');
  printDocument(`Sales return ${r.reference}`, 'SALES RETURN', r.reference, `
    <table class="info" style="margin-bottom:14px"><tbody>
      <tr><th>Customer</th><td>${esc(r.customerName)}</td><th>Return date</th><td>${esc(day(r.returnDate))}</td></tr>
      <tr><th>Status</th><td>${esc(r.status)}</td><th>Payment</th><td>${esc(r.paymentStatus)}</td></tr>
    </tbody></table>
    <table><thead><tr><th class="c" style="width:36px">#</th><th>Product</th><th class="r">Qty returned</th><th class="r">Unit price</th>${rDisc ? '<th class="r">Discount</th>' : ''}${rTax ? '<th class="r">Tax</th>' : ''}<th class="r">Total</th></tr></thead>
      <tbody>${items || `<tr><td colspan="${rCols}" class="c">No product lines</td></tr>`}</tbody>
      <tfoot>
        ${r.orderTax ? row('Order tax', r.orderTax, { cols: rCols }) : ''}${r.discount ? row('Discount', r.discount, { cols: rCols, minus: true }) : ''}${r.shipping ? row('Shipping', r.shipping, { cols: rCols }) : ''}
        ${row('Return total', r.grandTotal, { cols: rCols, total: true })}
        ${row('Refunded', r.paid, { cols: rCols })}
        ${row('Still to refund', Math.max(0, r.due), { cols: rCols, total: true })}
      </tfoot></table>
    <div class="sign"><div>Customer signature</div><div>Authorised signature</div></div>`, win, { stamp: true });
}

/* ---------------- expense voucher ---------------- */

export interface PrintableExpense { reference: string; expenseName: string; categoryName: string; description: string; date: string; amount: number; status: string }

export function printExpense(e: PrintableExpense) {
  printDocument(`Expense ${e.reference}`, 'EXPENSE VOUCHER', e.reference, `
    <table class="info" style="margin-bottom:14px"><tbody>
      <tr><th>Expense</th><td>${esc(e.expenseName || '-')}</td><th>Date</th><td>${esc(day(e.date))}</td></tr>
      <tr><th>Category</th><td>${esc(e.categoryName || '-')}</td><th>Status</th><td>${esc(e.status)}</td></tr>
    </tbody></table>
    <table><thead><tr><th>Description</th><th class="r" style="width:180px">Amount</th></tr></thead>
      <tbody><tr><td>${esc(e.description || e.expenseName || '-')}</td><td class="r">${printMoney(e.amount)}</td></tr></tbody>
      <tfoot><tr class="total"><th class="r">Total paid</th><th class="r">${printMoney(e.amount)}</th></tr></tfoot></table>
    <div class="sign"><div>Paid by</div><div>Received by</div></div>`);
}
