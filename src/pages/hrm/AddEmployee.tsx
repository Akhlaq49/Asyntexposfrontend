import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createEmployee, getDepartments, getDesignations, getShifts, CreateEmployee, Department, Designation as DesignationType, Shift } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const AddEmployee: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<DesignationType[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const emptyForm: CreateEmployee & { confirmPassword?: string } = { fullName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', departmentId: undefined, designationId: undefined, shiftId: undefined, dateOfJoining: '', basicSalary: undefined, password: '', confirmPassword: '', status: 'active', isActive: true };
  const [form, setForm] = useState<CreateEmployee & { confirmPassword?: string }>({ ...emptyForm });

  useEffect(() => { loadOptions(); }, []);

  const loadOptions = async () => {
    try {
      const [deps, desigs, shfs] = await Promise.all([getDepartments(), getDesignations(), getShifts()]);
      setDepartments(deps); setDesignations(desigs); setShifts(shfs);
    } catch { showError(t('hrm.failed_load_options')); }
  };

  const filteredDesignations = form.departmentId ? designations.filter(d => d.departmentId === form.departmentId) : designations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName) { showError(t('hrm.first_name_required')); return; }
    if (form.password && form.password !== form.confirmPassword) { showError(t('hrm.passwords_not_match')); return; }
    try {
      const { confirmPassword, ...payload } = form;
      await createEmployee(payload);
      showSuccess(t('hrm.employee_created_successfully'));
      navigate('/employees-list');
    } catch { showError(t('hrm.failed_create_employee')); }
  };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>{t('hrm.add_employee')}</h4><h6>{t('hrm.create_new_employee')}</h6></div></div>
        <div className="page-btn"><Link to="/employees-list" className="btn btn-secondary"><i data-feather="arrow-left" className="me-2"></i>{t('hrm.back_to_list')}</Link></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="accordions-items-seperate" id="accordionExample">
          {/* Employee Information */}
          <div className="accordion-item border mb-4">
            <h2 className="accordion-header">
              <div className="accordion-button bg-white" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                <div className="d-flex align-items-center justify-content-between flex-fill">
                  <h5 className="d-inline-flex align-items-center"><i className="ti ti-users text-primary me-2"></i><span>{t('hrm.employee_information')}</span></h5>
                </div>
              </div>
            </h2>
            <div id="collapseOne" className="accordion-collapse collapse show">
              <div className="accordion-body border-top">
                <div className="row">
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('common.first_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('common.last_name')}</label><input type="text" className="form-control" value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('common.email')}</label><input type="email" className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('hrm.contact_number')}</label><input type="text" className="form-control" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('hrm.joining_date')}</label><input type="date" className="form-control" value={form.dateOfJoining || ''} onChange={e => setForm({ ...form, dateOfJoining: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('hrm.shift')}</label>
                    <select className="form-select" value={form.shiftId || ''} onChange={e => setForm({ ...form, shiftId: e.target.value ? parseInt(e.target.value) : undefined })}>
                      <option value="">{t('common.select')}</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('hrm.department')}</label>
                    <select className="form-select" value={form.departmentId || ''} onChange={e => setForm({ ...form, departmentId: e.target.value ? parseInt(e.target.value) : undefined, designationId: undefined })}>
                      <option value="">{t('common.select')}</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('hrm.designation')}</label>
                    <select className="form-select" value={form.designationId || ''} onChange={e => setForm({ ...form, designationId: e.target.value ? parseInt(e.target.value) : undefined })}>
                      <option value="">{t('common.select')}</option>
                      {filteredDesignations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('hrm.basic_salary')}</label><input type="number" className="form-control" value={form.basicSalary || ''} onChange={e => setForm({ ...form, basicSalary: parseFloat(e.target.value) || undefined })} /></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="accordion-item border mb-4">
            <div className="accordion-header">
              <div className="accordion-button bg-white" data-bs-toggle="collapse" data-bs-target="#collapseThree">
                <div className="d-flex align-items-center justify-content-between flex-fill">
                  <h5 className="d-inline-flex align-items-center"><i data-feather="map-pin" className="feather-edit text-primary me-2"></i><span>{t('hrm.address_information')}</span></h5>
                </div>
              </div>
            </div>
            <div id="collapseThree" className="accordion-collapse collapse show">
              <div className="accordion-body border-top">
                <div className="row">
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('common.address')}</label><input type="text" className="form-control" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('common.country')}</label><input type="text" className="form-control" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('common.state')}</label><input type="text" className="form-control" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('common.city')}</label><input type="text" className="form-control" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('hrm.zipcode')}</label><input type="text" className="form-control" value={form.postalCode || ''} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="accordion-item border mb-4">
            <div className="accordion-header">
              <div className="accordion-button bg-white" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                <div className="d-flex align-items-center justify-content-between flex-fill">
                  <h5 className="d-inline-flex align-items-center"><i data-feather="info" className="feather-edit text-primary me-2"></i><span>{t('auth.password')}</span></h5>
                </div>
              </div>
            </div>
            <div id="collapseTwo" className="accordion-collapse collapse show">
              <div className="accordion-body border-top">
                <div className="row">
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('auth.password')}</label><input type="password" className="form-control" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">{t('auth.confirm_password')}</label><input type="password" className="form-control" value={form.confirmPassword || ''} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} /></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="accordion-item border mb-4">
            <div className="accordion-body">
              <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                <span className="status-label">{t('hrm.active_status')}</span>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-end mb-3">
          <button type="button" className="btn btn-secondary me-2" onClick={() => navigate('/employees-list')}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary">{t('hrm.add_employee')}</button>
        </div>
      </form>
    </>
  );
};

export default AddEmployee;

