import { describe, expect, it } from 'vitest';
import type { AccountBalances, Comparison, TrialBalance } from '../services/ACCT/accountingService';
import { buildAccumulatedView, buildComparisonView, buildTrialBalanceView, comparisonDates, formatTbValue, tbExportTable } from './trialBalanceLayouts';

const row = (id: number, code: string, name: string, rootType: TrialBalance['rows'][number]['rootType'], opening: number, debit: number, credit: number) => {
  const closing = opening + debit - credit;
  return { id, code, name, rootType, opening, debit, credit, closing, closingDebit: closing > 0 ? closing : 0, closingCredit: closing < 0 ? -closing : 0 };
};

// opening: cash 5,000 Dr = capital 5,000 Cr; this period: rent 200 paid in cash
const data: TrialBalance = {
  rows: [
    row(3, '611000', 'Rent', 'Expense', 0, 200, 0),
    row(1, '111001', 'Cash', 'Asset', 5000, 0, 200),
    row(2, '411000', 'Owner capital', 'Equity', -5000, 0, 0),
  ],
  totals: { debit: 200, credit: 200, closingDebit: 5000, closingCredit: 5000 },
  balanced: true,
};

describe('trial balance layouts', () => {
  it('standard: closing balance in a debit or a credit column, totals equal', () => {
    const v = buildTrialBalanceView(data, 'standard', false);
    expect(v.columns.map((c) => c.label)).toEqual(['Debit', 'Credit']);
    expect(v.sections[0].lines.map((l) => [l.code, ...l.values])).toEqual([['111001', 4800, 0], ['411000', 0, 5000], ['611000', 200, 0]]);
    expect(v.totals).toEqual([{ label: 'Total', values: [5000, 5000] }]);
  });

  it('movement: opening, net movement and closing, with total debits = total credits per column', () => {
    const v = buildTrialBalanceView(data, 'movement', false);
    const cash = v.sections[0].lines.find((l) => l.code === '111001')!;
    expect(cash.values).toEqual([5000, -200, 4800]);
    expect(v.totals[0]).toEqual({ label: 'Total debits', values: [5000, 200, 5000] });
    expect(v.totals[1]).toEqual({ label: 'Total credits', values: [5000, 200, 5000] });
  });

  it('extended: six columns, opening split into debit and credit', () => {
    const v = buildTrialBalanceView(data, 'extended', false);
    expect(v.columns.map((c) => `${c.band} ${c.label}`)).toEqual(['Opening Debit', 'Opening Credit', 'This period Debit', 'This period Credit', 'Closing Debit', 'Closing Credit']);
    expect(v.totals[0].values).toEqual([5000, 5000, 200, 200, 5000, 5000]);
  });

  it('grouped: sections in the order of the accounts, each with a subtotal; empty groups left out', () => {
    const v = buildTrialBalanceView(data, 'movement', true);
    expect(v.sections.map((s) => s.title)).toEqual(['Assets', 'Equity', 'Expenses']);
    expect(v.sections[0].subtotal).toEqual([5000, -200, 4800]);
    expect(v.sections[2].subtotal).toEqual([0, 200, 200]);
  });

  it('formats signed amounts with Dr / Cr and leaves zero blank', () => {
    expect(formatTbValue(1200, 'signed')).toBe('1,200.00 Dr');
    expect(formatTbValue(-100, 'signed')).toBe('100.00 Cr');
    expect(formatTbValue(0, 'signed')).toBe('');
    expect(formatTbValue(-100, 'amount')).toBe('100.00');
  });

  it('comparison: reporting, comparison, difference and change %, with total debits = total credits', () => {
    const cmp: Comparison = { from: '2026-03-01', to: '2026-03-31', cmpFrom: '2025-03-01', cmpTo: '2025-03-31', rows: [
      { id: 1, code: '111001', name: 'Cash', rootType: 'Asset', current: 4825, comparison: 4900, difference: -75, percent: -1.5 },
      { id: 3, code: '611000', name: 'Rent', rootType: 'Expense', current: 75, comparison: 0, difference: 75, percent: null },
      { id: 0, code: '', name: 'Profit of earlier periods', rootType: 'Equity', current: 100, comparison: 100, difference: 0, percent: 0 },
      { id: 2, code: '411000', name: 'Owner capital', rootType: 'Equity', current: -5000, comparison: -5000, difference: 0, percent: 0 },
    ] };
    const v = buildComparisonView(cmp, true);
    expect(v.columns.map((c) => c.label)).toEqual(['Reporting period', 'Comparison period', 'Difference', 'Change %']);
    expect(v.sections.map((s) => s.title)).toEqual(['Assets', 'Equity', 'Expenses']);
    expect(v.sections[1].lines.map((l) => l.name)).toEqual(['Owner capital', 'Profit of earlier periods']);   // non-account line last
    expect(v.sections[2].lines[0].values[3]).toBeNaN();                                                       // no % when nothing to compare with
    expect(v.totals[0].values.slice(0, 2)).toEqual([5000, 5000]);
    expect(v.totals[1].values.slice(0, 2)).toEqual([5000, 5000]);
    expect(v.totals[0].values[3]).toBeNaN();
    expect(formatTbValue(-1.5, 'percent')).toBe('-1.5%');
    expect(formatTbValue(12.5, 'percent')).toBe('+12.5%');
  });

  it('accumulated: debit columns add to the debit total only, credit columns to the credit total', () => {
    const acc: AccountBalances = { from: '2026-03-01', to: '2026-03-31', fiscalYearStart: '2026-01-01', rows: [
      { id: 1, code: '111001', name: 'Cash', rootType: 'Asset', carryforward: 4900, previousPeriods: 0, accumulatedPrevious: 4900, debit: 0, credit: 75, cumulativeDebit: 0, cumulativeCredit: 75, accumulated: 4825 },
      { id: 3, code: '611000', name: 'Rent', rootType: 'Expense', carryforward: 0, previousPeriods: 0, accumulatedPrevious: 0, debit: 75, credit: 0, cumulativeDebit: 75, cumulativeCredit: 0, accumulated: 75 },
      { id: 2, code: '411000', name: 'Owner capital', rootType: 'Equity', carryforward: -5000, previousPeriods: 0, accumulatedPrevious: -5000, debit: 0, credit: 0, cumulativeDebit: 0, cumulativeCredit: 0, accumulated: -5000 },
      { id: 0, code: '', name: 'Profit of earlier years (carried forward)', rootType: 'Equity', carryforward: 100, previousPeriods: 0, accumulatedPrevious: 100, debit: 0, credit: 0, cumulativeDebit: 0, cumulativeCredit: 0, accumulated: 100 },
    ] };
    const v = buildAccumulatedView(acc, false);
    expect(v.columns).toHaveLength(8);
    const [debits, credits] = v.totals;
    expect(debits.values[0]).toBe(5000);                 // carried forward: 4,900 + 100
    expect(credits.values[0]).toBe(5000);
    expect(debits.values[3]).toBe(75);                   // this period debit
    expect(credits.values[3]).toBeNaN();
    expect(credits.values[4]).toBe(75);                  // this period credit
    expect(debits.values[7]).toBe(credits.values[7]);    // accumulated balance
  });

  it('comparison dates: same period last year, previous whole months, previous days', () => {
    expect(comparisonDates('2026-03-01', '2026-03-31', 'lastYear')).toEqual({ cmpFrom: '2025-03-01', cmpTo: '2025-03-31' });
    expect(comparisonDates('2024-02-01', '2024-02-29', 'lastYear')).toEqual({ cmpFrom: '2023-02-01', cmpTo: '2023-02-28' });
    expect(comparisonDates('2026-03-01', '2026-03-31', 'previous')).toEqual({ cmpFrom: '2026-02-01', cmpTo: '2026-02-28' });
    expect(comparisonDates('2026-01-01', '2026-03-31', 'previous')).toEqual({ cmpFrom: '2025-10-01', cmpTo: '2025-12-31' });
    expect(comparisonDates('2026-03-10', '2026-03-16', 'previous')).toEqual({ cmpFrom: '2026-03-03', cmpTo: '2026-03-09' });
  });

  it('export keeps numbers and adds group headings, subtotals and totals', () => {
    const t = tbExportTable(buildTrialBalanceView(data, 'movement', true));
    expect(t.columns).toEqual(['Code', 'Account', 'Opening (Dr + / Cr -)', 'This period (Dr + / Cr -)', 'Closing (Dr + / Cr -)']);
    expect(t.rows[0]).toEqual(['', 'ASSETS', '', '', '']);
    expect(t.rows[1]).toEqual(['111001', 'Cash', 5000, -200, 4800]);
    expect(t.rows[2]).toEqual(['', 'Assets total', 5000, -200, 4800]);
    expect(t.rows.slice(-2).map((r) => r[1])).toEqual(['Total debits', 'Total credits']);
  });
});
