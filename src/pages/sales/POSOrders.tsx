import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api, { mediaUrl } from '../../services/api';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';
import { recordSaleIncome } from '../../services/financeService';
import POSPaymentReceipt, { ReceiptSale, ReceiptPayment } from '../../components/POSPaymentReceipt';

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
  expectedDate: string | null;
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

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const parseSaleDateMs = (saleDate: string): number => {
  const t = Date.parse(saleDate);
  return Number.isNaN(t) ? 0 : t;
};

interface CustomerOrderGroup {
  key: string;
  customerId: number | null;
  customerName: string;
  customerImage: string | null;
  orders: SaleDto[];
  totalDue: number;
}

/** Matches API camelCase JSON from POST /sales/customer-fifo-payment */
interface CustomerFifoPaymentApiResponse {
  totalApplied: number;
  allocations: Array<{
    saleId: number;
    saleReference: string;
    amountApplied: number;
    paymentReference: string;
  }>;
}

/* ======================== Component ======================== */
const POSOrders: React.FC = () => {
  const { t } = useTranslation();
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
    biller: 'Admin', status: 'Pending', orderTax: 0, discount: 0, shipping: 0, notes: '', expectedDate: ''
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

  /* grouped-by-customer view + FIFO bulk payment */
  const [viewMode, setViewMode] = useState<'table' | 'byCustomer'>('table');
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentGroup, setBulkPaymentGroup] = useState<CustomerOrderGroup | null>(null);
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    reference: '',
    payingAmount: 0,
    receivedAmount: 0,
    paymentType: 'Cash',
    description: '',
  });
  const [bulkPaySubmitting, setBulkPaySubmitting] = useState(false);

  /* payment receipt */
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<ReceiptPayment | null>(null);

  /* ---- Fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes, pRes] = await Promise.all([
        api.get<SaleDto[]>('/sales?source=pos'),
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

  /* ---- Filters ----
   * List view uses `filtered` (includes payment-status filter + sort).
   * By-customer cards use `groupingCandidates` only (search + order status) so paid rows stay visible
   * with up-to-date Paid/Due/Payment status; payment filter still narrows the table only. */
  const groupingCandidates = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return sales.filter((s) => {
      const matchSearch = !searchTerm || s.reference.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q);
      const matchStatus = !filterStatus || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [sales, searchTerm, filterStatus]);

  const filtered = useMemo(() => {
    const rows = groupingCandidates.filter((s) => !filterPaymentStatus || s.paymentStatus === filterPaymentStatus);
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sortBy === 'asc') return a.grandTotal - b.grandTotal;
      if (sortBy === 'desc') return b.grandTotal - a.grandTotal;
      return 0;
    });
    return copy;
  }, [groupingCandidates, filterPaymentStatus, sortBy]);

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  const customerGroups = useMemo((): CustomerOrderGroup[] => {
    const map = new Map<string, SaleDto[]>();
    for (const s of groupingCandidates) {
      const key =
        s.customerId != null
          ? `cid:${s.customerId}`
          : `name:${s.customerName.trim().toLowerCase() || 'walk-in'}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    const groups: CustomerOrderGroup[] = [];
    map.forEach((orders, key) => {
      const sorted = [...orders].sort((a, b) => {
        const dt = parseSaleDateMs(a.saleDate) - parseSaleDateMs(b.saleDate);
        if (dt !== 0) return dt;
        return a.id - b.id;
      });
      const first = sorted[0];
      groups.push({
        key,
        customerId: first.customerId,
        customerName: first.customerName,
        customerImage: first.customerImage,
        orders: sorted,
        totalDue: roundMoney(sorted.reduce((sum, o) => sum + (Number(o.due) || 0), 0)),
      });
    });
    groups.sort((a, b) => a.customerName.localeCompare(b.customerName, undefined, { sensitivity: 'base' }));
    return groups;
  }, [groupingCandidates]);

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
    setForm({ customerId: null, customerName: '', customerImage: '', biller: 'Admin', status: 'Pending', orderTax: 0, discount: 0, shipping: 0, notes: '', expectedDate: '' });
    setItems([]);
    setCustomerSearchTerm('');
    setProductSearchTerm('');
    setShowModal(true);
  };

  const openEditModal = (sale: SaleDto) => {
    setEditingId(sale.id);
    setForm({
      customerId: sale.customerId, customerName: sale.customerName, customerImage: sale.customerImage || '',
      biller: sale.biller, status: sale.status, orderTax: sale.orderTax, discount: sale.discount, shipping: sale.shipping, notes: sale.notes || '', expectedDate: sale.expectedDate || ''
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
      expectedDate: form.expectedDate || null,
      source: 'pos',
      items: items.map((i) => ({
        productId: i.productId, productName: i.productName, quantity: i.quantity,
        purchasePrice: i.purchasePrice, discount: i.discount, taxPercent: i.taxPercent,
        taxAmount: i.taxAmount, unitCost: i.unitCost, totalCost: i.totalCost
      }))
    };
    try {
      if (editingId) await api.put(`/sales/${editingId}`, payload);
      else await api.post('/sales', payload);
      setShowModal(false);
      fetchData();
    } catch { /* ignore */ }
  };

  /* ---- Delete ---- */
  const confirmDelete = async () => {
    if (!deleteId) return;
    await api.delete(`/sales/${deleteId}`); setShowDeleteModal(false); setDeleteId(null); fetchData();
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
      else {
        await api.post(`/sales/${paymentSaleId}/payments`, paymentForm);
        // Record new payment in finance income for financial reports
        await recordSaleIncome({
          amount: paymentForm.payingAmount,
          date: new Date().toISOString().slice(0, 10),
          reference: paymentForm.reference || `SALE-${paymentSaleId}`,
          description: `POS Order Payment - Sale #${paymentSaleId}`,
          paymentType: paymentForm.paymentType,
        });
      }
      setShowPaymentFormModal(false);
      fetchData();
      const res = await api.get<SaleDto>(`/sales/${paymentSaleId}`);
      setPaymentsSale(res.data);

      /* show receipt for new payments */
      if (!editingPaymentId) {
        const saleData = res.data;
        const cust = customers.find((c) => c.id === saleData.customerId);
        setReceiptSale({
          reference: saleData.reference,
          customerName: saleData.customerName,
          customerPhone: cust?.phone,
          grandTotal: saleData.grandTotal,
          paid: saleData.paid - paymentForm.payingAmount,
          due: saleData.due + paymentForm.payingAmount,
          orderTax: saleData.orderTax,
          discount: saleData.discount,
          shipping: saleData.shipping,
          saleDate: saleData.saleDate,
          items: saleData.items.map((i) => ({ productName: i.productName, quantity: i.quantity, unitCost: i.unitCost, totalCost: i.totalCost })),
        });
        setReceiptPayment({
          reference: paymentForm.reference,
          payingAmount: paymentForm.payingAmount,
          receivedAmount: paymentForm.receivedAmount,
          paymentType: paymentForm.paymentType,
          description: paymentForm.description || null,
          paymentDate: new Date().toISOString(),
        });
        setShowReceipt(true);
      }
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

  const openReceipt = (sale: SaleDto, payment: SalePaymentDto) => {
    const cust = customers.find((c) => c.id === sale.customerId);
    setReceiptSale({
      reference: sale.reference,
      customerName: sale.customerName,
      customerPhone: cust?.phone,
      grandTotal: sale.grandTotal,
      paid: sale.paid,
      due: sale.due,
      orderTax: sale.orderTax,
      discount: sale.discount,
      shipping: sale.shipping,
      saleDate: sale.saleDate,
      items: sale.items.map((i) => ({ productName: i.productName, quantity: i.quantity, unitCost: i.unitCost, totalCost: i.totalCost })),
    });
    setReceiptPayment({
      reference: payment.reference,
      payingAmount: payment.payingAmount,
      receivedAmount: payment.receivedAmount,
      paymentType: payment.paymentType,
      description: payment.description,
      paymentDate: payment.paymentDate,
    });
    setShowReceipt(true);
  };

  const openBulkPayment = (g: CustomerOrderGroup) => {
    if (g.totalDue <= 0) {
      void Swal.fire({ icon: 'info', title: t('sales.bulk_payment_none_due') });
      return;
    }
    setBulkPaymentGroup(g);
    const max = roundMoney(g.totalDue);
    setBulkPaymentForm({
      reference: '',
      payingAmount: max,
      receivedAmount: max,
      paymentType: 'Cash',
      description: '',
    });
    setShowBulkPaymentModal(true);
  };

  const submitBulkPayment = async () => {
    if (!bulkPaymentGroup) return;
    const amt = roundMoney(bulkPaymentForm.payingAmount);
    if (amt <= 0) {
      void Swal.fire({ icon: 'warning', title: t('sales.bulk_payment_invalid_amount') });
      return;
    }
    if (amt > roundMoney(bulkPaymentGroup.totalDue) + 0.001) {
      void Swal.fire({ icon: 'warning', title: t('sales.bulk_payment_exceeds') });
      return;
    }
    setBulkPaySubmitting(true);
    try {
      const { data } = await api.post<CustomerFifoPaymentApiResponse>('/sales/customer-fifo-payment', {
        customerId: bulkPaymentGroup.customerId,
        customerName: bulkPaymentGroup.customerName,
        amount: amt,
        paymentType: bulkPaymentForm.paymentType,
        reference: bulkPaymentForm.reference.trim(),
        description:
          bulkPaymentForm.description?.trim() ||
          `Bulk payment (FIFO) — ${bulkPaymentGroup.customerName}`,
        source: 'pos',
      });

      for (const a of data.allocations) {
        await recordSaleIncome({
          amount: a.amountApplied,
          date: new Date().toISOString().slice(0, 10),
          reference: a.paymentReference,
          description: `POS Order Payment (FIFO) - ${bulkPaymentGroup.customerName} - ${a.saleReference}`,
          paymentType: bulkPaymentForm.paymentType,
        });
      }

      setShowBulkPaymentModal(false);
      setBulkPaymentGroup(null);
      await fetchData();
      void Swal.fire({
        icon: 'success',
        title: t('sales.bulk_payment_success'),
        text: `${fmt(data.totalApplied)} applied (oldest bills first).`,
        timer: 2400,
        showConfirmButton: false,
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      void Swal.fire({
        icon: 'error',
        title: t('common.error'),
        text: err?.response?.data?.message || 'Payment failed',
      });
    } finally {
      setBulkPaySubmitting(false);
    }
  };

  /* ====================== RENDER ====================== */
  return (
    <>
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="add-item d-flex align-items-center flex-wrap gap-2">
          <div className="page-title">
            <h4>{t('sales.pos_orders_title')}</h4>
            <h6>{t('sales.pos_orders_subtitle')}</h6>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'byCustomer' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {
              setViewMode((v) => {
                const next = v === 'table' ? 'byCustomer' : 'table';
                if (next === 'byCustomer') void fetchData();
                return next;
              });
            }}
          >
            <i className={`ti ${viewMode === 'table' ? 'ti-layout-grid' : 'ti-list'} me-1`} />
            {viewMode === 'table' ? t('sales.group_by_customer') : t('sales.list_view')}
          </button>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openAddModal(); }}>
            <i className="ti ti-circle-plus me-1"></i>{t('sales.add_sales')}
          </a>
        </div>
      </div>

      {/* ---- Card ---- */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterStatus || t('common.status')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterStatus(''); }}>{t('common.all')}</a></li>
                {STATUS_OPTIONS.map((s) => (
                  <li key={s}><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterPaymentStatus || t('common.payment_status')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterPaymentStatus(''); }}>{t('common.all')}</a></li>
                {PAYMENT_STATUS_OPTIONS.map((s) => (
                  <li key={s}><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setFilterPaymentStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {t('common.sort_by')} {sortBy === 'asc' ? t('common.ascending') : sortBy === 'desc' ? t('common.descending') : t('common.recently_added')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setSortBy('recent'); }}>{t('common.recently_added')}</a></li>
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setSortBy('asc'); }}>{t('common.ascending')}</a></li>
                <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setSortBy('desc'); }}>{t('common.descending')}</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
          ) : viewMode === 'table' ? (
            <div className="table-responsive">
              <table className="table datanew">
                <thead>
                  <tr>
                    <th className="no-sort">
                      <label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label>
                    </th>
                    <th>{t('common.customer')}</th>
                    <th>{t('common.reference')}</th>
                    <th>{t('common.date')}</th>
                    <th>Expected Date</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.grand_total')}</th>
                    <th>{t('common.paid')}</th>
                    <th>{t('common.due')}</th>
                    <th>{t('common.payment_status')}</th>
                    <th>{t('common.biller')}</th>
                    <th className="text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-4">{t('sales.no_orders')}</td></tr>
                  ) : paginatedData.map((s) => (
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
                      <td>{s.expectedDate || '—'}</td>
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
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openDetail(s); }}><i data-feather="eye" className="info-img"></i>{t('sales.sale_detail')}</a></li>
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openEditModal(s); }}><i data-feather="edit" className="info-img"></i>{t('sales.edit_sale')}</a></li>
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openPayments(s); }}><i data-feather="dollar-sign" className="info-img"></i>{t('sales.show_payments')}</a></li>
                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openCreatePayment(s.id); }}><i data-feather="plus-circle" className="info-img"></i>{t('sales.create_payment')}</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={(e) => { e.preventDefault(); setDeleteId(s.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>{t('sales.delete_sale')}</a></li>
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3">
              {customerGroups.length === 0 ? (
                <div className="text-center py-5 text-muted">{t('sales.no_orders')}</div>
              ) : (
                <div className="row g-3">
                  {customerGroups.map((g) => (
                    <div key={g.key} className="col-12 col-xl-6">
                      <div className="card border shadow-none h-100 mb-0">
                        <div className="card-header bg-light d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
                          <div className="d-flex align-items-center min-w-0">
                            <span className="avatar avatar-md me-2 flex-shrink-0">
                              <img
                                src={g.customerImage ? mediaUrl(g.customerImage) : '/assets/img/users/user-01.jpg'}
                                alt=""
                              />
                            </span>
                            <div className="min-w-0">
                              <h6 className="mb-0 text-truncate">{g.customerName}</h6>
                              <small className="text-muted">
                                {g.orders.length} {t('sales.orders_count')} · {t('sales.collective_due')}{' '}
                                <span
                                  className={
                                    g.totalDue > 0
                                      ? 'd-inline-flex align-items-center ms-1 px-2 py-1 rounded-2 border border-2 border-primary fw-bold text-primary bg-white shadow-sm'
                                      : 'd-inline-flex align-items-center ms-1 px-2 py-1 rounded-2 border fw-semibold text-muted bg-light'
                                  }
                                >
                                  {fmt(g.totalDue)}
                                </span>
                              </small>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm flex-shrink-0"
                            disabled={g.totalDue <= 0}
                            onClick={() => openBulkPayment(g)}
                          >
                            <i className="ti ti-cash me-1" />
                            {t('sales.add_bulk_payment')}
                          </button>
                        </div>
                        <div className="card-body p-0">
                          <div className="table-responsive">
                            <table className="table table-hover mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>{t('common.reference')}</th>
                                  <th>{t('common.date')}</th>
                                  <th>Expected</th>
                                  <th>{t('common.payment_status')}</th>
                                  <th className="text-end">{t('common.paid')}</th>
                                  <th className="text-end">{t('common.due')}</th>
                                  <th className="text-end">{t('common.grand_total')}</th>
                                  <th>{t('common.order_status')}</th>
                                  <th className="text-center">{t('common.actions')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.orders.map((s) => (
                                  <tr key={s.id}>
                                    <td className="fw-medium">{s.reference}</td>
                                    <td>{s.saleDate}</td>
                                    <td>{s.expectedDate || '—'}</td>
                                    <td>
                                      <span className={`badge ${paymentStatusBadge(s.paymentStatus)} shadow-none badge-xs`}>
                                        <i className="ti ti-point-filled me-1" />
                                        {s.paymentStatus}
                                      </span>
                                    </td>
                                    <td className="text-end">{fmt(Number(s.paid) || 0)}</td>
                                    <td className="text-end">{fmt(Number(s.due) || 0)}</td>
                                    <td className="text-end">{fmt(Number(s.grandTotal) || 0)}</td>
                                    <td><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                                    <td className="text-center">
                                      <div className="dropdown">
                                        <a className="action-set" href="#" data-bs-toggle="dropdown" aria-expanded="false">
                                          <i className="fa fa-ellipsis-v" aria-hidden="true" />
                                        </a>
                                        <ul className="dropdown-menu dropdown-menu-end">
                                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openDetail(s); }}>{t('sales.sale_detail')}</a></li>
                                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openPayments(s); }}>{t('sales.show_payments')}</a></li>
                                          <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openCreatePayment(s.id); }}>{t('sales.create_payment')}</a></li>
                                        </ul>
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
                  ))}
                </div>
              )}
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
                <h4 className="modal-title">{editingId ? t('sales.edit_sale') : t('sales.add_sales')}</h4>
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
                            <th>{t('sales.product')}</th>
                            <th>{t('sales.qty')}</th>
                            <th>{t('sales.purchase_price')}</th>
                            <th>{t('sales.discount_amt')}</th>
                            <th>{t('sales.tax_pct')}</th>
                            <th>{t('sales.tax_amount')}</th>
                            <th>{t('sales.unit_cost')}</th>
                            <th>{t('sales.total_cost')}</th>
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
                                  <input type="number" className="form-control text-center mx-1" style={{ width: 60 }} value={item.quantity || ''} onChange={(e) => updateItemField(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', item.quantity + 1)}><i data-feather="plus-circle"></i></span>
                                </div>
                              </td>
                              <td><input type="number" className="form-control" style={{ width: 100 }} value={item.purchasePrice || ''} onChange={(e) => updateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)} /></td>
                              <td><input type="number" className="form-control" style={{ width: 80 }} value={item.discount || ''} onChange={(e) => updateItemField(idx, 'discount', parseFloat(e.target.value) || 0)} /></td>
                              <td><input type="number" className="form-control" style={{ width: 70 }} value={item.taxPercent || ''} onChange={(e) => updateItemField(idx, 'taxPercent', parseFloat(e.target.value) || 0)} /></td>
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
                        <label className="form-label">{t('sales.customer_name')}<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder={t('sales.search_customer')} value={customerSearchTerm}
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
                        <label className="form-label">{t('sales.date')}<span className="text-danger ms-1">*</span></label>
                        <input type="date" className="form-control" defaultValue={new Date().toISOString().slice(0, 10)} />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('sales.biller')}<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" value={form.biller} onChange={(e) => setForm({ ...form, biller: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-12 col-sm-6 col-12">
                      <div className="mb-3" ref={productSearchRef}>
                        <label className="form-label">{t('common.product')}<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder={t('common.search_placeholder')} value={productSearchTerm}
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
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.order_tax')}</h6><span>{fmt(form.orderTax)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.discount')}</h6><span>{fmt(form.discount)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.shipping')}</h6><span>{fmt(form.shipping)}</span></li>
                          <li className="d-flex justify-content-between p-2"><h6 className="mb-0 fw-bold">{t('common.grand_total')}</h6><span className="fw-bold">{fmt(grandTotal)}</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Additional fields */}
                  <div className="row">
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.order_tax')}<span className="text-danger ms-1">*</span></label>
                        <input type="number" className="form-control" value={form.orderTax || ''} onChange={(e) => setForm({ ...form, orderTax: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.discount')}<span className="text-danger ms-1">*</span></label>
                        <input type="number" className="form-control" value={form.discount || ''} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.shipping')}<span className="text-danger ms-1">*</span></label>
                        <input type="number" className="form-control" value={form.shipping || ''} onChange={(e) => setForm({ ...form, shipping: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.status')}<span className="text-danger ms-1">*</span></label>
                        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-3 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Expected Date</label>
                        <input type="date" className="form-control" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
                      </div>
                    </div>
                    {editingId && (
                      <div className="col-lg-12">
                        <div className="mb-3">
                          <label className="form-label">{t('common.notes')}</label>
                          <textarea className="form-control" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-3" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={saveSale}>{editingId ? t('common.save_changes') : t('common.submit')}</button>
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
                  <h4 className="mb-0 me-2">{t('sales.sale_detail')}</h4>
                </div>
                <div className="page-btn">
                  <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                    <i data-feather="arrow-left" className="me-2"></i>{t('sales.back_to_orders')}
                  </button>
                </div>
              </div>
              <div className="card border-0 mb-0">
                <div className="card-body pb-0">
                  {/* Info boxes */}
                  <div className="row sales-details-items d-flex mb-3">
                    <div className="col-md-4">
                      <h6>{t('sales.customer_info')}</h6>
                      <h5 className="mb-1">{detailSale.customerName}</h5>
                    </div>
                    <div className="col-md-4">
                      <h6>{t('sales.invoice_info')}</h6>
                      <p className="mb-0">{t('common.reference')}: <span className="fs-16 text-primary ms-2">#{detailSale.reference}</span></p>
                      <p className="mb-0">{t('common.date')}: <span className="ms-2 text-muted">{detailSale.saleDate}</span></p>
                      <p className="mb-0">{t('common.status')}: <span className={`badge ${statusBadge(detailSale.status)} ms-2`}>{detailSale.status}</span></p>
                      <p className="mb-0">{t('common.payment_status')}: <span className={`badge ${paymentStatusBadge(detailSale.paymentStatus)} shadow-none badge-xs ms-2`}><i className="ti ti-point-filled"></i>{detailSale.paymentStatus}</span></p>
                    </div>
                    <div className="col-md-4">
                      <h6>{t('common.biller')}</h6>
                      <p className="mb-0">{detailSale.biller}</p>
                    </div>
                  </div>

                  <h5 className="mb-3">{t('sales.order_summary')}</h5>
                  <div className="table-responsive no-pagination mb-3">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>{t('sales.product')}</th>
                          <th>{t('sales.qty')}</th>
                          <th>{t('sales.purchase_price')}</th>
                          <th>{t('sales.discount_amt')}</th>
                          <th>{t('sales.tax_pct')}</th>
                          <th>{t('sales.tax_amount')}</th>
                          <th>{t('sales.unit_cost')}</th>
                          <th>{t('sales.total_cost')}</th>
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
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.order_tax')}</h6><span>{fmt(detailSale.orderTax)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.discount')}</h6><span>{fmt(detailSale.discount)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.grand_total')}</h6><span className="fw-bold">{fmt(detailSale.grandTotal)}</span></li>
                          <li className="border-bottom d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.paid')}</h6><span>{fmt(detailSale.paid)}</span></li>
                          <li className="d-flex justify-content-between p-2"><h6 className="mb-0">{t('common.due')}</h6><span>{fmt(detailSale.due)}</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>{t('common.close')}</button>
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
                <h4 className="modal-title">{t('sales.show_payments')} - {paymentsSale.reference}</h4>
                <button type="button" className="close" onClick={() => setShowPaymentsModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('common.date')}</th>
                        <th>{t('common.reference')}</th>
                        <th>{t('common.amount')}</th>
                        <th>{t('common.paid')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsSale.payments.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-3">{t('sales.no_payments')}</td></tr>
                      ) : paymentsSale.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.paymentDate}</td>
                          <td>{p.reference}</td>
                          <td>{fmt(p.payingAmount)}</td>
                          <td>{p.paymentType}</td>
                          <td>
                            <div className="edit-delete-action d-flex align-items-center">
                              <a className="me-3 p-2 border rounded d-flex align-items-center" href="#" title={t('pos_receipt.title')} onClick={(e) => { e.preventDefault(); openReceipt(paymentsSale, p); }}>
                                <i data-feather="printer"></i>
                              </a>
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
                <h4 className="modal-title">{editingPaymentId ? t('sales.edit_payment') : t('sales.create_payment')}</h4>
                <button type="button" className="close" onClick={() => setShowPaymentFormModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">{t('sales.date')}<span className="text-danger ms-1">*</span></label>
                      <input type="date" className="form-control" defaultValue={new Date().toISOString().slice(0, 10)} />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">{t('common.reference')}<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">{t('sales.received_amount')}<span className="text-danger ms-1">*</span></label>
                      <input type="number" className="form-control" value={paymentForm.receivedAmount || ''} onChange={(e) => setPaymentForm({ ...paymentForm, receivedAmount: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">{t('sales.paying_amount')}<span className="text-danger ms-1">*</span></label>
                      <input type="number" className="form-control" value={paymentForm.payingAmount || ''} onChange={(e) => setPaymentForm({ ...paymentForm, payingAmount: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">{t('sales.payment_type')}<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={paymentForm.paymentType} onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}>
                        {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">{t('common.description')}</label>
                      <textarea className="form-control" rows={3} value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} />
                      <p className="text-muted mb-0">{t('common.max_60_chars')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => setShowPaymentFormModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={savePayment}>{editingPaymentId ? t('common.save_changes') : t('common.submit')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Bulk payment (FIFO) modal ===================== */}
      {showBulkPaymentModal && bulkPaymentGroup && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h4 className="modal-title mb-0">{t('sales.bulk_payment_title')}</h4>
                  <small className="text-muted">{bulkPaymentGroup.customerName}</small>
                </div>
                <button type="button" className="close" onClick={() => { setShowBulkPaymentModal(false); setBulkPaymentGroup(null); }}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">{t('sales.bulk_payment_subtitle')}</p>
                <p className="mb-3">
                  {t('sales.bulk_payment_max')}: <strong>{fmt(bulkPaymentGroup.totalDue)}</strong>
                </p>
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">{t('common.reference')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={bulkPaymentForm.reference}
                        onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, reference: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">{t('sales.payment_type')}<span className="text-danger ms-1">*</span></label>
                      <select
                        className="form-select"
                        value={bulkPaymentForm.paymentType}
                        onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, paymentType: e.target.value })}
                      >
                        {PAYMENT_TYPES.map((pt) => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">{t('sales.paying_amount')}<span className="text-danger ms-1">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={bulkPaymentGroup.totalDue}
                        className="form-control"
                        value={bulkPaymentForm.payingAmount || ''}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setBulkPaymentForm({ ...bulkPaymentForm, payingAmount: v, receivedAmount: v });
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">{t('sales.received_amount')}<span className="text-danger ms-1">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="form-control"
                        value={bulkPaymentForm.receivedAmount || ''}
                        onChange={(e) =>
                          setBulkPaymentForm({ ...bulkPaymentForm, receivedAmount: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-0">
                      <label className="form-label">{t('common.description')}</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={bulkPaymentForm.description}
                        onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  disabled={bulkPaySubmitting}
                  onClick={() => { setShowBulkPaymentModal(false); setBulkPaymentGroup(null); }}
                >
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-primary" disabled={bulkPaySubmitting} onClick={() => void submitBulkPayment()}>
                  {bulkPaySubmitting ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {t('common.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Delete Modal ===================== */}
      {viewMode === 'table' && (
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
      )}
      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={confirmDelete} />

      {/* ===================== Payment Receipt ===================== */}
      {showReceipt && receiptSale && receiptPayment && (
        <POSPaymentReceipt sale={receiptSale} payment={receiptPayment} onClose={() => setShowReceipt(false)} />
      )}
    </>
  );
};

export default POSOrders;
