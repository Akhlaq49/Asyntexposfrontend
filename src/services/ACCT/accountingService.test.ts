import { describe, expect, it } from 'vitest';
import { amount, errorText, localDate, money, monthStart, showDate, VOUCHER_LABEL, yearStart, ROOT_LABEL } from './accountingService';

describe('accounting formatting', () => {
  it.each([
    [1234.5, 'Rs 1,234.50'],
    [-1234.5, '-Rs 1,234.50'],
    [0, 'Rs 0.00'],
    [NaN, 'Rs 0.00'],
  ])('money(%s) = %s', (n, text) => expect(money(n)).toBe(text));

  it.each([
    [0, ''],
    [12.5, '12.50'],
    [-12.5, '12.50'],            // debit / credit columns show the size, the column gives the side
  ])('amount(%s) = "%s"', (n, text) => expect(amount(n)).toBe(text));

  it('dates are local yyyy-mm-dd', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(monthStart()).toMatch(/^\d{4}-\d{2}-01$/);
    expect(yearStart()).toMatch(/^\d{4}-01-01$/);
  });

  it('shows a date as 05 Jan 2026 (date-only and full timestamps)', () => {
    expect(showDate('2026-01-05')).toBe('05 Jan 2026');
    expect(showDate('2026-01-05T10:00:00')).toBe('05 Jan 2026');
  });

  it.each([
    [{ response: { data: { message: 'Locked' } } }, 'Locked'],
    [{ response: { data: { error: 'Bad' } } }, 'Bad'],
    [new Error('x'), 'fallback'],
    [undefined, 'fallback'],
  ])('error text %#', (err, text) => expect(errorText(err, 'fallback')).toBe(text));
});

describe('labels', () => {
  it('every document type of the ledger has a label', () => {
    const backend = ['Sale', 'SalePayment', 'SalesReturn', 'Purchase', 'PurchasePayment', 'PurchaseReturn', 'PurchaseReturnRefund', 'Expense', 'FinanceEntry'];
    expect(backend.filter((v) => !VOUCHER_LABEL[v])).toEqual([]);
  });

  it('every root type has a label', () => {
    expect(Object.keys(ROOT_LABEL).sort()).toEqual(['Asset', 'Equity', 'Expense', 'Income', 'Liability']);
  });
});
