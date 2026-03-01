import React, { useRef, useState, useEffect } from 'react';
import { InstallmentPlan, RepaymentEntry } from '../services/installmentService';
import { MEDIA_BASE_URL } from '../services/api';
import { downloadPdf, shareViaWhatsApp, sendViaWhatsAppCloudApi, isWhatsAppCloudConfigured } from '../utils/pdfWhatsappShare';

interface DepositSlipProps {
  plan: InstallmentPlan;
  entry: RepaymentEntry;
  onClose: () => void;
}

const DepositSlip: React.FC<DepositSlipProps> = ({ plan, entry, onClose }) => {
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

  const totalDeposited =
    plan.schedule
      .filter((e) => e.status === 'paid' || e.status === 'partial')
      .reduce((s, e) => s + (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0), 0) + plan.downPayment;

  const totalAmount = plan.totalPayable;
  const remaining = totalAmount - totalDeposited;

  const paidCount = plan.paidInstallments;
  const remainingCount = plan.remainingInstallments;

  const depositAmount = (entry.actualPaidAmount || 0) + (entry.miscAdjustedAmount || 0);

  const paymentMode =
    entry.miscAdjustedAmount && entry.miscAdjustedAmount > 0 && (!entry.actualPaidAmount || entry.actualPaidAmount === 0)
      ? 'Misc Balance'
      : entry.miscAdjustedAmount && entry.miscAdjustedAmount > 0
        ? 'Cash + Misc'
        : 'Cash';

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
        <title>Deposit Slip - ${plan.customerName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; }
          .slip { width: 100%; max-width: 400px; margin: 0 auto; padding: 20px; }
          .slip-header { text-align: center; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0; margin-bottom: 15px; }
          .slip-header .logo-area { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }
          .slip-header .logo-area img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90d9; }
          .slip-header .logo-area .logo-placeholder { width: 50px; height: 50px; border-radius: 50%; background: #4a90d9; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
          .slip-header h2 { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .slip-header .address { font-size: 11px; color: #666; margin-top: 2px; }
          .slip-header .slip-title { display: inline-block; background: #4a90d9; color: white; padding: 4px 20px; border-radius: 4px; font-weight: 700; font-size: 14px; margin-top: 8px; }
          .section-title { font-weight: 800; font-size: 13px; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 4px; margin: 15px 0 10px; }
          .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .info-row .label { color: #555; font-weight: 600; }
          .info-row .value { font-weight: 500; text-align: right; }
          .deposit-amount { font-size: 22px; font-weight: 800; text-align: right; }
          .summary-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
          .summary-table th, .summary-table td { border: 1px solid #ccc; padding: 6px 10px; text-align: center; }
          .summary-table th { background: #f5f5f5; font-weight: 700; font-size: 11px; text-transform: uppercase; }
          .summary-table .green { color: #28a745; font-weight: 700; }
          .summary-table .orange { color: #e0a800; font-weight: 600; }
          .monthly-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-top: 1px solid #eee; }
          .monthly-row .label { font-weight: 600; }
          .monthly-row .value { font-weight: 700; }
          .footer-bar { text-align: center; background: #333; color: #fff; padding: 8px; border-radius: 4px; font-size: 11px; margin-top: 12px; font-weight: 600; }
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

  const pdfFilename = `Deposit-Slip-${plan.customerName.replace(/\s+/g, '-')}-Inst${entry.installmentNo}`;

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
    return `📄 *Deposit Slip*\n\n👤 Customer: ${plan.customerName}\n📦 Product: ${plan.productName}\n💰 Installment #${entry.installmentNo}\n💵 Amount: Rs ${fmt((entry.actualPaidAmount || 0) + (entry.miscAdjustedAmount || 0))}\n📅 Date: ${entry.paidDate || '-'}`;
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
          <div className="modal-header bg-primary text-white py-2">
            <h6 className="modal-title fw-bold mb-0"><i className="ti ti-receipt me-2"></i>Deposit Slip</h6>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-light" onClick={handlePrint} title="Print Slip">
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
              <div className="slip" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", maxWidth: 400, margin: '0 auto', padding: 20 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', paddingBottom: 15, borderBottom: '2px solid #e0e0e0', marginBottom: 15 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                    {plan.customerImage ? (
                      <img
                        src={`${MEDIA_BASE_URL}${plan.customerImage}`}
                        alt=""
                        style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid #4a90d9' }}
                      />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#4a90d9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 'bold' }}>
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
                  <div style={{ display: 'inline-block', background: '#4a90d9', color: 'white', padding: '4px 20px', borderRadius: 4, fontWeight: 700, fontSize: 14, marginTop: 8 }}>
                    DEPOSIT SLIP
                  </div>
                </div>

                {/* Buyer Information */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  BUYER INFORMATION
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
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Sale Date:</span>
                  <span style={{ fontWeight: 500 }}>{plan.startDate || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Down Payment:</span>
                  <span style={{ fontWeight: 500 }}>Rs {fmt(plan.downPayment)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Installment Type:</span>
                  <span style={{ fontWeight: 500 }}>{plan.tenure} months</span>
                </div>

                {/* Deposit Information */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  DEPOSIT INFORMATION
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Installment #:</span>
                  <span style={{ fontWeight: 700 }}>{entry.installmentNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Deposit Date:</span>
                  <span style={{ fontWeight: 500 }}>{formatDate(entry.paidDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Payment Type:</span>
                  <span style={{ fontWeight: 500 }}>Installment</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Payment Mode:</span>
                  <span style={{ fontWeight: 500 }}>{paymentMode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span style={{ color: '#555', fontWeight: 600 }}>Deposit Amount:</span>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>Rs {fmt(depositAmount)}</span>
                </div>

                {/* Financial Summary */}
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, margin: '15px 0 10px' }}>
                  FINANCIAL SUMMARY
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>TOTAL AMOUNT</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>TOTAL DEPOSITED</th>
                      <th style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', background: '#f5f5f5', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>REMAINING</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center' }}>Rs {fmt(totalAmount)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>Rs {fmt(totalDeposited)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#e0a800', fontWeight: 600 }}>Rs {fmt(remaining > 0 ? remaining : 0)}</td>
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
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#28a745', fontWeight: 700 }}>{paidCount}</td>
                      <td style={{ border: '1px solid #ccc', padding: '6px 10px', textAlign: 'center', color: '#e0a800', fontWeight: 600 }}>{remainingCount}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderTop: '1px solid #eee' }}>
                  <span style={{ fontWeight: 600 }}>Monthly Amount:</span>
                  <span style={{ fontWeight: 700 }}>Rs {fmt(plan.emiAmount)}</span>
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', background: '#333', color: '#fff', padding: 8, borderRadius: 4, fontSize: 11, marginTop: 12, fontWeight: 600 }}>
                  {remainingCount} installment{remainingCount !== 1 ? 's' : ''} remaining — Rs {fmt(remaining > 0 ? remaining : 0)} outstanding
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositSlip;
