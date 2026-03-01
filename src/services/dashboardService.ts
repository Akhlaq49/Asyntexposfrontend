import api from './api';

export interface DashboardData {
  // KPI Cards
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalCustomers: number;
  customersThisMonth: number;
  totalFinancedAmount: number;
  totalDownPayments: number;
  totalExpectedRevenue: number;
  totalInterestExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  dueCount: number;

  // Trends
  plansThisMonth: number;
  plansLastMonth: number;
  plansPctChange: number;
  collectionsThisMonth: number;
  collectionsLastMonth: number;
  collectionsPctChange: number;

  // Status distribution
  statusDistribution: {
    active: number;
    completed: number;
    defaulted: number;
    cancelled: number;
  };

  // Monthly trend
  monthlyCollections: {
    month: string;
    collected: number;
    expected: number;
  }[];

  // Lists
  upcomingDues: {
    planId: number;
    installmentNo: number;
    dueDate: string;
    emiAmount: number;
    customerName: string;
    customerPhone: string;
    productName: string;
    status: string;
  }[];

  overdueList: {
    planId: number;
    installmentNo: number;
    dueDate: string;
    emiAmount: number;
    remaining: number;
    customerName: string;
    customerPhone: string;
    productName: string;
  }[];

  recentPayments: {
    planId: number;
    installmentNo: number;
    paidDate: string;
    amount: number;
    customerName: string;
    productName: string;
  }[];

  recentPlans: {
    id: number;
    customerName: string;
    customerPhone: string;
    productName: string;
    financedAmount: number;
    emiAmount: number;
    tenure: number;
    status: string;
    createdAt: string;
  }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const response = await api.get<DashboardData>('/dashboard');
  return response.data;
}
