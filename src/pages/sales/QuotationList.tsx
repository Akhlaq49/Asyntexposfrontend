import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api, { mediaUrl } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { printDocument, esc, printMoney } from '../../utils/printDocument';
import { loadTermsContent, termsToHtml } from '../../utils/termsConditions';
import DateFilters, { DateFilterValue, EMPTY_DATE_FILTER, matchesDateFilter, describeDateFilter } from '../../components/common/DateFilters';
import TaxSelector, { AppliedTax, cleanTaxes, taxTotal } from '../../components/common/TaxSelector';
import { useAuth } from '../../context/AuthContext';
import SendForApprovalModal from '../../components/quotations/SendForApprovalModal';
import { printQuotation as printQuotationDoc } from '../../utils/quotationPrint';

/* ---------- Types ---------- */
interface QuotationItemDto {
  id: number; productId: number; productName: string; quantity: number;
  purchasePrice: number; discount: number; taxPercent: number; taxAmount: number;
  unitCost: number; totalCost: number;
}
interface QuotationDto {
  id: number; reference: string; customerId: number | null; customerName: string;
  saleId?: number | null; saleReference?: string | null;
  taxes?: AppliedTax[];
  /** Terms edited for this quotation (null = standard terms) */
  termsContent?: string | null;
  /** Revisions: original id (null on the original), 0 = original / 1 = _R1 ..., newer version that replaced this one */
  rootQuotationId?: number | null;
  revisionNo?: number;
  supersededById?: number | null;
  /** staff approval before converting to a sale: null (not sent), Pending, Approved, Discarded */
  /** who made it (staff only see their own) */
  createdById?: number | null; createdByName?: string | null; createdByRole?: string | null;
  approvalStatus?: string | null; approvalSentTo?: string | null; approvalBy?: string | null; approvalAt?: string | null; approvalNote?: string | null;
  /** number of product lines and their names (the list has no line items) */
  itemCount?: number;
  productNames?: string[];
  customerImage: string | null; productId: number | null; productName: string;
  productImage: string | null; orderTax: number; discount: number; shipping: number;
  /** installation, testing and commissioning charge (added to the total) */
  installationCharges?: number;
  grandTotal: number; status: string; description: string | null;
  quotationDate: string; createdAt: string; items: QuotationItemDto[];
}
interface CustomerResult { id: number; name: string; phone?: string; }
interface ProductResult { id: string; productName: string; sku: string; category: string; price: number; images: string[]; quantity?: number; description?: string; model?: string; }

interface LocalItem {
  productId: number; productName: string; quantity: number; purchasePrice: number;
  discount: number; taxPercent: number; taxAmount: number; unitCost: number; totalCost: number;
  /** "Discount? Yes" ticked for this line (UI only) */
  discountOn?: boolean;
}

const STATUS_OPTIONS = ['Sent', 'Pending', 'Ordered', 'Converted'];
const PAYMENT_TYPES = ['Cash', 'Online'];

const statusBadge = (s: string) => {
  const sl = s.toLowerCase();
  if (sl === 'sent') return 'badge-success';
  if (sl === 'pending') return 'badge-cyan';
  if (sl === 'ordered') return 'badge-warning';
  if (sl === 'converted') return 'badge-primary';
  return 'badge-secondary';
};

const calcItem = (item: LocalItem): LocalItem => {
  const taxAmount = (item.purchasePrice * item.taxPercent) / 100;
  const unitCost = item.purchasePrice - item.discount + taxAmount;
  const totalCost = unitCost * item.quantity;
  return { ...item, taxAmount: Math.round(taxAmount * 100) / 100, unitCost: Math.round(unitCost * 100) / 100, totalCost: Math.round(totalCost * 100) / 100 };
};

