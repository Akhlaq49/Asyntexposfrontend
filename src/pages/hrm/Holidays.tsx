import React, { useState, useEffect } from 'react';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday, Holiday, CreateHoliday } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const Holidays: React.FC = () => {
  const [items, setItems] = useState<Holiday[]>([]);
  const [filtered, setFiltered] = useState<Holiday[]>([]);
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

  const today = new Date().toISOString().split('T')[0];
  const emptyForm: CreateHoliday = { title: '', fromDate: today, toDate: today, days: 1, description: '', status: 'active', isActive: true };
  const [form, setForm] = useState<CreateHoliday>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try { setItems(await getHolidays()); } catch { showError('Failed to load holidays'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.title.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)); }
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    setFiltered(result);
    setCurrentPage(1);
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEditModal = (item: Holiday) => {
    setEditingId(item.id);
    setForm({ title: item.title, fromDate: item.fromDate.split('T')[0], toDate: item.toDate.split('T')[0], days: item.days, description: item.description || '', status: item.status, isActive: item.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title) { showError('Holiday title is required'); return; }
    try {
      if (editingId) await updateHoliday(editingId, form);
      else await createHoliday(form);
      setShowModal(false); showSuccess(editingId ? 'Holiday updated' : 'Holiday created'); loadData();
    } catch { showError('Failed to save'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteHoliday(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess('Holiday deleted'); loadData(); }
    catch { showError('Failed to delete'); }
  };

  const statusBadge = (s: string) => s === 'active' ? 'badge-success' : 'badge-danger';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString();

  const calcDays = (from: string, to: string) => {
    if (!from || !to) return 1;
    const diff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Holidays</h4><h6>Manage holiday list</h6></div></div>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>Add Holiday</a></div>
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
                    <th>Holiday</th><th>From Date</th><th>To Date</th><th>Days</th><th>Description</th><th>Status</th><th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={8} className="text-center py-4">No holidays found</td></tr> : paginated.map(item => (
                    <tr key={item.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectOne(item.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{item.title}</td>
                      <td>{fmtDate(item.fromDate)}</td>
                      <td>{fmtDate(item.toDate)}</td>
                      <td>{item.days}</td>
                      <td>{item.description}</td>
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
              <div className="modal-header"><h4 className="modal-title">{editingId ? 'Edit Holiday' : 'Add Holiday'}</h4><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <div className="mb-3"><label className="form-label">Holiday Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="row">
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">From Date</label><input type="date" className="form-control" value={form.fromDate.split('T')[0]} onChange={e => { const f = e.target.value; setForm({ ...form, fromDate: f, days: calcDays(f, form.toDate) }); }} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">To Date</label><input type="date" className="form-control" value={form.toDate.split('T')[0]} onChange={e => { const t = e.target.value; setForm({ ...form, toDate: t, days: calcDays(form.fromDate, t) }); }} /></div></div>
                </div>
                <div className="mb-3"><label className="form-label">Days</label><input type="number" className="form-control" value={form.days} readOnly /></div>
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
                <h4>Delete Holiday</h4><p className="text-muted">Are you sure you want to delete this holiday?</p>
                <div className="d-flex justify-content-center gap-2"><button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button><button className="btn btn-danger" onClick={confirmDelete}>Delete</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Holidays;

