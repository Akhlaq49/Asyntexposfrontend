import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';

/* ---------- Types ---------- */
interface SaleItemDto {
  id: number; productId: number; productName: string; quantity: number;
  purchasePrice: number; discount: number; taxPercent: number; taxAmount: number;
  unitCost: number; totalCost: number;
}
interface SalePaymentDto {
  id: number; reference: string; receivedAmount: number; payingAmount: number;
  paymentType: string; description: string | null; paymentDate: string;
}
interface SaleDto {
  id: number; reference: string; customerId: number | null; customerName: string;
  customerImage: string | null; biller: string; grandTotal: number; paid: number;
  due: number; orderTax: number; discount: number; shipping: number;
  status: string; paymentStatus: string; notes: string | null; saleDate: string;
  items: SaleItemDto[]; payments: SalePaymentDto[];
}
interface CustomerResult { id: number; name: string; phone?: string; }
interface ProductResult { id: string; productName: string; sku: string; category: string; price: number; images: string[]; }

interface LocalItem {
  productId: number; productName: string; quantity: number; purchasePrice: number;
  discount: number; taxPercent: number; taxAmount: number; unitCost: number; totalCost: number;
}

const STATUS_OPTIONS = ['Completed', 'Pending'];
const PAYMENT_STATUS_OPTIONS = ['Paid', 'Unpaid', 'Overdue'];
const PAYMENT_TYPES = ['Cash', 'Online'];

const statusBadge = (s: string) => {
  if (s === 'Completed') return 'badge-success';
  if (s === 'Pending') return 'badge-cyan';
  return 'badge-secondary';
};

const paymentStatusBadge = (s: string) => {
  if (s === 'Paid') return 'badge-soft-success';
  if (s === 'Unpaid') return 'badge-soft-danger';
  if (s === 'Overdue') return 'badge-soft-warning';
  return 'badge-soft-secondary';
};

