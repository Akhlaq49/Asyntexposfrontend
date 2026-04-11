import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';
import {
  getRawMaterials,
  deleteProduct,
  getCategories,
  getBrands,
  getUnits,
  getStores,
  getWarehouses,
  type ProductResponse,
  type DropdownOption,
} from '../../services/productService';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';
import Swal from 'sweetalert2';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

interface SupplierOption {
  id: number;
  fullName: string;
}

const RawMaterials: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── list state ─── */
  const [materials, setMaterials] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  /* ─── dropdown options ─── */
  const [categories, setCategoriesOpts] = useState<DropdownOption[]>([]);
  const [brands, setBrands] = useState<DropdownOption[]>([]);
  const [units, setUnits] = useState<DropdownOption[]>([]);
  const [stores, setStores] = useState<DropdownOption[]>([]);
  const [warehouses, setWarehouses] = useState<DropdownOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  /* ─── form state ─── */
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emptyForm = {
    productName: '',
    sku: '',
    category: '',
    brand: '',
    unit: '',
    store: '',
    warehouse: '',
    description: '',
    quantity: '',
    price: '',
    quantityAlert: '',
    supplierId: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  /* ─── purchase form state ─── */
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseMaterialId, setPurchaseMaterialId] = useState<string | null>(null);
  const [purchaseMaterialName, setPurchaseMaterialName] = useState('');
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    quantity: '',
    purchasePrice: '',
    reference: '',
    date: new Date().toISOString().slice(0, 10),
  });

  /* ─── delete modal ─── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ─── data loading ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mats, cats, brs, uns, sts, whs, supRes] = await Promise.all([
        getRawMaterials(),
        getCategories(),
        getBrands(),
        getUnits(),
        getStores(),
        getWarehouses(),
        api.get<SupplierOption[]>('/parties?role=Supplier').catch(() => ({ data: [] })),
      ]);
      setMaterials(mats);
      setCategoriesOpts(cats);
      setBrands(brs);
      setUnits(uns);
      setStores(sts);
      setWarehouses(whs);
      setSuppliers(supRes.data || []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace();
  });

  /* ─── handlers ─── */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const generateSKU = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let sku = 'RM';
    for (let i = 0; i < 6; i++) sku += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm(prev => ({ ...prev, sku }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setImageFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const openEdit = (m: ProductResponse) => {
    setEditingId(m.id);
    setForm({
      productName: m.productName,
      sku: m.sku,
      category: m.category,
      brand: m.brand,
      unit: m.unit,
      store: m.store,
      warehouse: m.warehouse,
      description: m.description,
      quantity: String(m.quantity),
      price: String(m.price),
      quantityAlert: String(m.quantityAlert),
      supplierId: m.supplierId ? String(m.supplierId) : '',
    });
    setImageFiles([]);
    setImagePreviews(m.images?.map(img => mediaUrl(img)) || []);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFiles([]);
    setImagePreviews([]);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim()) {
      Swal.fire('Error', 'Product name is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productName', form.productName);
      formData.append('sku', form.sku || '');
      formData.append('category', form.category);
      formData.append('brand', form.brand);
      formData.append('unit', form.unit);
      formData.append('store', form.store);
      formData.append('warehouse', form.warehouse);
      formData.append('description', form.description);
      formData.append('quantity', String(Number(form.quantity) || 0));
      formData.append('price', String(Number(form.price) || 0));
      formData.append('quantityAlert', String(Number(form.quantityAlert) || 0));
      formData.append('isRawMaterial', 'true');
      if (form.supplierId) {
        formData.append('supplierId', form.supplierId);
        const sup = suppliers.find(s => s.id === Number(form.supplierId));
        if (sup) formData.append('supplierName', sup.fullName);
      }
      formData.append('productType', 'single');
      formData.append('slug', form.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

      if (imageFiles.length > 0) {
        imageFiles.forEach(file => formData.append('images', file));
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Swal.fire('Success', 'Raw material updated', 'success');
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Swal.fire('Success', 'Raw material added', 'success');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Failed to save raw material', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (id: string) => { setDeleteId(id); setShowDeleteModal(true); };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId);
      setMaterials(prev => prev.filter(m => m.id !== deleteId));
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Cannot delete', 'error');
    }
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  /* ─── purchase from supplier ─── */
  const openPurchaseForm = (m: ProductResponse) => {
    setPurchaseMaterialId(m.id);
    setPurchaseMaterialName(m.productName);
    setPurchaseForm({
      supplierId: '',
      quantity: '',
      purchasePrice: String(m.price),
      reference: `PO-RM-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
    });
    setShowPurchaseForm(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseMaterialId) return;
    const qty = Number(purchaseForm.quantity) || 0;
    const price = Number(purchaseForm.purchasePrice) || 0;
    if (qty <= 0) {
      Swal.fire('Error', 'Quantity must be greater than 0', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const supplier = suppliers.find(s => s.id === Number(purchaseForm.supplierId));
      await api.post('/purchases', {
        supplierId: supplier?.id || null,
        supplierName: supplier?.fullName || 'Unknown',
        supplierRef: '',
        reference: purchaseForm.reference,
        date: purchaseForm.date,
        status: 'Received',
        orderTax: 0,
        discount: 0,
        shipping: 0,
        total: qty * price,
        paid: qty * price,
        due: 0,
        paymentStatus: 'Paid',
        notes: `Raw material purchase: ${purchaseMaterialName}`,
        items: [
          {
            productId: Number(purchaseMaterialId),
            productName: purchaseMaterialName,
            quantity: qty,
            purchasePrice: price,
            discount: 0,
            taxPercentage: 0,
            taxAmount: 0,
            unitCost: price,
            totalCost: qty * price,
          },
        ],
      });

      Swal.fire('Success', `Purchased ${qty} units of ${purchaseMaterialName}`, 'success');
      setShowPurchaseForm(false);
      loadData();
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.error || 'Purchase failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── filter & paginate ─── */
  const filtered = useMemo(() =>
    materials.filter(m => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || m.productName.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q);
      const matchCategory = !categoryFilter || m.category === categoryFilter;
      return matchSearch && matchCategory;
    }),
  [materials, searchTerm, categoryFilter]);

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Raw Materials</h4>
            <h6>Manage raw materials for manufacturing</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li>
            <a href="#" data-bs-toggle="tooltip" title="Refresh" onClick={(e) => { e.preventDefault(); loadData(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
        </ul>
        <div className="page-btn">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Raw Material
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">{editingId ? 'Edit' : 'Add'} Raw Material</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
              <i className="ti ti-x"></i>
            </button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Material Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" name="productName" value={form.productName} onChange={handleChange} required />
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">SKU</label>
                  <div className="input-group">
                    <input type="text" className="form-control" name="sku" value={form.sku} onChange={handleChange} />
                    <button type="button" className="btn btn-outline-primary" onClick={generateSKU}>Generate</button>
                  </div>
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Category</label>
                  <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Brand</label>
                  <select className="form-select" name="brand" value={form.brand} onChange={handleChange}>
                    <option value="">Select Brand</option>
                    {brands.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Unit</label>
                  <select className="form-select" name="unit" value={form.unit} onChange={handleChange}>
                    <option value="">Select Unit</option>
                    {units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Store</label>
                  <select className="form-select" name="store" value={form.store} onChange={handleChange}>
                    <option value="">Select Store</option>
                    {stores.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Warehouse</label>
                  <select className="form-select" name="warehouse" value={form.warehouse} onChange={handleChange}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Cost Price</label>
                  <input type="number" className="form-control" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" />
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Quantity</label>
                  <input type="number" className="form-control" name="quantity" value={form.quantity} onChange={handleChange} min="0" />
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Quantity Alert</label>
                  <input type="number" className="form-control" name="quantityAlert" value={form.quantityAlert} onChange={handleChange} min="0" />
                </div>
                <div className="col-lg-4 col-md-6 mb-3">
                  <label className="form-label">Supplier</label>
                  <select className="form-select" name="supplierId" value={form.supplierId} onChange={handleChange}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                </div>
                <div className="col-lg-8 col-md-6 mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" name="description" rows={2} value={form.description} onChange={handleChange}></textarea>
                </div>
                <div className="col-lg-12 mb-3">
                  <label className="form-label">Images</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {imagePreviews.map((preview, i) => (
                      <div key={i} className="position-relative" style={{ width: 80, height: 80 }}>
                        <img src={preview} alt="" className="w-100 h-100 object-fit-cover rounded" />
                        <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 p-0" style={{ width: 20, height: 20, fontSize: 10 }} onClick={() => removeImage(i)}>×</button>
                      </div>
                    ))}
                  </div>
                  <input ref={fileInputRef} type="file" className="form-control" accept="image/*" multiple onChange={handleImageUpload} />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Update Material' : 'Add Material'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase From Supplier Modal */}
      {showPurchaseForm && (
        <div className="card mb-4 border-primary">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="ti ti-shopping-cart me-2"></i>Purchase: {purchaseMaterialName}</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowPurchaseForm(false)}>
              <i className="ti ti-x"></i>
            </button>
          </div>
          <div className="card-body">
            <form onSubmit={handlePurchaseSubmit}>
              <div className="row">
                <div className="col-lg-3 col-md-6 mb-3">
                  <label className="form-label">Supplier <span className="text-danger">*</span></label>
                  <select className="form-select" value={purchaseForm.supplierId}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, supplierId: e.target.value }))} required>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                </div>
                <div className="col-lg-2 col-md-6 mb-3">
                  <label className="form-label">Quantity <span className="text-danger">*</span></label>
                  <input type="number" className="form-control" value={purchaseForm.quantity} min="1"
                    onChange={e => setPurchaseForm(prev => ({ ...prev, quantity: e.target.value }))} required />
                </div>
                <div className="col-lg-2 col-md-6 mb-3">
                  <label className="form-label">Price per Unit</label>
                  <input type="number" className="form-control" value={purchaseForm.purchasePrice} min="0" step="0.01"
                    onChange={e => setPurchaseForm(prev => ({ ...prev, purchasePrice: e.target.value }))} />
                </div>
                <div className="col-lg-2 col-md-6 mb-3">
                  <label className="form-label">Reference</label>
                  <input type="text" className="form-control" value={purchaseForm.reference}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, reference: e.target.value }))} />
                </div>
                <div className="col-lg-2 col-md-6 mb-3">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" value={purchaseForm.date}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div className="col-lg-1 col-md-6 mb-3 d-flex align-items-end">
                  <button type="submit" className="btn btn-success w-100" disabled={submitting}>
                    {submitting ? '...' : 'Buy'}
                  </button>
                </div>
              </div>
              {purchaseForm.quantity && purchaseForm.purchasePrice && (
                <div className="alert alert-info py-2 mb-0">
                  Total: {fmt(Number(purchaseForm.quantity) * Number(purchaseForm.purchasePrice))}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14"></i></span>
              <input type="text" className="form-control" placeholder="Search raw materials..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={e => e.preventDefault()}>
                {categoryFilter || 'Category'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setCategoryFilter(''); }}>All</a></li>
                {categories.map(c => (
                  <li key={c.value}><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setCategoryFilter(c.value); }}>{c.label}</a></li>
                ))}
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
                    <th>SKU</th>
                    <th>Material Name</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Unit</th>
                    <th>Cost Price</th>
                    <th>Stock Qty</th>
                    <th>Store</th>
                    <th>Warehouse</th>
                    <th>Supplier</th>
                    <th className="no-sort">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-4 text-muted">No raw materials found. Add your first raw material!</td></tr>
                  ) : (
                    paginatedData.map(m => (
                      <tr key={m.id}>
                        <td>{m.sku}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            {m.images && m.images.length > 0 && (
                              <a href="#" className="avatar avatar-md me-2" onClick={e => e.preventDefault()}>
                                <img src={mediaUrl(m.images[0])} alt={m.productName} />
                              </a>
                            )}
                            {m.productName}
                          </div>
                        </td>
                        <td>{m.category}</td>
                        <td>{m.brand}</td>
                        <td>{m.unit}</td>
                        <td>{fmt(m.price)}</td>
                        <td>
                          <span className={`badge ${m.quantity <= m.quantityAlert && m.quantityAlert > 0 ? 'badge-danger' : 'badge-success'}`}>
                            {m.quantity}
                          </span>
                        </td>
                        <td>{m.store}</td>
                        <td>{m.warehouse}</td>
                        <td>{m.supplierName || <span className="text-muted">—</span>}</td>
                        <td className="action-table-data">
                          <div className="edit-delete-action d-flex align-items-center gap-1">
                            {/* <button className="btn btn-icon btn-sm" title="Purchase from Supplier" onClick={() => openPurchaseForm(m)}>
                              <i className="ti ti-shopping-cart text-success"></i>
                            </button> */}
                            <button className="btn btn-icon btn-sm" title="Edit" onClick={() => openEdit(m)}>
                              <i className="ti ti-edit text-blue"></i>
                            </button>
                            <button className="btn btn-icon btn-sm" title="Delete" onClick={() => openDeleteModal(m.id)}>
                              <i className="ti ti-trash text-danger"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={handleDelete} />
    </>
  );
};

export default RawMaterials;
