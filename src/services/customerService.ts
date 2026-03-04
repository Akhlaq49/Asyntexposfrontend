import api from './api';

export interface Customer {
  id: string;
  name: string;
  so?: string;
  cnic?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  picture?: string;
  status: 'active' | 'inactive';
  miscBalance?: number;
}

export interface CustomerGuarantor {
  id: number;
  name: string;
  so?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  relationship?: string;
  picture?: string;
  planId: string;
  productName: string;
  planStatus: string;
}

export async function getCustomers(): Promise<Customer[]> {
  const response = await api.get<Customer[]>('/customers');
  return response.data;
}

export async function getCustomerById(id: string): Promise<Customer> {
  const response = await api.get<Customer>(`/customers/${id}`);
  return response.data;
}

export async function createCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
  const response = await api.post<Customer>('/customers', data);
  return response.data;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const response = await api.put<Customer>(`/customers/${id}`, data);
  return response.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`);
}

export async function uploadCustomerPicture(id: string, file: File): Promise<Customer> {
  const formData = new FormData();
  formData.append('picture', file);
  const response = await api.post<Customer>(`/customers/${id}/picture`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getCustomerGuarantors(customerId: string): Promise<CustomerGuarantor[]> {
  const { getInstallmentPlans } = await import('./installmentService');
  const plans = await getInstallmentPlans();
  const customerPlans = plans.filter(p => p.customerId === customerId);
  const guarantors: CustomerGuarantor[] = [];
  for (const plan of customerPlans) {
    for (const g of plan.guarantors) {
      guarantors.push({
        ...g,
        planId: plan.id,
        productName: plan.productName,
        planStatus: plan.status,
      });
    }
  }
  return guarantors;
}
