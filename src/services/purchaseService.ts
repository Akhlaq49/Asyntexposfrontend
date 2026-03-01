import api from './api';

export interface PurchaseItem {
  id?: number;
  productId?: number;
  productName: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  taxPercentage: number;
  taxAmount: number;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  id: number;
  supplierName: string;
  supplierRef?: string;
  reference: string;
  date: string;
  status: 'Ordered' | 'Received' | 'Pending' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid' | 'Overdue' | 'Partial';
  orderTax: number;
  discount: number;
  shipping: number;
  total: number;
  paid: number;
  due: number;
  notes?: string;
  items?: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchasePayload {
  supplierName: string;
  supplierRef?: string;
  reference: string;
  date: string;
  status: string;
  orderTax: number;
  discount: number;
  shipping: number;
  total: number;
  paid: number;
  notes?: string;
  items?: {
    productId?: number;
    productName: string;
    quantity: number;
    purchasePrice: number;
    discount: number;
    taxPercentage: number;
    taxAmount: number;
    unitCost: number;
    totalCost: number;
  }[];
}

export interface UpdatePurchasePayload extends CreatePurchasePayload {
  id?: number;
}

// Get all purchases
export const getPurchases = async (): Promise<Purchase[]> => {
  try {
    const response = await api.get<Purchase[]>('/purchases');
    return response.data;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }
};

// Get single purchase
export const getPurchaseById = async (id: number | string): Promise<Purchase | null> => {
  try {
    const response = await api.get<Purchase>(`/purchases/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching purchase ${id}:`, error);
    return null;
  }
};

// Create purchase
export const createPurchase = async (data: CreatePurchasePayload): Promise<Purchase | null> => {
  try {
    const response = await api.post<Purchase>('/purchases', data);
    return response.data;
  } catch (error) {
    console.error('Error creating purchase:', error);
    return null;
  }
};

// Update purchase
export const updatePurchase = async (id: number, data: UpdatePurchasePayload): Promise<Purchase | null> => {
  try {
    const response = await api.put<Purchase>(`/purchases/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating purchase ${id}:`, error);
    return null;
  }
};

// Delete purchase
export const deletePurchase = async (id: number | string): Promise<boolean> => {
  try {
    await api.delete(`/purchases/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting purchase ${id}:`, error);
    return false;
  }
};
