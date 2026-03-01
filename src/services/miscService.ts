import api from './api';

export interface MiscTransaction {
  id: string;
  customerId: string;
  customerName: string;
  transactionType: 'Credit' | 'Debit' | 'Adjustment';
  amount: number;
  balance: number;
  description: string;
  referenceId?: string;
  referenceType: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreateMiscTransaction {
  customerId: number;
  transactionType: 'Credit' | 'Debit';
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
}

export interface PayInstallmentRequest {
  amount: number;
  useMiscBalance: boolean;
  paymentMethod?: string;
  notes?: string;
}

export async function getCustomerMiscTransactions(customerId: string): Promise<MiscTransaction[]> {
  const response = await api.get<MiscTransaction[]>(`/miscellaneousregister/customer/${customerId}`);
  return response.data;
}

export async function getCustomerMiscBalance(customerId: string): Promise<number> {
  const response = await api.get<number>(`/miscellaneousregister/customer/${customerId}/balance`);
  return response.data;
}

export async function createMiscTransaction(transaction: CreateMiscTransaction): Promise<MiscTransaction> {
  const response = await api.post<MiscTransaction>('/miscellaneousregister', transaction);
  return response.data;
}

export async function deleteMiscTransaction(id: string): Promise<void> {
  await api.delete(`/miscellaneousregister/${id}`);
}

export async function getMiscSummary() {
  const response = await api.get('/miscellaneousregister/summary');
  return response.data;
}

export async function payInstallment(planId: string, installmentNo: number, payment: PayInstallmentRequest) {
  const response = await api.put(`/installments/${planId}/pay/${installmentNo}`, payment);
  return response.data;
}