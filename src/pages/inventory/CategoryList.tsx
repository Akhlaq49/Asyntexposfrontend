import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';

interface Category {
  id: string;
  name: string;
  slug: string;
  createdOn: string;
  status: 'active' | 'inactive';
}

const CategoryList: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', slug: '', status: true });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', slug: '', status: true });

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get<Category[]>('/categories');
        setCategories(response.data);
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  // Auto-generate slug
  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(categories.map((c) => c.id)) : new Set());
  }, [categories]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  // Add
  const handleAdd = async () => {
    const newCat: Category = {
      id: Date.now().toString(),
      name: addForm.name,
      slug: addForm.slug || autoSlug(addForm.name),
      createdOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: addForm.status ? 'active' : 'inactive',
    };
    try {
      const response = await api.post<Category>('/categories', newCat);
      setCategories((prev) => [response.data, ...prev]);
    } catch {
      setCategories((prev) => [newCat, ...prev]);
    }
    setAddForm({ name: '', slug: '', status: true });
    setShowAddModal(false);
  };

  // Edit
  const openEditModal = (cat: Category) => {
    setEditForm({ id: cat.id, name: cat.name, slug: cat.slug, status: cat.status === 'active' });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    const updated = { name: editForm.name, slug: editForm.slug, status: editForm.status ? 'active' as const : 'inactive' as const };
    try {
      await api.put(`/categories/${editForm.id}`, updated);
    } catch { /* update locally */ }
    setCategories((prev) => prev.map((c) => c.id === editForm.id ? { ...c, ...updated } : c));
    setShowEditModal(false);
  };

  // Delete
  const openDeleteModal = (id: string) => { setDeleteId(id); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.delete(`/categories/${deleteId}`);
    setCategories((prev) => prev.filter((c) => c.id !== deleteId));
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const filtered = categories.filter((c) => {
    const matchSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">{t('categories.title')}</h4>
            <h6>{t('categories.subtitle')}</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.pdf')} onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/pdf.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.excel')} onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/excel.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.refresh')} onClick={(e) => { e.preventDefault(); window.location.reload(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.collapse')} onClick={(e) => e.preventDefault()}>
              <i className="ti ti-chevron-up"></i>
            </a>
          </li>
        </ul>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); setShowAddModal(true); }}>
            <i className="ti ti-circle-plus me-1"></i>{t('categories.add_category')}
          </a>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
              <input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : t('common.status')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter(''); }}>{t('common.all')}</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('active'); }}>{t('common.active')}</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('inactive'); }}>{t('common.inactive')}</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">{t('common.loading')}</span></div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th className="no-sort">
                      <label className="checkboxs">
                        <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} />
                        <span className="checkmarks"></span>
                      </label>
                    </th>
                    <th>{t('categories.category_name')}</th>
                    <th>{t('categories.category_slug')}</th>
                    <th>{t('categories.created_on')}</th>
                    <th>{t('common.status')}</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" checked={selectedIds.has(cat.id)} onChange={(e) => handleSelectOne(cat.id, e.target.checked)} />
                          <span className="checkmarks"></span>
                        </label>
                      </td>
                      <td><span className="text-gray-9">{cat.name}</span></td>
                      <td>{cat.slug}</td>
                      <td>{cat.createdOn}</td>
                      <td>
                        <span className={`badge fw-medium fs-10 ${cat.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                          {cat.status === 'active' ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <a className="me-2 p-2" href="#" onClick={(e) => { e.preventDefault(); openEditModal(cat); }}>
                            <i data-feather="edit" className="feather-edit"></i>
                          </a>
                          <a className="p-2" href="#" onClick={(e) => { e.preventDefault(); openDeleteModal(cat.id); }}>
                            <i data-feather="trash-2" className="feather-trash-2"></i>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>{t('categories.add_category')}</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">{t('categories.category_name')}<span className="text-danger ms-1">*</span></label>
                  <input
                    type="text" className="form-control" value={addForm.name}
                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value, slug: autoSlug(e.target.value) }))}
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('categories.category_slug')}<span className="text-danger ms-1">*</span></label>
                  <input type="text" className="form-control" value={addForm.slug} onChange={(e) => setAddForm((p) => ({ ...p, slug: e.target.value }))} />
                </div>
                <div className="mb-0">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">{t('common.status')}<span className="text-danger ms-1">*</span></span>
                    <input type="checkbox" id="add-status" className="check" checked={addForm.status} onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.checked }))} />
                    <label htmlFor="add-status" className="checktoggle"></label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!addForm.name.trim()}>{t('categories.add_category')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>{t('categories.edit_category')}</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">{t('categories.category_name')}<span className="text-danger ms-1">*</span></label>
                  <input type="text" className="form-control" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('categories.category_slug')}<span className="text-danger ms-1">*</span></label>
                  <input type="text" className="form-control" value={editForm.slug} onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))} />
                </div>
                <div className="mb-0">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">{t('common.status')}<span className="text-danger ms-1">*</span></span>
                    <input type="checkbox" id="edit-status" className="check" checked={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.checked }))} />
                    <label htmlFor="edit-status" className="checktoggle"></label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={handleEditSave}>{t('common.save_changes')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={handleDelete} />
    </>
  );
};

export default CategoryList;
