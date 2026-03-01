import React, { useState, useEffect } from 'react';
import { getParties, createParty, updateParty, deleteParty, Party, CreatePartyPayload } from '../../services/partyService';
import { showSuccess, showError } from '../../utils/alertUtils';

const ROLE = 'Store';

const StoreList: React.FC = () => {
  const [items, setItems] = useState<Party[]>([]);
  const [filtered, setFiltered] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage] = useState(1);
  const itemsPerPage = 10;

  const emptyForm: CreatePartyPayload = { fullName: '', userName: '', password: '', email: '', phone: '', role: ROLE, status: 'active', isActive: true };
  const [form, setForm] = useState<CreatePartyPayload>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterStatus, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try { setItems(await getParties(ROLE)); } catch { showError('Failed to load stores'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.fullName.toLowerCase().includes(q) || (i.userName || '').toLowerCase().includes(q) || (i.email || '').toLowerCase().includes(q)); }
    if (filterStatus) result = result.filter(i => i.status === filterStatus);
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.fullName.localeCompare(b.fullName));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.fullName.localeCompare(a.fullName));
    setFiltered(result);
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEditModal = (p: Party) => {
    setEditingId(p.id);
    setForm({ fullName: p.fullName, userName: p.userName || '', email: p.email || '', phone: p.phone || '', role: ROLE, status: p.status, isActive: p.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName) { showError('Store Name is required'); return; }
    try { if (editingId) await updateParty(editingId, form); else await createParty(form); setShowModal(false); showSuccess(editingId ? 'Store updated' : 'Store created'); loadData(); }
    catch { showError('Failed to save store'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteParty(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess('Store deleted'); loadData(); }
    catch { showError('Failed to delete'); }
  };

  const statusBadge = (s: string) => s === 'active' ? 'badge-success' : 'badge-danger';

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title"><h4>Stores</h4><h6>Manage your Store</h6></div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>Add Store</a>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">{filterStatus ? (filterStatus === 'active' ? 'Active' : 'Inactive') : 'Status'}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>All</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('active'); }}>Active</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('inactive'); }}>Inactive</a></li>
              </ul>
            </div>
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
                    <th>Store</th><th>User Name</th><th>Email</th><th>Phone</th><th>Status</th><th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={7} className="text-center py-4">No stores found</td></tr> : paginated.map(p => (
                    <tr key={p.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={e => handleSelectOne(p.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td><span className="text-gray-9">{p.fullName}</span></td>
                      <td>{p.userName}</td>
                      <td>{p.email}</td>
                      <td>{p.phone}</td>
                      <td><span className={`badge ${statusBadge(p.status)} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{p.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown" aria-expanded="false"><i className="fa fa-ellipsis-v" aria-hidden="true"></i></a>
                        <ul className="dropdown-menu">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); openEditModal(p); }}><i data-feather="edit" className="info-img"></i>Edit</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(p.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>Delete</a></li>
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
              <div className="modal-header">
                <h4 className="modal-title">{editingId ? 'Edit Store' : 'Add Store'}</h4>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">Store Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">User Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.userName || ''} onChange={e => setForm({ ...form, userName: e.target.value })} /></div></div>
                  {!editingId && <div className="col-lg-12"><div className="mb-3"><label className="form-label">Password<span className="text-danger ms-1">*</span></label><input type="password" className="form-control" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div></div>}
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">Email<span className="text-danger ms-1">*</span></label><input type="email" className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">Phone</label><input type="text" className="form-control" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                  <div className="col-md-12"><div className="mb-3 d-flex align-items-center"><label className="form-label me-3 mb-0">Status</label><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div></div></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>{editingId ? 'Save Changes' : 'Submit'}</button>
              </div>
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
                <h4>Delete Store</h4>
                <p className="text-muted">Are you sure you want to delete this store?</p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StoreList;

