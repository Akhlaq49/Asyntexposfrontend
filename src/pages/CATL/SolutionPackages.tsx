import React, { useEffect, useState } from 'react';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import {
  solutionPackageService as svc, SolutionData, SolutionGroup, SolutionLine, MoveKind, SolutionUsage,
} from '../../services/CATL/solutionPackageService';
import { catalogService, CatalogSize } from '../../services/CATL/catalogService';
import CatalogPackages from './CatalogPackages';
import CatalogImport from './CatalogImport';
import DrawingRules from './DrawingRules';

type Tab = 'packages' | 'categorization' | 'import' | 'rules';

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

/** what the name / line / item form is editing */
type NameForm = { kind: 'group' | 'size'; id: number | null; name: string };
type LineForm = { id: number | null; groupId: number; name: string; inStandard: boolean; inPremium: boolean };
type DeleteTarget = { kind: 'group' | 'line' | 'size'; id: number; label: string; message: string };

const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;

/**
 * Inventory > Solution Packages - the company's product catalogue:
 *  - Package quantities: how many of each product a building of each size needs, per tier (CatalogPackages)
 *  - Product categorization: categories and families, and the tiers (Standard / Premium) each family is in
 *  - Import: the company's categorization and package-items files; names to map
 *  - Drawing rules: which products each rule of the drawing reader uses
 */
