import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InstallmentPlan, RepaymentEntry } from '../services/installmentService';
import { downloadPdf, shareViaWhatsApp, sendViaWhatsAppCloudApi, isWhatsAppCloudConfigured, normalizePhone } from '../utils/pdfWhatsappShare';
import './Receipts.css';
import { MEDIA_BASE_URL } from '../services/api';

const USER_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23f0f4f8"/><circle cx="60" cy="46" r="22" fill="%23b6c4d4"/><path d="M20 110c0-22 18-36 40-36s40 14 40 36" fill="%23b6c4d4"/></svg>'
);

interface DueInstallmentSlipProps {
  plan: InstallmentPlan;
  entry: RepaymentEntry;
  onClose: () => void;
}

const DueInstallmentSlip: React.FC<DueInstallmentSlipProps> = ({ plan, entry, onClose }) => {
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

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const customerImages: string[] = [];
  if (plan.customerImage) customerImages.push(plan.customerImage);
  if (plan.customerPictures) plan.customerPictures.forEach((p) => customerImages.push(p.filePath));

  const customerImageSrc = customerImages.length > 0
    ? `${MEDIA_BASE_URL}${customerImages[0].startsWith('/') ? '' : '/'}${customerImages[0]}`
    : USER_PLACEHOLDER;

  const previouslyPaid = (entry.actualPaidAmount || 0) + (entry.miscAdjustedAmount || 0);
  const remainingForEntry = entry.emiAmount - previouslyPaid;

  const totalDeposited =
    plan.schedule
      .filter((e) => e.status === 'paid' || e.status === 'partial')
      .reduce((s, e) => s + (e.status === 'paid' ? (e.emiAmount || 0) : (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0)), 0) + plan.downPayment;

  const totalAmount = plan.totalPayable;
  const totalRemaining = totalAmount - totalDeposited;

  const isOverdue = entry.status === 'overdue';
  const isPartial = entry.status === 'partial';

  const statusLabel = isOverdue ? t('pdf.overdue_label') : isPartial ? t('pdf.partial_label') : t('pdf.due_label');
  const statusColor = isOverdue ? '#dc3545' : isPartial ? '#17a2b8' : '#ffc107';

  const handlePrint = () => {
    const content = slipRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Due Installment - ${plan.customerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; }
          @media print { body { padding: 0; } }
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

  const pdfFilename = `Due-Installment-${plan.customerName.replace(/\s+/g, '-')}-Inst${entry.installmentNo}`;

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

  const buildMessage = () => {
    const emoji = isOverdue ? '🔴' : '🟡';
    return `${emoji} *${t('pdf.due_installment', { status: statusLabel })}*\n\n👤 ${t('pdf.name')}: ${plan.customerName}\n📦 ${t('pdf.product')}: ${plan.productName}\n📋 ${t('pdf.installment_no')}: ${entry.installmentNo}\n💰 ${t('pdf.amount_due')}: Rs ${fmt(remainingForEntry > 0 ? remainingForEntry : entry.emiAmount)}\n📅 ${t('pdf.due_date')}: ${entry.dueDate}\n💳 ${t('pdf.remaining')}: Rs ${fmt(totalRemaining > 0 ? totalRemaining : 0)}\n🔢 ${t('pdf.remaining')} ${t('pdf.total_inst')}: ${plan.remainingInstallments}\n\n${t('pdf.pay_reminder', { amount: fmt(remainingForEntry > 0 ? remainingForEntry : entry.emiAmount), instNo: entry.installmentNo, date: entry.dueDate })}`;
  };

  const handleShareWhatsApp = async () => {
    const content = slipRef.current;
    if (!content) return;
    setSharing(true);
    try {
      await shareViaWhatsApp(content, pdfFilename, buildMessage(), plan.customerPhone, { width: 400 });
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
      const result = await sendViaWhatsAppCloudApi(content, pdfFilename, buildMessage(), plan.customerPhone, { width: 400 });
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
          <div className="modal-header text-white py-2 flex-wrap" style={{ background: statusColor }}>
            <h6 className="modal-title fw-bold mb-0"><i className="ti ti-alert-circle me-2"></i>{t('pdf.due_installment', { status: statusLabel })}</h6>
            <div className="d-flex gap-1 flex-wrap">
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
              {plan.customerPhone && normalizePhone(plan.customerPhone) && (
                <button className="btn btn-sm" style={{ backgroundColor: '#007AFF', borderColor: '#007AFF', color: '#fff' }} onClick={() => { window.open(`sms:+${normalizePhone(plan.customerPhone)}?body=${encodeURIComponent(buildMessage())}`, '_self'); }} title="SMS">
                  <i className="ti ti-message-circle me-1"></i>SMS
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
            <div ref={slipRef} className="receipt-print-area">
              <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: 460, margin: '0 auto', padding: 24, lineHeight: 1.5 }}>
                {/* Header */}
                <div className="receipt-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, paddingBottom: 18, borderBottom: '2px solid #e0e0e0', marginBottom: 18 }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <img className="customer-photo" src={customerImageSrc} alt={plan.customerName} onError={(e) => { const img = e.currentTarget as HTMLImageElement; if (img.src !== USER_PLACEHOLDER) img.src = USER_PLACEHOLDER; }} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid ' + statusColor, background: '#f0f4f8' }} />
                  </div>
                  <div className="receipt-header-center" style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <img className="company-logo" src="/assets/img/newlogo.png" alt="Moiaz Corporation" style={{ width: 170, height: 170, objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }} />
                    <span style={{ display: 'block', fontSize: 12, color: '#666', marginTop: 8 }}>Near Adda Agency Danwran (Lodhran) | 03007194095</span>
                  </div>
                  <div className="receipt-header-spacer" style={{ flex: '0 0 auto', width: 100 }} />
                </div>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'inline-block', background: statusColor, color: 'white', padding: '7px 28px', borderRadius: 4, fontWeight: 700, fontSize: 16 }}>
                    {t('pdf.due_installment', { status: statusLabel })}
                  </div>
                </div>

                {/* Customer Information */}
                <div style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 5, margin: '18px 0 12px' }}>
                  {t('pdf.customer_information')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, lineHeight: 1.6 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.name')}:</span>
                  <span style={{ fontWeight: 500 }}>{plan.customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.mobile')}:</span>
                  <span style={{ fontWeight: 500 }}>{plan.customerPhone || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.product')}:</span>
                  <span style={{ fontWeight: 500 }}>{plan.productName}</span>
                </div>

                {/* Due Installment Details */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  {t('pdf.installment_details')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.installment_no')}:</span>
                  <span style={{ fontWeight: 700 }}>{entry.installmentNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.due_date')}:</span>
                  <span style={{ fontWeight: 500 }}>{entry.dueDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.emi_amount')}:</span>
                  <span style={{ fontWeight: 500 }}>Rs {fmt(entry.emiAmount)}</span>
                </div>
                {isPartial && previouslyPaid > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.already_paid')}:</span>
                      <span style={{ fontWeight: 500, color: '#28a745' }}>Rs {fmt(previouslyPaid)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.remaining_amount')}:</span>
                      <span style={{ fontWeight: 700, color: '#dc3545' }}>Rs {fmt(remainingForEntry)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>{t('pdf.status')}:</span>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 12px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    background: statusColor
                  }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Amount Due Highlight */}
                <div style={{
                  background: isOverdue ? '#fff5f5' : '#fffbe6',
                  border: `2px solid ${statusColor}`,
                  borderRadius: 8,
                  padding: 16,
                  margin: '15px 0',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    {t('pdf.amount_due')}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: statusColor }}>
                    Rs {fmt(remainingForEntry > 0 ? remainingForEntry : entry.emiAmount)}
                  </div>
                  {isOverdue && (
                    <div style={{ fontSize: 11, color: '#dc3545', fontWeight: 600, marginTop: 4 }}>
                      ⚠ {t('pdf.overdue_warning')}
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  {t('pdf.overall_summary')}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('pdf.total_amount')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('pdf.total_paid_upper')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('pdf.remaining')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>Rs {fmt(totalAmount)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>Rs {fmt(totalDeposited)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#e0a800', fontWeight: 600 }}>Rs {fmt(totalRemaining > 0 ? totalRemaining : 0)}</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('pdf.total_inst')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('pdf.paid_inst')}</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t('pdf.remaining')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>{plan.tenure}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>{plan.paidInstallments}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#e0a800', fontWeight: 600 }}>{plan.remainingInstallments}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderTop: '1px solid #eee' }}>
                  <span style={{ fontWeight: 600 }}>{t('pdf.monthly_emi_label')}:</span>
                  <span style={{ fontWeight: 700 }}>Rs {fmt(plan.emiAmount)}</span>
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', background: statusColor, color: '#fff', padding: 8, borderRadius: 4, fontSize: 11, marginTop: 12, fontWeight: 600 }}>
                  {t('pdf.pay_reminder', { amount: fmt(remainingForEntry > 0 ? remainingForEntry : entry.emiAmount), instNo: entry.installmentNo, date: entry.dueDate })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DueInstallmentSlip;
