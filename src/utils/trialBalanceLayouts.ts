import type { AccountBalances, Comparison, RootType, TrialBalance } from '../services/ACCT/accountingService';

/**
 * Trial balance layouts (Accounting > Trial Balance). The screen, Excel, PDF and print all use the view built here.
 *   standard     Account | Debit | Credit                           closing balances (two-column trial balance)
 *   movement     Opening | This period | Closing, marked Dr / Cr     net movement format
 *   extended     Opening, period, closing, each in Debit / Credit     six-column worksheet
 *   comparison   Reporting period | Comparison period | Difference | %   (two years or two months side by side)
 *   accumulated  Carried forward | Earlier periods | Accumulated before | Debit | Credit | Cum. debit | Cum. credit | Accumulated
 * The first three read the trial balance; comparison and accumulated have their own reports (financial-year based).
 */
export type TbLayout = 'standard' | 'movement' | 'extended' | 'comparison' | 'accumulated';

export const TB_LAYOUTS: { id: TbLayout; label: string; help: string }[] = [
  { id: 'standard', label: 'Standard', help: 'Closing balance of each account in a Debit or a Credit column. The classic two-column trial balance.' },
  { id: 'movement', label: 'Movement', help: 'Opening balance, net movement this period and closing balance, one column each, marked Dr or Cr.' },
  { id: 'extended', label: 'Extended', help: 'Opening, this period and closing, each split into Debit and Credit. The six-column worksheet.' },
  { id: 'comparison', label: 'Comparison', help: 'The reporting period next to a comparison period (last year, last month or any dates), with the difference. Balance sheet accounts at the end of each period, income and expenses for the period.' },
  { id: 'accumulated', label: 'Accumulated', help: 'From the start of the financial year: balance carried forward, earlier periods of the year, this period\'s debits and credits, year-to-date debits and credits, and the accumulated balance.' },
];

/** amount: plain figure (side = which totals row it adds to); signed: + debit / - credit, shown with Dr / Cr; percent: change in % */
export interface TbColumn { band?: string; label: string; kind: 'amount' | 'signed' | 'percent'; side?: 'debit' | 'credit' }
/** id 0 = a line that is not an account (profit of earlier years) */
export interface TbLine { id: number; code: string; name: string; values: number[] }
export interface TbSection { title: string | null; lines: TbLine[]; subtotal: number[] | null }
export interface TbTotal { label: string; values: number[] }
export interface TbView { columns: TbColumn[]; sections: TbSection[]; totals: TbTotal[] }

const ROOTS: RootType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const GROUP_TITLE: Record<RootType, string> = { Asset: 'Assets', Liability: 'Liabilities', Equity: 'Equity', Income: 'Income', Expense: 'Expenses' };
const r2 = (n: number) => Math.round(n * 100) / 100;
const dr = (n: number) => (n > 0 ? n : 0);
const cr = (n: number) => (n < 0 ? -n : 0);
const D = 'debit' as const, C = 'credit' as const;

const COLUMNS: Record<TbLayout, TbColumn[]> = {
  standard: [{ label: 'Debit', kind: 'amount', side: D }, { label: 'Credit', kind: 'amount', side: C }],
  movement: [{ label: 'Opening', kind: 'signed' }, { label: 'This period', kind: 'signed' }, { label: 'Closing', kind: 'signed' }],
  extended: [
    { band: 'Opening', label: 'Debit', kind: 'amount', side: D }, { band: 'Opening', label: 'Credit', kind: 'amount', side: C },
    { band: 'This period', label: 'Debit', kind: 'amount', side: D }, { band: 'This period', label: 'Credit', kind: 'amount', side: C },
    { band: 'Closing', label: 'Debit', kind: 'amount', side: D }, { band: 'Closing', label: 'Credit', kind: 'amount', side: C },
  ],
  comparison: [{ label: 'Reporting period', kind: 'signed' }, { label: 'Comparison period', kind: 'signed' }, { label: 'Difference', kind: 'signed' }, { label: 'Change %', kind: 'percent' }],
  accumulated: [
    { label: 'Balance carried forward', kind: 'signed' }, { label: 'Earlier periods', kind: 'signed' }, { label: 'Accumulated before', kind: 'signed' },
    { band: 'This period', label: 'Debit', kind: 'amount', side: D }, { band: 'This period', label: 'Credit', kind: 'amount', side: C },
    { band: 'Year to date', label: 'Cum. debit', kind: 'amount', side: D }, { band: 'Year to date', label: 'Cum. credit', kind: 'amount', side: C },
    { label: 'Accumulated balance', kind: 'signed' },
  ],
};

interface SourceRow { id: number; code: string; name: string; rootType: RootType; values: number[] }

/** Accounts by code; lines that are not accounts (no code) last */
const byCode = (a: SourceRow, b: SourceRow) => (!a.code ? 1 : !b.code ? -1 : a.code.localeCompare(b.code, undefined, { numeric: true }));

function sumColumns(lines: number[][], columns: TbColumn[]): number[] {
  return columns.map((c, i) => (c.kind === 'percent' ? NaN : r2(lines.reduce((s, v) => s + v[i], 0))));
}

