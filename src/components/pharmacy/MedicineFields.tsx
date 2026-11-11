import React from 'react';

export interface MedicineFieldValues {
  genericName: string;
  strength: string;
  dosageForm: string;
  rackLocation: string;
  isPrescriptionOnly: boolean;
  isControlled: boolean;
  purchasePrice: string;
  unitsPerStrip: string;
  stripsPerBox: string;
  refillDays: string;
  batchNo: string;
  sellOnline: boolean;
}

export const emptyMedicineFields: MedicineFieldValues = {
  genericName: '', strength: '', dosageForm: '', rackLocation: '',
  isPrescriptionOnly: false, isControlled: false, purchasePrice: '',
  unitsPerStrip: '1', stripsPerBox: '1', refillDays: '', batchNo: '', sellOnline: true,
};

/** Values ready to send with the product form. */
export const medicinePayload = (m: MedicineFieldValues) => ({
  genericName: m.genericName.trim(),
  strength: m.strength.trim(),
  dosageForm: m.dosageForm,
  rackLocation: m.rackLocation.trim(),
  isPrescriptionOnly: m.isPrescriptionOnly || m.isControlled,
  isControlled: m.isControlled,
  purchasePrice: Number(m.purchasePrice) || 0,
  unitsPerStrip: Math.max(1, Number(m.unitsPerStrip) || 1),
  stripsPerBox: Math.max(1, Number(m.stripsPerBox) || 1),
  refillDays: Math.max(0, Number(m.refillDays) || 0),
  batchNo: m.batchNo.trim(),
  sellOnline: m.sellOnline && !m.isPrescriptionOnly && !m.isControlled,
});

export const medicineFromProduct = (p: any): MedicineFieldValues => ({
  genericName: p?.genericName ?? '',
  strength: p?.strength ?? '',
  dosageForm: p?.dosageForm ?? '',
  rackLocation: p?.rackLocation ?? '',
  isPrescriptionOnly: !!p?.isPrescriptionOnly,
  isControlled: !!p?.isControlled,
  purchasePrice: p?.purchasePrice ? String(p.purchasePrice) : '',
  unitsPerStrip: String(p?.unitsPerStrip || 1),
  stripsPerBox: String(p?.stripsPerBox || 1),
  refillDays: p?.refillDays ? String(p.refillDays) : '',
  batchNo: '',
  sellOnline: p?.sellOnline !== false,
});

const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Infusion', 'Cream', 'Ointment', 'Gel', 'Drops', 'Inhaler', 'Sachet', 'Suppository', 'Solution', 'Powder', 'Device', 'Other'];

interface Props {
  value: MedicineFieldValues;
  onChange: (v: MedicineFieldValues) => void;
  /** Retail price per unit, to show the margin. */
  retailPrice?: number;
  /** Stock quantity being entered on the form, to label the batch fields. */
  showBatch?: boolean;
  /** Hide the trade price for users who may not see cost. */
  showCost?: boolean;
}

const MedicineFields: React.FC<Props> = ({ value, onChange, retailPrice, showBatch = true, showCost = true }) => {
  const set = (k: keyof MedicineFieldValues, v: string | boolean) => onChange({ ...value, [k]: v });
  const strip = Math.max(1, Number(value.unitsPerStrip) || 1);
  const box = strip * Math.max(1, Number(value.stripsPerBox) || 1);
  const cost = Number(value.purchasePrice) || 0;
  const margin = retailPrice && cost > 0 ? ((retailPrice - cost) / retailPrice) * 100 : null;

  return (
    <div className="accordion-item border mb-4">
      <h2 className="accordion-header">
        <div className="accordion-button bg-white">
          <h5 className="d-flex align-items-center mb-0">
            <i className="ti ti-pill text-primary me-2" />
            <span>Medicine details</span>
          </h5>
        </div>
      </h2>
      <div className="accordion-collapse collapse show">
        <div className="accordion-body border-top">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label" htmlFor="med-generic">Generic (salt) name</label>
              <input id="med-generic" className="form-control" placeholder="e.g. Paracetamol" value={value.genericName} onChange={(e) => set('genericName', e.target.value)} />
              <div className="form-text">Used for search and to suggest other brands when this one is out of stock.</div>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="med-strength">Strength</label>
              <input id="med-strength" className="form-control" placeholder="e.g. 500mg" value={value.strength} onChange={(e) => set('strength', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="med-form">Form</label>
              <select id="med-form" className="form-select" value={value.dosageForm} onChange={(e) => set('dosageForm', e.target.value)}>
                <option value="">Choose…</option>
                {FORMS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="med-strip">Units per strip</label>
              <input id="med-strip" type="number" min={1} className="form-control" value={value.unitsPerStrip} onChange={(e) => set('unitsPerStrip', e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="med-box">Strips per box</label>
              <input id="med-box" type="number" min={1} className="form-control" value={value.stripsPerBox} onChange={(e) => set('stripsPerBox', e.target.value)} />
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <div className="form-text mb-2">
                Stock and price are per single unit (tablet, bottle, tube).
                {box > 1 ? ` One box = ${box} units${strip > 1 ? `, one strip = ${strip}` : ''}.` : ' Set these if the item is sold loose or by strip.'}
                {retailPrice ? ` Box price Rs ${(retailPrice * box).toFixed(2)}.` : ''}
              </div>
            </div>

            {showCost && (
              <div className="col-md-3">
                <label className="form-label" htmlFor="med-cost">Trade price per unit (Rs)</label>
                <input id="med-cost" type="number" min={0} step="0.0001" className="form-control" value={value.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                {margin != null && <div className={`form-text ${margin < 0 ? 'text-danger' : ''}`}>Margin {margin.toFixed(1)}%</div>}
              </div>
            )}
            <div className="col-md-3">
              <label className="form-label" htmlFor="med-rack">Rack / shelf</label>
              <input id="med-rack" className="form-control" placeholder="e.g. A-3" value={value.rackLocation} onChange={(e) => set('rackLocation', e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="med-refill">Refill reminder after (days)</label>
              <input id="med-refill" type="number" min={0} className="form-control" placeholder="0 = off" value={value.refillDays} onChange={(e) => set('refillDays', e.target.value)} />
            </div>
            {showBatch && (
              <div className="col-md-3">
                <label className="form-label" htmlFor="med-batch">Batch no. for stock entered here</label>
                <input id="med-batch" className="form-control" placeholder="Optional" value={value.batchNo} onChange={(e) => set('batchNo', e.target.value)} />
              </div>
            )}

            <div className="col-12 d-flex flex-wrap gap-4">
              <label className="form-check mb-0">
                <input type="checkbox" className="form-check-input" checked={value.isPrescriptionOnly || value.isControlled}
                  disabled={value.isControlled} onChange={(e) => set('isPrescriptionOnly', e.target.checked)} />
                <span className="form-check-label">Prescription only (doctor's name needed at the counter)</span>
              </label>
              <label className="form-check mb-0">
                <input type="checkbox" className="form-check-input" checked={value.isControlled} onChange={(e) => set('isControlled', e.target.checked)} />
                <span className="form-check-label">Controlled medicine (kept in the controlled register)</span>
              </label>
              <label className="form-check mb-0">
                <input type="checkbox" className="form-check-input" checked={value.sellOnline && !value.isPrescriptionOnly && !value.isControlled}
                  disabled={value.isPrescriptionOnly || value.isControlled} onChange={(e) => set('sellOnline', e.target.checked)} />
                <span className="form-check-label">Sell on the web store / Shopify{(value.isPrescriptionOnly || value.isControlled) ? ' (not for prescription medicines)' : ''}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicineFields;
