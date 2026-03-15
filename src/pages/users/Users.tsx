import React, { useState, useEffect, useCallback } from 'react';
import { userService, UserDto, CreateUserPayload, UpdateUserPayload } from '../../services/userService';
import { useTranslation } from 'react-i18next';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

const ROLES = ['Admin', 'Manager', 'Salesman', 'Supervisor', 'Store Keeper', 'Delivery Biker', 'Maintenance', 'Quality Analyst', 'Accountant', 'Purchase', 'User'];

const Users: React.FC = () => {
  const { t } = useTranslation();
  // ── Data state ──
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Search & filter ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  // ── Add modal ──
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<CreateUserPayload>({ fullName: '', email: '', phone: '', password: '', role: 'User', isActive: true });
  const [addConfirmPw, setAddConfirmPw] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // ── Edit modal ──
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({ fullName: '', email: '', phone: '', password: '', role: 'User', isActive: true });
  const [editConfirmPw, setEditConfirmPw] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete modal ──
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAll();
      setUsers(data);
      setError('');
    } catch {
      setError(t('users.failed_load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Filtered users ──
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone || '').includes(q) || u.role.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? u.isActive : !u.isActive);
    return matchesSearch && matchesStatus;
  });

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  // ── Add user ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.fullName || !addForm.email || !addForm.password) {
      setAddError(t('users.name_email_required'));
      return;
    }
    if (addForm.password.length < 6) {
      setAddError(t('users.password_min'));
      return;
    }
    if (addForm.password !== addConfirmPw) {
      setAddError(t('users.passwords_no_match'));
      return;
    }
    setAddLoading(true);
    try {
      await userService.create(addForm);
      setShowAdd(false);
      resetAddForm();
      fetchUsers();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to add user.');
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddForm = () => {
    setAddForm({ fullName: '', email: '', phone: '', password: '', role: 'User', isActive: true });
    setAddConfirmPw('');
    setAddError('');
  };

  // ── Edit user ──
  const openEdit = (user: UserDto) => {
    setEditId(user.id);
    setEditForm({ fullName: user.fullName, email: user.email, phone: user.phone || '', password: '', role: user.role, isActive: user.isActive });
    setEditConfirmPw('');
    setEditError('');
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setEditError('');
    if (!editForm.fullName || !editForm.email) {
      setEditError(t('users.name_email_required'));
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      setEditError(t('users.password_min'));
      return;
    }
    if (editForm.password && editForm.password !== editConfirmPw) {
      setEditError(t('users.passwords_no_match'));
      return;
    }
    setEditLoading(true);
    try {
      const payload: UpdateUserPayload = { ...editForm };
      if (!payload.password) delete payload.password;
      await userService.update(editId, payload);
      setShowEdit(false);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete user ──
  const openDelete = (user: UserDto) => {
    setDeleteId(user.id);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await userService.delete(deleteId);
    setShowDelete(false);
    fetchUsers();
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">{t('users.title')}</h4>
            <h6>{t('users.subtitle')}</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title={t('common.refresh')} onClick={(e) => { e.preventDefault(); fetchUsers(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
        </ul>
        <div className="page-btn">
          <button className="btn btn-primary" onClick={() => { resetAddForm(); setShowAdd(true); }}>
            <i className="ti ti-circle-plus me-1"></i>{t('users.add_user')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder={t('users.search_users')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown">
              <a
                href="#"
                className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                data-bs-toggle="dropdown"
                onClick={(e) => e.preventDefault()}
              >
                {statusFilter ? (statusFilter === 'active' ? t('common.active') : t('common.inactive')) : t('common.status')}
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
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead className="thead-light">
                  <tr>
                    <th style={{width: 40}}>#</th>
                    <th>{t('users.user_name')}</th>
                    <th>{t('users.phone')}</th>
                    <th>{t('users.email')}</th>
                    <th>{t('users.role')}</th>
                    <th>{t('users.status')}</th>
                    <th style={{width: 120}}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        {search || statusFilter ? t('users.no_users_match') : t('users.no_users')}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((user, idx) => (
                      <tr key={user.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-md me-2 bg-primary-transparent text-primary fw-bold rounded-circle d-flex align-items-center justify-content-center">
                              {user.fullName.charAt(0).toUpperCase()}
                            </span>
                            <span>{user.fullName}</span>
                          </div>
                        </td>
                        <td>{user.phone || '—'}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
                          {user.isActive ? (
                            <span className="d-inline-flex align-items-center p-1 pe-2 rounded-1 text-white bg-success fs-10">
                              <i className="ti ti-point-filled me-1 fs-11"></i>{t('common.active')}
                            </span>
                          ) : (
                            <span className="d-inline-flex align-items-center p-1 pe-2 rounded-1 text-white bg-danger fs-10">
                              <i className="ti ti-point-filled me-1 fs-11"></i>{t('common.inactive')}
                            </span>
                          )}
                        </td>
                        <td className="action-table-data">
                          <div className="edit-delete-action">
                            <a
                              className="me-2 p-2 mb-0"
                              href="#"
                              onClick={(e) => { e.preventDefault(); openEdit(user); }}
                            >
                              <i data-feather="edit" className="feather-edit"></i>
                            </a>
                            <a
                              className="p-2 mb-0"
                              href="#"
                              onClick={(e) => { e.preventDefault(); openDelete(user); }}
                            >
                              <i data-feather="trash-2" className="feather-trash-2"></i>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════ Add User Modal ══════ */}
      {showAdd && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAdd(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content">
                  <div className="modal-header">
                    <div className="page-title">
                      <h4>{t('users.add_user')}</h4>
                    </div>
                    <button type="button" className="close" onClick={() => setShowAdd(false)}>
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <form onSubmit={handleAdd}>
                    <div className="modal-body">
                      {addError && <div className="alert alert-danger py-2">{addError}</div>}
                      <div className="row">
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('common.name')}<span className="text-danger ms-1">*</span></label>
                            <input type="text" className="form-control" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('users.role')}<span className="text-danger ms-1">*</span></label>
                            <select className="form-select" value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('users.email')}<span className="text-danger ms-1">*</span></label>
                            <input type="email" className="form-control" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('users.phone')}</label>
                            <input type="tel" className="form-control" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">{t('users.password')}<span className="text-danger ms-1">*</span></label>
                            <input type="password" className="form-control" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">{t('users.confirm_password')}<span className="text-danger ms-1">*</span></label>
                            <input type="password" className="form-control" value={addConfirmPw} onChange={(e) => setAddConfirmPw(e.target.value)} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                            <span className="status-label">{t('users.status')}</span>
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" checked={addForm.isActive} onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
                      <button type="submit" className="btn btn-primary" disabled={addLoading}>
                        {addLoading ? t('common.saving') : t('users.add_user')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Edit User Modal ══════ */}
      {showEdit && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowEdit(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content">
                  <div className="modal-header">
                    <div className="page-title">
                      <h4>{t('users.edit_user')}</h4>
                    </div>
                    <button type="button" className="close" onClick={() => setShowEdit(false)}>
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <form onSubmit={handleEdit}>
                    <div className="modal-body">
                      {editError && <div className="alert alert-danger py-2">{editError}</div>}
                      <div className="row">
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('common.name')}<span className="text-danger ms-1">*</span></label>
                            <input type="text" className="form-control" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('users.role')}<span className="text-danger ms-1">*</span></label>
                            <select className="form-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('users.email')}<span className="text-danger ms-1">*</span></label>
                            <input type="email" className="form-control" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">{t('users.phone')}</label>
                            <input type="tel" className="form-control" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">{t('users.password')} <small className="text-muted">{t('users.password_hint')}</small></label>
                            <input type="password" className="form-control" value={editForm.password || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">{t('users.confirm_password')}</label>
                            <input type="password" className="form-control" value={editConfirmPw} onChange={(e) => setEditConfirmPw(e.target.value)} />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                            <span className="status-label">{t('users.status')}</span>
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEdit(false)}>{t('common.cancel')}</button>
                      <button type="submit" className="btn btn-primary" disabled={editLoading}>
                        {editLoading ? t('common.saving') : t('common.save_changes')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Delete Confirmation Modal ══════ */}
      <AdminDeleteModal show={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} />
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default Users;

