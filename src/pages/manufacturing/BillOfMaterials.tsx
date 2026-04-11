import { useState, useEffect, useRef } from 'react';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import { showSuccess, showError } from '../../utils/alertUtils';
import { mediaUrl } from '../../services/api';
import api from '../../services/api';
import { getRawMaterials, getCategories, getSubCategories } from '../../services/productService';
import {
  getBoms, createBom, updateBom, deleteBom,
  type Bom, type BomItem, type CreateBomPayload
} from '../../services/manufacturingService';

interface ProductResult { id: number; productName: string; sku?: string; price: number; images?: { imagePath: string }[]; }
interface DropdownOption { value: string; label: string; }
interface SupplierOption { id: number; fullName: string; phone?: string; }

const BillOfMaterials = () => {
  const [boms, setBoms] = useState<Bom[]>([]);
  const [filtered, setFiltered] = useState<Bom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: '', finishedProductName: '', finishedProductCategory: '', finishedProductSubCategory: '', salePrice: 0, outputQuantity: 1, laborCost: 0, overheadCost: 0, notes: '', status: 'active'
  });
  const [lineItems, setLineItems] = useState<BomItem[]>([]);
  const [newItem, setNewItem] = useState({ rawMaterialId: 0, rawMaterialName: '', quantity: 1, unitCost: 0 });

  // Dropdown data
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [subCategories, setSubCategories] = useState<DropdownOption[]>([]);
  const [rawProducts, setRawProducts] = useState<ProductResult[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [rawSearch, setRawSearch] = useState('');
  const [showRawDropdown, setShowRawDropdown] = useState(false);
  const rawRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [boms, search, statusFilter]);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rawRef.current && !rawRef.current.contains(e.target as Node)) setShowRawDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [bomData, rawData, catData, subCatData, supplierResp] = await Promise.all([
      getBoms(), getRawMaterials(), getCategories(), getSubCategories(),
      api.get('/parties?role=Supplier').catch(() => ({ data: [] }))
    ]);
    setBoms(bomData);
    setRawProducts(rawData as any);
    setCategories(catData);
    setSubCategories(subCatData);
    setSuppliers(supplierResp.data || []);
    setLoading(false);
  };

  const applyFilters = () => {
    let result = [...boms];
    if (search) result = result.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.finishedProductName.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) result = result.filter(b => b.status === statusFilter);
    setFiltered(result);
  };

  const resetForm = () => {
    setFormData({ name: '', finishedProductName: '', finishedProductCategory: '', finishedProductSubCategory: '', salePrice: 0, outputQuantity: 1, laborCost: 0, overheadCost: 0, notes: '', status: 'active' });
    setLineItems([]);
    setNewItem({ rawMaterialId: 0, rawMaterialName: '', quantity: 1, unitCost: 0 });
    setRawSearch('');
  };

  const openAdd = () => { resetForm(); setShowAdd(true); };
  const openEdit = (bom: Bom) => {
    setEditId(bom.id);
    setFormData({ name: bom.name, finishedProductName: bom.finishedProductName || '', finishedProductCategory: bom.finishedProductCategory || '', finishedProductSubCategory: bom.finishedProductSubCategory || '', salePrice: bom.salePrice || 0, outputQuantity: bom.outputQuantity, laborCost: bom.laborCost, overheadCost: bom.overheadCost, notes: bom.notes || '', status: bom.status });
    setLineItems(bom.items);
    setShowEdit(true);
  };

  const handleAddItem = () => {
    if (!newItem.rawMaterialId) return;
    setLineItems([...lineItems, { ...newItem, totalCost: newItem.quantity * newItem.unitCost }]);
    setNewItem({ rawMaterialId: 0, rawMaterialName: '', quantity: 1, unitCost: 0 });
    setRawSearch('');
  };

  const removeItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const materialTotal = lineItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const grandTotal = materialTotal + formData.laborCost + formData.overheadCost;

  const handleSave = async (isEdit: boolean) => {
    if (!formData.name) { showError('Please enter a BOM name'); return; }
    if (!formData.finishedProductName) { showError('Please enter the finished product name'); return; }
    if (lineItems.length === 0) { showError('Add at least one raw material'); return; }

    const payload: CreateBomPayload = {
      ...formData,
      items: lineItems.map(i => ({ rawMaterialId: i.rawMaterialId, quantity: i.quantity, unitCost: i.unitCost, supplierId: i.supplierId }))
    };

    const result = isEdit ? await updateBom(editId!, payload) : await createBom(payload);
    if (result) {
      showSuccess(isEdit ? 'BOM updated successfully' : 'BOM created successfully');
      setShowAdd(false); setShowEdit(false);
      loadData();
    } else {
      showError('Failed to save BOM');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const ok = await deleteBom(deleteId);
      if (ok) { showSuccess('BOM deleted'); loadData(); }
    } catch (err: any) {
      showError(err?.message || 'Failed to delete BOM');
    }
    setShowDelete(false); setDeleteId(null);
  };

  const filteredRawProducts = rawProducts.filter(p => p.productName.toLowerCase().includes(rawSearch.toLowerCase()));

  const renderModal = (isEdit: boolean) => (
    <div className={`modal fade ${(isEdit ? showEdit : showAdd) ? 'show d-block' : ''}`} style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isEdit ? 'Edit' : 'Add'} Bill of Materials</h5>
            <button className="btn-close" onClick={() => isEdit ? setShowEdit(false) : setShowAdd(false)} />
          </div>
          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-md-4">
                <label className="form-label">BOM Name *</label>
                <input className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Laptop Assembly" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Finished Product Name *</label>
                <input className="form-control" value={formData.finishedProductName} onChange={e => setFormData({ ...formData, finishedProductName: e.target.value })} placeholder="e.g. Assembled Laptop" />
              </div>
              <div className="col-md-2">
                <label className="form-label">Output Qty</label>
                <input type="number" className="form-control" value={formData.outputQuantity} onChange={e => setFormData({ ...formData, outputQuantity: +e.target.value })} min={1} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-3">
                <label className="form-label">Category</label>
                <select className="form-select" value={formData.finishedProductCategory} onChange={e => setFormData({ ...formData, finishedProductCategory: e.target.value })}>
                  <option value="">-- Select Category --</option>
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Sub Category</label>
                <select className="form-select" value={formData.finishedProductSubCategory} onChange={e => setFormData({ ...formData, finishedProductSubCategory: e.target.value })}>
                  <option value="">-- Select Sub Category --</option>
                  {subCategories.map(sc => <option key={sc.value} value={sc.value}>{sc.label}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Sale Price</label>
                <input type="number" className="form-control" value={formData.salePrice} onChange={e => setFormData({ ...formData, salePrice: +e.target.value })} min={0} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Notes</label>
                <input className="form-control" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-4">
                <label className="form-label">Labor Cost</label>
                <input type="number" className="form-control" value={formData.laborCost} onChange={e => setFormData({ ...formData, laborCost: +e.target.value })} min={0} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Overhead Cost</label>
                <input type="number" className="form-control" value={formData.overheadCost} onChange={e => setFormData({ ...formData, overheadCost: +e.target.value })} min={0} />
              </div>
            </div>

            <hr />
            <h6 className="mb-3">Raw Materials</h6>
            <div className="row mb-3 align-items-end">
              <div className="col-md-4" ref={rawRef}>
                <label className="form-label">Raw Material</label>
                <input className="form-control" value={rawSearch} onChange={e => { setRawSearch(e.target.value); setShowRawDropdown(true); }} onFocus={() => setShowRawDropdown(true)} placeholder="Search raw material..." />
                {showRawDropdown && rawSearch && (
                  <div className="position-absolute bg-white border rounded shadow-sm" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto', width: '100%' }}>
                    {filteredRawProducts.slice(0, 10).map(p => (
                      <div key={p.id} className="p-2 border-bottom" style={{ cursor: 'pointer' }}
                        onMouseDown={() => { setNewItem({ ...newItem, rawMaterialId: p.id, rawMaterialName: p.productName, unitCost: p.price }); setRawSearch(p.productName); setShowRawDropdown(false); }}>
                        <small>{p.productName} {p.sku ? `(${p.sku})` : ''} - Rs.{p.price}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-md-2">
                <label className="form-label">Quantity</label>
                <input type="number" className="form-control" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: +e.target.value })} min={1} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Unit Cost</label>
                <input type="number" className="form-control" value={newItem.unitCost} onChange={e => setNewItem({ ...newItem, unitCost: +e.target.value })} min={0} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Total</label>
                <input className="form-control" readOnly value={(newItem.quantity * newItem.unitCost).toFixed(2)} />
              </div>
              <div className="col-md-2">
                <button className="btn btn-primary w-100" onClick={handleAddItem} disabled={!newItem.rawMaterialId}><i className="ti ti-plus me-1" />Add</button>
              </div>
            </div>

            {lineItems.length > 0 && (
              <div className="table-responsive mb-3">
                <table className="table table-bordered">
                  <thead className="table-light"><tr><th>#</th><th>Raw Material</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Supplier</th><th>Action</th></tr></thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.rawMaterialName} {item.rawMaterialSku ? `(${item.rawMaterialSku})` : ''}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unitCost.toFixed(2)}</td>
                        <td>{(item.quantity * item.unitCost).toFixed(2)}</td>
                        <td>
                          <select className="form-select form-select-sm" value={item.supplierId || ''} onChange={e => {
                            const sid = +e.target.value;
                            const updated = [...lineItems];
                            updated[idx] = { ...item, supplierId: sid || undefined, supplierName: suppliers.find(s => s.id === sid)?.fullName };
                            setLineItems(updated);
                          }}>
                            <option value="">-- Select --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                          </select>
                        </td>
                        <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(idx)}><i className="ti ti-trash" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="row">
              <div className="col-md-8" />
              <div className="col-md-4">
                <table className="table table-sm">
                  <tbody>
                    <tr><td>Material Cost:</td><td className="text-end">{materialTotal.toFixed(2)}</td></tr>
                    <tr><td>Labor Cost:</td><td className="text-end">{formData.laborCost.toFixed(2)}</td></tr>
                    <tr><td>Overhead Cost:</td><td className="text-end">{formData.overheadCost.toFixed(2)}</td></tr>
                    <tr className="fw-bold"><td>Total Cost:</td><td className="text-end">{grandTotal.toFixed(2)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => isEdit ? setShowEdit(false) : setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => handleSave(isEdit)}>{isEdit ? 'Update' : 'Create'} BOM</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="page-wrapper"><div className="content"><div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div></div></div>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4 className="fw-bold">Bill of Materials</h4>
              <h6>Manage product recipes and raw material requirements</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="PDF" onClick={(e) => e.preventDefault()}>
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
          </ul>
          <div className="page-btn">
            <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openAdd(); }}><i className="ti ti-circle-plus me-1" />Add BOM</a>
          </div>
        </div>

        <div className="card table-list-card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="search-set">
              <div className="search-input">
                <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
                <input type="text" className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
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
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light"><tr><th>Name</th><th>Finished Product</th><th>Materials</th><th>Material Cost</th><th>Total Cost</th><th>Status</th><th className="no-sort">Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted">No BOMs found</td></tr>
                  ) : filtered.map(bom => (
                    <tr key={bom.id}>
                      <td><strong>{bom.name}</strong></td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2" onClick={(e) => e.preventDefault()}>
                            <img src={mediaUrl(bom.finishedProductImage)} alt={bom.finishedProductName} />
                          </a>
                          <span>{bom.finishedProductName}</span>
                        </div>
                      </td>
                      <td>{bom.items.length} items</td>
                      <td>{bom.totalMaterialCost.toFixed(2)}</td>
                      <td><strong>{bom.totalCost.toFixed(2)}</strong></td>
                      <td>
                        <span className={`badge fw-medium fs-10 ${bom.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                          {bom.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="action-table-data">
                        <div className="edit-delete-action d-flex align-items-center gap-2">
                          <a href="#" className="btn btn-icon btn-sm" onClick={(e) => { e.preventDefault(); openEdit(bom); }}>
                            <i className="ti ti-edit text-blue"></i>
                          </a>
                          <a href="#" className="btn btn-icon btn-sm" onClick={(e) => { e.preventDefault(); setDeleteId(bom.id); setShowDelete(true); }}>
                            <i className="ti ti-trash text-danger"></i>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAdd && renderModal(false)}
      {showEdit && renderModal(true)}
      <AdminDeleteModal show={showDelete} onClose={() => { setShowDelete(false); setDeleteId(null); }} onConfirm={handleDelete} />
    </div>
  );
};

export default BillOfMaterials;
