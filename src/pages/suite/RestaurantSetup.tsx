import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/suite/Modal';
import ReportTable from '../../components/pharmacy/ReportTable';
import { LocationSelect, ProductSearch, statusBadge, useLocations } from '../../components/suite/Pickers';
import suite from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

type Tab = 'menu' | 'modifiers' | 'tables' | 'stations' | 'cost';
type Menu = Awaited<ReturnType<typeof suite.menu>>;
type Groups = Awaited<ReturnType<typeof suite.modifierGroups>>;
interface RecipeForm { productId: number; productName: string; price: number; yieldQty: number; notes?: string; kitchenStationId: number | ''; groupIds: number[];
  items: { ingredientId: number; ingredient: string; quantity: number; unit: string; wastagePct: number; unitCost?: number }[] }

/** Menu items and their recipes, modifiers, tables, kitchen stations and food cost. */
const RestaurantSetup: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'menu';
  const locations = useLocations();
  const [locationId, setLocationId] = useState<number | ''>('');
  const [menu, setMenu] = useState<Menu>([]);
  const [groups, setGroups] = useState<Groups>([]);
  const [tables, setTables] = useState<Awaited<ReturnType<typeof suite.tables>>>([]);
  const [stations, setStations] = useState<Awaited<ReturnType<typeof suite.stations>>>([]);
  const [cost, setCost] = useState<Awaited<ReturnType<typeof suite.foodCost>>>([]);
  const [recipe, setRecipe] = useState<RecipeForm | null>(null);
  const [group, setGroup] = useState<{ id?: number; name: string; minSelect: number; maxSelect: number; modifiers: { name: string; price: number; ingredientId?: number | null; ingredient?: string; ingredientQty?: number | null }[] } | null>(null);

  useEffect(() => { if (!locationId && locations.length) setLocationId(locations.find((l) => l.isDefault)?.id ?? locations[0].id); }, [locations, locationId]);

  const load = useCallback(async () => {
    try {
      const [m, g, s] = await Promise.all([suite.menu(), suite.modifierGroups(), suite.stations(locationId || undefined)]);
      setMenu(m); setGroups(g); setStations(s);
      if (tab === 'tables' && locationId) setTables(await suite.tables(locationId));
      if (tab === 'cost') setCost(await suite.foodCost());
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
  }, [tab, locationId]);
  useEffect(() => { void load(); }, [load]);

  const openRecipe = async (productId: number, productName: string, price: number) => {
    const r = await suite.recipe(productId);
    setRecipe({
      productId, productName, price, yieldQty: r.yieldQty ?? 1, notes: r.notes ?? '', kitchenStationId: r.product?.kitchenStationId ?? '', groupIds: r.modifierGroupIds ?? [],
      items: (r.items ?? []).map((i: any) => ({ ingredientId: i.ingredientId, ingredient: i.ingredient, quantity: i.quantity, unit: i.unit, wastagePct: i.wastagePct, unitCost: i.unitCost })),
    });
  };

  const saveRecipe = async () => {
    if (!recipe) return;
    try {
      const r = await suite.saveRecipe(recipe.productId, { yieldQty: recipe.yieldQty, notes: recipe.notes, kitchenStationId: recipe.kitchenStationId || null,
        items: recipe.items.map(({ ingredientId, quantity, unit, wastagePct }) => ({ ingredientId, quantity, unit, wastagePct })) });
      await suite.setDishModifiers(recipe.productId, recipe.groupIds);
      Swal.fire({ icon: 'success', title: 'Recipe saved', text: `Food cost per portion: Rs ${r.plateCost.toFixed(2)}`, timer: 1800, showConfirmButton: false });
      setRecipe(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  const saveGroup = async () => {
    if (!group) return;
    try {
      await suite.saveModifierGroup(group.id ?? null, { name: group.name, minSelect: group.minSelect, maxSelect: group.maxSelect,
        modifiers: group.modifiers.map(({ name, price, ingredientId, ingredientQty }) => ({ name, price, ingredientId, ingredientQty })) });
      setGroup(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  const editSimple = async (kind: 'table' | 'station', row?: any) => {
    const { value, isConfirmed } = await Swal.fire({
      title: row ? `Edit ${row.name}` : kind === 'table' ? 'New table' : 'New kitchen station',
      html: kind === 'table'
        ? `<input id="s-n" class="form-control mb-2" placeholder="Table name, e.g. T1" value="${row?.name ?? ''}"><input id="s-x" type="number" min="1" class="form-control" placeholder="Seats" value="${row?.seats ?? 4}">`
        : `<input id="s-n" class="form-control mb-2" placeholder="Station, e.g. Grill" value="${row?.name ?? ''}"><input id="s-x" class="form-control" placeholder="Printer name (optional)" value="${row?.printerName ?? ''}">`,
      showCancelButton: true,
      preConfirm: () => ({ name: (document.getElementById('s-n') as HTMLInputElement).value, x: (document.getElementById('s-x') as HTMLInputElement).value }),
    });
    if (!isConfirmed || !value?.name) return;
    try {
      if (kind === 'table') await suite.saveTable(row?.id ?? null, { name: value.name, seats: Number(value.x) || 4, locationId: locationId || undefined, status: row?.status });
      else await suite.saveStation(row?.id ?? null, { name: value.name, printerName: value.x, locationId: locationId || undefined });
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  const plate = recipe ? recipe.items.reduce((s, i) => s + i.quantity * (1 + i.wastagePct / 100) * (i.unitCost ?? 0), 0) / Math.max(recipe.yieldQty, 0.001) : 0;

  return (
    <>
      <PageHeader title="Restaurant Setup" subtitle="Menu items and recipes, modifiers, tables and kitchen stations." breadcrumbs={[{ title: 'Restaurant' }, { title: 'Setup' }]}
        actions={<div style={{ width: 220 }}><LocationSelect locations={locations} value={locationId} onChange={setLocationId} ariaLabel="Outlet" /></div>} />
      <ul className="nav nav-tabs mb-3">
        {([['menu', 'Menu & recipes'], ['modifiers', 'Modifiers'], ['tables', 'Tables'], ['stations', 'Kitchen stations'], ['cost', 'Food cost']] as [Tab, string][]).map(([k, l]) => (
          <li className="nav-item" key={k}><button type="button" className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => setParams({ tab: k })}>{l}</button></li>
        ))}
      </ul>

      {tab === 'menu' && (
        <div className="card">
          <div className="card-header"><ProductSearch onPick={(p) => void openRecipe(p.id, p.productName, p.price)} placeholder="Pick a product to make it a dish and set its recipe" /></div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead><tr><th>Dish</th><th>Category</th><th>Station</th><th className="text-end">Price</th><th className="text-end">Food cost</th><th className="text-end">Cost %</th><th>Modifiers</th><th /></tr></thead>
              <tbody>
                {menu.length === 0 && <tr><td colSpan={8} className="text-muted text-center py-4">No dishes yet. Create the dish as a product (no stock), then pick it above to add its recipe.</td></tr>}
                {menu.map((m) => (
                  <tr key={m.id}>
                    <td className="fw-medium">{m.productName}</td><td>{m.category}</td><td>{stations.find((s) => s.id === m.kitchenStationId)?.name ?? ''}</td>
                    <td className="text-end">{m.price}</td><td className="text-end">{m.plateCost.toFixed(2)}</td>
                    <td className={`text-end ${m.foodCostPct != null && m.foodCostPct > 35 ? 'text-danger fw-bold' : ''}`}>{m.foodCostPct != null ? `${m.foodCostPct}%` : ''}</td>
                    <td className="fs-12">{m.modifierGroups.map((g) => g.name).join(', ')}</td>
                    <td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void openRecipe(m.id, m.productName, m.price)}>Recipe</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'modifiers' && (
        <div className="card">
          <div className="card-header"><button type="button" className="btn btn-sm btn-primary" onClick={() => setGroup({ name: '', minSelect: 0, maxSelect: 1, modifiers: [{ name: '', price: 0 }] })}><i className="ti ti-plus me-1" />New group</button></div>
          <div className="card-body p-0"><table className="table mb-0 align-middle"><thead><tr><th>Group</th><th>Choose</th><th>Options</th><th /></tr></thead>
            <tbody>{groups.map((g) => (
              <tr key={g.id}><td className="fw-medium">{g.name}</td><td>{g.minSelect}–{g.maxSelect}</td><td className="fs-13">{g.modifiers.map((m) => `${m.name}${m.price ? ` (+${m.price})` : ''}`).join(', ')}</td>
                <td className="text-end text-nowrap"><button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => setGroup({ ...g, modifiers: g.modifiers.map((m) => ({ ...m })) })} aria-label="Edit"><i className="ti ti-edit" /></button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={async () => { await suite.deleteModifierGroup(g.id); void load(); }} aria-label="Delete"><i className="ti ti-trash" /></button></td></tr>
            ))}</tbody></table></div>
        </div>
      )}

      {tab === 'tables' && (
        <div className="card">
          <div className="card-header"><button type="button" className="btn btn-sm btn-primary" onClick={() => void editSimple('table')}><i className="ti ti-plus me-1" />Add table</button></div>
          <div className="card-body d-flex flex-wrap gap-3">
            {tables.length === 0 && <span className="text-muted">No tables at this outlet.</span>}
            {tables.map((t) => (
              <div key={t.id} className="border rounded p-3 text-center" style={{ width: 140 }}>
                <div className="fw-bold fs-18">{t.name}</div><div className="text-muted fs-12 mb-1">{t.seats} seats</div>{statusBadge(t.status)}
                <div className="mt-2 d-flex gap-1 justify-content-center">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void editSimple('table', t)} aria-label="Edit"><i className="ti ti-edit" /></button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={async () => { await suite.deleteTable(t.id); void load(); }} aria-label="Delete"><i className="ti ti-trash" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'stations' && (
        <div className="card">
          <div className="card-header"><button type="button" className="btn btn-sm btn-primary" onClick={() => void editSimple('station')}><i className="ti ti-plus me-1" />Add station</button></div>
          <div className="card-body p-0"><table className="table mb-0"><thead><tr><th>Station</th><th>Printer</th><th>Dishes</th><th /></tr></thead>
            <tbody>{stations.map((s) => (
              <tr key={s.id}><td className="fw-medium">{s.name}</td><td>{s.printerName}</td><td>{menu.filter((m) => m.kitchenStationId === s.id).length}</td>
                <td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => void editSimple('station', s)} aria-label="Edit"><i className="ti ti-edit" /></button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={async () => { try { await suite.deleteStation(s.id); void load(); } catch (err) { Swal.fire({ icon: 'error', title: 'Could not delete', text: apiError(err) }); } }} aria-label="Delete"><i className="ti ti-trash" /></button></td></tr>
            ))}</tbody></table></div>
        </div>
      )}

      {tab === 'cost' && (
        <ReportTable title="Food cost" filename="food-cost" rows={cost}
          rowClassName={(r) => (r.foodCostPct > 35 ? 'table-warning' : '')}
          columns={[
            { key: 'productName', label: 'Dish' }, { key: 'category', label: 'Category' },
            { key: 'price', label: 'Price (Rs)', align: 'end' }, { key: 'plateCost', label: 'Food cost (Rs)', align: 'end', value: (r) => r.plateCost.toFixed(2) },
            { key: 'margin', label: 'Margin (Rs)', align: 'end', value: (r) => r.margin.toFixed(2) }, { key: 'foodCostPct', label: 'Cost %', align: 'end', value: (r) => `${r.foodCostPct}%` },
          ]} />
      )}

      <Modal show={!!recipe} title={`Recipe: ${recipe?.productName ?? ''}`} onClose={() => setRecipe(null)} size="xl"
        footer={<>{recipe && <button type="button" className="btn btn-outline-danger me-auto" onClick={async () => { await suite.deleteRecipe(recipe.productId); setRecipe(null); void load(); }}>Remove from menu</button>}
          <button type="button" className="btn btn-light" onClick={() => setRecipe(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => void saveRecipe()}>Save</button></>}>
        {recipe && (
          <div className="row g-3">
            <div className="col-md-3"><label className="form-label">Portions per recipe</label><input type="number" min={0.001} step="0.5" className="form-control" value={recipe.yieldQty} onChange={(e) => setRecipe({ ...recipe, yieldQty: Number(e.target.value) })} /></div>
            <div className="col-md-4"><label className="form-label">Kitchen station</label>
              <select className="form-select" value={recipe.kitchenStationId} onChange={(e) => setRecipe({ ...recipe, kitchenStationId: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">No kitchen ticket</option>{stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="col-md-5 d-flex align-items-end"><div className="fs-14">Food cost per portion <b>Rs {plate.toFixed(2)}</b>{recipe.price > 0 && <> · {(plate / recipe.price * 100).toFixed(1)}% of Rs {recipe.price}</>}</div></div>
            <div className="col-12">
              <ProductSearch onPick={(p) => !recipe.items.some((i) => i.ingredientId === p.id) && setRecipe({ ...recipe, items: [...recipe.items, { ingredientId: p.id, ingredient: p.productName, quantity: 1, unit: p.unit || 'g', wastagePct: 0, unitCost: p.purchasePrice }] })} placeholder="Add ingredient" />
              <table className="table table-sm mt-2 align-middle">
                <thead><tr><th>Ingredient</th><th style={{ width: 120 }}>Qty</th><th style={{ width: 100 }}>Unit</th><th style={{ width: 110 }}>Wastage %</th><th className="text-end">Cost</th><th /></tr></thead>
                <tbody>{recipe.items.map((i, n) => (
                  <tr key={i.ingredientId}><td>{i.ingredient}</td>
                    <td><input type="number" min={0} step="0.001" className="form-control form-control-sm" value={i.quantity} aria-label={`Quantity of ${i.ingredient}`} onChange={(e) => setRecipe({ ...recipe, items: recipe.items.map((x, j) => (j === n ? { ...x, quantity: Number(e.target.value) } : x)) })} /></td>
                    <td><input className="form-control form-control-sm" value={i.unit} aria-label="Unit" onChange={(e) => setRecipe({ ...recipe, items: recipe.items.map((x, j) => (j === n ? { ...x, unit: e.target.value } : x)) })} /></td>
                    <td><input type="number" min={0} max={99} className="form-control form-control-sm" value={i.wastagePct} aria-label="Wastage" onChange={(e) => setRecipe({ ...recipe, items: recipe.items.map((x, j) => (j === n ? { ...x, wastagePct: Number(e.target.value) } : x)) })} /></td>
                    <td className="text-end">{((i.unitCost ?? 0) * i.quantity * (1 + i.wastagePct / 100)).toFixed(2)}</td>
                    <td><button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setRecipe({ ...recipe, items: recipe.items.filter((_, j) => j !== n) })} aria-label="Remove"><i className="ti ti-x" /></button></td></tr>
                ))}</tbody>
              </table>
              <p className="text-muted fs-12">Quantities are in the ingredient's stock unit (grams, ml, pieces). Selling the dish deducts these from the outlet's stock.</p>
            </div>
            <div className="col-12"><label className="form-label">Modifier groups offered</label>
              <div className="d-flex flex-wrap gap-3">{groups.map((g) => (
                <label key={g.id} className="form-check"><input type="checkbox" className="form-check-input" checked={recipe.groupIds.includes(g.id)}
                  onChange={(e) => setRecipe({ ...recipe, groupIds: e.target.checked ? [...recipe.groupIds, g.id] : recipe.groupIds.filter((x) => x !== g.id) })} /><span className="form-check-label">{g.name}</span></label>
              ))}</div></div>
          </div>
        )}
      </Modal>

      <Modal show={!!group} title={group?.id ? `Edit ${group.name}` : 'New modifier group'} onClose={() => setGroup(null)} size="lg"
        footer={<><button type="button" className="btn btn-light" onClick={() => setGroup(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => void saveGroup()}>Save</button></>}>
        {group && (
          <div className="row g-2">
            <div className="col-md-6"><label className="form-label">Name</label><input className="form-control" placeholder="e.g. Extras" value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} /></div>
            <div className="col-md-3"><label className="form-label">Pick at least</label><input type="number" min={0} className="form-control" value={group.minSelect} onChange={(e) => setGroup({ ...group, minSelect: Number(e.target.value) })} /></div>
            <div className="col-md-3"><label className="form-label">Pick at most</label><input type="number" min={1} className="form-control" value={group.maxSelect} onChange={(e) => setGroup({ ...group, maxSelect: Number(e.target.value) })} /></div>
            <div className="col-12">
              <table className="table table-sm align-middle mt-2"><thead><tr><th>Option</th><th style={{ width: 110 }}>Extra (Rs)</th><th>Uses ingredient</th><th style={{ width: 100 }}>Qty</th><th /></tr></thead>
                <tbody>{group.modifiers.map((m, n) => (
                  <tr key={n}>
                    <td><input className="form-control form-control-sm" value={m.name} aria-label="Option name" onChange={(e) => setGroup({ ...group, modifiers: group.modifiers.map((x, j) => (j === n ? { ...x, name: e.target.value } : x)) })} /></td>
                    <td><input type="number" min={0} className="form-control form-control-sm" value={m.price} aria-label="Extra price" onChange={(e) => setGroup({ ...group, modifiers: group.modifiers.map((x, j) => (j === n ? { ...x, price: Number(e.target.value) } : x)) })} /></td>
                    <td>{m.ingredientId ? <span className="fs-13">{m.ingredient ?? `#${m.ingredientId}`} <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setGroup({ ...group, modifiers: group.modifiers.map((x, j) => (j === n ? { ...x, ingredientId: null, ingredient: undefined } : x)) })}>change</button></span>
                      : <ProductSearch onPick={(p) => setGroup({ ...group, modifiers: group.modifiers.map((x, j) => (j === n ? { ...x, ingredientId: p.id, ingredient: p.productName } : x)) })} placeholder="None" />}</td>
                    <td><input type="number" min={0} className="form-control form-control-sm" value={m.ingredientQty ?? ''} aria-label="Ingredient quantity" onChange={(e) => setGroup({ ...group, modifiers: group.modifiers.map((x, j) => (j === n ? { ...x, ingredientQty: e.target.value ? Number(e.target.value) : null } : x)) })} /></td>
                    <td><button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setGroup({ ...group, modifiers: group.modifiers.filter((_, j) => j !== n) })} aria-label="Remove"><i className="ti ti-x" /></button></td>
                  </tr>
                ))}</tbody></table>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setGroup({ ...group, modifiers: [...group.modifiers, { name: '', price: 0 }] })}>Add option</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default RestaurantSetup;
