import React, { useState } from 'react';
import { roleService, RoleDto } from '../../services/roleService';

interface Props {
  roles: RoleDto[];
  /** after any change: reload the list (and follow a rename / delete of the selected role) */
  onChanged: (change?: { renamedFrom?: string; renamedTo?: string; deleted?: string }) => void;
}

const errText = (e: any, fallback: string) => e?.response?.data?.message || fallback;

/** Add, rename and delete the company's staff roles (Admin is built in) */
const ManageRoles: React.FC<Props> = ({ roles, onChanged }) => {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ type: 'danger', text: errText(e, 'Could not save.') }); }
    setBusy(false);
  };

  const add = () => run(async () => {
    const r = await roleService.create(newName);
    setNewName(''); setMsg({ type: 'success', text: `Role "${r.name}" added. Choose it above to give it menu access.` }); onChanged();
  });
  const rename = (role: RoleDto) => run(async () => {
    const r = await roleService.rename(role.id, editName);
    setEditId(null);
    setMsg({ type: 'success', text: `"${role.name}" renamed to "${r.name}"${role.users ? ` - its ${role.users} user(s) and menu access moved with it` : ''}.` });
    onChanged({ renamedFrom: role.name, renamedTo: r.name });
  });
  const remove = (role: RoleDto) => {
    if (!window.confirm(`Delete the role "${role.name}"?`)) return;
    run(async () => {
      await roleService.remove(role.id);
      setMsg({ type: 'success', text: `Role "${role.name}" deleted.` }); onChanged({ deleted: role.name });
    });
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 className="mb-0">Roles</h5>
        <div className="d-flex gap-2" style={{ minWidth: 320 }}>
          <input className="form-control" placeholder="New role, e.g. Technician" maxLength={50} value={newName}
            onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && !busy) add(); }} />
          <button type="button" className="btn btn-primary text-nowrap" disabled={busy || !newName.trim()} onClick={add}><i className="ti ti-plus me-1" />Add role</button>
        </div>
      </div>
      <div className="card-body p-0">
        {msg && <div className={`alert alert-${msg.type} py-2 m-3 mb-0`}>{msg.text}</div>}
        <div className="table-responsive">
          <table className="table table-sm mb-0 align-middle">
            <thead className="thead-light"><tr><th className="ps-3">Role</th><th className="text-center">Users</th><th className="text-end pe-3" /></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td className="ps-3">
                    {editId === r.id ? (
                      <div className="d-flex gap-2" style={{ maxWidth: 360 }}>
                        <input className="form-control form-control-sm" autoFocus maxLength={50} value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !busy) rename(r); if (e.key === 'Escape') setEditId(null); }} />
                        <button type="button" className="btn btn-sm btn-success" disabled={busy || !editName.trim()} onClick={() => rename(r)}>Save</button>
                        <button type="button" className="btn btn-sm btn-light" onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <>{r.name}{r.isSystem && <span className="badge bg-secondary ms-2" title="Built in: full access, can't be renamed or deleted">Built in</span>}</>
                    )}
                  </td>
                  <td className="text-center">{r.users}</td>
                  <td className="text-end pe-3 text-nowrap">
                    {!r.isSystem && editId !== r.id && (
                      <>
                        <button type="button" className="btn btn-sm btn-outline-primary me-1" title="Rename" disabled={busy} onClick={() => { setEditId(r.id); setEditName(r.name); setMsg(null); }}><i className="ti ti-edit" /></button>
                        <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy || r.users > 0}
                          title={r.users > 0 ? `${r.users} user(s) have this role - give them another role first` : 'Delete'} onClick={() => remove(r)}><i className="ti ti-trash" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageRoles;
