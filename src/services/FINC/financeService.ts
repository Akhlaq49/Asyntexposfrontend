import api from '../api';

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







