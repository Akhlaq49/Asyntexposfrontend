import api from './api';

/* ───────── types ───────── */

export type SaleUnit = 'Unit' | 'Strip' | 'Box';

export interface PharmacySettings {
  pharmacyName: string;
  address?: string | null;
  phone?: string | null;
  drugLicenceNo?: string | null;
  ntn?: string | null;
  strn?: string | null;
  receiptFooter?: string | null;
  defaultTaxPercent: number;
  maxCashierDiscountPercent: number;
  expiryAlertDays1: number;
  expiryAlertDays2: number;
  expiryAlertDays3: number;
  requirePrescription: boolean;
  refillRemindersEnabled: boolean;
  fbrEnabled: boolean;
  fbrPosId?: string | null;
  fbrToken?: string | null;
  fbrEnvironment: 'Sandbox' | 'Production';
  receiptLanguage?: string;
  blockOverCreditLimit?: boolean;
}

export interface ProductBatch {
  id: number;
  productId: number;
  productName: string;
  genericName: string;
  manufacturer: string;
  batchNo: string;
  expiryDate: string | null;
  manufacturedDate: string | null;
  quantity: number;
  purchasePrice: number;
  retailPrice: number;
  supplier: string | null;
  store: string | null;
  daysToExpiry: number | null;
  expiryStatus: 'Expired' | 'Critical' | 'Warning' | 'Watch' | 'Ok';
  stockValue: number;
}

export interface HeldBill {
  id: number;
  label: string;
  customerId: number | null;
  customerName: string | null;
  cartJson: string;
  total: number;
  userName: string | null;
  createdAt: string;
}

export interface TillSummary {
  id: number;
  userName: string;
  store: string | null;
  status: 'Open' | 'Closed';
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
  cashRefunds: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  bills: number;
  notes: string | null;
}

export interface SaleItemDetail {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  unitCost: number;
  totalCost: number;
  costPrice: number;
  saleUnit: SaleUnit;
  unitQuantity: number;
  batchInfo: string | null;
}

export interface SaleDetail {
  id: number;
  reference: string;
  customerId: number | null;
  customerName: string;
  biller: string;
  grandTotal: number;
  paid: number;
  due: number;
  orderTax: number;
  discount: number;
  status: string;
  paymentStatus: string;
  source: string;
  saleDate: string;
  saleDateTime: string;
  store: string | null;
  paymentMethod: string | null;
  couponCode: string | null;
  patientName: string | null;
  doctorName: string | null;
  prescriptionImage: string | null;
  fbrInvoiceNumber: string | null;
  fbrStatus: string | null;
  locationId?: number | null;
  previousBalance?: number | null;
  channel?: string;
  orderType?: string | null;
  items: SaleItemDetail[];
  payments: { id: number; reference: string; receivedAmount: number; payingAmount: number; paymentType: string; paymentDate: string }[];
}

export interface ReturnableSale {
  id: number;
  reference: string;
  customerId: number | null;
  customerName: string;
  grandTotal: number;
  saleDate: string;
  items: {
    saleItemId: number;
    productId: number;
    productName: string;
    soldQuantity: number;
    returnedQuantity: number;
    returnableQuantity: number;
    unitPrice: number;
    saleUnit: SaleUnit;
    unitQuantity: number;
    batchInfo: string | null;
  }[];
}

export interface PurchaseReturn {
  id: number;
  reference: string;
  purchaseId: number | null;
  supplierName: string;
  date: string;
  total: number;
  notes: string | null;
  createdBy: string | null;
  items: { id: number; productId: number; productName: string; batchId: number | null; batchNo: string | null; expiryDate: string | null; quantity: number; unitCost: number; total: number; reason: string }[];
}

export interface SupplierDue {
  supplier: string;
  purchases: number;
  totalPurchased: number;
  paid: number;
  returns: number;
  balance: number;
  lastPurchase: string | null;
}

export interface ReorderSuggestion {
  productId: number;
  productName: string;
  genericName: string;
  strength: string;
  currentStock: number;
  quantityAlert: number;
  suggestedQuantity: number;
  unitsPerBox: number;
  onOrder: number;
  lastSupplier: string;
  lastPurchasePrice: number;
  lastPurchaseUnit: string;
  lastPurchaseDate: string | null;
}

/* ───────── helpers ───────── */

/** Base units (tablets) in one unit of sale. */
export const unitMultiplier = (p: { unitsPerStrip?: number; stripsPerBox?: number }, unit: SaleUnit): number => {
  const strip = Math.max(1, Number(p.unitsPerStrip) || 1);
  const box = strip * Math.max(1, Number(p.stripsPerBox) || 1);
  return unit === 'Strip' ? strip : unit === 'Box' ? box : 1;
};

/** Units the product can be sold in, smallest first. */
export const saleUnitsFor = (p: { unitsPerStrip?: number; stripsPerBox?: number }): SaleUnit[] => {
  const units: SaleUnit[] = ['Unit'];
  if ((Number(p.unitsPerStrip) || 1) > 1) units.push('Strip');
  if ((Number(p.stripsPerBox) || 1) > 1 || (Number(p.unitsPerStrip) || 1) > 1) units.push('Box');
  return units;
};

export const unitLabel = (unit: SaleUnit, dosageForm?: string): string => {
  if (unit === 'Unit') {
    const f = (dosageForm || '').toLowerCase();
    if (f.includes('tab')) return 'Tablet';
    if (f.includes('cap')) return 'Capsule';
    return 'Unit';
  }
  return unit;
};