function build(source: SourceRow[], columns: TbColumn[], grouped: boolean): TbView {
  const sorted = [...source].sort(byCode);
  const line = (r: SourceRow): TbLine => ({ id: r.id, code: r.code, name: r.name, values: r.values.map((v) => (Number.isFinite(v) ? r2(v) : NaN)) });
  const sections: TbSection[] = grouped
    ? ROOTS.map((root) => {
      const lines = sorted.filter((r) => r.rootType === root).map(line);
      return { title: GROUP_TITLE[root], lines, subtotal: sumColumns(lines.map((l) => l.values), columns) };
    }).filter((s) => s.lines.length > 0)
    : [{ title: null, lines: sorted.map(line), subtotal: null }];

  const all = sections.flatMap((s) => s.lines.map((l) => l.values));
  // with signed columns: a total debits row and a total credits row (equal when the books balance); else one total row
  const totals: TbTotal[] = columns.some((c) => c.kind === 'signed')
    ? ([D, C] as const).map((side) => ({
      label: side === D ? 'Total debits' : 'Total credits',
      values: columns.map((c, i) => {
        if (c.kind === 'percent') return NaN;
        if (c.kind === 'amount') return c.side === side ? r2(all.reduce((s, v) => s + v[i], 0)) : NaN;
        return r2(all.reduce((s, v) => s + (side === D ? dr(v[i]) : cr(v[i])), 0));
      }),
    }))
    : [{ label: 'Total', values: sumColumns(all, columns) }];
  return { columns, sections, totals };
}

/** standard, movement or extended, from the trial balance */
export function buildTrialBalanceView(data: TrialBalance, layout: 'standard' | 'movement' | 'extended', grouped: boolean): TbView {
  const values = (r: TrialBalance['rows'][number]): number[] => {
    const closing = r.closingDebit - r.closingCredit;
    switch (layout) {
      case 'standard': return [r.closingDebit, r.closingCredit];
      case 'movement': return [r.opening, r.debit - r.credit, closing];
      default: return [dr(r.opening), cr(r.opening), r.debit, r.credit, r.closingDebit, r.closingCredit];
    }
  };
  return build(data.rows.map((r) => ({ id: r.id, code: r.code, name: r.name, rootType: r.rootType, values: values(r) })), COLUMNS[layout], grouped);
}

export function buildComparisonView(data: Comparison, grouped: boolean): TbView {
  return build(data.rows.map((r) => ({ id: r.id, code: r.code, name: r.name, rootType: r.rootType,
    values: [r.current, r.comparison, r.difference, r.percent ?? NaN] })), COLUMNS.comparison, grouped);
}

export function buildAccumulatedView(data: AccountBalances, grouped: boolean): TbView {
  return build(data.rows.map((r) => ({ id: r.id, code: r.code, name: r.name, rootType: r.rootType,
    values: [r.carryforward, r.previousPeriods, r.accumulatedPrevious, r.debit, r.credit, r.cumulativeDebit, r.cumulativeCredit, r.accumulated] })),
  COLUMNS.accumulated, grouped);
}

export type CompareWith = 'lastYear' | 'previous' | 'custom';
export const COMPARE_WITH: { id: CompareWith; label: string }[] = [
  { id: 'lastYear', label: 'Same period last year' }, { id: 'previous', label: 'Previous period' }, { id: 'custom', label: 'Other dates' },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** The comparison period for a reporting period (yyyy-mm-dd): the same dates a year earlier, or the period just before
 * (whole months stay whole months: Mar 2026 -> Feb 2026, Jan-Mar -> Oct-Dec) */
export function comparisonDates(from: string, to: string, mode: Exclude<CompareWith, 'custom'>): { cmpFrom: string; cmpTo: string } {
  const f = parse(from), t = parse(to);
  if (mode === 'lastYear') {
    const back = (d: Date) => new Date(d.getFullYear() - 1, d.getMonth(), Math.min(d.getDate(), lastDay(d.getFullYear() - 1, d.getMonth())));
    return { cmpFrom: iso(back(f)), cmpTo: iso(back(t)) };
  }
  const wholeMonths = f.getDate() === 1 && t.getDate() === lastDay(t.getFullYear(), t.getMonth());
  if (wholeMonths) {
    const months = (t.getFullYear() - f.getFullYear()) * 12 + t.getMonth() - f.getMonth() + 1;
    return { cmpFrom: iso(new Date(f.getFullYear(), f.getMonth() - months, 1)), cmpTo: iso(new Date(f.getFullYear(), f.getMonth(), 0)) };
  }
  const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
  return { cmpFrom: iso(new Date(f.getFullYear(), f.getMonth(), f.getDate() - days)), cmpTo: iso(new Date(f.getFullYear(), f.getMonth(), f.getDate() - 1)) };
}

/** "1,200.00 Dr" / "100.00 Cr" for a signed amount; "1,200.00" for a plain one; "+12.5%" for a change; "" for 0 or nothing */
export function formatTbValue(v: number, kind: TbColumn['kind']): string {
  if (!v || !Number.isFinite(v)) return '';
  if (kind === 'percent') return `${v > 0 ? '+' : ''}${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  const text = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return kind === 'signed' ? `${text} ${v > 0 ? 'Dr' : 'Cr'}` : text;
}

/** Header labels and rows for Excel / PDF (numbers stay numbers; credits in signed columns are negative; blanks are '') */
export function tbExportTable(view: TbView): { columns: string[]; rows: (string | number)[][] } {
  const columns = ['Code', 'Account', ...view.columns.map((c) => [c.band, c.label].filter(Boolean).join(' ') + (c.kind === 'signed' ? ' (Dr + / Cr -)' : ''))];
  const blanks = view.columns.map(() => '');
  const cell = (v: number) => (Number.isFinite(v) ? v : '');
  const rows: (string | number)[][] = [];
  for (const s of view.sections) {
    if (s.title) rows.push(['', s.title.toUpperCase(), ...blanks]);
    for (const l of s.lines) rows.push([l.code, l.name, ...l.values.map(cell)]);
    if (s.subtotal) rows.push(['', `${s.title} total`, ...s.subtotal.map(cell)]);
  }
  for (const t of view.totals) rows.push(['', t.label, ...t.values.map(cell)]);
  return { columns, rows };
}
