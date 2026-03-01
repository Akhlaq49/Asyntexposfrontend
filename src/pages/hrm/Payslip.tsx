import React, { useState, useEffect } from 'react';
import { getPayrollById, Payroll } from '../../services/hrmService';
import { showError } from '../../utils/alertUtils';

const Payslip: React.FC = () => {
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
    catch { showError('Failed to load payslip'); }
    finally { setLoading(false); }
  };

  const fmtCurrency = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
  if (!payroll) return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Payslip</h4><h6>View payslip details</h6></div></div>
      </div>
      <div className="card"><div className="card-body text-center py-5"><p className="text-muted">No payslip selected. Go to Employee Salary and click View Payslip.</p><a href="/employee-salary" className="btn btn-primary">Go to Employee Salary</a></div></div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Payslip</h4><h6>Payslip for {payroll.employeeName}</h6></div></div>
        <div className="page-btn"><a href="/employee-salary" className="btn btn-secondary me-2"><i className="ti ti-arrow-left me-1"></i>Back</a><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); window.print(); }}><i className="ti ti-printer me-1"></i>Print</a></div>
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
              <h6>Payslip #{payroll.id}</h6>
              <p className="text-muted mb-0">Period: {payroll.month ? `${months[(payroll.month || 1) - 1]} ${payroll.year}` : '—'}</p>
              <span className={`badge ${payroll.status === 'Paid' ? 'badge-success' : 'badge-warning'} mt-1`}>{payroll.status}</span>
            </div>
          </div>
          <hr />
          <div className="row">
            <div className="col-md-6">
              <h6 className="text-primary mb-3">Earnings</h6>
              <table className="table table-borderless">
                <tbody>
                  <tr><td>Basic Salary</td><td className="text-end">{fmtCurrency(payroll.basicSalary)}</td></tr>
                  <tr><td>HRA</td><td className="text-end">{fmtCurrency(payroll.hra)}</td></tr>
                  <tr><td>Conveyance</td><td className="text-end">{fmtCurrency(payroll.conveyance)}</td></tr>
                  <tr><td>Medical Allowance</td><td className="text-end">{fmtCurrency(payroll.medicalAllowance)}</td></tr>
                  <tr><td>Bonus</td><td className="text-end">{fmtCurrency(payroll.bonus)}</td></tr>
                  <tr><td>Other Allowance</td><td className="text-end">{fmtCurrency(payroll.otherAllowance)}</td></tr>
                  <tr className="border-top"><td><strong>Total Earnings</strong></td><td className="text-end"><strong>{fmtCurrency(payroll.totalAllowance)}</strong></td></tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-6">
              <h6 className="text-danger mb-3">Deductions</h6>
              <table className="table table-borderless">
                <tbody>
                  <tr><td>Provident Fund (PF)</td><td className="text-end">{fmtCurrency(payroll.pf)}</td></tr>
                  <tr><td>Professional Tax</td><td className="text-end">{fmtCurrency(payroll.professionalTax)}</td></tr>
                  <tr><td>TDS</td><td className="text-end">{fmtCurrency(payroll.tds)}</td></tr>
                  <tr><td>Loan Deduction</td><td className="text-end">{fmtCurrency(payroll.loanDeduction)}</td></tr>
                  <tr><td>Other Deduction</td><td className="text-end">{fmtCurrency(payroll.otherDeduction)}</td></tr>
                  <tr className="border-top"><td><strong>Total Deductions</strong></td><td className="text-end"><strong>{fmtCurrency(payroll.totalDeduction)}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <hr />
          <div className="row">
            <div className="col-md-12 text-end">
              <h4>Net Salary: <span className="text-success">{fmtCurrency(payroll.netSalary)}</span></h4>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Payslip;

