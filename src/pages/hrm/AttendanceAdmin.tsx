import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAttendances, getEmployees, createAttendance, updateAttendance, deleteAttendance, Attendance, CreateAttendance, Employee } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';

const AttendanceAdmin: React.FC = () => {
  const { t } = useTranslation();
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
    } catch { showError(t('hrm.failed_load_attendance')); }
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
      if (editId) { await updateAttendance(editId, form); showSuccess(t('hrm.attendance_updated')); }
      else { await createAttendance(form); showSuccess(t('hrm.attendance_added')); }
      setShowModal(false);
      load();
    } catch { showError(t('hrm.failed_save_attendance')); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAttendance(deleteId); showSuccess(t('hrm.attendance_deleted')); setShowDelete(false); load();
  };

  const statusBadge = (s: string) => {
    const cls = s === 'Present' ? 'badge-success' : s === 'Absent' ? 'badge-danger' : 'badge-purple';
    const statusMap: Record<string, string> = { Present: t('hrm.present'), Absent: t('hrm.absent'), Holiday: t('hrm.holiday'), 'Half Day': t('hrm.half_day'), Late: t('hrm.late') };
    return <span className={`badge ${cls} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{statusMap[s] || s}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>{t('hrm.attendance')}</h4>
            <h6>{t('hrm.manage_attendance')}</h6>
          </div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAdd(); }}>
            <i className="ti ti-circle-plus me-1"></i>{t('hrm.add_attendance')}
          </a>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14"></i></span>
              <input type="text" className="form-control" placeholder={t('hrm.search_employee')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="me-2">
              <input type="date" className="form-control" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {statusFilter ? {Present: t('hrm.present'), Absent: t('hrm.absent'), Holiday: t('hrm.holiday')}[statusFilter] || statusFilter : t('hrm.select_status')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter(''); }}>{t('common.all')}</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('Present'); }}>{t('hrm.present')}</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('Absent'); }}>{t('hrm.absent')}</a></li>
                <li><a href="#" className="dropdown-item rounded-1" onClick={e => { e.preventDefault(); setStatusFilter('Holiday'); }}>{t('hrm.holiday')}</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center p-4">{t('common.loading')}</div> : (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th>{t('hrm.employee')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('hrm.clock_in')}</th>
                    <th>{t('hrm.clock_out')}</th>
                    <th>{t('hrm.production')}</th>
                    <th>{t('hrm.break_time')}</th>
                    <th>{t('hrm.overtime')}</th>
                    <th>{t('hrm.total_hours')}</th>
                    <th className="no-sort">{t('common.actions')}</th>
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
                    <tr><td colSpan={9} className="text-center py-4 text-muted">{t('hrm.no_attendance_records_date')}</td></tr>
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
                <h5 className="modal-title">{editId ? t('hrm.edit_attendance') : t('hrm.add_attendance')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">{t('hrm.employee')}</label>
                  <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: Number(e.target.value) })}>
                    <option value={0}>{t('hrm.select_employee')}</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('common.date')}</label>
                  <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('common.status')}</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Present">{t('hrm.present')}</option>
                    <option value="Absent">{t('hrm.absent')}</option>
                    <option value="Holiday">{t('hrm.holiday')}</option>
                    <option value="Half Day">{t('hrm.half_day')}</option>
                    <option value="Late">{t('hrm.late')}</option>
                  </select>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('hrm.clock_in')}</label>
                    <input type="text" className="form-control" placeholder="09:00 AM" value={form.clockIn} onChange={e => setForm({ ...form, clockIn: e.target.value })} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('hrm.clock_out')}</label>
                    <input type="text" className="form-control" placeholder="06:00 PM" value={form.clockOut} onChange={e => setForm({ ...form, clockOut: e.target.value })} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('hrm.production')}</label>
                    <input type="text" className="form-control" placeholder="09h 00m" value={form.production} onChange={e => setForm({ ...form, production: e.target.value })} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('hrm.break_time')}</label>
                    <input type="text" className="form-control" placeholder="01h 00m" value={form.breakTime} onChange={e => setForm({ ...form, breakTime: e.target.value })} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('hrm.overtime')}</label>
                    <input type="text" className="form-control" placeholder="00h 30m" value={form.overtime} onChange={e => setForm({ ...form, overtime: e.target.value })} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('hrm.total_hours')}</label>
                    <input type="text" className="form-control" placeholder="09h 30m" value={form.totalHours} onChange={e => setForm({ ...form, totalHours: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={!form.employeeId}>{editId ? t('common.update') : t('common.save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <AdminDeleteModal show={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} />
    </>
  );
};

export default AttendanceAdmin;

