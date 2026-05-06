import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadPdf, shareViaWhatsApp, sendViaWhatsAppCloudApi, isWhatsAppCloudConfigured } from '../utils/pdfWhatsappShare';

/* ---- types expected from POSOrders ---- */
export interface ReceiptSaleItem {
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface ReceiptPayment {
  reference: string;
  payingAmount: number;
  receivedAmount: number;
  paymentType: string;
  description: string | null;
  paymentDate: string;
}

export interface ReceiptSale {
  reference: string;
  customerName: string;
  customerPhone?: string;
  grandTotal: number;
  paid: number;
  due: number;
  orderTax: number;
  discount: number;
  shipping: number;
  saleDate: string;
  items: ReceiptSaleItem[];
}

interface POSPaymentReceiptProps {
  sale: ReceiptSale;
  payment: ReceiptPayment;
  onClose: () => void;
}

const POSPaymentReceipt: React.FC<POSPaymentReceiptProps> = ({ sale, payment, onClose }) => {
  const { t } = useTranslation();
  const slipRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingCloud, setSendingCloud] = useState(false);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [cloudResult, setCloudResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    isWhatsAppCloudConfigured().then(setCloudConfigured).catch(() => setCloudConfigured(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const change = payment.receivedAmount - payment.payingAmount;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    const content = slipRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${sale.customerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; color: #333; }
          .slip { width: 100%; max-width: 460px; margin: 0 auto; padding: 24px; }
          .slip-header { text-align: center; padding-bottom: 18px; border-bottom: 2px solid #e0e0e0; margin-bottom: 18px; }
          .slip-header h2 { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .slip-header .address { font-size: 12px; color: #666; margin-top: 3px; }
          .slip-header .slip-title { display: inline-block; background: #4a90d9; color: white; padding: 6px 24px; border-radius: 4px; font-weight: 700; font-size: 15px; margin-top: 10px; }
          .section-title { font-weight: 800; font-size: 14px; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 5px; margin: 16px 0 12px; }
          .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; line-height: 1.6; }
          .info-row .label { color: #555; font-weight: 600; }
          .info-row .value { font-weight: 500; text-align: right; }
          .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
          .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px 10px; }
          .items-table th { background: #f5f5f5; font-weight: 700; font-size: 12px; text-transform: uppercase; }
          .footer-bar { text-align: center; background: #333; color: #fff; padding: 10px; border-radius: 4px; font-size: 12px; margin-top: 14px; font-weight: 600; }
          @media print { body { padding: 0; } .slip { max-width: 100%; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const pdfFilename = `Payment-Receipt-${sale.reference}-${sale.customerName.replace(/\s+/g, '-')}`;

  const handleDownloadPdf = async () => {
    const content = slipRef.current;
    if (!content) return;
    setDownloading(true);
    try {
      await downloadPdf(content, pdfFilename, { width: 400 });
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const buildMessage = () =>
    `🧾 *${t('pos_receipt.title')}*\n\n👤 ${t('pdf.name')}: ${sale.customerName}\n📋 ${t('common.reference')}: ${sale.reference}\n💵 ${t('pos_receipt.amount_paid')}: Rs ${fmt(payment.payingAmount)}\n💳 ${t('sales.payment_type')}: ${payment.paymentType}\n📅 ${t('pdf.date')}: ${payment.paymentDate || '-'}`;

  const handleShareWhatsApp = async () => {
    const content = slipRef.current;
    if (!content) return;
    setSharing(true);
    try {
      await shareViaWhatsApp(content, pdfFilename, buildMessage(), sale.customerPhone, { width: 400 });
    } catch (err) {
      console.error('WhatsApp share error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleSendWhatsAppCloud = async () => {
    const content = slipRef.current;
    if (!content) return;
    setSendingCloud(true);
    setCloudResult(null);
    try {
      const result = await sendViaWhatsAppCloudApi(content, pdfFilename, buildMessage(), sale.customerPhone || '', { width: 400 });
      setCloudResult(result);
      if (result.success) {
        setTimeout(() => setCloudResult(null), 4000);
      }
    } catch (err) {
      console.error('WhatsApp Cloud API error:', err);
      setCloudResult({ success: false, error: 'Failed to send' });
    } finally {
      setSendingCloud(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-primary text-white py-2">
            <h6 className="modal-title fw-bold mb-0"><i className="ti ti-receipt me-2"></i>{t('pos_receipt.title')}</h6>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-light" onClick={handlePrint} title={t('pdf.print')}>
                <i className="ti ti-printer me-1"></i>{t('pdf.print')}
              </button>
              <button className="btn btn-sm btn-light" onClick={handleDownloadPdf} disabled={downloading} title="PDF">
                {downloading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="ti ti-download me-1"></i>PDF</>}
              </button>
              <button className="btn btn-sm btn-success" onClick={handleShareWhatsApp} disabled={sharing} title={t('pdf.whatsapp')}>
                {sharing ? <span className="spinner-border spinner-border-sm"></span> : <><i className="ti ti-brand-whatsapp me-1"></i>{t('pdf.whatsapp')}</>}
              </button>
              {cloudConfigured && (
                <button className="btn btn-sm btn-outline-success" onClick={handleSendWhatsAppCloud} disabled={sendingCloud} title={t('pdf.send')}>
                  {sendingCloud ? <span className="spinner-border spinner-border-sm"></span> : <><i className="ti ti-send me-1"></i>{t('pdf.send')}</>}
                </button>
              )}
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
          </div>
          {cloudResult && (
            <div className={`alert ${cloudResult.success ? 'alert-success' : 'alert-danger'} mb-0 py-2 rounded-0 text-center small`}>
              {cloudResult.success ? <><i className="ti ti-check me-1"></i>{t('pdf.sent_whatsapp')}</> : <><i className="ti ti-alert-triangle me-1"></i>{cloudResult.error}</>}
            </div>
          )}
          <div className="modal-body p-0">
            <div ref={slipRef}>
              <div className="slip" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: 460, margin: '0 auto', padding: 24, lineHeight: 1.5 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, paddingBottom: 18, borderBottom: '2px solid #e0e0e0', marginBottom: 18 }}>
                  <div>
                    <img src={customerImageSrc} alt={sale.customerName} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'contain', border: '2px solid #4a90d9' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <img src="/assets/img/logo-small.png" alt="Logo" style={{ width: 130, height: 130, borderRadius: '50%', objectFit: 'contain', border: '2px solid #4a90d9' }} />
                    <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Near Adda Agency Danwran (Lodhran) | 03008694092</div>
                  </div>
                  <div style={{ width: 100, minWidth: 100 }} />
                </div>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'inline-block', background: '#4a90d9', color: 'white', padding: '7px 28px', borderRadius: 4, fontWeight: 700, fontSize: 16 }}>
                    {t('pos_receipt.payment_receipt')}
                  </div>
                </div>

                {/* Customer Information */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  {t('pos_receipt.customer_info')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.name')}:</span>
                  <span style={{ fontWeight: 500 }}>{sale.customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('common.reference')}:</span>
                  <span style={{ fontWeight: 500 }}>{sale.reference}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.sale_date')}:</span>
                  <span style={{ fontWeight: 500 }}>{sale.saleDate || '-'}</span>
                </div>

                {/* Items */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  {t('pos_receipt.items')}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'left' }}>{t('pos_receipt.item')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'center' }}>{t('pos_receipt.qty')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>{t('pos_receipt.price')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 8px', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>{t('pos_receipt.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #ccc', padding: '6px 8px', fontSize: 12 }}>{item.productName}</td>
                        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'center', fontSize: 12 }}>{item.quantity}</td>
                        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'right', fontSize: 12 }}>Rs {fmt(item.unitCost)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'right', fontSize: 12 }}>Rs {fmt(item.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Order Summary */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  {t('pos_receipt.order_summary')}
                </div>
                {sale.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#555', fontWeight: 600 }}>{t('common.discount')}:</span>
                    <span style={{ fontWeight: 500 }}>Rs {fmt(sale.discount)}</span>
                  </div>
                )}
                {sale.orderTax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#555', fontWeight: 600 }}>{t('common.order_tax')}:</span>
                    <span style={{ fontWeight: 500 }}>Rs {fmt(sale.orderTax)}</span>
                  </div>
                )}
                {sale.shipping > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#555', fontWeight: 600 }}>{t('pos_receipt.shipping')}:</span>
                    <span style={{ fontWeight: 500 }}>Rs {fmt(sale.shipping)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderTop: '1px solid #eee', marginTop: 4 }}>
                  <span style={{ fontWeight: 700 }}>{t('common.grand_total')}:</span>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>Rs {fmt(sale.grandTotal)}</span>
                </div>

                {/* Payment Details */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  {t('pos_receipt.payment_details')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.date')}:</span>
                  <span style={{ fontWeight: 500 }}>{formatDate(payment.paymentDate)}</span>
                </div>
                {payment.reference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#555', fontWeight: 600 }}>{t('common.reference')}:</span>
                    <span style={{ fontWeight: 500 }}>{payment.reference}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.payment_mode')}:</span>
                  <span style={{ fontWeight: 500 }}>{payment.paymentType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pos_receipt.amount_paid')}:</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>Rs {fmt(payment.payingAmount)}</span>
                </div>
                {change > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#555', fontWeight: 600 }}>{t('pos_receipt.change')}:</span>
                    <span style={{ fontWeight: 600, color: '#28a745' }}>Rs {fmt(change)}</span>
                  </div>
                )}

                {/* Notes / Description */}
                {payment.description && (
                  <div style={{ padding: '6px 0', fontSize: 13, borderTop: '1px solid #eee', marginTop: 4 }}>
                    <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.notes')}:</span>
                    <div style={{ fontWeight: 500, marginTop: 2, fontStyle: 'italic', color: '#333' }}>{payment.description}</div>
                  </div>
                )}

                {/* Balance Summary */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  {t('pos_receipt.balance_summary')}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('common.grand_total')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('common.paid')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('common.due')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>Rs {fmt(sale.grandTotal)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>Rs {fmt(sale.paid)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: sale.due > 0 ? '#e0a800' : '#28a745', fontWeight: 600 }}>Rs {fmt(Math.max(sale.due, 0))}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <div style={{ textAlign: 'center', background: '#333', color: '#fff', padding: 8, borderRadius: 4, fontSize: 11, marginTop: 12, fontWeight: 600 }}>
                  {sale.due > 0
                    ? t('pos_receipt.balance_remaining', { amount: fmt(sale.due) })
                    : t('pos_receipt.fully_paid')
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPaymentReceipt;
