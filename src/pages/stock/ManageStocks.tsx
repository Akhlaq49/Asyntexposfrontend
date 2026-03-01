import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';

/* ---------- Types ---------- */
interface DropdownOption { value: string; label: string; }

interface StockEntryDto {
  id: number;
  warehouse: string;
  store: string;
  productId: number;
  productName: string;
  productImage: string;
  sku: string;
  category: string;
  person: string;
  quantity: number;
  date: string;
}

interface ProductResult {
  id: string;
  productName: string;
  sku: string;
  category: string;
  images: string[];
  price: number;
}

/* ---------- ManageStocks ---------- */
const ManageStocks: React.FC = () => {
  const [entries, setEntries] = useState<StockEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  /* lookups */
  const [warehouses, setWarehouses] = useState<DropdownOption[]>([]);
  const [stores, setStores] = useState<DropdownOption[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  /* select all */
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* add modal */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ warehouse: '', store: '', person: '', productId: 0, quantity: 1 });
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [addShowDropdown, setAddShowDropdown] = useState(false);
  const [addSelectedProduct, setAddSelectedProduct] = useState<ProductResult | null>(null);
  const addSearchRef = useRef<HTMLDivElement>(null);

  /* edit modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, warehouse: '', store: '', person: '', productId: 0, quantity: 1 });
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [editShowDropdown, setEditShowDropdown] = useState(false);
  const [editSelectedProduct, setEditSelectedProduct] = useState<ProductResult | null>(null);
  const editSearchRef = useRef<HTMLDivElement>(null);

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- Fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, wRes, sRes, pRes] = await Promise.all([
        api.get<StockEntryDto[]>('/stock-entries'),
        api.get<DropdownOption[]>('/warehouses'),
        api.get<DropdownOption[]>('/stores'),
        api.get<ProductResult[]>('/products'),
      ]);
      setEntries(eRes.data);
      setWarehouses(wRes.data);
      setStores(sRes.data);
      setProducts(pRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace();
  });

  /* ---- Close dropdowns outside ---- */
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (addSearchRef.current && !addSearchRef.current.contains(e.target as Node)) setAddShowDropdown(false);
      if (editSearchRef.current && !editSearchRef.current.contains(e.target as Node)) setEditShowDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ---- Filters ---- */
  const filtered = entries.filter((e) => {
    const matchSearch = !searchTerm ||
      e.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.store.toLowerCase().includes(searchTerm.toLowerCase());
    const matchWarehouse = !filterWarehouse || e.warehouse === filterWarehouse;
    const matchStore = !filterStore || e.store === filterStore;
    const matchProduct = !filterProduct || e.productName === filterProduct;
    return matchSearch && matchWarehouse && matchStore && matchProduct;
  });

  /* ---- Select ---- */
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(filtered.map((e) => e.id)) : new Set());
  };
  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; });
  };

  /* ---- Product search helper ---- */
  const searchProducts = (term: string) =>
    term.trim().length > 0
      ? products.filter(
          (p) =>
            p.productName.toLowerCase().includes(term.toLowerCase()) ||
            p.sku.toLowerCase().includes(term.toLowerCase())
        ).slice(0, 8)
      : [];

  /* ---- Add ---- */
  const resetAdd = () => { setAddForm({ warehouse: '', store: '', person: '', productId: 0, quantity: 1 }); setAddSearchTerm(''); setAddSelectedProduct(null); };

  const handleAddSave = async () => {
    if (!addForm.warehouse || !addForm.store || !addForm.productId) return;
    try {
      await api.post('/stock-entries', addForm);
      await fetchData();
    } catch { /* ignore */ }
    setShowAddModal(false);
    resetAdd();
  };

  /* ---- Edit ---- */
  const openEditModal = (entry: StockEntryDto) => {
    setEditForm({ id: entry.id, warehouse: entry.warehouse, store: entry.store, person: entry.person, productId: entry.productId, quantity: entry.quantity });
    setEditSearchTerm(entry.productName);
    const prod = products.find((p) => parseInt(p.id) === entry.productId) || null;
    setEditSelectedProduct(prod);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editForm.warehouse || !editForm.store || !editForm.productId) return;
    try {
      await api.put(`/stock-entries/${editForm.id}`, {
        warehouse: editForm.warehouse,
        store: editForm.store,
        person: editForm.person,
        productId: editForm.productId,
        quantity: editForm.quantity,
      });
      await fetchData();
    } catch { /* ignore */ }
    setShowEditModal(false);
  };

  /* ---- Delete ---- */
  const openDeleteModal = (id: number) => { setDeleteId(id); setShowDeleteModal(true); };
  const handleDelete = async () => {
    if (deleteId == null) return;
    try { await api.delete(`/stock-entries/${deleteId}`); await fetchData(); } catch { /* ignore */ }
    setShowDeleteModal(false); setDeleteId(null);
  };

  /* ---- Unique values for filters ---- */
  const uniqueWarehouses = [...new Set(entries.map((e) => e.warehouse))];
  const uniqueStores = [...new Set(entries.map((e) => e.store))];
  const uniqueProducts = [...new Set(entries.map((e) => e.productName))];

  /* ---- Product search modal form ---- */
  const renderProductSearch = (
    term: string, setTerm: (v: string) => void,
    showDd: boolean, setShowDd: (v: boolean) => void,
    ref: React.RefObject<HTMLDivElement>,
    onSelect: (p: ProductResult) => void,
    label: string
  ) => (
    <div className="col-lg-12" ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="search-form mb-0">
        <label className="form-label">{label}<span className="text-danger ms-1">*</span></label>
        <div className="position-relative">
          <input
            type="text"
            className="form-control"
            placeholder="Search Product"
            value={term}
            onChange={(e) => { setTerm(e.target.value); setShowDd(true); }}
            onFocus={() => setShowDd(true)}
          />
          <i data-feather="search" className="feather-search"></i>
        </div>
        {showDd && searchProducts(term).length > 0 && (
          <div className="dropdown-menu search-dropdown w-100 h-auto rounded-1 mt-2 show" style={{ display: 'block', position: 'absolute', zIndex: 1050 }}>
            <ul className="list-unstyled mb-0 p-2">
              {searchProducts(term).map((p) => (
                <li
                  key={p.id}
                  className="fs-14 text-gray-9 mb-2 px-2 py-1 rounded"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={() => { onSelect(p); setShowDd(false); }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {p.productName} {p.sku ? `(${p.sku})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Manage Stock</h4>
            <h6>Manage your stock</h6>
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
            <i className="ti ti-circle-plus me-1"></i>Add Stock
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
            {/* Warehouse filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {filterWarehouse || 'Warehouse'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterWarehouse(''); }}>All</a></li>
                {uniqueWarehouses.map((w) => (
                  <li key={w}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterWarehouse(w); }}>{w}</a></li>
                ))}
              </ul>
            </div>
            {/* Store filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {filterStore || 'Store'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterStore(''); }}>All</a></li>
                {uniqueStores.map((s) => (
                  <li key={s}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterStore(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            {/* Product filter */}
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {filterProduct || 'Product'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterProduct(''); }}>All</a></li>
                {uniqueProducts.map((p) => (
                  <li key={p}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterProduct(p); }}>{p}</a></li>
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
                    <th className="no-sort">
                      <label className="checkboxs">
                        <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} />
                        <span className="checkmarks"></span>
                      </label>
                    </th>
                    <th>Warehouse</th>
                    <th>Store</th>
                    <th>Product</th>
                    <th>Date</th>
                    <th>Person</th>
                    <th>Qty</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={(e) => handleSelectOne(entry.id, e.target.checked)} />
                          <span className="checkmarks"></span>
                        </label>
                      </td>
                      <td>{entry.warehouse}</td>
                      <td>{entry.store}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-md me-2">
                            <img src={mediaUrl(entry.productImage)} alt="product" />
                          </span>
                          <span>{entry.productName}</span>
                        </div>
                      </td>
                      <td>{entry.date}</td>
                      <td>{entry.person}</td>
                      <td>{entry.quantity}</td>
                      <td className="d-flex">
                        <div className="d-flex align-items-center edit-delete-action">
                          <a className="me-2 border rounded d-flex align-items-center p-2" href="#" onClick={(e) => { e.preventDefault(); openEditModal(entry); }}>
                            <i data-feather="edit" className="feather-edit"></i>
                          </a>
                          <a className="p-2 border rounded d-flex align-items-center" href="#" onClick={(e) => { e.preventDefault(); openDeleteModal(entry.id); }}>
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

      {/* ====== Add Stock Modal ====== */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Add Stock</h4></div>
                <button type="button" className="close" onClick={() => { setShowAddModal(false); resetAdd(); }} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Warehouse<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={addForm.warehouse} onChange={(e) => setAddForm((p) => ({ ...p, warehouse: e.target.value }))}>
                        <option value="">Select</option>
                        {warehouses.map((w) => <option key={w.value} value={w.label}>{w.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Store<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={addForm.store} onChange={(e) => setAddForm((p) => ({ ...p, store: e.target.value }))}>
                        <option value="">Select</option>
                        {stores.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Responsible Person<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={addForm.person} onChange={(e) => setAddForm((p) => ({ ...p, person: e.target.value }))} placeholder="Enter person name" />
                    </div>
                  </div>
                  {renderProductSearch(
                    addSearchTerm,
                    setAddSearchTerm,
                    addShowDropdown,
                    setAddShowDropdown,
                    addSearchRef,
                    (p) => {
                      setAddSelectedProduct(p);
                      setAddForm((prev) => ({ ...prev, productId: parseInt(p.id) }));
                      setAddSearchTerm(p.productName);
                    },
                    'Product'
                  )}
                </div>

                {/* Selected product preview */}
                {addSelectedProduct && (
                  <div className="modal-body-table mt-3">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Qty</th>
                            <th className="no-sort"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="avatar avatar-md me-2">
                                  <img src={mediaUrl(addSelectedProduct.images?.[0])} alt="product" />
                                </span>
                                <span>{addSelectedProduct.productName}</span>
                              </div>
                            </td>
                            <td>{addSelectedProduct.sku}</td>
                            <td>{addSelectedProduct.category}</td>
                            <td>
                              <div className="product-quantity bg-gray-transparent border-0">
                                <span className="quantity-btn" style={{ cursor: 'pointer' }} onClick={() => setAddForm((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}>
                                  <i data-feather="minus-circle" className="feather-search"></i>
                                </span>
                                <input type="text" className="quntity-input bg-transparent" value={addForm.quantity}
                                  onChange={(e) => setAddForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))} />
                                <span className="quantity-btn" style={{ cursor: 'pointer' }} onClick={() => setAddForm((p) => ({ ...p, quantity: p.quantity + 1 }))}>
                                  <i data-feather="plus-circle" className="plus-circle"></i>
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex align-items-center edit-delete-action">
                                <a className="d-flex align-items-center border rounded p-2" href="#" onClick={(e) => { e.preventDefault(); setAddSelectedProduct(null); setAddSearchTerm(''); setAddForm((p) => ({ ...p, productId: 0, quantity: 1 })); }}>
                                  <i data-feather="trash-2" className="feather-trash-2"></i>
                                </a>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => { setShowAddModal(false); resetAdd(); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddSave}>Add Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Edit Stock Modal ====== */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>Edit Stock</h4></div>
                <button type="button" className="close" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Warehouse<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={editForm.warehouse} onChange={(e) => setEditForm((p) => ({ ...p, warehouse: e.target.value }))}>
                        <option value="">Select</option>
                        {warehouses.map((w) => <option key={w.value} value={w.label}>{w.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Store<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={editForm.store} onChange={(e) => setEditForm((p) => ({ ...p, store: e.target.value }))}>
                        <option value="">Select</option>
                        {stores.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Responsible Person<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={editForm.person} onChange={(e) => setEditForm((p) => ({ ...p, person: e.target.value }))} placeholder="Enter person name" />
                    </div>
                  </div>
                  {renderProductSearch(
                    editSearchTerm,
                    setEditSearchTerm,
                    editShowDropdown,
                    setEditShowDropdown,
                    editSearchRef,
                    (p) => {
                      setEditSelectedProduct(p);
                      setEditForm((prev) => ({ ...prev, productId: parseInt(p.id) }));
                      setEditSearchTerm(p.productName);
                    },
                    'Product'
                  )}
                </div>

                {/* Selected product preview */}
                {editSelectedProduct && (
                  <div className="modal-body-table mt-3">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Qty</th>
                            <th className="no-sort"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="avatar avatar-md me-2">
                                  <img src={mediaUrl(editSelectedProduct.images?.[0])} alt="product" />
                                </span>
                                <span>{editSelectedProduct.productName}</span>
                              </div>
                            </td>
                            <td>{editSelectedProduct.sku}</td>
                            <td>{editSelectedProduct.category}</td>
                            <td>
                              <div className="product-quantity bg-gray-transparent border-0">
                                <span className="quantity-btn" style={{ cursor: 'pointer' }} onClick={() => setEditForm((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}>
                                  <i data-feather="minus-circle" className="feather-search"></i>
                                </span>
                                <input type="text" className="quntity-input bg-transparent" value={editForm.quantity}
                                  onChange={(e) => setEditForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))} />
                                <span className="quantity-btn" style={{ cursor: 'pointer' }} onClick={() => setEditForm((p) => ({ ...p, quantity: p.quantity + 1 }))}>
                                  <i data-feather="plus-circle" className="plus-circle"></i>
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex align-items-center edit-delete-action">
                                <a className="d-flex align-items-center border rounded p-2" href="#" onClick={(e) => { e.preventDefault(); setEditSelectedProduct(null); setEditSearchTerm(''); setEditForm((p) => ({ ...p, productId: 0, quantity: 1 })); }}>
                                  <i data-feather="trash-2" className="feather-trash-2"></i>
                                </a>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
                  <h3 className="mb-2">Delete Stock</h3>
                  <p className="fs-16 mb-3">Are you sure you want to delete product from stock?</p>
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

export default ManageStocks;
