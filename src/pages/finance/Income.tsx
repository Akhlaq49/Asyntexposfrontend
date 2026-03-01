import React, { useState, useEffect, useCallback } from 'react';
import { getFinanceIncomes, createFinanceIncome, updateFinanceIncome, deleteFinanceIncome, getIncomeCategories, getBankAccounts, FinanceIncome, IncomeCategory, BankAccount } from '../../services/financeService';
import { getStores, DropdownOption } from '../../services/productService';

const Income: React.FC = () => {
  const [incomes, setIncomes] = useState<FinanceIncome[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [stores, setStores] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ date: '', incomeCategoryId: 0, store: '', amount: 0, account: '', notes: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, date: '', incomeCategoryId: 0, store: '', amount: 0, account: '', notes: '' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try {
      const [incRes, catRes, accRes, storeRes] = await Promise.all([getFinanceIncomes(), getIncomeCategories(), getBankAccounts(), getStores()]);
      setIncomes(incRes.data); setCategories(catRes.data); setAccounts(accRes.data); setStores(storeRes);
    } catch { setIncomes([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked); setSelectedIds(checked ? new Set(incomes.map(i => i.id)) : new Set());
  }, [incomes]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }, []);

  const handleAdd = async () => {
    try { const res = await createFinanceIncome(addForm); setIncomes(prev => [res.data, ...prev]); } catch {}
    setAddForm({ date: '', incomeCategoryId: 0, store: '', amount: 0, account: '', notes: '' }); setShowAddModal(false);
  };

  const openEditModal = (i: FinanceIncome) => {
    setEditForm({ id: i.id, date: i.date, incomeCategoryId: i.incomeCategoryId, store: i.store, amount: i.amount, account: i.account, notes: i.notes }); setShowEditModal(true);
  };

  const handleEditSave = async () => {
    const { id, ...data } = editForm;
    try { await updateFinanceIncome(id, data); } catch {}
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...data, categoryName: categories.find(c => c.id === data.incomeCategoryId)?.name || '' } : i));
    setShowEditModal(false);
  };

  const openDeleteModal = (id: number) => { setDeleteId(id); setDeleteError(''); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteFinanceIncome(deleteId); setIncomes(prev => prev.filter(i => i.id !== deleteId)); setShowDeleteModal(false); }
    catch (err: any) { setDeleteError(err.response?.data?.message || 'Failed to delete.'); }
  };

  const filtered = incomes.filter(i => !searchTerm || i.reference.toLowerCase().includes(searchTerm.toLowerCase()) || i.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) || i.store.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Income</h4><h6>Manage your income records</h6></div></div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" title="Pdf" onClick={e => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="pdf" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Excel" onClick={e => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="excel" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Refresh" onClick={e => { e.preventDefault(); window.location.reload(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); setShowAddModal(true); }}><i className="ti ti-circle-plus me-1"></i>Add Income</a></div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set"><div className="search-input"><span className="btn-searchset"><i className="ti ti-search fs-14"></i></span><input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
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
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Store</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th>Amount</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inc => (
                    <tr key={inc.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(inc.id)} onChange={e => handleSelectOne(inc.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{inc.date}</td>
                      <td>{inc.reference}</td>
                      <td>{inc.store}</td>
                      <td>{inc.categoryName}</td>
                      <td>{inc.notes}</td>
                      <td>${inc.amount.toFixed(2)}</td>
                      <td className="action-table-data"><div className="edit-delete-action">
                        <a className="me-2 p-2" href="#" onClick={e => { e.preventDefault(); openEditModal(inc); }}><i data-feather="edit" className="feather-edit"></i></a>
                        <a className="p-2" href="#" onClick={e => { e.preventDefault(); openDeleteModal(inc.id); }}><i data-feather="trash-2" className="feather-trash-2"></i></a>
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
            <div className="modal-header"><div className="page-title"><h4>Add Income</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Date<span className="text-danger ms-1">*</span></label><input type="date" className="form-control" value={addForm.date} onChange={e => setAddForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Category<span className="text-danger ms-1">*</span></label>
                <select className="form-select" value={addForm.incomeCategoryId} onChange={e => setAddForm(p => ({ ...p, incomeCategoryId: Number(e.target.value) }))}>
                  <option value={0}>Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Store</label>
                <select className="form-select" value={addForm.store} onChange={e => setAddForm(p => ({ ...p, store: e.target.value }))}>
                  <option value="">Select Store</option>
                  {stores.map(s => <option key={s.value} value={s.label}>{s.label}</option>)}
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Amount<span className="text-danger ms-1">*</span></label><input type="number" className="form-control" value={addForm.amount || ''} onChange={e => setAddForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
              <div className="mb-3"><label className="form-label">Account</label>
                <select className="form-select" value={addForm.account} onChange={e => setAddForm(p => ({ ...p, account: e.target.value }))}>
                  <option value="">Select Account</option>
                  {accounts.filter(a => a.status === 'active').map(a => <option key={a.id} value={a.bankName}>{a.bankName} - {a.holderName}</option>)}
                </select>
              </div>
              <div className="mb-0"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!addForm.date || !addForm.incomeCategoryId}>Add Income</button></div>
          </div></div>
        </div>
      )}

      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>Edit Income</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Date<span className="text-danger ms-1">*</span></label><input type="date" className="form-control" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Category<span className="text-danger ms-1">*</span></label>
                <select className="form-select" value={editForm.incomeCategoryId} onChange={e => setEditForm(p => ({ ...p, incomeCategoryId: Number(e.target.value) }))}>
                  <option value={0}>Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Store</label>
                <select className="form-select" value={editForm.store} onChange={e => setEditForm(p => ({ ...p, store: e.target.value }))}>
                  <option value="">Select Store</option>
                  {stores.map(s => <option key={s.value} value={s.label}>{s.label}</option>)}
                </select>
              </div>
              <div className="mb-3"><label className="form-label">Amount<span className="text-danger ms-1">*</span></label><input type="number" className="form-control" value={editForm.amount || ''} onChange={e => setEditForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
              <div className="mb-3"><label className="form-label">Account</label>
                <select className="form-select" value={editForm.account} onChange={e => setEditForm(p => ({ ...p, account: e.target.value }))}>
                  <option value="">Select Account</option>
                  {accounts.map(a => <option key={a.id} value={a.bankName}>{a.bankName} - {a.holderName}</option>)}
                </select>
              </div>
              <div className="mb-0"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleEditSave}>Save Changes</button></div>
          </div></div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="page-wrapper-new p-0"><div className="content p-5 px-3 text-center">
            <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2"><i className="ti ti-trash fs-24 text-danger"></i></span>
            <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Income</h4>
            <p className="fs-14 text-muted">Are you sure you want to delete this income record?</p>
            {deleteError && <div className="alert alert-danger py-2 px-3 text-start">{deleteError}</div>}
            <div className="d-flex justify-content-center gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button><button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
          </div></div></div></div>
        </div>
      )}
    </>
  );
};

export default Income;

