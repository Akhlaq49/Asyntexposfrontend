import React, { useState, useEffect, useMemo } from 'react';
import { MEDIA_BASE_URL } from '../../services/api';
import {
  Customer,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadCustomerPicture,
} from '../../services/customerService';
import { useFieldVisibility } from '../../utils/useFieldVisibility';
import WhatsAppSendModal from '../../components/WhatsAppSendModal';

const emptyForm: { name: string; so: string; cnic: string; phone: string; email: string; address: string; city: string; status: 'active' | 'inactive' } = { name: '', so: '', cnic: '', phone: '', email: '', address: '', city: '', status: 'active' };

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isVisible } = useFieldVisibility('Customer');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState('');
  const [whatsappCustomer, setWhatsappCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = customers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          (c.cnic || '').toLowerCase().includes(q) ||
          (c.so || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((c) => c.status === statusFilter);
    }
    return list;
  }, [customers, search, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openAdd = () => {
    setForm(emptyForm);
    setPictureFile(null);
    setPicturePreview('');
    setShowAddModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, so: c.so || '', cnic: c.cnic || '', phone: c.phone, email: c.email, address: c.address, city: c.city, status: c.status });
    setPictureFile(null);
    setPicturePreview(c.picture ? `${MEDIA_BASE_URL}${c.picture}` : '');
    setShowEditModal(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const openView = (c: Customer) => {
    setViewCustomer(c);
    setShowViewModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let created = await createCustomer(form as Omit<Customer, 'id'>);
      if (pictureFile) {
        created = await uploadCustomerPicture(created.id, pictureFile);
      }
      setCustomers((prev) => [created, ...prev]);
      setShowAddModal(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let updated = await updateCustomer(editId, form);
      if (pictureFile) {
        updated = await uploadCustomerPicture(editId, pictureFile);
      }
      setCustomers((prev) => prev.map((c) => (c.id === editId ? updated : c)));
      setShowEditModal(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteCustomer(deleteId);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
      setShowDeleteModal(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    try {
      for (const id of selectedIds) {
        await deleteCustomer(id);
      }
      setCustomers((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPictureFile(file);
    setPicturePreview(file ? URL.createObjectURL(file) : '');
  };

  const avatarEl = (c: Customer, size = 36) =>
    c.picture ? (
      <img src={`${MEDIA_BASE_URL}${c.picture}`} alt={c.name} className="rounded-circle border" style={{ width: size, height: size, objectFit: 'cover' }} />
    ) : (
      <span
        className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-transparent text-primary fw-bold"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {c.name.charAt(0).toUpperCase()}
      </span>
    );

  const formFields = (
    <div className="row">
      {isVisible('name') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">Full Name<span className="text-danger ms-1">*</span></label>
        <input type="text" className="form-control" placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      )}
      {isVisible('so') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">S/O (Father's Name)</label>
        <input type="text" className="form-control" placeholder="Son/Daughter of" value={form.so} onChange={(e) => setForm({ ...form, so: e.target.value })} />
      </div>
      )}
      {isVisible('cnic') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">CNIC</label>
        <input type="text" className="form-control" placeholder="CNIC number" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
      </div>
      )}
      {isVisible('phone') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">Phone</label>
        <input type="text" className="form-control" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      )}
      {isVisible('email') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">Email</label>
        <input type="email" className="form-control" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      )}
      {isVisible('city') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">City</label>
        <input type="text" className="form-control" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      )}
      {isVisible('status') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">Status</label>
        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      )}
      {isVisible('picture') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">Photo</label>
        <div className="d-flex align-items-center gap-3">
          <input type="file" className="form-control" accept="image/*" onChange={handlePictureChange} />
          {picturePreview && <img src={picturePreview} alt="Preview" className="rounded-circle border" style={{ width: 40, height: 40, objectFit: 'cover' }} />}
        </div>
      </div>
      )}
      {isVisible('address') && (
      <div className="col-lg-12 mb-0">
        <label className="form-label">Address</label>
        <textarea className="form-control" rows={2} placeholder="Full address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      )}
    </div>
  );

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Customers</h4>
            <h6>Manage your customer list</h6>
          </div>
        </div>
        <div className="page-btn d-flex gap-2">
          {selectedIds.size > 0 && (
            <button className="btn btn-outline-danger" onClick={handleBulkDelete} disabled={saving}>
              <i className="ti ti-trash me-1"></i>Delete ({selectedIds.size})
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="ti ti-circle-plus me-1"></i>Add Customer
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn btn-searchset"><i className="ti ti-search fs-14"></i></span>
              <input type="text" className="form-control" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <select className="form-select form-select-sm" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="badge bg-primary fs-12">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-5 text-muted">{search || statusFilter ? 'No customers match your filters.' : 'No customers yet. Add your first customer!'}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: 40 }}>
                      <label className="checkboxs"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /><span className="checkmarks"></span></label>
                    </th>
                    <th>Customer</th>
                    <th>CNIC</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Misc Balance</th>
                    <th>Status</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} /><span className="checkmarks"></span></label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => openView(c)}>
                          {avatarEl(c)}
                          <span className="fw-medium">{c.name}</span>
                        </div>
                      </td>
                      <td>{c.cnic || '-'}</td>
                      <td>{c.phone || '-'}</td>
                      <td>{c.city || '-'}</td>
                      <td>
                        <span className={`fw-medium ${(c.miscBalance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          ${(c.miscBalance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge fw-medium fs-10 ${c.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button className="btn btn-icon btn-sm" title="View" onClick={() => openView(c)}><i className="ti ti-eye text-primary"></i></button>
                          <button className="btn btn-icon btn-sm" title="Edit" onClick={() => openEdit(c)}><i className="ti ti-edit text-info"></i></button>
                          <button className="btn btn-icon btn-sm" title="WhatsApp" onClick={() => setWhatsappCustomer(c)}><i className="ti ti-brand-whatsapp text-success"></i></button>
                          <button className="btn btn-icon btn-sm" title="Delete" onClick={() => openDelete(c.id)}><i className="ti ti-trash text-danger"></i></button>
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ti ti-user-plus me-2"></i>Add Customer</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">{formFields}</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={!form.name.trim() || saving} onClick={handleSave}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="ti ti-check me-1"></i>Add Customer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ti ti-edit me-2"></i>Edit Customer</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">{formFields}</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={!form.name.trim() || saving} onClick={handleUpdate}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Updating...</> : <><i className="ti ti-check me-1"></i>Update Customer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-5">
                <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2"><i className="ti ti-trash fs-24 text-danger"></i></span>
                <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Customer?</h4>
                <p className="text-muted mb-0">This action cannot be undone.</p>
                <div className="mt-3 d-flex justify-content-center gap-2">
                  <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-danger" disabled={saving} onClick={handleDelete}>
                    {saving ? <span className="spinner-border spinner-border-sm"></span> : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {showViewModal && viewCustomer && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ti ti-user me-2"></i>Customer Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
              </div>
              <div className="modal-body text-center">
                <div className="mb-3">{avatarEl(viewCustomer, 80)}</div>
                <h5 className="fw-bold mb-1">{viewCustomer.name}</h5>
                <span className={`badge fw-medium fs-10 mb-3 ${viewCustomer.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                  {viewCustomer.status.charAt(0).toUpperCase() + viewCustomer.status.slice(1)}
                </span>
                <div className="text-start mt-3">
                  <table className="table table-borderless table-sm mb-0">
                    <tbody>
                      {viewCustomer.so && <tr><td className="text-muted"><i className="ti ti-user me-2"></i>S/O</td><td className="text-end fw-medium">{viewCustomer.so}</td></tr>}
                      {viewCustomer.cnic && <tr><td className="text-muted"><i className="ti ti-id me-2"></i>CNIC</td><td className="text-end fw-medium">{viewCustomer.cnic}</td></tr>}
                      <tr>
                        <td className="text-muted"><i className="ti ti-wallet me-2"></i>Misc Balance</td>
                        <td className="text-end fw-medium">
                          <span className={`${(viewCustomer.miscBalance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                            ${(viewCustomer.miscBalance || 0).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                      {viewCustomer.phone && <tr><td className="text-muted"><i className="ti ti-phone me-2"></i>Phone</td><td className="text-end fw-medium">{viewCustomer.phone}</td></tr>}
                      {viewCustomer.email && <tr><td className="text-muted"><i className="ti ti-mail me-2"></i>Email</td><td className="text-end fw-medium">{viewCustomer.email}</td></tr>}
                      {viewCustomer.city && <tr><td className="text-muted"><i className="ti ti-building me-2"></i>City</td><td className="text-end fw-medium">{viewCustomer.city}</td></tr>}
                      {viewCustomer.address && <tr><td className="text-muted"><i className="ti ti-map-pin me-2"></i>Address</td><td className="text-end fw-medium">{viewCustomer.address}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => { setShowViewModal(false); setWhatsappCustomer(viewCustomer); }}>
                  <i className="ti ti-brand-whatsapp me-1"></i>WhatsApp
                </button>
                <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={() => { setShowViewModal(false); openEdit(viewCustomer); }}>
                  <i className="ti ti-edit me-1"></i>Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        show={!!whatsappCustomer}
        onClose={() => setWhatsappCustomer(null)}
        phoneNumber={whatsappCustomer?.phone || ''}
        recipientName={whatsappCustomer?.name || ''}
        defaultMessage={whatsappCustomer ? `Hello ${whatsappCustomer.name},\n\nThis is a message from Asyentyx.\n\nRegards` : ''}
        title="Message Customer"
      />
    </>
  );
};

export default Customers;
