import React, { useState, useEffect, useCallback } from 'react';
import { getIncomeCategories, createIncomeCategory, updateIncomeCategory, deleteIncomeCategory, IncomeCategory as IncomeCategoryType } from '../../services/financeService';

const IncomeCategory: React.FC = () => {
  const [categories, setCategories] = useState<IncomeCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ code: '', name: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, code: '', name: '' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchData = async () => {
    try { const res = await getIncomeCategories(); setCategories(res.data); } catch { setCategories([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  const generateCode = () => `IC-${Date.now().toString().slice(-6)}`;

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked); setSelectedIds(checked ? new Set(categories.map(c => c.id)) : new Set());
  }, [categories]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }, []);

  const handleAdd = async () => {
    try { const res = await createIncomeCategory({ code: addForm.code, name: addForm.name }); setCategories(prev => [res.data, ...prev]); } catch {}
    setAddForm({ code: '', name: '' }); setShowAddModal(false);
  };

  const openEditModal = (c: IncomeCategoryType) => {
    setEditForm({ id: c.id, code: c.code, name: c.name }); setShowEditModal(true);
  };

  const handleEditSave = async () => {
    try { await updateIncomeCategory(editForm.id, { code: editForm.code, name: editForm.name }); } catch {}
    setCategories(prev => prev.map(c => c.id === editForm.id ? { ...c, code: editForm.code, name: editForm.name } : c));
    setShowEditModal(false);
  };

  const openDeleteModal = (id: number) => { setDeleteId(id); setDeleteError(''); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteIncomeCategory(deleteId); setCategories(prev => prev.filter(c => c.id !== deleteId)); setShowDeleteModal(false); }
    catch (err: any) { setDeleteError(err.response?.data?.message || 'Failed to delete.'); }
  };

  const filtered = categories.filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4 className="fw-bold">Income Category</h4><h6>Manage your income categories</h6></div></div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" title="Pdf" onClick={e => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="pdf" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Excel" onClick={e => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="excel" /></a></li>
          <li><a href="#" data-bs-toggle="tooltip" title="Refresh" onClick={e => { e.preventDefault(); window.location.reload(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); setAddForm({ code: generateCode(), name: '' }); setShowAddModal(true); }}><i className="ti ti-circle-plus me-1"></i>Add Category</a></div>
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
                    <th>Code</th>
                    <th>Category</th>
                    <th>Added Date</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cat => (
                    <tr key={cat.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(cat.id)} onChange={e => handleSelectOne(cat.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td>{cat.code}</td>
                      <td>{cat.name}</td>
                      <td>{cat.createdOn}</td>
                      <td className="action-table-data"><div className="edit-delete-action">
                        <a className="me-2 p-2" href="#" onClick={e => { e.preventDefault(); openEditModal(cat); }}><i data-feather="edit" className="feather-edit"></i></a>
                        <a className="p-2" href="#" onClick={e => { e.preventDefault(); openDeleteModal(cat.id); }}><i data-feather="trash-2" className="feather-trash-2"></i></a>
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
            <div className="modal-header"><div className="page-title"><h4>Add Income Category</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Code<span className="text-danger ms-1">*</span></label>
                <div className="input-group">
                  <input type="text" className="form-control" value={addForm.code} onChange={e => setAddForm(p => ({ ...p, code: e.target.value }))} />
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setAddForm(p => ({ ...p, code: generateCode() }))}>Generate</button>
                </div>
              </div>
              <div className="mb-0"><label className="form-label">Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!addForm.code.trim() || !addForm.name.trim()}>Add Category</button></div>
          </div></div>
        </div>
      )}

      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><div className="page-title"><h4>Edit Income Category</h4></div><button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)}><span>&times;</span></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Code<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))} /></div>
              <div className="mb-0"><label className="form-label">Name<span className="text-danger ms-1">*</span></label><input type="text" className="form-control" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleEditSave}>Save Changes</button></div>
          </div></div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="page-wrapper-new p-0"><div className="content p-5 px-3 text-center">
            <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2"><i className="ti ti-trash fs-24 text-danger"></i></span>
            <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Income Category</h4>
            <p className="fs-14 text-muted">Are you sure you want to delete this category?</p>
            {deleteError && <div className="alert alert-danger py-2 px-3 text-start">{deleteError}</div>}
            <div className="d-flex justify-content-center gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button><button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button></div>
          </div></div></div></div>
        </div>
      )}
    </>
  );
};

export default IncomeCategory;

