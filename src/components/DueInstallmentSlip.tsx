import React, { useRef, useState, useEffect } from 'react';
import { InstallmentPlan, RepaymentEntry } from '../services/installmentService';
import { MEDIA_BASE_URL } from '../services/api';
import { downloadPdf, shareViaWhatsApp, sendViaWhatsAppCloudApi, isWhatsAppCloudConfigured } from '../utils/pdfWhatsappShare';

interface DueInstallmentSlipProps {
  plan: InstallmentPlan;
  entry: RepaymentEntry;
  onClose: () => void;
}

const DueInstallmentSlip: React.FC<DueInstallmentSlipProps> = ({ plan, entry, onClose }) => {
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

  const previouslyPaid = (entry.actualPaidAmount || 0) + (entry.miscAdjustedAmount || 0);
  const remainingForEntry = entry.emiAmount - previouslyPaid;

  const totalDeposited =
    plan.schedule
      .filter((e) => e.status === 'paid' || e.status === 'partial')
      .reduce((s, e) => s + (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0), 0) + plan.downPayment;

  const totalAmount = plan.totalPayable;
  const totalRemaining = totalAmount - totalDeposited;

  const isOverdue = entry.status === 'overdue';
  const isPartial = entry.status === 'partial';

  const statusLabel = isOverdue ? 'OVERDUE' : isPartial ? 'PARTIALLY PAID' : 'DUE';
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
    return `${emoji} *${statusLabel} Installment Reminder*\n\n👤 Customer: ${plan.customerName}\n📦 Product: ${plan.productName}\n📋 Installment #${entry.installmentNo}\n💰 Amount Due: Rs ${fmt(remainingForEntry > 0 ? remainingForEntry : entry.emiAmount)}\n📅 Due Date: ${entry.dueDate}\n\nPlease make the payment at your earliest convenience.`;
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
          <div className="modal-header text-white py-2" style={{ background: statusColor }}>
            <h6 className="modal-title fw-bold mb-0"><i className="ti ti-alert-circle me-2"></i>{statusLabel} Installment</h6>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-light" onClick={handlePrint} title="Print">
                <i className="ti ti-printer me-1"></i>Print
              </button>
              <button className="btn btn-sm btn-light" onClick={handleDownloadPdf} disabled={downloading} title="Download PDF">
                {downloading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="ti ti-download me-1"></i>PDF</>}
              </button>
              <button className="btn btn-sm btn-success" onClick={handleShareWhatsApp} disabled={sharing} title="Share via WhatsApp">
                {sharing ? <span className="spinner-border spinner-border-sm"></span> : <><i className="ti ti-brand-whatsapp me-1"></i>WhatsApp</>}
              </button>
              {cloudConfigured && (
                <button className="btn btn-sm btn-outline-success" onClick={handleSendWhatsAppCloud} disabled={sendingCloud} title="Send via WhatsApp Cloud API">
                  {sendingCloud ? <span className="spinner-border spinner-border-sm"></span> : <><i className="ti ti-send me-1"></i>Send</>}
                </button>
              )}
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
          </div>
          {cloudResult && (
            <div className={`alert ${cloudResult.success ? 'alert-success' : 'alert-danger'} mb-0 py-2 rounded-0 text-center small`}>
              {cloudResult.success ? <><i className="ti ti-check me-1"></i>Sent via WhatsApp Cloud API!</> : <><i className="ti ti-alert-triangle me-1"></i>{cloudResult.error}</>}
            </div>
          )}
          <div className="modal-body p-0">
            <div ref={slipRef}>
              <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: 400, margin: '0 auto', padding: 20 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', paddingBottom: 15, borderBottom: '2px solid #e0e0e0', marginBottom: 15 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                    {plan.customerImage ? (
                      <img
                        src={`${MEDIA_BASE_URL}${plan.customerImage}`}
                        alt=""
                        style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${statusColor}` }}
                      />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: statusColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 'bold' }}>
                        {plan.customerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                        Asyentyx
                      </h2>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Lahore</div>
                    </div>
                  </div>
                  <div style={{ display: 'inline-block', background: statusColor, color: 'white', padding: '4px 20px', borderRadius: 4, fontWeight: 700, fontSize: 14, marginTop: 8 }}>
                    {statusLabel} INSTALLMENT
                  </div>
                </div>

                {/* Customer Information */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  CUSTOMER INFORMATION
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Name:</span>
                  <span style={{ fontWeight: 500 }}>{plan.customerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Mobile:</span>
                  <span style={{ fontWeight: 500 }}>{plan.customerPhone || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Product:</span>
                  <span style={{ fontWeight: 500 }}>{plan.productName}</span>
                </div>

                {/* Due Installment Details */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  INSTALLMENT DETAILS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Installment #:</span>
                  <span style={{ fontWeight: 700 }}>{entry.installmentNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Due Date:</span>
                  <span style={{ fontWeight: 500 }}>{entry.dueDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>EMI Amount:</span>
                  <span style={{ fontWeight: 500 }}>Rs {fmt(entry.emiAmount)}</span>
                </div>
                {isPartial && previouslyPaid > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span style={{ color: '#555', fontWeight: 600 }}>Already Paid:</span>
                      <span style={{ fontWeight: 500, color: '#28a745' }}>Rs {fmt(previouslyPaid)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span style={{ color: '#555', fontWeight: 600 }}>Remaining:</span>
                      <span style={{ fontWeight: 700, color: '#dc3545' }}>Rs {fmt(remainingForEntry)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Status:</span>
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
                    Amount Due
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: statusColor }}>
                    Rs {fmt(remainingForEntry > 0 ? remainingForEntry : entry.emiAmount)}
                  </div>
                  {isOverdue && (
                    <div style={{ fontSize: 11, color: '#dc3545', fontWeight: 600, marginTop: 4 }}>
                      ⚠ This installment is overdue. Please pay immediately.
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  OVERALL SUMMARY
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>TOTAL AMOUNT</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>TOTAL PAID</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>REMAINING</th>
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
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>TOTAL INST.</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>PAID INST.</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>REMAINING</th>
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
                  <span style={{ fontWeight: 600 }}>Monthly EMI:</span>
                  <span style={{ fontWeight: 700 }}>Rs {fmt(plan.emiAmount)}</span>
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', background: statusColor, color: '#fff', padding: 8, borderRadius: 4, fontSize: 11, marginTop: 12, fontWeight: 600 }}>
                  Please pay Rs {fmt(remainingForEntry > 0 ? remainingForEntry : entry.emiAmount)} for installment #{entry.installmentNo} by {entry.dueDate}
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
