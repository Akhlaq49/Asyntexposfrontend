import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

/** A tax applied to a product / quotation / purchase order (amount = base x percent / 100) */
export interface AppliedTax {
  taxTypeId: number | null;
  taxName: string;
  percent: number;
  amount: number;
}

export interface TaxTypeOption { id: number; name: string; isActive: boolean }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Recalculates every tax amount for a new base (and drops rows with no type or rate) */
export const calcTaxes = (taxes: AppliedTax[], base: number): AppliedTax[] =>
  taxes.map((t) => ({ ...t, percent: Math.min(100, Math.max(0, t.percent || 0)), amount: round2(Math.max(0, base) * Math.min(100, Math.max(0, t.percent || 0)) / 100) }));

/** Rows ready to save: a tax type picked and a rate above 0 */
export const cleanTaxes = (taxes: AppliedTax[], base: number): AppliedTax[] =>
  calcTaxes(taxes.filter((t) => t.taxName && t.percent > 0), base);

export const taxTotal = (taxes: AppliedTax[]) => round2(taxes.reduce((sum, t) => sum + (t.amount || 0), 0));

let taxTypesCache: Promise<TaxTypeOption[]> | null = null;
/** Active tax types (loaded once per page visit; call refreshTaxTypes() after editing them) */
export const loadTaxTypes = () => {
  if (!taxTypesCache) taxTypesCache = api.get<TaxTypeOption[]>('/tax-types', { params: { activeOnly: true } }).then((r) => r.data).catch(() => { taxTypesCache = null; return []; });
  return taxTypesCache;
};
export const refreshTaxTypes = () => { taxTypesCache = null; };

interface TaxSelectorProps {
  /** Amount the taxes are calculated on */
  base: number;
  value: AppliedTax[];
  onChange: (taxes: AppliedTax[]) => void;
  /** e.g. "on the price", "on the subtotal after discount" */
  baseLabel?: string;
  format?: (n: number) => string;
}

/**
 * "Apply tax?  Yes / No". No = no taxes. Yes = one or more rows of tax type (dropdown) + rate (%),
 * with the amount worked out straight away and a total.
 */
const TaxSelector: React.FC<TaxSelectorProps> = ({ base, value, onChange, baseLabel, format }) => {
  const fmt = format ?? ((n: number) => `Rs ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const [types, setTypes] = useState<TaxTypeOption[]>([]);
  const [apply, setApply] = useState(value.length > 0);

  useEffect(() => { loadTaxTypes().then(setTypes); }, []);
  // an existing record with taxes opens on "Yes"
  useEffect(() => { if (value.length > 0) setApply(true); }, [value.length]);
  // keep amounts in step with the base (quantities, prices, discount)
  useEffect(() => {
    const next = calcTaxes(value, base);
    if (next.some((t, i) => t.amount !== value[i].amount)) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const setRows = (rows: AppliedTax[]) => onChange(calcTaxes(rows, base));
  const choose = (yes: boolean) => {
    setApply(yes);
    if (!yes) onChange([]);
    else if (value.length === 0) setRows([{ taxTypeId: null, taxName: '', percent: 0, amount: 0 }]);
  };
  const update = (i: number, patch: Partial<AppliedTax>) => setRows(value.map((t, n) => (n === i ? { ...t, ...patch } : t)));
  const pickType = (i: number, id: string) => {
    const type = types.find((t) => String(t.id) === id);
    update(i, { taxTypeId: type ? type.id : null, taxName: type ? type.name : '' });
  };
  const usedIds = value.map((t) => t.taxTypeId).filter(Boolean);
  const total = taxTotal(value);

  return (
    <div className="border rounded p-3 mb-3" style={{ background: '#fafbfc' }}>
      <div className="d-flex align-items-center flex-wrap gap-3">
        <span className="fw-semibold">Apply tax?</span>
        <div className="form-check form-check-inline mb-0">
          <input className="form-check-input" type="radio" id="tax-no" checked={!apply} onChange={() => choose(false)} />
          <label className="form-check-label" htmlFor="tax-no">No</label>
        </div>
        <div className="form-check form-check-inline mb-0">
          <input className="form-check-input" type="radio" id="tax-yes" checked={apply} onChange={() => choose(true)} />
          <label className="form-check-label" htmlFor="tax-yes">Yes</label>
        </div>
        {apply && baseLabel && <small className="text-muted">Calculated {baseLabel}: {fmt(base)}</small>}
      </div>

      {apply && (
        <div className="mt-3">
          {types.length === 0 && (
            <div className="alert alert-warning py-2 mb-2">
              No tax types yet. Add them under <Link to="/tax-types">Inventory &gt; Tax Types</Link> first.
            </div>
          )}
          {value.map((t, i) => (
            <div className="row g-2 align-items-end mb-2" key={i}>
              <div className="col-md-5">
                {i === 0 && <label className="form-label mb-1">Tax type</label>}
                <select className="form-select" value={t.taxTypeId ?? ''} onChange={(e) => pickType(i, e.target.value)}>
                  <option value="">{t.taxTypeId == null && t.taxName ? t.taxName : 'Select tax type'}</option>
                  {types.filter((o) => o.id === t.taxTypeId || !usedIds.includes(o.id)).map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                {i === 0 && <label className="form-label mb-1">Rate (%)</label>}
                <div className="input-group">
                  <input type="number" min={0} max={100} step="any" className="form-control" placeholder="0"
                    value={t.percent || ''} onChange={(e) => update(i, { percent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })} />
                  <span className="input-group-text">%</span>
                </div>
              </div>
              <div className="col-md-3">
                {i === 0 && <label className="form-label mb-1">Tax amount</label>}
                <input className="form-control" readOnly value={fmt(t.amount)} />
              </div>
              <div className="col-md-1">
                <button type="button" className="btn btn-outline-danger w-100" title="Remove this tax"
                  onClick={() => { const rows = value.filter((_, n) => n !== i); setRows(rows); if (rows.length === 0) setApply(false); }}>
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            </div>
          ))}
          <div className="d-flex justify-content-between align-items-center mt-2">
            <button type="button" className="btn btn-sm btn-outline-primary" disabled={types.length === 0 || usedIds.length >= types.length}
              onClick={() => setRows([...value, { taxTypeId: null, taxName: '', percent: 0, amount: 0 }])}>
              <i className="ti ti-plus me-1"></i>Add another tax
            </button>
            <span>Total tax: <strong style={{ fontSize: 16 }}>{fmt(total)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxSelector;
