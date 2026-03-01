import api from './api';

export interface PartySearchResult {
  id: number;
  name: string;
  so?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  email?: string;
  city?: string;
  picture?: string;
  role: string;
}

export interface GuarantorDto {
  id: number;
  name: string;
  so?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  relationship?: string;
  picture?: string;
}

export interface InstallmentPlan {
  id: string;
  customerId: string;
  customerName: string;
  customerSo?: string;
  customerCnic?: string;
  customerPhone: string;
  customerAddress: string;
  customerImage?: string;
  productName: string;
  productImage: string;
  productPrice: number;
  financeAmount?: number;
  downPayment: number;
  financedAmount: number;
  interestRate: number; // annual %
  tenure: number; // months
  emiAmount: number;
  totalPayable: number;
  totalInterest: number;
  startDate: string;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  paidInstallments: number;
  remainingInstallments: number;
  nextDueDate: string;
  createdAt: string;
  schedule: RepaymentEntry[];
  guarantors: GuarantorDto[];
}

export interface RepaymentEntry {
  installmentNo: number;
  dueDate: string;
  emiAmount: number;
  principal: number;
  interest: number;
  balance: number;
  status: 'paid' | 'partial' | 'due' | 'overdue' | 'upcoming';
  paidDate?: string;
  actualPaidAmount?: number;
  miscAdjustedAmount?: number;
}

export interface CreateInstallmentPayload {
  customerId: number;
  productId: number;
  financeAmount?: number;
  downPayment: number;
  interestRate: number;
  tenure: number;
  startDate: string;
}

export interface PreviewInstallmentPayload {
  productPrice: number;
  financeAmount?: number;
  downPayment: number;
  interestRate: number;
  tenure: number;
  startDate: string;
}

export interface InstallmentPreview {
  productPrice: number;
  financeAmount: number;
  financedAmount: number;
  downPayment: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  totalPayable: number;
  totalInterest: number;
  schedule: RepaymentEntry[];
}

// API calls
export async function getInstallmentPlans(): Promise<InstallmentPlan[]> {
  const response = await api.get<InstallmentPlan[]>('/installments');
  return response.data;
}

export async function getInstallmentById(id: string): Promise<InstallmentPlan> {
  const response = await api.get<InstallmentPlan>(`/installments/${id}`);
  return response.data;
}

export async function createInstallment(payload: CreateInstallmentPayload): Promise<InstallmentPlan> {
  const response = await api.post<InstallmentPlan>('/installments', payload);
  return response.data;
}

export interface PayInstallmentRequest {
  amount: number;
  useMiscBalance: boolean;
  paymentMethod?: string;
  notes?: string;
}

export async function payInstallment(planId: string, installmentNo: number, payment: PayInstallmentRequest): Promise<{ message: string; overpayment: number; status: string; actualPaidAmount: number; remainingForEntry: number }> {
  const response = await api.put(`/installments/${planId}/pay/${installmentNo}`, payment);
  return response.data;
}

// Deprecated - use payInstallment instead
export async function markInstallmentPaid(planId: string, installmentNo: number): Promise<void> {
  await api.put(`/installments/${planId}/pay/${installmentNo}`, { amount: 0, useMiscBalance: false });
}

export async function cancelInstallment(id: string): Promise<void> {
  await api.delete(`/installments/${id}`);
}

// Guarantor API calls
export async function addGuarantor(planId: string, data: FormData): Promise<GuarantorDto> {
  const response = await api.post<GuarantorDto>(`/installments/${planId}/guarantors`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateGuarantor(guarantorId: number, data: FormData): Promise<GuarantorDto> {
  const response = await api.put<GuarantorDto>(`/installments/guarantors/${guarantorId}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteGuarantor(guarantorId: number): Promise<void> {
  await api.delete(`/installments/guarantors/${guarantorId}`);
}

// Preview / calculation endpoint (server-side)
export async function previewInstallment(payload: PreviewInstallmentPayload): Promise<InstallmentPreview> {
  const response = await api.post<InstallmentPreview>('/installments/preview', payload);
  return response.data;
}

// Party search for guarantor auto-fill
export async function searchParties(query?: string): Promise<PartySearchResult[]> {
  const response = await api.get<PartySearchResult[]>('/installments/parties/search', {
    params: { q: query || '' },
  });
  return response.data;
}
