import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

interface VariantDto {
  id: number;
  name: string;
  values: string;
  status: string;
  createdAt: string;
}

interface VariantItem {
  id: number;
  name: string;
  values: string;
  status: string;
  createdAt: string;
}

const mapDto = (dto: VariantDto): VariantItem => ({
  id: dto.id,
  name: dto.name,
  values: dto.values,
  status: dto.status ?? 'active',
  createdAt: dto.createdAt,
});

const VariantAttributes: React.FC = () => {
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Select all
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', values: '', status: 'active' });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, name: '', values: '', status: 'active' });

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<VariantDto[]>('/variant-attributes');
      setVariants(res.data.map(mapDto));
    } catch {
      setVariants([]);
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

  // Filter
  const filteredData = variants.filter((v) => {
    const matchSearch = !searchTerm ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.values.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || v.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(filteredData.map((v) => v.id)));
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

  // ---------- Add Variant ----------
  const resetAddForm = () => setAddForm({ name: '', values: '', status: 'active' });

  const handleAddSave = async () => {
    if (!addForm.name.trim()) return;
    try {
      await api.post('/variant-attributes', {
        name: addForm.name,
        values: addForm.values,
        status: addForm.status,
      });
      await fetchData();
    } catch { /* ignore */ }
    setShowAddModal(false);
    resetAddForm();
  };

  // ---------- Edit Variant ----------
  const openEditModal = (item: VariantItem) => {
    setEditForm({ id: item.id, name: item.name, values: item.values, status: item.status });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) return;
    try {
      await api.put(`/variant-attributes/${editForm.id}`, {
        name: editForm.name,
        values: editForm.values,
        status: editForm.status,
      });
      await fetchData();
    } catch { /* ignore */ }
    setShowEditModal(false);
  };

  // ---------- Delete Variant ----------
  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await api.delete(`/variant-attributes/${deleteId}`);
      await fetchData();
    } catch { /* ignore */ }
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  // ---------- Tag input helpers ----------
  const parseTagsToArray = (val: string): string[] =>
    val.split(',').map((s) => s.trim()).filter(Boolean);

  const handleTagKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValues: string,
    setter: (values: string) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const newTag = input.value.trim().replace(/,$/g, '');
      if (newTag) {
        const existing = parseTagsToArray(currentValues);
        if (!existing.includes(newTag)) {
          setter([...existing, newTag].join(', '));
        }
        input.value = '';
      }
    }
  };

  const removeTag = (
    tag: string,
    currentValues: string,
    setter: (values: string) => void
  ) => {
    const existing = parseTagsToArray(currentValues);
    setter(existing.filter((t) => t !== tag).join(', '));
  };

  const renderTagInput = (
    id: string,
    currentValues: string,
    setter: (values: string) => void
  ) => {
    const tags = parseTagsToArray(currentValues);
    return (
      <div>
        <div className="d-flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="badge bg-secondary-transparent fs-13 d-inline-flex align-items-center gap-1 px-2 py-1">
              {tag}
              <a
                href="#"
                className="text-secondary ms-1"
                onClick={(e) => { e.preventDefault(); removeTag(tag, currentValues, setter); }}
              >
                &times;
              </a>
            </span>
          ))}
        </div>
        <input
          id={id}
          type="text"
          className="form-control fs-14"
          placeholder="Type and press Enter or comma"
          onKeyDown={(e) => handleTagKeyDown(e, currentValues, setter)}
        />
        <span className="tag-text mt-2 d-flex text-muted fs-12">Enter value separated by comma</span>
      </div>
    );
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Variant Attributes</h4>
            <h6>Manage your variant attributes</h6>
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
            <i className="ti ti-circle-plus me-1"></i>Add Variant
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
          <div className="table-dropdown my-xl-auto right-content">
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {statusFilter || 'Status'}
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
                    <th>Variant</th>
                    <th>Values</th>
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
                      <td className="text-gray-9">{item.name}</td>
                      <td>{item.values}</td>
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

      {/* Add Variant Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Add Variant</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => { setShowAddModal(false); resetAddForm(); }} aria-label="Close">
                  <span aria-hidden="true" className="fs-16">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Variant<span className="text-danger ms-1">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={addForm.name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Values<span className="text-danger ms-1">*</span></label>
                  {renderTagInput('add-tags', addForm.values, (val) => setAddForm((prev) => ({ ...prev, values: val })))}
                </div>
                <div className="mb-0 mt-4">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">Status</span>
                    <input
                      type="checkbox"
                      id="add-variant-status"
                      className="check"
                      checked={addForm.status === 'active'}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                    />
                    <label htmlFor="add-variant-status" className="checktoggle"></label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => { setShowAddModal(false); resetAddForm(); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddSave}>Add Variant</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Variant Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Edit Variant</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true" className="fs-16">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Variant<span className="text-danger ms-1">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Values<span className="text-danger ms-1">*</span></label>
                  {renderTagInput('edit-tags', editForm.values, (val) => setEditForm((prev) => ({ ...prev, values: val })))}
                </div>
                <div className="mb-0 mt-3">
                  <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                    <span className="status-label">Status</span>
                    <input
                      type="checkbox"
                      id="edit-variant-status"
                      className="check"
                      checked={editForm.status === 'active'}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                    />
                    <label htmlFor="edit-variant-status" className="checktoggle"></label>
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
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Variant</h4>
                  <p className="mb-0 fs-16">Are you sure you want to delete variant?</p>
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

export default VariantAttributes;
