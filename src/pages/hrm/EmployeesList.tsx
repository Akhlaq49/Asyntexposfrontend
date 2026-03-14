import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getDepartments, getDesignations, getShifts, Employee, CreateEmployee, Department, Designation as DesignationType, Shift } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';

const EmployeesList: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<DesignationType[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const emptyForm: CreateEmployee = { fullName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', departmentId: undefined, designationId: undefined, shiftId: undefined, dateOfJoining: '', basicSalary: undefined, password: '', status: 'active', isActive: true };
  const [form, setForm] = useState<CreateEmployee>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterDept, filterStatus, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, deps, desigs, shfs] = await Promise.all([getEmployees(), getDepartments(), getDesignations(), getShifts()]);
      setItems(emps); setDepartments(deps); setDesignations(desigs); setShifts(shfs);
    } catch { showError(t('hrm.failed_load_employees')); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.fullName.toLowerCase().includes(q) || (i.email || '').toLowerCase().includes(q) || (i.employeeId || '').toLowerCase().includes(q)); }
    if (filterDept) result = result.filter(i => i.departmentName === filterDept);
    if (filterStatus) result = result.filter(i => i.status === filterStatus);
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.fullName.localeCompare(b.fullName));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.fullName.localeCompare(a.fullName));
    setFiltered(result);
    setCurrentPage(1);
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

  const filteredDesignations = form.departmentId ? designations.filter(d => d.departmentId === form.departmentId) : designations;

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEditModal = (item: Employee) => {
    setEditingId(item.id);
    setForm({ fullName: item.fullName, lastName: item.lastName || '', email: item.email || '', phone: item.phone || '', address: item.address || '', city: item.city || '', state: item.state || '', country: item.country || '', postalCode: item.postalCode || '', departmentId: item.departmentId || undefined, designationId: item.designationId || undefined, shiftId: item.shiftId || undefined, dateOfJoining: item.dateOfJoining ? item.dateOfJoining.split('T')[0] : '', basicSalary: item.basicSalary || undefined, status: item.status, isActive: item.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName) { showError(t('hrm.first_name_required')); return; }
    try {
      if (editingId) await updateEmployee(editingId, form);
      else await createEmployee(form);
      setShowModal(false); showSuccess(editingId ? t('hrm.employee_updated') : t('hrm.employee_created')); loadData();
    } catch { showError(t('hrm.failed_save')); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteEmployee(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess(t('hrm.employee_deleted')); loadData();
  };

  const statusBadge = (s: string) => s === 'active' ? 'badge-success' : 'badge-danger';

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>{t('hrm.employees')}</h4><h6>{t('hrm.manage_employees')}</h6></div></div>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>{t('hrm.add_employee')}</a></div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set"><div className="search-input"><a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a><input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">{filterDept || t('hrm.department')}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterDept(''); }}>{t('common.all')}</a></li>
                {departments.map(d => <li key={d.id}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterDept(d.name); }}>{d.name}</a></li>)}
              </ul>
            </div>
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">{filterStatus ? (filterStatus === 'active' ? t('common.active') : t('common.inactive')) : t('common.status')}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>{t('common.all')}</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('active'); }}>{t('common.active')}</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('inactive'); }}>{t('common.inactive')}</a></li>
              </ul>
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">{t('common.sort_by')} {sortBy === 'asc' ? t('common.ascending') : sortBy === 'desc' ? t('common.descending') : t('common.recently_added')}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('recent'); }}>{t('common.recently_added')}</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('asc'); }}>{t('common.ascending')}</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('desc'); }}>{t('common.descending')}</a></li>
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
                    <th>{t('hrm.emp_id')}</th><th>{t('hrm.employee')}</th><th>{t('hrm.department')}</th><th>{t('hrm.designation')}</th><th>{t('common.email')}</th><th>{t('common.phone')}</th><th>{t('hrm.shift')}</th><th>{t('common.status')}</th><th className="text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={10} className="text-center py-4">{t('hrm.no_employees_found')}</td></tr> : paginated.map(item => (
                    <tr key={item.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectOne(item.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{item.employeeId}</td>
                      <td><div className="d-flex align-items-center"><a href="#" className="avatar avatar-md me-2"><img src={item.picture || '/assets/img/users/user-01.jpg'} alt="" /></a><a href="#">{item.fullName}{item.lastName ? ` ${item.lastName}` : ''}</a></div></td>
                      <td>{item.departmentName || '—'}</td>
                      <td>{item.designationName || '—'}</td>
                      <td>{item.email}</td>
                      <td>{item.phone}</td>
                      <td>{item.shiftName || '—'}</td>
                      <td><span className={`badge ${statusBadge(item.status)} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{item.status === 'active' ? t('common.active') : t('common.inactive')}</span></td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown"><i className="fa fa-ellipsis-v"></i></a>
                        <ul className="dropdown-menu">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); openEditModal(item); }}><i data-feather="edit" className="info-img"></i>{t('common.edit')}</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(item.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>{t('common.delete')}</a></li>
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
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header"><h4 className="modal-title">{editingId ? t('hrm.edit_employee') : t('hrm.add_employee')}</h4><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('common.first_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('common.last_name')}</label><input type="text" className="form-control" value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('common.email')}</label><input type="email" className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('common.phone')}</label><input type="text" className="form-control" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('hrm.department')}</label>
                    <select className="form-select" value={form.departmentId || ''} onChange={e => setForm({ ...form, departmentId: e.target.value ? parseInt(e.target.value) : undefined, designationId: undefined })}>
                      <option value="">{t('hrm.select_department')}</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('hrm.designation')}</label>
                    <select className="form-select" value={form.designationId || ''} onChange={e => setForm({ ...form, designationId: e.target.value ? parseInt(e.target.value) : undefined })}>
                      <option value="">{t('hrm.select_designation')}</option>
                      {filteredDesignations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('hrm.shift')}</label>
                    <select className="form-select" value={form.shiftId || ''} onChange={e => setForm({ ...form, shiftId: e.target.value ? parseInt(e.target.value) : undefined })}>
                      <option value="">{t('hrm.select_shift')}</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('hrm.date_of_joining')}</label><input type="date" className="form-control" value={form.dateOfJoining || ''} onChange={e => setForm({ ...form, dateOfJoining: e.target.value })} /></div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">{t('common.address')}</label><input type="text" className="form-control" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">{t('common.city')}</label><input type="text" className="form-control" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">{t('common.state')}</label><input type="text" className="form-control" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">{t('common.country')}</label><input type="text" className="form-control" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('hrm.basic_salary')}</label><input type="number" className="form-control" value={form.basicSalary || ''} onChange={e => setForm({ ...form, basicSalary: parseFloat(e.target.value) || undefined })} /></div></div>
                  {!editingId && <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('auth.password')}</label><input type="password" className="form-control" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div></div>}
                  <div className="col-md-12"><div className="mb-3 d-flex align-items-center"><label className="form-label me-3 mb-0">{t('common.status')}</label><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div></div></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button><button type="button" className="btn btn-primary" onClick={handleSave}>{editingId ? t('common.save_changes') : t('common.submit')}</button></div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={confirmDelete} />
    </>
  );
};

export default EmployeesList;

