import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';

interface SubCategory {
  id: string;
  image: string;
  subCategory: string;
  category: string;
  categoryCode: string;
  description: string;
  status: 'active' | 'inactive';
}

const SubCategories: React.FC = () => {
  const [data, setData] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([]);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ category: '', subCategory: '', categoryCode: '', description: '', status: true, imageFile: null as File | null, imagePreview: '' });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', category: '', subCategory: '', categoryCode: '', description: '', status: true, image: '', imageFile: null as File | null, imagePreview: '' });

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const addFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subCatRes, catRes] = await Promise.all([
          api.get<SubCategory[]>('/sub-categories'),
          api.get<{ id: string; name: string }[]>('/categories'),
        ]);
        setData(subCatRes.data);
        setCategoryOptions(catRes.data);
      } catch {
        setData([]);
        setCategoryOptions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(data.map((d) => d.id)) : new Set());
  }, [data]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  // Add
  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAddForm((p) => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }));
    }
  };

  const handleAdd = async () => {
    const newItem: SubCategory = {
      id: Date.now().toString(),
      image: addForm.imagePreview || '/assets/img/products/stock-img-01.png',
      subCategory: addForm.subCategory,
      category: addForm.category,
      categoryCode: addForm.categoryCode,
      description: addForm.description,
      status: addForm.status ? 'active' : 'inactive',
    };
    try {
      const fd = new FormData();
      const catObj = categoryOptions.find((c) => c.name === addForm.category);
      if (catObj) fd.append('categoryId', catObj.id);
      fd.append('subCategory', addForm.subCategory);
      fd.append('categoryCode', addForm.categoryCode);
      fd.append('description', addForm.description);
      fd.append('status', newItem.status);
      if (addForm.imageFile) fd.append('image', addForm.imageFile);
      const response = await api.post<SubCategory>('/sub-categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setData((prev) => [response.data, ...prev]);
    } catch {
      setData((prev) => [newItem, ...prev]);
    }
    setAddForm({ category: '', subCategory: '', categoryCode: '', description: '', status: true, imageFile: null, imagePreview: '' });
    setShowAddModal(false);
  };

  // Edit
  const openEditModal = (item: SubCategory) => {
    setEditForm({ id: item.id, category: item.category, subCategory: item.subCategory, categoryCode: item.categoryCode, description: item.description, status: item.status === 'active', image: item.image, imageFile: null, imagePreview: '' });
    setShowEditModal(true);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditForm((p) => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }));
    }
  };

  const handleEditSave = async () => {
    const updatedImage = editForm.imagePreview || editForm.image;
    const updated: Partial<SubCategory> = {
      category: editForm.category,
      subCategory: editForm.subCategory,
      categoryCode: editForm.categoryCode,
      description: editForm.description,
      status: editForm.status ? 'active' : 'inactive',
      image: updatedImage,
    };
    try {
      const fd = new FormData();
      const catObj = categoryOptions.find((c) => c.name === editForm.category);
      if (catObj) fd.append('categoryId', catObj.id);
      fd.append('subCategory', editForm.subCategory);
      fd.append('categoryCode', editForm.categoryCode);
      fd.append('description', editForm.description);
      fd.append('status', updated.status!);
      if (editForm.imageFile) fd.append('image', editForm.imageFile);
      await api.put(`/sub-categories/${editForm.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch { /* update locally */ }
    setData((prev) => prev.map((c) => c.id === editForm.id ? { ...c, ...updated } : c));
    setShowEditModal(false);
  };

  // Delete
  const openDeleteModal = (id: string) => { setDeleteId(id); setDeleteError(''); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/sub-categories/${deleteId}`);
      setData((prev) => prev.filter((c) => c.id !== deleteId));
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete sub-category.';
      setDeleteError(msg);
    }
  };

  const removeEditImage = () => {
    setEditForm((p) => ({ ...p, image: '', imagePreview: '', imageFile: null }));
  };

  const filtered = data.filter((item) => {
    const matchSearch = !searchTerm || item.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase()) || item.categoryCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !categoryFilter || item.category === categoryFilter;
    const matchStatus = !statusFilter || item.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Sub Category</h4>
            <h6>Manage your sub categories</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Pdf" onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/pdf.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Excel" onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/excel.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Collapse" onClick={(e) => e.preventDefault()}>
              <i className="ti ti-chevron-up"></i>
            </a>
          </li>
        </ul>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); setShowAddModal(true); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Sub Category
          </a>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {categoryFilter || 'Category'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setCategoryFilter(''); }}>All</a></li>
                {categoryOptions.map((cat) => (
                  <li key={cat.id}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setCategoryFilter(cat.name); }}>{cat.name}</a></li>
                ))}
              </ul>
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Status'}
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
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
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
                    <th>Image</th>
                    <th>Sub Category</th>
                    <th>Category</th>
                    <th>Category Code</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={(e) => handleSelectOne(item.id, e.target.checked)} />
                          <span className="checkmarks"></span>
                        </label>
                      </td>
                      <td>
                        <a className="avatar avatar-md me-2">
                          <img src={mediaUrl(item.image)} alt="product" />
                        </a>
                      </td>
                      <td>{item.subCategory}</td>
                      <td>{item.category}</td>
                      <td>{item.categoryCode}</td>
                      <td>{item.description}</td>
                      <td>
                        <span className={`badge fw-medium fs-10 ${item.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                          {item.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <a className="me-2 p-2" href="#" onClick={(e) => { e.preventDefault(); openEditModal(item); }}>
                            <i data-feather="edit" className="feather-edit"></i>
                          </a>
                          <a className="p-2" href="#" onClick={(e) => { e.preventDefault(); openDeleteModal(item.id); }}>
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

      {/* Add Sub Category Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Add Sub Category</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowAddModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="add-image-upload">
                    <div className="add-image">
                      {addForm.imagePreview ? (
                        <img src={addForm.imagePreview} alt="preview" style={{ maxWidth: 80, maxHeight: 80 }} />
                      ) : (
                        <span className="fw-normal"><i className="ti ti-circle-plus me-1"></i> Add Image</span>
                      )}
                    </div>
                    <div className="new-employee-field">
                      <div className="mb-0">
                        <div className="image-upload mb-2" onClick={() => addFileRef.current?.click()} style={{ cursor: 'pointer' }}>
                          <input type="file" ref={addFileRef} accept="image/*" onChange={handleAddImageChange} style={{ display: 'none' }} />
                          <div className="image-uploads">
                            <h4 className="fs-13 fw-medium">Upload Image</h4>
                          </div>
                        </div>
                        <span>JPEG, PNG up to 2 MB</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Category<span className="text-danger ms-1">*</span></label>
                  <select className="form-select" value={addForm.category} onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value }))}>
                    <option value="">Select</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Sub Category<span className="text-danger ms-1">*</span></label>
                  <input type="text" className="form-control" value={addForm.subCategory} onChange={(e) => setAddForm((p) => ({ ...p, subCategory: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category Code<span className="text-danger ms-1">*</span></label>
                  <input type="text" className="form-control" value={addForm.categoryCode} onChange={(e) => setAddForm((p) => ({ ...p, categoryCode: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description<span className="text-danger ms-1">*</span></label>
                  <textarea className="form-control" value={addForm.description} onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="mb-0">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">Status</span>
                    <input type="checkbox" id="add-sub-status" className="check" checked={addForm.status} onChange={(e) => setAddForm((p) => ({ ...p, status: e.target.checked }))} />
                    <label htmlFor="add-sub-status" className="checktoggle"></label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAdd} disabled={!addForm.subCategory.trim() || !addForm.category}>Add Sub Category</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sub Category Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Edit Sub Category</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="add-image-upload">
                    <div className="add-image p-1 border-solid" style={{ position: 'relative' }}>
                      {(editForm.imagePreview || editForm.image) ? (
                        <>
                          <img src={editForm.imagePreview || editForm.image} alt="image" style={{ maxWidth: 80, maxHeight: 80 }} />
                          <a href="#" onClick={(e) => { e.preventDefault(); removeEditImage(); }} style={{ position: 'absolute', top: 2, right: 2 }}>
                            <i className="ti ti-x fs-12 text-white bg-danger rounded-1" style={{ padding: 2 }}></i>
                          </a>
                        </>
                      ) : (
                        <span className="fw-normal"><i className="ti ti-circle-plus me-1"></i> Add Image</span>
                      )}
                    </div>
                    <div className="new-employee-field">
                      <div className="mb-0">
                        <div className="image-upload mb-2" onClick={() => editFileRef.current?.click()} style={{ cursor: 'pointer' }}>
                          <input type="file" ref={editFileRef} accept="image/*" onChange={handleEditImageChange} style={{ display: 'none' }} />
                          <div className="image-uploads">
                            <h4 className="fs-13 fw-medium">Change Image</h4>
                          </div>
                        </div>
                        <span>JPEG, PNG up to 2 MB</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Category<span className="text-danger ms-1">*</span></label>
                  <select className="form-select" value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}>
                    <option value="">Select</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Sub Category<span className="text-danger ms-1">*</span></label>
                  <input type="text" className="form-control" value={editForm.subCategory} onChange={(e) => setEditForm((p) => ({ ...p, subCategory: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category Code<span className="text-danger ms-1">*</span></label>
                  <input type="text" className="form-control" value={editForm.categoryCode} onChange={(e) => setEditForm((p) => ({ ...p, categoryCode: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description<span className="text-danger ms-1">*</span></label>
                  <textarea className="form-control" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="mb-0">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">Status</span>
                    <input type="checkbox" id="edit-sub-status" className="check" checked={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.checked }))} />
                    <label htmlFor="edit-sub-status" className="checktoggle"></label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger"></i>
                  </span>
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Sub Category</h4>
                  <p className="mb-0 fs-16">Are you sure you want to delete sub category?</p>
                  {deleteError && <div className="alert alert-danger py-2 px-3 text-start">{deleteError}</div>}
                  <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                    <button type="button" className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    <button type="button" className="btn btn-primary fs-13 fw-medium p-2 px-3" onClick={handleDelete}>Yes Delete</button>
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

export default SubCategories;
