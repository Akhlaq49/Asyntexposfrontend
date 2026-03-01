import api from './api';

// ═══════════════════════════════════════
// DTOs / types
// ═══════════════════════════════════════

export interface CollectionByDate {
  date: string;
  count: number;
  amount: number;
}

export interface InstallmentCollectionReport {
  totalInstallmentsDue: number;
  totalCollected: number;
  pendingCount: number;
  latePayments: number;
  totalAmountDue: number;
  totalAmountCollected: number;
  pendingAmount: number;
  lateAmount: number;
  collectionByDate: CollectionByDate[];
}

export interface AgingBucket {
  days0To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  count0To30: number;
  count31To60: number;
  count61To90: number;
  count90Plus: number;
}

export interface CustomerOutstanding {
  customerId: number;
  customerName: string;
  phone?: string;
  remainingBalance: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  planId: number;
  productName: string;
}

export interface OutstandingBalanceReport {
  totalOutstanding: number;
  totalOverdue: number;
  totalCustomers: number;
  aging: AgingBucket;
  customers: CustomerOutstanding[];
}

export interface DailyCashFlowEntry {
  date: string;
  cashCollected: number;
  onlinePayments: number;
  downPayments: number;
  expenses: number;
  netFlow: number;
}

export interface DailyCashFlowReport {
  date: string;
  openingBalance: number;
  cashCollected: number;
  onlinePayments: number;
  downPayments: number;
  expenses: number;
  closingBalance: number;
  dailyEntries: DailyCashFlowEntry[];
}

export interface MonthlyProfit {
  month: string;
  collections: number;
  interest: number;
  downPayments: number;
  expenses: number;
  netProfit: number;
}

export interface InstallmentProfitLoss {
  totalSales: number;
  totalDownPayments: number;
  interestEarned: number;
  totalCollected: number;
  badDebts: number;
  totalExpenses: number;
  netProfit: number;
  grossRevenue: number;
  monthlyBreakdown: MonthlyProfit[];
}

export interface LedgerTransaction {
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  reference?: string;
}

export interface CustomerLedger {
  customerId: number;
  customerName: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  totalPaid: number;
  remainingBalance: number;
  totalPenalties: number;
  transactions: LedgerTransaction[];
}

export interface Defaulter {
  customerId: number;
  customerName: string;
  phone?: string;
  address?: string;
  planId: number;
  productName: string;
  missedInstallments: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  status: string;
  lastPaidDate?: string;
}

export interface DefaultersReport {
  totalDefaulters: number;
  totalDefaultedAmount: number;
  defaulters: Defaulter[];
}

export interface PaymentHistoryEntry {
  customerId: number;
  customerName: string;
  phone?: string;
  planId: number;
  installmentNo: number;
  paidDate: string;
  amount: number;
  miscAmount?: number;
  paymentMethod: string;
  productName: string;
}

export interface PaymentMethodSummary {
  method: string;
  count: number;
  amount: number;
}

export interface PaymentHistoryReport {
  totalPayments: number;
  totalAmount: number;
  payments: PaymentHistoryEntry[];
  methodSummary: PaymentMethodSummary[];
}

export interface TenureSummary {
  tenureLabel: string;
  tenure: number;
  count: number;
  totalAmount: number;
}

export interface MonthlySales {
  month: string;
  contracts: number;
  downPayments: number;
  financedAmount: number;
}

export interface InstallmentSalesSummary {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  cancelledContracts: number;
  totalDownPayments: number;
  totalFinancedAmount: number;
  totalRevenue: number;
  tenureBreakdown: TenureSummary[];
  monthlySales: MonthlySales[];
}

export interface ProductSalesItem {
  productId: number;
  productName: string;
  productImage?: string;
  unitsSold: number;
  totalRevenue: number;
  averagePrice: number;
  downPaymentCollected: number;
}

export interface ProductSalesReport {
  totalProducts: number;
  totalUnitsSold: number;
  totalRevenue: number;
  products: ProductSalesItem[];
}

export interface DefaultTrend {
  month: string;
  totalActive: number;
  newDefaults: number;
  defaultRate: number;
}

