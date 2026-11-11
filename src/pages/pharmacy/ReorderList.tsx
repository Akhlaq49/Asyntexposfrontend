import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { money } from '../../components/pharmacy/ReportTable';
import pharmacyService, { ReorderSuggestion, apiError } from '../../services/pharmacyService';

interface Row extends ReorderSuggestion {
  include: boolean;
  supplier: string;
  orderUnit: 'Unit' | 'Box';
  orderQty: number;
  price: number;
}

const NO_SUPPLIER = 'No previous supplier';

const ReorderList: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const list = await pharmacyService.getReorderSuggestions();
        setRows(list.map((s) => {
          const byBox = s.unitsPerBox > 1;
          return {
            ...s,
            include: s.onOrder <= 0,
            supplier: s.lastSupplier || '',
            orderUnit: byBox ? 'Box' : 'Unit',
            orderQty: byBox ? Math.max(1, Math.ceil(s.suggestedQuantity / s.unitsPerBox)) : s.suggestedQuantity,
            price: s.lastPurchaseUnit === 'Box' || !byBox ? s.lastPurchasePrice : Math.round(s.lastPurchasePrice * s.unitsPerBox * 100) / 100,
          };
        }));
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Could not load reorder list', text: apiError(err) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const k = r.supplier.trim() || NO_SUPPLIER;
      map.set(k, [...(map.get(k) || []), r]);
    });
    return [...map.entries()].sort((a, b) => (a[0] === NO_SUPPLIER ? 1 : b[0] === NO_SUPPLIER ? -1 : a[0].localeCompare(b[0])));
  }, [rows]);

  const update = (productId: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r)));

  const createOrder = async (supplier: string, items: Row[]) => {
    const chosen = items.filter((r) => r.include && r.orderQty > 0);
    if (supplier === NO_SUPPLIER) { Swal.fire({ icon: 'info', title: 'Enter a supplier', text: 'Type the supplier name on each item first.' }); return; }
    if (chosen.length === 0) { Swal.fire({ icon: 'info', title: 'Tick at least one item' }); return; }
    setCreating(supplier);
    try {
      const total = chosen.reduce((s, r) => s + r.orderQty * r.price, 0);
      const stamp = new Date();
      const reference = `PO-${stamp.getFullYear().toString().slice(2)}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}-${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}`;
      await api.post('/purchases', {
        supplierName: supplier, reference, date: stamp.toISOString(), status: 'Ordered',
        orderTax: 0, discount: 0, shipping: 0, total, paid: 0, notes: 'Created from reorder list',
        items: chosen.map((r) => ({
          productId: r.productId, productName: r.productName, quantity: r.orderQty, purchasePrice: r.price,
          discount: 0, taxPercentage: 0, taxAmount: 0, unitCost: r.price, totalCost: r.orderQty * r.price, purchaseUnit: r.orderUnit,
        })),
      });
      const res = await Swal.fire({ icon: 'success', title: `Order ${reference} created`, text: `${chosen.length} items for ${supplier}. Mark it Received on the purchase list when the stock arrives.`, showCancelButton: true, confirmButtonText: 'Open purchases', cancelButtonText: 'Stay here' });
      setRows((prev) => prev.map((r) => (chosen.includes(r) ? { ...r, include: false, onOrder: r.onOrder + r.orderQty } : r)));
      if (res.isConfirmed) navigate('/purchase-list');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not create the order', text: apiError(err) });
    } finally {
      setCreating('');
    }
  };

  return (
    <>
      <PageHeader title="Reorder List" subtitle="Items at or below their minimum level, grouped by the supplier they were last bought from" breadcrumbs={[{ title: 'Purchases' }]} />
      {loading ? (
        <div className="card"><div className="card-body text-center py-5"><span className="spinner-border" /></div></div>
      ) : rows.length === 0 ? (
        <div className="card"><div className="card-body text-center text-muted py-5">Nothing to reorder. Every item with a minimum level is above it.</div></div>
      ) : groups.map(([supplier, items]) => {
        const chosen = items.filter((r) => r.include);
        const total = chosen.reduce((s, r) => s + r.orderQty * r.price, 0);
        return (
          <div className="card" key={supplier}>
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">{supplier} <span className="text-muted fs-13 fw-normal">· {items.length} items</span></h5>
              <div className="d-flex align-items-center gap-3">
                <span className="fw-medium">{chosen.length} ticked · Rs {money(total)}</span>
                <button type="button" className="btn btn-sm btn-primary" disabled={creating === supplier || chosen.length === 0} onClick={() => void createOrder(supplier, items)}>
                  {creating === supplier && <span className="spinner-border spinner-border-sm me-1" />}Create purchase order
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }} />
                      <th>Medicine</th>
                      <th className="text-end">In stock</th>
                      <th className="text-end">Minimum</th>
                      <th className="text-end">On order</th>
                      <th>Order</th>
                      <th>Price / unit (Rs)</th>
                      <th className="text-end">Amount</th>
                      <th>Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.productId} className={r.currentStock === 0 ? 'table-danger' : ''}>
                        <td><input type="checkbox" className="form-check-input" checked={r.include} onChange={(e) => update(r.productId, { include: e.target.checked })} aria-label={`Order ${r.productName}`} /></td>
                        <td><div className="fw-medium">{r.productName}{r.strength ? ` ${r.strength}` : ''}</div><div className="fs-12 text-muted">{r.genericName}</div></td>
                        <td className="text-end">{r.currentStock}</td>
                        <td className="text-end">{r.quantityAlert}</td>
                        <td className="text-end">{r.onOrder || ''}</td>
                        <td>
                          <div className="input-group input-group-sm" style={{ width: 150 }}>
                            <input type="number" min={1} className="form-control" value={r.orderQty} onChange={(e) => update(r.productId, { orderQty: Math.max(0, Number(e.target.value) || 0) })} aria-label="Order quantity" />
                            <select className="form-select" value={r.orderUnit} aria-label="Order unit"
                              onChange={(e) => {
                                const unit = e.target.value as 'Unit' | 'Box';
                                if (unit === r.orderUnit || r.unitsPerBox <= 1) return;
                                update(r.productId, unit === 'Box'
                                  ? { orderUnit: unit, orderQty: Math.max(1, Math.ceil(r.orderQty / r.unitsPerBox)), price: Math.round(r.price * r.unitsPerBox * 100) / 100 }
                                  : { orderUnit: unit, orderQty: r.orderQty * r.unitsPerBox, price: Math.round((r.price / r.unitsPerBox) * 10000) / 10000 });
                              }}>
                              <option value="Unit">units</option>
                              {r.unitsPerBox > 1 && <option value="Box">boxes</option>}
                            </select>
                          </div>
                        </td>
                        <td><input type="number" min={0} step="0.01" className="form-control form-control-sm" style={{ width: 100 }} value={r.price} onChange={(e) => update(r.productId, { price: Number(e.target.value) || 0 })} aria-label="Price" /></td>
                        <td className="text-end">{money(r.orderQty * r.price)}</td>
                        <td><input className="form-control form-control-sm" style={{ width: 160 }} value={r.supplier} placeholder="Supplier" onChange={(e) => update(r.productId, { supplier: e.target.value })} aria-label="Supplier" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default ReorderList;
