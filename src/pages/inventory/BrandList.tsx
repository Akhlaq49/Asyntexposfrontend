import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';

interface BrandDto {
  id: number;
  name: string;
  image: string | null;
  status: string;
  createdAt: string;
}

interface BrandItem {
  id: number;
  name: string;
  image: string;
  status: string;
  createdAt: string;
}

const mapDto = (dto: BrandDto): BrandItem => ({
  id: dto.id,
  name: dto.name,
  image: dto.image ?? '',
  status: dto.status ?? 'active',
  createdAt: dto.createdAt,
});

type SortMode = 'latest' | 'asc' | 'desc';

const BrandList: React.FC = () => {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');

  // Select all
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', status: 'active' });
  const [addImage, setAddImage] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, name: '', status: 'active' });
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<BrandDto[]>('/brands/list');
      setBrands(res.data.map(mapDto));
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Feather icons
  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  // Filtered + sorted data
  const filteredData = brands
    .filter((b) => {
      const matchSearch = !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || b.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortMode === 'asc') return a.name.localeCompare(b.name);
      if (sortMode === 'desc') return b.name.localeCompare(a.name);
      return 0; // latest – already sorted by CreatedAt desc from API
    });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(filteredData.map((b) => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredData]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  // ---------- Add Brand ----------
  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAddImage(file);
      setAddImagePreview(URL.createObjectURL(file));
    }
  };

  const resetAddForm = () => {
    setAddForm({ name: '', status: 'active' });
    setAddImage(null);
    setAddImagePreview(null);
    if (addFileRef.current) addFileRef.current.value = '';
  };

  const handleAddSave = async () => {
    if (!addForm.name.trim()) return;
    const formData = new FormData();
    formData.append('name', addForm.name);
    formData.append('status', addForm.status);
    if (addImage) formData.append('image', addImage);

    try {
      await api.post('/brands', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchData();
    } catch { /* ignore */ }
    setShowAddModal(false);
    resetAddForm();
  };

  // ---------- Edit Brand ----------
  const openEditModal = (item: BrandItem) => {
    setEditForm({ id: item.id, name: item.name, status: item.status });
    setEditImage(null);
    setEditImagePreview(item.image ? mediaUrl(item.image) : null);
    setShowEditModal(true);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) return;
    const formData = new FormData();
    formData.append('name', editForm.name);
    formData.append('status', editForm.status);
    if (editImage) formData.append('image', editImage);

    try {
      await api.put(`/brands/${editForm.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchData();
    } catch { /* ignore */ }
    setShowEditModal(false);
  };

  // ---------- Delete Brand ----------
  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await api.delete(`/brands/${deleteId}`);
    } catch { /* ignore */ }
    setBrands((prev) => prev.filter((b) => b.id !== deleteId));
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const sortLabel = sortMode === 'asc' ? 'Ascending' : sortMode === 'desc' ? 'Descending' : 'Latest';

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Brand</h4>
            <h6>Manage your brands</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li>
            <a href="#" data-bs-placement="top" title="Pdf" onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/pdf.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-placement="top" title="Excel" onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/excel.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); fetchData(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
          <li>
            <a href="#" data-bs-placement="top" title="Collapse" onClick={(e) => e.preventDefault()}>
              <i className="ti ti-chevron-up"></i>
            </a>
          </li>
        </ul>
        <div className="page-btn">
          <a
            href="#"
            className="btn btn-primary"
            onClick={(e) => { e.preventDefault(); resetAddForm(); setShowAddModal(true); }}
          >
            <i className="ti ti-circle-plus me-1"></i>Add Brand
          </a>
        </div>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Status Filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {statusFilter || 'Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter(''); }}>All</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('active'); }}>Active</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('inactive'); }}>Inactive</a></li>
              </ul>
            </div>
            {/* Sort By */}
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                Sort By : {sortLabel}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setSortMode('latest'); }}>Latest</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setSortMode('asc'); }}>Ascending</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setSortMode('desc'); }}>Descending</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
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
                    <th>Brand</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <label className="checkboxs">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                          />
                          <span className="checkmarks"></span>
                        </label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md bg-light-900 p-1 me-2" onClick={(e) => e.preventDefault()}>
                            <img className="object-fit-contain" src={mediaUrl(item.image)} alt="img" />
                          </a>
                          <a href="#" onClick={(e) => e.preventDefault()}>{item.name}</a>
                        </div>
                      </td>
                      <td>{item.createdAt}</td>
                      <td>
                        <span className={`badge table-badge fw-medium fs-10 ${item.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
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

      {/* Add Brand Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Add Brand</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => { setShowAddModal(false); resetAddForm(); }} aria-label="Close">
                  <span aria-hidden="true" className="fs-16">&times;</span>
                </button>
              </div>
              <div className="modal-body new-employee-field">
                <div className="profile-pic-upload mb-3">
                  <div className="profile-pic brand-pic">
                    {addImagePreview ? (
                      <span><img src={addImagePreview} alt="preview" /></span>
                    ) : (
                      <span><i data-feather="plus-circle" className="plus-down-add"></i> Add Image</span>
                    )}
                  </div>
                  <div>
                    <div className="image-upload mb-0">
                      <input type="file" ref={addFileRef} accept="image/*" onChange={handleAddImageChange} />
                      <div className="image-uploads"><h4>Upload Image</h4></div>
                    </div>
                    <p className="mt-2">JPEG, PNG up to 2 MB</p>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Brand<span className="text-danger ms-1">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={addForm.name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-0">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">Status</span>
                    <input
                      type="checkbox"
                      id="add-brand-status"
                      className="check"
                      checked={addForm.status === 'active'}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                    />
                    <label htmlFor="add-brand-status" className="checktoggle"></label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => { setShowAddModal(false); resetAddForm(); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddSave}>Add Brand</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Edit Brand</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true" className="fs-16">&times;</span>
                </button>
              </div>
              <div className="modal-body new-employee-field">
                <div className="profile-pic-upload mb-3">
                  <div className="profile-pic brand-pic">
                    {editImagePreview ? (
                      <>
                        <span><img src={editImagePreview} alt="preview" /></span>
                        <a
                          href="#"
                          className="remove-photo"
                          onClick={(e) => { e.preventDefault(); setEditImagePreview(null); setEditImage(null); if (editFileRef.current) editFileRef.current.value = ''; }}
                        >
                          <i data-feather="x" className="x-square-add"></i>
                        </a>
                      </>
                    ) : (
                      <span><i data-feather="plus-circle" className="plus-down-add"></i> Add Image</span>
                    )}
                  </div>
                  <div>
                    <div className="image-upload mb-0">
                      <input type="file" ref={editFileRef} accept="image/*" onChange={handleEditImageChange} />
                      <div className="image-uploads"><h4>Change Image</h4></div>
                    </div>
                    <p className="mt-2">JPEG, PNG up to 2 MB</p>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Brand<span className="text-danger ms-1">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-0">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">Status</span>
                    <input
                      type="checkbox"
                      id="edit-brand-status"
                      className="check"
                      checked={editForm.status === 'active'}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                    />
                    <label htmlFor="edit-brand-status" className="checktoggle"></label>
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
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Brand</h4>
                  <p className="mb-0 fs-16">Are you sure you want to delete brand?</p>
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

export default BrandList;
