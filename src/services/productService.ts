import api from './api';

export interface ProductPayload {
  store: string;
  warehouse: string;
  productName: string;
  slug: string;
  sku: string;
  sellingType: string;
  category: string;
  subCategory: string;
  brand: string;
  unit: string;
  barcodeSymbology: string;
  itemBarcode: string;
  description: string;
  // Pricing & Stock
  productType: 'single' | 'variable';
  quantity: number;
  price: number;
  taxType: string;
  tax: string;
  discountType: string;
  discountValue: number;
  quantityAlert: number;
  // Custom fields
  warranty: string;
  manufacturer: string;
  manufacturedDate: string;
  expiryDate: string;
  // Images
  images: File[];
}

export interface ProductResponse {
  id: string;
  store: string;
  warehouse: string;
  productName: string;
  slug: string;
  sku: string;
  sellingType: string;
  category: string;
  subCategory: string;
  brand: string;
  unit: string;
  barcodeSymbology: string;
  itemBarcode: string;
  description: string;
  productType: string;
  quantity: number;
  price: number;
  taxType: string;
  tax: string;
  discountType: string;
  discountValue: number;
  quantityAlert: number;
  warranty: string;
  manufacturer: string;
  manufacturedDate: string;
  expiryDate: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DropdownOption {
  value: string;
  label: string;
}

// Product CRUD
export const createProduct = async (data: ProductPayload): Promise<ProductResponse> => {
  const formData = new FormData();

  // Append all text fields
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'images') {
      formData.append(key, String(value));
    }
  });

  // Append images
  if (data.images && data.images.length > 0) {
    data.images.forEach((file) => {
      formData.append('images', file);
    });
  }

  const response = await api.post<ProductResponse>('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getProducts = async (): Promise<ProductResponse[]> => {
  const response = await api.get<ProductResponse[]>('/products');
  return response.data;
};

export const getProductById = async (id: string): Promise<ProductResponse> => {
  const response = await api.get<ProductResponse>(`/products/${id}`);
  return response.data;
};

export const updateProduct = async (id: string, data: Partial<ProductPayload>): Promise<ProductResponse> => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'images') {
      formData.append(key, String(value));
    }
  });
  if (data.images && data.images.length > 0) {
    data.images.forEach((file) => {
      formData.append('images', file);
    });
  }
  const response = await api.put<ProductResponse>(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};

// Dropdown data fetchers
export const getStores = async (): Promise<DropdownOption[]> => {
  const response = await api.get<DropdownOption[]>('/stores');
  return response.data;
};

export const getWarehouses = async (): Promise<DropdownOption[]> => {
  const response = await api.get<DropdownOption[]>('/warehouses');
  return response.data;
};

export const getCategories = async (): Promise<DropdownOption[]> => {
  const response = await api.get<{ id: number; name: string }[]>('/categories');
  return response.data.map((c) => ({ value: c.name, label: c.name }));
};

export const getSubCategories = async (): Promise<DropdownOption[]> => {
  const response = await api.get<{ id: number; subCategory: string }[]>('/sub-categories');
  return response.data.map((sc) => ({ value: sc.subCategory, label: sc.subCategory }));
};

export const getBrands = async (): Promise<DropdownOption[]> => {
  const response = await api.get<DropdownOption[]>('/brands');
  return response.data;
};

export const getUnits = async (): Promise<DropdownOption[]> => {
  const response = await api.get<DropdownOption[]>('/units');
  return response.data;
};
