import api from './api';

export type PurchaseOrderStatus = 'Draft' | 'Ordered' | 'PartiallyReceived' | 'Received' | 'Cancelled';

export interface PurchaseOrderItem {
  id: number;
  productId: number;
  productName: string;
  sku?: string;
  productImage: string;
  quantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  totalCost: number;
  inStock: number;
}

export interface PurchaseOrderReceipt {
  purchaseId: number;
  reference: string;
  date: string;
  units: number;
  total: number;
  paid: number;
  paymentStatus: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId?: number | null;
  supplierName: string;
  supplierPhone?: string | null;
  orderDate: string;
  expectedDate?: string | null;
  status: PurchaseOrderStatus;
  subTotal: number;
  orderTax: number;
  taxes?: import('../components/common/TaxSelector').AppliedTax[];
  discount: number;
  shipping: number;
  total: number;
  notes?: string | null;
  createdBy?: string | null;
  orderedUnits: number;
  receivedUnits: number;
  receivedValue: number;
  createdAt: string;
  items: PurchaseOrderItem[];
  receipts: PurchaseOrderReceipt[];
}

export interface SavePurchaseOrderPayload {
  supplierId?: number | null;
  supplierName: string;
  supplierPhone?: string | null;
  orderDate?: string;
  expectedDate?: string | null;
  status: 'Draft' | 'Ordered';
  orderTax: number;
  taxes?: import('../components/common/TaxSelector').AppliedTax[];
  discount: number;
  shipping: number;
  notes?: string;
  items: { productId: number; quantity: number; unitCost: number; discount: number; taxPercent: number }[];
}

export interface ReceivePurchaseOrderPayload {
  date?: string;
  paid: number;
  notes?: string;
  lines: { itemId: number; quantity: number }[];
}

/** Error text from the API ({ message }) or a fallback */
export const apiError = (err: any, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

export const getPurchaseOrders = async (params?: { status?: string; search?: string }) =>
  (await api.get<PurchaseOrder[]>('/purchase-orders', { params })).data;

export const getPurchaseOrder = async (id: number) =>
  (await api.get<PurchaseOrder>(`/purchase-orders/${id}`)).data;

export const createPurchaseOrder = async (payload: SavePurchaseOrderPayload) =>
  (await api.post<PurchaseOrder>('/purchase-orders', payload)).data;

export const updatePurchaseOrder = async (id: number, payload: SavePurchaseOrderPayload) =>
  (await api.put<PurchaseOrder>(`/purchase-orders/${id}`, payload)).data;

export const markPurchaseOrderOrdered = async (id: number) =>
  (await api.post<PurchaseOrder>(`/purchase-orders/${id}/mark-ordered`)).data;

export const receivePurchaseOrder = async (id: number, payload: ReceivePurchaseOrderPayload) =>
  (await api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, payload)).data;

export const cancelPurchaseOrder = async (id: number) =>
  (await api.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`)).data;

export const deletePurchaseOrder = async (id: number) => {
  await api.delete(`/purchase-orders/${id}`);
};
