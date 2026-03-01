import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';

/* ---------- Types ---------- */
interface QuotationItemDto {
  id: number; productId: number; productName: string; quantity: number;
  purchasePrice: number; discount: number; taxPercent: number; taxAmount: number;
  unitCost: number; totalCost: number;
}
interface QuotationDto {
  id: number; reference: string; customerId: number | null; customerName: string;
  customerImage: string | null; productId: number | null; productName: string;
  productImage: string | null; orderTax: number; discount: number; shipping: number;
  grandTotal: number; status: string; description: string | null;
  quotationDate: string; createdAt: string; items: QuotationItemDto[];
}
interface CustomerResult { id: number; name: string; phone?: string; }
interface ProductResult { id: string; productName: string; sku: string; category: string; price: number; images: string[]; }

interface LocalItem {
  productId: number; productName: string; quantity: number; purchasePrice: number;
  discount: number; taxPercent: number; taxAmount: number; unitCost: number; totalCost: number;
}

const STATUS_OPTIONS = ['Sent', 'Pending', 'Ordered'];

const statusBadge = (s: string) => {
  const sl = s.toLowerCase();
  if (sl === 'sent') return 'badge-success';
  if (sl === 'pending') return 'badge-cyan';
  if (sl === 'ordered') return 'badge-warning';
  return 'badge-secondary';
};

