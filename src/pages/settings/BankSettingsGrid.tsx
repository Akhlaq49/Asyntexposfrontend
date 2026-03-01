import React, { useState, useEffect } from 'react';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount, getAccountTypes, BankAccount, AccountType } from '../../services/financeService';

const BankSettingsGrid: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ holderName: '', accountNumber: '', bankName: '', branch: '', ifsc: '', accountTypeId: 0, openingBalance: 0, notes: '', status: 'active', isDefault: false });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, holderName: '', accountNumber: '', bankName: '', branch: '', ifsc: '', accountTypeId: 0, openingBalance: 0, notes: '', status: 'active', isDefault: false });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(0);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try { const [aRes, tRes] = await Promise.all([getBankAccounts(), getAccountTypes()]); setAccounts(aRes.data); setAccountTypes(tRes.data); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  const handleAdd = async () => {
    try { const res = await createBankAccount(addForm); setAccounts(prev => [res.data, ...prev]); } catch {}
    setAddForm({ holderName: '', accountNumber: '', bankName: '', branch: '', ifsc: '', accountTypeId: 0, openingBalance: 0, notes: '', status: 'active', isDefault: false });
    setShowAddModal(false);
  };
  const openEdit = (a: BankAccount) => {
    setEditForm({ id: a.id, holderName: a.holderName, accountNumber: a.accountNumber, bankName: a.bankName, branch: a.branch, ifsc: a.ifsc, accountTypeId: a.accountTypeId, openingBalance: a.openingBalance, notes: a.notes, status: a.status, isDefault: a.isDefault });
    setShowEditModal(true);
  };
  const handleEditSave = async () => {
    const { id, ...data } = editForm;
    try { await updateBankAccount(id, data); } catch {}
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data, accountTypeName: accountTypes.find(t => t.id === data.accountTypeId)?.name || '' } : a));
    setShowEditModal(false);
  };
  const handleDelete = async () => {
    try { await deleteBankAccount(deleteId); setAccounts(prev => prev.filter(a => a.id !== deleteId)); setShowDeleteModal(false); }
    catch (err: any) { setDeleteError(err.response?.data?.message || 'Failed to delete.'); }
  };

  const maskAccountNumber = (num: string) => num.length > 4 ? '****' + num.slice(-4) : num;

  const filtered = accounts.filter(a => !searchTerm || a.holderName.toLowerCase().includes(searchTerm.toLowerCase()) || a.bankName.toLowerCase().includes(searchTerm.toLowerCase()) || a.accountNumber.includes(searchTerm));

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Bank Settings</h4><h6>Manage your bank accounts</h6></div></div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); setShowAddModal(true); }}><i className="ti ti-circle-plus me-1"></i>Add Bank Account</a>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="search-set"><div className="search-input"><span className="btn-searchset"><i className="ti ti-search fs-14"></i></span><input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-5"><p className="text-muted">No bank accounts found.</p></div>
      ) : (
        <div className="row">
          {filtered.map(acc => (
            <div key={acc.id} className="col-xl-4 col-lg-6 col-md-6 col-sm-12">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                      <span className="avatar avatar-lg bg-primary-transparent rounded-circle me-2"><i className="ti ti-building-bank fs-20 text-primary"></i></span>
                      <div><h6 className="fw-bold mb-0">{acc.bankName}</h6><small className="text-muted">{acc.accountTypeName}</small></div>
                    </div>
                    <div className="dropdown">
                      <a href="#" className="btn btn-icon btn-sm" data-bs-toggle="dropdown" onClick={e => e.preventDefault()}>
                        <i className="ti ti-dots-vertical"></i>
                      </a>
                      <ul className="dropdown-menu dropdown-menu-end p-2">
                        <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); openEdit(acc); }}><i className="ti ti-edit me-2"></i>Edit</a></li>
                        <li><a className="dropdown-item rounded-1 text-danger" href="#" onClick={e => { e.preventDefault(); setDeleteId(acc.id); setDeleteError(''); setShowDeleteModal(true); }}><i className="ti ti-trash me-2"></i>Delete</a></li>
                      </ul>
                    </div>
                  </div>
                  <div className="mb-2"><small className="text-muted d-block">Account Holder</small><span className="fw-medium">{acc.holderName}</span></div>
                  <div className="mb-2"><small className="text-muted d-block">Account Number</small><span className="fw-medium">{maskAccountNumber(acc.accountNumber)}</span></div>
                  <div className="row mb-2">
                    <div className="col-6"><small className="text-muted d-block">Branch</small><span className="fw-medium">{acc.branch || '-'}</span></div>
                    <div className="col-6"><small className="text-muted d-block">IFSC</small><span className="fw-medium">{acc.ifsc || '-'}</span></div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3 pt-2 border-top">
                    <div><small className="text-muted">Opening Balance</small><h6 className="fw-bold mb-0 text-success">${acc.openingBalance.toFixed(2)}</h6></div>
                    <div className="d-flex gap-1">
                      <span className={`badge fs-10 ${acc.status === 'active' ? 'bg-success' : 'bg-danger'}`}>{acc.status === 'active' ? 'Active' : 'Inactive'}</span>
                      {acc.isDefault && <span className="badge bg-info fs-10">Default</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content">
          <div className="modal-header"><div className="page-title"><h4>Add Bank Account</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddModal(false)}><span>&times;</span></button></div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Bank Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addForm.bankName} onChange={e => setAddForm(p => ({ ...p, bankName: e.target.value }))} autoFocus /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Account Number<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addForm.accountNumber} onChange={e => setAddForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Account Holder<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addForm.holderName} onChange={e => setAddForm(p => ({ ...p, holderName: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Branch</label><input type="text" className="form-control" value={addForm.branch} onChange={e => setAddForm(p => ({ ...p, branch: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">IFSC</label><input type="text" className="form-control" value={addForm.ifsc} onChange={e => setAddForm(p => ({ ...p, ifsc: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Account Type<span className="text-danger ms-1">*</span></label>
                <select className="form-select" value={addForm.accountTypeId} onChange={e => setAddForm(p => ({ ...p, accountTypeId: Number(e.target.value) }))}>
                  <option value={0}>Select Type</option>
                  {accountTypes.filter(t => t.status === 'active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-md-6 mb-3"><label className="form-label">Opening Balance</label><input type="number" className="form-control" value={addForm.openingBalance || ''} onChange={e => setAddForm(p => ({ ...p, openingBalance: Number(e.target.value) }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Notes</label><input type="text" className="form-control" value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="d-flex gap-4">
              <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">Status</span><input type="checkbox" id="bsg-add-status" className="check" checked={addForm.status === 'active'} onChange={e => setAddForm(p => ({ ...p, status: e.target.checked ? 'active' : 'inactive' }))} /><label htmlFor="bsg-add-status" className="checktoggle"></label></div>
              <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">Make as Default</span><input type="checkbox" id="bsg-add-default" className="check" checked={addForm.isDefault} onChange={e => setAddForm(p => ({ ...p, isDefault: e.target.checked }))} /><label htmlFor="bsg-add-default" className="checktoggle"></label></div>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!addForm.holderName.trim() || !addForm.accountNumber.trim() || !addForm.bankName.trim() || !addForm.accountTypeId}>Save</button></div>
        </div></div></div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}><div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content">
          <div className="modal-header"><div className="page-title"><h4>Edit Bank Account</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)}><span>&times;</span></button></div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6 mb-3"><label className="form-label">Bank Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editForm.bankName} onChange={e => setEditForm(p => ({ ...p, bankName: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Account Number<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editForm.accountNumber} onChange={e => setEditForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Account Holder<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editForm.holderName} onChange={e => setEditForm(p => ({ ...p, holderName: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Branch</label><input type="text" className="form-control" value={editForm.branch} onChange={e => setEditForm(p => ({ ...p, branch: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">IFSC</label><input type="text" className="form-control" value={editForm.ifsc} onChange={e => setEditForm(p => ({ ...p, ifsc: e.target.value }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Account Type<span className="text-danger ms-1">*</span></label>
                <select className="form-select" value={editForm.accountTypeId} onChange={e => setEditForm(p => ({ ...p, accountTypeId: Number(e.target.value) }))}>
                  <option value={0}>Select Type</option>
                  {accountTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-md-6 mb-3"><label className="form-label">Opening Balance</label><input type="number" className="form-control" value={editForm.openingBalance || ''} onChange={e => setEditForm(p => ({ ...p, openingBalance: Number(e.target.value) }))} /></div>
              <div className="col-md-6 mb-3"><label className="form-label">Notes</label><input type="text" className="form-control" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="d-flex gap-4">
              <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">Status</span><input type="checkbox" id="bsg-edit-status" className="check" checked={editForm.status === 'active'} onChange={e => setEditForm(p => ({ ...p, status: e.target.checked ? 'active' : 'inactive' }))} /><label htmlFor="bsg-edit-status" className="checktoggle"></label></div>
              <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">Make as Default</span><input type="checkbox" id="bsg-edit-default" className="check" checked={editForm.isDefault} onChange={e => setEditForm(p => ({ ...p, isDefault: e.target.checked }))} /><label htmlFor="bsg-edit-default" className="checktoggle"></label></div>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleEditSave}>Save Changes</button></div>
        </div></div></div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="page-wrapper-new p-0"><div className="content p-5 px-3 text-center">
          <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2"><i className="ti ti-trash fs-24 text-danger"></i></span>
          <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Bank Account</h4>
          <p className="fs-14 text-muted">Are you sure you want to delete this bank account?</p>
          {deleteError && <div className="alert alert-danger py-2 px-3 text-start">{deleteError}</div>}
          <div className="d-flex justify-content-center gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button><button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
        </div></div></div></div></div>
      )}
    </>
  );
};

export default BankSettingsGrid;

