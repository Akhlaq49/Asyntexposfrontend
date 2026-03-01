import React, { useEffect, useState } from 'react';
import { getAttendances, getEmployees, createAttendance, updateAttendance, deleteAttendance, Attendance, CreateAttendance, Employee } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const AttendanceAdmin: React.FC = () => {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateAttendance>({ employeeId: 0, date: new Date().toISOString().split('T')[0], status: 'Present', clockIn: '', clockOut: '', production: '', breakTime: '', overtime: '', totalHours: '' });

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, e] = await Promise.all([getAttendances(dateFilter || undefined), getEmployees()]);
      setRecords(a);
      setEmployees(e);
    } catch { showError('Failed to load attendance'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [dateFilter]);

  const filtered = records.filter(r => {
    const matchSearch = r.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditId(null);
    setForm({ employeeId: 0, date: dateFilter || new Date().toISOString().split('T')[0], status: 'Present', clockIn: '', clockOut: '', production: '', breakTime: '', overtime: '', totalHours: '' });
    setShowModal(true);
  };

  const openEdit = (r: Attendance) => {
    setEditId(r.id);
    setForm({ employeeId: r.employeeId, date: r.date.split('T')[0], status: r.status, clockIn: r.clockIn || '', clockOut: r.clockOut || '', production: r.production || '', breakTime: r.breakTime || '', overtime: r.overtime || '', totalHours: r.totalHours || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editId) { await updateAttendance(editId, form); showSuccess('Attendance updated'); }
      else { await createAttendance(form); showSuccess('Attendance added'); }
      setShowModal(false);
      load();
    } catch { showError('Failed to save attendance'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteAttendance(deleteId); showSuccess('Attendance deleted'); setShowDelete(false); load(); }
    catch { showError('Failed to delete'); }
  };

  const statusBadge = (s: string) => {
    const cls = s === 'Present' ? 'badge-success' : s === 'Absent' ? 'badge-danger' : 'badge-purple';
    return <span className={`badge ${cls} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{s}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Attendance</h4>
            <h6>Manage your Attendance</h6>
          </div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAdd(); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Attendance
          </a>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14"></i></span>
              <input type="text" className="form-control" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="me-2">
              <input type="date" className="form-control" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {statusFilter || 'Select Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter(''); }}>All</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('Present'); }}>Present</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('Absent'); }}>Absent</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('Holiday'); }}>Holiday</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center p-4">Loading...</div> : (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Production</th>
                    <th>Break</th>
                    <th>Overtime</th>
                    <th>Total Hours</th>
                    <th className="no-sort">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-md me-2">
                            <img src={r.employeePicture || '/assets/img/users/user-01.jpg'} alt="" />
                          </span>
                          <div>
                            <h6 className="mb-0">{r.employeeName}</h6>
                            <span className="fs-12 text-muted">{r.designationName || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{statusBadge(r.status)}</td>
                      <td>{r.clockIn || '-'}</td>
                      <td>{r.clockOut || '-'}</td>
                      <td>{r.production || '-'}</td>
                      <td>{r.breakTime || '-'}</td>
                      <td>{r.overtime || '-'}</td>
                      <td>{r.totalHours || '-'}</td>
                      <td>
                        <div className="edit-delete-action">
                          <a href="#" className="me-2 p-2" onClick={e => { e.preventDefault(); openEdit(r); }}>
                            <i className="ti ti-edit"></i>
                          </a>
                          <a href="#" className="p-2" onClick={e => { e.preventDefault(); setDeleteId(r.id); setShowDelete(true); }}>
                            <i className="ti ti-trash"></i>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-4 text-muted">No attendance records for this date</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Edit' : 'Add'} Attendance</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Employee</label>
                  <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: Number(e.target.value) })}>
                    <option value={0}>Select Employee</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Late">Late</option>
                  </select>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Clock In</label>
                    <input type="text" className="form-control" placeholder="09:00 AM" value={form.clockIn} onChange={e => setForm({ ...form, clockIn: e.target.value })} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Clock Out</label>
                    <input type="text" className="form-control" placeholder="06:00 PM" value={form.clockOut} onChange={e => setForm({ ...form, clockOut: e.target.value })} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Production</label>
                    <input type="text" className="form-control" placeholder="09h 00m" value={form.production} onChange={e => setForm({ ...form, production: e.target.value })} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Break</label>
                    <input type="text" className="form-control" placeholder="01h 00m" value={form.breakTime} onChange={e => setForm({ ...form, breakTime: e.target.value })} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Overtime</label>
                    <input type="text" className="form-control" placeholder="00h 30m" value={form.overtime} onChange={e => setForm({ ...form, overtime: e.target.value })} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Total Hours</label>
                    <input type="text" className="form-control" placeholder="09h 30m" value={form.totalHours} onChange={e => setForm({ ...form, totalHours: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={!form.employeeId}>{editId ? 'Update' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center pt-4">
                <div className="mb-3"><i className="ti ti-trash fs-36 text-danger"></i></div>
                <h4>Delete Attendance Record?</h4>
                <p className="text-muted">This action cannot be undone.</p>
                <div className="d-flex justify-content-center gap-2 mt-3">
                  <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceAdmin;

