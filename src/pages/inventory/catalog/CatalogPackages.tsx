import React, { useEffect, useMemo, useState } from 'react';
import { catalogService as svc, CatalogData, CatalogProduct, CatalogSize, familiesOf, priceOf } from '../../../services/catalogService';

const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;
const money = (n: number) => `Rs ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const qtyText = (q: number) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 1000) / 1000));
type Filter = '' | 'packages' | 'nofamily' | 'notlisted' | 'conflict';
type ProductForm = { id: number | null; name: string; familyId: string; unit: string; fallbackPrice: string; defaultSku: string; newAlias: string };

/**
 * Package Quantities: how many of each product a building of each size needs, per tier (Standard / Premium can
 * differ). One row per product (the inventory name without colour); its price is its default SKU's
 * inventory price - or, not in the inventory, its entered price. Totals are worked out, never stored.
 */
const CatalogPackages: React.FC<{ reloadKey: number; sizeHeader: (s: CatalogSize, idx: number, count: number) => React.ReactNode }> = ({ reloadKey, sizeHeader }) => {
  const [cat, setCat] = useState<CatalogData | null>(null);
  const [error, setError] = useState('');
  const [tierId, setTierId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('packages');
  const [cells, setCells] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [formError, setFormError] = useState('');

  const load = () => svc.get().then((c) => { setCat(c); setError(''); setTierId((t) => t ?? c.tiers[0]?.id ?? null); })
    .catch((err) => setError(errorText(err, 'Could not load the catalogue.')));
  useEffect(() => { load(); setCells({}); }, [reloadKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (action: () => Promise<CatalogData>, onError: (m: string) => void = setError) => {
    try { setCat(await action()); return true; } catch (err) { onError(errorText(err, 'Could not save the change.')); return false; }
  };

  const families = useMemo(() => (cat ? familiesOf(cat) : []), [cat]);
  const tier = cat?.tiers.find((t) => t.id === tierId);
  const key = (productId: number, sizeId: number) => `${productId}:${sizeId}`;
  const saved = useMemo(() => {
    const m: Record<string, number> = {};
    cat?.packageLines.filter((l) => l.tierId === tierId).forEach((l) => { m[key(l.productId, l.sizeId)] = l.quantity; });
    return m;
  }, [cat, tierId]);
  const qty = (p: number, s: number) => cells[key(p, s)] ?? (saved[key(p, s)] ? qtyText(saved[key(p, s)]) : '');
  const changed = Object.entries(cells).filter(([k, v]) => (Number(v) || 0) !== (saved[k] || 0));
  const inTier = (p: CatalogProduct) => !!tierId && !!families.find((f) => f.id === p.familyId)?.tierIds.includes(tierId);
  const inPackages = (p: CatalogProduct) => cat!.packageLines.some((l) => l.productId === p.id && l.tierId === tierId);

  if (!cat) return <div className="card"><div className="card-body">{error ? <div className="alert alert-danger py-2 mb-0">{error}</div> : 'Loading...'}</div></div>;

  const rows = cat.products.filter((p) => {
    const q = search.trim().toLowerCase();
    const fam = families.find((f) => f.id === p.familyId);
    const text = [p.name, fam?.name, fam?.groupName, ...p.skus.map((s) => s.name), ...p.aliases.map((a) => a.alias)].join(' ').toLowerCase();
    if (q && !text.includes(q)) return false;
    if (filter === 'packages') return inPackages(p) || inTier(p);
    if (filter === 'nofamily') return !p.familyId;
    if (filter === 'notlisted') return p.skus.length === 0;
    if (filter === 'conflict') return inPackages(p) && !inTier(p);
    return true;
  }).sort((a, b) => {
    const fa = families.findIndex((f) => f.id === a.familyId), fb = families.findIndex((f) => f.id === b.familyId);
    return (fa < 0 ? 1e6 : fa) - (fb < 0 ? 1e6 : fb) || a.name.localeCompare(b.name);
  });
  const sizeTotal = (sizeId: number) => rows.reduce((sum, p) => sum + (Number(qty(p.id, sizeId)) || 0) * (priceOf(p) || 0), 0);

  const save = async () => {
    if (!tierId || changed.length === 0) return;
    setSaving(true);
    const ok = await run(() => svc.saveLines(changed.map(([k, v]) => {
      const [productId, sizeId] = k.split(':').map(Number);
      return { productId, sizeId, tierId, quantity: v.trim() === '' ? null : Math.max(0, Number(v) || 0) };
    })));
    if (ok) setCells({});
    setSaving(false);
  };

  const openForm = (p?: CatalogProduct) => {
    setFormError('');
    setForm(p ? { id: p.id, name: p.name, familyId: p.familyId ? String(p.familyId) : '', unit: p.unit, fallbackPrice: p.fallbackPrice != null ? String(p.fallbackPrice) : '',
      defaultSku: String(p.skus.find((s) => s.isDefault)?.id || ''), newAlias: '' }
      : { id: null, name: '', familyId: '', unit: 'pc', fallbackPrice: '', defaultSku: '', newAlias: '' });
  };
  const editing = form?.id ? cat.products.find((p) => p.id === form.id) : undefined;
  const saveForm = async () => {
    if (!form) return;
    if (!form.name.trim()) { setFormError('Enter the product name.'); return; }
    const body = { name: form.name.trim(), familyId: form.familyId ? Number(form.familyId) : null, unit: form.unit.trim() || 'pc',
      fallbackPrice: form.fallbackPrice.trim() === '' ? null : Math.max(0, Number(form.fallbackPrice) || 0) };
    let ok = await run(() => (form.id ? svc.updateProduct(form.id, body) : svc.addProduct(body)), setFormError);
    if (ok && form.id && editing && form.defaultSku && editing.skus.find((s) => s.isDefault)?.id !== Number(form.defaultSku))
      ok = await run(() => svc.setDefaultSku(form.id!, Number(form.defaultSku)), setFormError);
    if (ok) setForm(null);
  };
  const removeProduct = async (p: CatalogProduct) => {
    if (!window.confirm(`Delete ${p.name}? Its package quantities, other names and drawing-rule links go with it.`)) return;
    await run(() => svc.deleteProduct(p.id));
  };

  return (
    <div className="card">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="btn-group tier-switch">
            {cat.tiers.map((t) => (
              <button key={t.id} type="button" className={`btn ${t.id === tierId ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { if (changed.length && !window.confirm('Discard the unsaved quantities?')) return; setCells({}); setTierId(t.id); }}>{t.name}</button>
            ))}
          </div>
          <div className="search-set"><div className="search-input">
            <input type="text" className="form-control" placeholder="Search product" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div></div>
          <select className="form-select catalog-filter" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="packages">In {tier?.name || 'this tier'} (packages or family)</option>
            <option value="">All products ({cat.products.length})</option>
            <option value="nofamily">No family ({cat.products.filter((p) => !p.familyId).length})</option>
            <option value="notlisted">Not in the inventory ({cat.products.filter((p) => p.skus.length === 0).length})</option>
            <option value="conflict">Family not in {tier?.name || 'this tier'}</option>
          </select>
        </div>
        <div className="d-flex align-items-center gap-2">
          {changed.length > 0 && <small className="text-warning fw-medium">{changed.length} unsaved change(s)</small>}
          <button type="button" className="btn btn-light border" disabled={!changed.length || saving} onClick={() => setCells({})}>Discard</button>
          <button type="button" className="btn btn-success save-quantities" disabled={!changed.length || saving} onClick={save}>
            <i className="ti ti-device-floppy me-1"></i>{saving ? 'Saving...' : `Save ${tier?.name || ''} Quantities`}
          </button>
          <button type="button" className="btn btn-primary add-product" onClick={() => openForm()}><i className="ti ti-circle-plus me-1"></i>Add Product</button>
        </div>
      </div>
      {error && <div className="alert alert-danger py-2 m-3 mb-0">{error}</div>}
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-bordered align-middle mb-0 solution-grid catalog-grid">
            <thead className="thead-light">
              <tr>
                <th style={{ minWidth: 260 }}>Product</th>
                <th style={{ minWidth: 170 }}>Family</th>
                {cat.sizes.map((s, idx) => <th key={s.id} className="text-center" style={{ minWidth: 92 }}>{sizeHeader(s, idx, cat.sizes.length)}</th>)}
                <th className="no-sort" style={{ minWidth: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={cat.sizes.length + 3} className="text-center py-4">
                  {cat.products.length === 0 ? 'No products yet - add them in the inventory (Products), then upload the package items on the Import tab.' : 'No products match.'}</td></tr>
              ) : rows.map((p) => {
                const fam = families.find((f) => f.id === p.familyId);
                const sku = p.skus.find((s) => s.isDefault) || p.skus[0];
                const price = priceOf(p);
                const conflict = inPackages(p) && !inTier(p);
                return (
                  <tr key={p.id} className={conflict ? 'table-warning' : undefined} data-product={p.name}>
                    <td>
                      <div className="fw-semibold">{p.name}{p.unit !== 'pc' && <small className="text-muted ms-1">({p.unit})</small>}</div>
                      {sku ? <small className="text-muted d-block">{sku.name}{sku.model ? ` · ${sku.model}` : ''}{p.skus.length > 1 ? ` · ${p.skus.length} colours` : ''} · {price != null ? money(price) : 'no price'}</small>
                        : <small className="text-warning d-block not-listed">Not in the inventory{p.fallbackPrice != null ? ` · ${money(p.fallbackPrice)}` : ' · price typed on the quotation'}</small>}
                    </td>
                    <td>
                      {fam ? <><div className="small">{fam.name}</div><small className="text-muted">{fam.groupName}</small></> : <span className="badge badge-soft-danger">No family</span>}
                      {conflict && <div><span className="badge badge-soft-warning" title="Its family is not ticked for this tier - categorize it, or remove these quantities">not in {tier?.name}</span></div>}
                    </td>
                    {cat.sizes.map((s) => {
                      const k = key(p.id, s.id);
                      const isChanged = cells[k] !== undefined && (Number(cells[k]) || 0) !== (saved[k] || 0);
                      return (
                        <td key={s.id} className="p-1">
                          <input type="number" min={0} step="any" inputMode="decimal" placeholder="0" aria-label={`${p.name} - ${s.name}`}
                            className={`form-control form-control-sm text-center ${isChanged ? 'border-warning bg-warning-subtle' : ''}`}
                            value={qty(p.id, s.id)} onChange={(e) => setCells((prev) => ({ ...prev, [k]: e.target.value.replace(/[^0-9.]/g, '') }))} />
                        </td>
                      );
                    })}
                    <td>
                      <div className="d-flex gap-1">
                        <button type="button" className="btn btn-sm btn-light border p-1 lh-1" title="Edit" onClick={() => openForm(p)}><i className="ti ti-edit"></i></button>
                        {p.skus.length === 0 && <button type="button" className="btn btn-sm btn-light border p-1 lh-1" title="Delete" onClick={() => removeProduct(p)}><i className="ti ti-trash"></i></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="fw-bold bg-light">
                  <td colSpan={2}>{tier?.name} package total <small className="text-muted fw-normal d-block">quantity × price, products shown</small></td>
                  {cat.sizes.map((s) => <td key={s.id} className="text-center small package-total">{money(sizeTotal(s.id))}</td>)}
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {form && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{form.id ? 'Edit product' : 'Add a product not in the inventory'}</h4>
                <button type="button" className="btn-close" onClick={() => setForm(null)} />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Product name</label>
                    <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {!form.id && <small className="text-muted">Inventory products are added in the inventory (Products); add one here only when it is not in the inventory.</small>}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Unit</label>
                    <input className="form-control" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pc, m" />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Family <small className="text-muted">(decides Standard / Premium)</small></label>
                    <select className="form-select product-family" value={form.familyId} onChange={(e) => setForm({ ...form, familyId: e.target.value })}>
                      <option value="">No family</option>
                      {cat.groups.map((g) => <optgroup key={g.id} label={g.name}>{g.families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Price (optional - otherwise typed on the quotation)</label>
                    <input type="number" min={0} className="form-control" value={form.fallbackPrice} onChange={(e) => setForm({ ...form, fallbackPrice: e.target.value })} />
                  </div>
                  {editing && editing.skus.length > 0 && (
                    <div className="col-12">
                      <label className="form-label">Default colour <small className="text-muted">(the SKU a quotation starts with)</small></label>
                      <select className="form-select" value={form.defaultSku} onChange={(e) => setForm({ ...form, defaultSku: e.target.value })}>
                        {editing.skus.map((s) => <option key={s.id} value={s.id}>{s.name}{s.model ? ` (${s.model})` : ''}{s.price != null ? ` - ${money(s.price)}` : ''}</option>)}
                      </select>
                    </div>
                  )}
                  {editing && (
                    <div className="col-12">
                      <label className="form-label">Other names <small className="text-muted">(packages / categorization files, drawings - used to match imports)</small></label>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        {editing.aliases.length === 0 && <small className="text-muted">None</small>}
                        {editing.aliases.map((a) => (
                          <span key={a.id} className="badge bg-light text-dark border">{a.alias} <small className="text-muted">{a.source}</small>
                            <button type="button" className="btn btn-link btn-sm p-0 ms-1 text-danger" title="Remove" onClick={() => run(() => svc.deleteAlias(a.id), setFormError)}>×</button></span>
                        ))}
                      </div>
                      <div className="input-group">
                        <input className="form-control" placeholder="Add another name" value={form.newAlias} onChange={(e) => setForm({ ...form, newAlias: e.target.value })} />
                        <button type="button" className="btn btn-outline-primary" disabled={!form.newAlias.trim()}
                          onClick={async () => { if (await run(() => svc.addAlias(form.newAlias.trim(), { productId: editing.id }), setFormError)) setForm({ ...form, newAlias: '' }); }}>Add</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
                <button type="button" className="btn btn-primary save-product" onClick={saveForm}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPackages;
