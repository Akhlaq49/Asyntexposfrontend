import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import suite, { Variant } from '../../services/suiteService';

export interface GridLine {
  productId: number;
  productName: string;
  variantId: number;
  variantLabel: string;
  quantity: number;
  unitCost: number;
}

interface Props {
  product: { id: number; productName: string; purchasePrice?: number } | null;
  onClose: () => void;
  onAdd: (lines: GridLine[]) => void;
}

/** Colour × size grid for receiving an article: one quantity per cell. */
const VariantGridEntry: React.FC<Props> = ({ product, onClose, onAdd }) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (!product) return;
    setQty({});
    setCost(product.purchasePrice ? String(product.purchasePrice) : '');
    suite.productVariants(product.id).then((d) => setVariants(d.variants.filter((v) => v.isActive))).catch(() => setVariants([]));
  }, [product]);

  if (!product) return null;
  const rows = Array.from(new Set(variants.map((v) => v.option1 ?? '')));
  const cols = Array.from(new Set(variants.map((v) => v.option2 ?? '')));
  const at = (r: string, c: string) => variants.find((v) => (v.option1 ?? '') === r && (v.option2 ?? '') === c);
  const total = Object.values(qty).reduce((s, v) => s + (Number(v) || 0), 0);

  const add = () => {
    const unitCost = Number(cost) || 0;
    const lines = variants
      .filter((v) => Number(qty[v.id]) > 0)
      .map((v) => ({
        productId: product.id, productName: product.productName, variantId: v.id,
        variantLabel: [v.option1, v.option2, v.option3].filter(Boolean).join(' / '),
        quantity: Number(qty[v.id]), unitCost: v.costPrice ?? unitCost,
      }));
    if (lines.length) onAdd(lines);
    onClose();
  };

  return (
    <Modal show title={`${product.productName}: quantities by size / colour`} onClose={onClose} size="lg"
      footer={<><span className="me-auto">{total} unit(s)</span><button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={add} disabled={total === 0}>Add to purchase</button></>}>
      {variants.length === 0 ? <p className="text-muted">This article has no sizes or colours yet. Create them on the product page.</p> : (
        <>
          <div className="mb-3" style={{ maxWidth: 220 }}>
            <label className="form-label">Cost per piece (Rs)</label>
            <input type="number" min={0} className="form-control" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="table-responsive">
            <table className="table table-bordered table-sm text-center align-middle mb-0">
              <thead><tr><th />{cols.map((c) => <th key={c}>{c || '—'}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r}>
                    <th className="text-start">{r || '—'}</th>
                    {cols.map((c) => {
                      const v = at(r, c);
                      return (
                        <td key={c} style={{ minWidth: 80 }}>
                          {v ? <input type="number" min={0} className="form-control form-control-sm text-center" value={qty[v.id] ?? ''} placeholder="0"
                            aria-label={`${r} ${c}`} onChange={(e) => setQty({ ...qty, [v.id]: e.target.value })} /> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
};

export default VariantGridEntry;
