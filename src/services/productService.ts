import api from './api';

export interface ProductPayload {
  productName: string;
  slug: string;
  sku: string;
  sellingType: string;
  category: string;
  brand: string;
  color?: string;
  model?: string;
  unit: string;
  description: string;
  // Pricing & Stock
  productType: 'single' | 'variable';
  quantity: number;
  price: number;
  taxType: string;
  tax: string;
  /** JSON list of applied taxes (tax type + percent) */
  taxesJson?: string;
  discountType: string;
  discountValue: number;
  quantityAlert: number;
  // Custom fields
  warranty: string;
  // Images
  images: File[];
}

export interface ProductResponse {
  id: string;
  productName: string;
  slug: string;
  sku: string;
  sellingType: string;
  category: string;
  subCategory: string;
  brand: string;
  color?: string;
  model?: string;
  unit: string;
  barcodeSymbology: string;
  itemBarcode: string;
  description: string;
  productType: string;
  quantity: number;
  price: number;
  taxType: string;
  tax: string;
  taxes?: import('../components/common/TaxSelector').AppliedTax[];
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
  const response = await api.get<{ id: number; fullName: string }[]>('/parties?role=Store');
  return response.data.map((s) => ({ value: s.fullName, label: s.fullName }));
};

export const getWarehouses = async (): Promise<DropdownOption[]> => {
  const response = await api.get<{ id: number; fullName: string }[]>('/parties?role=Warehouse');
  return response.data.map((w) => ({ value: w.fullName, label: w.fullName }));
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

// Active warranties from the Warranties module (the product stores the warranty name)
export const getWarranties = async (): Promise<DropdownOption[]> => {
  const response = await api.get<{ name: string; durationDisplay: string; status: string }[]>('/warranties');
  return response.data
    .filter((w) => (w.status || '').toLowerCase() === 'active')
    .map((w) => ({ value: w.name, label: w.durationDisplay ? `${w.name} (${w.durationDisplay})` : w.name }));
};
