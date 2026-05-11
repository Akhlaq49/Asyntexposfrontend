import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InstallmentPlan } from '../services/installmentService';
import { MEDIA_BASE_URL } from '../services/api';

const USER_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23f0f4f8"/><circle cx="60" cy="46" r="22" fill="%23b6c4d4"/><path d="M20 110c0-22 18-36 40-36s40 14 40 36" fill="%23b6c4d4"/></svg>'
);

const buildCustomerImageUrl = (path?: string | null): string => {
  if (!path) return USER_PLACEHOLDER;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

import { downloadPdf, shareViaWhatsApp, sendViaWhatsAppCloudApi, isWhatsAppCloudConfigured, normalizePhone } from '../utils/pdfWhatsappShare';

interface PlanPrintViewProps {
  plan: InstallmentPlan;
  onClose: () => void;
}

const PlanPrintView: React.FC<PlanPrintViewProps> = ({ plan, onClose }) => {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingCloud, setSendingCloud] = useState(false);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [cloudResult, setCloudResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    isWhatsAppCloudConfigured().then(setCloudConfigured).catch(() => setCloudConfigured(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalPaid =
    plan.schedule
      .filter((e) => e.status === 'paid' || e.status === 'partial')
      .reduce((s, e) => s + (e.status === 'paid' ? (e.emiAmount || 0) : (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0)), 0) + plan.downPayment;

  const totalRemaining = plan.totalPayable - totalPaid;

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return '#28a745';
      case 'partial': return '#17a2b8';
      case 'due': return '#ffc107';
      case 'overdue': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'paid': return t('pdf.paid');
      case 'partial': return t('pdf.partial');
      case 'due': return t('pdf.due');
      case 'overdue': return t('pdf.overdue');
      default: return t('pdf.upcoming');
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Installment Plan - ${plan.customerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; color: #333; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .plan-hdr{display:flex;flex-direction:column;align-items:center;width:100%}
          .plan-hdr-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;width:100%}
          .plan-logo{display:block;width:280px;max-width:100%;height:auto;object-fit:contain;image-rendering:-webkit-optimize-contrast}
          .plan-cust-img{width:100px;height:100px;object-fit:cover;border-radius:50%;border:2px solid #4a90d9;background:#f0f4f8;justify-self:start}
          @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 10mm; }
          }
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

  const pdfFilename = `Repayment-Plan-${plan.customerName.replace(/\s+/g, '-')}-Plan${plan.id}`;

  const handleDownloadPdf = async () => {
    const content = printRef.current;
    if (!content) return;
    setDownloading(true);
    try {
      await downloadPdf(content, pdfFilename, { width: 1100, orientation: 'portrait' });
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const buildMessage = () => {
    const totalPaidAmt = plan.schedule
      .filter((e) => e.status === 'paid' || e.status === 'partial')
      .reduce((s, e) => s + (e.status === 'paid' ? (e.emiAmount || 0) : (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0)), 0) + plan.downPayment;
    const outstanding = plan.totalPayable - totalPaidAmt;
    return `📋 *${t('pdf.full_repayment_plan')}*\n\n👤 ${t('pdf.name')}: ${plan.customerName}\n📦 ${t('pdf.product')}: ${plan.productName}\n💰 ${t('pdf.total_payable')}: Rs ${fmt(plan.totalPayable)}\n✅ ${t('pdf.paid')}: Rs ${fmt(totalPaidAmt)}\n⏳ ${t('pdf.outstanding')}: Rs ${fmt(outstanding > 0 ? outstanding : 0)}\n📅 ${t('pdf.tenure')}: ${plan.tenure} ${t('pdf.months')} (${plan.paidInstallments}/${plan.tenure} ${t('pdf.paid')})`;
  };

  const handleShareWhatsApp = async () => {
    const content = printRef.current;
    if (!content) return;
    setSharing(true);
    try {
      await shareViaWhatsApp(content, pdfFilename, buildMessage(), plan.customerPhone, { width: 1100, orientation: 'portrait' });
    } catch (err) {
      console.error('WhatsApp share error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleSendWhatsAppCloud = async () => {
    const content = printRef.current;
    if (!content) return;
    setSendingCloud(true);
    setCloudResult(null);
    try {
      const result = await sendViaWhatsAppCloudApi(content, pdfFilename, buildMessage(), plan.customerPhone, { width: 1100, orientation: 'portrait' });
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

  const progressPct = plan.tenure > 0 ? Math.round((plan.paidInstallments / plan.tenure) * 100) : 0;

  // Inline style helpers (for printable HTML in ref)
  const sTitle: React.CSSProperties = { fontWeight: 800, fontSize: 15, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 5, marginBottom: 12, letterSpacing: 0.5 };
  const sRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, lineHeight: 1.6 };
  const sLabel: React.CSSProperties = { color: '#555', fontWeight: 600 };
  const sValue: React.CSSProperties = { fontWeight: 500 };
  const sTh: React.CSSProperties = { background: '#4a90d9', color: '#fff', padding: '9px 10px', textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', border: '1px solid #3a7bc8', whiteSpace: 'nowrap' };
  const sTd: React.CSSProperties = { border: '1px solid #ddd', padding: '8px 10px', textAlign: 'center', fontSize: 13 };

  // Collect all customer images (profile + additional)
  const customerImages: string[] = [];
  if (plan.customerImage) customerImages.push(plan.customerImage);
  if (plan.customerPictures) plan.customerPictures.forEach((p) => customerImages.push(p.filePath));

  const headerCustomerImage = customerImages.length > 0
    ? buildCustomerImageUrl(customerImages[0])
    : USER_PLACEHOLDER;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <style>{`
            .plan-hdr{display:flex;flex-direction:column;align-items:center;width:100%}
            .plan-hdr-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;width:100%}
            .plan-logo{display:block;width:280px;max-width:100%;height:auto;object-fit:contain;image-rendering:-webkit-optimize-contrast}
            .plan-cust-img{width:100px;height:100px;object-fit:cover;border-radius:50%;border:2px solid #4a90d9;background:#f0f4f8;justify-self:start}
            @media(max-width:480px){
              .plan-logo{width:160px!important}
              .plan-cust-img{width:68px!important;height:68px!important}
            }
          `}</style>
          <div className="modal-header bg-primary text-white py-2 flex-wrap">
            <h6 className="modal-title fw-bold mb-0"><i className="ti ti-file-text me-2"></i>{t('pdf.full_repayment_plan')}</h6>
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
          <div className="modal-body p-0" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div ref={printRef}>
              <div style={{ width: '100%', padding: '24px 32px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", color: '#333', lineHeight: 1.6 }}>

                {/* Header */}
                <div className="plan-hdr" style={{ paddingBottom: 18, borderBottom: '3px solid #4a90d9', marginBottom: 24 }}>
                  <div className="plan-hdr-row">
                    <img src={headerCustomerImage} alt={plan.customerName} onError={(e) => { const img = e.currentTarget as HTMLImageElement; if (img.src !== USER_PLACEHOLDER) img.src = USER_PLACEHOLDER; }} className="plan-cust-img" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '50%', border: '2px solid #4a90d9', background: '#f0f4f8' }} />
                    <img src="/assets/img/newlogo.png" alt="Moiaz Corporation" className="plan-logo" style={{ objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }} />
                    <div />
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#666', width: '100%' }}>
                    Near Adda Agency Danwran (Lodhran) | 0300-7194095 | 0300-8694092
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'inline-block', background: '#4a90d9', color: '#fff', padding: '7px 28px', borderRadius: 4, fontWeight: 700, fontSize: 16 }}>
                    {t('pdf.installment_plan_details')}
                  </div>
                </div>

                {/* Customer + Product side by side using table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 16 }}>
                        <div style={sTitle}>{t('pdf.customer_information')}</div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.name')}:</span><span style={sValue}>{plan.customerName}</span></div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.so')}:</span><span style={sValue}>{plan.customerSo || '—'}</span></div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.mobile')}:</span><span style={sValue}>{plan.customerPhone || '—'}</span></div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.cnic')}:</span><span style={sValue}>{plan.customerCnic || '—'}</span></div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.address')}:</span><span style={sValue}>{plan.customerAddress || '—'}</span></div>
                      </td>
                      <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: 16 }}>
                        <div style={sTitle}>{t('pdf.product_information')}</div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.product')}:</span><span style={sValue}>{plan.productName}</span></div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.price')}:</span><span style={sValue}>Rs {fmt(plan.financeAmount ?? plan.productPrice)}</span></div>
                        <div style={sRow}><span style={sLabel}>{t('pdf.down_payment')}:</span><span style={sValue}>Rs {fmt(plan.downPayment)}</span></div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Plan Details */}
                <div style={{ marginBottom: 18 }}>
                  <div style={sTitle}>{t('pdf.plan_details')}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 16 }}>
                          <div style={sRow}><span style={sLabel}>{t('pdf.start_date')}:</span><span style={sValue}>{plan.startDate}</span></div>
                          <div style={sRow}><span style={sLabel}>{t('pdf.tenure')}:</span><span style={sValue}>{plan.tenure} {t('pdf.months')}</span></div>
                          <div style={sRow}><span style={sLabel}>{t('pdf.monthly_emi')}:</span><span style={{ fontWeight: 700, color: '#4a90d9' }}>Rs {fmt(plan.emiAmount)}</span></div>
                        </td>
                        <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: 16 }}>
                          <div style={sRow}><span style={sLabel}>{t('pdf.total_payable')}:</span><span style={{ fontWeight: 700 }}>Rs {fmt(plan.totalPayable)}</span></div>
                          <div style={sRow}><span style={sLabel}>{t('pdf.total_paid')}:</span><span style={{ fontWeight: 700, color: '#28a745' }}>Rs {fmt(totalPaid)}</span></div>
                          <div style={sRow}><span style={sLabel}>{t('pdf.outstanding')}:</span><span style={{ fontWeight: 700, color: totalRemaining > 0 ? '#dc3545' : '#28a745' }}>Rs {fmt(totalRemaining > 0 ? totalRemaining : 0)}</span></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Progress bar */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                      <span>{t('pdf.repayment_progress')}</span>
                      <span>{t('pdf.installments_progress', { paid: plan.paidInstallments, total: plan.tenure, pct: progressPct })}</span>
                    </div>
                    <div style={{ width: '100%', height: 14, background: '#e8e8e8', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: '#28a745', borderRadius: 7, textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: '14px' }}>
                        {progressPct > 10 ? `${progressPct}%` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guarantors */}
                {plan.guarantors && plan.guarantors.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={sTitle}>{plan.guarantors.length > 1 ? t('pdf.guarantors') : t('pdf.guarantor')} ({plan.guarantors.length})</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={sTh}>{t('pdf.name')}</th>
                          <th style={sTh}>{t('pdf.so')}</th>
                          <th style={sTh}>{t('pdf.mobile')}</th>
                          <th style={sTh}>{t('pdf.cnic')}</th>
                          <th style={sTh}>{t('pdf.address')}</th>
                          <th style={sTh}>{t('pdf.relationship')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.guarantors.map((g) => {
                          return (
                            <React.Fragment key={g.id}>
                              <tr>
                                <td style={{ ...sTd, fontWeight: 700, textAlign: 'left' }}>{g.name}</td>
                                <td style={sTd}>{g.so || '—'}</td>
                                <td style={sTd}>{g.phone || '—'}</td>
                                <td style={sTd}>{g.cnic || '—'}</td>
                                <td style={{ ...sTd, textAlign: 'left' }}>{g.address || '—'}</td>
                                <td style={sTd}>{g.relationship || '—'}</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Repayment Schedule */}
                <div style={{ marginBottom: 18 }}>
                  <div style={sTitle}>{t('pdf.repayment_schedule')}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={sTh}>{t('pdf.hash')}</th>
                        <th style={sTh}>{t('pdf.due_date')}</th>
                        <th style={sTh}>{t('pdf.emi')}</th>
                        <th style={sTh}>{t('pdf.paid')}</th>
                        <th style={sTh}>{t('pdf.balance')}</th>
                        <th style={sTh}>{t('pdf.status')}</th>
                        <th style={sTh}>{t('pdf.paid_date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Down payment row */}
                      <tr style={{ background: '#e8f4fd' }}>
                        <td style={sTd}>—</td>
                        <td style={sTd}>{plan.startDate}</td>
                        <td style={{ ...sTd, fontWeight: 600 }}>Rs {fmt(plan.downPayment)}</td>
                        <td style={{ ...sTd, color: '#28a745', fontWeight: 700 }}>Rs {fmt(plan.downPayment)}</td>
                        <td style={sTd}>Rs {fmt(plan.financedAmount)}</td>
                        <td style={sTd}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, color: '#fff', background: '#28a745' }}>{t('pdf.down_payment')}</span>
                        </td>
                        <td style={sTd}>{plan.startDate}</td>
                      </tr>
                      {plan.schedule.map((e) => {
                        const paidAmt = e.status === 'paid' ? (e.emiAmount || 0) : (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0);
                        const bgColor = e.status === 'overdue' ? '#fff5f5' : e.status === 'due' ? '#fffbe6' : e.status === 'partial' ? '#e8f8fd' : 'transparent';
                        return (
                          <tr key={e.installmentNo} style={{ background: bgColor }}>
                            <td style={{ ...sTd, fontWeight: 600 }}>{e.installmentNo}</td>
                            <td style={sTd}>{e.dueDate}</td>
                            <td style={{ ...sTd, fontWeight: 600 }}>Rs {fmt2(e.emiAmount)}</td>
                            <td style={{ ...sTd, color: paidAmt > 0 ? '#28a745' : '#999', fontWeight: paidAmt > 0 ? 700 : 400 }}>
                              {paidAmt > 0 ? `Rs ${fmt2(paidAmt)}` : '—'}
                              {e.status === 'paid' && e.actualPaidAmount != null && e.actualPaidAmount > e.emiAmount && <div style={{ fontSize: 9, color: '#e68a00', marginTop: 2 }}>Paid: Rs {fmt2(e.actualPaidAmount)} — Distributed in future rentals</div>}
                            </td>
                            <td style={sTd}>Rs {fmt2(e.balance)}</td>
                            <td style={sTd}>
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, color: '#fff', background: statusColor(e.status) }}>
                                {statusLabel(e.status)}
                              </span>
                            </td>
                            <td style={sTd}>{e.paidDate || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f5f5f5', fontWeight: 700 }}>
                        <td style={{ ...sTd, fontWeight: 700 }} colSpan={2}>{t('pdf.total')}</td>
                        <td style={{ ...sTd, fontWeight: 700 }}>Rs {fmt2(plan.schedule.reduce((s, e) => s + e.emiAmount, 0))}</td>
                        <td style={{ ...sTd, fontWeight: 700, color: '#28a745' }}>Rs {fmt2(plan.schedule.filter(e => e.status === 'paid' || e.status === 'partial').reduce((s, e) => s + (e.status === 'paid' ? (e.emiAmount || 0) : (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0)), 0))}</td>
                        <td style={sTd} colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment Record (empty rows for manual entry) */}
                <div style={{ marginBottom: 18 }}>
                  <div style={sTitle}>{t('pdf.payment_record')}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={sTh}>{t('pdf.hash')}</th>
                        <th style={sTh}>{t('pdf.due_date')}</th>
                        <th style={sTh}>{t('pdf.emi')}</th>
                        <th style={sTh}>{t('pdf.paid')}</th>
                        <th style={sTh}>{t('pdf.balance')}</th>
                        <th style={sTh}>{t('pdf.status')}</th>
                        <th style={sTh}>{t('pdf.paid_date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => (
                        <tr key={`empty-${i}`}>
                          <td style={{ ...sTd, fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ ...sTd, height: 28 }}>&nbsp;</td>
                          <td style={sTd}>&nbsp;</td>
                          <td style={sTd}>&nbsp;</td>
                          <td style={sTd}>&nbsp;</td>
                          <td style={sTd}>&nbsp;</td>
                          <td style={sTd}>&nbsp;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '33.33%', textAlign: 'center', border: '1px solid #ddd', padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{t('pdf.total_payable')}</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>Rs {fmt(plan.totalPayable)}</div>
                      </td>
                      <td style={{ width: '33.33%', textAlign: 'center', border: '1px solid #ddd', padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{t('pdf.total_paid')}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#28a745' }}>Rs {fmt(totalPaid)}</div>
                      </td>
                      <td style={{ width: '33.33%', textAlign: 'center', border: '1px solid #ddd', padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{t('pdf.outstanding')}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: totalRemaining > 0 ? '#dc3545' : '#28a745' }}>Rs {fmt(totalRemaining > 0 ? totalRemaining : 0)}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <div style={{ textAlign: 'center', borderTop: '2px solid #e0e0e0', paddingTop: 12, marginTop: 16, fontSize: 11, color: '#888' }}>
                  {t('pdf.generated_on', { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) })} &bull; {t('pdf.plan_number', { id: plan.id })} &bull; {plan.customerName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanPrintView;