export interface DefaultRateReport {
  totalFinancedCustomers: number;
  numberOfDefaulters: number;
  defaultPercentage: number;
  totalFinancedAmount: number;
  defaultedAmount: number;
  monthlyTrend: DefaultTrend[];
}

export interface MonthlyRecovery {
  month: string;
  overdueAmount: number;
  recovered: number;
  recoveryRate: number;
}

export interface RecoveryPerformance {
  totalOverdueAmount: number;
  amountRecovered: number;
  recoveryRate: number;
  totalOverdueEntries: number;
  recoveredEntries: number;
  monthlyRecovery: MonthlyRecovery[];
}

export interface DueTodayItem {
  planId: number;
  customerId: number;
  customerName: string;
  phone?: string;
  address?: string;
  installmentNo: number;
  amountDue: number;
  dueDate: string;
  productName: string;
  status: string;
}

export interface DueTodayReport {
  totalDueToday: number;
  totalAmountDue: number;
  items: DueTodayItem[];
}

export interface UpcomingDueReport {
  totalUpcoming: number;
  totalAmountDue: number;
  items: DueTodayItem[];
}

export interface LateFeeItem {
  planId: number;
  customerName: string;
  phone?: string;
  installmentNo: number;
  dueDate: string;
  paidDate?: string;
  daysLate: number;
  lateFeeAmount: number;
  isPaid: boolean;
}

export interface LateFeeReport {
  totalLateFees: number;
  paidLateFees: number;
  unpaidLateFees: number;
  totalLateEntries: number;
  items: LateFeeItem[];
}


// ═══════════════════════════════════════
// API calls
// ═══════════════════════════════════════

function dateParams(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return { params };
}

// Financial
export const getInstallmentCollectionReport = (from?: string, to?: string) =>
  api.get<InstallmentCollectionReport>('/reports/installment-collection', dateParams(from, to)).then(r => r.data);

export const getOutstandingBalanceReport = () =>
  api.get<OutstandingBalanceReport>('/reports/outstanding-balance').then(r => r.data);

export const getDailyCashFlowReport = (from?: string, to?: string) =>
  api.get<DailyCashFlowReport>('/reports/daily-cash-flow', dateParams(from, to)).then(r => r.data);

export const getInstallmentProfitLoss = (from?: string, to?: string) =>
  api.get<InstallmentProfitLoss>('/reports/profit-loss', dateParams(from, to)).then(r => r.data);

// Customer
export const getCustomerLedger = (customerId: number) =>
  api.get<CustomerLedger>(`/reports/customer-ledger/${customerId}`).then(r => r.data);

export const getDefaultersReport = () =>
  api.get<DefaultersReport>('/reports/defaulters').then(r => r.data);