/** Whole-rupee inputs: block anything that is not a digit, read the typed digits as an integer */
const blockNonDigits = (e: React.KeyboardEvent<HTMLInputElement>) => { if (['.', ',', 'e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); };
const wholeRupees = (raw: string) => { const d = raw.replace(/\D/g, ''); return d === '' ? 0 : parseInt(d, 10); };

const fmt = (n: number) => `Rs ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ======================== Component ======================== */
const QuotationList: React.FC = () => {
  const { t } = useTranslation();
  // Admin / Super Admin convert directly; other staff need an admin's approval first
  const { user } = useAuth();
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
  const [approvalFor, setApprovalFor] = useState<QuotationDto | null>(null);
  const [approvalNotice, setApprovalNotice] = useState('');
  const [waitingForMe, setWaitingForMe] = useState(0);
  const needsApproval = (q: QuotationDto) => !isAdmin && q.approvalStatus !== 'Approved';
  /** staff can print a quotation only once it is approved (admins always) */
  const canPrint = (q: QuotationDto) => !needsApproval(q);
  // terms & conditions shown in the quotation view (its own edited terms, else the company's standard ones)
  const [detailTerms, setDetailTerms] = useState('');
  const [quotations, setQuotations] = useState<QuotationDto[]>([]);
  const [taxes, setTaxes] = useState<AppliedTax[]>([]);
  const [discountOn, setDiscountOn] = useState(false);
  const [shippingOn, setShippingOn] = useState(false);
  /* terms & conditions step on submit */
  const [quotationTerms, setQuotationTerms] = useState<string | null>(null);   // the quotation's own terms (null = standard)
  const [termsStep, setTermsStep] = useState<null | 'ask' | 'edit'>(null);
  const [termsDraft, setTermsDraft] = useState('');
  const [standardTerms, setStandardTerms] = useState('');
  const [savingQuotation, setSavingQuotation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_DATE_FILTER);
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
    reference: '', status: 'Pending', orderTax: 0, discount: 0, shipping: 0, installationCharges: 0,
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

  /* convert to sale */
  const [convertQ, setConvertQ] = useState<QuotationDto | null>(null);
  const [convertStock, setConvertStock] = useState<Record<number, number>>({});
  const [convertPaid, setConvertPaid] = useState<number | ''>('');
  const [convertPaymentType, setConvertPaymentType] = useState('Cash');
  const [convertNotes, setConvertNotes] = useState('');
  const [convertError, setConvertError] = useState('');
  const [converting, setConverting] = useState(false);
  /* revisions */
  const [reviseFromId, setReviseFromId] = useState<number | null>(null);   // set while the form is creating a new revision
  const [showOldVersions, setShowOldVersions] = useState(true);   // every version is listed (grouped) by default
  const [versions, setVersions] = useState<QuotationDto[] | null>(null);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'danger'; text: string; saleRef?: string } | null>(null);

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // quotation id -> purchase orders raised to buy its goods
  const [linkedOrders, setLinkedOrders] = useState<Record<number, { poNumber: string; status: string }[]>>({});
  const navigate = useNavigate();

  /** The product's description and model, shown and printed on quotations (instead of the SKU) */
  const productInfo = (productId: number) => {
    const p = products.find((x) => Number(x.id) === Number(productId));
    return { description: (p?.description || '').trim(), model: (p?.model || '').trim() };
  };

  /* ---- Fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    // loaded independently: a failing customers / products call must not stop the quotation list from refreshing
    const [qRes, cRes, pRes, poRes] = await Promise.allSettled([
      api.get<QuotationDto[]>('/quotations'),
      api.get<CustomerResult[]>('/customers'),
      api.get<ProductResult[]>('/products'),
      api.get<{ id: number; poNumber: string; status: string; quotationId?: number | null }[]>('/purchase-orders'),
    ]);
    if (qRes.status === 'fulfilled') setQuotations(qRes.value.data);
    if (poRes.status === 'fulfilled') {
      const byQuotation: Record<number, { poNumber: string; status: string }[]> = {};
      poRes.value.data.filter((o) => o.quotationId).forEach((o) => (byQuotation[o.quotationId!] ??= []).push({ poNumber: o.poNumber, status: o.status }));
      setLinkedOrders(byQuotation);
    }
    if (cRes.status === 'fulfilled') setCustomers(cRes.value.data);
    if (pRes.status === 'fulfilled') setProducts(pRes.value.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!isAdmin) return;
    api.get<{ count: number }>('/quotation-approvals/pending-count').then((r) => setWaitingForMe(r.data.count)).catch(() => {});
  }, [isAdmin, quotations]);
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

  /* ---- Revisions: QT-005 (original) -> QT-005_R1 -> QT-005_R2 ---- */
  const familyId = (q: QuotationDto) => q.rootQuotationId ?? q.id;
  const familyOf = (q: QuotationDto) => quotations.filter(x => familyId(x) === familyId(q));
  const baseReference = (q: QuotationDto) => {
    const root = quotations.find(x => x.id === familyId(q));
    return root?.reference?.trim() || `QT-${familyId(q)}`;
  };
  const nextRevisionNo = (q: QuotationDto) => Math.max(0, ...familyOf(q).map(x => x.revisionNo || 0)) + 1;
  const versionLabel = (q: QuotationDto) => (q.revisionNo ? `R${q.revisionNo}` : 'Original');
  const referenceOf = (id?: number | null) => quotations.find(x => x.id === id)?.reference || '';
  /** The version of this quotation that was converted to a sale, if any (only one version can be) */
  const convertedVersion = (q: QuotationDto) => familyOf(q).find(x => x.saleId);
  /** Convert / revise are open on every version until one version is converted */
  const familyOpen = (q: QuotationDto) => !convertedVersion(q);

  const filtered = quotations
    .filter((q) => {
      if (!showOldVersions && q.supersededById) return false;   // older versions are history; shown on request
      const s = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || q.reference.toLowerCase().includes(s) || q.customerName.toLowerCase().includes(s) || q.productName.toLowerCase().includes(s);
      const matchProduct = !filterProduct || q.productName === filterProduct;
      // customer: typed name, matched anywhere in the name, any case
      const matchCustomer = !filterCustomer.trim() || q.customerName.toLowerCase().includes(filterCustomer.trim().toLowerCase());
      const matchStatus = !filterStatus || q.status === filterStatus;
      const matchDate = matchesDateFilter(q.quotationDate, dateFilter);
      return matchSearch && matchProduct && matchCustomer && matchStatus && matchDate;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') return a.grandTotal - b.grandTotal;
      if (sortBy === 'desc') return b.grandTotal - a.grandTotal;
      const latestA = Math.max(...familyOf(a).map(x => x.id)), latestB = Math.max(...familyOf(b).map(x => x.id));
      if (latestA !== latestB) return latestB - latestA;
      return (b.revisionNo || 0) - (a.revisionNo || 0);
    });

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);
  // back to page 1 when the customer / date filter changes
  useEffect(() => { setCurrentPage(1); }, [filterCustomer, dateFilter, showOldVersions]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** Line discount: No = 0; Yes = a whole-rupee amount per unit */
  const setItemDiscountOn = (idx: number, on: boolean) =>
    setItems(items.map((item, i) => (i === idx ? calcItem({ ...item, discountOn: on, discount: on ? item.discount : 0 }) : item)));

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  /* ---- Grand total ---- */
  const itemsTotal = items.reduce((sum, i) => sum + i.totalCost, 0);
  const taxBase = Math.max(0, itemsTotal - form.discount);   // taxes are worked out on the subtotal after discount
  const taxAmount = taxTotal(taxes);
  const grandTotal = Math.max(0, itemsTotal - form.discount + taxAmount + form.shipping + (form.installationCharges || 0));

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
    setForm({ customerId: null, customerName: '', customerImage: '', productId: null, productName: '', productImage: '', reference: '', status: 'Pending', orderTax: 0, discount: 0, shipping: 0, installationCharges: 0, description: '', quotationDate: new Date().toISOString().slice(0, 10) });
    setItems([]);
    setTaxes([]);
    setDiscountOn(false);
    setShippingOn(false);
    setQuotationTerms(null);
    setReviseFromId(null);
    setCustomerSearchTerm('');
    setProductSearchTerm('');
    setShowModal(true);
  };

  /** revise = open the form as a new revision (…_R1, _R2 …) of this quotation instead of editing it in place */
  const openEditModal = async (q: QuotationDto, revise = false) => {
    // Fetch full detail with items
    try {
      const res = await api.get<QuotationDto>(`/quotations/${q.id}`);
      const full = res.data;
      setEditingId(revise ? null : full.id);
      setReviseFromId(revise ? full.id : null);
      setSaveError('');
      setForm({
        customerId: full.customerId, customerName: full.customerName, customerImage: full.customerImage || '',
        productId: full.productId, productName: full.productName, productImage: full.productImage || '',
        reference: revise ? `${baseReference(full)}_R${nextRevisionNo(full)}` : full.reference, status: full.status, orderTax: full.orderTax, discount: full.discount, shipping: full.shipping, installationCharges: full.installationCharges || 0,
        description: full.description || '', quotationDate: new Date().toISOString().slice(0, 10),
      });
      setItems(full.items.map(i => ({
        productId: i.productId, productName: i.productName, quantity: i.quantity,
        discountOn: (i.discount || 0) > 0,
        purchasePrice: i.purchasePrice, discount: i.discount, taxPercent: i.taxPercent,
        taxAmount: i.taxAmount, unitCost: i.unitCost, totalCost: i.totalCost,
      })));
      setTaxes(full.taxes || []);
      setDiscountOn((full.discount || 0) > 0);
      setShippingOn((full.shipping || 0) > 0);
      setQuotationTerms(full.termsContent ?? null);
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
      setDetailTerms(res.data.termsContent?.trim() || '');
      setShowDetailModal(true);
      if (!res.data.termsContent?.trim()) loadTermsContent().then(setDetailTerms);
    } catch { /* ignore */ }
  };

  /* ---- Save quotation ---- */
  /** Submit -> "Edit terms & conditions for this quotation?" */
  const askTerms = () => setTermsStep('ask');
  const startEditingTerms = async () => {
    const standard = await loadTermsContent();
    setStandardTerms(standard);
    setTermsDraft(quotationTerms ?? standard);
    setTermsStep('edit');
  };

  /** termsContent: undefined = leave the terms as they are; '' = standard terms; text = this quotation's own terms */
  const saveQuotation = async (termsContent?: string) => {
    setSavingQuotation(true);
    const payload = {
      termsContent,
      reference: form.reference,
      customerId: form.customerId, customerName: form.customerName, customerImage: form.customerImage || null,
      productId: form.productId, productName: form.productName, productImage: form.productImage || null,
      orderTax: taxAmount, discount: form.discount, shipping: form.shipping, installationCharges: form.installationCharges || 0,
      taxes: cleanTaxes(taxes, taxBase),
      grandTotal, status: form.status, description: form.description || null,
      quotationDate: form.quotationDate,
      items: items.map(i => ({
        productId: i.productId, productName: i.productName, quantity: i.quantity,
        purchasePrice: i.purchasePrice, discount: i.discount, taxPercent: i.taxPercent,
        taxAmount: i.taxAmount, unitCost: i.unitCost, totalCost: i.totalCost,
      })),
    };
    setSaveError('');
    try {
      if (reviseFromId) {
        // new version; the current one is kept unchanged as history
        const { data: rev } = await api.post<QuotationDto>(`/quotations/${reviseFromId}/revise`, payload);
        setNotice({ type: 'success', text: `New version ${rev.reference} saved. ${referenceOf(reviseFromId) || 'The previous version'} is kept as history.` });
      } else if (editingId) await api.put(`/quotations/${editingId}`, payload);
      else await api.post('/quotations', payload);
      setShowModal(false);
      setTermsStep(null);
      setReviseFromId(null);
      fetchData();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Could not save the quotation.');
    }
    setSavingQuotation(false);
  };

  /* ---- Delete ---- */
  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const ref = quotations.find(q => q.id === id)?.reference;
    try {
      await api.delete(`/quotations/${id}`);
      // take the row off straight away, then reload (the previous version of a deleted revision becomes current again)
      setQuotations(list => list.filter(q => q.id !== id));
      setSelectedIds(sel => { const next = new Set(sel); next.delete(id); return next; });
      setNotice({ type: 'success', text: `Quotation ${ref || '#' + id} deleted.` });
    } catch (err: any) {
      setNotice({ type: 'danger', text: err?.response?.data?.message || 'Could not delete the quotation.' });
    }
    setShowDeleteModal(false); setDeleteId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });   // the result message is shown at the top of the page
    fetchData();
  };

  /** All versions of the quotation (original first) */
  const openVersions = async (q: QuotationDto) => {
    try { setVersions((await api.get<QuotationDto[]>(`/quotations/${q.id}/revisions`)).data); }
    catch { setNotice({ type: 'danger', text: 'Could not load the versions.' }); }
  };

  /* ====================== CONVERT TO SALE ====================== */
  const openConvert = async (summary: QuotationDto) => {
    if (needsApproval(summary)) { setApprovalFor(summary); return; }
    setConvertError(''); setConvertNotes(''); setConvertPaymentType('Cash');
    try {
      const [full, prods] = await Promise.all([
        api.get<QuotationDto>(`/quotations/${summary.id}`).then(r => r.data),
        api.get<ProductResult[]>('/products').then(r => r.data).catch(() => [] as ProductResult[]),
      ]);
      const stockMap: Record<number, number> = {};
      prods.forEach(p => { stockMap[Number(p.id)] = p.quantity ?? 0; });
      setConvertStock(stockMap);
      setConvertPaid(full.grandTotal);
      setConvertQ(full);
      setShowDetailModal(false);
    } catch {
      setNotice({ type: 'danger', text: 'Could not load the quotation.' });
    }
  };
  // products whose total quantity on the quotation is more than what's in stock
  const convertShortages: { name: string }[] = [];
  if (convertQ) {
    const need = new Map<number, { name: string; qty: number }>();
    convertQ.items.forEach(i => need.set(i.productId, { name: i.productName, qty: (need.get(i.productId)?.qty || 0) + i.quantity }));
    need.forEach((v, id) => { if ((convertStock[id] ?? 0) < v.qty) convertShortages.push({ name: v.name }); });
  }
  const submitConvert = async () => {
    if (!convertQ) return;
    const paid = convertPaid === '' ? 0 : Number(convertPaid);
    if (paid < 0) { setConvertError('The amount received can\'t be negative.'); return; }
    setConverting(true); setConvertError('');
    try {
      const { data: sale } = await api.post<{ reference: string; due: number }>(`/quotations/${convertQ.id}/convert-to-sale`,
        { paidAmount: paid, paymentType: convertPaymentType, notes: convertNotes || undefined });
      setConvertQ(null);
      setNotice({ type: 'success', saleRef: sale.reference,
        text: `Quotation ${convertQ.reference || '#' + convertQ.id} converted to sale ${sale.reference}. Stock updated${sale.due > 0 ? `; Rs ${sale.due.toLocaleString('en-US', { minimumFractionDigits: 2 })} still due` : '; fully paid'}.` });
      await fetchData();
    } catch (err: any) {
      setConvertError(err?.response?.data?.message || 'Could not convert the quotation.');
    }
    setConverting(false);
  };

  /* ====================== PRINT / EXPORT ====================== */
  const quotationLines = (q: QuotationDto) =>
    q.items && q.items.length > 0
      ? q.items
      : [{ id: 0, productId: q.productId ?? 0, productName: q.productName || '-', quantity: 1, purchasePrice: q.grandTotal, discount: 0, taxPercent: 0, taxAmount: 0, unitCost: q.grandTotal, totalCost: q.grandTotal }];

  /** One quotation as a customer document on the letterhead (shared with Staff Approvals) */
  const printQuotation = (summary: QuotationDto) => printQuotationDoc(summary.id, products);

  /** The quotations list (current search / filters) */
  const listColumns = ['Reference', 'Date', 'Customer', 'Products', 'Created by', 'Status', 'Grand total'];
  const listRows = () => filtered.map((q) => [q.reference || `#${q.id}`, q.quotationDate, q.customerName,
    quotationLines(q).map((l) => `${l.productName} x${l.quantity}`).join(', '),
    q.createdByName ? `${q.createdByName}${q.createdByRole ? ` (${q.createdByRole})` : ''}` : '-', q.status, fmt(q.grandTotal)]);
  const listTotal = () => filtered.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  const filterNote = () => [describeDateFilter(dateFilter), filterCustomer.trim() && `Customer: ${filterCustomer.trim()}`, filterProduct && `Product: ${filterProduct}`, filterStatus && `Status: ${filterStatus}`, searchTerm && `Search: "${searchTerm}"`].filter(Boolean).join(' | ');

  const printList = () => {
    const rows = listRows().map((r) => `<tr>${r.map((c, i) => `<td${i === 6 ? ' class="r"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('');
    printDocument('Quotations', 'QUOTATIONS', `${filtered.length} quotation(s) - printed ${new Date().toLocaleDateString('en-GB')}`, `
      ${filterNote() ? `<p style="color:#555">Filtered by ${esc(filterNote())}</p>` : ''}
      <table><thead><tr>${listColumns.map((c, i) => `<th${i === 6 ? ' class="r"' : ''}>${c}</th>`).join('')}</tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="c">No quotations</td></tr>'}</tbody>
        <tfoot><tr class="total"><th colspan="6" class="r">Total</th><th class="r">${printMoney(listTotal())}</th></tr></tfoot></table>`);
  };
  const exportListPdf = () => exportToPDF(listColumns, listRows(), 'quotations', 'Quotations', [
    { label: 'Quotations', value: filtered.length }, { label: 'Total value', value: fmt(listTotal()) },
    ...(filterNote() ? [{ label: 'Filters', value: filterNote() }] : []),
  ]);
  const exportListExcel = () => exportToExcel(listColumns, listRows(), 'quotations');

  /* ====================== RENDER ====================== */
  return (
    <>
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>{t('quotations.title')}</h4>
            <h6>{t('quotations.subtitle')}</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" title="PDF" onClick={e => { e.preventDefault(); exportListPdf(); }}><img src="/assets/img/icons/pdf.svg" alt="pdf" /></a></li>
          <li><a href="#" title="Excel" onClick={e => { e.preventDefault(); exportListExcel(); }}><img src="/assets/img/icons/excel.svg" alt="excel" /></a></li>
          <li><a href="#" title="Print list" onClick={e => { e.preventDefault(); printList(); }}><i className="ti ti-printer"></i></a></li>
        </ul>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}>
            <i className="ti ti-circle-plus me-1"></i>{t('quotations.add_quotation')}
          </a>
        </div>
      </div>

      {notice && (
        <div className={`alert alert-${notice.type} d-flex justify-content-between align-items-center py-2`}>
          <span>{notice.text} {notice.saleRef && <Link to="/pos-orders" className="fw-semibold ms-1">View in POS Orders</Link>}</span>
          <button type="button" className="btn-close" onClick={() => setNotice(null)} />
        </div>
      )}

      {approvalNotice && <div className="alert alert-success py-2 d-flex justify-content-between">{approvalNotice}<button type="button" className="btn-close" onClick={() => setApprovalNotice('')} /></div>}
      {isAdmin && waitingForMe > 0 && (
        <div className="alert alert-warning py-2"><i className="ti ti-bell me-1" />{waitingForMe} quotation{waitingForMe > 1 ? 's are' : ' is'} waiting for your approval - <Link to="/staff-approvals">open Staff Approvals</Link>.</div>
      )}
      {approvalFor && (
        <SendForApprovalModal quotation={{ ...approvalFor, reference: approvalFor.reference || `#${approvalFor.id}` }} onClose={() => setApprovalFor(null)}
          onDone={(text) => { setApprovalFor(null); setApprovalNotice(text); fetchData(); }} />
      )}

      {/* ---- Card ---- */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Product filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterProduct || t('common.product')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterProduct(''); }}>{t('common.all')}</a></li>
                {productNames.map(p => (
                  <li key={p}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterProduct(p); }}>{p}</a></li>
                ))}
              </ul>
            </div>
            {/* Customer filter: type a name (suggestions from the list) */}
            <div className="me-2 position-relative">
              <input className="form-control" style={{ width: 200, paddingRight: filterCustomer ? 30 : undefined }} placeholder="Customer name" list="quotation-customers"
                value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} />
              <datalist id="quotation-customers">{customerNames.map(c => <option key={c} value={c} />)}</datalist>
              {filterCustomer && (
                <button type="button" className="btn btn-sm position-absolute top-50 end-0 translate-middle-y border-0" title="Clear" onClick={() => setFilterCustomer('')}><i className="ti ti-x"></i></button>
              )}
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
          {/* Date: a month, or a From / To range */}
          <div className="w-100 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <DateFilters value={dateFilter} onChange={setDateFilter} />
            <div className="d-flex align-items-center gap-3">
              <div className="form-check form-switch mb-0">
                <input className="form-check-input" type="checkbox" id="show-old-versions" checked={showOldVersions} onChange={e => setShowOldVersions(e.target.checked)} />
                <label className="form-check-label" htmlFor="show-old-versions">Show all versions</label>
              </div>
              <small className="text-muted">{filtered.length} of {quotations.length} quotation(s)</small>
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
                    <th>{t('common.product_name')}</th>
                    <th>{t('quotations.customer_name')}</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Created by</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.total')}</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-4">{t('quotations.no_quotations')}</td></tr>
                  ) : paginatedData.map(q => (
                    <tr key={q.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(q.id)} onChange={e => handleSelectOne(q.id, e.target.checked)} /><span className="checkmarks"></span></label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center me-2">
                          <a href="#" className="avatar avatar-md me-2">
                            <img src={q.productImage ? mediaUrl(q.productImage) : '/assets/img/products/product1.png'} alt="product" />
                          </a>
                          {(() => {
                            // first product, then "…" + "+N more" when the quotation has more products (all names on hover)
                            const names = q.productNames && q.productNames.length ? q.productNames : (q.productName ? [q.productName] : []);
                            const more = Math.max(0, (q.itemCount ?? names.length) - 1);
                            return (
                              <div title={names.length > 1 ? names.join('\n') : undefined}>
                                <a href="#" onClick={e => { e.preventDefault(); openDetail(q); }}>{names[0] || 'N/A'}</a>
                                {more > 0 && <span className="fw-bold ms-1" style={{ letterSpacing: 1 }}>…</span>}
                                {more > 0 && <div><small className="text-muted" style={{ borderBottom: '1px dotted #999' }}>+{more} more product{more > 1 ? 's' : ''}</small></div>}
                              </div>
                            );
                          })()}
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
                      <td>
                        <div className="fw-semibold">{q.reference || '-'}</div>
                        {familyOf(q).length > 1 && (
                          <div className="d-flex align-items-center gap-1 mt-1">
                            <span className={`badge ${q.supersededById ? 'badge-secondary' : 'badge-info'}`} title={q.supersededById ? 'Earlier version' : 'Latest version'}>{versionLabel(q)}</span>
                            <a href="#" className="small" title="See all versions" onClick={e => { e.preventDefault(); openVersions(q); }}>{familyOf(q).length} versions</a>
                          </div>
                        )}
                      </td>
                      <td className="text-nowrap">{q.quotationDate}</td>
                      <td className="text-nowrap">
                        {q.createdByName
                          ? <><div className="fw-medium">{q.createdByName}</div>{q.createdByRole && <span className="badge bg-light text-dark border">{q.createdByRole}</span>}</>
                          : <small className="text-muted" title="Not recorded">-</small>}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(q.status)}`}>{q.status}</span>
                        {q.saleReference && <div><small className="text-muted">Sale {q.saleReference}</small></div>}
                        {!q.saleId && q.approvalStatus === 'Pending' && <div><span className="badge bg-warning mt-1" title={`Sent by ${q.approvalBy}`}><i className="ti ti-clock me-1" />Awaiting approval</span><div><small className="text-muted">to {q.approvalSentTo}</small></div></div>}
                        {!q.saleId && q.approvalStatus === 'Approved' && <div><span className="badge bg-success mt-1" title={q.approvalNote || ''}><i className="ti ti-check me-1" />Approved</span><div><small className="text-muted">by {q.approvalBy}</small></div></div>}
                        {!q.saleId && q.approvalStatus === 'Discarded' && <div><span className="badge bg-danger mt-1"><i className="ti ti-x me-1" />Discarded</span><div><small className="text-danger">{q.approvalBy}: {q.approvalNote}</small></div></div>}
                        {(linkedOrders[q.id] || []).filter((o) => o.status !== 'Cancelled').map((o) => <div key={o.poNumber}><small><a href="#" title="Purchase order for this quotation" onClick={e => { e.preventDefault(); navigate(`/purchase-orders?fromQuotation=${q.id}`); }}><i className="ti ti-truck me-1" />{o.poNumber}</a></small></div>)}
                        {!q.saleId && convertedVersion(q) && <div><small className="text-muted">Not chosen ({convertedVersion(q)!.reference} was converted)</small></div>}
                        {!convertedVersion(q) && q.supersededById && <div><small className="text-muted">Earlier version (newer: {referenceOf(q.supersededById) || 'a newer version'})</small></div>}
                      </td>
                      <td>{fmt(q.grandTotal)}</td>
                      <td>
                        <div className="edit-delete-action d-flex align-items-center">
                          <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded" href="#" onClick={e => { e.preventDefault(); openDetail(q); }}>
                            <i data-feather="eye" className="action-eye"></i>
                          </a>
                          {familyOpen(q) && (needsApproval(q) ? (
                            <span className="me-2 p-2 mb-0 d-flex align-items-center border rounded text-muted" style={{ opacity: 0.45, cursor: 'not-allowed' }}
                              title={q.approvalStatus === 'Pending' ? `Convert to sale: waiting for approval from ${q.approvalSentTo}` : 'Convert to sale: needs an admin\'s approval first'}>
                              <i className="ti ti-shopping-cart-check"></i>
                            </span>
                          ) : (
                            <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded text-success" href="#" title="Convert to sale" onClick={e => { e.preventDefault(); openConvert(q); }}>
                              <i className="ti ti-shopping-cart-check"></i>
                            </a>
                          ))}
                          {familyOpen(q) && !q.supersededById && needsApproval(q) && (
                            <a className={`me-2 p-2 mb-0 d-flex align-items-center border rounded ${q.approvalStatus === 'Pending' ? 'text-warning' : 'text-primary'}`} href="#"
                              title={q.approvalStatus === 'Pending' ? `Waiting for ${q.approvalSentTo} - send again or take back` : 'Send to Admin / Super Admin for approval'}
                              onClick={e => { e.preventDefault(); setApprovalFor(q); }}>
                              <i className={`ti ${q.approvalStatus === 'Pending' ? 'ti-clock-share' : 'ti-send'}`}></i>
                            </a>
                          )}
                          {q.saleId && (
                            <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded text-info" href="#"
                              title={(linkedOrders[q.id] || []).some((o) => o.status !== 'Cancelled') ? `Open purchase order ${(linkedOrders[q.id] || []).find((o) => o.status !== 'Cancelled')!.poNumber}` : 'Create purchase order - buy the goods for this order from the supplier'}
                              onClick={e => { e.preventDefault(); navigate(`/purchase-orders?fromQuotation=${q.id}`); }}>
                              <i className="ti ti-truck-delivery"></i>
                            </a>
                          )}
                          {canPrint(q) && (
                            <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded" href="#" title="Print quotation" onClick={e => { e.preventDefault(); printQuotation(q); }}>
                              <i className="ti ti-printer"></i>
                            </a>
                          )}
                          {familyOpen(q) && (
                            <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded text-primary" href="#" title={`Make a new version (${baseReference(q)}_R${nextRevisionNo(q)})`} onClick={e => { e.preventDefault(); openEditModal(q, true); }}>
                              <i className="ti ti-versions"></i>
                            </a>
                          )}
                          {familyOpen(q) && !q.supersededById && (
                            <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded" href="#" title="Edit this version" onClick={e => { e.preventDefault(); openEditModal(q); }}>
                              <i data-feather="edit" className="feather-edit"></i>
                            </a>
                          )}
                          {!q.supersededById && (
                            <a className="me-2 p-2 mb-0 d-flex align-items-center border rounded" href="#" title="Delete" onClick={e => { e.preventDefault(); setDeleteId(q.id); setShowDeleteModal(true); }}>
                              <i data-feather="trash-2" className="feather-trash-2"></i>
                            </a>
                          )}
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
                <h4 className="modal-title">{reviseFromId ? `New version ${form.reference}` : editingId ? t('quotations.edit_quotation') : t('quotations.add_quotation')}</h4>
                {reviseFromId && <small className="text-muted ms-3">{referenceOf(reviseFromId)} will be kept unchanged as history</small>}
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <div className="card border-0 mb-0">
                <div className="card-body pb-0">
                  {/* Form fields */}
                  <div className="row">
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3" ref={customerSearchRef}>
                        <label className="form-label">{t('quotations.customer_name')}<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder={t('quotations.search_customer')} value={customerSearchTerm}
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
                        <input type="date" className="form-control" value={form.quotationDate} onChange={e => setForm({ ...form, quotationDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.reference')}</label>
                        <input type="text" className="form-control" placeholder={editingId ? t('quotations.enter_reference') : 'Automatic (QT-0001 ...) if left empty'} value={form.reference} readOnly={!!reviseFromId}
                          title={reviseFromId ? 'Version numbers are added automatically' : undefined} onChange={e => setForm({ ...form, reference: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-12 col-sm-12 col-12">
                      <div className="mb-3" ref={productSearchRef}>
                        <label className="form-label">{t('common.product')}<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" placeholder={t('common.search_placeholder')} value={productSearchTerm}
                          onChange={e => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }}
                          onFocus={() => setShowProductDropdown(true)} />
                        {showProductDropdown && searchProducts(productSearchTerm).length > 0 && (
                          <ul className="list-group position-absolute w-100" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto' }}>
                            {searchProducts(productSearchTerm).map(p => (
                              <li key={p.id} className="list-group-item list-group-item-action d-flex align-items-center" style={{ cursor: 'pointer' }} onClick={() => handleProductSelect(p)}>
                                <img src={p.images?.[0] ? mediaUrl(p.images[0]) : '/assets/img/products/product1.png'} alt="" className="me-2" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                                <span>{p.productName}{p.model && <small className="text-muted ms-1">- {p.model}</small>}
                                  {p.description && <small className="d-block text-muted text-truncate" style={{ maxWidth: 420 }}>{p.description}</small>}</span>
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
                            <th>{t('quotations.product')}</th>
                            <th>{t('quotations.qty')}</th>
                            <th>{t('sales.purchase_price')}</th>
                            <th title="Rupees off each unit of this product">Item Discount<br /><small className="text-muted fw-normal">per unit (Rs)</small></th>
                            <th>{t('sales.unit_cost')}</th>
                            <th>{t('sales.total_cost')}</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={item.productId}>
                              <td>{item.productName}
                                {productInfo(item.productId).model && <div><small className="text-muted">Model: {productInfo(item.productId).model}</small></div>}
                                {productInfo(item.productId).description && <div><small className="text-muted d-inline-block text-truncate" style={{ maxWidth: 260 }}>{productInfo(item.productId).description}</small></div>}</td>
                              <td>
                                <div className="product-quantity d-flex align-items-center">
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', Math.max(1, item.quantity - 1))}><i data-feather="minus-circle"></i></span>
                                  <input type="number" className="form-control text-center mx-1" style={{ width: 60 }} value={item.quantity || ''}
                                    onChange={e => updateItemField(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                                  <span className="quantity-btn" onClick={() => updateItemField(idx, 'quantity', item.quantity + 1)}><i data-feather="plus-circle"></i></span>
                                </div>
                              </td>
                              <td><input type="number" className="form-control" style={{ width: 100 }} value={item.purchasePrice || ''} onChange={e => updateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)} /></td>
                              <td style={{ minWidth: 200 }}>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="form-check form-check-inline mb-0 me-0">
                                    <input className="form-check-input" type="radio" id={`line-disc-no-${idx}`} checked={!item.discountOn} onChange={() => setItemDiscountOn(idx, false)} />
                                    <label className="form-check-label" htmlFor={`line-disc-no-${idx}`}>No</label>
                                  </div>
                                  <div className="form-check form-check-inline mb-0 me-0">
                                    <input className="form-check-input" type="radio" id={`line-disc-yes-${idx}`} checked={!!item.discountOn} onChange={() => setItemDiscountOn(idx, true)} />
                                    <label className="form-check-label" htmlFor={`line-disc-yes-${idx}`}>Yes</label>
                                  </div>
                                  {item.discountOn && (
                                    <input type="number" min={0} step={1} inputMode="numeric" className="form-control form-control-sm" style={{ width: 90 }} placeholder="Rs" autoFocus
                                      title="Item discount: whole rupees off each unit of this product" value={item.discount || ''} onKeyDown={blockNonDigits}
                                      onChange={e => updateItemField(idx, 'discount', Math.min(wholeRupees(e.target.value), Math.floor(item.purchasePrice)))} />
                                  )}
                                </div>
                              </td>
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
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label" title="Rupees off the whole quotation">Overall Discount <small className="text-muted">(whole quotation, Rs)</small></label>
                        {/* Apply discount? No = no discount; Yes = a whole-rupee amount (not a percentage) */}
                        <div className="d-flex align-items-center gap-3" style={{ minHeight: 38 }}>
                          <div className="form-check form-check-inline mb-0">
                            <input className="form-check-input" type="radio" id="disc-no" checked={!discountOn}
                              onChange={() => { setDiscountOn(false); setForm({ ...form, discount: 0 }); }} />
                            <label className="form-check-label" htmlFor="disc-no">No</label>
                          </div>
                          <div className="form-check form-check-inline mb-0">
                            <input className="form-check-input" type="radio" id="disc-yes" checked={discountOn} onChange={() => setDiscountOn(true)} />
                            <label className="form-check-label" htmlFor="disc-yes">Yes</label>
                          </div>
                          {discountOn && (
                            <div className="input-group">
                              <span className="input-group-text">Rs</span>
                              <input type="number" min={0} step={1} inputMode="numeric" className="form-control" placeholder="e.g. 500" autoFocus
                                value={form.discount || ''}
                                onKeyDown={e => { if (['.', ',', 'e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  const amount = digits === '' ? 0 : parseInt(digits, 10);
                                  setForm({ ...form, discount: Math.min(amount, Math.floor(itemsTotal)) });
                                }} />
                            </div>
                          )}
                        </div>
                        {discountOn && <small className="text-muted">Whole rupees, up to the subtotal ({fmt(Math.floor(itemsTotal))}).</small>}
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('quotations.shipping')}</label>
                        {/* Add shipping? No = no shipping charge; Yes = a whole-rupee amount */}
                        <div className="d-flex align-items-center gap-3" style={{ minHeight: 38 }}>
                          <div className="form-check form-check-inline mb-0">
                            <input className="form-check-input" type="radio" id="ship-no" checked={!shippingOn}
                              onChange={() => { setShippingOn(false); setForm({ ...form, shipping: 0 }); }} />
                            <label className="form-check-label" htmlFor="ship-no">No</label>
                          </div>
                          <div className="form-check form-check-inline mb-0">
                            <input className="form-check-input" type="radio" id="ship-yes" checked={shippingOn} onChange={() => setShippingOn(true)} />
                            <label className="form-check-label" htmlFor="ship-yes">Yes</label>
                          </div>
                          {shippingOn && (
                            <div className="input-group">
                              <span className="input-group-text">Rs</span>
                              <input type="number" min={0} step={1} inputMode="numeric" className="form-control" placeholder="e.g. 300" autoFocus
                                value={form.shipping || ''} onKeyDown={blockNonDigits}
                                onChange={e => setForm({ ...form, shipping: wholeRupees(e.target.value) })} />
                            </div>
                          )}
                        </div>
                        {shippingOn && <small className="text-muted">Whole rupees, added to the total.</small>}
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.status')}<span className="text-danger ms-1">*</span></label>
                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Taxes */}
                  <TaxSelector base={taxBase} value={taxes} onChange={setTaxes} baseLabel="on the subtotal after discount" format={fmt} />

                  {/* Description */}
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label className="form-label">{t('common.description')}</label>
                        <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Installation, testing and commissioning: editable amount, added to the total */}
                  <div className="row">
                    <div className="col-lg-6 col-md-8 col-12">
                      <div className="mb-3">
                        <label className="form-label">Installation, Testing and Commissioning</label>
                        <div className="input-group">
                          <span className="input-group-text">Rs</span>
                          <input type="number" min={0} step={1} inputMode="numeric" className="form-control" placeholder="0"
                            value={form.installationCharges || ''} onKeyDown={blockNonDigits}
                            onChange={e => setForm({ ...form, installationCharges: wholeRupees(e.target.value) })} />
                        </div>
                        <small className="text-muted">Whole rupees, added to the quotation total. Leave empty if not charged.</small>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="row mb-3">
                    <div className="col-12 text-end">
                      <div className="text-muted">Subtotal: {fmt(itemsTotal)}{form.discount > 0 && <> &nbsp;- Overall discount: {fmt(form.discount)}</>}{taxAmount > 0 && <> &nbsp;+ Tax: {fmt(taxAmount)}</>}{form.shipping > 0 && <> &nbsp;+ Shipping: {fmt(form.shipping)}</>}{(form.installationCharges || 0) > 0 && <> &nbsp;+ Installation, testing &amp; commissioning: {fmt(form.installationCharges)}</>}</div>
                      <h5 className="mt-1">{t('common.grand_total')}: {fmt(grandTotal)}</h5>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={askTerms}>{reviseFromId ? `Save version R${form.reference.split('_R').pop()}` : editingId ? t('common.update') : t('common.submit')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Terms & conditions step (on submit) ===================== */}
      {showModal && termsStep && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1065 }}>
          <div className={`modal-dialog modal-dialog-centered ${termsStep === 'edit' ? 'modal-xl' : ''}`}>
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Terms &amp; conditions</h4>
                <button type="button" className="btn-close" onClick={() => setTermsStep(null)} disabled={savingQuotation} />
              </div>
              {termsStep === 'ask' ? (
                <>
                  <div className="modal-body">
                    <p className="mb-2" style={{ fontSize: 16 }}>Do you want to edit the terms &amp; conditions for this quotation?</p>
                    {saveError && <div className="alert alert-danger py-2">{saveError}</div>}
                    <small className="text-muted">
                      {quotationTerms
                        ? 'This quotation already has its own edited terms. "No" keeps them.'
                        : 'This quotation uses your standard terms. "Yes" lets you change them for this quotation only.'}
                    </small>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary me-auto" onClick={() => setTermsStep(null)} disabled={savingQuotation}>Back</button>
                    <button type="button" className="btn btn-outline-primary" onClick={() => saveQuotation(undefined)} disabled={savingQuotation}>
                      {savingQuotation ? 'Saving...' : 'No, save quotation'}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={startEditingTerms} disabled={savingQuotation}>Yes, edit terms</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-body">
                    <p className="text-muted mb-2">
                      These terms are printed on this quotation only (also after it is converted to a sale). Your standard terms are not changed.
                      One item per line: start a line with <code>- </code> for a bullet, <code>1: Payment</code> for a numbered heading.
                    </p>
                    {saveError && <div className="alert alert-danger py-2">{saveError}</div>}
                    <textarea className="form-control" rows={20} style={{ fontSize: 13, lineHeight: 1.45 }} value={termsDraft} onChange={e => setTermsDraft(e.target.value)} />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setTermsStep('ask')} disabled={savingQuotation}>Back</button>
                    <button type="button" className="btn btn-outline-secondary me-auto" onClick={() => setTermsDraft(standardTerms)} disabled={savingQuotation}>Reset to standard terms</button>
                    <button type="button" className="btn btn-primary" disabled={savingQuotation || !termsDraft.trim()}
                      onClick={() => saveQuotation(termsDraft.trim() === standardTerms.trim() ? '' : termsDraft)}>
                      {savingQuotation ? 'Saving...' : 'Save quotation'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== Versions (revision history) ===================== */}
      {versions && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Versions of {versions[0]?.reference || 'this quotation'}</h4>
                <button type="button" className="btn-close" onClick={() => setVersions(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted mb-2">Every version is kept. Convert whichever version the customer accepts - only one version can be converted.</p>
                <table className="table table-sm align-middle">
                  <thead className="thead-light"><tr><th>Version</th><th>Reference</th><th>Saved on</th><th className="text-end">Total</th><th>State</th><th /></tr></thead>
                  <tbody>
                    {versions.map(v => (
                      <tr key={v.id} className={v.supersededById ? '' : 'table-success'}>
                        <td>{versionLabel(v)}</td>
                        <td className="fw-semibold">{v.reference}</td>
                        <td className="text-nowrap">{v.createdAt}</td>
                        <td className="text-end">{fmt(v.grandTotal)}</td>
                        <td>
                          {v.saleReference ? <span className="badge badge-primary">Converted ({v.saleReference})</span>
                            : versions.some(x => x.saleId) ? <span className="badge badge-secondary">Not chosen</span>
                            : v.supersededById ? <span className="badge badge-secondary">Earlier version</span>
                            : <span className="badge badge-success">Latest</span>}
                        </td>
                        <td className="text-end text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-secondary me-1" title="View" onClick={() => { setVersions(null); openDetail(v); }}><i className="ti ti-eye"></i></button>
                          {canPrint(v) && <button type="button" className="btn btn-sm btn-outline-primary me-1" title="Print this version" onClick={() => printQuotation(v)}><i className="ti ti-printer"></i></button>}
                          {!versions.some(x => x.saleId) && (
                            <>
                              <button type="button" className="btn btn-sm btn-outline-info me-1" title={`Make a new version from ${v.reference}`} onClick={() => { setVersions(null); openEditModal(v, true); }}><i className="ti ti-versions"></i></button>
                              <button type="button" className="btn btn-sm btn-success" title={`Convert ${v.reference} to a sale`} onClick={() => { setVersions(null); openConvert(v); }}><i className="ti ti-shopping-cart-check"></i></button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setVersions(null)}>Close</button>
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
                <h4 className="modal-title">{t('quotations.quotation_detail')}</h4>
                <button type="button" className="close" onClick={() => setShowDetailModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-sm-6">
                    <p className="mb-1"><strong>{t('quotations.reference')}:</strong> {detailQuotation.reference || '—'}</p>
                    <p className="mb-1"><strong>{t('quotations.customer')}:</strong> {detailQuotation.customerName}</p>
                    <p className="mb-1"><strong>{t('quotations.date')}:</strong> {detailQuotation.quotationDate}</p>
                  </div>
                  <div className="col-sm-6 text-sm-end">
                    <p className="mb-1"><strong>{t('common.status')}:</strong> <span className={`badge ${statusBadge(detailQuotation.status)}`}>{detailQuotation.status}</span></p>
                    <p className="mb-1"><strong>{t('common.grand_total')}:</strong> {fmt(detailQuotation.grandTotal)}</p>
                    {detailQuotation.saleReference && <p className="mb-1 text-primary"><strong>Converted to sale:</strong> {detailQuotation.saleReference}</p>}
                    {(detailQuotation.revisionNo || detailQuotation.supersededById) ? (
                      <p className="mb-1"><strong>Version:</strong> {versionLabel(detailQuotation)} <a href="#" className="ms-1" onClick={e => { e.preventDefault(); openVersions(detailQuotation); }}>all versions</a></p>
                    ) : null}
                  </div>
                </div>
                {detailQuotation.supersededById && (
                  <div className="alert alert-secondary py-2">This is an earlier version (the newest is <strong>{referenceOf(familyOf(detailQuotation).find(x => !x.supersededById)?.id) || 'a newer version'}</strong>). It is kept unchanged{familyOpen(detailQuotation) ? ' and can still be converted to a sale if the customer chooses it' : ''}.</div>
                )}
                {detailQuotation.description && <p className="mb-3"><strong>{t('common.description')}:</strong> {detailQuotation.description}</p>}

                {detailQuotation.items.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>{t('quotations.product')}</th>
                          {detailQuotation.items.some(i => productInfo(i.productId).description) && <th>Description</th>}
                          {detailQuotation.items.some(i => productInfo(i.productId).model) && <th>Model</th>}
                          <th>{t('quotations.qty')}</th>
                          <th>{t('sales.purchase_price')}</th>
                          {detailQuotation.items.some(i => i.discount > 0) && <th>Item discount (per unit)</th>}
                          {detailQuotation.items.some(i => i.taxPercent > 0) && <th>{t('sales.tax_pct')}</th>}
                          {detailQuotation.items.some(i => i.taxPercent > 0) && <th>{t('sales.tax_amount')}</th>}
                          <th>{t('sales.unit_cost')}</th>
                          <th>{t('sales.total_cost')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailQuotation.items.map(i => (
                          <tr key={i.id}>
                            <td>{i.productName}</td>
                            {detailQuotation.items.some(x => productInfo(x.productId).description) && <td style={{ maxWidth: 260, whiteSpace: 'pre-line' }}><small>{productInfo(i.productId).description || '-'}</small></td>}
                            {detailQuotation.items.some(x => productInfo(x.productId).model) && <td>{productInfo(i.productId).model || '-'}</td>}
                            <td>{i.quantity}</td>
                            <td>{fmt(i.purchasePrice)}</td>
                            {detailQuotation.items.some(x => x.discount > 0) && <td>{fmt(i.discount)}</td>}
                            {detailQuotation.items.some(x => x.taxPercent > 0) && <td>{i.taxPercent.toFixed(2)}%</td>}
                            {detailQuotation.items.some(x => x.taxPercent > 0) && <td>{fmt(i.taxAmount)}</td>}
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
                      {detailQuotation.taxes && detailQuotation.taxes.length > 0
                        ? detailQuotation.taxes.map((tx, n) => <li key={n} className="list-group-item d-flex justify-content-between"><span>{tx.taxName} ({tx.percent}%)</span><span>{fmt(tx.amount)}</span></li>)
                        : detailQuotation.orderTax > 0 && <li className="list-group-item d-flex justify-content-between"><span>{t('quotations.order_tax')}</span><span>{fmt(detailQuotation.orderTax)}</span></li>}
                      {detailQuotation.discount > 0 && <li className="list-group-item d-flex justify-content-between"><span>Overall discount</span><span>- {fmt(detailQuotation.discount)}</span></li>}
                      {detailQuotation.shipping > 0 && <li className="list-group-item d-flex justify-content-between"><span>{t('quotations.shipping')}</span><span>{fmt(detailQuotation.shipping)}</span></li>}
                      {(detailQuotation.installationCharges || 0) > 0 && <li className="list-group-item d-flex justify-content-between"><span>Installation, Testing and Commissioning</span><span>{fmt(detailQuotation.installationCharges || 0)}</span></li>}
                      <li className="list-group-item d-flex justify-content-between"><strong>{t('common.grand_total')}</strong><strong>{fmt(detailQuotation.grandTotal)}</strong></li>
                    </ul>
                  </div>
                </div>
                {detailTerms && (
                  <div className="mt-4">
                    <h5 className="mb-2">Terms &amp; Conditions {detailQuotation.termsContent?.trim() && <small className="text-muted fw-normal">(edited for this quotation)</small>}</h5>
                    {/* termsToHtml escapes the text */}
                    <div className="border rounded p-3 bg-light quotation-terms" style={{ maxHeight: 360, overflowY: 'auto', fontSize: 13 }} dangerouslySetInnerHTML={{ __html: termsToHtml(detailTerms) }} />
                    <style>{'.quotation-terms h3{font-size:14px;font-weight:600;margin:10px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}.quotation-terms h4{font-size:13px;font-weight:600;margin:8px 0 2px}.quotation-terms p{margin:2px 0}.quotation-terms ul{margin:2px 0 4px;padding-left:18px}'}</style>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {canPrint(detailQuotation)
                  ? <button type="button" className="btn btn-primary" onClick={() => printQuotation(detailQuotation)}><i className="ti ti-printer me-1"></i>Print quotation</button>
                  : <small className="text-muted"><i className="ti ti-lock me-1" />Printing is available once an admin approves it.</small>}
                {familyOpen(detailQuotation) && (needsApproval(detailQuotation)
                  ? <button type="button" className="btn btn-primary me-auto" onClick={() => setApprovalFor(detailQuotation)}><i className="ti ti-send me-1"></i>{detailQuotation.approvalStatus === 'Pending' ? 'Awaiting approval' : 'Send for approval'}</button>
                  : <button type="button" className="btn btn-success me-auto" onClick={() => openConvert(detailQuotation)}><i className="ti ti-shopping-cart-check me-1"></i>Convert to sale</button>)}
                {!familyOpen(detailQuotation) && <span className="me-auto" />}
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>{t('common.close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Convert to Sale Modal ===================== */}
      {convertQ && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Convert to sale - {convertQ.reference || '#' + convertQ.id}</h4>
                <button type="button" className="btn-close" onClick={() => setConvertQ(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted mb-2">Customer: <strong className="text-dark">{convertQ.customerName}</strong>. The products below are taken out of stock and the sale is recorded under POS Orders.</p>
                <table className="table table-sm align-middle">
                  <thead className="thead-light"><tr><th>Product</th><th className="text-end">Qty</th><th className="text-end">In stock</th><th className="text-end">Total</th></tr></thead>
                  <tbody>
                    {convertQ.items.map(i => {
                      const inStock = convertStock[i.productId] ?? 0;
                      const short = inStock < convertQ.items.filter(x => x.productId === i.productId).reduce((n, x) => n + x.quantity, 0);
                      return (
                        <tr key={i.id} className={short ? 'table-danger' : ''}>
                          <td>{i.productName}</td>
                          <td className="text-end">{i.quantity}</td>
                          <td className="text-end">{inStock}{short && <span className="text-danger fw-semibold"> (short)</span>}</td>
                          <td className="text-end">{fmt(i.totalCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr><th colSpan={3} className="text-end" style={{ fontSize: 16 }}>Grand total</th><th className="text-end text-primary" style={{ fontSize: 18 }}>{fmt(convertQ.grandTotal)}</th></tr></tfoot>
                </table>
                {convertShortages.length > 0 && (
                  <div className="alert alert-warning py-2">Not enough stock for: {convertShortages.map(x => x.name).join(', ')}. Receive more stock first (Purchase Orders or Manage Stock).</div>
                )}
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Amount received now</label>
                    <input type="number" min={0} step="any" className="form-control" value={convertPaid}
                      onChange={e => setConvertPaid(e.target.value === '' ? '' : Number(e.target.value))} />
                    <small className="text-muted">Leave less than the total to record the rest as due.</small>
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Payment method</label>
                    <select className="form-select" value={convertPaymentType} onChange={e => setConvertPaymentType(e.target.value)}>
                      {PAYMENT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-md-5 mb-3 text-end">
                    <small className="text-muted d-block">Due after this</small>
                    <span className="fw-bold" style={{ fontSize: 20 }}>{fmt(Math.max(0, convertQ.grandTotal - (convertPaid === '' ? 0 : Number(convertPaid))))}</span>
                  </div>
                </div>
                <label className="form-label">Notes</label>
                <input className="form-control" placeholder="optional" value={convertNotes} onChange={e => setConvertNotes(e.target.value)} />
                {convertError && <div className="alert alert-danger py-2 mt-3 mb-0">{convertError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConvertQ(null)} disabled={converting}>Cancel</button>
                <button type="button" className="btn btn-success" onClick={submitConvert} disabled={converting || convertShortages.length > 0}>
                  <i className="ti ti-shopping-cart-check me-1"></i>{converting ? 'Converting...' : 'Convert to sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Delete Modal ===================== */}
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={confirmDelete} />
    </>
  );
};

export default QuotationList;
