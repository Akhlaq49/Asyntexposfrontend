import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEmployeeById, Employee } from '../../services/hrmService';
import { showError } from '../../utils/alertUtils';

const EmployeeDetails: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const employeeId = parseInt(searchParams.get('id') || '0');
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (employeeId) loadEmployee(); }, [employeeId]);

  const loadEmployee = async () => {
    setLoading(true);
    try { const data = await getEmployeeById(employeeId); setEmp(data); }
    catch { showError(t('hrm.failed_load_employee_details')); }
    finally { setLoading(false); }
  };

  const formatDate = (d?: string) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
  if (!emp) return <div className="text-center py-5"><p className="text-muted">{t('hrm.employee_not_found')}</p><Link to="/employees-list" className="btn btn-secondary mt-2">{t('hrm.back_to_list')}</Link></div>;

  return (
    <>
      <div className="page-header">
        <div><Link to="/employees-list" className="d-inline-flex align-items-center"><i className="ti ti-chevron-left me-2"></i>{t('hrm.back_to_list')}</Link></div>
      </div>
      <div className="row">
        {/* Left Sidebar - Profile Card */}
        <div className="col-xl-4">
          <div className="card rounded-0 border-0">
            <div className="card-header rounded-0 bg-primary d-flex align-items-center">
              <span className="avatar avatar-xl avatar-rounded flex-shrink-0 border border-white border-3 me-3">
                <img src={emp.picture || '/assets/img/users/user-01.jpg'} alt="Img" />
              </span>
              <div className="me-3">
                <h6 className="text-white mb-1">{emp.fullName}{emp.lastName ? ` ${emp.lastName}` : ''}</h6>
                <span className="badge bg-purple-transparent text-purple">{emp.designationName || '—'}</span>
              </div>
              <div>
                <Link to={`/edit-employee?id=${emp.id}`} className="btn btn-white">{t('hrm.edit_profile')}</Link>
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="d-inline-flex align-items-center"><i className="ti ti-id me-2"></i>{t('hrm.employee_id')}</span>
                <p className="text-dark">{emp.employeeId || '—'}</p>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="d-inline-flex align-items-center"><i className="ti ti-star me-2"></i>{t('hrm.department')}</span>
                <p className="text-dark">{emp.departmentName || '—'}</p>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="d-inline-flex align-items-center"><i className="ti ti-calendar-check me-2"></i>{t('hrm.date_of_join')}</span>
                <p className="text-dark">{formatDate(emp.dateOfJoining)}</p>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span className="d-inline-flex align-items-center"><i className="ti ti-circle-check me-2"></i>{t('common.status')}</span>
                <span className={`badge ${emp.isActive ? 'badge-success' : 'badge-danger'} d-inline-flex align-items-center badge-xs`}>
                  <i className="ti ti-point-filled me-1"></i>{emp.isActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="col-xl-8">
          {/* Basic Information */}
          <div className="card rounded-0 border-0">
            <div className="card-header border-0 rounded-0 bg-light d-flex align-items-center"><h6>{t('hrm.basic_information')}</h6></div>
            <div className="card-body pb-0">
              <div className="row">
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('common.phone')}</p><span className="text-gray-900 fs-13">{emp.phone || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('common.email')}</p><span className="text-gray-900 fs-13">{emp.email || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('hrm.shift')}</p><span className="text-gray-900 fs-13">{emp.shiftName || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('hrm.designation')}</p><span className="text-gray-900 fs-13">{emp.designationName || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('hrm.basic_salary')}</p><span className="text-gray-900 fs-13">{emp.basicSalary ? `Rs ${emp.basicSalary.toLocaleString()}` : '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('hrm.joining_date')}</p><span className="text-gray-900 fs-13">{formatDate(emp.dateOfJoining)}</span></div></div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="card rounded-0 border-0">
            <div className="card-header border-0 rounded-0 bg-light d-flex align-items-center"><h6>{t('hrm.address_information')}</h6></div>
            <div className="card-body pb-0">
              <div className="row">
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('common.address')}</p><span className="text-gray-900 fs-13">{emp.address || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('common.city')}</p><span className="text-gray-900 fs-13">{emp.city || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('common.state')}</p><span className="text-gray-900 fs-13">{emp.state || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('common.country')}</p><span className="text-gray-900 fs-13">{emp.country || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">{t('common.postal_code')}</p><span className="text-gray-900 fs-13">{emp.postalCode || '—'}</span></div></div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card rounded-0 border-0">
            <div className="card-header border-0 rounded-0 bg-light d-flex align-items-center"><h6>{t('hrm.quick_actions')}</h6></div>
            <div className="card-body">
              <div className="d-flex gap-2 flex-wrap">
                <Link to={`/edit-employee?id=${emp.id}`} className="btn btn-sm btn-outline-primary"><i className="ti ti-edit me-1"></i>{t('common.edit')}</Link>
                <Link to="/employee-salary" className="btn btn-sm btn-outline-success"><i className="ti ti-cash me-1"></i>{t('hrm.payroll')}</Link>
                <Link to="/leaves-admin" className="btn btn-sm btn-outline-warning"><i className="ti ti-calendar me-1"></i>{t('hrm.leaves')}</Link>
                <Link to="/attendance-admin" className="btn btn-sm btn-outline-info"><i className="ti ti-clock me-1"></i>{t('hrm.attendance')}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeDetails;

