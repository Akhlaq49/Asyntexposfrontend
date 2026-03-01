import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getEmployeeById, Employee } from '../../services/hrmService';
import { showError } from '../../utils/alertUtils';

const EmployeeDetails: React.FC = () => {
  const [searchParams] = useSearchParams();
  const employeeId = parseInt(searchParams.get('id') || '0');
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (employeeId) loadEmployee(); }, [employeeId]);

  const loadEmployee = async () => {
    setLoading(true);
    try { const data = await getEmployeeById(employeeId); setEmp(data); }
    catch { showError('Failed to load employee details'); }
    finally { setLoading(false); }
  };

  const formatDate = (d?: string) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
  if (!emp) return <div className="text-center py-5"><p className="text-muted">Employee not found</p><Link to="/employees-list" className="btn btn-secondary mt-2">Back to List</Link></div>;

  return (
    <>
      <div className="page-header">
        <div><Link to="/employees-list" className="d-inline-flex align-items-center"><i className="ti ti-chevron-left me-2"></i>Back to List</Link></div>
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
                <Link to={`/edit-employee?id=${emp.id}`} className="btn btn-white">Edit Profile</Link>
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="d-inline-flex align-items-center"><i className="ti ti-id me-2"></i>Employee ID</span>
                <p className="text-dark">{emp.employeeId || '—'}</p>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="d-inline-flex align-items-center"><i className="ti ti-star me-2"></i>Department</span>
                <p className="text-dark">{emp.departmentName || '—'}</p>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="d-inline-flex align-items-center"><i className="ti ti-calendar-check me-2"></i>Date Of Join</span>
                <p className="text-dark">{formatDate(emp.dateOfJoining)}</p>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span className="d-inline-flex align-items-center"><i className="ti ti-circle-check me-2"></i>Status</span>
                <span className={`badge ${emp.isActive ? 'badge-success' : 'badge-danger'} d-inline-flex align-items-center badge-xs`}>
                  <i className="ti ti-point-filled me-1"></i>{emp.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="col-xl-8">
          {/* Basic Information */}
          <div className="card rounded-0 border-0">
            <div className="card-header border-0 rounded-0 bg-light d-flex align-items-center"><h6>Basic Information</h6></div>
            <div className="card-body pb-0">
              <div className="row">
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Phone</p><span className="text-gray-900 fs-13">{emp.phone || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Email</p><span className="text-gray-900 fs-13">{emp.email || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Shift</p><span className="text-gray-900 fs-13">{emp.shiftName || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Designation</p><span className="text-gray-900 fs-13">{emp.designationName || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Basic Salary</p><span className="text-gray-900 fs-13">{emp.basicSalary ? `Rs ${emp.basicSalary.toLocaleString()}` : '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Joining Date</p><span className="text-gray-900 fs-13">{formatDate(emp.dateOfJoining)}</span></div></div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="card rounded-0 border-0">
            <div className="card-header border-0 rounded-0 bg-light d-flex align-items-center"><h6>Address Information</h6></div>
            <div className="card-body pb-0">
              <div className="row">
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Address</p><span className="text-gray-900 fs-13">{emp.address || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">City</p><span className="text-gray-900 fs-13">{emp.city || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">State</p><span className="text-gray-900 fs-13">{emp.state || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Country</p><span className="text-gray-900 fs-13">{emp.country || '—'}</span></div></div>
                <div className="col-md-4"><div className="mb-3"><p className="fs-13 mb-2">Postal Code</p><span className="text-gray-900 fs-13">{emp.postalCode || '—'}</span></div></div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card rounded-0 border-0">
            <div className="card-header border-0 rounded-0 bg-light d-flex align-items-center"><h6>Quick Actions</h6></div>
            <div className="card-body">
              <div className="d-flex gap-2 flex-wrap">
                <Link to={`/edit-employee?id=${emp.id}`} className="btn btn-sm btn-outline-primary"><i className="ti ti-edit me-1"></i>Edit</Link>
                <Link to="/employee-salary" className="btn btn-sm btn-outline-success"><i className="ti ti-cash me-1"></i>Payroll</Link>
                <Link to="/leaves-admin" className="btn btn-sm btn-outline-warning"><i className="ti ti-calendar me-1"></i>Leaves</Link>
                <Link to="/attendance-admin" className="btn btn-sm btn-outline-info"><i className="ti ti-clock me-1"></i>Attendance</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeDetails;

