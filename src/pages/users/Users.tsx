import React, { useState, useEffect, useCallback } from 'react';
import { userService, UserDto, CreateUserPayload, UpdateUserPayload } from '../../services/userService';

const ROLES = ['Admin', 'Manager', 'Salesman', 'Supervisor', 'Store Keeper', 'Delivery Biker', 'Maintenance', 'Quality Analyst', 'Accountant', 'Purchase', 'User'];

const Users: React.FC = () => {
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
  const [deleteName, setDeleteName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch users ──
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAll();
      setUsers(data);
      setError('');
    } catch {
      setError('Failed to load users.');
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

  // ── Add user ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.fullName || !addForm.email || !addForm.password) {
      setAddError('Name, email and password are required.');
      return;
    }
    if (addForm.password.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }
    if (addForm.password !== addConfirmPw) {
      setAddError('Passwords do not match.');
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
      setEditError('Name and email are required.');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      setEditError('Password must be at least 6 characters.');
      return;
    }
    if (editForm.password && editForm.password !== editConfirmPw) {
      setEditError('Passwords do not match.');
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
    setDeleteName(user.fullName);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await userService.delete(deleteId);
      setShowDelete(false);
      fetchUsers();
    } catch {
      setError('Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Users</h4>
            <h6>Manage your users</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); fetchUsers(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
        </ul>
        <div className="page-btn">
          <button className="btn btn-primary" onClick={() => { resetAddForm(); setShowAdd(true); }}>
            <i className="ti ti-circle-plus me-1"></i>Add User
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
                placeholder="Search"
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
                {statusFilter ? (statusFilter === 'active' ? 'Active' : 'Inactive') : 'Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter(''); }}>All</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('active'); }}>Active</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('inactive'); }}>Inactive</a></li>
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
                    <th>User Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{width: 120}}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        {search || statusFilter ? 'No users match your filters.' : 'No users found.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user, idx) => (
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
                              <i className="ti ti-point-filled me-1 fs-11"></i>Active
                            </span>
                          ) : (
                            <span className="d-inline-flex align-items-center p-1 pe-2 rounded-1 text-white bg-danger fs-10">
                              <i className="ti ti-point-filled me-1 fs-11"></i>Inactive
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
                      <h4>Add User</h4>
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
                            <label className="form-label">Full Name<span className="text-danger ms-1">*</span></label>
                            <input type="text" className="form-control" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Role<span className="text-danger ms-1">*</span></label>
                            <select className="form-select" value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Email<span className="text-danger ms-1">*</span></label>
                            <input type="email" className="form-control" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Phone</label>
                            <input type="tel" className="form-control" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Password<span className="text-danger ms-1">*</span></label>
                            <input type="password" className="form-control" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Confirm Password<span className="text-danger ms-1">*</span></label>
                            <input type="password" className="form-control" value={addConfirmPw} onChange={(e) => setAddConfirmPw(e.target.value)} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                            <span className="status-label">Status</span>
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" checked={addForm.isActive} onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={addLoading}>
                        {addLoading ? 'Adding...' : 'Add User'}
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
                      <h4>Edit User</h4>
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
                            <label className="form-label">Full Name<span className="text-danger ms-1">*</span></label>
                            <input type="text" className="form-control" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Role<span className="text-danger ms-1">*</span></label>
                            <select className="form-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Email<span className="text-danger ms-1">*</span></label>
                            <input type="email" className="form-control" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="mb-3">
                            <label className="form-label">Phone</label>
                            <input type="tel" className="form-control" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Password <small className="text-muted">(leave blank to keep current)</small></label>
                            <input type="password" className="form-control" value={editForm.password || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Confirm Password</label>
                            <input type="password" className="form-control" value={editConfirmPw} onChange={(e) => setEditConfirmPw(e.target.value)} />
                          </div>
                        </div>
                        <div className="col-lg-12">
                          <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                            <span className="status-label">Status</span>
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={editLoading}>
                        {editLoading ? 'Saving...' : 'Save Changes'}
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
      {showDelete && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDelete(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger"></i>
                  </span>
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete User</h4>
                  <p className="mb-0 fs-16">Are you sure you want to delete <strong>{deleteName}</strong>?</p>
                  <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                    <button type="button" className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none" onClick={() => setShowDelete(false)}>Cancel</button>
                    <button
                      type="button"
                      className="btn btn-primary fs-13 fw-medium p-2 px-3"
                      disabled={deleteLoading}
                      onClick={handleDelete}
                    >
                      {deleteLoading ? 'Deleting...' : 'Yes Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;

