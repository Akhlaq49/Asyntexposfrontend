import React, { useState, useEffect, useRef } from 'react';
import {
  isWhatsAppCloudConfigured,
  normalizePhone,
  generatePdfFromElement,
} from '../utils/pdfWhatsappShare';
import { sendWhatsAppTextAndDocument, uploadSharePdf } from '../services/whatsappService';

/** Optional full repayment schedule to render in PDF */
export interface PlanScheduleEntry {
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  status: string;
  actualPaidAmount?: number;
  paidDate?: string;
}

export interface PlanData {
  customerName: string;
  customerPhone?: string;
  customerCnic?: string;
  productName: string;
  productPrice: number;
  downPayment: number;
  financeAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  totalPayable: number;
  startDate: string;
  status: string;
  paidInstallments: number;
  remainingInstallments: number;
  schedule: PlanScheduleEntry[];
  guarantors?: { name: string; phone?: string }[];
}

interface WhatsAppSendModalProps {
  show: boolean;
  onClose: () => void;
  /** Recipient phone number (digits, or with +country code) */
  phoneNumber: string;
  /** Recipient display name */
  recipientName: string;
  /** Pre-filled message text */
  defaultMessage: string;
  /** Optional title shown in modal header */
  title?: string;
  /** Optional full plan data — when provided, the PDF will include the full repayment schedule table */
  planData?: PlanData;
}

/**
 * Reusable WhatsApp Send Modal.
 * Shows two options to the user:
 *   1. Open in WhatsApp (wa.me link) — generates PDF, tries Web Share API, falls back to download+wa.me
 *   2. Send via WhatsApp Cloud API — sends text + PDF document automatically
 */
