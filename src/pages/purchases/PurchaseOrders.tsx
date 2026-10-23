import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import { printDocument } from '../../utils/printDocument';
import DateFilters, { DateFilterValue, EMPTY_DATE_FILTER, matchesDateFilter, describeDateFilter } from '../../components/common/DateFilters';
import TaxSelector, { AppliedTax, cleanTaxes, taxTotal } from '../../components/common/TaxSelector';
import { usePagination } from '../../utils/usePagination';
import { mediaUrl } from '../../services/api';
import { getParties, Party } from '../../services/partyService';
import { getProducts, ProductResponse, createProduct, getCategories, getUnits, DropdownOption } from '../../services/productService';
import {
  PurchaseOrder, PurchaseOrderStatus, SavePurchaseOrderPayload, apiError,
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, markPurchaseOrderOrdered,
  receivePurchaseOrder, cancelPurchaseOrder, deletePurchaseOrder,
} from '../../services/purchaseOrderService';

/* ────────────────────────── helpers ────────────────────────── */

const money = (n: number) => `Rs ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const dateOnly = (d?: string | null) => (d ? d.slice(0, 10) : '');
const showDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

const STATUS: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  Draft: { label: 'Draft', cls: 'bg-secondary' },
  Ordered: { label: 'Ordered', cls: 'bg-info' },
  PartiallyReceived: { label: 'Partially Received', cls: 'bg-warning' },
  Received: { label: 'Received', cls: 'bg-success' },
  Cancelled: { label: 'Cancelled', cls: 'bg-danger' },
};
const canEdit = (po: PurchaseOrder) => (po.status === 'Draft' || po.status === 'Ordered') && po.receivedUnits === 0;
const canReceive = (po: PurchaseOrder) => po.status === 'Draft' || po.status === 'Ordered' || po.status === 'PartiallyReceived';
const canCancel = (po: PurchaseOrder) => po.status !== 'Received' && po.status !== 'Cancelled';
const canDelete = (po: PurchaseOrder) => po.receivedUnits === 0 && po.receipts.length === 0;

interface FormLine { productId: number; productName: string; sku?: string; image?: string; quantity: number | ''; unitCost: number | ''; discount: number | ''; taxPercent: number | '' }
interface FormState {
  id?: number; supplierId: number | ''; supplierName: string; orderDate: string; expectedDate: string;
  orderTax: number | ''; shipping: number | ''; discount: number | ''; notes: string; lines: FormLine[];
  taxes: AppliedTax[];
}
const emptyForm = (): FormState => ({ supplierId: '', supplierName: '', orderDate: today(), expectedDate: '', orderTax: '', shipping: '', discount: '', notes: '', lines: [], taxes: [] });
const num = (v: number | '') => (v === '' ? 0 : Number(v));
const lineTotal = (l: FormLine) => {
  const gross = num(l.quantity) * num(l.unitCost);
  const disc = Math.min(num(l.discount), gross);
  return gross - disc + ((gross - disc) * num(l.taxPercent)) / 100;
};

/* ────────────────────────── page ────────────────────────── */

const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
  const [toast, setToast] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [units, setUnits] = useState<DropdownOption[]>([]);
  // quick "new product" panel (product not in inventory yet -> created with 0 stock)
  const [newProduct, setNewProduct] = useState<{ name: string; sku: string; category: string; unit: string; price: number | ''; cost: number | ''; quantity: number | '' } | null>(null);
  const [newProductError, setNewProductError] = useState('');

  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<number, number | ''>>({});
  const [receiveDate, setReceiveDate] = useState(today());
  const [receivePaid, setReceivePaid] = useState<number | ''>('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveError, setReceiveError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [printing, setPrinting] = useState<PurchaseOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const toastTimer = useRef<number>();
  const flash = (type: 'success' | 'danger', text: string) => {
    window.clearTimeout(toastTimer.current); // a newer message must not be hidden by an older one's timer
    setToast({ type, text });
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await getPurchaseOrders()); } catch (e) { flash('danger', apiError(e, 'Could not load purchase orders')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadLookups = useCallback(async () => {
    const [s, p] = await Promise.all([getParties('Supplier'), getProducts().catch(() => [])]);
    setSuppliers(s.filter((x) => x.isActive !== false));
    setProducts(p);
    getCategories().then(setCategories).catch(() => setCategories([]));
    getUnits().then(setUnits).catch(() => setUnits([]));
  }, []);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  /** replace one order in the list (and in the open detail view) after an action */
  const upsert = (po: PurchaseOrder) => {
    setOrders((list) => (list.some((o) => o.id === po.id) ? list.map((o) => (o.id === po.id ? po : o)) : [po, ...list]));
    setDetail((d) => (d && d.id === po.id ? po : d));
  };

  /* ── list ── */
  const filtered = useMemo(() => orders.filter((o) => {
    const q = search.trim().toLowerCase();
    return (!statusFilter || o.status === statusFilter) &&
      matchesDateFilter(o.orderDate, dateFilter) &&   // by order date
      (!q || o.poNumber.toLowerCase().includes(q) || o.supplierName.toLowerCase().includes(q) || o.items.some((i) => i.productName.toLowerCase().includes(q)));
  }), [orders, search, statusFilter, dateFilter]);
  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);
  useEffect(() => { setCurrentPage(1); }, [dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);
  const openValue = orders.filter((o) => o.status === 'Ordered' || o.status === 'PartiallyReceived').reduce((s, o) => s + Math.max(0, o.total - o.receivedValue), 0);

  /* ── create / edit ── */
  const openCreate = () => { loadLookups(); setFormError(''); setProductSearch(''); setNewProduct(null); setForm(emptyForm()); };
  const openEdit = (po: PurchaseOrder) => {
    loadLookups(); setFormError(''); setProductSearch(''); setNewProduct(null);
    setForm({
      id: po.id, supplierId: po.supplierId ?? '', supplierName: po.supplierName, orderDate: dateOnly(po.orderDate), expectedDate: dateOnly(po.expectedDate),
      orderTax: po.orderTax || '', shipping: po.shipping || '', discount: po.discount || '', notes: po.notes || '',
      taxes: po.taxes || [],
      lines: po.items.map((i) => ({ productId: i.productId, productName: i.productName, sku: i.sku, image: i.productImage, quantity: i.quantity, unitCost: i.unitCost, discount: i.discount || '', taxPercent: i.taxPercent || '' })),
    });
  };
  const setLine = (idx: number, patch: Partial<FormLine>) =>
    setForm((f) => (f ? { ...f, lines: f.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)) } : f));
  const addProduct = (p: ProductResponse) => {
    setForm((f) => {
      if (!f) return f;
      const id = Number(p.id);
      const existing = f.lines.findIndex((l) => l.productId === id);
      if (existing >= 0) return { ...f, lines: f.lines.map((l, i) => (i === existing ? { ...l, quantity: num(l.quantity) + 1 } : l)) };
      return { ...f, lines: [...f.lines, { productId: id, productName: p.productName, sku: p.sku, image: p.images?.[0], quantity: 1, unitCost: p.price || '', discount: '', taxPercent: '' }] };
    });
    setProductSearch('');
  };
  const openNewProduct = (name = '') => {
    setNewProductError('');
    setNewProduct({ name, sku: '', category: '', unit: '', price: '', cost: '', quantity: 1 });
    setProductSearch('');
  };
  const saveNewProduct = async () => {
    if (!newProduct) return;
    const name = newProduct.name.trim();
    if (!name) { setNewProductError('Enter the product name.'); return; }
    if (num(newProduct.quantity) < 1 || !Number.isInteger(num(newProduct.quantity))) { setNewProductError('Enter a whole order quantity of at least 1.'); return; }
    if (products.some((p) => p.productName.trim().toLowerCase() === name.toLowerCase())) {
      setNewProductError('A product with this name already exists - search for it above instead.'); return;
    }
    setSaving(true); setNewProductError('');
    try {
      const created = await createProduct({
        productName: name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: newProduct.sku.trim(), // empty -> the server generates one
        sellingType: 'pos', category: newProduct.category, brand: '', unit: newProduct.unit, description: '',
        productType: 'single', quantity: 0, price: num(newProduct.price), // 0 stock: receiving the order adds it
        taxType: '', tax: '', discountType: '', discountValue: 0, quantityAlert: 0, warranty: '', images: [],
      });
      setProducts((list) => [created, ...list]);
      setForm((f) => f ? { ...f, lines: [...f.lines, { productId: Number(created.id), productName: created.productName, sku: created.sku, image: undefined, quantity: num(newProduct.quantity), unitCost: newProduct.cost === '' ? '' : num(newProduct.cost), discount: '', taxPercent: '' }] } : f);
      setNewProduct(null);
    } catch (e) { setNewProductError(apiError(e, 'Could not create the product')); }
    setSaving(false);
  };
  const productMatches = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.productName.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)).slice(0, 8);
  }, [productSearch, products]);
  const formSubTotal = form ? form.lines.reduce((s, l) => s + lineTotal(l), 0) : 0;
  const formTaxBase = form ? Math.max(0, formSubTotal - num(form.discount)) : 0;   // taxes on the subtotal after discount
  const formTax = form ? taxTotal(form.taxes) : 0;
  const formTotal = form ? Math.max(0, formSubTotal + formTax + num(form.shipping) - num(form.discount)) : 0;

  const saveForm = async (status: 'Draft' | 'Ordered') => {
    if (!form) return;
    const supplier = suppliers.find((s) => s.id === form.supplierId);
    if (!supplier && !form.supplierName.trim()) { setFormError('Select a supplier (or type the supplier name).'); return; }
    if (form.lines.length === 0) { setFormError('Add at least one product.'); return; }
    const bad = form.lines.find((l) => num(l.quantity) < 1 || !Number.isInteger(num(l.quantity)));
    if (bad) { setFormError(`${bad.productName}: enter a whole quantity of at least 1.`); return; }
    const payload: SavePurchaseOrderPayload = {
      supplierId: supplier ? supplier.id : null,
      supplierName: supplier ? supplier.fullName : form.supplierName.trim(),
      supplierPhone: supplier?.phone ?? null,
      orderDate: form.orderDate || today(),
      expectedDate: form.expectedDate || null,
      status,
      orderTax: formTax, shipping: num(form.shipping), discount: num(form.discount),
      taxes: cleanTaxes(form.taxes, formTaxBase),
      notes: form.notes || undefined,
      items: form.lines.map((l) => ({ productId: l.productId, quantity: num(l.quantity), unitCost: num(l.unitCost), discount: num(l.discount), taxPercent: num(l.taxPercent) })),
    };
    setSaving(true); setFormError('');
    try {
      const po = form.id ? await updatePurchaseOrder(form.id, payload) : await createPurchaseOrder(payload);
      upsert(po);
      setForm(null);
      flash('success', `${po.poNumber} ${form.id ? 'updated' : 'created'}${status === 'Ordered' ? ' and marked as ordered' : ' as a draft'}.`);
    } catch (e) { setFormError(apiError(e)); }
    setSaving(false);
  };

  /* ── actions ── */
  const doAction = async (fn: () => Promise<PurchaseOrder>, done: string) => {
    try { const po = await fn(); upsert(po); flash('success', `${po.poNumber}: ${done}`); }
    catch (e) { flash('danger', apiError(e)); }
  };
  const confirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await deletePurchaseOrder(deleteId);
      setOrders((l) => l.filter((o) => o.id !== deleteId));
      setDetail((d) => (d && d.id === deleteId ? null : d));
      flash('success', 'Purchase order deleted.');
    } catch (e) { flash('danger', apiError(e)); }
    setDeleteId(null);
  };

  /* ── receive goods ── */
  const openReceive = (po: PurchaseOrder) => {
    const q: Record<number, number | ''> = {};
    po.items.forEach((i) => { q[i.id] = i.remainingQuantity; });
    setReceiveQty(q); setReceiveDate(today()); setReceivePaid(''); setReceiveNotes(''); setReceiveError('');
    setReceiving(po);
  };
  const receiveValue = useMemo(() => {
    if (!receiving) return 0;
    const lines = receiving.items.reduce((s, i) => s + (i.quantity ? (i.totalCost / i.quantity) * num(receiveQty[i.id] ?? '') : 0), 0);
    const extras = receiving.subTotal > 0 ? ((receiving.orderTax + receiving.shipping - receiving.discount) * lines) / receiving.subTotal : 0;
    return Math.max(0, lines + extras);
  }, [receiving, receiveQty]);
  const submitReceive = async () => {
    if (!receiving) return;
    const lines = receiving.items.map((i) => ({ itemId: i.id, quantity: num(receiveQty[i.id] ?? '') })).filter((l) => l.quantity > 0);
    if (lines.length === 0) { setReceiveError('Enter the quantity received for at least one product.'); return; }
    const over = receiving.items.find((i) => num(receiveQty[i.id] ?? '') > i.remainingQuantity);
    if (over) { setReceiveError(`${over.productName}: only ${over.remainingQuantity} still to receive.`); return; }
    setSaving(true); setReceiveError('');
    try {
      const po = await receivePurchaseOrder(receiving.id, { date: receiveDate, paid: num(receivePaid), notes: receiveNotes || undefined, lines });
      upsert(po);
      setReceiving(null);
      const units = lines.reduce((s, l) => s + l.quantity, 0);
      flash('success', `${po.poNumber}: ${units} unit(s) added to stock. ${po.status === 'Received' ? 'Order fully received.' : 'Order partially received.'}`);
    } catch (e) { setReceiveError(apiError(e)); }
    setSaving(false);
  };

  /* ── print ── */
  useEffect(() => {
    if (!printing || !printRef.current) return;
    // letterhead (logos + address footer) from the shared print helper
    printDocument(printing.poNumber, 'PURCHASE ORDER', printing.poNumber, printRef.current.innerHTML);
    setPrinting(null);
  }, [printing]);

  /* ────────────────────────── render ────────────────────────── */

  const statusBadge = (s: PurchaseOrderStatus) => <span className={`badge ${STATUS[s]?.cls || 'bg-secondary'}`}>{STATUS[s]?.label || s}</span>;
  const progress = (po: PurchaseOrder) => {
    const pct = po.orderedUnits ? Math.round((po.receivedUnits / po.orderedUnits) * 100) : 0;
    return (
      <div style={{ minWidth: 110 }}>
        <small className="text-muted">{po.receivedUnits} / {po.orderedUnits} received</small>
        <div className="progress" style={{ height: 5 }}><div className={`progress-bar ${pct >= 100 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${pct}%` }} /></div>
      </div>
    );
  };
  const actionButtons = (po: PurchaseOrder, inDetail = false) => (
    <div className={`d-flex flex-wrap gap-1 ${inDetail ? '' : 'justify-content-end'}`}>
      {!inDetail && <button className="btn btn-sm btn-outline-secondary" title="View" onClick={() => setDetail(po)}><i className="ti ti-eye" /></button>}
      {canReceive(po) && <button className="btn btn-sm btn-success" title="Receive goods" onClick={() => openReceive(po)}><i className="ti ti-truck-delivery me-1" />Receive</button>}
      {po.status === 'Draft' && <button className="btn btn-sm btn-outline-info" title="Mark as ordered" onClick={() => doAction(() => markPurchaseOrderOrdered(po.id), 'marked as ordered')}><i className="ti ti-send" /></button>}
      {canEdit(po) && <button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => openEdit(po)}><i className="ti ti-edit" /></button>}
      <button className="btn btn-sm btn-outline-dark" title="Print" onClick={() => setPrinting(po)}><i className="ti ti-printer" /></button>
      {canCancel(po) && <button className="btn btn-sm btn-outline-warning" title={po.receivedUnits ? 'Cancel the remaining quantity' : 'Cancel order'} onClick={() => { if (window.confirm(`Cancel ${po.poNumber}?${po.receivedUnits ? ' Goods already received stay in stock.' : ''}`)) doAction(() => cancelPurchaseOrder(po.id), 'cancelled'); }}><i className="ti ti-ban" /></button>}
      {canDelete(po) && <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => setDeleteId(po.id)}><i className="ti ti-trash" /></button>}
    </div>
  );

  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="Order from suppliers and receive goods into stock" breadcrumbs={[{ title: 'Purchases' }]}
        actions={<button className="btn btn-primary" onClick={openCreate}><i className="ti ti-circle-plus me-1" />New Purchase Order</button>} />

      {toast && <div className={`alert alert-${toast.type} py-2`}>{toast.text}</div>}

      {/* summary */}
      <div className="row g-3 mb-3">
        {[
          { label: 'Drafts', value: counts.Draft || 0, icon: 'ti-file-pencil', cls: 'secondary', status: 'Draft' },
          { label: 'Awaiting delivery', value: (counts.Ordered || 0) + (counts.PartiallyReceived || 0), icon: 'ti-truck', cls: 'info', status: 'Ordered' },
          { label: 'Received', value: counts.Received || 0, icon: 'ti-package-import', cls: 'success', status: 'Received' },
          { label: 'Still to receive (value)', value: money(openValue), icon: 'ti-cash', cls: 'warning', status: '' },
        ].map((c) => (
          <div className="col-sm-6 col-xl-3" key={c.label}>
            <div className="card mb-0" role={c.status ? 'button' : undefined} onClick={() => c.status && setStatusFilter(c.status)}>
              <div className="card-body d-flex align-items-center">
                <span className={`avatar avatar-lg bg-${c.cls}-transparent text-${c.cls} me-3`}><i className={`ti ${c.icon} fs-20`} /></span>
                <div><p className="mb-1 text-muted">{c.label}</p><h5 className="mb-0">{c.value}</h5></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-2">
          <input className="form-control" style={{ maxWidth: 300 }} placeholder="Search PO number, supplier or product" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select" style={{ maxWidth: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {(Object.keys(STATUS) as PurchaseOrderStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
          {/* Order date: a month, or a From / To range */}
          <div className="w-100 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <DateFilters value={dateFilter} onChange={setDateFilter} />
            <small className="text-muted">{filtered.length} of {orders.length} purchase order(s){describeDateFilter(dateFilter) ? ` - ${describeDateFilter(dateFilter)}` : ''}</small>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="thead-light"><tr><th>PO No.</th><th>Supplier</th><th>Order date</th><th>Expected</th><th>Progress</th><th className="text-end">Total</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-5">
                      {orders.length === 0 ? <>No purchase orders yet. <a href="#" onClick={(e) => { e.preventDefault(); openCreate(); }}>Create the first one</a>.</> : 'No purchase orders match your filters.'}
                    </td></tr>
                  ) : paginatedData.map((po) => (
                    <tr key={po.id}>
                      <td><a href="#" className="fw-semibold" onClick={(e) => { e.preventDefault(); setDetail(po); }}>{po.poNumber}</a></td>
                      <td>{po.supplierName}</td>
                      <td>{showDate(po.orderDate)}</td>
                      <td>{showDate(po.expectedDate)}</td>
                      <td>{progress(po)}</td>
                      <td className="text-end">{money(po.total)}</td>
                      <td>{statusBadge(po.status)}</td>
                      <td>{actionButtons(po)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />

      {/* ───────────── create / edit ───────────── */}
      {form && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="mb-0">{form.id ? 'Edit Purchase Order' : 'New Purchase Order'}</h4>
                <button type="button" className="btn-close" onClick={() => setForm(null)} />
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-5 mb-3">
                    <label className="form-label">Supplier<span className="text-danger ms-1">*</span></label>
                    <select className="form-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value ? Number(e.target.value) : '' })}>
                      <option value="">{suppliers.length ? 'Select supplier' : 'No suppliers yet - type the name below'}</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.fullName}{s.phone ? ` (${s.phone})` : ''}</option>)}
                    </select>
                    {form.supplierId === '' && (
                      <input className="form-control mt-2" placeholder="...or type a supplier name" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
                    )}
                  </div>
                  <div className="col-md-3 col-6 mb-3">
                    <label className="form-label">Order date</label>
                    <input type="date" className="form-control" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
                  </div>
                  <div className="col-md-4 col-6 mb-3">
                    <label className="form-label">Expected delivery</label>
                    <input type="date" className="form-control" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
                  </div>
                </div>

                <label className="form-label">Products<span className="text-danger ms-1">*</span></label>
                <div className="position-relative mb-3">
                  <input className="form-control" placeholder="Search product by name or SKU to add it" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  {productSearch.trim() && (
                    <div className="dropdown-menu show w-100 p-1" style={{ maxHeight: 280, overflowY: 'auto', zIndex: 1060 }}>
                      {productMatches.length === 0 ? (
                        <button type="button" className="dropdown-item text-primary" onMouseDown={(e) => { e.preventDefault(); openNewProduct(productSearch.trim()); }}>
                          <i className="ti ti-circle-plus me-1" />Not in inventory - create "{productSearch.trim()}" as a new product
                        </button>
                      ) : productMatches.map((p) => (
                        <button type="button" key={p.id} className="dropdown-item d-flex align-items-center justify-content-between" onMouseDown={(e) => { e.preventDefault(); addProduct(p); }}>
                          <span>{p.productName} <small className="text-muted">{p.sku}</small></span>
                          <small className="text-muted">In stock: {p.quantity}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!newProduct ? (
                  <button type="button" className="btn btn-sm btn-outline-primary mb-3" onClick={() => openNewProduct()}>
                    <i className="ti ti-circle-plus me-1" />New product (not in inventory yet)
                  </button>
                ) : (
                  <div className="border rounded p-3 mb-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>New product</strong>
                      <small className="text-muted">Created with 0 stock - receiving this order adds the stock.</small>
                    </div>
                    <div className="row g-2">
                      <div className="col-md-4"><label className="form-label mb-1">Product name<span className="text-danger ms-1">*</span></label>
                        <input className="form-control form-control-sm" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} autoFocus /></div>
                      <div className="col-md-2"><label className="form-label mb-1">SKU</label>
                        <input className="form-control form-control-sm" placeholder="auto" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} /></div>
                      <div className="col-md-3"><label className="form-label mb-1">Category</label>
                        <select className="form-select form-select-sm" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}>
                          <option value="">-</option>{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select></div>
                      <div className="col-md-3"><label className="form-label mb-1">Unit</label>
                        <select className="form-select form-select-sm" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}>
                          <option value="">-</option>{units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select></div>
                      <div className="col-md-3"><label className="form-label mb-1">Selling price</label>
                        <input type="number" min={0} step="any" className="form-control form-control-sm" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
                      <div className="col-md-3"><label className="form-label mb-1">Cost (unit cost on this order)</label>
                        <input type="number" min={0} step="any" className="form-control form-control-sm" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
                      <div className="col-md-2"><label className="form-label mb-1">Order qty<span className="text-danger ms-1">*</span></label>
                        <input type="number" min={1} step={1} className="form-control form-control-sm" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
                      <div className="col-md-4 d-flex align-items-end gap-2">
                        <button type="button" className="btn btn-sm btn-primary" onClick={saveNewProduct} disabled={saving}>{saving ? 'Creating...' : 'Create & add to order'}</button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setNewProduct(null)} disabled={saving}>Cancel</button>
                      </div>
                    </div>
                    {newProductError && <div className="alert alert-danger py-1 px-2 mt-2 mb-0">{newProductError}</div>}
                  </div>
                )}

                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="thead-light"><tr><th>Product</th><th style={{ width: 100 }}>Qty</th><th style={{ width: 130 }}>Unit cost</th><th style={{ width: 120 }}>Discount</th><th className="text-end" style={{ width: 140 }}>Line total</th><th /></tr></thead>
                    <tbody>
                      {form.lines.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-3">Search above to add products to this order.</td></tr>
                      ) : form.lines.map((l, idx) => (
                        <tr key={l.productId}>
                          <td>
                            <div className="d-flex align-items-center">
                              {l.image ? <img src={mediaUrl(l.image)} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} className="me-2" /> : null}
                              <div><div>{l.productName}</div><small className="text-muted">{l.sku}</small></div>
                            </div>
                          </td>
                          {(['quantity', 'unitCost', 'discount'] as const).map((k) => (
                            <td key={k}><input type="number" min={k === 'quantity' ? 1 : 0} step={k === 'quantity' ? 1 : 'any'} className="form-control form-control-sm"
                              value={l[k]} onChange={(e) => setLine(idx, { [k]: e.target.value === '' ? '' : Number(e.target.value) } as Partial<FormLine>)} /></td>
                          ))}
                          <td className="text-end">{money(lineTotal(l))}</td>
                          <td><button className="btn btn-sm btn-outline-danger" title="Remove" onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })}><i className="ti ti-x" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Notes for supplier</label>
                    <textarea className="form-control" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    {([['discount', 'Order discount'], ['shipping', 'Shipping']] as const).map(([k, label]) => (
                      <div className="d-flex align-items-center justify-content-between mb-2" key={k}>
                        <span>{label}</span>
                        <input type="number" min={0} step="any" className="form-control form-control-sm" style={{ maxWidth: 160 }} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value === '' ? '' : Number(e.target.value) })} />
                      </div>
                    ))}
                    <div className="d-flex justify-content-between border-top pt-2"><span>Subtotal</span><span>{money(formSubTotal)}</span></div>
                    {form.taxes.map((t, n) => t.amount > 0 && <div key={n} className="d-flex justify-content-between"><span>{t.taxName} ({t.percent}%)</span><span>{money(t.amount)}</span></div>)}
                    <div className="d-flex justify-content-between align-items-center fw-bold border-top mt-2 pt-2"><span style={{ fontSize: 18 }}>Total</span><span className="text-primary" style={{ fontSize: 26 }}>{money(formTotal)}</span></div>
                  </div>
                </div>
                <TaxSelector base={formTaxBase} value={form.taxes} onChange={(taxes) => setForm((f) => (f ? { ...f, taxes } : f))} baseLabel="on the subtotal after discount" format={money} />
                {formError && <div className="alert alert-danger py-2 mb-0">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
                <button className="btn btn-outline-primary" onClick={() => saveForm('Draft')} disabled={saving}>Save as Draft</button>
                <button className="btn btn-primary" onClick={() => saveForm('Ordered')} disabled={saving}>{saving ? 'Saving...' : 'Save & Mark Ordered'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── details ───────────── */}
      {detail && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} onClick={() => setDetail(null)}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="mb-0 me-2">{detail.poNumber}</h4>{statusBadge(detail.status)}
                <button type="button" className="btn-close ms-auto" onClick={() => setDetail(null)} />
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-4"><small className="text-muted d-block">Supplier</small><strong>{detail.supplierName}</strong>{detail.supplierPhone && <div className="text-muted">{detail.supplierPhone}</div>}</div>
                  <div className="col-md-2 col-6"><small className="text-muted d-block">Order date</small>{showDate(detail.orderDate)}</div>
                  <div className="col-md-2 col-6"><small className="text-muted d-block">Expected</small>{showDate(detail.expectedDate)}</div>
                  <div className="col-md-2 col-6"><small className="text-muted d-block">Created by</small>{detail.createdBy || '-'}</div>
                  <div className="col-md-2 col-6"><small className="text-muted d-block">Progress</small>{progress(detail)}</div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="thead-light"><tr><th>Product</th><th className="text-end">Ordered</th><th className="text-end">Received</th><th className="text-end">Remaining</th><th className="text-end">In stock</th><th className="text-end">Unit cost</th><th className="text-end">Line total</th></tr></thead>
                    <tbody>
                      {detail.items.map((i) => (
                        <tr key={i.id}>
                          <td><div className="d-flex align-items-center">{i.productImage ? <img src={mediaUrl(i.productImage)} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} className="me-2" /> : null}<div>{i.productName}<br /><small className="text-muted">{i.sku}</small></div></div></td>
                          <td className="text-end">{i.quantity}</td>
                          <td className="text-end text-success">{i.receivedQuantity}</td>
                          <td className="text-end">{i.remainingQuantity > 0 && detail.status !== 'Cancelled' ? <span className="text-warning fw-semibold">{i.remainingQuantity}</span> : i.remainingQuantity}</td>
                          <td className="text-end">{i.inStock}</td>
                          <td className="text-end">{money(i.unitCost)}</td>
                          <td className="text-end">{money(i.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan={6} className="text-end">Subtotal</td><td className="text-end">{money(detail.subTotal)}</td></tr>
                      {detail.taxes && detail.taxes.length > 0
                        ? detail.taxes.map((t, n) => <tr key={n}><td colSpan={6} className="text-end">{t.taxName} ({t.percent}%)</td><td className="text-end">{money(t.amount)}</td></tr>)
                        : detail.orderTax > 0 && <tr><td colSpan={6} className="text-end">Order tax</td><td className="text-end">{money(detail.orderTax)}</td></tr>}
                      {detail.shipping > 0 && <tr><td colSpan={6} className="text-end">Shipping</td><td className="text-end">{money(detail.shipping)}</td></tr>}
                      {detail.discount > 0 && <tr><td colSpan={6} className="text-end">Discount</td><td className="text-end">- {money(detail.discount)}</td></tr>}
                      <tr className="fw-bold"><td colSpan={6} className="text-end" style={{ fontSize: 18 }}>Total</td><td className="text-end text-primary text-nowrap" style={{ fontSize: 22 }}>{money(detail.total)}</td></tr>
                    </tfoot>
                  </table>
                </div>
                {detail.notes && <p className="mb-3"><small className="text-muted">Notes: </small>{detail.notes}</p>}

                <h6 className="mt-2">Deliveries received</h6>
                {detail.receipts.length === 0 ? <p className="text-muted mb-0">Nothing received yet.</p> : (
                  <table className="table table-sm">
                    <thead className="thead-light"><tr><th>Purchase ref.</th><th>Date</th><th className="text-end">Units</th><th className="text-end">Value</th><th className="text-end">Paid</th><th>Payment</th></tr></thead>
                    <tbody>{detail.receipts.map((r) => (
                      <tr key={r.purchaseId}><td>{r.reference}</td><td>{showDate(r.date)}</td><td className="text-end">{r.units}</td><td className="text-end">{money(r.total)}</td><td className="text-end">{money(r.paid)}</td><td>{r.paymentStatus}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer justify-content-between">
                {actionButtons(detail, true)}
                <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────── receive goods ───────────── */}
      {receiving && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="mb-0">Receive goods - {receiving.poNumber}</h4>
                <button type="button" className="btn-close" onClick={() => setReceiving(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted">Enter what actually arrived. The quantities are added to stock and recorded as a purchase from <strong>{receiving.supplierName}</strong>. Anything not received stays open on the order.</p>
                <table className="table table-sm align-middle">
                  <thead className="thead-light"><tr><th>Product</th><th className="text-end">Ordered</th><th className="text-end">Already received</th><th className="text-end">Remaining</th><th style={{ width: 130 }}>Receiving now</th></tr></thead>
                  <tbody>
                    {receiving.items.map((i) => (
                      <tr key={i.id} className={i.remainingQuantity === 0 ? 'text-muted' : ''}>
                        <td>{i.productName}<br /><small className="text-muted">In stock: {i.inStock}</small></td>
                        <td className="text-end">{i.quantity}</td>
                        <td className="text-end">{i.receivedQuantity}</td>
                        <td className="text-end">{i.remainingQuantity}</td>
                        <td>
                          <input type="number" min={0} max={i.remainingQuantity} step={1} className="form-control form-control-sm" disabled={i.remainingQuantity === 0}
                            value={receiveQty[i.id] ?? ''} onChange={(e) => { setReceiveError(''); setReceiveQty({ ...receiveQty, [i.id]: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))) }); }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="row">
                  <div className="col-md-4 mb-3"><label className="form-label">Date received</label><input type="date" className="form-control" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} /></div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Amount paid now</label>
                    <input type="number" min={0} step="any" className="form-control" placeholder="0" value={receivePaid} onChange={(e) => setReceivePaid(e.target.value === '' ? '' : Number(e.target.value))} />
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setReceivePaid(Math.round(receiveValue * 100) / 100)}>Paid in full</button>
                  </div>
                  <div className="col-md-4 mb-3 text-end"><small className="text-muted d-block">Value of this delivery</small><span className="fw-bold" style={{ fontSize: 22 }}>{money(receiveValue)}</span></div>
                </div>
                <label className="form-label">Notes</label>
                <input className="form-control" placeholder="e.g. delivery note / invoice number from supplier" value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} />
                {receiveError && <div className="alert alert-danger py-2 mt-3 mb-0">{receiveError}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setReceiving(null)} disabled={saving}>Cancel</button>
                <button className="btn btn-success" onClick={submitReceive} disabled={saving}><i className="ti ti-package-import me-1" />{saving ? 'Saving...' : 'Receive into stock'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={deleteId != null} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />

      {/* ───────────── printable purchase order (hidden; copied into the print window) ───────────── */}
      {printing && (
        <div style={{ display: 'none' }}>
          <div ref={printRef}>
            <table style={{ marginBottom: 16 }}>
              <tbody>
                <tr><th style={{ width: '18%' }}>Supplier</th><td>{printing.supplierName}{printing.supplierPhone ? ` - ${printing.supplierPhone}` : ''}</td><th style={{ width: '18%' }}>Status</th><td>{STATUS[printing.status]?.label}</td></tr>
                <tr><th>Order date</th><td>{showDate(printing.orderDate)}</td><th>Expected delivery</th><td>{showDate(printing.expectedDate)}</td></tr>
              </tbody>
            </table>
            <table>
              <thead><tr><th>#</th><th>Product</th><th>SKU</th><th className="r">Qty</th><th className="r">Unit cost</th><th className="r">Discount</th><th className="r">Tax</th><th className="r">Total</th></tr></thead>
              <tbody>
                {printing.items.map((i, n) => (
                  <tr key={i.id}><td>{n + 1}</td><td>{i.productName}</td><td>{i.sku}</td><td className="r">{i.quantity}</td><td className="r">{money(i.unitCost)}</td><td className="r">{money(i.discount)}</td><td className="r">{i.taxPercent ? `${i.taxPercent}%` : '-'}</td><td className="r">{money(i.totalCost)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={7} className="r">Subtotal</td><td className="r">{money(printing.subTotal)}</td></tr>
                {printing.taxes && printing.taxes.length > 0
                  ? printing.taxes.map((t, n) => <tr key={n}><td colSpan={7} className="r">{t.taxName} ({t.percent}%)</td><td className="r">{money(t.amount)}</td></tr>)
                  : printing.orderTax > 0 && <tr><td colSpan={7} className="r">Order tax</td><td className="r">{money(printing.orderTax)}</td></tr>}
                {printing.shipping > 0 && <tr><td colSpan={7} className="r">Shipping</td><td className="r">{money(printing.shipping)}</td></tr>}
                {printing.discount > 0 && <tr><td colSpan={7} className="r">Discount</td><td className="r">- {money(printing.discount)}</td></tr>}
                <tr><th colSpan={7} className="r" style={{ fontSize: 17 }}>Total</th><th className="r" style={{ fontSize: 19, whiteSpace: 'nowrap' }}>{money(printing.total)}</th></tr>
              </tfoot>
            </table>
            {printing.notes && <p style={{ marginTop: 14 }}><strong>Notes:</strong> {printing.notes}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
              <div style={{ borderTop: '1px solid #333', width: 200, textAlign: 'center', paddingTop: 4 }}>Prepared by{printing.createdBy ? `: ${printing.createdBy}` : ''}</div>
              <div style={{ borderTop: '1px solid #333', width: 200, textAlign: 'center', paddingTop: 4 }}>Authorised signature</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PurchaseOrders;
