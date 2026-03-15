import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDesignations, createDesignation, updateDesignation, deleteDesignation, getDepartments, Designation as DesignationType, CreateDesignation, Department } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';

const Designation: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<DesignationType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filtered, setFiltered] = useState<DesignationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const emptyForm: CreateDesignation = { name: '', departmentId: undefined, description: '', status: 'active', isActive: true };
  const [form, setForm] = useState<CreateDesignation>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterDept, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [desigs, deps] = await Promise.all([getDesignations(), getDepartments()]);
      setItems(desigs);
      setDepartments(deps);
    } catch { showError(t('hrm.failed_load_designations')); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.name.toLowerCase().includes(q) || (i.departmentName || '').toLowerCase().includes(q)); }
    if (filterDept) result = result.filter(i => i.departmentName === filterDept);
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    setFiltered(result);
    setCurrentPage(1);
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEditModal = (item: DesignationType) => {
    setEditingId(item.id);
    setForm({ name: item.name, departmentId: item.departmentId || undefined, description: item.description || '', status: item.status, isActive: item.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { showError(t('hrm.designation_name_required')); return; }
    try {
      if (editingId) await updateDesignation(editingId, form);
      else await createDesignation(form);
      setShowModal(false); showSuccess(editingId ? t('hrm.designation_updated') : t('hrm.designation_created')); loadData();
    } catch { showError(t('hrm.failed_save')); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteDesignation(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess(t('hrm.designation_deleted')); loadData();
  };

  const statusBadge = (s: string) => s === 'active' ? 'badge-success' : 'badge-danger';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>{t('hrm.designation')}</h4><h6>{t('hrm.manage_designations')}</h6></div></div>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>{t('hrm.add_designation')}</a></div>
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
                    <th>{t('hrm.designation')}</th><th>{t('hrm.department')}</th><th>{t('hrm.members')}</th><th>{t('common.created_on')}</th><th>{t('common.status')}</th><th className="text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={7} className="text-center py-4">{t('hrm.no_designations_found')}</td></tr> : paginated.map(item => (
                    <tr key={item.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectOne(item.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{item.name}</td>
                      <td>{item.departmentName || '—'}</td>
                      <td>{item.memberCount}</td>
                      <td>{fmtDate(item.createdAt)}</td>
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h4 className="modal-title">{editingId ? t('hrm.edit_designation') : t('hrm.add_designation')}</h4><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <div className="mb-3"><label className="form-label">{t('hrm.designation')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="mb-3"><label className="form-label">{t('hrm.department')}</label>
                  <select className="form-select" value={form.departmentId || ''} onChange={e => setForm({ ...form, departmentId: e.target.value ? parseInt(e.target.value) : undefined })}>
                    <option value="">{t('hrm.select_department')}</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="mb-3 d-flex align-items-center"><label className="form-label me-3 mb-0">{t('common.status')}</label><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button><button type="button" className="btn btn-primary" onClick={handleSave}>{editingId ? t('common.save_changes') : t('common.submit')}</button></div>
            </div>
          </div>
        </div>
      )}

      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={confirmDelete} />
    </>
  );
};

export default Designation;

