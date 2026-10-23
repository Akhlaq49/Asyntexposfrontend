import React from 'react';

/** Month (yyyy-mm) or a From / To range (yyyy-mm-dd); empty strings = not set */
export interface DateFilterValue { month: string; from: string; to: string }
export const EMPTY_DATE_FILTER: DateFilterValue = { month: '', from: '', to: '' };

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar day as yyyy-mm-dd (so a date never shifts across midnight because of the time zone) */
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parses API dates: ISO ("2026-10-23T00:00:00") or display text ("23 Oct 2026") */
export const parseAnyDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export const isDateFilterSet = (f: DateFilterValue) => !!(f.month || f.from || f.to);

export const matchesDateFilter = (value: string | null | undefined, f: DateFilterValue) => {
  if (!isDateFilterSet(f)) return true;
  const d = parseAnyDate(value);
  if (!d) return false;
  const key = dayKey(d);
  if (f.month && key.slice(0, 7) !== f.month) return false;
  if (f.from && key < f.from) return false;
  if (f.to && key > f.to) return false;
  return true;
};

const showDay = (k: string) => new Date(`${k}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
/** "Month: Oct 2026" / "From 01 Oct 2026 to 15 Oct 2026" - for print / export headings */
export const describeDateFilter = (f: DateFilterValue) => {
  if (f.month) return `Month: ${new Date(`${f.month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
  if (f.from && f.to) return `From ${showDay(f.from)} to ${showDay(f.to)}`;
  if (f.from) return `From ${showDay(f.from)}`;
  if (f.to) return `Up to ${showDay(f.to)}`;
  return '';
};

interface DateFiltersProps { value: DateFilterValue; onChange: (v: DateFilterValue) => void }

/** Month picker or From / To dates (picking one clears the other) + Clear */
const DateFilters: React.FC<DateFiltersProps> = ({ value, onChange }) => (
  <div className="d-flex align-items-center flex-wrap gap-2">
    <div className="d-flex align-items-center gap-1">
      <small className="text-muted">Month</small>
      <input type="month" className="form-control form-control-sm" style={{ width: 150 }} value={value.month}
        onChange={(e) => onChange({ month: e.target.value, from: '', to: '' })} />
    </div>
    <div className="d-flex align-items-center gap-1">
      <small className="text-muted">From</small>
      <input type="date" className="form-control form-control-sm" style={{ width: 145 }} value={value.from} max={value.to || undefined}
        onChange={(e) => onChange({ ...value, month: '', from: e.target.value })} />
      <small className="text-muted">To</small>
      <input type="date" className="form-control form-control-sm" style={{ width: 145 }} value={value.to} min={value.from || undefined}
        onChange={(e) => onChange({ ...value, month: '', to: e.target.value })} />
    </div>
    {isDateFilterSet(value) && (
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onChange(EMPTY_DATE_FILTER)} title="Clear the date filter">
        <i className="ti ti-x me-1"></i>Clear dates
      </button>
    )}
  </div>
);

export default DateFilters;