export const getPaymentHistoryReport = (customerId?: number, from?: string, to?: string) =>
  api.get<PaymentHistoryReport>('/reports/payment-history', {
    params: { ...(customerId ? { customerId } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }
  }).then(r => r.data);

// Sales
export const getInstallmentSalesSummary = (from?: string, to?: string) =>
  api.get<InstallmentSalesSummary>('/reports/installment-sales-summary', dateParams(from, to)).then(r => r.data);

export const getProductSalesReport = (from?: string, to?: string) =>
  api.get<ProductSalesReport>('/reports/product-sales', dateParams(from, to)).then(r => r.data);

// Risk & Compliance
export const getDefaultRateReport = () =>
  api.get<DefaultRateReport>('/reports/default-rate').then(r => r.data);

export const getRecoveryPerformance = (from?: string, to?: string) =>
  api.get<RecoveryPerformance>('/reports/recovery-performance', dateParams(from, to)).then(r => r.data);

// Operational
export const getDueTodayReport = () =>
  api.get<DueTodayReport>('/reports/due-today').then(r => r.data);

export const getUpcomingDueReport = (days = 7) =>
  api.get<UpcomingDueReport>('/reports/upcoming-due', { params: { days } }).then(r => r.data);

export const getLateFeeReport = (from?: string, to?: string) =>
  api.get<LateFeeReport>('/reports/late-fees', dateParams(from, to)).then(r => r.data);


// ═══════════════════════════════════════
// Product Profit Report
// ═══════════════════════════════════════

export interface ProductProfitItem {
  planId: number;
  customerName: string;
  phone?: string;
  productName: string;
  productImage?: string;
  productPrice: number;
  financedAmount: number;
  totalPayable: number;
  downPayment: number;
  interestEarned: number;
  profit: number;
  profitPercentage: number;
  status: string;
  startDate: string;
  tenure: number;
  interestRate: number;
}

export interface ProductProfitReport {
  totalPlans: number;
  totalProductCost: number;
  totalFinancedAmount: number;
  totalProfit: number;
  totalInterestEarned: number;
  totalDownPayments: number;
  averageProfitPerPlan: number;
  plans: ProductProfitItem[];
}

export const getProductProfitReport = (from?: string, to?: string) =>
  api.get<ProductProfitReport>('/reports/product-profit', dateParams(from, to)).then(r => r.data);


// ═══════════════════════════════════════
// Standard POS Report Types
// ═══════════════════════════════════════

export interface SalesReportItemDto {
  sku: string; productName: string; brand: string; category: string;
  soldQty: number; soldAmount: number; inStockQty: number;
}
export interface SalesReportDto {
  totalAmount: number; totalPaid: number; totalUnpaid: number; overdue: number;
  items: SalesReportItemDto[];
}

export interface PurchaseReportItemDto {
  reference: string; sku: string; dueDate: string; productName: string;
  category: string; inStockQty: number; purchaseQty: number; purchaseAmount: number;
}
export interface PurchaseReportDto { items: PurchaseReportItemDto[]; }

export interface InventoryReportItemDto {
  sku: string; productName: string; category: string; unit: string; inStock: number;
}

export interface InvoiceReportItemDto {
  id: number; invoiceNo: string; customerName: string; dueDate: string;
  amount: number; paid: number; amountDue: number; status: string;
}
export interface InvoiceReportDto {
  totalAmount: number; totalPaid: number; totalUnpaid: number; overdue: number;
  items: InvoiceReportItemDto[];
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
export interface ProductExpiryReportItemDto {
  sku: string; serialNo: string; productName: string;
  manufacturedDate: string; expiredDate: string;
}
export interface ProductQtyAlertItemDto {
  sku: string; serialNo: string; productName: string;
  totalQuantity: number; alertQuantity: number;
}

export interface ExpenseReportItemDto {
  expenseName: string; category: string; description: string;
  date: string; amount: number; status: string;
}
export interface IncomeReportItemDto {
  reference: string; date: string; store: string; category: string;
  notes: string; amount: number; paymentMethod: string;
}

export interface ProfitAndLossMonthDto {
  month: string; sales: number; service: number; purchaseReturn: number;
  grossProfit: number; purchaseExpense: number; salesReturn: number;
  totalExpense: number; netProfit: number;
}
export interface ProfitAndLossDto { months: ProfitAndLossMonthDto[]; }

export interface AnnualReportMonthDto {
  month: string; sales: number; purchases: number; returns: number; profit: number;
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

export const getInvoiceReport = (from?: string, to?: string) =>
  api.get<InvoiceReportDto>('/reports/invoice-report', dateParams(from, to)).then(r => r.data);

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

export const getProductExpiryReport = () =>
  api.get<ProductExpiryReportItemDto[]>('/reports/product-expiry-report').then(r => r.data);

export const getProductQtyAlertReport = () =>
  api.get<ProductQtyAlertItemDto[]>('/reports/product-qty-alert').then(r => r.data);

export const getExpenseReport = (from?: string, to?: string) =>
  api.get<ExpenseReportItemDto[]>('/reports/expense-report', dateParams(from, to)).then(r => r.data);

export const getIncomeReport = (from?: string, to?: string) =>
  api.get<IncomeReportItemDto[]>('/reports/income-report', dateParams(from, to)).then(r => r.data);

export const getProfitAndLoss = (from?: string, to?: string) =>
  api.get<ProfitAndLossDto>('/reports/profit-and-loss', dateParams(from, to)).then(r => r.data);

export const getAnnualReport = (year?: number) =>
  api.get<AnnualReportDto>('/reports/annual-report', { params: year ? { year } : {} }).then(r => r.data);