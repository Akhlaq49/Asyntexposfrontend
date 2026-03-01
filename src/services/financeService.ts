import api from './api';

// ── Types ──

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  status: string;
  createdOn: string;
}

export interface Expense {
  id: number;
  reference: string;
  expenseName: string;
  expenseCategoryId: number;
  categoryName: string;
  description: string;
  date: string;
  amount: number;
  status: string;
  createdOn: string;
}

export interface IncomeCategory {
  id: number;
  code: string;
  name: string;
  createdOn: string;
}

export interface FinanceIncome {
  id: number;
  date: string;
  reference: string;
  store: string;
  incomeCategoryId: number;
  categoryName: string;
  notes: string;
  amount: number;
  account: string;
  createdOn: string;
}

export interface AccountType {
  id: number;
  name: string;
  status: string;
  createdOn: string;
}

export interface BankAccount {
  id: number;
  holderName: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  ifsc: string;
  accountTypeId: number;
  accountTypeName: string;
  openingBalance: number;
  notes: string;
  status: string;
  isDefault: boolean;
  createdOn: string;
}

// ── Report Types ──

export interface BalanceSheetLineItem {
  accountName: string;
  amount: number;
}

export interface BalanceSheetData {
  assets: BalanceSheetLineItem[];
  totalAssets: number;
  liabilities: BalanceSheetLineItem[];
  totalLiabilities: number;
  equity: number;
}

export interface TrialBalanceLineItem {
  accountName: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceData {
  items: TrialBalanceLineItem[];
  totalDebit: number;
  totalCredit: number;
}

export interface CashFlowLineItem {
  description: string;
  amount: number;
}

export interface CashFlowData {
  operatingActivities: CashFlowLineItem[];
  totalOperating: number;
  investingActivities: CashFlowLineItem[];
  totalInvesting: number;
  financingActivities: CashFlowLineItem[];
  totalFinancing: number;
  netCashFlow: number;
}

export interface AccountStatementEntry {
  referenceNumber: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  transactionType: string;
  balance: number;
}

export interface AccountStatementData {
  entries: AccountStatementEntry[];
  closingBalance: number;
}

// ── Expense Category API ──

export const getExpenseCategories = () => api.get<ExpenseCategory[]>('/expense-categories');
export const createExpenseCategory = (data: { name: string; description: string; status: string }) =>
  api.post<ExpenseCategory>('/expense-categories', data);
export const updateExpenseCategory = (id: number, data: { name: string; description: string; status: string }) =>
  api.put<ExpenseCategory>(`/expense-categories/${id}`, data);
export const deleteExpenseCategory = (id: number) => api.delete(`/expense-categories/${id}`);

// ── Expense API ──

export const getExpenses = () => api.get<Expense[]>('/expenses');
export const createExpense = (data: { expenseName: string; expenseCategoryId: number; description: string; date: string; amount: number; status: string }) =>
  api.post<Expense>('/expenses', data);
export const updateExpense = (id: number, data: { expenseName: string; expenseCategoryId: number; description: string; date: string; amount: number; status: string }) =>
  api.put<Expense>(`/expenses/${id}`, data);
export const deleteExpense = (id: number) => api.delete(`/expenses/${id}`);

// ── Income Category API ──

export const getIncomeCategories = () => api.get<IncomeCategory[]>('/income-categories');
export const createIncomeCategory = (data: { code: string; name: string }) =>
  api.post<IncomeCategory>('/income-categories', data);
export const updateIncomeCategory = (id: number, data: { code: string; name: string }) =>
  api.put<IncomeCategory>(`/income-categories/${id}`, data);
export const deleteIncomeCategory = (id: number) => api.delete(`/income-categories/${id}`);

// ── Finance Income API ──

export const getFinanceIncomes = () => api.get<FinanceIncome[]>('/finance-incomes');
export const createFinanceIncome = (data: { date: string; store: string; incomeCategoryId: number; notes: string; amount: number; account: string }) =>
  api.post<FinanceIncome>('/finance-incomes', data);
export const updateFinanceIncome = (id: number, data: { date: string; store: string; incomeCategoryId: number; notes: string; amount: number; account: string }) =>
  api.put<FinanceIncome>(`/finance-incomes/${id}`, data);
export const deleteFinanceIncome = (id: number) => api.delete(`/finance-incomes/${id}`);

// ── Account Type API ──

export const getAccountTypes = () => api.get<AccountType[]>('/account-types');
export const createAccountType = (data: { name: string; status: string }) =>
  api.post<AccountType>('/account-types', data);
export const updateAccountType = (id: number, data: { name: string; status: string }) =>
  api.put<AccountType>(`/account-types/${id}`, data);
export const deleteAccountType = (id: number) => api.delete(`/account-types/${id}`);

// ── Bank Account API ──

export const getBankAccounts = () => api.get<BankAccount[]>('/bank-accounts');
export const createBankAccount = (data: {
  holderName: string; accountNumber: string; bankName: string; branch: string;
  ifsc: string; accountTypeId: number; openingBalance: number; notes: string;
  status: string; isDefault: boolean;
}) => api.post<BankAccount>('/bank-accounts', data);
export const updateBankAccount = (id: number, data: {
  holderName: string; accountNumber: string; bankName: string; branch: string;
  ifsc: string; accountTypeId: number; openingBalance: number; notes: string;
  status: string; isDefault: boolean;
}) => api.put<BankAccount>(`/bank-accounts/${id}`, data);
export const deleteBankAccount = (id: number) => api.delete(`/bank-accounts/${id}`);

// ── Finance Report API ──

export const getBalanceSheet = (params?: { date?: string; store?: string }) =>
  api.get<BalanceSheetData>('/finance-reports/balance-sheet', { params });
export const getTrialBalance = (params?: { from?: string; to?: string; store?: string }) =>
  api.get<TrialBalanceData>('/finance-reports/trial-balance', { params });
export const getCashFlow = (params?: { from?: string; to?: string; store?: string }) =>
  api.get<CashFlowData>('/finance-reports/cash-flow', { params });
export const getAccountStatement = (params?: { accountId?: number; from?: string; to?: string }) =>
  api.get<AccountStatementData>('/finance-reports/account-statement', { params });
