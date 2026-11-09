import api from '../api';



// ── POS Business Dashboard ──

export interface PosDashboardData {
  totalSalesAmount: number;
  totalPurchaseAmount: number;
  totalReturnAmount: number;
  totalExpenseAmount: number;

  salesPctChange: number;
  purchasePctChange: number;
  returnPctChange: number;
  expensePctChange: number;

  salesThisMonth: number;
  purchasesThisMonth: number;
  expensesThisMonth: number;
  returnsThisMonth: number;

  totalSalesCount: number;
  salesCountThisMonth: number;
  totalSalesDue: number;
  totalCustomers: number;
  customersThisMonth: number;
  totalProducts: number;
  lowStockProducts: number;
  totalProfit: number;

  monthlyTrend: { month: string; sales: number; purchases: number }[];
  bestSellers: { productName: string; totalQty: number; totalRevenue: number }[];
  recentSales: {
    id: number;
    reference: string;
    customerName: string;
    grandTotal: number;
    paid: number;
    due: number;
    status: string;
    paymentStatus: string;
    saleDate: string;
  }[];
  expenseByCategory: { category: string; total: number }[];
}

export async function getPosDashboardData(): Promise<PosDashboardData> {
  const response = await api.get<PosDashboardData>('/dashboard/pos');
  return response.data;
}
