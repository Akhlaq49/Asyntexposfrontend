import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getParties, createParty, updateParty, deleteParty, Party, CreatePartyPayload } from '../../services/partyService';
import { showSuccess, showError } from '../../utils/alertUtils';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';

const ROLE = 'Supplier';

const Suppliers: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Party[]>([]);
  const [filtered, setFiltered] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const emptyForm: CreatePartyPayload = { fullName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', code: '', role: ROLE, status: 'active', isActive: true };
  const [form, setForm] = useState<CreatePartyPayload>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterStatus, filterCountry, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try { setItems(await getParties(ROLE)); } catch { showError(t('suppliers.failed_load')); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.fullName.toLowerCase().includes(q) || (i.code || '').toLowerCase().includes(q) || (i.email || '').toLowerCase().includes(q)); }
    if (filterStatus) result = result.filter(i => i.status === filterStatus);
    if (filterCountry) result = result.filter(i => i.country === filterCountry);
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.fullName.localeCompare(b.fullName));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.fullName.localeCompare(a.fullName));
    setFiltered(result);
  };

  const countries = [...new Set(items.map(i => i.country).filter(Boolean))];
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEditModal = (p: Party) => {
    setEditingId(p.id);
    setForm({ fullName: p.fullName, lastName: p.lastName || '', email: p.email || '', phone: p.phone || '', address: p.address || '', city: p.city || '', state: p.state || '', country: p.country || '', postalCode: p.postalCode || '', code: p.code || '', role: ROLE, status: p.status, isActive: p.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName) { showError(t('suppliers.first_name_required')); return; }
    try { if (editingId) await updateParty(editingId, form); else await createParty(form); setShowModal(false); showSuccess(editingId ? t('suppliers.supplier_updated') : t('suppliers.supplier_created')); loadData(); }
    catch { showError(t('suppliers.failed_save')); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteParty(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess(t('suppliers.supplier_deleted')); loadData();
  };

  const statusBadge = (s: string) => s === 'active' ? 'badge-success' : 'badge-danger';

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title"><h4>{t('suppliers.title')}</h4><h6>{t('suppliers.subtitle')}</h6></div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>{t('suppliers.add_supplier')}</a>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">{filterCountry || t('common.country')}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCountry(''); }}>{t('common.all')}</a></li>
                {countries.map(c => <li key={c}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCountry(c!); }}>{c}</a></li>)}
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
                    <th>{t('suppliers.code')}</th><th>{t('suppliers.supplier_name')}</th><th>{t('suppliers.email')}</th><th>{t('suppliers.phone')}</th><th>{t('common.country')}</th><th>{t('suppliers.status')}</th><th className="text-center">{t('suppliers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={8} className="text-center py-4">{t('suppliers.no_suppliers')}</td></tr> : paginated.map(p => (
                    <tr key={p.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={e => handleSelectOne(p.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{p.code}</td>
                      <td><div className="d-flex align-items-center"><a href="#" className="avatar avatar-md me-2"><img src={p.picture || '/assets/img/users/user-01.jpg'} alt="" /></a><a href="#">{p.fullName}{p.lastName ? ` ${p.lastName}` : ''}</a></div></td>
                      <td>{p.email}</td><td>{p.phone}</td><td>{p.country}</td>
                      <td><span className={`badge ${statusBadge(p.status)} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{p.status === 'active' ? t('common.active') : t('common.inactive')}</span></td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown" aria-expanded="false"><i className="fa fa-ellipsis-v" aria-hidden="true"></i></a>
                        <ul className="dropdown-menu">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); openEditModal(p); }}><i data-feather="edit" className="info-img"></i>{t('common.edit')}</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(p.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>{t('common.delete')}</a></li>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingId ? t('suppliers.edit_supplier') : t('suppliers.add_supplier')}</h4>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('suppliers.first_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('suppliers.last_name')}</label><input type="text" className="form-control" value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">{t('suppliers.email')}<span className="text-danger ms-1">*</span></label><input type="email" className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">{t('suppliers.phone')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                  <div className="col-lg-12"><div className="mb-3"><label className="form-label">{t('suppliers.address')}</label><input type="text" className="form-control" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('suppliers.city')}</label><input type="text" className="form-control" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('suppliers.state')}</label><input type="text" className="form-control" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('suppliers.country')}</label><input type="text" className="form-control" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('suppliers.postal_code')}</label><input type="text" className="form-control" value={form.postalCode || ''} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></div></div>
                  <div className="col-md-12"><div className="mb-3 d-flex align-items-center"><label className="form-label me-3 mb-0">{t('suppliers.status')}</label><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div></div></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>{editingId ? t('common.save_changes') : t('common.submit')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />

      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={confirmDelete} />
    </>
  );
};

export default Suppliers;

