import { useState, useEffect } from 'react';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import { showSuccess, showError } from '../../utils/alertUtils';
import api, { mediaUrl } from '../../services/api';
import {
  getBoms, getManufacturingOrders, createManufacturingOrder, updateManufacturingOrder,
  deleteManufacturingOrder, completeManufacturingOrder,
  type Bom, type ManufacturingOrder, type ManufacturingOrderItem, type CreateManufacturingOrderPayload
} from '../../services/manufacturingService';

interface DropdownOption { value: string; label: string; id?: number; }
interface SupplierOption { id: number; fullName: string; phone?: string; }

const ManufacturingOrders = () => {
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [filtered, setFiltered] = useState<ManufacturingOrder[]>([]);
  const [boms, setBoms] = useState<Bom[]>([]);
  const [stores, setStores] = useState<DropdownOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    reference: '', bomId: 0, quantity: 1, targetStoreId: 0, status: 'Draft', laborCost: 0, overheadCost: 0, notes: ''
  });
  const [lineItems, setLineItems] = useState<ManufacturingOrderItem[]>([]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [orders, search, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    const [ordData, bomData, storeResp, supplierResp] = await Promise.all([
      getManufacturingOrders(), getBoms(),
      api.get('/parties?role=Store').catch(() => ({ data: [] })),
      api.get('/parties?role=Supplier').catch(() => ({ data: [] }))
    ]);
    setOrders(ordData);
    setBoms(bomData);
    setStores((storeResp.data || []).map((s: any) => ({ value: s.fullName, label: s.fullName, id: s.id })));
    setSuppliers(supplierResp.data || []);
    setLoading(false);
  };

  const applyFilters = () => {
    let result = [...orders];
    if (search) result = result.filter(o => o.reference.toLowerCase().includes(search.toLowerCase()) || o.finishedProductName.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) result = result.filter(o => o.status === statusFilter);
    setFiltered(result);
  };

  const generateRef = () => `MO-${Date.now().toString().slice(-6)}`;

  const resetForm = () => {
    setFormData({ reference: generateRef(), bomId: 0, quantity: 1, targetStoreId: 0, status: 'Draft', laborCost: 0, overheadCost: 0, notes: '' });
    setLineItems([]);
  };

  const openAdd = () => { resetForm(); setShowAdd(true); };

  const openEdit = (order: ManufacturingOrder) => {
    setEditId(order.id);
    setFormData({
      reference: order.reference, bomId: order.bomId,
      quantity: order.quantity, targetStoreId: order.targetStoreId || 0, status: order.status,
      laborCost: order.laborCost, overheadCost: order.overheadCost, notes: order.notes || ''
    });
    setLineItems(order.items);
    setShowEdit(true);
  };

  const onBomSelect = (bomId: number) => {
    const bom = boms.find(b => b.id === bomId);
    if (!bom) return;
    setFormData({
      ...formData,
      bomId: bom.id,
      laborCost: bom.laborCost,
      overheadCost: bom.overheadCost,
    });
    setLineItems(bom.items.map(i => ({
      rawMaterialId: i.rawMaterialId,
      rawMaterialName: i.rawMaterialName,
      rawMaterialSku: i.rawMaterialSku,
      requiredQuantity: i.quantity * formData.quantity,
      consumedQuantity: i.quantity * formData.quantity,
      unitCost: i.unitCost,
      totalCost: i.quantity * formData.quantity * i.unitCost,
      supplierId: i.supplierId,
      supplierName: i.supplierName,
    })));
  };

  const updateItemSupplier = (idx: number, supplierId: number) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], supplierId, supplierName: suppliers.find(s => s.id === supplierId)?.fullName };
    setLineItems(updated);
  };

  const materialTotal = lineItems.reduce((sum, i) => sum + i.totalCost, 0);
  const grandTotal = materialTotal + formData.laborCost + formData.overheadCost;

  const handleSave = async (isEdit: boolean) => {
    if (!formData.reference || !formData.bomId) { showError('Please fill required fields'); return; }
    if (lineItems.length === 0) { showError('No materials configured'); return; }

    const payload: CreateManufacturingOrderPayload = {
      ...formData,
      targetStoreId: formData.targetStoreId || undefined,
      items: lineItems.map(i => ({
        rawMaterialId: i.rawMaterialId,
        requiredQuantity: i.requiredQuantity,
        consumedQuantity: i.consumedQuantity,
        unitCost: i.unitCost,
        totalCost: i.totalCost,
        supplierId: i.supplierId
      }))
    };

    try {
      const result = isEdit ? await updateManufacturingOrder(editId!, payload) : await createManufacturingOrder(payload);
      if (result) {
        showSuccess(isEdit ? 'Order updated' : 'Order created');
        setShowAdd(false); setShowEdit(false);
        loadData();
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to save order');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      const result = await completeManufacturingOrder(id);
      if (result) { showSuccess('Order completed! Finished product added to inventory.'); loadData(); }
    } catch (err: any) {
      showError(err?.message || 'Failed to complete order');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const ok = await deleteManufacturingOrder(deleteId);
      if (ok) { showSuccess('Order deleted'); loadData(); }
    } catch (err: any) {
      showError(err?.message || 'Failed to delete order');
    }
    setShowDelete(false); setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft': return 'badge fw-medium fs-10 bg-secondary';
      case 'InProgress': return 'badge fw-medium fs-10 bg-warning';
      case 'Completed': return 'badge fw-medium fs-10 bg-success';
      case 'Cancelled': return 'badge fw-medium fs-10 bg-danger';
      default: return 'badge fw-medium fs-10 bg-info';
    }
  };

  const renderModal = (isEdit: boolean) => (
    <div className={`modal fade ${(isEdit ? showEdit : showAdd) ? 'show d-block' : ''}`} style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isEdit ? 'Edit' : 'Create'} Manufacturing Order</h5>
            <button className="btn-close" onClick={() => isEdit ? setShowEdit(false) : setShowAdd(false)} />
          </div>
          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-md-3">
                <label className="form-label">Reference *</label>
                <input className="form-control" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Select BOM *</label>
                <select className="form-select" value={formData.bomId} onChange={e => onBomSelect(+e.target.value)}>
                  <option value={0}>-- Select BOM --</option>
                  {boms.filter(b => b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Quantity</label>
                <input type="number" className="form-control" value={formData.quantity} min={1} onChange={e => {
                  const qty = +e.target.value;
                  setFormData({ ...formData, quantity: qty });
                  // Recalculate line items based on BOM
                  const bom = boms.find(b => b.id === formData.bomId);
                  if (bom) {
                    setLineItems(bom.items.map(i => {
                      const existing = lineItems.find(li => li.rawMaterialId === i.rawMaterialId);
                      return {
                        rawMaterialId: i.rawMaterialId, rawMaterialName: i.rawMaterialName, rawMaterialSku: i.rawMaterialSku,
                        requiredQuantity: i.quantity * qty, consumedQuantity: i.quantity * qty,
                        unitCost: i.unitCost, totalCost: i.quantity * qty * i.unitCost,
                        supplierId: existing?.supplierId ?? i.supplierId,
                        supplierName: existing?.supplierName ?? i.supplierName,
                      };
                    }));
                  }
                }} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Target Store</label>
                <select className="form-select" value={formData.targetStoreId} onChange={e => setFormData({ ...formData, targetStoreId: +e.target.value })}>
                  <option value={0}>-- Select Store --</option>
                  {stores.map(s => <option key={s.id || s.value} value={s.id || 0}>{s.label}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Draft">Draft</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-3">
                <label className="form-label">Finished Product</label>
                <input className="form-control" readOnly value={boms.find(b => b.id === formData.bomId)?.finishedProductName || '(Auto from BOM)'} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Labor Cost</label>
                <input type="number" className="form-control" value={formData.laborCost} onChange={e => setFormData({ ...formData, laborCost: +e.target.value })} min={0} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Overhead Cost</label>
                <input type="number" className="form-control" value={formData.overheadCost} onChange={e => setFormData({ ...formData, overheadCost: +e.target.value })} min={0} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Notes</label>
                <input className="form-control" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>

            <hr />
            <h6 className="mb-3">Raw Materials (from BOM)</h6>
            {lineItems.length > 0 ? (
              <div className="table-responsive mb-3">
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr><th>#</th><th>Raw Material</th><th>Required Qty</th><th>Consumed Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Supplier</th></tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.rawMaterialName} {item.rawMaterialSku ? `(${item.rawMaterialSku})` : ''}</td>
                        <td>{item.requiredQuantity}</td>
                        <td>
                          <input type="number" className="form-control form-control-sm" value={item.consumedQuantity} min={0}
                            onChange={e => {
                              const updated = [...lineItems];
                              const consumed = +e.target.value;
                              updated[idx] = { ...item, consumedQuantity: consumed, totalCost: consumed * item.unitCost };
                              setLineItems(updated);
                            }} />
                        </td>
                        <td>{item.unitCost.toFixed(2)}</td>
                        <td>{item.totalCost.toFixed(2)}</td>
                        <td>
                          <select className="form-select form-select-sm" value={item.supplierId || ''} onChange={e => updateItemSupplier(idx, +e.target.value)}>
                            <option value="">-- Select --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted py-3">Select a BOM to populate raw materials</div>
            )}

            <div className="row">
              <div className="col-md-8" />
              <div className="col-md-4">
                <table className="table table-sm">
                  <tbody>
                    <tr><td>Material Cost:</td><td className="text-end">{materialTotal.toFixed(2)}</td></tr>
                    <tr><td>Labor Cost:</td><td className="text-end">{formData.laborCost.toFixed(2)}</td></tr>
                    <tr><td>Overhead Cost:</td><td className="text-end">{formData.overheadCost.toFixed(2)}</td></tr>
                    <tr className="fw-bold"><td>Grand Total:</td><td className="text-end">{grandTotal.toFixed(2)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => isEdit ? setShowEdit(false) : setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => handleSave(isEdit)}>{isEdit ? 'Update' : 'Create'} Order</button>
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
              <h4 className="fw-bold">Manufacturing Orders</h4>
              <h6>Manage production runs and track material consumption</h6>
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
            <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openAdd(); }}><i className="ti ti-circle-plus me-1" />Create Order</a>
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
                  {statusFilter ? (statusFilter === 'InProgress' ? 'In Progress' : statusFilter) : 'Status'}
                </a>
                <ul className="dropdown-menu dropdown-menu-end p-3">
                  <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter(''); }}>All</a></li>
                  <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('Draft'); }}>Draft</a></li>
                  <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('InProgress'); }}>In Progress</a></li>
                  <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('Completed'); }}>Completed</a></li>
                  <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStatusFilter('Cancelled'); }}>Cancelled</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light"><tr><th>Reference</th><th>Product</th><th>BOM</th><th>Qty</th><th>Store</th><th>Total Cost</th><th>Status</th><th className="no-sort">Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-4 text-muted">No manufacturing orders found</td></tr>
                  ) : filtered.map(order => (
                    <tr key={order.id}>
                      <td><strong>{order.reference}</strong></td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2" onClick={(e) => e.preventDefault()}>
                            <img src={mediaUrl(order.finishedProductImage)} alt={order.finishedProductName} />
                          </a>
                          <span>{order.finishedProductName}</span>
                        </div>
                      </td>
                      <td>{order.bomName}</td>
                      <td>{order.quantity}</td>
                      <td>{order.targetStoreName || '-'}</td>
                      <td><strong>{order.totalCost.toFixed(2)}</strong></td>
                      <td><span className={getStatusBadge(order.status)}>{order.status}</span></td>
                      <td className="action-table-data">
                        <div className="edit-delete-action d-flex align-items-center gap-2">
                          {(order.status === 'Draft' || order.status === 'InProgress') && (
                            <a href="#" className="btn btn-icon btn-sm" title="Complete" onClick={(e) => { e.preventDefault(); handleComplete(order.id); }}>
                              <i className="ti ti-check text-success"></i>
                            </a>
                          )}
                          {(order.status === 'Draft' || order.status === 'InProgress') && (
                            <a href="#" className="btn btn-icon btn-sm" onClick={(e) => { e.preventDefault(); openEdit(order); }}>
                              <i className="ti ti-edit text-blue"></i>
                            </a>
                          )}
                          <a href="#" className="btn btn-icon btn-sm" onClick={(e) => { e.preventDefault(); setDeleteId(order.id); setShowDelete(true); }}>
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

export default ManufacturingOrders;
