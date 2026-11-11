import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import QRCodeLib from 'qrcode';
import { PharmacySettings, SaleDetail, unitLabel } from '../services/pharmacyService';
import suite from '../services/suiteService';
import { isWhatsAppCloudConfigured, sendViaWhatsAppCloudApi, shareViaWhatsApp } from '../utils/pdfWhatsappShare';

const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RECEIPT_TEXT = {
  "bill": [
    "Bill",
    "بل",
    "فاتورة"
  ],
  "cashier": [
    "Cashier",
    "کیشیئر",
    "الكاشير"
  ],
  "customer": [
    "Customer",
    "گاہک",
    "العميل"
  ],
  "patient": [
    "Patient",
    "مریض",
    "المريض"
  ],
  "doctor": [
    "Doctor",
    "ڈاکٹر",
    "الطبيب"
  ],
  "subTotal": [
    "Sub total",
    "ذیلی میزان",
    "المجموع الفرعي"
  ],
  "discount": [
    "Discount",
    "رعایت",
    "الخصم"
  ],
  "salesTax": [
    "Sales tax",
    "سیلز ٹیکس",
    "ضريبة المبيعات"
  ],
  "total": [
    "TOTAL Rs",
    "کل رقم",
    "الإجمالي"
  ],
  "paid": [
    "Paid",
    "ادا شدہ",
    "المدفوع"
  ],
  "cashGiven": [
    "Cash given",
    "دی گئی رقم",
    "المبلغ المستلم"
  ],
  "change": [
    "Change",
    "بقایا",
    "الباقي"
  ],
  "balanceDue": [
    "Balance due",
    "باقی رقم",
    "المبلغ المتبقي"
  ],
  "previousBalance": [
    "Previous balance",
    "سابقہ بقایا",
    "الرصيد السابق"
  ],
  "thisBill": [
    "This bill unpaid",
    "اس بل کا بقایا",
    "غير المدفوع من هذه الفاتورة"
  ],
  "balanceNow": [
    "Balance now",
    "کل بقایا",
    "الرصيد الحالي"
  ]
} as const;

/** Styles used both on screen and inside the print frame. */
const RECEIPT_CSS = `
.rx-receipt{font-family:"Courier New",Consolas,monospace;font-size:12px;line-height:1.45;color:#111;background:#fff;width:76mm;margin:0 auto;padding:4mm 3mm}
.rx-receipt.a4{width:180mm;font-size:13px}
.rx-receipt .c{text-align:center}
.rx-receipt .b{font-weight:bold}
.rx-receipt .big{font-size:15px}
.rx-receipt .muted{color:#444;font-size:11px}
.rx-receipt hr{border:0;border-top:1px dashed #555;margin:6px 0}
.rx-receipt table{width:100%;border-collapse:collapse}
.rx-receipt td{vertical-align:top;padding:1px 0}
.rx-receipt td.r{text-align:right;white-space:nowrap;padding-left:6px}
.rx-receipt .row{display:flex;justify-content:space-between;gap:8px}
.rx-receipt .rtl{direction:rtl;text-align:right;font-family:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Urdu Typesetting","Segoe UI",Tahoma,serif;font-size:13px;line-height:1.9}
.rx-receipt .acct{border:1px solid #333;padding:3px 5px;margin-top:4px}
@page{margin:0}
@media print{body{margin:0}}
`;

interface Props {
  sale: SaleDetail;
  settings: PharmacySettings | null;
  customerPhone?: string;
  /** Change returned to the customer, shown when cash given is known. */
  cashGiven?: number;
  autoPrint?: boolean;
  onClose?: () => void;
}

