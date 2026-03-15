import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MEDIA_BASE_URL } from '../../services/api';
import {
  Customer,
  CustomerGuarantor,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadCustomerPicture,
  getCustomerGuarantors,
} from '../../services/customerService';
import { useFieldVisibility } from '../../utils/useFieldVisibility';
import WhatsAppSendModal from '../../components/WhatsAppSendModal';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

const emptyForm: { name: string; so: string; cnic: string; phone: string; email: string; address: string; city: string; status: 'active' | 'inactive' } = { name: '', so: '', cnic: '', phone: '', email: '', address: '', city: '', status: 'active' };

const Customers: React.FC = () => {
  const { t } = useTranslation();
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

  // Guarantor modal state
  const [showGuarantorModal, setShowGuarantorModal] = useState(false);
  const [guarantorCustomer, setGuarantorCustomer] = useState<Customer | null>(null);
  const [guarantors, setGuarantors] = useState<CustomerGuarantor[]>([]);
  const [guarantorsLoading, setGuarantorsLoading] = useState(false);

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

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

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
    await deleteCustomer(deleteId);
    setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
    setShowDeleteModal(false);
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

  const openGuarantors = async (c: Customer) => {
    setGuarantorCustomer(c);
    setShowGuarantorModal(true);
    setGuarantorsLoading(true);
    try {
      const data = await getCustomerGuarantors(c.id);
      setGuarantors(data);
    } catch {
      setGuarantors([]);
    } finally {
      setGuarantorsLoading(false);
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
        <label className="form-label">{t('customers.full_name_label')}<span className="text-danger ms-1">*</span></label>
        <input type="text" className="form-control" placeholder={t('customers.customer_name_placeholder')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      )}
      {isVisible('so') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">{t('customers.so_father')}</label>
        <input type="text" className="form-control" placeholder={t('customers.so_placeholder')} value={form.so} onChange={(e) => setForm({ ...form, so: e.target.value })} />
      </div>
      )}
      {isVisible('cnic') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">{t('customers.cnic')}</label>
        <input type="text" className="form-control" placeholder={t('customers.cnic_placeholder')} value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
      </div>
      )}
      {isVisible('phone') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">{t('customers.phone')}</label>
        <input type="text" className="form-control" placeholder={t('customers.phone_placeholder')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      )}
      {isVisible('email') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">{t('customers.email')}</label>
        <input type="email" className="form-control" placeholder={t('customers.email_placeholder')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      )}
      {isVisible('city') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">{t('customers.city')}</label>
        <input type="text" className="form-control" placeholder={t('customers.city_placeholder')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      )}
      {isVisible('status') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">{t('customers.status')}</label>
        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
        </select>
      </div>
      )}
      {isVisible('picture') && (
      <div className="col-lg-6 mb-3">
        <label className="form-label">{t('common.photo')}</label>
        <div className="d-flex align-items-center gap-3">
          <input type="file" className="form-control" accept="image/*" onChange={handlePictureChange} />
          {picturePreview && <img src={picturePreview} alt="Preview" className="rounded-circle border" style={{ width: 40, height: 40, objectFit: 'cover' }} />}
        </div>
      </div>
      )}
      {isVisible('address') && (
      <div className="col-lg-12 mb-0">
        <label className="form-label">{t('customers.address')}</label>
        <textarea className="form-control" rows={2} placeholder={t('customers.address_placeholder')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
            <h4 className="fw-bold">{t('customers.title')}</h4>
            <h6>{t('customers.subtitle')}</h6>
          </div>
        </div>
        <div className="page-btn d-flex gap-2">
          {selectedIds.size > 0 && (
            <button className="btn btn-outline-danger" onClick={handleBulkDelete} disabled={saving}>
              <i className="ti ti-trash me-1"></i>{t('customers.delete_count', { count: selectedIds.size })}
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="ti ti-circle-plus me-1"></i>{t('customers.add_customer')}
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn btn-searchset"><i className="ti ti-search fs-14"></i></span>
              <input type="text" className="form-control" placeholder={t('customers.search_customers')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <select className="form-select form-select-sm" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t('customers.all_status')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
            <span className="badge bg-primary fs-12">{filtered.length} {t('customers.customer_count')}</span>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-5 text-muted">{search || statusFilter ? t('customers.no_match') : t('customers.no_customers')}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: 40 }}>
                      <label className="checkboxs"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /><span className="checkmarks"></span></label>
                    </th>
                    <th>{t('customers.customer_name')}</th>
                    <th>{t('customers.cnic')}</th>
                    <th>{t('customers.phone')}</th>
                    <th>{t('customers.city')}</th>
                    <th>{t('customers.misc_balance')}</th>
                    <th>{t('customers.status')}</th>
                    <th style={{ width: 160 }}>{t('customers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((c) => (
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
                      <td>{c.phone ? <><a href={`tel:${c.phone}`} title="Call" className="text-primary me-1"><i className="ti ti-phone-call"></i></a>{c.phone}</> : '-'}</td>
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
                          <button className="btn btn-icon btn-sm" title={t('common.view')} onClick={() => openView(c)}><i className="ti ti-eye text-primary"></i></button>
                          <button className="btn btn-icon btn-sm" title={t('customers.guarantors')} onClick={() => openGuarantors(c)}><i className="ti ti-shield-check text-warning"></i></button>
                          <button className="btn btn-icon btn-sm" title={t('common.edit')} onClick={() => openEdit(c)}><i className="ti ti-edit text-info"></i></button>
                          <button className="btn btn-icon btn-sm" title={t('customers.whatsapp')} onClick={() => setWhatsappCustomer(c)}><i className="ti ti-brand-whatsapp text-success"></i></button>
                          <button className="btn btn-icon btn-sm" title={t('common.delete')} onClick={() => openDelete(c.id)}><i className="ti ti-trash text-danger"></i></button>
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
                <h5 className="modal-title"><i className="ti ti-user-plus me-2"></i>{t('customers.add_customer')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">{formFields}</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" disabled={!form.name.trim() || saving} onClick={handleSave}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>{t('common.saving')}</> : <><i className="ti ti-check me-1"></i>{t('customers.add_customer')}</>}
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
                <h5 className="modal-title"><i className="ti ti-edit me-2"></i>{t('customers.edit_customer')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">{formFields}</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" disabled={!form.name.trim() || saving} onClick={handleUpdate}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>{t('common.updating')}</> : <><i className="ti ti-check me-1"></i>{t('customers.update_customer')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(''); }} onConfirm={handleDelete} />

      {/* View Customer Modal */}
      {showViewModal && viewCustomer && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ti ti-user me-2"></i>{t('customers.customer_details')}</h5>
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
                      {viewCustomer.so && <tr><td className="text-muted"><i className="ti ti-user me-2"></i>{t('customers.so_label')}</td><td className="text-end fw-medium">{viewCustomer.so}</td></tr>}
                      {viewCustomer.cnic && <tr><td className="text-muted"><i className="ti ti-id me-2"></i>{t('customers.cnic')}</td><td className="text-end fw-medium">{viewCustomer.cnic}</td></tr>}
                      <tr>
                        <td className="text-muted"><i className="ti ti-wallet me-2"></i>{t('customers.misc_balance')}</td>
                        <td className="text-end fw-medium">
                          <span className={`${(viewCustomer.miscBalance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                            ${(viewCustomer.miscBalance || 0).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                      {viewCustomer.phone && <tr><td className="text-muted"><i className="ti ti-phone me-2"></i>{t('customers.phone')}</td><td className="text-end fw-medium"><a href={`tel:${viewCustomer.phone}`} title="Call" className="text-primary me-1"><i className="ti ti-phone-call"></i></a>{viewCustomer.phone}</td></tr>}
                      {viewCustomer.email && <tr><td className="text-muted"><i className="ti ti-mail me-2"></i>{t('customers.email')}</td><td className="text-end fw-medium">{viewCustomer.email}</td></tr>}
                      {viewCustomer.city && <tr><td className="text-muted"><i className="ti ti-building me-2"></i>{t('customers.city')}</td><td className="text-end fw-medium">{viewCustomer.city}</td></tr>}
                      {viewCustomer.address && <tr><td className="text-muted"><i className="ti ti-map-pin me-2"></i>{t('customers.address')}</td><td className="text-end fw-medium">{viewCustomer.address}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-warning" onClick={() => { setShowViewModal(false); openGuarantors(viewCustomer); }}>
                  <i className="ti ti-shield-check me-1"></i>{t('customers.guarantors')}
                </button>
                <button className="btn btn-success" onClick={() => { setShowViewModal(false); setWhatsappCustomer(viewCustomer); }}>
                  <i className="ti ti-brand-whatsapp me-1"></i>{t('customers.whatsapp')}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>{t('common.close')}</button>
                <button className="btn btn-primary" onClick={() => { setShowViewModal(false); openEdit(viewCustomer); }}>
                  <i className="ti ti-edit me-1"></i>{t('common.edit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guarantors Modal */}
      {showGuarantorModal && guarantorCustomer && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="ti ti-shield-check me-2"></i>
                  {t('customers.guarantors_for', { name: guarantorCustomer.name })}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowGuarantorModal(false)}></button>
              </div>
              <div className="modal-body">
                {guarantorsLoading ? (
                  <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>
                ) : guarantors.length === 0 ? (
                  <div className="text-center p-5">
                    <span className="rounded-circle d-inline-flex p-3 bg-warning-transparent mb-3">
                      <i className="ti ti-shield-off fs-24 text-warning"></i>
                    </span>
                    <h6 className="text-muted">{t('customers.no_guarantors')}</h6>
                  </div>
                ) : (
                  <div className="row g-3">
                    {guarantors.map((g) => (
                      <div key={`${g.planId}-${g.id}`} className="col-md-6">
                        <div className="card border mb-0 h-100">
                          <div className="card-body p-3">
                            <div className="d-flex align-items-start gap-3 mb-3">
                              {g.picture ? (
                                <img src={`${MEDIA_BASE_URL}${g.picture}`} alt={g.name} className="rounded-circle border" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                              ) : (
                                <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-warning-transparent text-warning fw-bold" style={{ width: 48, height: 48, fontSize: 18 }}>
                                  {g.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <div className="flex-fill">
                                <h6 className="fw-bold mb-1">{g.name}</h6>
                                {g.relationship && (
                                  <span className="badge bg-primary-transparent text-primary fs-10">{g.relationship}</span>
                                )}
                              </div>
                            </div>
                            <table className="table table-borderless table-sm mb-2">
                              <tbody>
                                {g.so && (
                                  <tr>
                                    <td className="text-muted ps-0" style={{ width: '40%' }}><i className="ti ti-user me-1"></i>{t('customers.so_label')}</td>
                                    <td className="fw-medium pe-0">{g.so}</td>
                                  </tr>
                                )}
                                {g.phone && (
                                  <tr>
                                    <td className="text-muted ps-0"><i className="ti ti-phone me-1"></i>{t('customers.phone')}</td>
                                    <td className="fw-medium pe-0"><a href={`tel:${g.phone}`} title="Call" className="text-primary me-1"><i className="ti ti-phone-call"></i></a>{g.phone}</td>
                                  </tr>
                                )}
                                {g.cnic && (
                                  <tr>
                                    <td className="text-muted ps-0"><i className="ti ti-id me-1"></i>{t('customers.cnic')}</td>
                                    <td className="fw-medium pe-0">{g.cnic}</td>
                                  </tr>
                                )}
                                {g.address && (
                                  <tr>
                                    <td className="text-muted ps-0"><i className="ti ti-map-pin me-1"></i>{t('customers.address')}</td>
                                    <td className="fw-medium pe-0">{g.address}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                            <div className="border-top pt-2 mt-1">
                              <small className="text-muted">
                                <i className="ti ti-box me-1"></i>{t('customers.plan')}: <span className="fw-medium">{g.productName}</span>
                                <span className={`badge ms-2 fs-10 ${g.planStatus === 'active' ? 'bg-success' : g.planStatus === 'completed' ? 'bg-info' : g.planStatus === 'defaulted' ? 'bg-danger' : 'bg-secondary'}`}>
                                  {g.planStatus.charAt(0).toUpperCase() + g.planStatus.slice(1)}
                                </span>
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <span className="me-auto text-muted fs-13">
                  <i className="ti ti-info-circle me-1"></i>
                  {t('customers.total_guarantors', { count: guarantors.length })}
                </span>
                <button className="btn btn-secondary" onClick={() => setShowGuarantorModal(false)}>{t('common.close')}</button>
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
        title={t('customers.message_customer')}
      />
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default Customers;
