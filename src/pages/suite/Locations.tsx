import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/suite/Modal';
import { ProductSearch } from '../../components/suite/Pickers';
import suite, { LOCATION_TYPES, Location } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

const blank: Partial<Location> = { code: '', name: '', type: 'Branch', parentId: null, address: '', phone: '', drugLicenceNo: '', isDefault: false, sellsOnline: false, isActive: true };

/** Branches, warehouses and other stock-holding locations, with min/max levels per location. */
const Locations: React.FC = () => {
  const [rows, setRows] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Location> | null>(null);
  const [levelsFor, setLevelsFor] = useState<Location | null>(null);
  const [levels, setLevels] = useState<{ productId: number; productName: string; minQty: number; maxQty: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await suite.locations(true)); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load locations', text: apiError(err) }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!edit?.name?.trim()) { Swal.fire({ icon: 'info', title: 'Enter a name' }); return; }
    setSaving(true);
    try {
      await suite.saveLocation(edit.id ?? null, edit);
      setEdit(null);
      void load();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
    finally { setSaving(false); }
  };

  const remove = async (l: Location) => {
    const ok = await Swal.fire({ icon: 'warning', title: `Remove ${l.name}?`, text: 'A location with history is made inactive instead of deleted.', showCancelButton: true, confirmButtonText: 'Remove' });
    if (!ok.isConfirmed) return;
    try { await suite.deleteLocation(l.id); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not remove', text: apiError(err) }); }
  };

  const openLevels = async (l: Location) => {
    setLevelsFor(l);
    try { setLevels(await suite.levels(l.id)); } catch { setLevels([]); }
  };

  const saveLevels = async () => {
    if (!levelsFor) return;
    setSaving(true);
    try {
      await suite.saveLevels(levelsFor.id, levels.map(({ productId, minQty, maxQty }) => ({ productId, minQty, maxQty })));
      Swal.fire({ icon: 'success', title: 'Levels saved', timer: 1200, showConfirmButton: false });
      setLevelsFor(null);
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not save levels', text: apiError(err) }); }
    finally { setSaving(false); }
  };

  const nameOf = (id?: number | null) => rows.find((r) => r.id === id)?.name ?? '';
  const typeLabel = (t: string) => LOCATION_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <>
      <PageHeader title="Branches & Warehouses" subtitle="Every place that holds stock. Each sale, purchase and transfer belongs to one of these."
        breadcrumbs={[{ title: 'Stock' }, { title: 'Branches & Warehouses' }]}
        actions={<button type="button" className="btn btn-primary" onClick={() => setEdit({ ...blank })}><i className="ti ti-plus me-1" />Add location</button>} />
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Supplied by</th><th>Phone</th><th>Drug licence</th><th /><th /></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>}
                {!loading && rows.map((l) => (
                  <tr key={l.id} className={l.isActive ? '' : 'text-muted'}>
                    <td className="fw-medium">{l.code}</td>
                    <td>
                      {l.name}
                      {l.isDefault && <span className="badge bg-primary ms-2">Default</span>}
                      {l.sellsOnline && <span className="badge bg-info ms-1">Online stock</span>}
                      {!l.isActive && <span className="badge bg-secondary ms-1">Inactive</span>}
                    </td>
                    <td>{typeLabel(l.type)}</td>
                    <td>{nameOf(l.parentId)}</td>
                    <td>{l.phone}</td>
                    <td>{l.drugLicenceNo}</td>
                    <td><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void openLevels(l)}>Min / max stock</button></td>
                    <td className="text-end text-nowrap">
                      <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => setEdit({ ...l })} aria-label={`Edit ${l.name}`}><i className="ti ti-edit" /></button>
                      {!l.isDefault && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void remove(l)} aria-label={`Remove ${l.name}`}><i className="ti ti-trash" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal show={!!edit} title={edit?.id ? `Edit ${edit.name}` : 'Add location'} onClose={() => setEdit(null)} size="lg"
        footer={<><button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-1" />}Save</button></>}>
        {edit && (
          <div className="row g-3">
            <div className="col-md-4"><label className="form-label">Code</label>
              <input className="form-control text-uppercase" maxLength={20} value={edit.code ?? ''} placeholder="e.g. BR-01" onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></div>
            <div className="col-md-8"><label className="form-label">Name</label>
              <input className="form-control" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Type</label>
              <select className="form-select" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Location['type'] })}>
                {LOCATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
            <div className="col-md-6"><label className="form-label">Supplied by (for requisitions)</label>
              <select className="form-select" value={edit.parentId ?? ''} onChange={(e) => setEdit({ ...edit, parentId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">None</option>
                {rows.filter((r) => r.id !== edit.id && r.isActive).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></div>
            <div className="col-12"><label className="form-label">Address</label>
              <input className="form-control" value={edit.address ?? ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Phone</label>
              <input className="form-control" value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="col-md-6"><label className="form-label">Drug licence no.</label>
              <input className="form-control" value={edit.drugLicenceNo ?? ''} onChange={(e) => setEdit({ ...edit, drugLicenceNo: e.target.value })} /></div>
            <div className="col-12 d-flex flex-wrap gap-4">
              <label className="form-check"><input type="checkbox" className="form-check-input" checked={!!edit.isDefault} onChange={(e) => setEdit({ ...edit, isDefault: e.target.checked })} /><span className="form-check-label">Default location (new stock goes here)</span></label>
              <label className="form-check"><input type="checkbox" className="form-check-input" checked={!!edit.sellsOnline} onChange={(e) => setEdit({ ...edit, sellsOnline: e.target.checked })} /><span className="form-check-label">Web store sells from this stock</span></label>
              <label className="form-check"><input type="checkbox" className="form-check-input" checked={edit.isActive !== false} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /><span className="form-check-label">Active</span></label>
            </div>
          </div>
        )}
      </Modal>

      <Modal show={!!levelsFor} title={`Min / max stock at ${levelsFor?.name ?? ''}`} onClose={() => setLevelsFor(null)} size="lg"
        footer={<><button type="button" className="btn btn-light" onClick={() => setLevelsFor(null)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => void saveLevels()} disabled={saving}>Save levels</button></>}>
        <p className="text-muted fs-13">When stock here falls below the minimum, "Generate reorder" on the Requisitions page asks the supplying warehouse to top it up to the maximum. Quantities are in single units.</p>
        <div className="mb-3"><ProductSearch onPick={(p) => !levels.some((l) => l.productId === p.id) && setLevels([...levels, { productId: p.id, productName: p.productName, minQty: 0, maxQty: 0 }])} placeholder="Add a product" /></div>
        <table className="table table-sm align-middle">
          <thead><tr><th>Product</th><th style={{ width: 120 }}>Minimum</th><th style={{ width: 120 }}>Maximum</th><th /></tr></thead>
          <tbody>
            {levels.length === 0 && <tr><td colSpan={4} className="text-muted">No levels set.</td></tr>}
            {levels.map((l, i) => (
              <tr key={l.productId}>
                <td>{l.productName}</td>
                <td><input type="number" min={0} className="form-control form-control-sm" value={l.minQty} aria-label={`Minimum for ${l.productName}`}
                  onChange={(e) => setLevels(levels.map((x, j) => (j === i ? { ...x, minQty: Number(e.target.value) } : x)))} /></td>
                <td><input type="number" min={0} className="form-control form-control-sm" value={l.maxQty} aria-label={`Maximum for ${l.productName}`}
                  onChange={(e) => setLevels(levels.map((x, j) => (j === i ? { ...x, maxQty: Number(e.target.value) } : x)))} /></td>
                <td><button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setLevels(levels.map((x, j) => (j === i ? { ...x, minQty: 0, maxQty: 0 } : x)))}>Clear</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </>
  );
};

export default Locations;
