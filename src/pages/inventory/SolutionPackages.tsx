import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import {
  solutionPackageService as svc, SolutionData, SolutionGroup, SolutionLine, PackageSize, PackageItem, MoveKind, SolutionUsage, DesignResult,
} from '../../services/solutionPackageService';

type Tab = 'packages' | 'categorization' | 'design';

/** the rule each categorization tick pattern gives */
const USAGE: Record<SolutionUsage, { label: string; badge: string; hint: string }> = {
  standard: { label: 'Standard only', badge: 'badge-soft-primary', hint: 'Used only in Standard packages' },
  premium: { label: 'Premium only', badge: 'badge-soft-warning', hint: 'Used only in Premium packages' },
  both: { label: 'Both - asks in Premium', badge: 'badge-soft-success', hint: 'Used in Standard packages; in a Premium package you are asked whether to use it' },
  none: { label: 'Not used', badge: 'badge-soft-danger', hint: 'Not ticked for any solution - left out of packages' },
};
const UsageBadge: React.FC<{ usage: SolutionUsage }> = ({ usage }) => (
  <span className={`badge ${USAGE[usage].badge}`} title={USAGE[usage].hint}>{USAGE[usage].label}</span>
);
type TierFilter = '' | 'standard' | 'premium' | 'none';
interface ProductOption { id: number; productName: string }

/** what the name / line / item form is editing */
type NameForm = { kind: 'group' | 'size'; id: number | null; name: string };
type LineForm = { id: number | null; groupId: number; name: string; inStandard: boolean; inPremium: boolean };
type ItemForm = { id: number | null; name: string; productLineId: string; productId: string; quantities: Record<number, string> };
type DeleteTarget = { kind: 'group' | 'line' | 'size' | 'item'; id: number; label: string; message: string };

const cellKey = (itemId: number, sizeId: number) => `${itemId}:${sizeId}`;
const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;

/**
 * Inventory > Solution Packages, laid out like the two sheets it came from:
 *  - Package quantities: how many of each item a building of each size needs
 *  - Product categorization: which products the Standard and the Premium solution use
 */
