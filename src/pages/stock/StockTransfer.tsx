import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';

/* ---------- Types ---------- */
interface DropdownOption { value: string; label: string; }

interface StockTransferItemDto {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  sku: string;
  category: string;
  quantity: number;
}

interface StockTransferDto {
  id: number;
  warehouseFrom: string;
  warehouseTo: string;
  referenceNumber: string;
  notes: string | null;
  noOfProducts: number;
  quantityTransferred: number;
  date: string;
  items: StockTransferItemDto[];
}

interface ProductResult {
  id: string;
  productName: string;
  sku: string;
  category: string;
  images: string[];
}

interface LocalItem { productId: number; productName: string; productImage: string; sku: string; category: string; quantity: number; }

/* ---------- Component ---------- */
const StockTransfer: React.FC = () => {
  const [transfers, setTransfers] = useState<StockTransferDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [warehouses, setWarehouses] = useState<DropdownOption[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  /* select all */
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* add modal */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ warehouseFrom: '', warehouseTo: '', referenceNumber: '', notes: '' });
  const [addItems, setAddItems] = useState<LocalItem[]>([]);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [addShowDropdown, setAddShowDropdown] = useState(false);
  const addSearchRef = useRef<HTMLDivElement>(null);

  /* edit modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(0);
  const [editForm, setEditForm] = useState({ warehouseFrom: '', warehouseTo: '', referenceNumber: '', notes: '' });
  const [editItems, setEditItems] = useState<LocalItem[]>([]);
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [editShowDropdown, setEditShowDropdown] = useState(false);
  const editSearchRef = useRef<HTMLDivElement>(null);

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- Fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, wRes, pRes] = await Promise.all([
        api.get<StockTransferDto[]>('/stock-transfers'),
        api.get<DropdownOption[]>('/warehouses'),
        api.get<ProductResult[]>('/products'),
      ]);
      setTransfers(tRes.data);
      setWarehouses(wRes.data);
      setProducts(pRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace();
  });

  /* ---- Click-away close ---- */
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (addSearchRef.current && !addSearchRef.current.contains(e.target as Node)) setAddShowDropdown(false);
      if (editSearchRef.current && !editSearchRef.current.contains(e.target as Node)) setEditShowDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ---- Filters & sort ---- */
  const filtered = transfers
    .filter((t) => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        t.warehouseFrom.toLowerCase().includes(s) ||
        t.warehouseTo.toLowerCase().includes(s) ||
        t.referenceNumber.toLowerCase().includes(s);
      const matchFrom = !filterFrom || t.warehouseFrom === filterFrom;
      const matchTo = !filterTo || t.warehouseTo === filterTo;
      return matchSearch && matchFrom && matchTo;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') return a.warehouseFrom.localeCompare(b.warehouseFrom);
      if (sortBy === 'desc') return b.warehouseFrom.localeCompare(a.warehouseFrom);
      return 0; // recent — already sorted from API
    });

  /* ---- Select ---- */
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(filtered.map((t) => t.id)) : new Set());
  };
  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; });
  };

  /* ---- Product search ---- */
  const searchProducts = (term: string) =>
    term.trim().length > 0
      ? products.filter((p) =>
          p.productName.toLowerCase().includes(term.toLowerCase()) ||
          p.sku.toLowerCase().includes(term.toLowerCase())
        ).slice(0, 8)
      : [];

  const toLocalItem = (p: ProductResult): LocalItem => ({
    productId: parseInt(p.id),
    productName: p.productName,
    productImage: p.images?.[0] ?? '',
    sku: p.sku,
    category: p.category,
    quantity: 1,
  });

  /* ---- Add ---- */
  const resetAdd = () => { setAddForm({ warehouseFrom: '', warehouseTo: '', referenceNumber: '', notes: '' }); setAddItems([]); setAddSearchTerm(''); };

  const handleAddProductSelect = (p: ProductResult) => {
    const pid = parseInt(p.id);
    if (addItems.some((i) => i.productId === pid)) {
      setAddItems((prev) => prev.map((i) => i.productId === pid ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setAddItems((prev) => [...prev, toLocalItem(p)]);
    }
    setAddSearchTerm('');
  };

  const handleAddSave = async () => {
    if (!addForm.warehouseFrom || !addForm.warehouseTo || addItems.length === 0) return;
    try {
      await api.post('/stock-transfers', {
        ...addForm,
        items: addItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      await fetchData();
    } catch { /* ignore */ }
    setShowAddModal(false);
    resetAdd();
  };

  /* ---- Edit ---- */
  const openEditModal = (transfer: StockTransferDto) => {
    setEditId(transfer.id);
    setEditForm({ warehouseFrom: transfer.warehouseFrom, warehouseTo: transfer.warehouseTo, referenceNumber: transfer.referenceNumber, notes: transfer.notes || '' });
    setEditItems(transfer.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      productImage: i.productImage,
      sku: i.sku,
      category: i.category,
      quantity: i.quantity,
    })));
    setEditSearchTerm('');
    setShowEditModal(true);
  };

  const handleEditProductSelect = (p: ProductResult) => {
    const pid = parseInt(p.id);
    if (editItems.some((i) => i.productId === pid)) {
      setEditItems((prev) => prev.map((i) => i.productId === pid ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setEditItems((prev) => [...prev, toLocalItem(p)]);
    }
    setEditSearchTerm('');
  };

  const handleEditSave = async () => {
    if (!editForm.warehouseFrom || !editForm.warehouseTo || editItems.length === 0) return;
    try {
      await api.put(`/stock-transfers/${editId}`, {
        ...editForm,
        items: editItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      await fetchData();
    } catch { /* ignore */ }
    setShowEditModal(false);
  };

  /* ---- Delete ---- */
  const openDeleteModal = (id: number) => { setDeleteId(id); setShowDeleteModal(true); };
  const handleDelete = async () => {
    if (deleteId == null) return;
    try { await api.delete(`/stock-transfers/${deleteId}`); await fetchData(); } catch { /* ignore */ }
    setShowDeleteModal(false); setDeleteId(null);
  };

  /* ---- Unique warehouses for filter dropdowns ---- */
  const uniqueFrom = [...new Set(transfers.map((t) => t.warehouseFrom))];
  const uniqueTo = [...new Set(transfers.map((t) => t.warehouseTo))];

  /* ---- Product search widget ---- */
  const renderProductSearch = (
    term: string, setTerm: (v: string) => void,
    showDd: boolean, setShowDd: (v: boolean) => void,
    ref: React.RefObject<HTMLDivElement>,
    onSelect: (p: ProductResult) => void
  ) => (
    <div className="search-form mb-3" ref={ref as React.RefObject<HTMLDivElement>}>
      <label className="form-label">Product<span className="text-danger ms-1">*</span></label>
      <div className="position-relative">
        <input type="text" className="form-control" placeholder="Search Product" value={term}
          onChange={(e) => { setTerm(e.target.value); setShowDd(true); }}
          onFocus={() => setShowDd(true)} />
        <i data-feather="search" className="feather-search"></i>
      </div>
      {showDd && searchProducts(term).length > 0 && (
        <div className="dropdown-menu search-dropdown w-100 h-auto rounded-1 mt-2 show" style={{ display: 'block', position: 'absolute', zIndex: 1050 }}>
          <ul className="list-unstyled mb-0 p-2">
            {searchProducts(term).map((p) => (
              <li key={p.id} className="fs-14 text-gray-9 mb-2 px-2 py-1 rounded" style={{ cursor: 'pointer' }}
                onMouseDown={() => { onSelect(p); setShowDd(false); }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                {p.productName} {p.sku ? `(${p.sku})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  /* ---- Inline items table ---- */
  const renderItemsTable = (items: LocalItem[], setItems: React.Dispatch<React.SetStateAction<LocalItem[]>>) => (
    items.length > 0 ? (
      <div className="modal-body-table mb-3">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId}>
                  <td>
                    <div className="d-flex align-items-center">
                      <span className="avatar avatar-md me-2">
                        <img src={mediaUrl(item.productImage)} alt="product" />
                      </span>
                      <span>{item.productName}</span>
                    </div>
                  </td>
                  <td>{item.sku}</td>
                  <td>{item.category}</td>
                  <td>
                    <div className="product-quantity bg-gray-transparent border-0">
                      <span className="quantity-btn" style={{ cursor: 'pointer' }} onClick={() =>
                        setItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}>
                        <i data-feather="minus-circle" className="feather-search"></i>
                      </span>
                      <input type="text" className="quntity-input bg-transparent" value={item.quantity}
                        onChange={(e) => setItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, quantity: Math.max(1, parseInt(e.target.value) || 1) } : i))} />
                      <span className="quantity-btn" style={{ cursor: 'pointer' }} onClick={() =>
                        setItems((prev) => prev.map((i) => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i))}>
                        <i data-feather="plus-circle" className="plus-circle"></i>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="edit-delete-action d-flex align-items-center">
                      <a className="p-2 border rounded d-flex align-items-center" href="#" onClick={(e) => { e.preventDefault(); setItems((prev) => prev.filter((i) => i.productId !== item.productId)); }}>
                        <i data-feather="trash-2" className="feather-trash-2"></i>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : null
  );

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Stock Transfer</h4>
            <h6>Manage your stock transfer</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-placement="top" title="Pdf" onClick={(e) => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="img" /></a></li>
          <li><a href="#" data-bs-placement="top" title="Excel" onClick={(e) => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="img" /></a></li>
          <li><a href="#" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); fetchData(); }}><i className="ti ti-refresh"></i></a></li>
          <li><a href="#" data-bs-placement="top" title="Collapse" onClick={(e) => e.preventDefault()}><i className="ti ti-chevron-up"></i></a></li>
        </ul>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); resetAdd(); setShowAddModal(true); }}>
            <i className="ti ti-circle-plus me-1"></i>Add New
          </a>
        </div>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* From Warehouse filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {filterFrom || 'From Warehouse'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterFrom(''); }}>All</a></li>
                {uniqueFrom.map((w) => (
                  <li key={w}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterFrom(w); }}>{w}</a></li>
                ))}
              </ul>
            </div>
            {/* To Warehouse filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {filterTo || 'To Warehouse'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterTo(''); }}>All</a></li>
                {uniqueTo.map((w) => (
                  <li key={w}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterTo(w); }}>{w}</a></li>
                ))}
              </ul>
            </div>
            {/* Sort */}
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                Sort By : {sortBy === 'recent' ? 'Recently Added' : sortBy === 'asc' ? 'Ascending' : 'Descending'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setSortBy('recent'); }}>Recently Added</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setSortBy('asc'); }}>Ascending</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setSortBy('desc'); }}>Descending</a></li>
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
                    <th>From Warehouse</th>
                    <th>To Warehouse</th>
                    <th>No of Products</th>
                    <th>Quantity Transferred</th>
                    <th>Ref Number</th>
                    <th>Date</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" checked={selectedIds.has(t.id)} onChange={(e) => handleSelectOne(t.id, e.target.checked)} />
                          <span className="checkmarks"></span>
                        </label>
                      </td>
                      <td>{t.warehouseFrom}</td>
                      <td>{t.warehouseTo}</td>
                      <td>{t.noOfProducts}</td>
                      <td>{t.quantityTransferred}</td>
                      <td>{t.referenceNumber}</td>
                      <td>{t.date}</td>
                      <td className="d-flex">
                        <div className="edit-delete-action d-flex align-items-center justify-content-center">
                          <a className="me-2 p-2 d-flex align-items-center justify-content-between border rounded" href="#" onClick={(e) => { e.preventDefault(); openEditModal(t); }}>
                            <i data-feather="edit" className="feather-edit"></i>
                          </a>
                          <a className="p-2 d-flex align-items-center justify-content-between border rounded" href="#" onClick={(e) => { e.preventDefault(); openDeleteModal(t.id); }}>
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

      {/* ====== Add Transfer Modal ====== */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Add Transfer</h4></div>
                <button type="button" className="close" onClick={() => { setShowAddModal(false); resetAdd(); }} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Warehouse From<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={addForm.warehouseFrom} onChange={(e) => setAddForm((p) => ({ ...p, warehouseFrom: e.target.value }))}>
                        <option value="">Select</option>
                        {warehouses.map((w) => <option key={w.value} value={w.label}>{w.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Warehouse To<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={addForm.warehouseTo} onChange={(e) => setAddForm((p) => ({ ...p, warehouseTo: e.target.value }))}>
                        <option value="">Select</option>
                        {warehouses.map((w) => <option key={w.value} value={w.label}>{w.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Reference Number<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={addForm.referenceNumber} onChange={(e) => setAddForm((p) => ({ ...p, referenceNumber: e.target.value }))} />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    {renderProductSearch(addSearchTerm, setAddSearchTerm, addShowDropdown, setAddShowDropdown, addSearchRef, handleAddProductSelect)}
                  </div>
                  <div className="col-lg-12">
                    {renderItemsTable(addItems, setAddItems)}
                  </div>
                  <div className="col-lg-12">
                    <div className="search-form mb-0">
                      <label className="form-label">Notes<span className="text-danger ms-1">*</span></label>
                      <textarea className="form-control" rows={3} value={addForm.notes} onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => { setShowAddModal(false); resetAdd(); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddSave}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Edit Transfer Modal ====== */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Edit Transfer</h4></div>
                <button type="button" className="close" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Warehouse From<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={editForm.warehouseFrom} onChange={(e) => setEditForm((p) => ({ ...p, warehouseFrom: e.target.value }))}>
                        <option value="">Select</option>
                        {warehouses.map((w) => <option key={w.value} value={w.label}>{w.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Warehouse To<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={editForm.warehouseTo} onChange={(e) => setEditForm((p) => ({ ...p, warehouseTo: e.target.value }))}>
                        <option value="">Select</option>
                        {warehouses.map((w) => <option key={w.value} value={w.label}>{w.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Reference No<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={editForm.referenceNumber} onChange={(e) => setEditForm((p) => ({ ...p, referenceNumber: e.target.value }))} />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    {renderProductSearch(editSearchTerm, setEditSearchTerm, editShowDropdown, setEditShowDropdown, editSearchRef, handleEditProductSelect)}
                  </div>
                  <div className="col-lg-12">
                    {renderItemsTable(editItems, setEditItems)}
                  </div>
                  <div className="col-lg-12">
                    <div className="search-form mb-0">
                      <label className="form-label">Notes<span className="text-danger ms-1">*</span></label>
                      <textarea className="form-control" rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Delete Modal ====== */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body p-0">
                <div className="success-wrap text-center p-5">
                  <div className="icon-success bg-danger-transparent text-danger mb-2">
                    <i className="ti ti-trash"></i>
                  </div>
                  <h3 className="mb-2">Delete Stock Transfer</h3>
                  <p className="fs-16 mb-3">Are you sure you want to delete stock transfer?</p>
                  <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                    <button type="button" className="btn btn-md btn-secondary" onClick={() => setShowDeleteModal(false)}>No, Cancel</button>
                    <button type="button" className="btn btn-md btn-primary" onClick={handleDelete}>Yes, Delete</button>
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

export default StockTransfer;
