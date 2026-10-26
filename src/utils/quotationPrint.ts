import api from '../services/api';
import { printDocument, openPrintWindow, esc, printMoney } from './printDocument';
import { loadTermsPrintHtml } from './termsConditions';

interface PrintLine { productId: number; productName: string; quantity: number; purchasePrice: number; discount: number; taxPercent: number; totalCost: number }
interface PrintQuotation {
  id: number; reference: string; customerName: string; quotationDate: string; status: string; description?: string | null;
  productId?: number | null; productName?: string; grandTotal: number; orderTax: number; discount: number; shipping: number;
  installationCharges?: number; taxes?: { taxName: string; percent: number; amount: number }[]; termsContent?: string | null;
  items?: PrintLine[];
}
/** product description / model, printed on the quotation (instead of the SKU) */
export interface PrintProductInfo { id: string | number; description?: string; model?: string }

/**
 * One quotation as a customer document on the letterhead (used on Quotations and Staff Approvals).
 * The window opens straight away (inside the click, so it isn't blocked); the full quotation,
 * its terms & conditions and (if not given) the products are loaded into it.
 */
export async function printQuotation(quotationId: number, products?: PrintProductInfo[]) {
  const win = openPrintWindow();
  let q: PrintQuotation;
  try { q = (await api.get<PrintQuotation>(`/quotations/${quotationId}`)).data; }
  catch {
    if (win) win.document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Could not load the quotation.</p>';
    return;
  }
  const list = products ?? await api.get<PrintProductInfo[]>('/products').then((r) => r.data).catch(() => []);
  const info = (productId: number) => {
    const p = list.find((x) => Number(x.id) === Number(productId));
    return { description: (p?.description || '').trim(), model: (p?.model || '').trim() };
  };
  const termsHtml = await loadTermsPrintHtml(q.termsContent);
  const lines: PrintLine[] = q.items && q.items.length > 0 ? q.items
    : [{ productId: q.productId ?? 0, productName: q.productName || '-', quantity: 1, purchasePrice: q.grandTotal, discount: 0, taxPercent: 0, totalCost: q.grandTotal }];
  const subTotal = lines.reduce((sum, l) => sum + (l.totalCost || 0), 0);
  // columns with nothing in them are left out of the printed quotation
  const hasDiscount = lines.some((l) => l.discount > 0);
  const hasTax = lines.some((l) => l.taxPercent > 0);
  const hasDesc = lines.some((l) => info(l.productId).description);
  const hasModel = lines.some((l) => info(l.productId).model);
  const labelCols = 4 + (hasDesc ? 1 : 0) + (hasModel ? 1 : 0) + (hasDiscount ? 1 : 0) + (hasTax ? 1 : 0);
  const rows = lines.map((l, i) => `<tr><td class="c">${i + 1}</td><td>${esc(l.productName)}</td>
    ${hasDesc ? `<td style="white-space:pre-line;font-size:12px">${esc(info(l.productId).description) || '-'}</td>` : ''}
    ${hasModel ? `<td>${esc(info(l.productId).model) || '-'}</td>` : ''}<td class="r">${l.quantity}</td>
    <td class="r">${printMoney(l.purchasePrice)}</td>${hasDiscount ? `<td class="r">${l.discount ? printMoney(l.discount) : '-'}</td>` : ''}
    ${hasTax ? `<td class="r">${l.taxPercent ? esc(l.taxPercent) + '%' : '-'}</td>` : ''}<td class="r">${printMoney(l.totalCost)}</td></tr>`).join('');
  const extra = (label: string, v: number, minus = false) => (v ? `<tr><td colspan="${labelCols}" class="r">${label}</td><td class="r">${minus ? '- ' : ''}${printMoney(v)}</td></tr>` : '');
  printDocument(`Quotation ${q.reference || q.id}`, 'QUOTATION', q.reference || `#${q.id}`, `
    <table class="info" style="margin-bottom:14px"><tbody>
      <tr><th>Customer</th><td>${esc(q.customerName)}</td><th>Date</th><td>${esc(q.quotationDate)}</td></tr>
      <tr><th>Reference</th><td>${esc(q.reference || '-')}</td><th>Status</th><td>${esc(q.status)}</td></tr>
    </tbody></table>
    <table><thead><tr><th class="c" style="width:36px">#</th><th>Product</th>${hasDesc ? '<th>Description</th>' : ''}${hasModel ? '<th>Model</th>' : ''}<th class="r">Qty</th><th class="r">Unit price</th>${hasDiscount ? '<th class="r">Item discount<br><small>(per unit)</small></th>' : ''}${hasTax ? '<th class="r">Tax</th>' : ''}<th class="r">Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="${labelCols}" class="r">Subtotal</td><td class="r">${printMoney(subTotal)}</td></tr>
        ${extra('Overall discount', q.discount, true)}${q.taxes && q.taxes.length > 0 ? q.taxes.map((tx) => extra(`${esc(tx.taxName)} (${tx.percent}%)`, tx.amount)).join('') : extra('Order tax', q.orderTax)}${extra('Shipping', q.shipping)}${extra('Installation, Testing and Commissioning', q.installationCharges || 0)}
        <tr class="total"><th colspan="${labelCols}" class="r">Grand total</th><th class="r">${printMoney(q.grandTotal)}</th></tr>
      </tfoot></table>
    ${q.description ? `<p style="margin-top:14px"><strong>Notes:</strong> ${esc(q.description)}</p>` : ''}
    <div class="sign"><div>Customer signature</div><div>Authorised signature</div></div>
    ${termsHtml}`, win);
}
