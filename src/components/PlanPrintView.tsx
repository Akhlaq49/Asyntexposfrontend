import React, { useRef, useState, useEffect } from 'react';
import { InstallmentPlan } from '../services/installmentService';

import { downloadPdf, shareViaWhatsApp, sendViaWhatsAppCloudApi, isWhatsAppCloudConfigured } from '../utils/pdfWhatsappShare';

interface PlanPrintViewProps {
  plan: InstallmentPlan;
  onClose: () => void;
}

const PlanPrintView: React.FC<PlanPrintViewProps> = ({ plan, onClose }) => {
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
      .reduce((s, e) => s + (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0), 0) + plan.downPayment;

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
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'due': return 'Due';
      case 'overdue': return 'Overdue';
      default: return 'Upcoming';
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
      .reduce((s, e) => s + (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0), 0) + plan.downPayment;
    const outstanding = plan.totalPayable - totalPaidAmt;
    return `📋 *Repayment Plan*\n\n👤 Customer: ${plan.customerName}\n📦 Product: ${plan.productName}\n💰 Total Payable: Rs ${fmt(plan.totalPayable)}\n✅ Paid: Rs ${fmt(totalPaidAmt)}\n⏳ Outstanding: Rs ${fmt(outstanding > 0 ? outstanding : 0)}\n📅 Tenure: ${plan.tenure} months (${plan.paidInstallments}/${plan.tenure} paid)`;
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
  const sTitle: React.CSSProperties = { fontWeight: 800, fontSize: 14, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, marginBottom: 10, letterSpacing: 0.5 };
  const sRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 };
  const sLabel: React.CSSProperties = { color: '#555', fontWeight: 600 };
  const sValue: React.CSSProperties = { fontWeight: 500 };
  const sTh: React.CSSProperties = { background: '#4a90d9', color: '#fff', padding: '7px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', border: '1px solid #3a7bc8', whiteSpace: 'nowrap' };
  const sTd: React.CSSProperties = { border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center', fontSize: 12 };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-primary text-white py-2">
            <h6 className="modal-title fw-bold mb-0"><i className="ti ti-file-text me-2"></i>Full Repayment Plan</h6>
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
          <div className="modal-body p-0" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div ref={printRef}>
              <div style={{ width: '100%', padding: '20px 28px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", color: '#333' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '3px solid #4a90d9', paddingBottom: 16, marginBottom: 20 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Asyentyx</h1>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Lahore</div>
                  <div style={{ display: 'inline-block', background: '#4a90d9', color: '#fff', padding: '5px 24px', borderRadius: 4, fontWeight: 700, fontSize: 14, marginTop: 10 }}>
                    INSTALLMENT PLAN DETAILS
                  </div>
                </div>

                {/* Customer + Product side by side using table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 16 }}>
                        <div style={sTitle}>CUSTOMER INFORMATION</div>
                        <div style={sRow}><span style={sLabel}>Name:</span><span style={sValue}>{plan.customerName}</span></div>
                        {plan.customerSo && <div style={sRow}><span style={sLabel}>S/O:</span><span style={sValue}>{plan.customerSo}</span></div>}
                        <div style={sRow}><span style={sLabel}>Mobile:</span><span style={sValue}>{plan.customerPhone || '-'}</span></div>
                        {plan.customerCnic && <div style={sRow}><span style={sLabel}>CNIC:</span><span style={sValue}>{plan.customerCnic}</span></div>}
                        <div style={sRow}><span style={sLabel}>Address:</span><span style={sValue}>{plan.customerAddress || '-'}</span></div>
                      </td>
                      <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: 16 }}>
                        <div style={sTitle}>PRODUCT INFORMATION</div>
                        <div style={sRow}><span style={sLabel}>Product:</span><span style={sValue}>{plan.productName}</span></div>
                        <div style={sRow}><span style={sLabel}>Price:</span><span style={sValue}>Rs {fmt(plan.productPrice)}</span></div>
                        {plan.financeAmount != null && plan.financeAmount > 0 && plan.financeAmount !== plan.productPrice && (
                          <div style={sRow}><span style={sLabel}>Finance Amount:</span><span style={sValue}>Rs {fmt(plan.financeAmount)}</span></div>
                        )}
                        <div style={sRow}><span style={sLabel}>Down Payment:</span><span style={sValue}>Rs {fmt(plan.downPayment)}</span></div>
                        <div style={sRow}><span style={sLabel}>Financed:</span><span style={sValue}>Rs {fmt(plan.financedAmount)}</span></div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Plan Details */}
                <div style={{ marginBottom: 18 }}>
                  <div style={sTitle}>PLAN DETAILS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 16 }}>
                          <div style={sRow}><span style={sLabel}>Start Date:</span><span style={sValue}>{plan.startDate}</span></div>
                          <div style={sRow}><span style={sLabel}>Tenure:</span><span style={sValue}>{plan.tenure} months</span></div>
                          <div style={sRow}><span style={sLabel}>Interest Rate:</span><span style={sValue}>{plan.interestRate}% p.a.</span></div>
                          <div style={sRow}><span style={sLabel}>Monthly EMI:</span><span style={{ fontWeight: 700, color: '#4a90d9' }}>Rs {fmt(plan.emiAmount)}</span></div>
                        </td>
                        <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: 16 }}>
                          <div style={sRow}><span style={sLabel}>Total Interest:</span><span style={{ fontWeight: 600, color: '#dc3545' }}>Rs {fmt(plan.totalInterest)}</span></div>
                          <div style={sRow}><span style={sLabel}>Total Payable:</span><span style={{ fontWeight: 700 }}>Rs {fmt(plan.totalPayable)}</span></div>
                          <div style={sRow}><span style={sLabel}>Total Paid:</span><span style={{ fontWeight: 700, color: '#28a745' }}>Rs {fmt(totalPaid)}</span></div>
                          <div style={sRow}><span style={sLabel}>Outstanding:</span><span style={{ fontWeight: 700, color: totalRemaining > 0 ? '#dc3545' : '#28a745' }}>Rs {fmt(totalRemaining > 0 ? totalRemaining : 0)}</span></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Progress bar */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                      <span>Repayment Progress</span>
                      <span>{plan.paidInstallments} / {plan.tenure} installments ({progressPct}%)</span>
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
                    <div style={sTitle}>GUARANTOR{plan.guarantors.length > 1 ? 'S' : ''} ({plan.guarantors.length})</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={sTh}>Name</th>
                          <th style={sTh}>S/O</th>
                          <th style={sTh}>Phone</th>
                          <th style={sTh}>CNIC</th>
                          <th style={sTh}>Address</th>
                          <th style={sTh}>Relationship</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.guarantors.map((g) => (
                          <tr key={g.id}>
                            <td style={{ ...sTd, fontWeight: 700, textAlign: 'left' }}>{g.name}</td>
                            <td style={sTd}>{g.so || '—'}</td>
                            <td style={sTd}>{g.phone || '—'}</td>
                            <td style={sTd}>{g.cnic || '—'}</td>
                            <td style={{ ...sTd, textAlign: 'left' }}>{g.address || '—'}</td>
                            <td style={sTd}>{g.relationship || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Repayment Schedule */}
                <div style={{ marginBottom: 18 }}>
                  <div style={sTitle}>REPAYMENT SCHEDULE</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={sTh}>#</th>
                        <th style={sTh}>Due Date</th>
                        <th style={sTh}>EMI</th>
                        <th style={sTh}>Paid</th>
                        <th style={sTh}>Balance</th>
                        <th style={sTh}>Status</th>
                        <th style={sTh}>Paid Date</th>
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
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, color: '#fff', background: '#28a745' }}>Down Payment</span>
                        </td>
                        <td style={sTd}>{plan.startDate}</td>
                      </tr>
                      {plan.schedule.map((e) => {
                        const paidAmt = (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0);
                        const bgColor = e.status === 'overdue' ? '#fff5f5' : e.status === 'due' ? '#fffbe6' : e.status === 'partial' ? '#e8f8fd' : 'transparent';
                        return (
                          <tr key={e.installmentNo} style={{ background: bgColor }}>
                            <td style={{ ...sTd, fontWeight: 600 }}>{e.installmentNo}</td>
                            <td style={sTd}>{e.dueDate}</td>
                            <td style={{ ...sTd, fontWeight: 600 }}>Rs {fmt2(e.emiAmount)}</td>
                            <td style={{ ...sTd, color: paidAmt > 0 ? '#28a745' : '#999', fontWeight: paidAmt > 0 ? 700 : 400 }}>
                              {paidAmt > 0 ? `Rs ${fmt2(paidAmt)}` : '—'}
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
                        <td style={{ ...sTd, fontWeight: 700 }} colSpan={2}>TOTAL</td>
                        <td style={{ ...sTd, fontWeight: 700 }}>Rs {fmt2(plan.schedule.reduce((s, e) => s + e.emiAmount, 0))}</td>
                        <td style={{ ...sTd, fontWeight: 700, color: '#28a745' }}>Rs {fmt2(plan.schedule.filter(e => e.status === 'paid' || e.status === 'partial').reduce((s, e) => s + (e.actualPaidAmount || 0) + (e.miscAdjustedAmount || 0), 0))}</td>
                        <td style={sTd} colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Payment Record (empty rows for manual entry) */}
                <div style={{ marginBottom: 18 }}>
                  <div style={sTitle}>PAYMENT RECORD</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '6%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ ...sTh, whiteSpace: 'normal' }}>#</th>
                        <th style={{ ...sTh, whiteSpace: 'normal' }}>Date</th>
                        <th style={{ ...sTh, whiteSpace: 'normal' }}>Amount Received</th>
                        <th style={{ ...sTh, whiteSpace: 'normal' }}>Payment Method</th>
                        <th style={{ ...sTh, whiteSpace: 'normal' }}>Received By</th>
                        <th style={{ ...sTh, whiteSpace: 'normal' }}>Signature</th>
                        <th style={{ ...sTh, whiteSpace: 'normal' }}>Remarks</th>
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
                        <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Payable</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>Rs {fmt(plan.totalPayable)}</div>
                      </td>
                      <td style={{ width: '33.33%', textAlign: 'center', border: '1px solid #ddd', padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Paid</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#28a745' }}>Rs {fmt(totalPaid)}</div>
                      </td>
                      <td style={{ width: '33.33%', textAlign: 'center', border: '1px solid #ddd', padding: 10 }}>
                        <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Outstanding</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: totalRemaining > 0 ? '#dc3545' : '#28a745' }}>Rs {fmt(totalRemaining > 0 ? totalRemaining : 0)}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <div style={{ textAlign: 'center', borderTop: '2px solid #e0e0e0', paddingTop: 12, marginTop: 16, fontSize: 11, color: '#888' }}>
                  Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &bull; Plan #{plan.id} &bull; {plan.customerName}
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
