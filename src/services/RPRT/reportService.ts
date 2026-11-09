import api from '../api';
































// ═══════════════════════════════════════
// API calls
// ═══════════════════════════════════════

function dateParams(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return { params };
}




















// ═══════════════════════════════════════
// Standard POS Report Types
// ═══════════════════════════════════════

export interface SalesReportItemDto {
  productImage?: string;
  sku: string; productName: string; brand: string; category: string;
  soldQty: number; soldAmount: number; inStockQty: number;
}
export interface SalesReportDto {
  totalAmount: number; totalPaid: number; totalUnpaid: number; overdue: number;
  items: SalesReportItemDto[];
}

export interface PurchaseReportItemDto {
  productImage?: string;
  reference: string; sku: string; dueDate: string; productName: string;
  category: string; inStockQty: number; purchaseQty: number; purchaseAmount: number;
}
interface PurchaseReportDto { items: PurchaseReportItemDto[]; }

export interface InventoryReportItemDto {
  sku: string; productName: string; category: string; unit: string; inStock: number;
}


export interface SupplierReportItemDto {
  reference: string; id: number; supplier: string; totalItems: number;
  amount: number; paymentMethod: string; status: string;
}
export interface SupplierDueReportItemDto {
  reference: string; id: number; supplier: string;
  totalAmount: number; paid: number; due: number; status: string;
}

export interface CustomerReportItemDto {
  reference: string; code: string; customer: string; totalOrders: number;
  amount: number; paymentMethod: string; status: string;
}
export interface CustomerDueReportItemDto {
  reference: string; code: string; customer: string;
  totalAmount: number; paid: number; due: number; status: string;
}

export interface ProductReportItemDto {
  sku: string; productName: string; category: string; brand: string;
  qty: number; price: number; totalOrdered: number; revenue: number;
}

export interface ExpenseReportItemDto {
  expenseName: string; category: string; description: string;
  date: string; amount: number; status: string;
}

export interface ProfitAndLossMonthDto {
  month: string; sales: number; service: number; purchaseReturn: number;
  grossProfit: number; purchaseExpense: number; salesReturn: number; otherExpense: number;
  totalExpense: number; netProfit: number;
}
export interface ProfitAndLossDto { months: ProfitAndLossMonthDto[]; }

export interface AnnualReportMonthDto {
  month: string; sales: number; purchases: number; expenses: number; returns: number; profit: number;
}
export interface AnnualReportDto {
  year: number; months: AnnualReportMonthDto[]; totals: AnnualReportMonthDto;
}


// ═══════════════════════════════════════
// Standard POS Report API Calls
// ═══════════════════════════════════════

export const getSalesReport = (from?: string, to?: string) =>
  api.get<SalesReportDto>('/reports/sales-report', dateParams(from, to)).then(r => r.data);

export const getBestSellers = (from?: string, to?: string) =>
  api.get<SalesReportItemDto[]>('/reports/best-sellers', dateParams(from, to)).then(r => r.data);

export const getPurchaseReport = (from?: string, to?: string) =>
  api.get<PurchaseReportDto>('/reports/purchase-report', dateParams(from, to)).then(r => r.data);

export const getInventoryReport = () =>
  api.get<InventoryReportItemDto[]>('/reports/inventory-report').then(r => r.data);


export const getSupplierReport = (from?: string, to?: string) =>
  api.get<SupplierReportItemDto[]>('/reports/supplier-report', dateParams(from, to)).then(r => r.data);

export const getSupplierDueReport = (from?: string, to?: string) =>
  api.get<SupplierDueReportItemDto[]>('/reports/supplier-due-report', dateParams(from, to)).then(r => r.data);

export const getCustomerReport = (from?: string, to?: string) =>
  api.get<CustomerReportItemDto[]>('/reports/customer-report', dateParams(from, to)).then(r => r.data);

export const getCustomerDueReport = (from?: string, to?: string) =>
  api.get<CustomerDueReportItemDto[]>('/reports/customer-due-report', dateParams(from, to)).then(r => r.data);

export const getProductReport = (from?: string, to?: string) =>
  api.get<ProductReportItemDto[]>('/reports/product-report', dateParams(from, to)).then(r => r.data);



export const getExpenseReport = (from?: string, to?: string) =>
  api.get<ExpenseReportItemDto[]>('/reports/expense-report', dateParams(from, to)).then(r => r.data);


export const getProfitAndLoss = (from?: string, to?: string) =>
  api.get<ProfitAndLossDto>('/reports/profit-and-loss', dateParams(from, to)).then(r => r.data);

export const getAnnualReport = (year?: number) =>
  api.get<AnnualReportDto>('/reports/annual-report', { params: year ? { year } : {} }).then(r => r.data);





