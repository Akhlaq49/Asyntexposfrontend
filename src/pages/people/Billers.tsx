import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getParties, createParty, updateParty, deleteParty, uploadPartyPicture, Party, CreatePartyPayload } from '../../services/partyService';
import { showSuccess, showError } from '../../utils/alertUtils';

const ROLE = 'Biller';

const Billers: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Party[]>([]);
  const [filtered, setFiltered] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage] = useState(1);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  const emptyForm: CreatePartyPayload = { fullName: '', lastName: '', companyName: '', email: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', role: ROLE, status: 'active', isActive: true };
  const [form, setForm] = useState<CreatePartyPayload>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterCountry, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try { setItems(await getParties(ROLE)); } catch { showError(t('billers.failed_load')); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.fullName.toLowerCase().includes(q) || (i.companyName || '').toLowerCase().includes(q) || (i.email || '').toLowerCase().includes(q) || (i.code || '').toLowerCase().includes(q)); }
    if (filterCountry) result = result.filter(i => i.country === filterCountry);
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.fullName.localeCompare(b.fullName));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.fullName.localeCompare(a.fullName));
    setFiltered(result);
  };

  const countries = [...new Set(items.map(i => i.country).filter(Boolean))] as string[];
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setPictureFile(null); setPicturePreview(null); setShowModal(true); };
  const openEditModal = (p: Party) => {
    setEditingId(p.id);
    setForm({ fullName: p.fullName, lastName: p.lastName || '', companyName: p.companyName || '', email: p.email || '', phone: p.phone || '', address: p.address || '', city: p.city || '', state: p.state || '', country: p.country || '', postalCode: p.postalCode || '', role: ROLE, status: p.status, isActive: p.isActive });
    setPictureFile(null);
    setPicturePreview(p.picture || null);
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPictureFile(file); setPicturePreview(URL.createObjectURL(file)); }
  };

  const handleSave = async () => {
    if (!form.fullName) { showError(t('billers.first_name_required')); return; }
    try {
      let result: Party | null;
      if (editingId) result = await updateParty(editingId, form); else result = await createParty(form);
      if (result && pictureFile) await uploadPartyPicture(result.id, pictureFile);
      setShowModal(false); showSuccess(editingId ? t('billers.biller_updated') : t('billers.biller_created')); loadData();
    } catch { showError(t('billers.failed_save')); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deleteParty(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess(t('billers.biller_deleted')); loadData(); }
    catch { showError(t('billers.failed_delete')); }
  };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title"><h4>{t('billers.title')}</h4><h6>{t('billers.subtitle')}</h6></div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>{t('billers.add_biller')}</a>
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
                {countries.map(c => <li key={c}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCountry(c); }}>{c}</a></li>)}
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
                    <th>{t('billers.code')}</th><th>{t('billers.biller_name')}</th><th>{t('billers.company_name')}</th><th>{t('billers.email')}</th><th>{t('billers.phone')}</th><th>{t('common.country')}</th><th className="text-center">{t('billers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={8} className="text-center py-4">{t('billers.no_billers')}</td></tr> : paginated.map(p => (
                    <tr key={p.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={e => handleSelectOne(p.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{p.code}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md">
                            <img src={p.picture || '/assets/img/profiles/avator1.jpg'} className="img-fluid rounded-circle" alt="" />
                          </a>
                          <span className="ms-2">{p.fullName} {p.lastName}</span>
                        </div>
                      </td>
                      <td>{p.companyName}</td>
                      <td>{p.email}</td>
                      <td>{p.phone}</td>
                      <td>{p.country}</td>
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

      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingId ? t('billers.edit_biller') : t('billers.add_biller')}</h4>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12 mb-3">
                    <div className="profile-pic-upload">
                      <div className="profile-pic d-inline-flex align-items-center">
                        {picturePreview && <img src={picturePreview} className="rounded-circle me-2" style={{ width: 50, height: 50, objectFit: 'cover' }} alt="" />}
                        <div className="ms-2">
                          <a href="#" className="btn btn-primary btn-sm" onClick={e => { e.preventDefault(); fileInputRef.current?.click(); }}>{t('billers.upload_image')}</a>
                          <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={handleFileChange} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.first_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.last_name')}</label><input type="text" className="form-control" value={form.lastName || ''} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.company_name')}</label><input type="text" className="form-control" value={form.companyName || ''} onChange={e => setForm({ ...form, companyName: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.email')}</label><input type="email" className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.phone')}</label><input type="text" className="form-control" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.address')}</label><input type="text" className="form-control" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.city')}</label><input type="text" className="form-control" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.state')}</label><input type="text" className="form-control" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.country')}</label><input type="text" className="form-control" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} /></div></div>
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">{t('billers.postal_code')}</label><input type="text" className="form-control" value={form.postalCode || ''} onChange={e => setForm({ ...form, postalCode: e.target.value })} /></div></div>
                  <div className="col-md-12"><div className="mb-3 d-flex align-items-center"><label className="form-label me-3 mb-0">{t('billers.status')}</label><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked, status: e.target.checked ? 'active' : 'inactive' })} /></div></div></div>
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

      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-5">
              <div className="modal-body text-center p-0">
                <div className="mb-3"><i className="ti ti-trash-x fs-36 text-danger"></i></div>
                <h4>{t('billers.delete_biller')}</h4>
                <p className="text-muted">{t('billers.delete_confirm')}</p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>{t('common.cancel')}</button>
                  <button className="btn btn-danger" onClick={confirmDelete}>{t('common.delete')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Billers;

