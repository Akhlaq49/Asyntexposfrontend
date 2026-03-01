import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getEmployeeById, updateEmployee, getDepartments, getDesignations, getShifts, CreateEmployee, Department, Designation as DesignationType, Shift } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const EditEmployee: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const employeeId = parseInt(searchParams.get('id') || '0');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<DesignationType[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const emptyForm: CreateEmployee = { fullName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', departmentId: undefined, designationId: undefined, shiftId: undefined, dateOfJoining: '', basicSalary: undefined, status: 'active', isActive: true };
  const [form, setForm] = useState<CreateEmployee>({ ...emptyForm });

  useEffect(() => { loadData(); }, [employeeId]);

  const loadData = async () => {
    if (!employeeId) { navigate('/employees-list'); return; }
    setLoading(true);
    try {
      const [emp, deps, desigs, shfs] = await Promise.all([getEmployeeById(employeeId), getDepartments(), getDesignations(), getShifts()]);
      setDepartments(deps); setDesignations(desigs); setShifts(shfs);
      setForm({
        fullName: emp.fullName, lastName: emp.lastName || '', email: emp.email || '', phone: emp.phone || '',
        address: emp.address || '', city: emp.city || '', state: emp.state || '', country: emp.country || '', postalCode: emp.postalCode || '',
        departmentId: emp.departmentId || undefined, designationId: emp.designationId || undefined, shiftId: emp.shiftId || undefined,
        dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.split('T')[0] : '', basicSalary: emp.basicSalary || undefined,
        status: emp.status, isActive: emp.isActive
      });
    } catch { showError('Failed to load employee'); navigate('/employees-list'); }
    finally { setLoading(false); }
  };

  const filteredDesignations = form.departmentId ? designations.filter(d => d.departmentId === form.departmentId) : designations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName) { showError('First Name is required'); return; }
    try {
      await updateEmployee(employeeId, form);
      showSuccess('Employee updated successfully');
      navigate('/employees-list');
    } catch { showError('Failed to update employee'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Edit Employee</h4><h6>Update Employee details</h6></div></div>
        <div className="page-btn"><Link to="/employees-list" className="btn btn-secondary"><i data-feather="arrow-left" className="me-2"></i>Back to List</Link></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="accordions-items-seperate" id="accordionExample">
          {/* Employee Information */}
          <div className="accordion-item border mb-4">
            <h2 className="accordion-header">
              <div className="accordion-button bg-white" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                <div className="d-flex align-items-center justify-content-between flex-fill">
                  <h5 className="d-inline-flex align-items-center"><i className="ti ti-users text-primary me-2"></i><span>Employee Information</span></h5>
                </div>
              </div>
            </h2>
            <div id="collapseOne" className="accordion-collapse collapse show">
              <div className="accordion-body border-top">
                <div className="row">
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">First Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Last Name</label><input type="text" className="form-control" value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Contact Number</label><input type="text" className="form-control" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Joining Date</label><input type="date" className="form-control" value={form.dateOfJoining || ''} onChange={e => setForm({ ...form, dateOfJoining: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Shift</label>
                    <select className="form-select" value={form.shiftId || ''} onChange={e => setForm({ ...form, shiftId: e.target.value ? parseInt(e.target.value) : undefined })}>
                      <option value="">Select</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Department</label>
                    <select className="form-select" value={form.departmentId || ''} onChange={e => setForm({ ...form, departmentId: e.target.value ? parseInt(e.target.value) : undefined, designationId: undefined })}>
                      <option value="">Select</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Designation</label>
                    <select className="form-select" value={form.designationId || ''} onChange={e => setForm({ ...form, designationId: e.target.value ? parseInt(e.target.value) : undefined })}>
                      <option value="">Select</option>
                      {filteredDesignations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Basic Salary</label><input type="number" className="form-control" value={form.basicSalary || ''} onChange={e => setForm({ ...form, basicSalary: parseFloat(e.target.value) || undefined })} /></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="accordion-item border mb-4">
            <div className="accordion-header">
              <div className="accordion-button bg-white" data-bs-toggle="collapse" data-bs-target="#collapseThree">
                <div className="d-flex align-items-center justify-content-between flex-fill">
                  <h5 className="d-inline-flex align-items-center"><i data-feather="map-pin" className="feather-edit text-primary me-2"></i><span>Address Information</span></h5>
                </div>
              </div>
            </div>
            <div id="collapseThree" className="accordion-collapse collapse show">
              <div className="accordion-body border-top">
                <div className="row">
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Address</label><input type="text" className="form-control" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Country</label><input type="text" className="form-control" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">State</label><input type="text" className="form-control" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">City</label><input type="text" className="form-control" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div></div>
                  <div className="col-lg-4 col-md-6"><div className="mb-3"><label className="form-label">Zipcode</label><input type="text" className="form-control" value={form.postalCode || ''} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="accordion-item border mb-4">
            <div className="accordion-body">
              <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                <span className="status-label">Active Status</span>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-end mb-3">
          <button type="button" className="btn btn-secondary me-2" onClick={() => navigate('/employees-list')}>Cancel</button>
          <button type="submit" className="btn btn-primary">Update Employee</button>
        </div>
      </form>
    </>
  );
};

export default EditEmployee;

