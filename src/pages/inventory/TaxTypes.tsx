import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import { refreshTaxTypes } from '../../components/common/TaxSelector';

interface TaxTypeDto { id: number; name: string; description: string | null; isActive: boolean; createdAt: string }
const EMPTY = { name: '', description: '', isActive: true };

/** Inventory > Tax Types: the taxes that can be applied to products, quotations and purchase orders */
const TaxTypes: React.FC = () => {
  const [rows, setRows] = useState<TaxTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TaxTypeDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try { setRows((await api.get<TaxTypeDto[]>('/tax-types')).data); } catch { setRows([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setError(''); setShowForm(true); };
  const openEdit = (t: TaxTypeDto) => { setEditing(t); setForm({ name: t.name, description: t.description || '', isActive: t.isActive }); setError(''); setShowForm(true); };

  const save = async () => {
    if (!form.name.trim()) { setError('Enter the tax name.'); return; }
    setSaving(true); setError('');
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || null, isActive: form.isActive };
      if (editing) await api.put(`/tax-types/${editing.id}`, body); else await api.post('/tax-types', body);
      refreshTaxTypes();
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save the tax type.');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    try { await api.delete(`/tax-types/${deleteId}`); refreshTaxTypes(); await load(); } catch { /* ignore */ }
    setDeleteId(null);
  };

  const filtered = rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Tax Types</h4>
            <h6>Taxes you can apply to products, quotations and purchase orders</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" title="Refresh" onClick={(e) => { e.preventDefault(); load(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); openAdd(); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Tax Type
          </a>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <input type="text" className="form-control" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <small className="text-muted">The rate (%) is entered each time a tax is applied.</small>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table datatable">
              <thead className="thead-light">
                <tr><th>Tax type</th><th>Description</th><th>Status</th><th className="no-sort"></th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4">{rows.length === 0 ? 'No tax types yet. Click "Add Tax Type" to create one, e.g. GST.' : 'No tax types match your search.'}</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">{r.name}</td>
                    <td>{r.description || '-'}</td>
                    <td><span className={`badge ${r.isActive ? 'badge-success' : 'badge-secondary'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="action-table-data">
                      <div className="edit-delete-action d-flex align-items-center">
                        <a className="me-2 p-2 d-flex align-items-center border rounded" href="#" title="Edit" onClick={(e) => { e.preventDefault(); openEdit(r); }}><i className="ti ti-edit"></i></a>
                        <a className="p-2 d-flex align-items-center border rounded" href="#" title="Delete" onClick={(e) => { e.preventDefault(); setDeleteId(r.id); }}><i className="ti ti-trash"></i></a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editing ? 'Edit Tax Type' : 'Add Tax Type'}</h4>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Tax name <span className="text-danger">*</span></label>
                  <input className="form-control" maxLength={100} placeholder="e.g. GST, Sales Tax, WHT" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <input className="form-control" maxLength={300} placeholder="optional" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="tax-active" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  <label className="form-check-label" htmlFor="tax-active">Active (shown in the tax dropdowns)</label>
                </div>
                {error && <div className="alert alert-danger py-2 mt-3 mb-0">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={deleteId != null} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </>
  );
};

export default TaxTypes;
