import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/suite/Modal';
import ReportTable, { money } from '../../components/pharmacy/ReportTable';
import { LocationSelect, ProductSearch, statusBadge, useLocations } from '../../components/suite/Pickers';
import suite from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

type Tab = 'orders' | 'recipes' | 'centres' | 'yield';
interface BomForm {
  id?: number; name: string; finishedProductId?: number; finishedProduct?: string; outputQuantity: number; laborCost: number; overheadCost: number;
  shelfLifeDays?: number | null; expectedYieldPct: number; notes?: string; status: string;
  items: { rawMaterialId: number; rawMaterial: string; quantity: number }[];
  operations: { workCentreId: number; description?: string; plannedMinutes?: number | null }[];
}
const blankBom: BomForm = { name: '', outputQuantity: 1, laborCost: 0, overheadCost: 0, expectedYieldPct: 100, status: 'active', items: [], operations: [] };

/** Recipes (bills of materials), production orders, work centres and yield. */
const Manufacturing: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'orders';
  const locations = useLocations();
  const [orders, setOrders] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [centres, setCentres] = useState<{ id: number; name: string; costPerHour: number }[]>([]);
  const [yieldRows, setYieldRows] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [bomForm, setBomForm] = useState<BomForm | null>(null);
  const [newOrder, setNewOrder] = useState<{ bomId?: number; quantity: number; locationId: number | ''; outputLocationId: number | ''; outputBatchNo: string; outputExpiryDate: string } | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [complete, setComplete] = useState<{ actualOutputQty: number; scrapQty: number; outputBatchNo: string; outputExpiryDate: string; items: Record<number, { consumedQty?: number; wastageQty: number }> } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      if (tab === 'orders') setOrders(await suite.orders(statusFilter || undefined));
      if (tab === 'recipes' || tab === 'orders') setBoms(await suite.boms());
      if (tab === 'centres' || tab === 'recipes') setCentres(await suite.workCentres());
      if (tab === 'yield') setYieldRows((await suite.yieldReport()).rows);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
  }, [tab, statusFilter]);
  useEffect(() => { void load(); }, [load]);

  const go = (t: Tab) => setParams({ tab: t });

  const openBom = async (id?: number) => {
    if (!id) { setBomForm({ ...blankBom }); return; }
    const b = await suite.bom(id);
    setBomForm({
      id: b.id, name: b.name, finishedProductId: b.finishedProductId, finishedProduct: b.finishedProduct, outputQuantity: b.outputQuantity,
      laborCost: b.laborCost, overheadCost: b.overheadCost, shelfLifeDays: b.shelfLifeDays, expectedYieldPct: b.expectedYieldPct, notes: b.notes, status: b.status,
      items: b.items.map((i: any) => ({ rawMaterialId: i.rawMaterialId, rawMaterial: i.rawMaterial, quantity: i.quantity })),
      operations: b.operations.map((o: any) => ({ workCentreId: o.workCentreId, description: o.description, plannedMinutes: o.plannedMinutes })),
    });
  };

  const saveBom = async () => {
    if (!bomForm) return;
    setBusy(true);
    try {
      await suite.saveBom(bomForm.id ?? null, bomForm);
      setBomForm(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save the recipe', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const createOrder = async () => {
    if (!newOrder?.bomId) { Swal.fire({ icon: 'info', title: 'Choose a recipe' }); return; }
    setBusy(true);
    try {
      const r = await suite.createOrder({ bomId: newOrder.bomId, quantity: newOrder.quantity, locationId: newOrder.locationId || undefined,
        outputLocationId: newOrder.outputLocationId || undefined, outputBatchNo: newOrder.outputBatchNo || undefined, outputExpiryDate: newOrder.outputExpiryDate || undefined });
      setNewOrder(null);
      await load();
      setDetail(await suite.order(r.id));
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not create the order', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const refreshDetail = async (id: number) => { setDetail(await suite.order(id)); void load(); };

  const doAction = async (fn: () => Promise<unknown>, id: number) => {
    try { await fn(); await refreshDetail(id); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not update', text: apiError(err) }); }
  };

  const openComplete = () => {
    if (!detail) return;
    setComplete({ actualOutputQty: detail.quantity, scrapQty: 0, outputBatchNo: detail.outputBatchNo ?? '', outputExpiryDate: detail.outputExpiryDate ?? '',
      items: Object.fromEntries(detail.items.map((i: any) => [i.id, { consumedQty: i.requiredQuantity, wastageQty: 0 }])) });
  };

  const finish = async () => {
    if (!detail || !complete) return;
    setBusy(true);
    try {
      const r = await suite.completeOrder(detail.id, {
        actualOutputQty: complete.actualOutputQty, scrapQty: complete.scrapQty, outputBatchNo: complete.outputBatchNo || undefined, outputExpiryDate: complete.outputExpiryDate || undefined,
        items: Object.entries(complete.items).map(([id, v]) => ({ itemId: Number(id), consumedQty: v.consumedQty, wastageQty: v.wastageQty })),
      });
      Swal.fire({ icon: 'success', title: 'Production completed', html: `Batch <b>${r.outputBatchNo}</b> added to stock.<br/>Total cost Rs ${money(r.totalCost)} · Rs ${r.unitCost.toFixed(2)} per unit` });
      setComplete(null);
      await refreshDetail(detail.id);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not complete', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const editCentre = async (c?: { id: number; name: string; costPerHour: number }) => {
    const { value, isConfirmed } = await Swal.fire({
      title: c ? 'Edit work centre' : 'New work centre',
      html: `<input id="wc-n" class="form-control mb-2" placeholder="Name, e.g. Mixing" value="${c?.name ?? ''}"><input id="wc-c" type="number" min="0" class="form-control" placeholder="Cost per hour (Rs)" value="${c?.costPerHour ?? ''}">`,
      showCancelButton: true,
      preConfirm: () => ({ name: (document.getElementById('wc-n') as HTMLInputElement).value, costPerHour: Number((document.getElementById('wc-c') as HTMLInputElement).value) || 0 }),
    });
    if (!isConfirmed || !value?.name) return;
    try { await suite.saveWorkCentre(c?.id ?? null, value); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  return (
    <>
      <PageHeader title="Manufacturing" subtitle="Recipes, production orders and yield. Materials are used earliest expiry first; output gets its own batch and cost."
        breadcrumbs={[{ title: 'Manufacturing' }]}
        actions={<div className="d-flex gap-2">
          {tab === 'orders' && <button type="button" className="btn btn-primary" onClick={() => setNewOrder({ quantity: 1, locationId: '', outputLocationId: '', outputBatchNo: '', outputExpiryDate: '' })}><i className="ti ti-plus me-1" />New production order</button>}
          {tab === 'recipes' && <button type="button" className="btn btn-primary" onClick={() => void openBom()}><i className="ti ti-plus me-1" />New recipe</button>}
          {tab === 'centres' && <button type="button" className="btn btn-primary" onClick={() => void editCentre()}><i className="ti ti-plus me-1" />New work centre</button>}
        </div>} />
      <ul className="nav nav-tabs mb-3">
        {([['orders', 'Production orders'], ['recipes', 'Recipes (BOM)'], ['centres', 'Work centres'], ['yield', 'Yield report']] as [Tab, string][]).map(([k, l]) => (
          <li className="nav-item" key={k}><button type="button" className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => go(k)}>{l}</button></li>
        ))}
      </ul>

      {tab === 'orders' && (
        <div className="card">
          <div className="card-header"><select className="form-select form-select-sm" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
            <option value="">All orders</option><option value="Draft">Draft</option><option value="InProgress">In progress</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select></div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead><tr><th>Order</th><th>Recipe</th><th>Product</th><th className="text-end">Planned</th><th className="text-end">Made</th><th>Status</th><th className="text-end">Cost / unit</th><th /></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">No production orders.</td></tr>}
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-medium">{o.reference}<div className="text-muted fs-12">{o.location}</div></td>
                    <td>{o.bom}</td><td>{o.finishedProduct}</td><td className="text-end">{o.quantity}</td>
                    <td className="text-end">{o.actualOutputQty ?? ''}{o.yieldPct != null && <div className="text-muted fs-12">{o.yieldPct}%</div>}</td>
                    <td>{statusBadge(o.status)}{o.items.some((i: any) => i.shortBy > 0) && o.status !== 'Completed' && <div className="text-danger fs-12">materials short</div>}</td>
                    <td className="text-end">{o.unitCost != null ? o.unitCost.toFixed(2) : ''}</td>
                    <td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setDetail(o)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead><tr><th>Recipe</th><th>Makes</th><th className="text-end">Batch size</th><th className="text-end">Est. cost / unit</th><th className="text-end">Price</th><th className="text-end">Margin</th><th>Status</th><th /></tr></thead>
              <tbody>
                {boms.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-4">No recipes yet.</td></tr>}
                {boms.map((b) => (
                  <tr key={b.id}>
                    <td className="fw-medium">{b.name}<div className="text-muted fs-12">v{b.version} · {b.items.length} materials</div></td>
                    <td>{b.finishedProduct}</td><td className="text-end">{b.outputQuantity}</td>
                    <td className="text-end">{b.estimatedUnitCost.toFixed(2)}</td><td className="text-end">{b.sellingPrice ?? ''}</td>
                    <td className="text-end">{b.estimatedMarginPct != null ? `${b.estimatedMarginPct}%` : ''}</td>
                    <td>{b.status === 'active' ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}</td>
                    <td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void openBom(b.id)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'centres' && (
        <div className="card"><div className="card-body p-0">
          <table className="table mb-0"><thead><tr><th>Work centre</th><th className="text-end">Cost per hour (Rs)</th><th /></tr></thead>
            <tbody>
              {centres.length === 0 && <tr><td colSpan={3} className="text-muted text-center py-4">Add the stages your products go through, e.g. Mixing, Filling, Packing.</td></tr>}
              {centres.map((c) => <tr key={c.id}><td>{c.name}</td><td className="text-end">{c.costPerHour}</td>
                <td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => void editCentre(c)} aria-label="Edit"><i className="ti ti-edit" /></button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={async () => { try { await suite.deleteWorkCentre(c.id); void load(); } catch (err) { Swal.fire({ icon: 'error', title: 'Could not delete', text: apiError(err) }); } }} aria-label="Delete"><i className="ti ti-trash" /></button></td></tr>)}
            </tbody></table>
        </div></div>
      )}

      {tab === 'yield' && (
        <ReportTable title="Production yield" filename="production-yield" rows={yieldRows}
          columns={[
            { key: 'reference', label: 'Order' }, { key: 'recipe', label: 'Recipe' }, { key: 'completed', label: 'Completed' },
            { key: 'quantity', label: 'Planned', align: 'end', total: true }, { key: 'actual', label: 'Made', align: 'end', total: true },
            { key: 'scrapQty', label: 'Scrap', align: 'end', total: true },
            { key: 'yieldPct', label: 'Yield %', align: 'end', render: (r: any) => <span className={r.yieldPct < r.expectedYieldPct ? 'text-danger fw-bold' : ''}>{r.yieldPct}%</span> },
            { key: 'expectedYieldPct', label: 'Expected %', align: 'end' },
            { key: 'wastageUnits', label: 'Material wastage', align: 'end', total: true },
            { key: 'totalCost', label: 'Total cost (Rs)', align: 'end', money: true, total: true },
            { key: 'unitCost', label: 'Cost / unit', align: 'end', value: (r: any) => Number(r.unitCost).toFixed(2) },
          ]} />
      )}

      {/* Recipe editor */}
      <Modal show={!!bomForm} title={bomForm?.id ? `Edit ${bomForm.name}` : 'New recipe'} onClose={() => setBomForm(null)} size="xl"
        footer={<>
          {bomForm?.id && <button type="button" className="btn btn-outline-danger me-auto" onClick={async () => { await suite.deleteBom(bomForm.id!); setBomForm(null); void load(); }}>Delete</button>}
          <button type="button" className="btn btn-light" onClick={() => setBomForm(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveBom()}>Save recipe</button></>}>
        {bomForm && (
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label">Recipe name</label><input className="form-control" value={bomForm.name} onChange={(e) => setBomForm({ ...bomForm, name: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Finished product</label>
              {bomForm.finishedProductId
                ? <div className="input-group"><span className="form-control">{bomForm.finishedProduct}</span><button type="button" className="btn btn-outline-secondary" onClick={() => setBomForm({ ...bomForm, finishedProductId: undefined, finishedProduct: undefined })} aria-label="Change"><i className="ti ti-x" /></button></div>
                : <ProductSearch onPick={(p) => setBomForm({ ...bomForm, finishedProductId: p.id, finishedProduct: p.productName, name: bomForm.name || p.productName })} />}</div>
            <div className="col-md-3"><label className="form-label">Units per batch</label><input type="number" min={1} className="form-control" value={bomForm.outputQuantity} onChange={(e) => setBomForm({ ...bomForm, outputQuantity: Number(e.target.value) })} /></div>
            <div className="col-md-3"><label className="form-label">Labour per batch (Rs)</label><input type="number" min={0} className="form-control" value={bomForm.laborCost} onChange={(e) => setBomForm({ ...bomForm, laborCost: Number(e.target.value) })} /></div>
            <div className="col-md-3"><label className="form-label">Overhead per batch (Rs)</label><input type="number" min={0} className="form-control" value={bomForm.overheadCost} onChange={(e) => setBomForm({ ...bomForm, overheadCost: Number(e.target.value) })} /></div>
            <div className="col-md-3"><label className="form-label">Shelf life (days)</label><input type="number" min={0} className="form-control" value={bomForm.shelfLifeDays ?? ''} onChange={(e) => setBomForm({ ...bomForm, shelfLifeDays: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="col-md-3"><label className="form-label">Expected yield %</label><input type="number" min={1} max={100} className="form-control" value={bomForm.expectedYieldPct} onChange={(e) => setBomForm({ ...bomForm, expectedYieldPct: Number(e.target.value) })} /></div>
            <div className="col-md-3"><label className="form-label">Status</label><select className="form-select" value={bomForm.status} onChange={(e) => setBomForm({ ...bomForm, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div className="col-12">
              <h6 className="mt-2">Raw materials (per batch, in single units)</h6>
              <ProductSearch onPick={(p) => !bomForm.items.some((i) => i.rawMaterialId === p.id) && setBomForm({ ...bomForm, items: [...bomForm.items, { rawMaterialId: p.id, rawMaterial: p.productName, quantity: 1 }] })} placeholder="Add raw material" />
              <table className="table table-sm mt-2 align-middle"><tbody>
                {bomForm.items.map((i, n) => (
                  <tr key={i.rawMaterialId}><td>{i.rawMaterial}</td>
                    <td style={{ width: 140 }}><input type="number" min={0} step="0.001" className="form-control form-control-sm" value={i.quantity} aria-label={`Quantity of ${i.rawMaterial}`}
                      onChange={(e) => setBomForm({ ...bomForm, items: bomForm.items.map((x, j) => (j === n ? { ...x, quantity: Number(e.target.value) } : x)) })} /></td>
                    <td style={{ width: 40 }}><button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setBomForm({ ...bomForm, items: bomForm.items.filter((_, j) => j !== n) })} aria-label="Remove"><i className="ti ti-x" /></button></td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="col-12">
              <h6>Stages</h6>
              {bomForm.operations.map((o, n) => (
                <div key={n} className="d-flex gap-2 mb-2">
                  <span className="pt-2">{n + 1}.</span>
                  <select className="form-select form-select-sm" style={{ width: 200 }} value={o.workCentreId} aria-label="Work centre" onChange={(e) => setBomForm({ ...bomForm, operations: bomForm.operations.map((x, j) => (j === n ? { ...x, workCentreId: Number(e.target.value) } : x)) })}>
                    {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <input className="form-control form-control-sm" placeholder="What happens here" value={o.description ?? ''} onChange={(e) => setBomForm({ ...bomForm, operations: bomForm.operations.map((x, j) => (j === n ? { ...x, description: e.target.value } : x)) })} aria-label="Description" />
                  <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setBomForm({ ...bomForm, operations: bomForm.operations.filter((_, j) => j !== n) })} aria-label="Remove stage"><i className="ti ti-x" /></button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline-primary" disabled={centres.length === 0} onClick={() => setBomForm({ ...bomForm, operations: [...bomForm.operations, { workCentreId: centres[0].id }] })}>Add stage</button>
              {centres.length === 0 && <span className="text-muted fs-12 ms-2">Create work centres first to add stages.</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* New order */}
      <Modal show={!!newOrder} title="New production order" onClose={() => setNewOrder(null)}
        footer={<><button type="button" className="btn btn-light" onClick={() => setNewOrder(null)}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void createOrder()}>Create</button></>}>
        {newOrder && (
          <div className="row g-2">
            <div className="col-12"><label className="form-label">Recipe</label>
              <select className="form-select" value={newOrder.bomId ?? ''} onChange={(e) => setNewOrder({ ...newOrder, bomId: Number(e.target.value) || undefined })}>
                <option value="">Choose…</option>{boms.filter((b) => b.status === 'active').map((b) => <option key={b.id} value={b.id}>{b.name} → {b.finishedProduct}</option>)}</select></div>
            <div className="col-6"><label className="form-label">Units to make</label><input type="number" min={1} className="form-control" value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })} /></div>
            <div className="col-6"><label className="form-label">Output batch no.</label><input className="form-control" placeholder="Order number" value={newOrder.outputBatchNo} onChange={(e) => setNewOrder({ ...newOrder, outputBatchNo: e.target.value })} /></div>
            <div className="col-6"><label className="form-label">Made at</label><LocationSelect locations={locations} value={newOrder.locationId} onChange={(v) => setNewOrder({ ...newOrder, locationId: v })} allowAll="My location" /></div>
            <div className="col-6"><label className="form-label">Deliver to</label><LocationSelect locations={locations} value={newOrder.outputLocationId} onChange={(v) => setNewOrder({ ...newOrder, outputLocationId: v })} allowAll="Same place" /></div>
            <div className="col-6"><label className="form-label">Expiry of output</label><input type="date" className="form-control" value={newOrder.outputExpiryDate} onChange={(e) => setNewOrder({ ...newOrder, outputExpiryDate: e.target.value })} /><div className="form-text">Empty = from recipe shelf life.</div></div>
          </div>
        )}
      </Modal>

      {/* Order detail */}
      <Modal show={!!detail && !complete} title={detail ? `${detail.reference} · ${detail.finishedProduct}` : ''} onClose={() => setDetail(null)} size="xl"
        footer={detail && <>
          {detail.status !== 'Cancelled' && <button type="button" className="btn btn-outline-danger me-auto" onClick={async () => { const ok = await Swal.fire({ icon: 'warning', title: detail.status === 'Completed' ? 'Reverse this production?' : 'Cancel this order?', text: detail.status === 'Completed' ? 'Materials go back to stock and the output is removed (it must still be in stock).' : undefined, showCancelButton: true }); if (ok.isConfirmed) void doAction(() => suite.cancelOrder(detail.id), detail.id); }}>{detail.status === 'Completed' ? 'Reverse' : 'Cancel order'}</button>}
          {detail.status === 'Draft' && <button type="button" className="btn btn-outline-primary" onClick={() => void doAction(() => suite.startOrder(detail.id), detail.id)}>Start</button>}
          {(detail.status === 'Draft' || detail.status === 'InProgress') && <>
            <button type="button" className="btn btn-outline-secondary" onClick={async () => { try { const r = await suite.requestMaterials(detail.id); Swal.fire({ icon: 'info', title: r.reference ? `Requested as ${r.reference}` : 'Nothing to request', text: r.message }); } catch (err) { Swal.fire({ icon: 'error', title: 'Could not request', text: apiError(err) }); } }}>Request short materials</button>
            <button type="button" className="btn btn-success" onClick={openComplete}>Complete</button></>}
        </>}>
        {detail && (
          <>
            <div className="d-flex flex-wrap gap-4 mb-3 fs-13">
              <span>Status {statusBadge(detail.status)}</span><span>Planned <b>{detail.quantity}</b></span>
              {detail.actualOutputQty != null && <span>Made <b>{detail.actualOutputQty}</b> ({detail.yieldPct}%) · scrap {detail.scrapQty}</span>}
              <span>At {detail.location}</span><span>Batch {detail.outputBatchNo}{detail.outputExpiryDate && ` · exp ${detail.outputExpiryDate}`}</span>
              {detail.totalCost > 0 && <span>Cost Rs {money(detail.totalCost)}{detail.unitCost != null && ` · ${detail.unitCost.toFixed(2)}/unit`}</span>}
            </div>
            <h6>Materials</h6>
            <table className="table table-sm"><thead><tr><th>Material</th><th className="text-end">Needed</th><th className="text-end">Available here</th><th className="text-end">Used</th><th className="text-end">Wastage</th><th className="text-end">Cost (Rs)</th></tr></thead>
              <tbody>{detail.items.map((i: any) => <tr key={i.id} className={i.shortBy > 0 ? 'table-danger' : ''}><td>{i.rawMaterial}</td><td className="text-end">{i.requiredQuantity}</td><td className="text-end">{i.available ?? ''}</td><td className="text-end">{i.consumedQuantity || ''}</td><td className="text-end">{i.wastageQty || ''}</td><td className="text-end">{i.totalCost ? money(i.totalCost) : ''}</td></tr>)}</tbody></table>
            {detail.operations.length > 0 && <>
              <h6>Stages</h6>
              <table className="table table-sm"><tbody>{detail.operations.map((o: any) => (
                <tr key={o.id}><td>{o.sequence}. {o.workCentre}<div className="text-muted fs-12">{o.description}</div></td><td>{statusBadge(o.status)}</td><td className="fs-12">{o.operator}<div className="text-muted">{o.startedAt}{o.completedAt && ` → ${o.completedAt}`}</div></td>
                  <td className="text-end">{detail.status !== 'Completed' && detail.status !== 'Cancelled' && <>
                    {o.status === 'Pending' && <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void doAction(() => suite.stepOrder(detail.id, o.id, 'start'), detail.id)}>Start</button>}
                    {o.status !== 'Done' && <button type="button" className="btn btn-sm btn-outline-success ms-1" onClick={() => void doAction(() => suite.stepOrder(detail.id, o.id, 'finish'), detail.id)}>Done</button>}</>}</td></tr>
              ))}</tbody></table></>}
          </>
        )}
      </Modal>

      {/* Complete */}
      <Modal show={!!complete} title="Complete production" onClose={() => setComplete(null)} size="lg"
        footer={<><button type="button" className="btn btn-light" onClick={() => setComplete(null)}>Back</button><button type="button" className="btn btn-success" disabled={busy} onClick={() => void finish()}>Complete and add to stock</button></>}>
        {complete && detail && (
          <div className="row g-2">
            <div className="col-md-3"><label className="form-label">Good units made</label><input type="number" min={0} className="form-control" value={complete.actualOutputQty} onChange={(e) => setComplete({ ...complete, actualOutputQty: Number(e.target.value) })} /></div>
            <div className="col-md-3"><label className="form-label">Scrapped units</label><input type="number" min={0} className="form-control" value={complete.scrapQty} onChange={(e) => setComplete({ ...complete, scrapQty: Number(e.target.value) })} /></div>
            <div className="col-md-3"><label className="form-label">Batch no.</label><input className="form-control" value={complete.outputBatchNo} onChange={(e) => setComplete({ ...complete, outputBatchNo: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label">Expiry</label><input type="date" className="form-control" value={complete.outputExpiryDate} onChange={(e) => setComplete({ ...complete, outputExpiryDate: e.target.value })} /></div>
            <div className="col-12">
              <table className="table table-sm mt-2 align-middle"><thead><tr><th>Material</th><th className="text-end">Planned</th><th style={{ width: 130 }}>Used</th><th style={{ width: 130 }}>Wasted</th></tr></thead>
                <tbody>{detail.items.map((i: any) => (
                  <tr key={i.id}><td>{i.rawMaterial}</td><td className="text-end">{i.requiredQuantity}</td>
                    <td><input type="number" min={0} className="form-control form-control-sm" value={complete.items[i.id]?.consumedQty ?? ''} aria-label={`Used ${i.rawMaterial}`}
                      onChange={(e) => setComplete({ ...complete, items: { ...complete.items, [i.id]: { ...complete.items[i.id], consumedQty: Number(e.target.value) } } })} /></td>
                    <td><input type="number" min={0} className="form-control form-control-sm" value={complete.items[i.id]?.wastageQty ?? 0} aria-label={`Wasted ${i.rawMaterial}`}
                      onChange={(e) => setComplete({ ...complete, items: { ...complete.items, [i.id]: { ...complete.items[i.id], wastageQty: Number(e.target.value) } } })} /></td></tr>
                ))}</tbody></table>
              <p className="text-muted fs-12 mb-0">Materials are taken earliest expiry first at {detail.location}. Unit cost = actual material cost + labour + overhead, divided by good units.</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default Manufacturing;
