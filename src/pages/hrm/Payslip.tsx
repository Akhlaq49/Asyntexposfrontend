import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getPayrollById, Payroll } from '../../services/hrmService';
import { showError } from '../../utils/alertUtils';

const Payslip: React.FC = () => {
  const { t } = useTranslation();
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) loadPayslip(parseInt(id));
  }, []);

  const loadPayslip = async (id: number) => {
    setLoading(true);
    try { setPayroll(await getPayrollById(id)); }
    catch { showError(t('hrm.failed_load_payroll')); }
    finally { setLoading(false); }
  };

  const fmtCurrency = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const months = [t('hrm.january'),t('hrm.february'),t('hrm.march'),t('hrm.april'),t('hrm.may'),t('hrm.june'),t('hrm.july'),t('hrm.august'),t('hrm.september'),t('hrm.october'),t('hrm.november'),t('hrm.december')];

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
  if (!payroll) return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>{t('hrm.payslip')}</h4><h6>{t('hrm.view_payslip_details')}</h6></div></div>
      </div>
      <div className="card"><div className="card-body text-center py-5"><p className="text-muted">{t('hrm.no_payslip_selected')}</p><a href="/employee-salary" className="btn btn-primary">{t('hrm.go_to_employee_salary')}</a></div></div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>{t('hrm.payslip')}</h4><h6>{t('hrm.payslip_for', { name: payroll.employeeName })}</h6></div></div>
        <div className="page-btn"><a href="/employee-salary" className="btn btn-secondary me-2"><i className="ti ti-arrow-left me-1"></i>{t('common.back')}</a><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); window.print(); }}><i className="ti ti-printer me-1"></i>{t('common.print')}</a></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-3">
                <img src={payroll.employeePicture || '/assets/img/users/user-01.jpg'} alt="" className="avatar avatar-lg me-3" />
                <div>
                  <h5 className="mb-1">{payroll.employeeName}</h5>
                  {payroll.employeeEmail && <p className="text-muted mb-0">{payroll.employeeEmail}</p>}
                  {payroll.employeeRole && <small className="text-muted">{payroll.employeeRole}</small>}
                </div>
              </div>
            </div>
            <div className="col-md-6 text-md-end">
              <h6>{t('hrm.payslip_id', { id: payroll.id })}</h6>
              <p className="text-muted mb-0">{t('hrm.period')}: {payroll.month ? `${months[(payroll.month || 1) - 1]} ${payroll.year}` : '—'}</p>
              <span className={`badge ${payroll.status === 'Paid' ? 'badge-success' : 'badge-warning'} mt-1`}>{payroll.status}</span>
            </div>
          </div>
          <hr />
          <div className="row">
            <div className="col-md-6">
              <h6 className="text-primary mb-3">{t('hrm.earnings')}</h6>
              <table className="table table-borderless">
                <tbody>
                  <tr><td>{t('hrm.basic_salary')}</td><td className="text-end">{fmtCurrency(payroll.basicSalary)}</td></tr>
                  <tr><td>{t('hrm.hra')}</td><td className="text-end">{fmtCurrency(payroll.hra)}</td></tr>
                  <tr><td>{t('hrm.conveyance')}</td><td className="text-end">{fmtCurrency(payroll.conveyance)}</td></tr>
                  <tr><td>{t('hrm.medical_allowance')}</td><td className="text-end">{fmtCurrency(payroll.medicalAllowance)}</td></tr>
                  <tr><td>{t('hrm.bonus')}</td><td className="text-end">{fmtCurrency(payroll.bonus)}</td></tr>
                  <tr><td>{t('hrm.other_allowance')}</td><td className="text-end">{fmtCurrency(payroll.otherAllowance)}</td></tr>
                  <tr className="border-top"><td><strong>{t('hrm.total_earnings')}</strong></td><td className="text-end"><strong>{fmtCurrency(payroll.totalAllowance)}</strong></td></tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-6">
              <h6 className="text-danger mb-3">{t('hrm.deductions')}</h6>
              <table className="table table-borderless">
                <tbody>
                  <tr><td>{t('hrm.provident_fund')}</td><td className="text-end">{fmtCurrency(payroll.pf)}</td></tr>
                  <tr><td>{t('hrm.professional_tax')}</td><td className="text-end">{fmtCurrency(payroll.professionalTax)}</td></tr>
                  <tr><td>{t('hrm.tds')}</td><td className="text-end">{fmtCurrency(payroll.tds)}</td></tr>
                  <tr><td>{t('hrm.loan_deduction')}</td><td className="text-end">{fmtCurrency(payroll.loanDeduction)}</td></tr>
                  <tr><td>{t('hrm.other_deduction')}</td><td className="text-end">{fmtCurrency(payroll.otherDeduction)}</td></tr>
                  <tr className="border-top"><td><strong>{t('hrm.total_deductions')}</strong></td><td className="text-end"><strong>{fmtCurrency(payroll.totalDeduction)}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <hr />
          <div className="row">
            <div className="col-md-12 text-end">
              <h4>{t('hrm.net_salary')}: <span className="text-success">{fmtCurrency(payroll.netSalary)}</span></h4>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Payslip;

