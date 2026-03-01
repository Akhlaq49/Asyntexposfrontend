import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEmployees, deleteEmployee, getDepartments, getDesignations, Employee, Department, Designation as DesignationType } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const EmployeesGrid: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Employee[]>([]);
  const [, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<DesignationType[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDesig, setFilterDesig] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterDesig]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, depts, desigs] = await Promise.all([getEmployees(), getDepartments(), getDesignations()]);
      setItems(emps); setDepartments(depts); setDesignations(desigs);
    } catch { showError('Failed to load employees'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.fullName.toLowerCase().includes(q) || (i.email || '').toLowerCase().includes(q) || (i.employeeId || '').toLowerCase().includes(q)); }
    if (filterDesig) result = result.filter(i => i.designationName === filterDesig);
    setFiltered(result);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteEmployee(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess('Employee deleted'); loadData(); }
    catch { showError('Failed to delete'); }
  };

  const totalCount = items.length;
  const activeCount = items.filter(i => i.isActive).length;
  const inactiveCount = items.filter(i => !i.isActive).length;
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newJoiners = items.filter(i => i.dateOfJoining && new Date(i.dateOfJoining) >= thirtyDaysAgo).length;

  const formatDate = (d?: string) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }); };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Employees</h4><h6>Manage your employees</h6></div></div>
        <ul className="table-top-head">
          <li>
            <div className="d-flex me-2 pe-2 border-end">
              <Link to="/employees-list" className="btn-list me-2"><i data-feather="list" className="feather-user"></i></Link>
              <Link to="/employees-grid" className="btn-grid active bg-primary me-2"><i data-feather="grid" className="feather-user text-white"></i></Link>
            </div>
          </li>
        </ul>
        <div className="page-btn"><Link to="/add-employee" className="btn btn-primary"><i className="ti ti-circle-plus me-1"></i>Add Employee</Link></div>
      </div>

      {/* Stats Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6">
          <div className="card bg-purple border-0"><div className="card-body d-flex align-items-center justify-content-between"><div><p className="mb-1 text-white">Total Employee</p><h4 className="text-white">{totalCount}</h4></div><div><span className="avatar avatar-lg bg-purple-900"><i className="ti ti-users-group"></i></span></div></div></div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card bg-teal border-0"><div className="card-body d-flex align-items-center justify-content-between"><div><p className="mb-1 text-white">Active</p><h4 className="text-white">{activeCount}</h4></div><div><span className="avatar avatar-lg bg-teal-900"><i className="ti ti-user-star"></i></span></div></div></div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card bg-secondary border-0"><div className="card-body d-flex align-items-center justify-content-between"><div><p className="mb-1 text-white">Inactive</p><h4 className="text-white">{inactiveCount}</h4></div><div><span className="avatar avatar-lg bg-secondary-900"><i className="ti ti-user-exclamation"></i></span></div></div></div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card bg-info border-0"><div className="card-body d-flex align-items-center justify-content-between"><div><p className="mb-1 text-white">New Joiners</p><h4 className="text-white">{newJoiners}</h4></div><div><span className="avatar avatar-lg bg-info-900"><i className="ti ti-user-check"></i></span></div></div></div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="search-set mb-0">
              <div className="search-input">
                <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
                <input type="search" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
              <div className="dropdown">
                <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">{filterDesig || 'Designation'}</a>
                <ul className="dropdown-menu dropdown-menu-end p-3">
                  <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterDesig(''); }}>All</a></li>
                  {designations.map(d => <li key={d.id}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterDesig(d.name); }}>{d.name}</a></li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div> : (
        <div className="employee-grid-widget">
          <div className="row">
            {filtered.map(emp => (
              <div key={emp.id} className="col-xxl-3 col-xl-4 col-lg-6 col-md-6">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div className="form-check form-check-md"></div>
                      <div>
                        <Link to={`/employee-details?id=${emp.id}`} className="avatar avatar-xl avatar-rounded border p-1 rounded-circle">
                          <img src={emp.picture || '/assets/img/users/user-01.jpg'} className="img-fluid h-auto w-auto" alt="img" />
                        </Link>
                      </div>
                      <div className="dropdown">
                        <a href="#" className="action-icon border-0" data-bs-toggle="dropdown" aria-expanded="false"><i data-feather="more-vertical" className="feather-user"></i></a>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); navigate(`/edit-employee?id=${emp.id}`); }}><i data-feather="edit" className="me-2"></i>Edit</a></li>
                          <li><a className="dropdown-item confirm-text mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(emp.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="me-2"></i>Delete</a></li>
                        </ul>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-primary mb-2">EMP ID : {emp.employeeId || '—'}</p>
                    </div>
                    <div className="text-center mb-3">
                      <h6 className="mb-1"><Link to={`/employee-details?id=${emp.id}`}>{emp.fullName}{emp.lastName ? ` ${emp.lastName}` : ''}</Link></h6>
                      <span className="badge bg-secondary-transparent text-gray-9 fs-10 fw-medium">{emp.designationName || '—'}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between bg-light rounded p-3">
                      <div className="text-start"><h6 className="mb-1">Joined</h6><p>{formatDate(emp.dateOfJoining)}</p></div>
                      <div className="text-start"><h6 className="mb-1">Department</h6><p>{emp.departmentName || '—'}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="col-12 text-center py-5"><p className="text-muted">No employees found</p></div>}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="content p-5 px-3 text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2"><i className="ti ti-trash fs-24 text-danger"></i></span>
                <h4 className="fs-20 text-gray-9 fw-bold mb-2 mt-1">Delete Employee</h4>
                <p className="text-gray-6 mb-0 fs-16">Are you sure you want to delete employee?</p>
                <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                  <button type="button" className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-submit fs-13 fw-medium p-2 px-3" onClick={confirmDelete}>Yes Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeesGrid;

