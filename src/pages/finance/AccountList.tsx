import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount, getAccountTypes, createAccountType, updateAccountType, deleteAccountType, BankAccount, AccountType } from '../../services/financeService';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';

const AccountList: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'accounts' | 'types'>('accounts');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Bank Account modals
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [addAccountForm, setAddAccountForm] = useState({ holderName: '', accountNumber: '', bankName: '', branch: '', ifsc: '', accountTypeId: 0, openingBalance: 0, notes: '', status: 'active', isDefault: false });
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editAccountForm, setEditAccountForm] = useState({ id: 0, holderName: '', accountNumber: '', bankName: '', branch: '', ifsc: '', accountTypeId: 0, openingBalance: 0, notes: '', status: 'active', isDefault: false });

  // Account Type modals
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [addTypeForm, setAddTypeForm] = useState({ name: '', status: true });
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [editTypeForm, setEditTypeForm] = useState({ id: 0, name: '', status: true });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: 'account' | 'type' } | null>(null);

  const fetchData = async () => {
    try {
      const [accRes, typeRes] = await Promise.all([getBankAccounts(), getAccountTypes()]);
      setBankAccounts(accRes.data); setAccountTypes(typeRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  const currentList = activeTab === 'accounts' ? bankAccounts : accountTypes;
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked); setSelectedIds(checked ? new Set(currentList.map((i: any) => i.id)) : new Set());
  }, [currentList]);
  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }, []);

  // Bank Account CRUD
  const handleAddAccount = async () => {
    try { const res = await createBankAccount(addAccountForm); setBankAccounts(prev => [res.data, ...prev]); } catch {}
    setAddAccountForm({ holderName: '', accountNumber: '', bankName: '', branch: '', ifsc: '', accountTypeId: 0, openingBalance: 0, notes: '', status: 'active', isDefault: false });
    setShowAddAccountModal(false);
  };
  const openEditAccount = (a: BankAccount) => {
    setEditAccountForm({ id: a.id, holderName: a.holderName, accountNumber: a.accountNumber, bankName: a.bankName, branch: a.branch, ifsc: a.ifsc, accountTypeId: a.accountTypeId, openingBalance: a.openingBalance, notes: a.notes, status: a.status, isDefault: a.isDefault });
    setShowEditAccountModal(true);
  };
  const handleEditAccountSave = async () => {
    const { id, ...data } = editAccountForm;
    try { await updateBankAccount(id, data); } catch {}
    setBankAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data, accountTypeName: accountTypes.find(t => t.id === data.accountTypeId)?.name || '' } : a));
    setShowEditAccountModal(false);
  };

  // Account Type CRUD
  const handleAddType = async () => {
    try { const res = await createAccountType({ name: addTypeForm.name, status: addTypeForm.status ? 'active' : 'inactive' }); setAccountTypes(prev => [res.data, ...prev]); } catch {}
    setAddTypeForm({ name: '', status: true }); setShowAddTypeModal(false);
  };
  const openEditType = (t: AccountType) => {
    setEditTypeForm({ id: t.id, name: t.name, status: t.status === 'active' }); setShowEditTypeModal(true);
  };
  const handleEditTypeSave = async () => {
    try { await updateAccountType(editTypeForm.id, { name: editTypeForm.name, status: editTypeForm.status ? 'active' : 'inactive' }); } catch {}
    setAccountTypes(prev => prev.map(t => t.id === editTypeForm.id ? { ...t, name: editTypeForm.name, status: editTypeForm.status ? 'active' : 'inactive' } : t));
    setShowEditTypeModal(false);
  };

  const openDeleteModal = (id: number, type: 'account' | 'type') => { setDeleteTarget({ id, type }); setShowDeleteModal(true); };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'account') { await deleteBankAccount(deleteTarget.id); setBankAccounts(prev => prev.filter(a => a.id !== deleteTarget.id)); }
    else { await deleteAccountType(deleteTarget.id); setAccountTypes(prev => prev.filter(t => t.id !== deleteTarget.id)); }
    setShowDeleteModal(false);
  };

  const filteredAccounts = bankAccounts.filter(a => !searchTerm || a.holderName.toLowerCase().includes(searchTerm.toLowerCase()) || a.bankName.toLowerCase().includes(searchTerm.toLowerCase()) || a.accountNumber.includes(searchTerm));
  const filteredTypes = accountTypes.filter(t => !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">{t('accounts.title')}</h4><h6>{t('accounts.subtitle')}</h6></div></div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" title="Pdf" onClick={e => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="pdf" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Excel" onClick={e => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="excel" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Refresh" onClick={e => { e.preventDefault(); window.location.reload(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); activeTab === 'accounts' ? setShowAddAccountModal(true) : setShowAddTypeModal(true); }}>
            <i className="ti ti-circle-plus me-1"></i>{activeTab === 'accounts' ? t('accounts.add_account') : t('accounts.add_type')}
          </a>
        </div>
      </div>

      {/* Nav Tabs */}
      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><a href="#" className={`nav-link ${activeTab === 'accounts' ? 'active' : ''}`} onClick={e => { e.preventDefault(); setActiveTab('accounts'); setSearchTerm(''); setSelectAll(false); setSelectedIds(new Set()); }}>{t('accounts.bank_accounts_tab')}</a></li>
        <li className="nav-item"><a href="#" className={`nav-link ${activeTab === 'types' ? 'active' : ''}`} onClick={e => { e.preventDefault(); setActiveTab('types'); setSearchTerm(''); setSelectAll(false); setSelectedIds(new Set()); }}>{t('accounts.account_type_tab')}</a></li>
      </ul>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set"><div className="search-input"><span className="btn-searchset"><i className="ti ti-search fs-14"></i></span><input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
          ) : activeTab === 'accounts' ? (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th className="no-sort"><label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label></th>
                    <th>{t('accounts.account_holder')}</th>
                    <th>{t('accounts.account_no')}</th>
                    <th>{t('accounts.bank_name')}</th>
                    <th>{t('accounts.type')}</th>
                    <th>{t('accounts.opening_balance')}</th>
                    <th>{t('common.notes')}</th>
                    <th>{t('accounts.status')}</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map(acc => (
                    <tr key={acc.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(acc.id)} onChange={e => handleSelectOne(acc.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{acc.holderName}</td>
                      <td>{acc.accountNumber}</td>
                      <td>{acc.bankName}</td>
                      <td>{acc.accountTypeName}</td>
                      <td>${acc.openingBalance.toFixed(2)}</td>
                      <td>{acc.notes}</td>
                      <td><span className={`badge fw-medium fs-10 ${acc.status === 'active' ? 'bg-success' : 'bg-danger'}`}>{acc.status === 'active' ? 'Active' : 'Inactive'}</span>{acc.isDefault && <span className="badge bg-info ms-1 fs-10">Default</span>}</td>
                      <td className="action-table-data"><div className="edit-delete-action">
                        <a className="me-2 p-2" href="#" onClick={e => { e.preventDefault(); openEditAccount(acc); }}><i data-feather="edit" className="feather-edit"></i></a>
                        <a className="p-2" href="#" onClick={e => { e.preventDefault(); openDeleteModal(acc.id, 'account'); }}><i data-feather="trash-2" className="feather-trash-2"></i></a>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th className="no-sort"><label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label></th>
                    <th>{t('accounts.type')}</th>
                    <th>{t('common.created_date')}</th>
                    <th>{t('accounts.status')}</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTypes.map(t => (
                    <tr key={t.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(t.id)} onChange={e => handleSelectOne(t.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{t.name}</td>
                      <td>{t.createdOn}</td>
                      <td><span className={`badge fw-medium fs-10 ${t.status === 'active' ? 'bg-success' : 'bg-danger'}`}>{t.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                      <td className="action-table-data"><div className="edit-delete-action">
                        <a className="me-2 p-2" href="#" onClick={e => { e.preventDefault(); openEditType(t); }}><i data-feather="edit" className="feather-edit"></i></a>
                        <a className="p-2" href="#" onClick={e => { e.preventDefault(); openDeleteModal(t.id, 'type'); }}><i data-feather="trash-2" className="feather-trash-2"></i></a>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Bank Account Modal */}
      {showAddAccountModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>{t('accounts.add_account')}</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddAccountModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.account_holder_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addAccountForm.holderName} onChange={e => setAddAccountForm(p => ({ ...p, holderName: e.target.value }))} autoFocus /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.account_number')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addAccountForm.accountNumber} onChange={e => setAddAccountForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.bank_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addAccountForm.bankName} onChange={e => setAddAccountForm(p => ({ ...p, bankName: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.branch')}</label><input type="text" className="form-control" value={addAccountForm.branch} onChange={e => setAddAccountForm(p => ({ ...p, branch: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.ifsc')}</label><input type="text" className="form-control" value={addAccountForm.ifsc} onChange={e => setAddAccountForm(p => ({ ...p, ifsc: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.account_type')}<span className="text-danger ms-1">*</span></label>
                  <select className="form-select" value={addAccountForm.accountTypeId} onChange={e => setAddAccountForm(p => ({ ...p, accountTypeId: Number(e.target.value) }))}>
                    <option value={0}>{t('accounts.select_type')}</option>
                    {accountTypes.filter(t => t.status === 'active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.opening_balance')}</label><input type="number" className="form-control" value={addAccountForm.openingBalance || ''} onChange={e => setAddAccountForm(p => ({ ...p, openingBalance: Number(e.target.value) }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('common.notes')}</label><input type="text" className="form-control" value={addAccountForm.notes} onChange={e => setAddAccountForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="d-flex gap-4">
                <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">{t('accounts.status')}</span><input type="checkbox" id="add-acc-status" className="check" checked={addAccountForm.status === 'active'} onChange={e => setAddAccountForm(p => ({ ...p, status: e.target.checked ? 'active' : 'inactive' }))} /><label htmlFor="add-acc-status" className="checktoggle"></label></div>
                <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">{t('accounts.default_account')}</span><input type="checkbox" id="add-acc-default" className="check" checked={addAccountForm.isDefault} onChange={e => setAddAccountForm(p => ({ ...p, isDefault: e.target.checked }))} /><label htmlFor="add-acc-default" className="checktoggle"></label></div>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddAccountModal(false)}>{t('common.cancel')}</button><button type="button" className="btn btn-primary" onClick={handleAddAccount} disabled={!addAccountForm.holderName.trim() || !addAccountForm.accountNumber.trim() || !addAccountForm.bankName.trim() || !addAccountForm.accountTypeId}>{t('accounts.add_account')}</button></div>
          </div></div>
        </div>
      )}

      {/* Edit Bank Account Modal */}
      {showEditAccountModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>{t('accounts.edit_account')}</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditAccountModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.account_holder_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editAccountForm.holderName} onChange={e => setEditAccountForm(p => ({ ...p, holderName: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.account_number')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editAccountForm.accountNumber} onChange={e => setEditAccountForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.bank_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editAccountForm.bankName} onChange={e => setEditAccountForm(p => ({ ...p, bankName: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.branch')}</label><input type="text" className="form-control" value={editAccountForm.branch} onChange={e => setEditAccountForm(p => ({ ...p, branch: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.ifsc')}</label><input type="text" className="form-control" value={editAccountForm.ifsc} onChange={e => setEditAccountForm(p => ({ ...p, ifsc: e.target.value }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.account_type')}<span className="text-danger ms-1">*</span></label>
                  <select className="form-select" value={editAccountForm.accountTypeId} onChange={e => setEditAccountForm(p => ({ ...p, accountTypeId: Number(e.target.value) }))}>
                    <option value={0}>{t('accounts.select_type')}</option>
                    {accountTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('accounts.opening_balance')}</label><input type="number" className="form-control" value={editAccountForm.openingBalance || ''} onChange={e => setEditAccountForm(p => ({ ...p, openingBalance: Number(e.target.value) }))} /></div>
                <div className="col-md-6 mb-3"><label className="form-label">{t('common.notes')}</label><input type="text" className="form-control" value={editAccountForm.notes} onChange={e => setEditAccountForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="d-flex gap-4">
                <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">{t('accounts.status')}</span><input type="checkbox" id="edit-acc-status" className="check" checked={editAccountForm.status === 'active'} onChange={e => setEditAccountForm(p => ({ ...p, status: e.target.checked ? 'active' : 'inactive' }))} /><label htmlFor="edit-acc-status" className="checktoggle"></label></div>
                <div className="status-toggle modal-status d-flex align-items-center"><span className="status-label me-2">{t('accounts.default_account')}</span><input type="checkbox" id="edit-acc-default" className="check" checked={editAccountForm.isDefault} onChange={e => setEditAccountForm(p => ({ ...p, isDefault: e.target.checked }))} /><label htmlFor="edit-acc-default" className="checktoggle"></label></div>
              </div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditAccountModal(false)}>{t('common.cancel')}</button><button type="button" className="btn btn-primary" onClick={handleEditAccountSave}>{t('common.save_changes')}</button></div>
          </div></div>
        </div>
      )}

      {/* Add Account Type Modal */}
      {showAddTypeModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>{t('accounts.add_type')}</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddTypeModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">{t('accounts.type_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addTypeForm.name} onChange={e => setAddTypeForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="mb-0"><div className="status-toggle modal-status d-flex justify-content-between align-items-center"><span className="status-label">{t('accounts.status')}</span><input type="checkbox" id="add-type-status" className="check" checked={addTypeForm.status} onChange={e => setAddTypeForm(p => ({ ...p, status: e.target.checked }))} /><label htmlFor="add-type-status" className="checktoggle"></label></div></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddTypeModal(false)}>{t('common.cancel')}</button><button type="button" className="btn btn-primary" onClick={handleAddType} disabled={!addTypeForm.name.trim()}>{t('accounts.add_type')}</button></div>
          </div></div>
        </div>
      )}

      {/* Edit Account Type Modal */}
      {showEditTypeModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>{t('accounts.edit_type')}</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditTypeModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">{t('accounts.type_name')}<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editTypeForm.name} onChange={e => setEditTypeForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="mb-0"><div className="status-toggle modal-status d-flex justify-content-between align-items-center"><span className="status-label">{t('accounts.status')}</span><input type="checkbox" id="edit-type-status" className="check" checked={editTypeForm.status} onChange={e => setEditTypeForm(p => ({ ...p, status: e.target.checked }))} /><label htmlFor="edit-type-status" className="checktoggle"></label></div></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditTypeModal(false)}>{t('common.cancel')}</button><button type="button" className="btn btn-primary" onClick={handleEditTypeSave}>{t('common.save_changes')}</button></div>
          </div></div>
        </div>
      )}

      {/* Delete Modal */}
      <AdminDeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} />
    </>
  );
};

export default AccountList;