const calcItem = (item: LocalItem): LocalItem => {
  const taxAmount = (item.purchasePrice * item.taxPercent) / 100;
  const unitCost = item.purchasePrice - item.discount + taxAmount;
  const totalCost = unitCost * item.quantity;
  return { ...item, taxAmount, unitCost, totalCost };
};

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ======================== Component ======================== */
const OnlineOrders: React.FC = () => {
  const [sales, setSales] = useState<SaleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  /* select */
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* add/edit modal */
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    customerId: null as number | null, customerName: '', customerImage: '',
    biller: 'Admin', status: 'Pending', orderTax: 0, discount: 0, shipping: 0, notes: ''
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
  const [detailSale, setDetailSale] = useState<SaleDto | null>(null);

  /* show payments modal */
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [paymentsSale, setPaymentsSale] = useState<SaleDto | null>(null);

  /* create / edit payment modal */
  const [showPaymentFormModal, setShowPaymentFormModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({ reference: '', receivedAmount: 0, payingAmount: 0, paymentType: 'Cash', description: '' });
  const [paymentSaleId, setPaymentSaleId] = useState<number | null>(null);

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- Fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes, pRes] = await Promise.all([
        api.get<SaleDto[]>('/sales?source=online'),
        api.get<CustomerResult[]>('/customers'),
        api.get<ProductResult[]>('/products'),
      ]);
      setSales(sRes.data);
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
  const filtered = sales
    .filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || s.reference.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q);
      const matchStatus = !filterStatus || s.status === filterStatus;
      const matchPayment = !filterPaymentStatus || s.paymentStatus === filterPaymentStatus;
      return matchSearch && matchStatus && matchPayment;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') return a.grandTotal - b.grandTotal;
      if (sortBy === 'desc') return b.grandTotal - a.grandTotal;
      return 0;
    });

  /* ---- Select ---- */
  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(filtered.map((s) => s.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { setSelectedIds((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; }); };

  /* ---- Product search ---- */
  const searchProducts = (term: string) =>
    term.trim().length > 0
      ? products.filter((p) => p.productName.toLowerCase().includes(term.toLowerCase()) || p.sku.toLowerCase().includes(term.toLowerCase())).slice(0, 8)
      : [];

  const handleProductSelect = (p: ProductResult) => {
    const pid = parseInt(p.id);
    if (items.find((i) => i.productId === pid)) { setShowProductDropdown(false); return; }
    setItems([...items, calcItem({ productId: pid, productName: p.productName, quantity: 1, purchasePrice: p.price, discount: 0, taxPercent: 0, taxAmount: 0, unitCost: p.price, totalCost: p.price })]);
    setProductSearchTerm('');
    setShowProductDropdown(false);
  };

  const updateItemField = (idx: number, field: keyof LocalItem, value: number) => {
    setItems(items.map((item, i) => i === idx ? calcItem({ ...item, [field]: value }) : item));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  /* ---- Grand total ---- */
  const grandTotal = items.reduce((sum, i) => sum + i.totalCost, 0) + form.orderTax + form.shipping - form.discount;

  /* ---- Customer search ---- */
  const filteredCustomers = customerSearchTerm.trim().length > 0
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).slice(0, 8)
    : [];

  const handleCustomerSelect = (c: CustomerResult) => {
    setForm({ ...form, customerId: c.id, customerName: c.name });
    setCustomerSearchTerm(c.name);
    setShowCustomerDropdown(false);
  };

  /* ---- Open add/edit modal ---- */
  const openAddModal = () => {
    setEditingId(null);
    setForm({ customerId: null, customerName: '', customerImage: '', biller: 'Admin', status: 'Pending', orderTax: 0, discount: 0, shipping: 0, notes: '' });
    setItems([]);
    setCustomerSearchTerm('');
    setProductSearchTerm('');
    setShowModal(true);
  };

  const openEditModal = (sale: SaleDto) => {
    setEditingId(sale.id);
    setForm({
      customerId: sale.customerId, customerName: sale.customerName, customerImage: sale.customerImage || '',
      biller: sale.biller, status: sale.status, orderTax: sale.orderTax, discount: sale.discount, shipping: sale.shipping, notes: sale.notes || ''
    });
    setItems(sale.items.map((i) => ({
      productId: i.productId, productName: i.productName, quantity: i.quantity,
      purchasePrice: i.purchasePrice, discount: i.discount, taxPercent: i.taxPercent,
      taxAmount: i.taxAmount, unitCost: i.unitCost, totalCost: i.totalCost
    })));
    setCustomerSearchTerm(sale.customerName);
    setProductSearchTerm('');
    setShowModal(true);
  };

  /* ---- Save sale ---- */
  const saveSale = async () => {
    const payload = {
      customerId: form.customerId, customerName: form.customerName, customerImage: form.customerImage || null,
      biller: form.biller, grandTotal, orderTax: form.orderTax, discount: form.discount,
      shipping: form.shipping, status: form.status, notes: form.notes || null,
      items: items.map((i) => ({
        productId: i.productId, productName: i.productName, quantity: i.quantity,
        purchasePrice: i.purchasePrice, discount: i.discount, taxPercent: i.taxPercent,
        taxAmount: i.taxAmount, unitCost: i.unitCost, totalCost: i.totalCost
      }))
    };
    try {
      if (editingId) await api.put(`/sales/${editingId}`, payload);
      else await api.post('/sales', { ...payload, source: 'online' });
      setShowModal(false);
      fetchData();
    } catch { /* ignore */ }
  };

  /* ---- Delete ---- */
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/sales/${deleteId}`); setShowDeleteModal(false); setDeleteId(null); fetchData(); } catch { /* ignore */ }
  };

  /* ---- Detail modal ---- */
  const openDetail = (sale: SaleDto) => { setDetailSale(sale); setShowDetailModal(true); };

  /* ---- Payments modal ---- */
  const openPayments = (sale: SaleDto) => { setPaymentsSale(sale); setShowPaymentsModal(true); };

  /* ---- Create payment ---- */
  const openCreatePayment = (saleId: number) => {
    setPaymentSaleId(saleId);
    setEditingPaymentId(null);
    setPaymentForm({ reference: '', receivedAmount: 0, payingAmount: 0, paymentType: 'Cash', description: '' });
    setShowPaymentFormModal(true);
  };

  const openEditPayment = (saleId: number, payment: SalePaymentDto) => {
    setPaymentSaleId(saleId);
    setEditingPaymentId(payment.id);
    setPaymentForm({ reference: payment.reference, receivedAmount: payment.receivedAmount, payingAmount: payment.payingAmount, paymentType: payment.paymentType, description: payment.description || '' });
    setShowPaymentFormModal(true);
  };

  const savePayment = async () => {
    if (!paymentSaleId) return;
    try {
      if (editingPaymentId) await api.put(`/sales/${paymentSaleId}/payments/${editingPaymentId}`, paymentForm);
      else await api.post(`/sales/${paymentSaleId}/payments`, paymentForm);
      setShowPaymentFormModal(false);
      fetchData();
      const res = await api.get<SaleDto>(`/sales/${paymentSaleId}`);
      setPaymentsSale(res.data);
    } catch { /* ignore */ }
  };

  const deletePayment = async (saleId: number, paymentId: number) => {
    try {
      await api.delete(`/sales/${saleId}/payments/${paymentId}`);
      fetchData();
      const res = await api.get<SaleDto>(`/sales/${saleId}`);
      setPaymentsSale(res.data);
    } catch { /* ignore */ }
  };

  /* ====================== RENDER ====================== */
  return (
    <>
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Sales</h4>
            <h6>Manage Your Sales</h6>
          </div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openAddModal(); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Sales
          </a>
        </div>
      </div>

      {/* ---- Card ---- */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterStatus || 'Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterStatus(''); }}>All</a></li>
                {STATUS_OPTIONS.map((s) => (
                  <li key={s}><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterPaymentStatus || 'Payment Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterPaymentStatus(''); }}>All</a></li>
                {PAYMENT_STATUS_OPTIONS.map((s) => (
                  <li key={s}><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterPaymentStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                Sort By: {sortBy === 'asc' ? 'Amount Asc' : sortBy === 'desc' ? 'Amount Desc' : 'Recent'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setSortBy('recent'); }}>Recent</a></li>
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setSortBy('asc'); }}>Amount Asc</a></li>
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setSortBy('desc'); }}>Amount Desc</a></li>
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
                      <label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label>
                    </th>
                    <th>Customer</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Grand Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Payment Status</th>
                    <th>Biller</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-4">No sales found</td></tr>
                  ) : filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={(e) => handleSelectOne(s.id, e.target.checked)} /><span className="checkmarks"></span></label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2">
                            <img src={s.customerImage ? mediaUrl(s.customerImage) : '/assets/img/users/user-01.jpg'} alt="" />
                          </a>
                          <a href="#">{s.customerName}</a>
                        </div>
                      </td>
                      <td>{s.reference}</td>
                      <td>{s.saleDate}</td>
                      <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                      <td>{fmt(s.grandTotal)}</td>
                      <td>{fmt(s.paid)}</td>
                      <td>{fmt(s.due)}</td>
                      <td>
                        <span className={`badge ${paymentStatusBadge(s.paymentStatus)} shadow-none badge-xs`}>
                          <i className="ti ti-point-filled me-1"></i>{s.paymentStatus}
                        </span>
                      </td>
                      <td>{s.biller}</td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown" aria-expanded="false">
                          <i className="fa fa-ellipsis-v" aria-hidden="true"></i>
                        </a>
                        <ul className="dropdown-menu">
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openDetail(s); }}><i data-feather="eye" className="info-img"></i>Sale Detail</a></li>
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openEditModal(s); }}><i data-feather="edit" className="info-img"></i>Edit Sale</a></li>
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openPayments(s); }}><i data-feather="dollar-sign" className="info-img"></i>Show Payments</a></li>
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openCreatePayment(s.id); }}><i data-feather="plus-circle" className="info-img"></i>Create Payment</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={(e) => { e.preventDefault(); setDeleteId(s.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>Delete Sale</a></li>
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===================== Add / Edit Sale Modal ===================== */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingId ? 'Edit Sales' : 'Add Sales'}</h4>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <div className="card border-0 mb-0">
                <div className="card-body pb-0">
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
                                  <input type="number" className="form-control text-center mx-1" style={{ width: 60 }} value={item.quantity} onChange={(e) => updateItemField(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', item.quantity + 1)}><i data-feather="plus-circle"></i></span>
                                </div>
                              </td>
                              <td><input type="number" className="form-control" style={{ width: 100 }} value={item.purchasePrice} onChange={(e) => updateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)} /></td>
                              <td><input type="number" className="form-control" style={{ width: 80 }} value={item.discount} onChange={(e) => updateItemField(idx, 'discount', parseFloat(e.target.value) || 0)} /></td>
                              <td><input type="number" className="form-control" style={{ width: 70 }} value={item.taxPercent} onChange={(e) => updateItemField(idx, 'taxPercent', parseFloat(e.target.value) || 0)} /></td>
                              <td>{item.taxAmount.toFixed(2)}</td>
                              <td>{item.unitCost.toFixed(2)}</td>
                              <td>{item.totalCost.toFixed(2)}</td>
                              <td><a href="#" className="text-danger" onClick={(e) => { e.preventDefault(); removeItem(idx); }}><i data-feather="trash-2"></i></a></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Form fields */}
                  <div className="row">
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3" ref={customerSearchRef}>
                        <label className="form-label">Customer Name<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder="Search customer..." value={customerSearchTerm}
                          onChange={(e) => { setCustomerSearchTerm(e.target.value); setShowCustomerDropdown(true); }}
                          onFocus={() => setShowCustomerDropdown(true)} />
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <ul className="list-group position-absolute w-100" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto' }}>
                            {filteredCustomers.map((c) => (
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
                        <input type="date" className="form-control" defaultValue={new Date().toISOString().slice(0, 10)} />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Biller<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" value={form.biller} onChange={(e) => setForm({ ...form, biller: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-12 col-sm-6 col-12">
                      <div className="mb-3" ref={productSearchRef}>
                        <label className="form-label">Product<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder="Please type product code and select" value={productSearchTerm}
                          onChange={(e) => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }}
                          onFocus={() => setShowProductDropdown(true)} />
                        {showProductDropdown && searchProducts(productSearchTerm).length > 0 && (
                          <ul className="list-group position-absolute w-100" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto' }}>
                            {searchProducts(productSearchTerm).map((p) => (
                              <li key={p.id} className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleProductSelect(p)}>
                                {p.productName} <small className="text-muted ms-1">({p.sku})</small>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Totals summary */}
                  <div className="row">
                    <div className="col-lg-6 ms-auto">
                      <div className="total-order w-100 max-widthauto m-auto mb-4">
                        <ul className="border-1 rounded-2 list-unstyled mb-0">
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">Order Tax</h6><span>{fmt(form.orderTax)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">Discount</h6><span>{fmt(form.discount)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">Shipping</h6><span>{fmt(form.shipping)}</span></li>
                          <li className="d-flex justify-content-between p-2"><h6 className="mb-0 fw-bold">Grand Total</h6><span className="fw-bold">{fmt(grandTotal)}</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Additional fields */}
                  <div className="row">
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Order Tax<span className="text-danger ms-1">*</span></label>
                        <input type="number" className="form-control" value={form.orderTax} onChange={(e) => setForm({ ...form, orderTax: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Discount<span className="text-danger ms-1">*</span></label>
                        <input type="number" className="form-control" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Shipping<span className="text-danger ms-1">*</span></label>
                        <input type="number" className="form-control" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Status<span className="text-danger ms-1">*</span></label>
                        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    {editingId && (
                      <div className="col-lg-12">
                        <div className="mb-3">
                          <label className="form-label">Notes</label>
                          <textarea className="form-control" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-3" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={saveSale}>{editingId ? 'Save Changes' : 'Submit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Sale Detail Modal ===================== */}
      {showDetailModal && detailSale && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="page-header p-4 border-bottom mb-0">
                <div className="add-item d-flex align-items-center">
                  <h4 className="mb-0 me-2">Sales Detail</h4>
                </div>
                <div className="page-btn">
                  <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                    <i data-feather="arrow-left" className="me-2"></i>Back to Sales
                  </button>
                </div>
              </div>
              <div className="card border-0 mb-0">
                <div className="card-body pb-0">
                  {/* Info boxes */}
                  <div className="row sales-details-items d-flex mb-3">
                    <div className="col-md-4">
                      <h6>Customer Info</h6>
                      <h5 className="mb-1">{detailSale.customerName}</h5>
                    </div>
                    <div className="col-md-4">
                      <h6>Invoice Info</h6>
                      <p className="mb-0">Reference: <span className="fs-16 text-primary ms-2">#{detailSale.reference}</span></p>
                      <p className="mb-0">Date: <span className="ms-2 text-muted">{detailSale.saleDate}</span></p>
                      <p className="mb-0">Status: <span className={`badge ${statusBadge(detailSale.status)} ms-2`}>{detailSale.status}</span></p>
                      <p className="mb-0">Payment Status: <span className={`badge ${paymentStatusBadge(detailSale.paymentStatus)} shadow-none badge-xs ms-2`}><i className="ti ti-point-filled"></i>{detailSale.paymentStatus}</span></p>
                    </div>
                    <div className="col-md-4">
                      <h6>Biller</h6>
                      <p className="mb-0">{detailSale.biller}</p>
                    </div>
                  </div>

                  <h5 className="mb-3">Order Summary</h5>
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
                        </tr>
                      </thead>
                      <tbody>
                        {detailSale.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.productName}</td>
                            <td>{item.quantity}</td>
                            <td>{item.purchasePrice.toFixed(2)}</td>
                            <td>{item.discount.toFixed(2)}</td>
                            <td>{item.taxPercent.toFixed(2)}</td>
                            <td>{item.taxAmount.toFixed(2)}</td>
                            <td>{item.unitCost.toFixed(2)}</td>
                            <td>{item.totalCost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="row">
                    <div className="col-lg-6 ms-auto">
                      <div className="total-order w-100 max-widthauto m-auto mb-4">
                        <ul className="border-1 rounded-1 list-unstyled mb-0">
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">Order Tax</h6><span>{fmt(detailSale.orderTax)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">Discount</h6><span>{fmt(detailSale.discount)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">Grand Total</h6><span className="fw-bold">{fmt(detailSale.grandTotal)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">Paid</h6><span>{fmt(detailSale.paid)}</span></li>
                          <li className="d-flex justify-content-between p-2"><h6 className="mb-0">Due</h6><span>{fmt(detailSale.due)}</span></li>
                        </ul>
                      </div>
                    </div>
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

      {/* ===================== Show Payments Modal ===================== */}
      {showPaymentsModal && paymentsSale && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Show Payments - {paymentsSale.reference}</h4>
                <button type="button" className="close" onClick={() => setShowPaymentsModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reference</th>
                        <th>Amount</th>
                        <th>Paid By</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsSale.payments.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-3">No payments recorded</td></tr>
                      ) : paymentsSale.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.paymentDate}</td>
                          <td>{p.reference}</td>
                          <td>{fmt(p.payingAmount)}</td>
                          <td>{p.paymentType}</td>
                          <td>
                            <div className="edit-delete-action d-flex align-items-center">
                              <a className="me-3 p-2 border rounded d-flex align-items-center" href="#" onClick={(e) => { e.preventDefault(); openEditPayment(paymentsSale.id, p); }}>
                                <i data-feather="edit"></i>
                              </a>
                              <a className="p-2 border rounded d-flex align-items-center" href="#" onClick={(e) => { e.preventDefault(); deletePayment(paymentsSale.id, p.id); }}>
                                <i data-feather="trash-2"></i>
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
        </div>
      )}

      {/* ===================== Create / Edit Payment Modal ===================== */}
      {showPaymentFormModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingPaymentId ? 'Edit Payment' : 'Create Payment'}</h4>
                <button type="button" className="close" onClick={() => setShowPaymentFormModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Date<span className="text-danger ms-1">*</span></label>
                      <input type="date" className="form-control" defaultValue={new Date().toISOString().slice(0, 10)} />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Reference<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">Received Amount<span className="text-danger ms-1">*</span></label>
                      <input type="number" className="form-control" value={paymentForm.receivedAmount} onChange={(e) => setPaymentForm({ ...paymentForm, receivedAmount: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">Paying Amount<span className="text-danger ms-1">*</span></label>
                      <input type="number" className="form-control" value={paymentForm.payingAmount} onChange={(e) => setPaymentForm({ ...paymentForm, payingAmount: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">Payment Type<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={paymentForm.paymentType} onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}>
                        {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" rows={3} value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} />
                      <p className="text-muted mb-0">Maximum 60 Characters</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => setShowPaymentFormModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={savePayment}>{editingPaymentId ? 'Save Changes' : 'Submit'}</button>
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
                <div className="success-wrap text-center p-4">
                  <div className="icon-success bg-danger-transparent text-danger mb-2" style={{ width: 50, height: 50, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-trash fs-20"></i>
                  </div>
                  <h3 className="mb-2">Delete Sale</h3>
                  <p className="fs-16 mb-3">Are you sure you want to delete this sale?</p>
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteId(null); }}>No, Cancel</button>
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

export default OnlineOrders;