const SolutionPackages: React.FC = () => {
  const [tab, setTab] = useState<Tab>('packages');
  const [data, setData] = useState<SolutionData>({ groups: [], sizes: [] });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  // the catalogue tabs reload when the sizes or the families change here
  const [catalogKey, setCatalogKey] = useState(0);
  const [familyProducts, setFamilyProducts] = useState<Record<number, number>>({});

  const [nameForm, setNameForm] = useState<NameForm | null>(null);
  const [lineForm, setLineForm] = useState<LineForm | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null);

  const load = async () => {
    setLoading(true); setPageError('');
    try { setData(await svc.getAll()); } catch (err) { setPageError(errorText(err, 'Could not load the solution packages.')); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    catalogService.get().then((c) => {
      const counts: Record<number, number> = {};
      c.products.forEach((p) => { if (p.familyId) counts[p.familyId] = (counts[p.familyId] || 0) + 1; });
      setFamilyProducts(counts);
    }).catch(() => setFamilyProducts({}));
  }, [catalogKey]);

  /** runs a change; the server answers with all the data again */
  const run = async (action: () => Promise<SolutionData>, onError?: (msg: string) => void) => {
    try { setData(await action()); setPageError(''); setCatalogKey((k) => k + 1); return true; }
    catch (err) { const msg = errorText(err, 'Could not save the change.'); (onError || setPageError)(msg); return false; }
  };
  const move = (kind: MoveKind, id: number, dir: -1 | 1) => run(() => svc.move(kind, id, dir));

  // ── forms ──
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
    await run(() => (kind === 'group' ? svc.deleteGroup(id) : kind === 'line' ? svc.deleteLine(id) : svc.deleteSize(id)));
    setToDelete(null);
  };

  const linkedCount = (lineId: number) => familyProducts[lineId] || 0;
  const deleteGroup = (g: SolutionGroup) => setToDelete({ kind: 'group', id: g.id, label: g.name,
    message: `Delete the group "${g.name}" and its ${g.lines.length} famil${g.lines.length === 1 ? 'y' : 'ies'}? Products in them get no family.` });
  const deleteLine = (l: SolutionLine) => setToDelete({ kind: 'line', id: l.id, label: l.name,
    message: `Delete "${l.name}" from the categorization?${linkedCount(l.id) ? ` ${linkedCount(l.id)} product(s) are in it and get no family.` : ''}` });
  const deleteSize = (s: CatalogSize) => setToDelete({ kind: 'size', id: s.id, label: s.name, message: `Delete the "${s.name}" column? Its package quantities are no longer used.` });

  // the name shown on each small action button (the full action stays in the tooltip)
  const BUTTON_NAMES: Record<string, string> = { 'ti-chevron-left': 'Left', 'ti-chevron-right': 'Right', 'ti-arrow-up': 'Up', 'ti-arrow-down': 'Down', 'ti-trash': 'Delete' };
  const IconBtn: React.FC<{ icon: string; title: string; onClick: () => void; disabled?: boolean; className?: string }> = ({ icon, title, onClick, disabled, className }) => (
    <button type="button" className={`btn btn-sm btn-action ${icon === 'ti-trash' ? 'btn-outline-danger' : icon === 'ti-edit' ? 'btn-outline-primary' : 'btn-outline-secondary'} ${className || ''}`} title={title} disabled={disabled}
      onClick={onClick}>{BUTTON_NAMES[icon] ?? (title.startsWith('Rename') ? 'Rename' : 'Edit')}</button>
  );


  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Solution Packages</h4>
            <h6>Your products, the quantities each building size needs per tier, and which products the Standard and Premium solutions use</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a className="btn btn-sm btn-outline-secondary btn-action" href="#" title="Refresh" onClick={(e) => { e.preventDefault(); load(); setCatalogKey((k) => k + 1); }}>Refresh</a></li>
        </ul>
        <div className="page-btn d-flex gap-2">
          {tab === 'packages' ? (
            <button type="button" className="btn btn-outline-primary" onClick={() => { setFormError(''); setNameForm({ kind: 'size', id: null, name: '' }); }}>
              <i className="ti ti-columns-3 me-1"></i>Add Building Size
            </button>
          ) : tab !== 'categorization' ? null : (
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
        <li className="nav-item"><a href="#" className={`nav-link ${tab === 'import' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setTab('import'); }}>
          <i className="ti ti-file-import me-1"></i>Import</a></li>
        <li className="nav-item"><a href="#" className={`nav-link ${tab === 'rules' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setTab('rules'); }}>
          <i className="ti ti-route me-1"></i>Drawing Rules</a></li>
      </ul>

      {pageError && <div className="alert alert-danger py-2">{pageError}</div>}

      {tab === 'packages' ? (
        <CatalogPackages reloadKey={catalogKey} sizeHeader={(sz, idx, count) => (
          <>
            <div className="text-nowrap">{sz.name}</div>
            <div className="d-flex justify-content-center gap-1 mt-1">
              <IconBtn icon="ti-chevron-left" title="Move left" disabled={idx === 0} onClick={() => move('sizes', sz.id, -1)} />
              <IconBtn icon="ti-edit" title="Rename" onClick={() => { setFormError(''); setNameForm({ kind: 'size', id: sz.id, name: sz.name }); }} />
              <IconBtn icon="ti-trash" title="Delete column" onClick={() => deleteSize(sz)} />
              <IconBtn icon="ti-chevron-right" title="Move right" disabled={idx === count - 1} onClick={() => move('sizes', sz.id, 1)} />
            </div>
          </>
        )} />
      ) : tab === 'import' ? (
        <CatalogImport onChanged={() => { load(); setCatalogKey((k) => k + 1); }} />
      ) : tab === 'rules' ? (
        <DrawingRules />
      ) : (
        <div className="card">
          <div className="card-header">
            <small className="text-muted">Tick the solutions each product is used in. <b>Standard only</b> or <b>Premium only</b>: used only in that package. <b>Both</b>: used in Standard and Premium; on a Premium solution (Drawing to Solution) you are asked only when a Premium-only product of the same group can be used instead.</small>
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
                    <th className="text-center" style={{ width: 130 }}>Products</th>
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

      <AdminDeleteModal show={toDelete != null} onClose={() => setToDelete(null)} onConfirm={confirmDelete}
        title={toDelete ? `Delete ${toDelete.label}` : undefined} message={toDelete?.message} />
    </>
  );
};

export default SolutionPackages;
