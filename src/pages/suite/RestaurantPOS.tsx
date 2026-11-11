import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import Modal from '../../components/suite/Modal';
import { LocationSelect, statusBadge, useLocations } from '../../components/suite/Pickers';
import suite from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';
import { money } from '../../components/pharmacy/ReportTable';

type MenuItem = Awaited<ReturnType<typeof suite.menu>>[number];
type Table = Awaited<ReturnType<typeof suite.tables>>[number];
interface Chosen { id: number; name: string; price: number }
interface Line { key: string; dish: MenuItem; qty: number; mods: Chosen[]; note: string }
type OrderType = 'DineIn' | 'Takeaway' | 'Delivery';

/** Table service: pick a table, add dishes with modifiers, send to the kitchen, settle the table. */
const RestaurantPOS: React.FC = () => {
  const locations = useLocations();
  const [locationId, setLocationId] = useState<number | ''>('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [category, setCategory] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('DineIn');
  const [table, setTable] = useState<Table | null>(null);
  const [covers, setCovers] = useState(2);
  const [customer, setCustomer] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [pickMods, setPickMods] = useState<{ dish: MenuItem; chosen: Chosen[] } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!locationId && locations.length) setLocationId(locations.find((l) => l.isDefault)?.id ?? locations[0].id); }, [locations, locationId]);
  const loadTables = useCallback(async () => { if (locationId) setTables(await suite.tables(locationId)); }, [locationId]);
  useEffect(() => { suite.menu().then(setMenu).catch((err) => Swal.fire({ icon: 'error', title: 'Could not load the menu', text: apiError(err) })); }, []);
  useEffect(() => { void loadTables(); const t = window.setInterval(() => void loadTables(), 20000); return () => window.clearInterval(t); }, [loadTables]);

  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.category || 'Other'))), [menu]);
  const shown = menu.filter((m) => !category || (m.category || 'Other') === category);
  const lineTotal = (l: Line) => l.qty * (l.dish.price + l.mods.reduce((s, m) => s + m.price, 0));
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  const add = (dish: MenuItem) => {
    if (dish.modifierGroups.length > 0) { setPickMods({ dish, chosen: [] }); return; }
    pushLine(dish, []);
  };
  const pushLine = (dish: MenuItem, mods: Chosen[]) => {
    const key = `${dish.id}|${mods.map((m) => m.id).sort().join(',')}`;
    setLines((ls) => (ls.some((l) => l.key === key) ? ls.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { key, dish, qty: 1, mods, note: '' }]));
  };

  const confirmMods = () => {
    if (!pickMods) return;
    for (const g of pickMods.dish.modifierGroups) {
      const n = pickMods.chosen.filter((c) => g.modifiers.some((m) => m.id === c.id)).length;
      if (n < g.minSelect) { Swal.fire({ icon: 'info', title: `Choose at least ${g.minSelect} from ${g.name}` }); return; }
      if (n > g.maxSelect) { Swal.fire({ icon: 'info', title: `Choose at most ${g.maxSelect} from ${g.name}` }); return; }
    }
    pushLine(pickMods.dish, pickMods.chosen);
    setPickMods(null);
  };

  const send = async (payNow: 'Cash' | 'Card' | null) => {
    if (lines.length === 0) return;
    if (orderType === 'DineIn' && !table) { Swal.fire({ icon: 'info', title: 'Choose a table' }); return; }
    setBusy(true);
    try {
      const items = lines.map((l) => {
        const unit = l.dish.price + l.mods.reduce((s, m) => s + m.price, 0);
        return {
          productId: l.dish.id, productName: l.dish.productName + (l.mods.length ? ` (${l.mods.map((m) => m.name).join(', ')})` : ''),
          quantity: l.qty, unitQuantity: l.qty, saleUnit: 'Unit', purchasePrice: unit, unitCost: unit, totalCost: unit * l.qty, discount: 0, taxPercent: 0, taxAmount: 0,
          modifiersJson: JSON.stringify(l.mods.map((m) => ({ modifierId: m.id, name: m.name, price: m.price })).concat(l.note ? [{ modifierId: 0, name: l.note, price: 0 }] : [])),
        };
      });
      const res = await api.post('/sales', {
        customerName: customer || (orderType === 'DineIn' ? `Table ${table?.name}` : orderType), biller: 'Restaurant', grandTotal: total, orderTax: 0, discount: 0, shipping: 0,
        status: payNow ? 'Completed' : 'Pending', source: 'pos', paymentMethod: payNow ?? 'Cash', locationId: locationId || undefined,
        orderType, diningTableId: orderType === 'DineIn' ? table?.id : undefined, covers: orderType === 'DineIn' ? covers : undefined, items,
      });
      if (payNow) await api.post(`/sales/${res.data.id}/payments`, { reference: res.data.reference, receivedAmount: total, payingAmount: total, paymentType: payNow });
      Swal.fire({ icon: 'success', title: `Sent to kitchen · ${res.data.reference}`, timer: 1500, showConfirmButton: false });
      setLines([]);
      void loadTables();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not place the order', text: apiError(err) }); }
    finally { setBusy(false); }
  };

  const settle = async (t: Table) => {
    if (!t.openBills.length) {
      await suite.freeTable(t.id);
      void loadTables();
      return;
    }
    const { value, isConfirmed } = await Swal.fire({
      title: `Settle ${t.name}`, html: `${t.openBills.map((b) => `${b.reference}: Rs ${money(b.due)}`).join('<br/>')}<br/><b>Total Rs ${money(t.due)}</b>`,
      input: 'select', inputOptions: { Cash: 'Cash', Card: 'Card' }, inputValue: 'Cash', showCancelButton: true, confirmButtonText: 'Paid',
    });
    if (!isConfirmed) return;
    try {
      for (const b of t.openBills) await api.post(`/sales/${b.id}/payments`, { reference: b.reference, receivedAmount: b.due, payingAmount: b.due, paymentType: value });
      await suite.freeTable(t.id);
      setTable(null);
      void loadTables();
      Swal.fire({ icon: 'success', title: `${t.name} settled`, timer: 1200, showConfirmButton: false });
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not settle', text: apiError(err) }); }
  };

  return (
    <div className="p-3">
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <h4 className="mb-0 me-3">Restaurant</h4>
        <div style={{ width: 200 }}><LocationSelect locations={locations} value={locationId} onChange={setLocationId} ariaLabel="Outlet" /></div>
        <div className="btn-group">
          {(['DineIn', 'Takeaway', 'Delivery'] as OrderType[]).map((o) => (
            <button key={o} type="button" className={`btn btn-sm ${orderType === o ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setOrderType(o); if (o !== 'DineIn') setTable(null); }}>{o === 'DineIn' ? 'Dine in' : o}</button>
          ))}
        </div>
        <a href="/pos-kitchen" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary ms-auto"><i className="ti ti-chef-hat me-1" />Kitchen display</a>
        <a href="/dashboard" className="btn btn-sm btn-light">Exit</a>
      </div>
      <div className="row g-3">
        <div className="col-lg-7">
          {orderType === 'DineIn' && (
            <div className="card mb-3"><div className="card-body d-flex flex-wrap gap-2">
              {tables.length === 0 && <span className="text-muted">No tables. Add them in Restaurant Setup → Tables.</span>}
              {tables.map((t) => (
                <button key={t.id} type="button" onClick={() => setTable(t)}
                  className={`btn ${table?.id === t.id ? 'btn-primary' : t.status === 'Occupied' ? 'btn-outline-danger' : 'btn-outline-success'}`} style={{ width: 96 }}>
                  <div className="fw-bold">{t.name}</div><div className="fs-11">{t.status === 'Occupied' ? `Rs ${money(t.due)}` : `${t.seats} seats`}</div>
                </button>
              ))}
            </div></div>
          )}
          <div className="d-flex gap-1 flex-wrap mb-2">
            <button type="button" className={`btn btn-sm ${!category ? 'btn-dark' : 'btn-light'}`} onClick={() => setCategory('')}>All</button>
            {categories.map((c) => <button key={c} type="button" className={`btn btn-sm ${category === c ? 'btn-dark' : 'btn-light'}`} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
          <div className="row g-2">
            {shown.map((m) => (
              <div key={m.id} className="col-6 col-md-4 col-xl-3">
                <button type="button" className="btn btn-light w-100 text-start h-100 border" onClick={() => add(m)}>
                  <div className="fw-medium">{m.productName}</div><div className="text-primary fw-bold">Rs {money(m.price)}</div>
                </button>
              </div>
            ))}
            {menu.length === 0 && <p className="text-muted">No dishes on the menu yet.</p>}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <b>{orderType === 'DineIn' ? (table ? `Table ${table.name}` : 'Choose a table') : orderType}</b>
              {table && statusBadge(table.status)}
            </div>
            <div className="card-body">
              {orderType === 'DineIn' && table && (
                <div className="d-flex gap-2 align-items-center mb-2"><label className="mb-0 fs-13">Guests</label>
                  <input type="number" min={1} className="form-control form-control-sm" style={{ width: 80 }} value={covers} onChange={(e) => setCovers(Number(e.target.value))} aria-label="Guests" />
                  {table.status === 'Occupied' && <button type="button" className="btn btn-sm btn-success ms-auto" onClick={() => void settle(table)}>Settle table (Rs {money(table.due)})</button>}
                </div>
              )}
              {orderType !== 'DineIn' && <input className="form-control form-control-sm mb-2" placeholder="Customer name / phone" value={customer} onChange={(e) => setCustomer(e.target.value)} aria-label="Customer" />}
              {lines.length === 0 && <p className="text-muted mb-0">Tap dishes to add them.</p>}
              {lines.map((l, i) => (
                <div key={l.key} className="border-bottom py-2">
                  <div className="d-flex justify-content-between">
                    <div><b>{l.dish.productName}</b>{l.mods.length > 0 && <div className="fs-12 text-muted">{l.mods.map((m) => m.name).join(', ')}</div>}</div>
                    <span>Rs {money(lineTotal(l))}</span>
                  </div>
                  <div className="d-flex gap-2 align-items-center mt-1">
                    <div className="btn-group btn-group-sm">
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} aria-label="Less">−</button>
                      <span className="btn btn-light disabled">{l.qty}</span>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setLines(lines.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)))} aria-label="More">+</button>
                    </div>
                    <input className="form-control form-control-sm" placeholder="Note for kitchen" value={l.note} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} aria-label="Kitchen note" />
                    <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove"><i className="ti ti-x" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-footer">
              <div className="d-flex justify-content-between fs-18 fw-bold mb-2"><span>Total</span><span>Rs {money(total)}</span></div>
              <div className="d-flex gap-2">
                {orderType === 'DineIn'
                  ? <button type="button" className="btn btn-primary flex-fill" disabled={busy || !lines.length} onClick={() => void send(null)}><i className="ti ti-send me-1" />Send to kitchen</button>
                  : <>
                    <button type="button" className="btn btn-primary flex-fill" disabled={busy || !lines.length} onClick={() => void send('Cash')}>Cash · send</button>
                    <button type="button" className="btn btn-outline-primary flex-fill" disabled={busy || !lines.length} onClick={() => void send('Card')}>Card · send</button>
                  </>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal show={!!pickMods} title={pickMods?.dish.productName ?? ''} onClose={() => setPickMods(null)}
        footer={<><button type="button" className="btn btn-light" onClick={() => setPickMods(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={confirmMods}>Add</button></>}>
        {pickMods?.dish.modifierGroups.map((g) => (
          <div key={g.id} className="mb-3">
            <div className="fw-medium mb-1">{g.name} <span className="text-muted fs-12">({g.minSelect ? `pick ${g.minSelect}–${g.maxSelect}` : `up to ${g.maxSelect}`})</span></div>
            <div className="d-flex flex-wrap gap-2">
              {g.modifiers.map((m) => {
                const on = pickMods.chosen.some((c) => c.id === m.id);
                return <button key={m.id} type="button" className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setPickMods({ ...pickMods, chosen: on ? pickMods.chosen.filter((c) => c.id !== m.id) : [...pickMods.chosen, { id: m.id, name: m.name, price: m.price }] })}>
                  {m.name}{m.price ? ` +${m.price}` : ''}</button>;
              })}
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default RestaurantPOS;