const PharmacyReceipt: React.FC<Props> = ({ sale, settings, customerPhone, cashGiven, autoPrint, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [paper, setPaper] = useState<'thermal' | 'a4'>(() => {
    try { return (localStorage.getItem('receiptPaper') as 'thermal' | 'a4') || 'thermal'; } catch { return 'thermal'; }
  });
  const [phone, setPhone] = useState(customerPhone || '');
  const [sending, setSending] = useState(false);
  const [fbrQr, setFbrQr] = useState('');
  const [local, setLocal] = useState<Record<number, { name: string; usageNote?: string | null }>>({});
  const [buyer, setBuyer] = useState<{ ntn?: string | null; strn?: string | null } | null>(null);
  const receiptLang = (settings as any)?.receiptLanguage as string | undefined;
  const otherLang = receiptLang?.includes('ur') ? 'ur' : receiptLang?.includes('ar') ? 'ar' : null;
  /** English label, followed by the Urdu/Arabic one when the receipt is bilingual. */
  const L = (key: keyof typeof RECEIPT_TEXT) => (otherLang ? `${RECEIPT_TEXT[key][0]} / ${RECEIPT_TEXT[key][otherLang === 'ur' ? 1 : 2]}` : RECEIPT_TEXT[key][0]);

  // Urdu / Arabic names and dosage notes for the lines on this bill.
  useEffect(() => {
    if (!otherLang || sale.items.length === 0) { setLocal({}); return; }
    suite.translations(otherLang, Array.from(new Set(sale.items.map((i) => Number(i.productId)))))
      .then((rows) => setLocal(Object.fromEntries(rows.map((r) => [r.productId, { name: r.name, usageNote: r.usageNote }]))))
      .catch(() => setLocal({}));
  }, [otherLang, sale.items]);

  // Registered buyers get their NTN on the invoice.
  useEffect(() => {
    if (!sale.customerId) { setBuyer(null); return; }
    suite.account(sale.customerId).then((a) => setBuyer(a.ntn || a.strn ? { ntn: a.ntn, strn: a.strn } : null)).catch(() => setBuyer(null));
  }, [sale.customerId]);

  useEffect(() => {
    if (!sale.fbrInvoiceNumber) { setFbrQr(''); return; }
    QRCodeLib.toDataURL(sale.fbrInvoiceNumber, { width: 90, margin: 0 }).then(setFbrQr).catch(() => setFbrQr(''));
  }, [sale.fbrInvoiceNumber]);

  useEffect(() => setPhone(customerPhone || ''), [customerPhone]);

  const print = () => {
    const el = ref.current;
    if (!el) return;
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${sale.reference}</title><style>${RECEIPT_CSS}</style></head><body>${el.outerHTML}</body></html>`);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 200);
  };

  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(print, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  const sendWhatsApp = async () => {
    if (!ref.current) return;
    if (!phone.trim()) {
      Swal.fire({ icon: 'info', title: 'Phone number needed', text: "Enter the customer's WhatsApp number." });
      return;
    }
    setSending(true);
    try {
      const name = settings?.pharmacyName || 'Pharmacy';
      const message = `Thank you for shopping at ${name}. Your bill ${sale.reference} for Rs ${money(sale.grandTotal)} is attached.`;
      const cloud = await isWhatsAppCloudConfigured().catch(() => false);
      if (cloud) {
        const res = await sendViaWhatsAppCloudApi(ref.current, `Bill-${sale.reference}`, message, phone);
        if (res.success) Swal.fire({ icon: 'success', title: 'Sent on WhatsApp', timer: 1500, showConfirmButton: false });
        else Swal.fire({ icon: 'error', title: 'Could not send', text: res.error });
      } else {
        await shareViaWhatsApp(ref.current, `Bill-${sale.reference}`, message, phone, { width: 300 });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Could not send', text: err?.message || 'WhatsApp sharing failed.' });
    } finally {
      setSending(false);
    }
  };

  const when = new Date(sale.saleDateTime || sale.saleDate);
  const lineDiscount = sale.items.reduce((s, i) => s + (Number(i.discount) || 0), 0);
  const totalDiscount = lineDiscount + (Number(sale.discount) || 0);
  const subTotal = sale.items.reduce((s, i) => s + (Number(i.purchasePrice) || 0) * (i.unitQuantity || i.quantity), 0);
  const change = cashGiven != null ? cashGiven - sale.grandTotal : null;

  return (
    <div>
      <style>{RECEIPT_CSS}</style>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3 d-print-none">
        <div className="btn-group btn-group-sm" role="group" aria-label="Paper size">
          <button type="button" className={`btn ${paper === 'thermal' ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => { setPaper('thermal'); try { localStorage.setItem('receiptPaper', 'thermal'); } catch { /* ignore */ } }}>80 mm</button>
          <button type="button" className={`btn ${paper === 'a4' ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => { setPaper('a4'); try { localStorage.setItem('receiptPaper', 'a4'); } catch { /* ignore */ } }}>A4</button>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <input className="form-control form-control-sm" style={{ width: 150 }} placeholder="WhatsApp no."
            value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Customer WhatsApp number" />
          <button type="button" className="btn btn-sm btn-success" onClick={sendWhatsApp} disabled={sending}>
            {sending ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ti ti-brand-whatsapp me-1" />}WhatsApp
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={print} autoFocus>
            <i className="ti ti-printer me-1" />Print
          </button>
          {onClose && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>}
        </div>
      </div>

      <div className="border bg-white p-2" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
        <div ref={ref} className={`rx-receipt${paper === 'a4' ? ' a4' : ''}`}>
          <div className="c b big">{settings?.pharmacyName || 'Pharmacy'}</div>
          {settings?.address && <div className="c muted">{settings.address}</div>}
          {settings?.phone && <div className="c muted">Ph: {settings.phone}</div>}
          {settings?.drugLicenceNo && <div className="c muted">Drug Licence No. {settings.drugLicenceNo}</div>}
          {(settings?.ntn || settings?.strn) && (
            <div className="c muted">{settings?.ntn ? `NTN ${settings.ntn}` : ''}{settings?.ntn && settings?.strn ? ' · ' : ''}{settings?.strn ? `STRN ${settings.strn}` : ''}</div>
          )}
          {paper === 'a4' && buyer && <div className="c b" style={{ marginTop: 4 }}>{sale.orderTax > 0 ? 'SALES TAX INVOICE' : 'INVOICE'}</div>}
          <hr />
          <div className="row"><span>{L('bill')} {sale.reference}</span><span>{when.toLocaleDateString('en-GB')} {when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="row muted"><span>{L('cashier')}: {sale.biller}</span><span>{sale.store || ''}</span></div>
          <div className="muted">{L('customer')}: {sale.customerName || 'Walk-in'}</div>
          {buyer && <div className="muted">{buyer.ntn ? `Buyer NTN ${buyer.ntn}` : ''}{buyer.ntn && buyer.strn ? ' · ' : ''}{buyer.strn ? `STRN ${buyer.strn}` : ''}</div>}
          {sale.patientName && sale.patientName !== sale.customerName && <div className="muted">{L('patient')}: {sale.patientName}</div>}
          {sale.doctorName && <div className="muted">{L('doctor')}: {sale.doctorName}</div>}
          <hr />
          <table>
            <tbody>
              {sale.items.map((i) => (
                <React.Fragment key={i.id}>
                  <tr>
                    <td>{i.productName}</td>
                    <td className="r">{money(i.totalCost)}</td>
                  </tr>
                  <tr className="muted">
                    <td colSpan={2}>
                      {i.unitQuantity || i.quantity} {unitLabel(i.saleUnit || 'Unit')}{(i.unitQuantity || i.quantity) > 1 && i.saleUnit !== 'Unit' ? 's' : ''} × {money(i.purchasePrice)}
                      {i.discount > 0 ? ` − ${money(i.discount)}` : ''}
                      {i.taxAmount > 0 ? ` + tax ${money(i.taxAmount)}` : ''}
                    </td>
                  </tr>
                  {local[Number(i.productId)] && (
                    <tr><td colSpan={2} className="rtl">{local[Number(i.productId)].name}{local[Number(i.productId)].usageNote ? ` — ${local[Number(i.productId)].usageNote}` : ''}</td></tr>
                  )}
                  {i.batchInfo && (
                    <tr className="muted"><td colSpan={2}>Batch {i.batchInfo}</td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <hr />
          <div className="row"><span>{L('subTotal')}</span><span>{money(subTotal)}</span></div>
          {totalDiscount > 0 && <div className="row"><span>{L('discount')}{sale.couponCode ? ` (${sale.couponCode})` : ''}</span><span>-{money(totalDiscount)}</span></div>}
          {sale.orderTax > 0 && <div className="row"><span>{L('salesTax')}</span><span>{money(sale.orderTax)}</span></div>}
          <div className="row b big"><span>{L('total')}</span><span>{money(sale.grandTotal)}</span></div>
          <div className="row"><span>{L('paid')} ({sale.paymentMethod || (sale.paid > 0 ? 'Cash' : 'Credit')})</span><span>{money(sale.paid)}</span></div>
          {cashGiven != null && cashGiven > 0 && <div className="row"><span>{L('cashGiven')}</span><span>{money(cashGiven)}</span></div>}
          {change != null && change > 0 && <div className="row b"><span>{L('change')}</span><span>{money(change)}</span></div>}
          {sale.due > 0 && <div className="row b"><span>{L('balanceDue')}</span><span>{money(sale.due)}</span></div>}
          {sale.customerId && sale.previousBalance != null && (sale.previousBalance !== 0 || sale.due > 0) && (
            <div className="acct">
              <div className="row"><span>{L('previousBalance')}</span><span>{money(sale.previousBalance)}</span></div>
              <div className="row"><span>{L('thisBill')}</span><span>{money(sale.due)}</span></div>
              <div className="row b"><span>{L('balanceNow')}</span><span>{money(sale.previousBalance + sale.due)}</span></div>
            </div>
          )}
          {sale.fbrInvoiceNumber && (
            <>
              <hr />
              <div className="c">FBR Invoice No.</div>
              <div className="c b">{sale.fbrInvoiceNumber}</div>
              <div className="c">
                {fbrQr && <img alt="FBR invoice QR code" width={90} height={90} src={fbrQr} />}
              </div>
            </>
          )}
          <hr />
          <div className="c muted">{settings?.receiptFooter || 'Medicines once sold are returned only with this bill. Get well soon.'}</div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyReceipt;