const calcItem = (item: LocalItem): LocalItem => {
  const taxAmount = (item.purchasePrice * item.taxPercent) / 100;
  const unitCost = item.purchasePrice - item.discount + taxAmount;
  const totalCost = unitCost * item.quantity;
  return { ...item, taxAmount: Math.round(taxAmount * 100) / 100, unitCost: Math.round(unitCost * 100) / 100, totalCost: Math.round(totalCost * 100) / 100 };
};

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ======================== Component ======================== */
const QuotationList: React.FC = () => {
  const [quotations, setQuotations] = useState<QuotationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  /* select */
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* add/edit modal */
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    customerId: null as number | null, customerName: '', customerImage: '',
    productId: null as number | null, productName: '', productImage: '',
    reference: '', status: 'Pending', orderTax: 0, discount: 0, shipping: 0,
    description: '', quotationDate: new Date().toISOString().slice(0, 10),
  });
  const [items, setItems] = useState<LocalItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  /* detail modal */
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailQuotation, setDetailQuotation] = useState<QuotationDto | null>(null);

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- Fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, cRes, pRes] = await Promise.all([
        api.get<QuotationDto[]>('/quotations'),
        api.get<CustomerResult[]>('/customers'),
        api.get<ProductResult[]>('/products'),
      ]);
      setQuotations(qRes.data);
      setCustomers(cRes.data);
      setProducts(pRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  /* ---- Click-away ---- */
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) setShowProductDropdown(false);
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) setShowCustomerDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ---- Filters ---- */
  const productNames = [...new Set(quotations.map(q => q.productName).filter(Boolean))];
  const customerNames = [...new Set(quotations.map(q => q.customerName).filter(Boolean))];

  const filtered = quotations
    .filter((q) => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || q.reference.toLowerCase().includes(s) || q.customerName.toLowerCase().includes(s) || q.productName.toLowerCase().includes(s);
      const matchProduct = !filterProduct || q.productName === filterProduct;
      const matchCustomer = !filterCustomer || q.customerName === filterCustomer;
      const matchStatus = !filterStatus || q.status === filterStatus;
      return matchSearch && matchProduct && matchCustomer && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') return a.grandTotal - b.grandTotal;
      if (sortBy === 'desc') return b.grandTotal - a.grandTotal;
      return 0;
    });

  /* ---- Select ---- */
  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(filtered.map(q => q.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { setSelectedIds(prev => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; }); };

  /* ---- Product search (items) ---- */
  const searchProducts = (term: string) =>
    term.trim().length > 0
      ? products.filter(p => p.productName.toLowerCase().includes(term.toLowerCase()) || p.sku.toLowerCase().includes(term.toLowerCase())).slice(0, 8)
      : [];

  const handleProductSelect = (p: ProductResult) => {
    const pid = parseInt(p.id);
    if (items.find(i => i.productId === pid)) { setShowProductDropdown(false); return; }
    setItems([...items, calcItem({ productId: pid, productName: p.productName, quantity: 1, purchasePrice: p.price, discount: 0, taxPercent: 0, taxAmount: 0, unitCost: p.price, totalCost: p.price })]);
    setProductSearchTerm('');
    setShowProductDropdown(false);

    // Set as header product if not yet set
    if (!form.productName) {
      setForm(f => ({ ...f, productId: pid, productName: p.productName, productImage: p.images?.[0] || '' }));
    }
  };

  const updateItemField = (idx: number, field: keyof LocalItem, value: number) => {
    setItems(items.map((item, i) => i === idx ? calcItem({ ...item, [field]: value }) : item));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  /* ---- Grand total ---- */
  const grandTotal = items.reduce((sum, i) => sum + i.totalCost, 0) + form.orderTax + form.shipping - form.discount;

  /* ---- Customer search ---- */
  const filteredCustomers = customerSearchTerm.trim().length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).slice(0, 8)
    : [];

  const handleCustomerSelect = (c: CustomerResult) => {
    setForm({ ...form, customerId: c.id, customerName: c.name });
    setCustomerSearchTerm(c.name);
    setShowCustomerDropdown(false);
  };

  /* ---- Open add/edit modal ---- */
  const openAddModal = () => {
    setEditingId(null);
    setForm({ customerId: null, customerName: '', customerImage: '', productId: null, productName: '', productImage: '', reference: '', status: 'Pending', orderTax: 0, discount: 0, shipping: 0, description: '', quotationDate: new Date().toISOString().slice(0, 10) });
    setItems([]);
    setCustomerSearchTerm('');
    setProductSearchTerm('');
    setShowModal(true);
  };

  const openEditModal = async (q: QuotationDto) => {
    // Fetch full detail with items
    try {
      const res = await api.get<QuotationDto>(`/quotations/${q.id}`);
      const full = res.data;
      setEditingId(full.id);
      setForm({
        customerId: full.customerId, customerName: full.customerName, customerImage: full.customerImage || '',
        productId: full.productId, productName: full.productName, productImage: full.productImage || '',
        reference: full.reference, status: full.status, orderTax: full.orderTax, discount: full.discount, shipping: full.shipping,
        description: full.description || '', quotationDate: new Date().toISOString().slice(0, 10),
      });
      setItems(full.items.map(i => ({
        productId: i.productId, productName: i.productName, quantity: i.quantity,
        purchasePrice: i.purchasePrice, discount: i.discount, taxPercent: i.taxPercent,
        taxAmount: i.taxAmount, unitCost: i.unitCost, totalCost: i.totalCost,
      })));
      setCustomerSearchTerm(full.customerName);
      setProductSearchTerm('');
      setShowModal(true);
    } catch { /* ignore */ }
  };

  /* ---- Detail modal --- */
  const openDetail = async (q: QuotationDto) => {
    try {
      const res = await api.get<QuotationDto>(`/quotations/${q.id}`);
      setDetailQuotation(res.data);
      setShowDetailModal(true);
    } catch { /* ignore */ }
  };

  /* ---- Save quotation ---- */
  const saveQuotation = async () => {
    const payload = {
      reference: form.reference,
      customerId: form.customerId, customerName: form.customerName, customerImage: form.customerImage || null,
      productId: form.productId, productName: form.productName, productImage: form.productImage || null,
      orderTax: form.orderTax, discount: form.discount, shipping: form.shipping,
      grandTotal, status: form.status, description: form.description || null,
      quotationDate: form.quotationDate,
      items: items.map(i => ({
        productId: i.productId, productName: i.productName, quantity: i.quantity,
        purchasePrice: i.purchasePrice, discount: i.discount, taxPercent: i.taxPercent,
        taxAmount: i.taxAmount, unitCost: i.unitCost, totalCost: i.totalCost,
      })),
    };
    try {
      if (editingId) await api.put(`/quotations/${editingId}`, payload);
      else await api.post('/quotations', payload);
      setShowModal(false);
      fetchData();
    } catch { /* ignore */ }
  };

  /* ---- Delete ---- */
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/quotations/${deleteId}`); setShowDeleteModal(false); setDeleteId(null); fetchData(); } catch { /* ignore */ }
  };

  /* ====================== RENDER ====================== */
  return (
    <>
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Quotation List</h4>
            <h6>Manage Your Quotation</h6>
          </div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Quotation
          </a>
        </div>
      </div>

      {/* ---- Card ---- */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Product filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterProduct || 'Product'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterProduct(''); }}>All</a></li>
                {productNames.map(p => (
                  <li key={p}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterProduct(p); }}>{p}</a></li>
                ))}
              </ul>
            </div>
            {/* Customer filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterCustomer || 'Customer'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCustomer(''); }}>All</a></li>
                {customerNames.map(c => (
                  <li key={c}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCustomer(c); }}>{c}</a></li>
                ))}
              </ul>
            </div>
            {/* Status filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterStatus || 'Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>All</a></li>
                {STATUS_OPTIONS.map(s => (
                  <li key={s}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            {/* Sort */}
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                Sort By: {sortBy === 'asc' ? 'Ascending' : sortBy === 'desc' ? 'Descending' : 'Recently Added'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('recent'); }}>Recently Added</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('asc'); }}>Ascending</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('desc'); }}>Descending</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table datanew">
                <thead>
                  <tr>
                    <th className="no-sort">
                      <label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label>
                    </th>
                    <th>Product Name</th>
                    <th>Customer Name</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4">No quotations found</td></tr>
                  ) : filtered.map(q => (
                    <tr key={q.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(q.id)} onChange={e => handleSelectOne(q.id, e.target.checked)} /><span className="checkmarks"></span></label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center me-2">
                          <a href="#" className="avatar avatar-md me-2">
                            <img src={q.productImage ? mediaUrl(q.productImage) : '/assets/img/products/product1.png'} alt="product" />
                          </a>
                          <a href="#">{q.productName || 'N/A'}</a>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2">
                            <img src={q.customerImage ? mediaUrl(q.customerImage) : '/assets/img/users/user-01.jpg'} alt="customer" />
                          </a>
                          <a href="#">{q.customerName}</a>
                        </div>
                      </td>
                      <td><span className={`badge ${statusBadge(q.status)}`}>{q.status}</span></td>
                      <td>{fmt(q.grandTotal)}</td>
                      <td>
                        <div className="edit-delete-action d-flex align-items-center">
                          <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded" href="#" onClick={e => { e.preventDefault(); openDetail(q); }}>
                            <i data-feather="eye" className="action-eye"></i>
                          </a>
                          <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded" href="#" onClick={e => { e.preventDefault(); openEditModal(q); }}>
                            <i data-feather="edit" className="feather-edit"></i>
                          </a>
                          <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded" href="#" onClick={e => { e.preventDefault(); setDeleteId(q.id); setShowDeleteModal(true); }}>
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

      {/* ===================== Add / Edit Modal ===================== */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingId ? 'Edit Quotation' : 'Add Quotation'}</h4>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <div className="card border-0 mb-0">
                <div className="card-body pb-0">
                  {/* Form fields */}
                  <div className="row">
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3" ref={customerSearchRef}>
                        <label className="form-label">Customer Name<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder="Search customer..." value={customerSearchTerm}
                          onChange={e => { setCustomerSearchTerm(e.target.value); setShowCustomerDropdown(true); }}
                          onFocus={() => setShowCustomerDropdown(true)} />
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <ul className="list-group position-absolute w-100" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto' }}>
                            {filteredCustomers.map(c => (
                              <li key={c.id} className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleCustomerSelect(c)}>
                                {c.name} {c.phone && <small className="text-muted ms-1">{c.phone}</small>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Date<span className="text-danger ms-1">*</span></label>
                        <input type="date" className="form-control" value={form.quotationDate} onChange={e => setForm({ ...form, quotationDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Reference</label>
                        <input type="text" className="form-control" placeholder="Enter reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-12 col-sm-12 col-12">
                      <div className="mb-3" ref={productSearchRef}>
                        <label className="form-label">Product<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder="Please type product code and select" value={productSearchTerm}
                          onChange={e => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }}
                          onFocus={() => setShowProductDropdown(true)} />
                        {showProductDropdown && searchProducts(productSearchTerm).length > 0 && (
                          <ul className="list-group position-absolute w-100" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto' }}>
                            {searchProducts(productSearchTerm).map(p => (
                              <li key={p.id} className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }} onClick={() => handleProductSelect(p)}>
                                <img src={p.images?.[0] ? mediaUrl(p.images[0]) : '/assets/img/products/product1.png'} alt="" className="me-2" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                                <span>{p.productName} <small className="text-muted ms-1">({p.sku})</small></span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items table */}
                  {items.length > 0 && (
                    <div className="table-responsive no-pagination mb-3">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Purchase Price($)</th>
                            <th>Discount($)</th>
                            <th>Tax(%)</th>
                            <th>Tax Amount($)</th>
                            <th>Unit Cost($)</th>
                            <th>Total Cost($)</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={item.productId}>
                              <td>{item.productName}</td>
                              <td>
                                <div className="product-quantity d-flex align-items-center">
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', Math.max(1, item.quantity - 1))}><i data-feather="minus-circle"></i></span>
                                  <input type="number" className="form-control text-center mx-1" style={{ width: 60 }} value={item.quantity}
                                    onChange={e => updateItemField(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', item.quantity + 1)}><i data-feather="plus-circle"></i></span>
                                </div>
                              </td>
                              <td><input type="number" className="form-control" style={{ width: 100 }} value={item.purchasePrice} onChange={e => updateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)} /></td>
                              <td><input type="number" className="form-control" style={{ width: 80 }} value={item.discount} onChange={e => updateItemField(idx, 'discount', parseFloat(e.target.value) || 0)} /></td>
                              <td><input type="number" className="form-control" style={{ width: 70 }} value={item.taxPercent} onChange={e => updateItemField(idx, 'taxPercent', parseFloat(e.target.value) || 0)} /></td>
                              <td>{item.taxAmount.toFixed(2)}</td>
                              <td>{item.unitCost.toFixed(2)}</td>
                              <td>{item.totalCost.toFixed(2)}</td>
                              <td><a href="#" className="text-danger" onClick={e => { e.preventDefault(); removeItem(idx); }}><i data-feather="trash-2"></i></a></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary + Status */}
                  <div className="row">
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Order Tax</label>
                        <input type="number" className="form-control" value={form.orderTax} onChange={e => setForm({ ...form, orderTax: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Discount</label>
                        <input type="number" className="form-control" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Shipping</label>
                        <input type="number" className="form-control" value={form.shipping} onChange={e => setForm({ ...form, shipping: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Status<span className="text-danger ms-1">*</span></label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="row mb-3">
                    <div className="col-12 text-end">
                      <h5>Grand Total: {fmt(grandTotal)}</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={saveQuotation}>{editingId ? 'Update' : 'Submit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Detail Modal ===================== */}
      {showDetailModal && detailQuotation && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Quotation Detail</h4>
                <button type="button" className="close" onClick={() => setShowDetailModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-sm-6">
                    <p className="mb-1"><strong>Reference:</strong> {detailQuotation.reference || '—'}</p>
                    <p className="mb-1"><strong>Customer:</strong> {detailQuotation.customerName}</p>
                    <p className="mb-1"><strong>Date:</strong> {detailQuotation.quotationDate}</p>
                  </div>
                  <div className="col-sm-6 text-sm-end">
                    <p className="mb-1"><strong>Status:</strong> <span className={`badge ${statusBadge(detailQuotation.status)}`}>{detailQuotation.status}</span></p>
                    <p className="mb-1"><strong>Grand Total:</strong> {fmt(detailQuotation.grandTotal)}</p>
                  </div>
                </div>
                {detailQuotation.description && <p className="mb-3"><strong>Description:</strong> {detailQuotation.description}</p>}

                {detailQuotation.items.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Purchase Price</th>
                          <th>Discount</th>
                          <th>Tax %</th>
                          <th>Tax Amount</th>
                          <th>Unit Cost</th>
                          <th>Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailQuotation.items.map(i => (
                          <tr key={i.id}>
                            <td>{i.productName}</td>
                            <td>{i.quantity}</td>
                            <td>{fmt(i.purchasePrice)}</td>
                            <td>{fmt(i.discount)}</td>
                            <td>{i.taxPercent.toFixed(2)}%</td>
                            <td>{fmt(i.taxAmount)}</td>
                            <td>{fmt(i.unitCost)}</td>
                            <td>{fmt(i.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="row mt-3">
                  <div className="col-lg-6 ms-auto">
                    <ul className="list-group">
                      <li className="list-group-item d-flex justify-content-between"><span>Order Tax</span><span>{fmt(detailQuotation.orderTax)}</span></li>
                      <li className="list-group-item d-flex justify-content-between"><span>Discount</span><span>{fmt(detailQuotation.discount)}</span></li>
                      <li className="list-group-item d-flex justify-content-between"><span>Shipping</span><span>{fmt(detailQuotation.shipping)}</span></li>
                      <li className="list-group-item d-flex justify-content-between"><strong>Grand Total</strong><strong>{fmt(detailQuotation.grandTotal)}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Delete Modal ===================== */}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body p-0">
                <div className="success-wrap text-center p-5">
                  <span className="rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: 54, height: 54, backgroundColor: '#fff2f0' }}>
                    <i className="ti ti-trash fs-24 text-danger"></i>
                  </span>
                  <h4 className="mt-3 mb-2">Delete Quotation</h4>
                  <p className="fs-16 mb-3">Are you sure you want to delete quotation?</p>
                  <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>No, Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={confirmDelete}>Yes, Delete</button>
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

export default QuotationList;
