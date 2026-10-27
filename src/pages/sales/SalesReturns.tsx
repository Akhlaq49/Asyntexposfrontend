import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api, { mediaUrl } from '../../services/api';
import { printSalesReturn } from '../../utils/documentPrints';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

/* ---------- Types ---------- */
interface SalesReturnItemDto {
  id: number; productName: string; netUnitPrice: number; stock: number;
  quantity: number; discount: number; taxPercent: number; subtotal: number;
}
interface SalesReturnDto {
  id: number; reference: string; customerId: number | null; customerName: string;
  customerImage: string | null; productId: number | null; productName: string;
  productImage: string | null; orderTax: number; discount: number; shipping: number;
  grandTotal: number; paid: number; due: number; status: string;
  paymentStatus: string; returnDate: string; createdAt: string;
  items: SalesReturnItemDto[];
  /** the POS sale this return belongs to */
  saleId?: number | null; saleReference?: string | null;
}

interface ReturnableLine { saleItemId: number; productId: number; productName: string; quantity: number; unitPrice: number; returned: number; returnable: number }
interface SaleLookup { saleId: number; reference: string; customerName: string; saleDate: string; grandTotal: number; paid: number; orderTax: number; discount: number; itemsTotal: number; items: ReturnableLine[]; previousReturns: string[] }
interface CustomerResult { id: number; name: string; phone?: string; }
interface ProductResult { id: string; productName: string; sku: string; category: string; price: number; images: string[]; }

interface LocalItem {
  productName: string; netUnitPrice: number; stock: number;
  quantity: number; discount: number; taxPercent: number; subtotal: number;
}

const STATUS_OPTIONS = ['Pending', 'Received'];
const PAYMENT_STATUS_OPTIONS = ['Paid', 'Unpaid', 'Overdue'];

const statusBadge = (s: string) => {
  if (s === 'Received') return 'badge-success';
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
  const subtotal = (item.netUnitPrice - item.discount) * item.quantity * (1 + item.taxPercent / 100);
  return { ...item, subtotal: Math.round(subtotal * 100) / 100 };
};

