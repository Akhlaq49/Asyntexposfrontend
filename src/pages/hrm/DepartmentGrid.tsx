import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getEmployees, Department, CreateDepartment, Employee } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const DepartmentGrid: React.FC = () => {
  const [items, setItems] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const emptyForm: CreateDepartment = { name: '', hodId: undefined, description: '', status: 'active', isActive: true };
  const [form, setForm] = useState<CreateDepartment>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [depts, emps] = await Promise.all([getDepartments(), getEmployees()]);
      setItems(depts); setEmployees(emps);
    } catch { showError('Failed to load departments'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.name.toLowerCase().includes(q)); }
    if (filterStatus === 'active') result = result.filter(i => i.isActive);
    else if (filterStatus === 'inactive') result = result.filter(i => !i.isActive);
    setFiltered(result);
  };

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEditModal = (item: Department) => {
    setEditingId(item.id);
    setForm({ name: item.name, hodId: item.hodId || undefined, description: item.description || '', status: item.status, isActive: item.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { showError('Department name is required'); return; }
    try {
      if (editingId) await updateDepartment(editingId, form);
      else await createDepartment(form);
      setShowModal(false); showSuccess(editingId ? 'Department updated' : 'Department created'); loadData();
    } catch { showError('Failed to save'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteDepartment(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess('Department deleted'); loadData(); }
    catch { showError('Failed to delete'); }
  };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Departments</h4><h6>Manage your departments</h6></div></div>
        <ul className="table-top-head">
          <li>
            <div className="d-flex me-2 pe-2 border-end">
              <Link to="/department-list" className="btn-list me-2"><i data-feather="list" className="feather-user"></i></Link>
              <Link to="/department-grid" className="btn-grid active bg-primary me-2"><i data-feather="grid" className="feather-user text-white"></i></Link>
            </div>
          </li>
        </ul>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>Add Department</a></div>
      </div>

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
                <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
                  {filterStatus ? (filterStatus === 'active' ? 'Active' : 'Inactive') : 'Select Status'}
                </a>
                <ul className="dropdown-menu dropdown-menu-end p-3">
                  <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>All</a></li>
                  <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('active'); }}>Active</a></li>
                  <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('inactive'); }}>Inactive</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div> : (
        <div className="employee-grid-widget">
          <div className="row">
            {filtered.map(dept => (
              <div key={dept.id} className="col-xxl-3 col-xl-4 col-lg-6 col-md-6">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between mb-4">
                      <h5 className="d-inline-flex align-items-center"><i className={`ti ti-point-filled ${dept.isActive ? 'text-success' : 'text-danger'} fs-20`}></i>{dept.name}</h5>
                      <div className="dropdown">
                        <a href="#" className="action-icon border-0" data-bs-toggle="dropdown" aria-expanded="false"><i data-feather="more-vertical" className="feather-user"></i></a>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); openEditModal(dept); }}><i data-feather="edit" className="info-img me-2"></i>Edit</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(dept.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img me-2"></i>Delete</a></li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-light rounded p-3 text-center mb-4">
                      <div className="avatar avatar-lg mb-2">
                        <img src={dept.hodPicture || '/assets/img/users/user-01.jpg'} alt="HOD" />
                      </div>
                      <h4>{dept.hodName || 'Not Assigned'}</h4>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <p className="mb-0">Total Members: {String(dept.memberCount).padStart(2, '0')}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="col-12 text-center py-5"><p className="text-muted">No departments found</p></div>}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><div className="page-title"><h4>{editingId ? 'Edit Department' : 'Add Department'}</h4></div><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">Department <span className="text-danger">*</span></label><input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">HOD</label>
                    <select className="form-select" value={form.hodId || ''} onChange={e => setForm({ ...form, hodId: e.target.value ? parseInt(e.target.value) : undefined })}>
                      <option value="">Choose</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}{emp.lastName ? ` ${emp.lastName}` : ''}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}></textarea></div></div>
                  <div className="input-blocks m-0">
                    <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                      <span className="status-label">Status</span>
                      <div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary me-2" onClick={() => setShowModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleSave}>Save Changes</button></div>
            </div>
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
                <h4 className="fs-20 text-gray-9 fw-bold mb-2 mt-1">Delete Department</h4>
                <p className="text-gray-6 mb-0 fs-16">Are you sure you want to delete department?</p>
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

export default DepartmentGrid;