export const apiError = (err: unknown, fallback = 'Something went wrong.'): string => {
  const e = err as { response?: { data?: { message?: string; error?: string; title?: string } }; message?: string };
  return e?.response?.data?.message || e?.response?.data?.error || e?.response?.data?.title || e?.message || fallback;
};

/* ───────── API ───────── */

export const pharmacyService = {
  // settings
  getSettings: async () => (await api.get<PharmacySettings>('/pharmacy-settings')).data,
  saveSettings: async (s: PharmacySettings) => (await api.put<PharmacySettings>('/pharmacy-settings', s)).data,

  // batches & expiry
  getBatches: async (productId: number | string) => (await api.get<ProductBatch[]>(`/products/${productId}/batches`)).data,
  getExpiring: async (params: { days?: number; includeExpired?: boolean; manufacturer?: string; supplier?: string }) =>
    (await api.get<ProductBatch[]>('/products/expiring', { params })).data,
  updateBatch: async (batchId: number, body: { batchNo?: string; expiryDate?: string; manufacturedDate?: string }) =>
    (await api.put<ProductBatch>(`/products/batches/${batchId}`, body)).data,
  writeOffBatch: async (batchId: number, body: { quantity?: number; reason: string; notes?: string }) =>
    api.post(`/products/batches/${batchId}/write-off`, body),
  getSubstitutes: async (productId: number | string) => (await api.get(`/products/${productId}/substitutes`)).data as any[],

  // counter
  checkCoupon: async (code: string, amount: number, customerId?: number | null) =>
    (await api.get<{ code: string; discount: number }>('/counter/coupon', { params: { code, amount, customerId: customerId ?? undefined } })).data,
  uploadPrescription: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return (await api.post<{ path: string }>('/counter/prescription-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data.path;
  },
  resendFbr: async (saleId: number) => (await api.post<{ fbrInvoiceNumber: string }>(`/counter/sales/${saleId}/fbr`)).data,
  getReturnable: async (saleId: number) => (await api.get<ReturnableSale>(`/counter/sales/${saleId}/returnable`)).data,
  findSaleByReference: async (reference: string) => (await api.get<{ id: number }>(`/counter/sales/by-reference/${encodeURIComponent(reference)}`)).data.id,
  getSale: async (id: number | string) => (await api.get<SaleDetail>(`/sales/${id}`)).data,

  // held bills
  getHeldBills: async () => (await api.get<HeldBill[]>('/held-bills')).data,
  holdBill: async (body: { label?: string; customerId?: number | null; customerName?: string | null; cartJson: string; total: number }) =>
    (await api.post<HeldBill>('/held-bills', body)).data,
  recallBill: async (id: number) => (await api.post<HeldBill>(`/held-bills/${id}/recall`)).data,
  deleteHeldBill: async (id: number) => api.delete(`/held-bills/${id}`),

  // till
  getCurrentTill: async (): Promise<TillSummary | null> => {
    const res = await api.get<TillSummary>('/till/current');
    return res.status === 204 || !res.data ? null : res.data;
  },
  openTill: async (openingCash: number, store?: string) => (await api.post<TillSummary>('/till/open', { openingCash, store })).data,
  closeTill: async (id: number, countedCash: number, notes?: string) => (await api.post<TillSummary>(`/till/${id}/close`, { countedCash, notes })).data,
  getTillHistory: async (params: { from?: string; to?: string; user?: string }) => (await api.get<TillSummary[]>('/till/history', { params })).data,

  // purchasing
  getReorderSuggestions: async () => (await api.get<ReorderSuggestion[]>('/purchases/reorder-suggestions')).data,
  getPurchaseReturns: async (params?: { supplier?: string; from?: string; to?: string }) =>
    (await api.get<PurchaseReturn[]>('/purchase-returns', { params })).data,
  createPurchaseReturn: async (body: { purchaseId?: number | null; supplierName: string; date?: string; notes?: string; items: { productId: number; batchId?: number | null; quantity: number; unitCost?: number; reason: string }[] }) =>
    (await api.post<PurchaseReturn>('/purchase-returns', body)).data,
  deletePurchaseReturn: async (id: number) => api.delete(`/purchase-returns/${id}`),
  getSupplierDues: async () => (await api.get<SupplierDue[]>('/supplier-payments/dues')).data,
  getSupplierLedger: async (supplier: string) =>
    (await api.get<{ supplier: string; balance: number; entries: { date: string; type: string; reference: string; debit: number; credit: number; balance: number; notes: string | null }[] }>('/supplier-payments/ledger', { params: { supplier } })).data,
  paySupplier: async (body: { supplierName: string; purchaseId?: number | null; amount: number; paymentType: string; reference?: string; notes?: string; paymentDate?: string }) =>
    (await api.post<{ applied: { purchaseId: number; reference: string; amount: number }[]; advance: number }>('/supplier-payments', body)).data,

  // reports
  report: async <T = any>(name: string, params?: Record<string, string | number | undefined>) =>
    (await api.get<T>(`/pharmacy-reports/${name}`, { params })).data,

  // audit
  getAuditLogs: async (params: { from?: string; to?: string; user?: string; action?: string; entityType?: string; page?: number; pageSize?: number }) =>
    (await api.get<{ totalCount: number; page: number; pageSize: number; items: { id: number; userName: string; action: string; entityType: string; entityId: string | null; details: string | null; createdAt: string }[] }>('/audit-logs', { params })).data,
};

export default pharmacyService;
