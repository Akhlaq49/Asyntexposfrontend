import api from './api';

/** Double-entry accounting (backend: Controllers/AccountingController.cs). Every report reads only the ledger. */
export interface LedgerAccount {
  id: number; code: string; name: string; rootType: RootType; parentId: number | null; isGroup: boolean;
  systemKey: string | null; isActive: boolean; balance: number; hasEntries: boolean;
}
export type RootType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
export interface JournalLineRow { accountId: number; account: string; code: string; debit: number; credit: number; partyType: string | null; partyName: string | null; note: string | null }
export interface JournalEntryRow { id: number; date: string; voucherType: string; voucherId: number; reference: string | null; description: string | null; lines: JournalLineRow[] }
export interface JournalPage { total: number; page: number; pageSize: number; entries: JournalEntryRow[] }
export interface LedgerRow { entryId: number; date: string; voucherType: string; voucherId: number; reference: string | null; description: string | null; partyName: string | null; note: string | null; debit: number; credit: number; balance: number }
export interface AccountLedger { account: { id: number; code: string; name: string; rootType: RootType }; opening: number; closing: number; totalDebit: number; totalCredit: number; rows: LedgerRow[] }
export interface TrialBalanceRow { id: number; code: string; name: string; rootType: RootType; opening: number; debit: number; credit: number; closing: number; closingDebit: number; closingCredit: number }
export interface TrialBalance { rows: TrialBalanceRow[]; totals: { debit: number; credit: number; closingDebit: number; closingCredit: number }; balanced: boolean }
export interface PlRow { accountId: number; code: string; name: string; systemKey: string | null; amount: number }
export interface ProfitLoss { basis: 'accrual' | 'cash'; income: PlRow[]; expenses: PlRow[]; totalIncome: number; totalExpenses: number; grossProfit: number; netProfit: number }
export interface BsParty { name: string; partyId: number | null; balance: number }
export interface BsRow { accountId: number; code: string; name: string; amount: number; parties: BsParty[] | null }
export interface BalanceSheet { asOf: string; assets: BsRow[]; liabilities: BsRow[]; equity: BsRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number; totalLiabilitiesAndEquity: number; balanced: boolean }
export interface StockMismatch { productId: number; productName: string; sku: string | null; quantity: number; fromMovements: number; difference: number }
export interface LedgerCheck {
  lockDate: string | null; rebuiltAt: string | null; lastError: string | null; needsRebuild: boolean | null; rulesVersion: number | null;
  entries: number; unbalanced: { id: number; voucherType: string; voucherId: number; reference: string | null }[]; stockMismatches: StockMismatch[];
}

export const accountingService = {
  accounts: () => api.get<LedgerAccount[]>('/accounting/accounts').then((r) => r.data),
  addAccount: (b: { code: string; name: string; parentId: number }) => api.post<LedgerAccount[]>('/accounting/accounts', b).then((r) => r.data),
  updateAccount: (id: number, b: { code: string; name: string; isActive?: boolean }) => api.put<LedgerAccount[]>(`/accounting/accounts/${id}`, b).then((r) => r.data),
  deleteAccount: (id: number) => api.delete<LedgerAccount[]>(`/accounting/accounts/${id}`).then((r) => r.data),
  journal: (p: { from?: string; to?: string; voucherType?: string; search?: string; page?: number; pageSize?: number }) =>
    api.get<JournalPage>('/accounting/journal', { params: p }).then((r) => r.data),
  ledger: (accountId: number, p: { from?: string; to?: string; party?: string }) => api.get<AccountLedger>(`/accounting/ledger/${accountId}`, { params: p }).then((r) => r.data),
  trialBalance: (p: { from?: string; to?: string }) => api.get<TrialBalance>('/accounting/trial-balance', { params: p }).then((r) => r.data),
  profitAndLoss: (p: { from: string; to: string; basis: string }) => api.get<ProfitLoss>('/accounting/profit-and-loss', { params: p }).then((r) => r.data),
  balanceSheet: (asOf: string) => api.get<BalanceSheet>('/accounting/balance-sheet', { params: { asOf } }).then((r) => r.data),
  settings: () => api.get<LedgerCheck>('/accounting/settings').then((r) => r.data),
  saveSettings: (lockDate: string | null) => api.put<LedgerCheck>('/accounting/settings', { lockDate }).then((r) => r.data),
  rebuild: () => api.post<LedgerCheck>('/accounting/rebuild').then((r) => r.data),
};

export const ROOT_LABEL: Record<RootType, string> = { Asset: 'Assets', Liability: 'Liabilities', Equity: 'Equity', Income: 'Income', Expense: 'Expenses' };
export const VOUCHER_LABEL: Record<string, string> = {
  Sale: 'Sale', SalePayment: 'Customer payment', SalesReturn: 'Sales return', Purchase: 'Purchase', PurchasePayment: 'Supplier payment',
  PurchaseReturn: 'Purchase return', PurchaseReturnRefund: 'Supplier refund', Expense: 'Expense', FinanceEntry: 'Capital & loans',
};
export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const monthStart = () => { const d = new Date(); return localDate(new Date(d.getFullYear(), d.getMonth(), 1)); };
export const yearStart = () => localDate(new Date(new Date().getFullYear(), 0, 1));
export const money = (n: number) => `${n < 0 ? '-' : ''}Rs ${Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const amount = (n: number) => (n ? Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
export const showDate = (d: string) => new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const errorText = (err: any, fallback: string) => err?.response?.data?.message || err?.response?.data?.error || fallback;
