import type { RootType, TrialBalance } from '../services/ACCT/accountingService';

/**
 * Trial balance layouts (Accounting > Trial Balance). The same figures, shown the ways accounting software commonly
 * shows them; the screen, Excel, PDF and print all use the view built here.
 *   standard  Account | Debit | Credit            closing balances (textbook / IFRS trial balance)
 *   movement  Opening | This period | Closing     one column each, marked Dr / Cr (net movement format)
 *   extended  Opening, period, closing in Dr / Cr  six-column worksheet (ERP systems)
 */
export type TbLayout = 'standard' | 'movement' | 'extended';

export const TB_LAYOUTS: { id: TbLayout; label: string; help: string }[] = [
  { id: 'standard', label: 'Standard', help: 'Closing balance of each account in a Debit or a Credit column. The classic two-column trial balance.' },
  { id: 'movement', label: 'Movement', help: 'Opening balance, net movement this period and closing balance, one column each, marked Dr or Cr.' },
  { id: 'extended', label: 'Extended', help: 'Opening, this period and closing, each split into Debit and Credit. The six-column worksheet.' },
];

/** amount: shown as a plain figure (blank when 0); signed: + = debit, - = credit, shown with Dr / Cr */
export interface TbColumn { band?: string; label: string; kind: 'amount' | 'signed' }
export interface TbLine { id: number; code: string; name: string; values: number[] }
export interface TbSection { title: string | null; lines: TbLine[]; subtotal: number[] | null }
export interface TbTotal { label: string; values: number[] }
export interface TbView { columns: TbColumn[]; sections: TbSection[]; totals: TbTotal[] }

const ROOTS: RootType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const GROUP_TITLE: Record<RootType, string> = { Asset: 'Assets', Liability: 'Liabilities', Equity: 'Equity', Income: 'Income', Expense: 'Expenses' };
const r2 = (n: number) => Math.round(n * 100) / 100;
const dr = (n: number) => (n > 0 ? n : 0);
const cr = (n: number) => (n < 0 ? -n : 0);

const COLUMNS: Record<TbLayout, TbColumn[]> = {
  standard: [{ label: 'Debit', kind: 'amount' }, { label: 'Credit', kind: 'amount' }],
  movement: [{ label: 'Opening', kind: 'signed' }, { label: 'This period', kind: 'signed' }, { label: 'Closing', kind: 'signed' }],
  extended: [
    { band: 'Opening', label: 'Debit', kind: 'amount' }, { band: 'Opening', label: 'Credit', kind: 'amount' },
    { band: 'This period', label: 'Debit', kind: 'amount' }, { band: 'This period', label: 'Credit', kind: 'amount' },
    { band: 'Closing', label: 'Debit', kind: 'amount' }, { band: 'Closing', label: 'Credit', kind: 'amount' },
  ],
};

type Row = TrialBalance['rows'][number];

function values(layout: TbLayout, r: Row): number[] {
  const closing = r.closingDebit - r.closingCredit;
  switch (layout) {
    case 'standard': return [r.closingDebit, r.closingCredit];
    case 'movement': return [r.opening, r.debit - r.credit, closing];
    default: return [dr(r.opening), cr(r.opening), r.debit, r.credit, r.closingDebit, r.closingCredit];
  }
}

const sum = (rows: number[][], width: number) => Array.from({ length: width }, (_, i) => r2(rows.reduce((s, v) => s + v[i], 0)));

export function buildTrialBalanceView(data: TrialBalance, layout: TbLayout, grouped: boolean): TbView {
  const columns = COLUMNS[layout];
  const line = (r: Row): TbLine => ({ id: r.id, code: r.code, name: r.name, values: values(layout, r).map(r2) });
  const byCode = [...data.rows].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const sections: TbSection[] = grouped
    ? ROOTS.map((root) => {
      const lines = byCode.filter((r) => r.rootType === root).map(line);
      return { title: GROUP_TITLE[root], lines, subtotal: sum(lines.map((l) => l.values), columns.length) };
    }).filter((s) => s.lines.length > 0)
    : [{ title: null, lines: byCode.map(line), subtotal: null }];

  const all = sections.flatMap((s) => s.lines.map((l) => l.values));
  // the debit side and the credit side of every column are equal when the books balance
  const totals: TbTotal[] = layout === 'movement'
    ? [
      { label: 'Total debits', values: columns.map((_, i) => r2(all.reduce((s, v) => s + dr(v[i]), 0))) },
      { label: 'Total credits', values: columns.map((_, i) => r2(all.reduce((s, v) => s + cr(v[i]), 0))) },
    ]
    : [{ label: 'Total', values: sum(all, columns.length) }];
  return { columns, sections, totals };
}

/** "1,200.00 Dr" / "100.00 Cr" / "" for a signed amount; "1,200.00" / "" for a plain one */
export function formatTbValue(v: number, kind: TbColumn['kind']): string {
  if (!v) return '';
  const text = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return kind === 'signed' ? `${text} ${v > 0 ? 'Dr' : 'Cr'}` : text;
}

/** Header labels and rows for Excel / PDF (numbers stay numbers; credits in signed columns are negative) */
export function tbExportTable(view: TbView): { columns: string[]; rows: (string | number)[][] } {
  const columns = ['Code', 'Account', ...view.columns.map((c) => [c.band, c.label].filter(Boolean).join(' ') + (c.kind === 'signed' ? ' (Dr + / Cr -)' : ''))];
  const blanks = view.columns.map(() => '');
  const rows: (string | number)[][] = [];
  for (const s of view.sections) {
    if (s.title) rows.push(['', s.title.toUpperCase(), ...blanks]);
    for (const l of s.lines) rows.push([l.code, l.name, ...l.values]);
    if (s.subtotal) rows.push(['', `${s.title} total`, ...s.subtotal]);
  }
  for (const t of view.totals) rows.push(['', t.label, ...t.values]);
  return { columns, rows };
}
