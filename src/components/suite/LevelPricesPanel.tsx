import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import suite, { PriceLevel, ProductPrice } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

interface Props {
  productId: number;
  productName?: string;
  retailPrice?: number;
  levels?: PriceLevel[];
  onSaved?: () => void;
}

/** Level prices of one product: per level, per sale unit, with optional quantity breaks. */
const LevelPricesPanel: React.FC<Props> = ({ productId, productName, retailPrice, levels: given, onSaved }) => {
  const [levels, setLevels] = useState<PriceLevel[]>(given ?? []);
  const [rows, setRows] = useState<ProductPrice[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!given) suite.priceLevels().then(setLevels).catch(() => setLevels([])); else setLevels(given); }, [given]);
  useEffect(() => { suite.productPrices(productId).then(setRows).catch(() => setRows([])); }, [productId]);

  const add = () => {
    const level = levels.find((l) => !l.isDefault) ?? levels[0];
    if (!level) return;
    setRows([...rows, { productId, priceLevelId: level.id, saleUnit: 'Unit', minQty: 1, price: retailPrice ?? 0 }]);
  };

  const save = async () => {
    setBusy(true);
    try {
      await suite.saveProductPrices(productId, rows);
      Swal.fire({ icon: 'success', title: 'Level prices saved', timer: 1200, showConfirmButton: false });
      onSaved?.();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const set = (i: number, patch: Partial<ProductPrice>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div>
      {productName && <h6 className="mb-2">{productName}{retailPrice != null && <span className="text-muted fw-normal"> · retail Rs {retailPrice}</span>}</h6>}
      <table className="table table-sm align-middle">
        <thead><tr><th>Level</th><th>Sold as</th><th style={{ width: 110 }}>From qty</th><th style={{ width: 130 }}>Price (Rs)</th><th /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="text-muted">No level prices; everyone pays the normal price.</td></tr>}
          {rows.map((r, i) => (
            <tr key={i}>
              <td><select className="form-select form-select-sm" value={r.priceLevelId} onChange={(e) => set(i, { priceLevelId: Number(e.target.value) })} aria-label="Level">
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></td>
              <td><select className="form-select form-select-sm" value={r.saleUnit} onChange={(e) => set(i, { saleUnit: e.target.value })} aria-label="Unit">
                <option value="Unit">Unit</option><option value="Strip">Strip</option><option value="Box">Box</option></select></td>
              <td><input type="number" min={1} className="form-control form-control-sm" value={r.minQty} onChange={(e) => set(i, { minQty: Math.max(1, Number(e.target.value)) })} aria-label="From quantity" /></td>
              <td><input type="number" min={0} step="0.01" className="form-control form-control-sm" value={r.price} onChange={(e) => set(i, { price: Number(e.target.value) })} aria-label="Price" /></td>
              <td><button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove"><i className="ti ti-x" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={add} disabled={levels.length === 0}><i className="ti ti-plus me-1" />Add price</button>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => void save()} disabled={busy}>Save level prices</button>
      </div>
    </div>
  );
};

export default LevelPricesPanel;
