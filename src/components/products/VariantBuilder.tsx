import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

/** One variant to create, e.g. Color: Red / Size: M */
export interface VariantRow {
  key: string;
  parts: { attribute: string; value: string }[];
  sku: string;
  quantity: string;
  /** empty = use the product's price */
  price: string;
}

interface VariantAttribute { id: number; name: string; values: string; status: string }

const splitValues = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
const skuPart = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8);
export const variantLabel = (r: VariantRow) => r.parts.map((p) => p.value).join(' / ');

interface Props {
  baseSku: string;
  basePrice: string;
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
}

/**
 * Variable product: pick attributes from Inventory > Variant Attributes and the values wanted;
 * one row per combination with its own SKU, opening quantity and price.
 */
const VariantBuilder: React.FC<Props> = ({ baseSku, basePrice, rows, onChange }) => {
  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** attribute id -> values ticked */
  const [chosen, setChosen] = useState<Record<number, string[]>>({});

  useEffect(() => {
    api.get<VariantAttribute[]>('/variant-attributes')
      .then((r) => setAttributes(r.data.filter((a) => (a.status || 'active').toLowerCase() === 'active' && splitValues(a.values).length > 0)))
      .catch(() => setError('Could not load the variant attributes.'))
      .finally(() => setLoading(false));
  }, []);

  // every combination of the ticked values (attributes in the order they were added)
  const combos = useMemo(() => {
    const picked = attributes.filter((a) => (chosen[a.id] || []).length > 0).map((a) => ({ attribute: a.name, values: chosen[a.id] }));
    if (picked.length === 0) return [] as VariantRow['parts'][];
    return picked.reduce<VariantRow['parts'][]>((acc, a) => acc.flatMap((c) => a.values.map((v) => [...c, { attribute: a.attribute, value: v }])), [[]]);
  }, [attributes, chosen]);

  // rebuild the rows when the choice changes, keeping what was typed into rows that stay
  useEffect(() => {
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const next = combos.map((parts) => {
      const key = parts.map((p) => `${p.attribute}=${p.value}`).join('|');
      return byKey.get(key) ?? { key, parts, sku: '', quantity: '0', price: '' };
    });
    const same = next.length === rows.length && next.every((r, i) => r === rows[i]);
    if (!same) onChange(next);
  }, [combos]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (a: VariantAttribute, value: string) => {
    const cur = chosen[a.id] || [];
    setChosen({ ...chosen, [a.id]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };
  const setAll = (a: VariantAttribute, on: boolean) => setChosen({ ...chosen, [a.id]: on ? splitValues(a.values) : [] });
  const setRow = (key: string, patch: Partial<VariantRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const suggestedSku = (r: VariantRow) => [baseSku.trim() || 'SKU', ...r.parts.map((p) => skuPart(p.value))].join('-');

  if (loading) return <div className="text-muted py-2">Loading variant attributes...</div>;
  if (error) return <div className="alert alert-danger py-2">{error}</div>;
  if (attributes.length === 0) {
    return (
      <div className="alert alert-warning py-2">
        No variant attributes yet. Add them first under <Link to="/variant-attributes">Inventory &gt; Variant Attributes</Link> (e.g. Color: Red, Black, White).
      </div>
    );
  }

  return (
    <div className="mb-3">
      <label className="form-label">Variant attributes</label>
      <p className="text-muted small mb-2">Tick the values this product comes in. Each combination is saved as its own product with its own SKU, stock and price.</p>
      {attributes.map((a) => {
        const values = splitValues(a.values);
        const ticked = chosen[a.id] || [];
        return (
          <div key={a.id} className="border rounded p-2 mb-2">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <strong>{a.name}</strong>
              <span className="small">
                <a href="#" onClick={(e) => { e.preventDefault(); setAll(a, true); }}>All</a>
                <span className="text-muted mx-1">|</span>
                <a href="#" onClick={(e) => { e.preventDefault(); setAll(a, false); }}>None</a>
              </span>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {values.map((v) => (
                <button key={v} type="button" onClick={() => toggle(a, v)}
                  className={`btn btn-sm ${ticked.includes(v) ? 'btn-primary' : 'btn-outline-secondary'}`}>
                  {ticked.includes(v) && <i className="ti ti-check me-1" />}{v}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {rows.length > 0 && (
        <div className="table-responsive mt-3">
          <table className="table table-sm border align-middle mb-1">
            <thead className="thead-light">
              <tr><th>Variant</th><th>SKU</th><th style={{ width: 120 }}>Quantity</th><th style={{ width: 160 }}>Price (Rs)</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.parts.map((p) => <span key={p.attribute} className="badge bg-light text-dark border me-1">{p.attribute}: {p.value}</span>)}</td>
                  <td><input className="form-control form-control-sm" value={r.sku} placeholder={suggestedSku(r)} onChange={(e) => setRow(r.key, { sku: e.target.value })} /></td>
                  <td>
                    <input type="number" min={0} step={1} className="form-control form-control-sm" value={r.quantity}
                      onKeyDown={(e) => { if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      onChange={(e) => setRow(r.key, { quantity: e.target.value.replace(/\D/g, '') })} />
                  </td>
                  <td>
                    <input type="number" min={0} step="0.01" className="form-control form-control-sm" value={r.price} placeholder={basePrice || '0'}
                      onChange={(e) => setRow(r.key, { price: e.target.value.startsWith('-') ? '' : e.target.value })} />
                  </td>
                  <td className="text-end">
                    <button type="button" className="btn btn-sm btn-outline-danger" title="Don't create this variant"
                      onClick={() => {
                        const attr = attributes.find((a) => a.name === r.parts[r.parts.length - 1].attribute);
                        // a single-attribute variant is removed by unticking its value; otherwise drop just this row
                        if (attr && r.parts.length === 1) toggle(attr, r.parts[0].value); else onChange(rows.filter((x) => x.key !== r.key));
                      }}><i className="ti ti-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <small className="text-muted">{rows.length} variant(s). Empty SKU = the suggested one; empty price = the product price above.</small>
        </div>
      )}
    </div>
  );
};

export const resolveVariantSku = (r: VariantRow, baseSku: string) =>
  r.sku.trim() || [baseSku.trim() || 'SKU', ...r.parts.map((p) => skuPart(p.value))].join('-');

export default VariantBuilder;