const WhatsAppSendModal: React.FC<WhatsAppSendModalProps> = ({
  show,
  onClose,
  phoneNumber,
  recipientName,
  defaultMessage,
  title = 'Send WhatsApp Message',
  planData,
}) => {
  const [message, setMessage] = useState(defaultMessage);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingCloud, setSendingCloud] = useState(false);
  const [cloudResult, setCloudResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [downloadHint, setDownloadHint] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setMessage(defaultMessage);
      setCloudResult(null);
      setSending(false);
      setSendingCloud(false);
      setDownloadHint(false);
      isWhatsAppCloudConfigured().then(setCloudConfigured).catch(() => setCloudConfigured(false));
    }
  }, [show, defaultMessage]);

  if (!show) return null;

  const normalized = normalizePhone(phoneNumber);

  /** Generate PDF, upload to server, send download link via wa.me */
  const handleOpenWhatsApp = async () => {
    const el = pdfContentRef.current;
    if (!el) return;
    setSending(true);
    setDownloadHint(false);
    try {
      const blob = await generatePdfFromElement(el, recipientName, { width: planData ? 700 : 400 });
      const pdfFilename = `${recipientName.replace(/\s+/g, '-')}-plan.pdf`;
      const file = new File([blob], pdfFilename, { type: 'application/pdf' });

      // Try Web Share API with files — only if browser actually supports file sharing
      const canShareFiles = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
      if (canShareFiles) {
        try {
          await navigator.share({
            title: recipientName,
            text: message,
            files: [file],
          });
          return; // Successfully shared
        } catch (err: any) {
          if (err?.name === 'AbortError') return; // user cancelled
          console.log('Web Share API failed, using upload fallback:', err?.message);
        }
      }

      // Fallback: upload PDF to server → get public URL → open wa.me with link in message
      let messageWithLink = message;
      let uploaded = false;
      try {
        const result = await uploadSharePdf(blob, pdfFilename);
        messageWithLink = `${message}\n\n📎 Download Plan PDF:\n${result.url}`;
        uploaded = true;
      } catch (uploadErr) {
        console.warn('PDF upload failed, falling back to local download:', uploadErr);
        // Last resort: auto-download the PDF locally
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdfFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Open wa.me with contact + message (includes PDF link if upload succeeded)
      const whatsappUrl = normalized
        ? `https://wa.me/${normalized}?text=${encodeURIComponent(messageWithLink)}`
        : `https://wa.me/?text=${encodeURIComponent(messageWithLink)}`;
      window.open(whatsappUrl, '_blank');

      setDownloadHint(!uploaded); // only show manual attach hint if upload failed
    } catch (err) {
      console.error('WhatsApp share error:', err);
      setCloudResult({ success: false, error: 'Failed to generate PDF. Try again.' });
    } finally {
      setSending(false);
    }
  };

  /** Send text + PDF via WhatsApp Cloud API */
  const handleSendCloudApi = async () => {
    if (!normalized) {
      setCloudResult({ success: false, error: 'No phone number provided.' });
      return;
    }
    const el = pdfContentRef.current;
    if (!el) return;
    setSendingCloud(true);
    setCloudResult(null);
    try {
      const blob = await generatePdfFromElement(el, recipientName, { width: planData ? 700 : 400 });
      const result = await sendWhatsAppTextAndDocument(
        normalized,
        message,
        blob,
        `${recipientName.replace(/\s+/g, '-')}-plan.pdf`,
        recipientName
      );
      const success = result.success ?? result.results?.every((r) => r.success) ?? false;
      if (success) {
        setCloudResult({ success: true });
        setTimeout(() => setCloudResult(null), 4000);
      } else {
        const errors = result.results?.filter((r) => !r.success).map((r) => r.error).filter(Boolean);
        setCloudResult({ success: false, error: errors?.join('; ') || result.error || 'Failed to send.' });
      }
    } catch (err: any) {
      setCloudResult({ success: false, error: err?.response?.data?.error || err?.message || 'Failed to send' });
    } finally {
      setSendingCloud(false);
    }
  };

  // Format message lines for the PDF slip
  const messageLines = message.split('\n');

  const fmtPdf = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-success text-white py-2">
            <h6 className="modal-title fw-bold mb-0">
              <i className="ti ti-brand-whatsapp me-2"></i>{title}
            </h6>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {cloudResult && (
            <div className={`alert ${cloudResult.success ? 'alert-success' : 'alert-danger'} mb-0 py-2 rounded-0 text-center small`}>
              {cloudResult.success
                ? <><i className="ti ti-check me-1"></i>Sent via WhatsApp Cloud API (text + PDF)!</>
                : <><i className="ti ti-alert-triangle me-1"></i>{cloudResult.error}</>}
            </div>
          )}

          {downloadHint && (
            <div className="alert alert-warning mb-0 py-2 rounded-0 small">
              <div className="fw-bold mb-1"><i className="ti ti-download me-1"></i>PDF Downloaded (server upload failed)</div>
              <div>WhatsApp is opening. To attach the PDF manually:</div>
              <ol className="mb-0 ps-3 mt-1" style={{ fontSize: 12 }}>
                <li>Click the <i className="ti ti-paperclip"></i> <strong>attach</strong> icon in WhatsApp</li>
                <li>Select <strong>Document</strong> and choose the downloaded PDF</li>
                <li>Press <strong>Send</strong></li>
              </ol>
            </div>
          )}

          <div className="modal-body">
            {/* Recipient Info */}
            <div className="d-flex align-items-center mb-3 p-2 bg-light rounded">
              <div className="rounded-circle bg-success-transparent text-success d-flex align-items-center justify-content-center me-3" style={{ width: 40, height: 40, minWidth: 40 }}>
                <i className="ti ti-user fs-20"></i>
              </div>
              <div>
                <div className="fw-bold">{recipientName}</div>
                <small className="text-muted"><i className="ti ti-phone me-1"></i>{phoneNumber || 'No phone number'}</small>
              </div>
            </div>

            {/* Message */}
            <div className="mb-3">
              <label className="form-label fw-medium">Message</label>
              <textarea
                className="form-control"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
              />
            </div>

            {/* Send Options */}
            <div className="d-flex flex-column gap-2">
              {/* Option 1: wa.me link with PDF (always available) */}
              <button
                className="btn btn-success d-flex align-items-center justify-content-center gap-2"
                onClick={handleOpenWhatsApp}
                disabled={!message.trim() || sending}
              >
                {sending ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  <i className="ti ti-brand-whatsapp fs-18"></i>
                )}
                <span>Open in WhatsApp</span>
                <small className="opacity-75">(with PDF)</small>
              </button>

              {/* Option 2: WhatsApp Cloud API */}
              {cloudConfigured ? (
                <button
                  className="btn btn-outline-success d-flex align-items-center justify-content-center gap-2"
                  onClick={handleSendCloudApi}
                  disabled={sendingCloud || !message.trim() || !normalized}
                >
                  {sendingCloud ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <i className="ti ti-send fs-18"></i>
                  )}
                  <span>Send via WhatsApp API</span>
                  <small className="opacity-75">(text + PDF)</small>
                </button>
              ) : (
                <div className="text-center">
                  <small className="text-muted">
                    <i className="ti ti-info-circle me-1"></i>
                    WhatsApp Cloud API not configured.
                    <a href="/whatsapp-settings" className="ms-1">Configure</a>
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Hidden PDF content — rendered off-screen, captured by html2canvas */}
          <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <div ref={pdfContentRef} style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", width: planData ? 700 : 400, padding: 24, background: '#fff', color: '#333' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #25D366', paddingBottom: 12, marginBottom: 16 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Asyentyx</h2>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Lahore</div>
              </div>

              {planData ? (
                <>
                  {/* Plan Summary Info */}
                  <h3 style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', margin: '0 0 14px', color: '#25D366' }}>Installment Plan — Full Repayment Schedule</h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 12, marginBottom: 14 }}>
                    <div><strong>Customer:</strong> {planData.customerName}</div>
                    {planData.customerPhone && <div><strong>Phone:</strong> {planData.customerPhone}</div>}
                    {planData.customerCnic && <div><strong>CNIC:</strong> {planData.customerCnic}</div>}
                    <div><strong>Product:</strong> {planData.productName}</div>
                    <div><strong>Price:</strong> Rs {fmtPdf(planData.productPrice)}</div>
                    <div><strong>Down Payment:</strong> Rs {fmtPdf(planData.downPayment)}</div>
                    <div><strong>Finance Amount:</strong> Rs {fmtPdf(planData.financeAmount)}</div>
                    <div><strong>Interest:</strong> {planData.interestRate}%</div>
                    <div><strong>Tenure:</strong> {planData.tenure} months</div>
                    <div><strong>EMI:</strong> Rs {fmtPdf(planData.emiAmount)}</div>
                    <div><strong>Total Payable:</strong> Rs {fmtPdf(planData.totalPayable)}</div>
                    <div><strong>Start Date:</strong> {planData.startDate}</div>
                    <div><strong>Status:</strong> {planData.status}</div>
                    <div><strong>Paid:</strong> {planData.paidInstallments}/{planData.tenure}</div>
                    <div><strong>Remaining:</strong> {planData.remainingInstallments}</div>
                  </div>

                  {planData.guarantors && planData.guarantors.length > 0 && (
                    <div style={{ fontSize: 12, marginBottom: 10 }}>
                      <strong>Guarantor(s):</strong> {planData.guarantors.map(g => `${g.name}${g.phone ? ` (${g.phone})` : ''}`).join(', ')}
                    </div>
                  )}

                  {/* Repayment Schedule Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#25D366', color: '#fff' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #1ea855' }}>#</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #1ea855' }}>Due Date</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #1ea855' }}>EMI Amount</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #1ea855' }}>Paid</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #1ea855' }}>Paid Date</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #1ea855' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planData.schedule.map((entry, idx) => {
                        const statusColor: Record<string, string> = { paid: '#28a745', partial: '#fd7e14', due: '#ffc107', overdue: '#dc3545', upcoming: '#6c757d' };
                        const bgColor = idx % 2 === 0 ? '#fff' : '#f8f9fa';
                        return (
                          <tr key={entry.installmentNo} style={{ backgroundColor: bgColor }}>
                            <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #dee2e6' }}>{entry.installmentNo}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #dee2e6' }}>{entry.dueDate}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #dee2e6' }}>Rs {fmtPdf(entry.emiAmount)}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #dee2e6' }}>{entry.actualPaidAmount != null ? `Rs ${fmtPdf(entry.actualPaidAmount)}` : '-'}</td>
                            <td style={{ padding: '5px 8px', border: '1px solid #dee2e6' }}>{entry.paidDate || '-'}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #dee2e6', color: statusColor[entry.status] || '#333', fontWeight: 600, textTransform: 'capitalize' }}>{entry.status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#e9ecef', fontWeight: 700 }}>
                        <td colSpan={2} style={{ padding: '6px 8px', border: '1px solid #dee2e6' }}>Total</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #dee2e6' }}>Rs {fmtPdf(planData.schedule.reduce((s, e) => s + e.emiAmount, 0))}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #dee2e6' }}>Rs {fmtPdf(planData.schedule.reduce((s, e) => s + (e.actualPaidAmount || 0), 0))}</td>
                        <td colSpan={2} style={{ padding: '6px 8px', border: '1px solid #dee2e6' }}></td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              ) : (
                <>
                  {/* Simple message-only PDF (non-plan usage) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: '#555' }}>To:</span>
                    <span style={{ fontWeight: 500 }}>{recipientName}</span>
                  </div>
                  {phoneNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: '#555' }}>Phone:</span>
                      <span style={{ fontWeight: 500 }}>{phoneNumber}</span>
                    </div>
                  )}
                  <div style={{ borderBottom: '1px solid #ddd', margin: '8px 0 12px' }}></div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {messageLines.map((line, i) => (
                      <div key={i}>{line.replace(/\*/g, '') || '\u00A0'}</div>
                    ))}
                  </div>
                </>
              )}

              {/* Footer */}
              <div style={{ borderTop: '1px solid #ddd', marginTop: 16, paddingTop: 10, textAlign: 'center', fontSize: 10, color: '#999' }}>
                Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSendModal;
