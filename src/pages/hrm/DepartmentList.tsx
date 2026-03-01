import React, { useState, useEffect } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getEmployees, Department, CreateDepartment, Employee } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const DepartmentList: React.FC = () => {
  const [items, setItems] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const emptyForm: CreateDepartment = { name: '', hodId: undefined, description: '', status: 'active', isActive: true };
  const [form, setForm] = useState<CreateDepartment>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deps, emps] = await Promise.all([getDepartments(), getEmployees()]);
      setItems(deps);
      setEmployees(emps);
    } catch { showError('Failed to load departments'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.name.toLowerCase().includes(q) || (i.hodName || '').toLowerCase().includes(q)); }
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    setFiltered(result);
    setCurrentPage(1);
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

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

  const statusBadge = (s: string) => s === 'active' ? 'badge-success' : 'badge-danger';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Departments</h4><h6>Manage departments</h6></div></div>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>Add Department</a></div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set"><div className="search-input"><a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a><input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">Sort By: {sortBy === 'asc' ? 'Ascending' : sortBy === 'desc' ? 'Descending' : 'Recently Added'}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('recent'); }}>Recently Added</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('asc'); }}>Ascending</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('desc'); }}>Descending</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div> : (
            <div className="table-responsive">
              <table className="table datanew">
                <thead>
                  <tr>
                    <th className="no-sort"><label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label></th>
                    <th>Department</th><th>HOD</th><th>Members</th><th>Created On</th><th>Status</th><th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={7} className="text-center py-4">No departments found</td></tr> : paginated.map(item => (
                    <tr key={item.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectOne(item.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{item.name}</td>
                      <td>{item.hodName ? <div className="d-flex align-items-center"><a href="#" className="avatar avatar-md me-2"><img src={item.hodPicture || '/assets/img/users/user-01.jpg'} alt="" /></a><span>{item.hodName}</span></div> : <span className="text-muted">—</span>}</td>
                      <td>{item.memberCount}</td>
                      <td>{fmtDate(item.createdAt)}</td>
                      <td><span className={`badge ${statusBadge(item.status)} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{item.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown"><i className="fa fa-ellipsis-v"></i></a>
                        <ul className="dropdown-menu">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); openEditModal(item); }}><i data-feather="edit" className="info-img"></i>Edit</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(item.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>Delete</a></li>
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h4 className="modal-title">{editingId ? 'Edit Department' : 'Add Department'}</h4><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <div className="mb-3"><label className="form-label">Department Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="mb-3"><label className="form-label">HOD</label>
                  <select className="form-select" value={form.hodId || ''} onChange={e => setForm({ ...form, hodId: e.target.value ? parseInt(e.target.value) : undefined })}>
                    <option value="">Select HOD</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}{emp.lastName ? ` ${emp.lastName}` : ''}</option>)}
                  </select>
                </div>
                <div className="mb-3"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="mb-3 d-flex align-items-center"><label className="form-label me-3 mb-0">Status</label><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleSave}>{editingId ? 'Save Changes' : 'Submit'}</button></div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-5">
              <div className="modal-body text-center p-0">
                <div className="mb-3"><i className="ti ti-trash-x fs-36 text-danger"></i></div>
                <h4>Delete Department</h4><p className="text-muted">Are you sure you want to delete this department?</p>
                <div className="d-flex justify-content-center gap-2"><button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button><button className="btn btn-danger" onClick={confirmDelete}>Delete</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DepartmentList;

