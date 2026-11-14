import api from '../api';

/** Double-entry accounting (backend: Controllers/AccountingController.cs). Every report reads only the ledger. */
export interface LedgerAccount {
  id: number; code: string; name: string; rootType: RootType; parentId: number | null; isGroup: boolean;
  systemKey: string | null; isActive: boolean; balance: number; hasEntries: boolean;
}
export type RootType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
interface JournalLineRow { accountId: number; account: string; code: string; debit: number; credit: number; partyType: string | null; partyName: string | null; note: string | null }
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
/** Year-based reports: amounts are signed, + debit / - credit (backend: LedgerReports, "year-based reports") */
export interface AccountBalanceRow {
  id: number; code: string; name: string; rootType: RootType; carryforward: number; previousPeriods: number; accumulatedPrevious: number;
  debit: number; credit: number; cumulativeDebit: number; cumulativeCredit: number; accumulated: number;
}
export interface AccountBalances { from: string; to: string; fiscalYearStart: string; rows: AccountBalanceRow[] }
export interface ComparisonRow { id: number; code: string; name: string; rootType: RootType; current: number; comparison: number; difference: number; percent: number | null }
export interface Comparison { from: string; to: string; cmpFrom: string; cmpTo: string; rows: ComparisonRow[] }
export interface GlPeriod { period: number; from: string; to: string; debit: number; credit: number; balance: number; cumulative: number }
export interface GlBalances {
  fiscalYear: number; fiscalYearStart: string; fiscalYearEnd: string; accounts: { id: number; code: string; name: string; rootType: RootType }[];
  carryforward: number; periods: GlPeriod[]; totals: { debit: number; credit: number; balance: number; closing: number };
}
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface LedgerCheck {
  lockDate: string | null; fiscalYearStartMonth: number; rebuiltAt: string | null; lastError: string | null; needsRebuild: boolean | null; rulesVersion: number | null;
  entries: number; unbalanced: { id: number; voucherType: string; voucherId: number; reference: string | null }[]; stockMismatches: StockMismatch[];
}

/** Journal voucher: an entry typed in by hand (backend: Controllers/ACCT/JournalVouchersController.cs) */
export type PartyType = 'Customer' | 'Supplier' | 'Lender';
export interface VoucherAccount { id: number; code: string; name: string; rootType: RootType; partyType: PartyType | null }
export interface VoucherLine { id?: number; lineNo?: number; accountId: number; code?: string; account?: string; debit: number; credit: number; partyType?: PartyType | null; partyId: number | null; partyName: string | null; note: string | null }
export interface Voucher {
  id: number; date: string; reference: string; description: string; createdBy: string | null; createdAt: string; updatedAt: string;
  reversalOfId: number | null; reversalOfReference: string | null; reversedById: number | null; reversedByReference: string | null;
  total: number; lines: VoucherLine[];
}
export interface VoucherPage { total: number; page: number; pageSize: number; vouchers: Voucher[] }
export interface SaveVoucher { date: string; description: string; lines: Omit<VoucherLine, 'id' | 'lineNo' | 'code' | 'account' | 'partyType'>[] }

export const voucherService = {
  list: (p: { from?: string; to?: string; search?: string; page?: number; pageSize?: number }) =>
    api.get<VoucherPage>('/accounting/vouchers', { params: p }).then((r) => r.data),
  get: (id: number) => api.get<Voucher>(`/accounting/vouchers/${id}`).then((r) => r.data),
  accounts: () => api.get<VoucherAccount[]>('/accounting/vouchers/accounts').then((r) => r.data),
  create: (b: SaveVoucher) => api.post<Voucher>('/accounting/vouchers', b).then((r) => r.data),
  update: (id: number, b: SaveVoucher) => api.put<Voucher>(`/accounting/vouchers/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/accounting/vouchers/${id}`),
  reverse: (id: number, b: { date: string; description?: string }) => api.post<Voucher>(`/accounting/vouchers/${id}/reverse`, b).then((r) => r.data),
};

/** Debit and credit totals of the lines being typed in (rounded to paisa) and whether they balance */
export const voucherTotals = (lines: { debit: number | string; credit: number | string }[]) => {
  const sum = (k: 'debit' | 'credit') => Math.round(lines.reduce((s, l) => s + (Number(l[k]) || 0), 0) * 100) / 100;
  const debit = sum('debit'), credit = sum('credit');
  return { debit, credit, difference: Math.round((debit - credit) * 100) / 100, balanced: debit > 0 && debit === credit };
};

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
  saveSettings: (lockDate: string | null, fiscalYearStartMonth?: number) =>
    api.put<LedgerCheck>('/accounting/settings', { lockDate, fiscalYearStartMonth }).then((r) => r.data),
  accountBalances: (p: { from: string; to: string }) => api.get<AccountBalances>('/accounting/account-balances', { params: p }).then((r) => r.data),
  comparison: (p: { from: string; to: string; cmpFrom: string; cmpTo: string }) => api.get<Comparison>('/accounting/comparison', { params: p }).then((r) => r.data),
  glBalances: (accountIds: number[], year: number) =>
    api.get<GlBalances>('/accounting/gl-balances', { params: { accounts: accountIds.join(','), year } }).then((r) => r.data),
  rebuild: () => api.post<LedgerCheck>('/accounting/rebuild').then((r) => r.data),
};

export const ROOT_LABEL: Record<RootType, string> = { Asset: 'Assets', Liability: 'Liabilities', Equity: 'Equity', Income: 'Income', Expense: 'Expenses' };
export const VOUCHER_LABEL: Record<string, string> = {
  Sale: 'Sale', SalePayment: 'Customer payment', SalesReturn: 'Sales return', Purchase: 'Purchase', PurchasePayment: 'Supplier payment',
  PurchaseReturn: 'Purchase return', PurchaseReturnRefund: 'Supplier refund', Expense: 'Expense', FinanceEntry: 'Capital & loans',
  JournalVoucher: 'Journal voucher',
};
export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const monthStart = () => { const d = new Date(); return localDate(new Date(d.getFullYear(), d.getMonth(), 1)); };
export const yearStart = () => localDate(new Date(new Date().getFullYear(), 0, 1));
export const money = (n: number) => `${n < 0 ? '-' : ''}Rs ${Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const amount = (n: number) => (n ? Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
export const showDate = (d: string) => new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const errorText = (err: any, fallback: string) => err?.response?.data?.message || err?.response?.data?.error || fallback;