const fmt = (n: number) => `PKR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ======================== Component ======================== */
const SalesReturns: React.FC = () => {
  const { t } = useTranslation();
  const [returns, setReturns] = useState<SalesReturnDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
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
    productId: null as number | null, productName: '', productImage: '',
    reference: '', status: 'Pending', orderTax: 0, discount: 0, shipping: 0,
    returnDate: new Date().toISOString().slice(0, 10),
  });
  const [items, setItems] = useState<LocalItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- Fetch ---- */
  /* return a sale: find it by reference, pick what comes back */
  const [rsOpen, setRsOpen] = useState(false);
  const [rsRef, setRsRef] = useState('');
  const [rsSale, setRsSale] = useState<SaleLookup | null>(null);
  const [rsQty, setRsQty] = useState<Record<number, number | ''>>({});
  const [rsRefund, setRsRefund] = useState<number | ''>('');
  const [rsDate, setRsDate] = useState(new Date().toISOString().slice(0, 10));
  const [rsError, setRsError] = useState('');
  const [rsBusy, setRsBusy] = useState(false);
  const [rsNotice, setRsNotice] = useState('');
  const openReturnSale = () => { setRsOpen(true); setRsRef(''); setRsSale(null); setRsQty({}); setRsRefund(''); setRsError(''); setRsDate(new Date().toISOString().slice(0, 10)); };
  const findSale = async () => {
    if (!rsRef.trim()) { setRsError('Enter the sale reference, e.g. SL001.'); return; }
    setRsBusy(true); setRsError(''); setRsSale(null);
    try {
      const { data } = await api.get<SaleLookup>('/salesreturns/sale-lookup', { params: { reference: rsRef.trim() } });
      setRsSale(data); setRsQty({}); setRsRefund('');
    } catch (err: any) { setRsError(err?.response?.data?.message || 'Sale not found.'); }
    setRsBusy(false);
  };
  // value of what comes back: line prices + its share of the sale's order tax and discount (same as the server)
  const rsLinesValue = rsSale ? rsSale.items.reduce((sum, i) => sum + i.unitPrice * (Number(rsQty[i.saleItemId]) || 0), 0) : 0;
  const rsShare = rsSale && rsSale.itemsTotal > 0 ? rsLinesValue / rsSale.itemsTotal : 0;
  const rsTotal = rsSale ? Math.max(0, Math.round((rsLinesValue + rsSale.orderTax * rsShare - rsSale.discount * rsShare) * 100) / 100) : 0;
  const submitReturnSale = async () => {
    if (!rsSale) return;
    const lines = rsSale.items.map(i => ({ saleItemId: i.saleItemId, quantity: Number(rsQty[i.saleItemId]) || 0 })).filter(l => l.quantity > 0);
    if (lines.length === 0) { setRsError('Enter how many come back for at least one product.'); return; }
    setRsBusy(true); setRsError('');
    try {
      const { data } = await api.post<{ reference: string; grandTotal: number; paid: number }>('/salesreturns/from-sale', {
        saleId: rsSale.saleId, lines, refund: rsRefund === '' ? rsTotal : Number(rsRefund), returnDate: rsDate,
      });
      setRsOpen(false);
      setRsNotice(`Return ${data.reference} saved for sale ${rsSale.reference}: Rs ${data.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} returned, Rs ${data.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })} refunded. The products are back in stock.`);
      fetchData();
    } catch (err: any) { setRsError(err?.response?.data?.message || 'Could not save the return.'); }
    setRsBusy(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cRes, pRes] = await Promise.all([
        api.get<SalesReturnDto[]>('/salesreturns'),
        api.get<CustomerResult[]>('/customers'),
        api.get<ProductResult[]>('/products'),
      ]);
      setReturns(rRes.data);
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
  const customerNames = [...new Set(returns.map(r => r.customerName).filter(Boolean))];

  const filtered = returns
    .filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || r.reference.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q);
      const matchCustomer = !filterCustomer || r.customerName === filterCustomer;
      const matchStatus = !filterStatus || r.status === filterStatus;
      const matchPayment = !filterPaymentStatus || r.paymentStatus === filterPaymentStatus;
      return matchSearch && matchCustomer && matchStatus && matchPayment;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') return a.grandTotal - b.grandTotal;
      if (sortBy === 'desc') return b.grandTotal - a.grandTotal;
      return 0;
    });

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  /* ---- Select ---- */
  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(filtered.map(r => r.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { setSelectedIds(prev => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; }); };

  /* ---- Product search (items) ---- */
  const searchProducts = (term: string) =>
    term.trim().length > 0
      ? products.filter(p => p.productName.toLowerCase().includes(term.toLowerCase()) || p.sku.toLowerCase().includes(term.toLowerCase())).slice(0, 8)
      : [];

  const handleProductSelect = (p: ProductResult) => {
    if (items.find(i => i.productName === p.productName)) { setShowProductDropdown(false); return; }
    setItems([...items, calcItem({ productName: p.productName, netUnitPrice: p.price, stock: 0, quantity: 1, discount: 0, taxPercent: 0, subtotal: p.price })]);
    setProductSearchTerm('');
    setShowProductDropdown(false);

    // Also set as the header product if not yet set
    if (!form.productName) {
      setForm(f => ({ ...f, productId: parseInt(p.id), productName: p.productName, productImage: p.images?.[0] || '' }));
    }
  };

  const updateItemField = (idx: number, field: keyof LocalItem, value: number | string) => {
    setItems(items.map((item, i) => i === idx ? calcItem({ ...item, [field]: typeof value === 'string' ? value : value }) : item));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  /* ---- Grand total ---- */
  const grandTotal = items.reduce((sum, i) => sum + i.subtotal, 0) + form.orderTax + form.shipping - form.discount;

  /* ---- Customer search ---- */
  const filteredCustomers = customerSearchTerm.trim().length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).slice(0, 8)
    : [];

  const handleCustomerSelect = (c: CustomerResult) => {
    setForm({ ...form, customerId: c.id, customerName: c.name });
    setCustomerSearchTerm(c.name);
    setShowCustomerDropdown(false);
  };

  /* ---- Open edit modal (new returns are made with "Return a sale") ---- */

  const openEditModal = (ret: SalesReturnDto) => {
    setEditingId(ret.id);
    setForm({
      customerId: ret.customerId, customerName: ret.customerName, customerImage: ret.customerImage || '',
      productId: ret.productId, productName: ret.productName, productImage: ret.productImage || '',
      reference: ret.reference, status: ret.status, orderTax: ret.orderTax, discount: ret.discount, shipping: ret.shipping,
      returnDate: new Date().toISOString().slice(0, 10),
    });
    setItems(ret.items.map(i => ({
      productName: i.productName, netUnitPrice: i.netUnitPrice, stock: i.stock,
      quantity: i.quantity, discount: i.discount, taxPercent: i.taxPercent, subtotal: i.subtotal,
    })));
    setCustomerSearchTerm(ret.customerName);
    setProductSearchTerm('');
    setShowModal(true);
  };

  /* ---- Save ---- */
  const saveReturn = async () => {
    const paid = 0;
    const payload = {
      reference: form.reference,
      customerId: form.customerId, customerName: form.customerName, customerImage: form.customerImage || null,
      productId: form.productId, productName: form.productName, productImage: form.productImage || null,
      orderTax: form.orderTax, discount: form.discount, shipping: form.shipping,
      grandTotal, paid, due: grandTotal - paid,
      status: form.status, paymentStatus: paid >= grandTotal ? 'Paid' : 'Unpaid',
      returnDate: form.returnDate,
      items: items.map(i => ({
        productName: i.productName, netUnitPrice: i.netUnitPrice, stock: i.stock,
        quantity: i.quantity, discount: i.discount, taxPercent: i.taxPercent, subtotal: i.subtotal,
      })),
    };
    try {
      if (editingId) await api.put(`/salesreturns/${editingId}`, payload);
      else await api.post('/salesreturns', payload);
      setShowModal(false);
      fetchData();
    } catch { /* ignore */ }
  };

  /* ---- Delete ---- */
  const confirmDelete = async () => {
    if (!deleteId) return;
    await api.delete(`/salesreturns/${deleteId}`); setShowDeleteModal(false); setDeleteId(null); fetchData();
  };

  /* ====================== RENDER ====================== */
  return (
    <>
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>{t('sales_returns.title')}</h4>
            <h6>{t('sales_returns.subtitle')}</h6>
          </div>
        </div>
        <div className="page-btn d-flex gap-2">
          <a href="#" className="btn btn-success" onClick={e => { e.preventDefault(); openReturnSale(); }}>
            <i className="ti ti-receipt-refund me-1"></i>Return a sale
          </a>
        </div>
      </div>

      {/* ---- Card ---- */}
      {rsNotice && (
        <div className="alert alert-success d-flex justify-content-between align-items-center py-2">
          <span>{rsNotice}</span><button type="button" className="btn-close" onClick={() => setRsNotice('')} />
        </div>
      )}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Customer filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterCustomer || t('common.customer')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCustomer(''); }}>{t('common.all')}</a></li>
                {customerNames.map(c => (
                  <li key={c}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCustomer(c); }}>{c}</a></li>
                ))}
              </ul>
            </div>
            {/* Status filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterStatus || t('common.status')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>{t('common.all')}</a></li>
                {STATUS_OPTIONS.map(s => (
                  <li key={s}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            {/* Payment Status filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterPaymentStatus || t('common.payment_status')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterPaymentStatus(''); }}>{t('common.all')}</a></li>
                {PAYMENT_STATUS_OPTIONS.map(s => (
                  <li key={s}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterPaymentStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            {/* Sort */}
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {t('common.sort_by')} {sortBy === 'asc' ? 'Lowest amount first' : sortBy === 'desc' ? 'Highest amount first' : t('common.recently_added')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('recent'); }}>{t('common.recently_added')}</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('asc'); }}>{'Lowest amount first'}</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('desc'); }}>{'Highest amount first'}</a></li>
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
                    <th>{t('common.product')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('common.customer')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.total')}</th>
                    <th>{t('common.paid')}</th>
                    <th>{t('common.due')}</th>
                    <th>{t('common.payment_status')}</th>
                    <th className="text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-4">{t('sales_returns.no_returns')}</td></tr>
                  ) : paginatedData.map(r => (
                    <tr key={r.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={e => handleSelectOne(r.id, e.target.checked)} /><span className="checkmarks"></span></label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2">
                            <img src={r.productImage ? mediaUrl(r.productImage) : '/assets/img/products/product1.png'} alt="" />
                          </a>
                          <div>
                            <a href="#">{r.productName || 'N/A'}</a>
                            <div><small className="text-muted">{r.reference}{r.saleReference ? ` - return of sale ${r.saleReference}` : ''}</small></div>
                          </div>
                        </div>
                      </td>
                      <td>{r.returnDate}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2">
                            <img src={r.customerImage ? mediaUrl(r.customerImage) : '/assets/img/users/user-01.jpg'} alt="" />
                          </a>
                          <a href="#">{r.customerName}</a>
                        </div>
                      </td>
                      <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                      <td>{fmt(r.grandTotal)}</td>
                      <td>{fmt(r.paid)}</td>
                      <td>{fmt(r.due)}</td>
                      <td>
                        <span className={`badge ${paymentStatusBadge(r.paymentStatus)} shadow-none badge-xs`}>
                          <i className="ti ti-point-filled me-1"></i>{r.paymentStatus}
                        </span>
                      </td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown" aria-expanded="false">
                          <i className="fa fa-ellipsis-v" aria-hidden="true"></i>
                        </a>
                        <ul className="dropdown-menu">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); printSalesReturn(r); }}><i className="ti ti-printer info-img me-2"></i>Print return</a></li>
                          {!r.saleId && <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); openEditModal(r); }}><i data-feather="edit" className="info-img"></i>{t('sales_returns.edit_return')}</a></li>}
                          <li><a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(r.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>{t('sales_returns.delete_return')}</a></li>
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

      {/* ===================== Add / Edit Modal ===================== */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingId ? t('sales_returns.edit_return') : t('sales_returns.add_return')}</h4>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <div className="card border-0 mb-0">
                <div className="card-body pb-0">
                  {/* Form fields */}
                  <div className="row">
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3" ref={customerSearchRef}>
                        <label className="form-label">{t('sales_returns.customer_name')}<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder={t('sales.search_customer')} value={customerSearchTerm}
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
                        <label className="form-label">{t('common.date')}<span className="text-danger ms-1">*</span></label>
                        <input type="date" className="form-control" value={form.returnDate} onChange={e => setForm({ ...form, returnDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.reference')}</label>
                        <input type="text" className="form-control" placeholder={t('sales_returns.enter_reference')} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-12 col-sm-12 col-12">
                      <div className="mb-3" ref={productSearchRef}>
                        <label className="form-label">{t('common.product_name')}<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder={t('sales_returns.search_product')} value={productSearchTerm}
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
                            <th>{t('common.product_name')}</th>
                            <th>{t('sales_returns.net_unit_price')}</th>
                            <th>{t('sales_returns.stock')}</th>
                            <th>{t('sales_returns.qty')}</th>
                            <th>{t('sales_returns.discount')}</th>
                            <th>{t('sales_returns.tax')}</th>
                            <th>{t('sales_returns.subtotal')}</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.productName}</td>
                              <td>
                                <input type="number" className="form-control" style={{ width: 100 }} value={item.netUnitPrice || ''}
                                  onChange={e => updateItemField(idx, 'netUnitPrice', parseFloat(e.target.value) || 0)} />
                              </td>
                              <td>
                                <input type="number" className="form-control" style={{ width: 70 }} value={item.stock || ''}
                                  onChange={e => updateItemField(idx, 'stock', parseInt(e.target.value) || 0)} />
                              </td>
                              <td>
                                <div className="product-quantity d-flex align-items-center">
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', Math.max(1, item.quantity - 1))}><i data-feather="minus-circle"></i></span>
                                  <input type="number" className="form-control text-center mx-1" style={{ width: 60 }} value={item.quantity || ''}
                                    onChange={e => updateItemField(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', item.quantity + 1)}><i data-feather="plus-circle"></i></span>
                                </div>
                              </td>
                              <td>
                                <input type="number" className="form-control" style={{ width: 80 }} value={item.discount || ''}
                                  onChange={e => updateItemField(idx, 'discount', parseFloat(e.target.value) || 0)} />
                              </td>
                              <td>
                                <input type="number" className="form-control" style={{ width: 70 }} value={item.taxPercent || ''}
                                  onChange={e => updateItemField(idx, 'taxPercent', parseFloat(e.target.value) || 0)} />
                              </td>
                              <td>{fmt(item.subtotal)}</td>
                              <td><a href="#" className="text-danger" onClick={e => { e.preventDefault(); removeItem(idx); }}><i data-feather="trash-2"></i></a></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Summary fields */}
                  <div className="row">
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.order_tax')}</label>
                        <input type="number" className="form-control" value={form.orderTax || ''} onChange={e => setForm({ ...form, orderTax: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.discount')}</label>
                        <input type="number" className="form-control" value={form.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.shipping')}</label>
                        <input type="number" className="form-control" value={form.shipping || ''} onChange={e => setForm({ ...form, shipping: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.status')}<span className="text-danger ms-1">*</span></label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="row mb-3">
                    <div className="col-12 text-end">
                      <h5>{t('common.grand_total')}: {fmt(grandTotal)}</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={saveReturn}>{editingId ? t('common.update') : t('common.submit')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Delete Modal ===================== */}
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
      {/* ===================== Return a sale ===================== */}
      {rsOpen && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Return a sale</h4>
                <button type="button" className="btn-close" onClick={() => setRsOpen(false)} disabled={rsBusy} />
              </div>
              <div className="modal-body">
                <label className="form-label">Sale reference</label>
                <div className="input-group mb-3" style={{ maxWidth: 380 }}>
                  <input className="form-control" placeholder="e.g. SL001" value={rsRef} autoFocus
                    onChange={e => setRsRef(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); findSale(); } }} />
                  <button className="btn btn-primary" onClick={findSale} disabled={rsBusy}><i className="ti ti-search me-1"></i>Find</button>
                </div>
                {rsSale && (
                  <>
                    <div className="d-flex flex-wrap gap-4 p-2 mb-3 bg-light rounded">
                      <span><small className="text-muted d-block">Sale</small><strong>{rsSale.reference}</strong></span>
                      <span><small className="text-muted d-block">Customer</small>{rsSale.customerName}</span>
                      <span><small className="text-muted d-block">Date</small>{new Date(rsSale.saleDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span><small className="text-muted d-block">Sale total</small>Rs {rsSale.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      {rsSale.previousReturns.length > 0 && <span><small className="text-muted d-block">Earlier returns</small>{rsSale.previousReturns.join(', ')}</span>}
                    </div>
                    <table className="table table-sm align-middle">
                      <thead className="thead-light"><tr><th>Product</th><th className="text-end">Sold</th><th className="text-end">Returned</th><th className="text-end">Unit price</th><th style={{ width: 130 }}>Returning now</th></tr></thead>
                      <tbody>{rsSale.items.map(i => (
                        <tr key={i.saleItemId} className={i.returnable === 0 ? 'text-muted' : ''}>
                          <td>{i.productName}</td><td className="text-end">{i.quantity}</td><td className="text-end">{i.returned}</td>
                          <td className="text-end">Rs {i.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td>
                            <input type="number" min={0} max={i.returnable} step={1} className="form-control form-control-sm" disabled={i.returnable === 0}
                              placeholder={i.returnable === 0 ? 'all returned' : `max ${i.returnable}`} value={rsQty[i.saleItemId] ?? ''}
                              onKeyDown={e => { if (['.', ',', 'e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                              onChange={e => { const v = e.target.value === '' ? '' : Math.min(i.returnable, Math.max(0, parseInt(e.target.value, 10) || 0)); setRsQty({ ...rsQty, [i.saleItemId]: v }); }} />
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                    <div className="row align-items-end">
                      <div className="col-md-4 mb-3"><label className="form-label">Return date</label><input type="date" className="form-control" value={rsDate} onChange={e => setRsDate(e.target.value)} /></div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Refund to customer (Rs)</label>
                        <input type="number" min={0} step="any" className="form-control" placeholder={String(rsTotal)} value={rsRefund}
                          onChange={e => setRsRefund(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                        <small className="text-muted">Empty = refund the full value</small>
                      </div>
                      <div className="col-md-4 mb-3 text-end"><small className="text-muted d-block">Value returned</small><span className="fw-bold" style={{ fontSize: 22 }}>Rs {rsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    </div>
                    <small className="text-muted">The products go back into stock. The value includes this part's share of the sale's order tax and discount.</small>
                  </>
                )}
                {rsError && <div className="alert alert-danger py-2 mt-3 mb-0">{rsError}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRsOpen(false)} disabled={rsBusy}>Cancel</button>
                {rsSale && <button className="btn btn-success" onClick={submitReturnSale} disabled={rsBusy || rsTotal <= 0}><i className="ti ti-receipt-refund me-1"></i>{rsBusy ? 'Saving...' : 'Save return'}</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={confirmDelete} />
    </>
  );
};

export default SalesReturns;
