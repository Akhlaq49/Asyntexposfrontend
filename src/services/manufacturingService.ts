import api from './api';

// ────────────────────────────────────────────
// BOM Interfaces
// ────────────────────────────────────────────

export interface BomItem {
  id?: number;
  rawMaterialId: number;
  rawMaterialName?: string;
  rawMaterialSku?: string;
  rawMaterialImage?: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  supplierId?: number;
  supplierName?: string;
}

export interface Bom {
  id: number;
  name: string;
  finishedProductId?: number;
  finishedProductName: string;
  finishedProductCategory?: string;
  finishedProductSubCategory?: string;
  salePrice: number;
  finishedProductSku?: string;
  finishedProductImage?: string;
  outputQuantity: number;
  laborCost: number;
  overheadCost: number;
  totalMaterialCost: number;
  totalCost: number;
  notes?: string;
  status: string;
  items: BomItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBomPayload {
  name: string;
  finishedProductName: string;
  finishedProductCategory: string;
  finishedProductSubCategory: string;
  salePrice: number;
  outputQuantity: number;
  laborCost: number;
  overheadCost: number;
  notes?: string;
  status: string;
  items: { rawMaterialId: number; quantity: number; unitCost: number; supplierId?: number }[];
}

export interface UpdateBomPayload extends CreateBomPayload {}

// ────────────────────────────────────────────
// Manufacturing Order Interfaces
// ────────────────────────────────────────────

export interface ManufacturingOrderItem {
  id?: number;
  rawMaterialId: number;
  rawMaterialName?: string;
  rawMaterialSku?: string;
  rawMaterialImage?: string;
  requiredQuantity: number;
  consumedQuantity: number;
  unitCost: number;
  totalCost: number;
  supplierId?: number;
  supplierName?: string;
}

export interface ManufacturingOrder {
  id: number;
  reference: string;
  bomId: number;
  bomName: string;
  finishedProductId?: number;
  finishedProductName: string;
  finishedProductImage?: string;
  quantity: number;
  targetStoreId?: number;
  targetStoreName?: string;
  status: 'Draft' | 'InProgress' | 'Completed' | 'Cancelled';
  laborCost: number;
  overheadCost: number;
  totalMaterialCost: number;
  totalCost: number;
  startDate?: string;
  completionDate?: string;
  notes?: string;
  items: ManufacturingOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateManufacturingOrderPayload {
  reference: string;
  bomId: number;
  quantity: number;
  targetStoreId?: number;
  status: string;
  laborCost: number;
  overheadCost: number;
  notes?: string;
  items: {
    rawMaterialId: number;
    requiredQuantity: number;
    consumedQuantity: number;
    unitCost: number;
    totalCost: number;
    supplierId?: number;
  }[];
}

export interface UpdateManufacturingOrderPayload extends CreateManufacturingOrderPayload {}

// ────────────────────────────────────────────
// Supplier Ledger & Payment Interfaces
// ────────────────────────────────────────────

export interface SupplierLedgerEntry {
  id: number;
  supplierId: number;
  supplierName: string;
  transactionType: string;
  referenceType: string;
  referenceId?: number;
  amount: number;
  runningBalance: number;
  description?: string;
  date: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: number;
  supplierId: number;
  supplierName: string;
  reference: string;
  amount: number;
  paymentMethod: string;
  description?: string;
  paymentDate: string;
  createdAt: string;
}

export interface CreateSupplierPaymentPayload {
  supplierId: number;
  reference: string;
  amount: number;
  paymentMethod: string;
  description?: string;
  paymentDate?: string;
}

export interface SupplierBalance {
  supplierId: number;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  totalPurchases: number;
  totalPayments: number;
  balance: number;
}

// ────────────────────────────────────────────
// BOM API Calls
// ────────────────────────────────────────────

export const getBoms = async (): Promise<Bom[]> => {
  try {
    const response = await api.get<Bom[]>('/manufacturing/bom');
    return response.data;
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    return [];
  }
};

export const getBomById = async (id: number): Promise<Bom | null> => {
  try {
    const response = await api.get<Bom>(`/manufacturing/bom/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching BOM:', error);
    return null;
  }
};

export const createBom = async (data: CreateBomPayload): Promise<any> => {
  try {
    const response = await api.post('/manufacturing/bom', data);
    return response.data;
  } catch (error) {
    console.error('Error creating BOM:', error);
    return null;
  }
};

export const updateBom = async (id: number, data: UpdateBomPayload): Promise<any> => {
  try {
    const response = await api.put(`/manufacturing/bom/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating BOM:', error);
    return null;
  }
};

export const deleteBom = async (id: number): Promise<boolean> => {
  try {
    await api.delete(`/manufacturing/bom/${id}`);
    return true;
  } catch (error: any) {
    const msg = error?.response?.data?.error || 'Error deleting BOM';
    console.error('Error deleting BOM:', msg);
    throw new Error(msg);
  }
};

// ────────────────────────────────────────────
// Manufacturing Order API Calls
// ────────────────────────────────────────────

export const getManufacturingOrders = async (): Promise<ManufacturingOrder[]> => {
  try {
    const response = await api.get<ManufacturingOrder[]>('/manufacturing/orders');
    return response.data;
  } catch (error) {
    console.error('Error fetching manufacturing orders:', error);
    return [];
  }
};

export const getManufacturingOrderById = async (id: number): Promise<ManufacturingOrder | null> => {
  try {
    const response = await api.get<ManufacturingOrder>(`/manufacturing/orders/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching manufacturing order:', error);
    return null;
  }
};

export const createManufacturingOrder = async (data: CreateManufacturingOrderPayload): Promise<any> => {
  try {
    const response = await api.post('/manufacturing/orders', data);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.error || 'Error creating manufacturing order';
    console.error('Error creating manufacturing order:', msg);
    throw new Error(msg);
  }
};

export const updateManufacturingOrder = async (id: number, data: UpdateManufacturingOrderPayload): Promise<any> => {
  try {
    const response = await api.put(`/manufacturing/orders/${id}`, data);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.error || 'Error updating manufacturing order';
    console.error('Error updating manufacturing order:', msg);
    throw new Error(msg);
  }
};

export const deleteManufacturingOrder = async (id: number): Promise<boolean> => {
  try {
    await api.delete(`/manufacturing/orders/${id}`);
    return true;
  } catch (error: any) {
    const msg = error?.response?.data?.error || 'Error deleting manufacturing order';
    console.error('Error deleting manufacturing order:', msg);
    throw new Error(msg);
  }
};

export const completeManufacturingOrder = async (id: number): Promise<any> => {
  try {
    const response = await api.post(`/manufacturing/orders/${id}/complete`);
    return response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.error || 'Error completing manufacturing order';
    console.error('Error completing manufacturing order:', msg);
    throw new Error(msg);
  }
};

// ────────────────────────────────────────────
// Supplier Ledger & Payment API Calls
// ────────────────────────────────────────────

export const getSupplierLedger = async (supplierId?: number): Promise<SupplierLedgerEntry[]> => {
  try {
    const params = supplierId ? `?supplierId=${supplierId}` : '';
    const response = await api.get<SupplierLedgerEntry[]>(`/manufacturing/supplier-ledger${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    return [];
  }
};

export const getSupplierPayments = async (supplierId?: number): Promise<SupplierPayment[]> => {
  try {
    const params = supplierId ? `?supplierId=${supplierId}` : '';
    const response = await api.get<SupplierPayment[]>(`/manufacturing/supplier-payments${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    return [];
  }
};

export const createSupplierPayment = async (data: CreateSupplierPaymentPayload): Promise<any> => {
  try {
    const response = await api.post('/manufacturing/supplier-payments', data);
    return response.data;
  } catch (error) {
    console.error('Error creating supplier payment:', error);
    return null;
  }
};

export const deleteSupplierPayment = async (id: number): Promise<boolean> => {
  try {
    await api.delete(`/manufacturing/supplier-payments/${id}`);
    return true;
  } catch (error: any) {
    const msg = error?.response?.data?.error || 'Error deleting supplier payment';
    console.error('Error deleting supplier payment:', msg);
    throw new Error(msg);
  }
};

export const getSupplierBalances = async (): Promise<SupplierBalance[]> => {
  try {
    const response = await api.get<SupplierBalance[]>('/manufacturing/supplier-balances');
    return response.data;
  } catch (error) {
    console.error('Error fetching supplier balances:', error);
    return [];
  }
};
