import { describe, expect, it } from 'vitest';
import type { TrialBalance } from '../services/ACCT/accountingService';
import { buildTrialBalanceView, formatTbValue, tbExportTable } from './trialBalanceLayouts';

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

  it('export keeps numbers and adds group headings, subtotals and totals', () => {
    const t = tbExportTable(buildTrialBalanceView(data, 'movement', true));
    expect(t.columns).toEqual(['Code', 'Account', 'Opening (Dr + / Cr -)', 'This period (Dr + / Cr -)', 'Closing (Dr + / Cr -)']);
    expect(t.rows[0]).toEqual(['', 'ASSETS', '', '', '']);
    expect(t.rows[1]).toEqual(['111001', 'Cash', 5000, -200, 4800]);
    expect(t.rows[2]).toEqual(['', 'Assets total', 5000, -200, 4800]);
    expect(t.rows.slice(-2).map((r) => r[1])).toEqual(['Total debits', 'Total credits']);
  });
});
