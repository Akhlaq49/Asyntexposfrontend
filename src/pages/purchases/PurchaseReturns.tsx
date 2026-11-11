import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import ReportTable, { Column, DateRange, daysAgo, money, ymd } from '../../components/pharmacy/ReportTable';
import { getParties, Party } from '../../services/partyService';
import pharmacyService, { ProductBatch, PurchaseReturn, apiError } from '../../services/pharmacyService';

interface ProductOption { id: string; productName: string; quantity: number; purchasePrice?: number; strength?: string }
interface Line { productId: string; batchId: string; quantity: string; unitCost: string; reason: string; batches: ProductBatch[] }

const REASONS = ['Expired', 'Near expiry', 'Damaged', 'Wrong item', 'Other'];
const emptyLine = (): Line => ({ productId: '', batchId: '', quantity: '', unitCost: '', reason: 'Expired', batches: [] });

const PurchaseReturns: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(daysAgo(90));
  const [to, setTo] = useState(ymd(new Date()));
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await pharmacyService.getPurchaseReturns({ from, to })); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load returns', text: apiError(err) }); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    api.get<ProductOption[]>('/products').then((r) => setProducts(r.data)).catch(() => undefined);
    getParties('Supplier').then(setSuppliers).catch(() => undefined);
  }, []);

  const loadBatches = async (index: number, productId: string, preselect?: string) => {
    let batches: ProductBatch[] = [];
    if (productId) {
      try { batches = (await pharmacyService.getBatches(productId)).filter((b) => b.quantity > 0); } catch { /* none */ }
    }
    setLines((prev) => prev.map((l, i) => {
      if (i !== index) return l;
      const chosen = batches.find((b) => String(b.id) === preselect);
      return {
        ...l, productId, batches,
        batchId: chosen ? String(chosen.id) : '',
        quantity: chosen ? String(chosen.quantity) : l.quantity,
        unitCost: chosen ? String(chosen.purchasePrice || '') : l.unitCost,
        reason: chosen && chosen.daysToExpiry != null && chosen.daysToExpiry < 0 ? 'Expired' : chosen ? 'Near expiry' : l.reason,
      };
    }));
  };

  /* Opened from Near Expiry: ?productId=&batchId=&supplier= */
  useEffect(() => {
    const productId = params.get('productId');
    if (!productId) return;
    setShowForm(true);
    setSupplier(params.get('supplier') || '');
    setLines([emptyLine()]);
    void loadBatches(0, productId, params.get('batchId') || undefined);
    params.delete('productId'); params.delete('batchId'); params.delete('supplier');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLine = (i: number, patch: Partial<Line>) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0), [lines]);

  const save = async () => {
    const items = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (!supplier.trim()) { Swal.fire({ icon: 'info', title: 'Choose the supplier' }); return; }
    if (items.length === 0) { Swal.fire({ icon: 'info', title: 'Add at least one item with a quantity' }); return; }
    setSaving(true);
    try {
      const r = await pharmacyService.createPurchaseReturn({
        supplierName: supplier.trim(), notes: notes || undefined,
        items: items.map((l) => ({
          productId: Number(l.productId), batchId: l.batchId ? Number(l.batchId) : null,
          quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0, reason: l.reason,
        })),
      });
      Swal.fire({ icon: 'success', title: `Return ${r.reference} saved`, text: `Rs ${money(r.total)} credited to ${r.supplierName}. Stock reduced.` });
      setShowForm(false);
      setLines([emptyLine()]);
      setNotes('');
      void load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not save the return', text: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: PurchaseReturn) => {
    const res = await Swal.fire({ icon: 'warning', title: `Delete return ${r.reference}?`, text: 'The stock goes back into the batches it was taken from.', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#d33' });
    if (!res.isConfirmed) return;
    try { await pharmacyService.deletePurchaseReturn(r.id); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not delete', text: apiError(err) }); }
  };

  const columns: Column<PurchaseReturn>[] = [
    { key: 'reference', label: 'Return' },
    { key: 'date', label: 'Date' },
    { key: 'supplierName', label: 'Supplier' },
    {
      key: 'items', label: 'Items', value: (r) => r.items.map((i) => `${i.productName} ×${i.quantity}`).join('; '),
      render: (r) => r.items.map((i) => (
        <div key={i.id} className="fs-13">{i.productName} × {i.quantity} <span className="text-muted">({i.batchNo || 'no batch'}, {i.reason})</span></div>
      )),
    },
    { key: 'total', label: 'Credit (Rs)', align: 'end', money: true, total: true },
    { key: 'createdBy', label: 'By' },
    { key: 'act', label: '', value: () => '', render: (r) => <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void remove(r)} aria-label={`Delete ${r.reference}`}><i className="ti ti-trash" /></button> },
  ];

  return (
    <>
      <PageHeader
        title="Purchase Returns"
        subtitle="Expired, near-expiry or damaged stock sent back to suppliers"
        breadcrumbs={[{ title: 'Purchases' }]}
        actions={!showForm && <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}><i className="ti ti-circle-plus me-1" />New return</button>}
      />

      {showForm && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">New return to supplier</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowForm(false)} />
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-5">
                <label className="form-label" htmlFor="pr-supplier">Supplier</label>
                <input id="pr-supplier" className="form-control" list="pr-supplier-list" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Distributor name" />
                <datalist id="pr-supplier-list">
                  {suppliers.map((s) => <option key={s.id} value={s.companyName || s.fullName} />)}
                </datalist>
              </div>
              <div className="col-md-7">
                <label className="form-label" htmlFor="pr-notes">Notes</label>
                <input id="pr-notes" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Picked up by distributor's rep" />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th style={{ minWidth: 220 }}>Medicine</th><th style={{ minWidth: 200 }}>Batch</th><th>Qty</th><th>Credit / unit (Rs)</th><th>Reason</th><th className="text-end">Amount</th><th /></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td>
                        <select className="form-select form-select-sm" value={l.productId} onChange={(e) => void loadBatches(i, e.target.value)} aria-label="Medicine">
                          <option value="">Choose…</option>
                          {products.filter((p) => p.quantity > 0 || p.id === l.productId).map((p) => (
                            <option key={p.id} value={p.id}>{p.productName}{p.strength ? ` ${p.strength}` : ''} ({p.quantity})</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="form-select form-select-sm" value={l.batchId} aria-label="Batch"
                          onChange={(e) => {
                            const b = l.batches.find((x) => String(x.id) === e.target.value);
                            setLine(i, { batchId: e.target.value, unitCost: b ? String(b.purchasePrice || '') : l.unitCost, quantity: b && !l.quantity ? String(b.quantity) : l.quantity });
                          }}>
                          <option value="">Earliest expiry first</option>
                          {l.batches.map((b) => (
                            <option key={b.id} value={b.id}>{b.batchNo} · exp {b.expiryDate ?? '—'} · {b.quantity} left</option>
                          ))}
                        </select>
                      </td>
                      <td><input type="number" min={1} className="form-control form-control-sm" style={{ width: 90 }} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} aria-label="Quantity" /></td>
                      <td><input type="number" min={0} step="0.01" className="form-control form-control-sm" style={{ width: 110 }} value={l.unitCost} placeholder="batch cost" onChange={(e) => setLine(i, { unitCost: e.target.value })} aria-label="Credit per unit" /></td>
                      <td>
                        <select className="form-select form-select-sm" value={l.reason} onChange={(e) => setLine(i, { reason: e.target.value })} aria-label="Reason">
                          {REASONS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="text-end">{money((Number(l.quantity) || 0) * (Number(l.unitCost) || 0))}</td>
                      <td className="text-end">
                        {lines.length > 1 && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} aria-label="Remove line"><i className="ti ti-x" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setLines((p) => [...p, emptyLine()])}><i className="ti ti-plus me-1" />Add item</button>
              <div className="d-flex align-items-center gap-3">
                <span className="fw-bold">Total credit Rs {money(total)}</span>
                <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-1" />}Save return
                </button>
              </div>
            </div>
            <p className="text-muted fs-12 mt-2 mb-0">Leave the credit blank to use each batch's purchase cost. The stock is removed now and the amount is credited to the supplier's ledger.</p>
          </div>
        </div>
      )}

      <ReportTable title="Purchase Returns" filename="purchase-returns" columns={columns} rows={rows} loading={loading}
        rowKey={(r) => r.id} empty="No returns in this period."
        toolbar={<DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />} />
    </>
  );
};

export default PurchaseReturns;