const SolutionPackages: React.FC = () => {
  const [tab, setTab] = useState<Tab>('packages');
  const [data, setData] = useState<SolutionData>({ groups: [], sizes: [], items: [] });
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<TierFilter>('');

  // edited cells of the quantities grid, saved together
  const [cells, setCells] = useState<Record<string, string>>({});
  const [savingCells, setSavingCells] = useState(false);

  const [nameForm, setNameForm] = useState<NameForm | null>(null);
  const [lineForm, setLineForm] = useState<LineForm | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null);

  // designing a package: size + solution; Premium asks about the products ticked for both
  const [designSize, setDesignSize] = useState('');
  const [designSolution, setDesignSolution] = useState<'standard' | 'premium'>('standard');
  const [design, setDesign] = useState<DesignResult | null>(null);
  const [confirmAsk, setConfirmAsk] = useState<DesignResult | null>(null);
  const [confirmPicked, setConfirmPicked] = useState<Set<number>>(new Set());
  const [designError, setDesignError] = useState('');
  const [designing, setDesigning] = useState(false);

  const load = async () => {
    setLoading(true); setPageError('');
    try { setData(await svc.getAll()); } catch (err) { setPageError(errorText(err, 'Could not load the solution packages.')); }
    setLoading(false);
  };
  useEffect(() => {
    load();
    api.get<ProductOption[]>('/products').then((r) => setProducts(Array.isArray(r.data) ? r.data : [])).catch(() => setProducts([]));
  }, []);

  /** runs a change; the server answers with all the data again */
  const run = async (action: () => Promise<SolutionData>, onError?: (msg: string) => void) => {
    try { setData(await action()); setPageError(''); return true; }
    catch (err) { const msg = errorText(err, 'Could not save the change.'); (onError || setPageError)(msg); return false; }
  };
  const move = (kind: MoveKind, id: number, dir: -1 | 1) => run(() => svc.move(kind, id, dir));

  // ── quantities grid ──
  const qtyOf = (item: PackageItem, sizeId: number) => {
    const edited = cells[cellKey(item.id, sizeId)];
    if (edited !== undefined) return edited;
    const q = item.quantities[String(sizeId)];
    return q ? String(q) : '';
  };
  const changedCells = useMemo(() => Object.entries(cells).filter(([key, value]) => {
    const [itemId, sizeId] = key.split(':').map(Number);
    const item = data.items.find((i) => i.id === itemId);
    return item && (Number(value) || 0) !== (item.quantities[String(sizeId)] || 0);
  }), [cells, data.items]);

  const saveCells = async () => {
    if (changedCells.length === 0) return;
    setSavingCells(true);
    const ok = await run(() => svc.saveQuantities(changedCells.map(([key, value]) => {
      const [itemId, sizeId] = key.split(':').map(Number);
      return { itemId, sizeId, quantity: Math.max(0, Math.floor(Number(value) || 0)) };
    })));
    if (ok) setCells({});
    setSavingCells(false);
  };

  const visibleItems = data.items.filter((i) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || [i.name, i.productLineName, i.groupName, i.productName].some((x) => (x || '').toLowerCase().includes(q));
    const matchTier = !tier || (tier === 'standard' && i.inStandard) || (tier === 'premium' && i.inPremium) || (tier === 'none' && !i.productLineId);
    return matchSearch && matchTier;
  });
  const sizeTotal = (sizeId: number) => visibleItems.reduce((sum, i) => sum + (Number(qtyOf(i, sizeId)) || 0), 0);
  const uncategorised = data.items.filter((i) => !i.productLineId).length;

  // ── forms ──
  const openItem = (item?: PackageItem) => {
    setFormError('');
    setItemForm(item
      ? { id: item.id, name: item.name, productLineId: item.productLineId ? String(item.productLineId) : '', productId: item.productId ? String(item.productId) : '',
          quantities: Object.fromEntries(data.sizes.map((s) => [s.id, qtyOf(item, s.id)])) }
      : { id: null, name: '', productLineId: '', productId: '', quantities: {} });
  };
  const saveItem = async () => {
    if (!itemForm) return;
    if (!itemForm.name.trim()) { setFormError('Enter the item name.'); return; }
    setSaving(true); setFormError('');
    const body = {
      name: itemForm.name.trim(),
      productLineId: itemForm.productLineId ? Number(itemForm.productLineId) : null,
      productId: itemForm.productId ? Number(itemForm.productId) : null,
      quantities: Object.fromEntries(data.sizes.map((s) => [s.id, Math.max(0, Math.floor(Number(itemForm.quantities[s.id]) || 0))])),
    };
    const ok = await run(() => (itemForm.id ? svc.updateItem(itemForm.id, body) : svc.addItem(body)), setFormError);
    if (ok) {
      // the form saved this item's cells - drop any unsaved grid edits for it
      if (itemForm.id) setCells((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${itemForm.id}:`))));
      setItemForm(null);
    }
    setSaving(false);
  };

  const openLine = (groupId: number, line?: SolutionLine) => {
    setFormError('');
    setLineForm(line ? { id: line.id, groupId: line.groupId, name: line.name, inStandard: line.inStandard, inPremium: line.inPremium }
      : { id: null, groupId, name: '', inStandard: true, inPremium: true });
  };
  const saveLine = async () => {
    if (!lineForm) return;
    if (!lineForm.name.trim()) { setFormError('Enter the product name.'); return; }
    setSaving(true); setFormError('');
    const body = { groupId: lineForm.groupId, name: lineForm.name.trim(), inStandard: lineForm.inStandard, inPremium: lineForm.inPremium };
    const ok = await run(() => (lineForm.id ? svc.updateLine(lineForm.id, body) : svc.addLine(body)), setFormError);
    if (ok) setLineForm(null);
    setSaving(false);
  };
  const toggleTier = (line: SolutionLine, field: 'inStandard' | 'inPremium') =>
    run(() => svc.updateLine(line.id, { groupId: line.groupId, name: line.name, inStandard: line.inStandard, inPremium: line.inPremium, [field]: !line[field] }));

  const saveName = async () => {
    if (!nameForm) return;
    const name = nameForm.name.trim();
    if (!name) { setFormError(nameForm.kind === 'group' ? 'Enter the group name.' : 'Enter the building size.'); return; }
    setSaving(true); setFormError('');
    const action = nameForm.kind === 'group'
      ? (nameForm.id ? () => svc.renameGroup(nameForm.id!, name) : () => svc.addGroup(name))
      : (nameForm.id ? () => svc.renameSize(nameForm.id!, name) : () => svc.addSize(name));
    const ok = await run(action, setFormError);
    if (ok) setNameForm(null);
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { kind, id } = toDelete;
    await run(() => (kind === 'group' ? svc.deleteGroup(id) : kind === 'line' ? svc.deleteLine(id) : kind === 'size' ? svc.deleteSize(id) : svc.deleteItem(id)));
    setCells((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => {
      const [itemId, sizeId] = k.split(':').map(Number);
      return !((kind === 'item' && itemId === id) || (kind === 'size' && sizeId === id));
    })));
    setToDelete(null);
  };

  const runDesign = async (confirmed: number[] | null) => {
    if (!designSize) { setDesignError('Choose the building size.'); return; }
    setDesigning(true); setDesignError('');
    try {
      const res = await svc.design(Number(designSize), designSolution, confirmed);
      if (res.toConfirm.length > 0) {
        // Premium: ask which of the "both" products to use (all ticked to start with)
        setConfirmAsk(res); setConfirmPicked(new Set(res.toConfirm.map((x) => x.itemId)));
      } else { setDesign(res); setConfirmAsk(null); }
    } catch (err) { setDesignError(errorText(err, 'Could not design the package.')); }
    setDesigning(false);
  };
  /** premium-only products of the same group: shown next to each question, so the choice is easy */
  const premiumAlternatives = (groupName: string | null) =>
    data.groups.find((g) => g.name === groupName)?.lines.filter((l) => l.usage === 'premium').map((l) => l.name) || [];

  const linkedCount = (lineId: number) => data.items.filter((i) => i.productLineId === lineId).length;
  const deleteGroup = (g: SolutionGroup) => setToDelete({ kind: 'group', id: g.id, label: g.name,
    message: `Delete the group "${g.name}" and its ${g.lines.length} product(s)? Package items that use them become "not categorised".` });
  const deleteLine = (l: SolutionLine) => setToDelete({ kind: 'line', id: l.id, label: l.name,
    message: `Delete "${l.name}" from the categorization?${linkedCount(l.id) ? ` ${linkedCount(l.id)} package item(s) use it and become "not categorised".` : ''}` });
  const deleteSize = (s: PackageSize) => setToDelete({ kind: 'size', id: s.id, label: s.name, message: `Delete the "${s.name}" column and all its quantities?` });
  const deleteItem = (i: PackageItem) => setToDelete({ kind: 'item', id: i.id, label: i.name, message: `Delete "${i.name}" and its quantities from the packages?` });

  const IconBtn: React.FC<{ icon: string; title: string; onClick: () => void; disabled?: boolean; className?: string }> = ({ icon, title, onClick, disabled, className }) => (
    <button type="button" className={`btn btn-sm btn-light border p-1 lh-1 ${className || ''}`} title={title} disabled={disabled}
      onClick={onClick}><i className={`ti ${icon}`}></i></button>
  );

  const lineOptions = data.groups.map((g) => (
    <optgroup key={g.id} label={g.name}>
      {g.lines.map((l) => <option key={l.id} value={l.id}>{l.name}{l.inStandard && l.inPremium ? ' (Standard + Premium)' : l.inPremium ? ' (Premium)' : l.inStandard ? ' (Standard)' : ''}</option>)}
    </optgroup>
  ));

  const designTotal = design ? design.items.reduce((sum, x) => sum + x.quantity, 0) : 0;
  const designTab = (
    <div className="card">
      <div className="card-header d-flex align-items-end gap-3 flex-wrap">
        <div>
          <label className="form-label mb-1">Building size</label>
          <select className="form-select design-size" style={{ minWidth: 180 }} value={designSize}
            onChange={(e) => { setDesignSize(e.target.value); setDesign(null); }}>
            <option value="">Choose...</option>
            {data.sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label mb-1 d-block">Package</label>
          <div className="btn-group">
            {(['standard', 'premium'] as const).map((sol) => (
              <button key={sol} type="button" className={`btn ${designSolution === sol ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setDesignSolution(sol); setDesign(null); }}>{sol === 'standard' ? 'Standard' : 'Premium'}</button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-success" disabled={designing} onClick={() => runDesign(null)}>
          <i className="ti ti-wand me-1"></i>{designing ? 'Designing...' : 'Design Package'}
        </button>
        {design?.solution === 'premium' && (
          <button type="button" className="btn btn-light border" disabled={designing} onClick={() => runDesign(null)}>Change Premium choices</button>
        )}
      </div>
      <div className="card-body">
        {designError && <div className="alert alert-danger py-2">{designError}</div>}
        {!design ? (
          <p className="text-muted mb-0">
            Choose a building size and Standard or Premium. Standard uses the products ticked <b>Standard only</b> and <b>Both</b>.
            Premium uses the products ticked <b>Premium only</b>, and asks you about each product ticked <b>Both</b>.
          </p>
        ) : (
          <>
            <h5 className="mb-3">{design.solution === 'standard' ? 'Standard' : 'Premium'} package - {design.sizeName}</h5>
            <div className="table-responsive">
              <table className="table table-bordered align-middle design-result">
                <thead className="thead-light"><tr><th>Group</th><th>Item</th><th>Categorization</th><th>Rule</th><th className="text-center">Quantity</th></tr></thead>
                <tbody>
                  {design.items.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4">No items for this size and package. Enter quantities on the Package Quantities tab.</td></tr>
                  ) : design.items.map((x) => (
                    <tr key={x.itemId}>
                      <td>{x.groupName}</td><td className="fw-semibold">{x.name}</td><td>{x.productLineName}</td>
                      <td><UsageBadge usage={x.usage} /></td><td className="text-center">{x.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                {design.items.length > 0 && <tfoot><tr className="fw-bold bg-light"><td colSpan={4}>Total items</td><td className="text-center">{designTotal}</td></tr></tfoot>}
              </table>
            </div>
            {design.leftOut.length > 0 && (
              <details className="mt-2">
                <summary className="text-muted">{design.leftOut.length} item(s) with a quantity for {design.sizeName} left out</summary>
                <ul className="mt-2 mb-0 small">
                  {design.leftOut.map((x) => (
                    <li key={x.itemId}>{x.name} ({x.quantity}) - {x.usage === 'none' ? 'not categorised' : x.usage === 'both' ? 'you chose not to use it' : USAGE[x.usage].label}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Solution Packages</h4>
            <h6>Items each building size needs, and which products the Standard and Premium solutions use</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" title="Refresh" onClick={(e) => { e.preventDefault(); setCells({}); load(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
        <div className="page-btn d-flex gap-2">
          {tab === 'design' ? null : tab === 'packages' ? (
            <>
              <button type="button" className="btn btn-outline-primary" onClick={() => { setFormError(''); setNameForm({ kind: 'size', id: null, name: '' }); }}>
                <i className="ti ti-columns-3 me-1"></i>Add Building Size
              </button>
              <button type="button" className="btn btn-primary" onClick={() => openItem()}><i className="ti ti-circle-plus me-1"></i>Add Item</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => { setFormError(''); setNameForm({ kind: 'group', id: null, name: '' }); }}>
              <i className="ti ti-circle-plus me-1"></i>Add Group
            </button>
          )}
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><a href="#" className={`nav-link ${tab === 'packages' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setTab('packages'); }}>
          <i className="ti ti-table me-1"></i>Package Quantities</a></li>
        <li className="nav-item"><a href="#" className={`nav-link ${tab === 'categorization' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setTab('categorization'); }}>
          <i className="ti ti-category me-1"></i>Product Categorization</a></li>
        <li className="nav-item"><a href="#" className={`nav-link ${tab === 'design' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setTab('design'); }}>
          <i className="ti ti-wand me-1"></i>Design Package</a></li>
      </ul>

      {pageError && <div className="alert alert-danger py-2">{pageError}</div>}

      {tab === 'design' ? designTab : tab === 'packages' ? (
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="search-set">
                <div className="search-input">
                  <input type="text" className="form-control" placeholder="Search item" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <select className="form-select" style={{ width: 'auto' }} value={tier} onChange={(e) => setTier(e.target.value as TierFilter)}>
                <option value="">All solutions</option>
                <option value="standard">Standard solution</option>
                <option value="premium">Premium solution</option>
                <option value="none">Not categorised ({uncategorised})</option>
              </select>
            </div>
            <div className="d-flex align-items-center gap-2">
              {changedCells.length > 0 && <small className="text-warning fw-medium">{changedCells.length} unsaved change(s)</small>}
              <button type="button" className="btn btn-light border" disabled={changedCells.length === 0 || savingCells} onClick={() => setCells({})}>Discard</button>
              <button type="button" className="btn btn-success" disabled={changedCells.length === 0 || savingCells} onClick={saveCells}>
                <i className="ti ti-device-floppy me-1"></i>{savingCells ? 'Saving...' : 'Save Quantities'}
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0 solution-grid">
                <thead className="thead-light">
                  <tr>
                    <th style={{ minWidth: 230 }}>Product</th>
                    {data.sizes.map((s, idx) => (
                      <th key={s.id} className="text-center" style={{ minWidth: 96 }}>
                        <div className="text-nowrap">{s.name}</div>
                        <div className="d-flex justify-content-center gap-1 mt-1">
                          <IconBtn icon="ti-chevron-left" title="Move left" disabled={idx === 0} onClick={() => move('sizes', s.id, -1)} />
                          <IconBtn icon="ti-edit" title="Rename" onClick={() => { setFormError(''); setNameForm({ kind: 'size', id: s.id, name: s.name }); }} />
                          <IconBtn icon="ti-trash" title="Delete column" onClick={() => deleteSize(s)} />
                          <IconBtn icon="ti-chevron-right" title="Move right" disabled={idx === data.sizes.length - 1} onClick={() => move('sizes', s.id, 1)} />
                        </div>
                      </th>
                    ))}
                    <th style={{ minWidth: 190 }}>Categorization</th>
                    <th className="no-sort" style={{ minWidth: 150 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={data.sizes.length + 3} className="text-center py-4">Loading...</td></tr>
                  ) : visibleItems.length === 0 ? (
                    <tr><td colSpan={data.sizes.length + 3} className="text-center py-4">{data.items.length === 0 ? 'No items yet. Click "Add Item".' : 'No items match.'}</td></tr>
                  ) : visibleItems.map((item) => {
                    const pos = data.items.findIndex((i) => i.id === item.id);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold">{item.name}</div>
                          {item.productName && <small className="text-muted"><i className="ti ti-box me-1"></i>{item.productName}</small>}
                        </td>
                        {data.sizes.map((s) => {
                          const key = cellKey(item.id, s.id);
                          const value = qtyOf(item, s.id);
                          const changed = cells[key] !== undefined && (Number(cells[key]) || 0) !== (item.quantities[String(s.id)] || 0);
                          return (
                            <td key={s.id} className="p-1">
                              <input type="number" min={0} step={1} inputMode="numeric" placeholder="0" aria-label={`${item.name} - ${s.name}`}
                                className={`form-control form-control-sm text-center ${changed ? 'border-warning bg-warning-subtle' : ''}`}
                                value={value} onChange={(e) => setCells((prev) => ({ ...prev, [key]: e.target.value.replace(/[^0-9]/g, '') }))} />
                            </td>
                          );
                        })}
                        <td>
                          {item.productLineId ? (
                            <>
                              <div className="small">{item.productLineName}</div>
                              <UsageBadge usage={item.usage} />
                            </>
                          ) : <span className="badge badge-soft-danger">Not categorised</span>}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <IconBtn icon="ti-arrow-up" title="Move up" disabled={pos === 0} onClick={() => move('items', item.id, -1)} />
                            <IconBtn icon="ti-arrow-down" title="Move down" disabled={pos === data.items.length - 1} onClick={() => move('items', item.id, 1)} />
                            <IconBtn icon="ti-edit" title="Edit" onClick={() => openItem(item)} />
                            <IconBtn icon="ti-trash" title="Delete" onClick={() => deleteItem(item)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {!loading && visibleItems.length > 0 && (
                  <tfoot>
                    <tr className="fw-bold bg-light">
                      <td>Total items</td>
                      {data.sizes.map((s) => <td key={s.id} className="text-center">{sizeTotal(s.id)}</td>)}
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <small className="text-muted">Tick the solutions each product is used in. <b>Standard only</b> or <b>Premium only</b>: used only in that package. <b>Both</b>: used in Standard packages straight away; when a Premium package is designed you are asked whether to use it.</small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0">
                <thead className="thead-light">
                  <tr>
                    <th style={{ minWidth: 260 }}>Product Name</th>
                    <th className="text-center" style={{ width: 160 }}>Standard Solution</th>
                    <th className="text-center" style={{ width: 160 }}>Premium Solution</th>
                    <th style={{ width: 200 }}>Rule</th>
                    <th className="text-center" style={{ width: 130 }}>Package items</th>
                    <th className="no-sort" style={{ width: 160 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                  ) : data.groups.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4">No groups yet. Click "Add Group".</td></tr>
                  ) : data.groups.map((g, gi) => (
                    <React.Fragment key={g.id}>
                      <tr className="table-light">
                        <td colSpan={5} className="fw-bold text-primary">{g.name}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <IconBtn icon="ti-arrow-up" title="Move group up" disabled={gi === 0} onClick={() => move('groups', g.id, -1)} />
                            <IconBtn icon="ti-arrow-down" title="Move group down" disabled={gi === data.groups.length - 1} onClick={() => move('groups', g.id, 1)} />
                            <IconBtn icon="ti-edit" title="Rename group" onClick={() => { setFormError(''); setNameForm({ kind: 'group', id: g.id, name: g.name }); }} />
                            <IconBtn icon="ti-trash" title="Delete group" onClick={() => deleteGroup(g)} />
                          </div>
                        </td>
                      </tr>
                      {g.lines.map((l, li) => (
                        <tr key={l.id}>
                          <td className="ps-4">{l.name}</td>
                          {(['inStandard', 'inPremium'] as const).map((field) => (
                            <td key={field} className="text-center">
                              <input type="checkbox" className="form-check-input" style={{ width: 20, height: 20, cursor: 'pointer' }} checked={l[field]}
                                aria-label={`${l.name} - ${field === 'inStandard' ? 'Standard' : 'Premium'}`} onChange={() => toggleTier(l, field)} />
                            </td>
                          ))}
                          <td><UsageBadge usage={l.usage} /></td>
                          <td className="text-center">{linkedCount(l.id) || <span className="text-muted">-</span>}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <IconBtn icon="ti-arrow-up" title="Move up" disabled={li === 0} onClick={() => move('lines', l.id, -1)} />
                              <IconBtn icon="ti-arrow-down" title="Move down" disabled={li === g.lines.length - 1} onClick={() => move('lines', l.id, 1)} />
                              <IconBtn icon="ti-edit" title="Edit" onClick={() => openLine(g.id, l)} />
                              <IconBtn icon="ti-trash" title="Delete" onClick={() => deleteLine(l)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={6} className="ps-4 py-1">
                          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => openLine(g.id)}><i className="ti ti-plus me-1"></i>Add product to {g.name}</button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* group name / building size */}
      {nameForm && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{nameForm.kind === 'group' ? (nameForm.id ? 'Rename Group' : 'Add Group') : (nameForm.id ? 'Rename Building Size' : 'Add Building Size')}</h4>
                <button type="button" className="btn-close" onClick={() => setNameForm(null)} />
              </div>
              <div className="modal-body">
                <label className="form-label">{nameForm.kind === 'group' ? 'Group name' : 'Building size'} <span className="text-danger">*</span></label>
                <input className="form-control" autoFocus maxLength={nameForm.kind === 'group' ? 100 : 50}
                  placeholder={nameForm.kind === 'group' ? 'e.g. Smart Sensors' : 'e.g. 1 Kanal, 3 BHK, 20 Kanal'} value={nameForm.name}
                  onChange={(e) => setNameForm({ ...nameForm, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }} />
                {nameForm.kind === 'size' && !nameForm.id && <small className="text-muted">Added as the last column; use the arrows to move it.</small>}
                {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNameForm(null)} disabled={saving}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={saveName} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* categorization product */}
      {lineForm && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{lineForm.id ? 'Edit Product' : 'Add Product'}</h4>
                <button type="button" className="btn-close" onClick={() => setLineForm(null)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Group</label>
                  <select className="form-select" value={lineForm.groupId} onChange={(e) => setLineForm({ ...lineForm, groupId: Number(e.target.value) })}>
                    {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Product name <span className="text-danger">*</span></label>
                  <input className="form-control" autoFocus maxLength={150} placeholder="e.g. Smart Panic Button" value={lineForm.name}
                    onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })} />
                </div>
                <label className="form-label">Used in</label>
                <div className="d-flex gap-4">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="line-std" checked={lineForm.inStandard} onChange={(e) => setLineForm({ ...lineForm, inStandard: e.target.checked })} />
                    <label className="form-check-label" htmlFor="line-std">Standard solution</label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="line-prem" checked={lineForm.inPremium} onChange={(e) => setLineForm({ ...lineForm, inPremium: e.target.checked })} />
                    <label className="form-check-label" htmlFor="line-prem">Premium solution</label>
                  </div>
                </div>
                {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setLineForm(null)} disabled={saving}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={saveLine} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* package item */}
      {itemForm && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{itemForm.id ? 'Edit Item' : 'Add Item'}</h4>
                <button type="button" className="btn-close" onClick={() => setItemForm(null)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Item name <span className="text-danger">*</span></label>
                  <input className="form-control" autoFocus maxLength={150} placeholder="e.g. Piano Switch 4 Gang" value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Categorization product</label>
                    <select className="form-select" value={itemForm.productLineId} onChange={(e) => setItemForm({ ...itemForm, productLineId: e.target.value })}>
                      <option value="">Not categorised</option>
                      {lineOptions}
                    </select>
                    <small className="text-muted">Decides if it goes in the Standard or Premium package.</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Inventory product</label>
                    <select className="form-select" value={itemForm.productId} onChange={(e) => setItemForm({ ...itemForm, productId: e.target.value })}>
                      <option value="">Not linked</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
                    </select>
                    <small className="text-muted">Optional - the product it is sold as.</small>
                  </div>
                </div>
                <label className="form-label">Quantity per building size</label>
                {data.sizes.length === 0 ? <div className="text-muted small">Add a building size first.</div> : (
                  <div className="row g-2">
                    {data.sizes.map((s) => (
                      <div key={s.id} className="col-6 col-md-3">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text" style={{ minWidth: 76 }}>{s.name}</span>
                          <input type="number" min={0} step={1} className="form-control text-center" placeholder="0" value={itemForm.quantities[s.id] ?? ''}
                            onChange={(e) => setItemForm({ ...itemForm, quantities: { ...itemForm.quantities, [s.id]: e.target.value.replace(/[^0-9]/g, '') } })} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formError && <div className="alert alert-danger py-2 mt-3 mb-0">{formError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setItemForm(null)} disabled={saving}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={saveItem} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium package: confirm the products that are ticked for both solutions */}
      {confirmAsk && (
        <div className="modal fade show d-block premium-confirm" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Premium package - {confirmAsk.sizeName}: confirm products</h4>
                <button type="button" className="btn-close" onClick={() => setConfirmAsk(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-3">These products are ticked for <b>both</b> Standard and Premium. Tick the ones to use in this Premium package.</p>
                <div className="d-flex gap-2 mb-2">
                  <button type="button" className="btn btn-sm btn-light border" onClick={() => setConfirmPicked(new Set(confirmAsk.toConfirm.map((x) => x.itemId)))}>Use all</button>
                  <button type="button" className="btn btn-sm btn-light border" onClick={() => setConfirmPicked(new Set())}>Use none</button>
                </div>
                <div className="list-group">
                  {confirmAsk.toConfirm.map((x) => {
                    const alt = premiumAlternatives(x.groupName);
                    return (
                      <label key={x.itemId} className="list-group-item d-flex align-items-start gap-2" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" className="form-check-input mt-1" checked={confirmPicked.has(x.itemId)} aria-label={`Use ${x.name}`}
                          onChange={(e) => setConfirmPicked((prev) => { const n = new Set(prev); if (e.target.checked) n.add(x.itemId); else n.delete(x.itemId); return n; })} />
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{x.name} <span className="text-muted fw-normal">x {x.quantity}</span></div>
                          <small className="text-muted">{x.groupName} - {x.productLineName}{alt.length > 0 && <> · Premium-only in this group: {alt.join(', ')}</>}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConfirmAsk(null)} disabled={designing}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={designing} onClick={() => runDesign([...confirmPicked])}>
                  {designing ? 'Designing...' : `Confirm (${confirmPicked.size} of ${confirmAsk.toConfirm.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={toDelete != null} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title={toDelete ? `Delete ${toDelete.label}` : undefined} message={toDelete?.message} />
    </>
  );
};

export default SolutionPackages;
