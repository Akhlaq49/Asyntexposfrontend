import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { InstallmentPlan, getInstallmentPlans, cancelInstallment } from '../../services/installmentService';
import { mediaUrl, MEDIA_BASE_URL } from '../../services/api';
import WhatsAppSendModal from '../../components/WhatsAppSendModal';

const InstallmentPlans: React.FC = () => {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [whatsappPlan, setWhatsappPlan] = useState<InstallmentPlan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getInstallmentPlans();
        setPlans(data);
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(plans.map((p) => p.id)) : new Set());
  }, [plans]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const openCancelModal = (id: string) => { setCancelId(id); setShowCancelModal(true); };

  const handleCancel = async () => {
    if (!cancelId) return;
    await cancelInstallment(cancelId);
    setPlans((prev) => prev.map((p) => p.id === cancelId ? { ...p, status: 'cancelled' as const } : p));
    setShowCancelModal(false);
    setCancelId(null);
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const buildWhatsAppMessage = (p: InstallmentPlan) => {
    const overdue = p.schedule.filter(e => e.status === 'overdue');
    const due = p.schedule.filter(e => e.status === 'due');
    const lines = [
      `📋 *Installment Plan — Full Repayment Schedule*`,
      ``,
      `👤 Customer: ${p.customerName}`,
      `📦 Product: ${p.productName}`,
      `💰 Product Price: Rs ${fmt(p.productPrice)}`,
      `📊 Down Payment: Rs ${fmt(p.downPayment)}`,
      `💳 Monthly EMI: Rs ${fmt(p.emiAmount)}`,
      `📅 Tenure: ${p.tenure} months`,
      `✅ Paid: ${p.paidInstallments}/${p.tenure}`,
      `📌 Remaining: ${p.remainingInstallments} installments`,
    ];
    if (overdue.length > 0) {
      lines.push(``, `🔴 *${overdue.length} Overdue Installment(s)* — Please pay immediately.`);
    }
    if (due.length > 0) {
      lines.push(``, `🟡 *Next Due:* ${due[0].dueDate} — Rs ${fmt(due[0].emiAmount)}`);
    }
    if (p.nextDueDate) {
      lines.push(``, `📅 Next Due Date: ${p.nextDueDate}`);
    }
    // Full schedule
    lines.push(``, `━━━━━━━━━━━━━━━━━━━━━`, `📄 *Repayment Schedule:*`, ``);
    p.schedule.forEach(e => {
      const statusIcon: Record<string, string> = { paid: '✅', partial: '🟠', due: '🟡', overdue: '🔴', upcoming: '⚪' };
      const icon = statusIcon[e.status] || '⚪';
      const paid = e.actualPaidAmount != null && e.actualPaidAmount > 0 ? ` (Paid: Rs ${fmt(e.actualPaidAmount)})` : '';
      lines.push(`${icon} #${e.installmentNo} | ${e.dueDate} | Rs ${fmt(e.emiAmount)} | ${e.status.toUpperCase()}${paid}`);
    });
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    return lines.join('\n');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'bg-success', completed: 'bg-info', defaulted: 'bg-danger', cancelled: 'bg-secondary' };
    return <span className={`badge fw-medium fs-10 ${map[status] || 'bg-secondary'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  const filtered = plans.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchGuarantor = p.guarantors?.some(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.phone?.toLowerCase().includes(q) ||
        g.cnic?.toLowerCase().includes(q)
    );
    const matchSearch = !searchTerm || p.customerName.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q) || matchGuarantor;
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Installment Plans</h4>
            <h6>Manage product installment plans &amp; repayments</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Pdf" onClick={(e) => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="img" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Excel" onClick={(e) => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="img" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); window.location.reload(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
        <div className="page-btn">
          <Link to="/create-installment" className="btn btn-primary">
            <i className="ti ti-circle-plus me-1"></i>Create Installment Plan
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-3">
        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-1 text-muted">Total Plans</p>
                <h4 className="fw-bold">{plans.length}</h4>
              </div>
              <span className="rounded-circle d-inline-flex p-2 bg-primary-transparent"><i className="ti ti-file-text fs-24 text-primary"></i></span>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-1 text-muted">Active Plans</p>
                <h4 className="fw-bold">{plans.filter((p) => p.status === 'active').length}</h4>
              </div>
              <span className="rounded-circle d-inline-flex p-2 bg-success-transparent"><i className="ti ti-check fs-24 text-success"></i></span>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-1 text-muted">Total Financed</p>
                <h4 className="fw-bold">{fmt(plans.reduce((s, p) => s + p.financedAmount, 0))}</h4>
              </div>
              <span className="rounded-circle d-inline-flex p-2 bg-warning-transparent"><i className="ti ti-currency-dollar fs-24 text-warning"></i></span>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6">
          <div className="card">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-1 text-muted">Total Interest</p>
                <h4 className="fw-bold">{fmt(plans.reduce((s, p) => s + p.totalInterest, 0))}</h4>
              </div>
              <span className="rounded-circle d-inline-flex p-2 bg-info-transparent"><i className="ti ti-percentage fs-24 text-info"></i></span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter(''); }}>All</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('active'); }}>Active</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('completed'); }}>Completed</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('defaulted'); }}>Defaulted</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('cancelled'); }}>Cancelled</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th className="no-sort">
                      <label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label>
                    </th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Down Payment</th>
                    <th>EMI</th>
                    <th>Tenure</th>
                    <th>Interest</th>
                    <th>Total Payable</th>
                    <th>Paid</th>
                    <th>Status</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(plan.id)} onChange={(e) => handleSelectOne(plan.id, e.target.checked)} /><span className="checkmarks"></span></label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {plan.customerImage ? (
                            <img src={`${MEDIA_BASE_URL}${plan.customerImage}`} alt={plan.customerName} className="rounded-circle border me-2" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                          ) : (
                            <span className="avatar avatar-sm me-2 bg-primary-transparent text-primary d-flex align-items-center justify-content-center rounded-circle fw-bold">
                              {plan.customerName.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <span className="text-gray-9 fw-medium">{plan.customerName}</span>
                            <br /><small className="text-muted">{plan.customerPhone}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a className="avatar avatar-md me-2"><img src={mediaUrl(plan.productImage)} alt="product" /></a>
                          <span>{plan.productName}</span>
                        </div>
                      </td>
                      <td>{fmt(plan.productPrice)}</td>
                      <td>{fmt(plan.downPayment)}</td>
                      <td className="fw-medium">{fmt(plan.emiAmount)}</td>
                      <td>{plan.tenure} mo</td>
                      <td>{plan.interestRate}%</td>
                      <td className="fw-medium">{fmt(plan.totalPayable)}</td>
                      <td>{plan.paidInstallments}/{plan.tenure}</td>
                      <td>{statusBadge(plan.status)}</td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <Link to={`/installment-details/${plan.id}`} className="me-2 p-2" title="View Details">
                            <i data-feather="eye" className="feather-eye"></i>
                          </Link>
                          <a className="me-2 p-2 text-success" href="#" onClick={(e) => { e.preventDefault(); setWhatsappPlan(plan); }} title="Send WhatsApp">
                            <i className="ti ti-brand-whatsapp fs-16"></i>
                          </a>
                          {plan.status === 'active' && (
                            <a className="p-2" href="#" onClick={(e) => { e.preventDefault(); openCancelModal(plan.id); }} title="Cancel Plan">
                              <i data-feather="trash-2" className="feather-trash-2"></i>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2"><i className="ti ti-trash fs-24 text-danger"></i></span>
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Cancel Installment Plan</h4>
                  <p className="mb-0 fs-16">Are you sure you want to cancel this installment plan?</p>
                  <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                    <button type="button" className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none" onClick={() => setShowCancelModal(false)}>No, Keep It</button>
                    <button type="button" className="btn btn-danger fs-13 fw-medium p-2 px-3" onClick={handleCancel}>Yes, Cancel Plan</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        show={!!whatsappPlan}
        onClose={() => setWhatsappPlan(null)}
        phoneNumber={whatsappPlan?.customerPhone || ''}
        recipientName={whatsappPlan?.customerName || ''}
        defaultMessage={whatsappPlan ? buildWhatsAppMessage(whatsappPlan) : ''}
        title="Send Installment Reminder"
        planData={whatsappPlan ? {
          customerName: whatsappPlan.customerName,
          customerPhone: whatsappPlan.customerPhone,
          customerCnic: whatsappPlan.customerCnic,
          productName: whatsappPlan.productName,
          productPrice: whatsappPlan.productPrice,
          downPayment: whatsappPlan.downPayment,
          financeAmount: whatsappPlan.financeAmount ?? whatsappPlan.financedAmount,
          interestRate: whatsappPlan.interestRate,
          tenure: whatsappPlan.tenure,
          emiAmount: whatsappPlan.emiAmount,
          totalPayable: whatsappPlan.totalPayable,
          startDate: whatsappPlan.startDate,
          status: whatsappPlan.status,
          paidInstallments: whatsappPlan.paidInstallments,
          remainingInstallments: whatsappPlan.remainingInstallments,
          schedule: whatsappPlan.schedule.map(e => ({
            installmentNo: e.installmentNo,
            dueDate: e.dueDate,
            emiAmount: e.emiAmount,
            status: e.status,
            actualPaidAmount: e.actualPaidAmount,
            paidDate: e.paidDate,
          })),
          guarantors: whatsappPlan.guarantors?.map(g => ({ name: g.name, phone: g.phone })),
        } : undefined}
      />
    </>
  );
};

export default InstallmentPlans;
