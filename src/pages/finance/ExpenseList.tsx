import React, { useState, useEffect, useCallback } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseCategories, Expense, ExpenseCategory } from '../../services/financeService';

const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ expenseName: '', expenseCategoryId: 0, description: '', date: '', amount: 0, status: 'active' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, expenseName: '', expenseCategoryId: 0, description: '', date: '', amount: 0, status: 'active' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([getExpenses(), getExpenseCategories()]);
      setExpenses(expRes.data);
      setCategories(catRes.data);
    } catch { setExpenses([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(expenses.map(e => e.id)) : new Set());
  }, [expenses]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }, []);

  const handleAdd = async () => {
    try { const res = await createExpense(addForm); setExpenses(prev => [res.data, ...prev]); } catch {}
    setAddForm({ expenseName: '', expenseCategoryId: 0, description: '', date: '', amount: 0, status: 'active' });
    setShowAddModal(false);
  };

  const openEditModal = (e: Expense) => {
    setEditForm({ id: e.id, expenseName: e.expenseName, expenseCategoryId: e.expenseCategoryId, description: e.description, date: e.date, amount: e.amount, status: e.status });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    const { id, ...data } = editForm;
    try { await updateExpense(id, data); } catch {}
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data, categoryName: categories.find(c => c.id === data.expenseCategoryId)?.name || '' } : e));
    setShowEditModal(false);
  };

  const openDeleteModal = (id: number) => { setDeleteId(id); setDeleteError(''); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteExpense(deleteId); setExpenses(prev => prev.filter(e => e.id !== deleteId)); setShowDeleteModal(false); }
    catch (err: any) { setDeleteError(err.response?.data?.message || 'Failed to delete.'); }
  };

  const filtered = expenses.filter(e => {
    const matchSearch = !searchTerm || e.expenseName.toLowerCase().includes(searchTerm.toLowerCase()) || e.reference.toLowerCase().includes(searchTerm.toLowerCase()) || e.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Expense List</h4><h6>Manage your expenses</h6></div></div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" title="Pdf" onClick={e => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="pdf" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Excel" onClick={e => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="excel" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Refresh" onClick={e => { e.preventDefault(); window.location.reload(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); setShowAddModal(true); }}><i className="ti ti-circle-plus me-1"></i>Add Expense</a></div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set"><div className="search-input"><span className="btn-searchset"><i className="ti ti-search fs-14"></i></span><input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={e => e.preventDefault()}>{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Status'}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter(''); }}>All</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('active'); }}>Active</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('inactive'); }}>Inactive</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th className="no-sort"><label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label></th>
                    <th>Reference</th>
                    <th>Expense Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(exp => (
                    <tr key={exp.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(exp.id)} onChange={e => handleSelectOne(exp.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{exp.reference}</td>
                      <td>{exp.expenseName}</td>
                      <td>{exp.categoryName}</td>
                      <td>{exp.description}</td>
                      <td>{exp.date}</td>
                      <td>${exp.amount.toFixed(2)}</td>
                      <td><span className={`badge fw-medium fs-10 ${exp.status === 'active' ? 'bg-success' : 'bg-danger'}`}>{exp.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                      <td className="action-table-data"><div className="edit-delete-action">
                        <a className="me-2 p-2" href="#" onClick={e => { e.preventDefault(); openEditModal(exp); }}><i data-feather="edit" className="feather-edit"></i></a>
                        <a className="p-2" href="#" onClick={e => { e.preventDefault(); openDeleteModal(exp.id); }}><i data-feather="trash-2" className="feather-trash-2"></i></a>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>Add Expense</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Expense Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addForm.expenseName} onChange={e => setAddForm(p => ({ ...p, expenseName: e.target.value }))} autoFocus /></div>
              <div className="mb-3"><label className="form-label">Category<span className="text-danger ms-1">*</span></label>
                <select className="form-select" value={addForm.expenseCategoryId} onChange={e => setAddForm(p => ({ ...p, expenseCategoryId: Number(e.target.value) }))}>
                  <option value={0}>Select Category</option>
                  {categories.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Date<span className="text-danger ms-1">*</span></label><input type="date" className="form-control" value={addForm.date} onChange={e => setAddForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Amount<span className="text-danger ms-1">*</span></label><input type="number" className="form-control" value={addForm.amount || ''} onChange={e => setAddForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
              <div className="mb-0"><label className="form-label">Status</label>
                <select className="form-select" value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!addForm.expenseName.trim() || !addForm.expenseCategoryId || !addForm.date}>Add Expense</button></div>
          </div></div>
        </div>
      )}

      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>Edit Expense</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Expense Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editForm.expenseName} onChange={e => setEditForm(p => ({ ...p, expenseName: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Category<span className="text-danger ms-1">*</span></label>
                <select className="form-select" value={editForm.expenseCategoryId} onChange={e => setEditForm(p => ({ ...p, expenseCategoryId: Number(e.target.value) }))}>
                  <option value={0}>Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Date<span className="text-danger ms-1">*</span></label><input type="date" className="form-control" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Amount<span className="text-danger ms-1">*</span></label><input type="number" className="form-control" value={editForm.amount || ''} onChange={e => setEditForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
              <div className="mb-0"><label className="form-label">Status</label>
                <select className="form-select" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleEditSave}>Save Changes</button></div>
          </div></div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="page-wrapper-new p-0"><div className="content p-5 px-3 text-center">
            <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2"><i className="ti ti-trash fs-24 text-danger"></i></span>
            <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Expense</h4>
            <p className="fs-14 text-muted">Are you sure you want to delete this expense?</p>
            {deleteError && <div className="alert alert-danger py-2 px-3 text-start">{deleteError}</div>}
            <div className="d-flex justify-content-center gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button><button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
          </div></div></div></div>
        </div>
      )}
    </>
  );
};

export default ExpenseList;

