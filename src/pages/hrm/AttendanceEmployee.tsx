import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAttendances, Attendance } from '../../services/hrmService';

const AttendanceEmployee: React.FC = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // For demo, use employeeId=1 – in real app, get from auth context
  const employeeId = 1;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { const data = await getAttendances(undefined, employeeId); setRecords(data); }
      catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const todayStr = currentTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const greeting = currentTime.getHours() < 12 ? t('hrm.good_morning') : currentTime.getHours() < 17 ? t('hrm.good_afternoon') : t('hrm.good_evening');

  // Days overview stats for current month
  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const thisMonth = records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const present = thisMonth.filter(r => r.status === 'Present').length;
    const absent = thisMonth.filter(r => r.status === 'Absent').length;
    const halfDay = thisMonth.filter(r => r.status === 'Half Day').length;
    const late = thisMonth.filter(r => r.status === 'Late').length;
    const holiday = thisMonth.filter(r => r.status === 'Holiday').length;
    return { total: daysInMonth, present, absent, halfDay, late, holiday };
  }, [records]);

  const filtered = records.filter(r => {
    const matchSearch = r.date.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (s: string) => {
    const cls = s === 'Present' ? 'badge-success' : s === 'Absent' ? 'badge-danger' : s === 'Holiday' ? 'badge-purple' : 'badge-warning';
    const statusMap: Record<string, string> = { Present: t('hrm.present'), Absent: t('hrm.absent'), Holiday: t('hrm.holiday'), 'Half Day': t('hrm.half_day'), Late: t('hrm.late') };
    return <span className={`badge ${cls} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{statusMap[s] || s}</span>;
  };

  const progressBar = (r: Attendance) => {
    if (r.status === 'Absent' || r.status === 'Holiday') {
      return <div className="progress attendance bg-secondary-transparent"></div>;
    }
    // Simple visual: production=60%, break=20%, overtime=10%
    return (
      <div className="progress attendance bg-secondary-transparent">
        <div className="progress-bar progress-bar-success" role="progressbar" style={{ width: '60%' }}></div>
        {r.breakTime && r.breakTime !== '-' && <div className="progress-bar progress-bar-warning" role="progressbar" style={{ width: '20%' }}></div>}
        {r.overtime && r.overtime !== '-' && r.overtime !== '00h 00m' && <div className="progress-bar progress-bar-danger" role="progressbar" style={{ width: '10%' }}></div>}
      </div>
    );
  };

  return (
    <>
      {/* Greeting Header */}
      <div className="attendance-header">
        <div className="attendance-content">
          <h3>👋 {greeting}, <span>{t('hrm.employee')}</span></h3>
        </div>
      </div>

      <div className="row">
        {/* Clock Card */}
        <div className="col-xl-4 col-lg-12 d-flex">
          <div className="card w-100">
            <div className="card-body">
              <h5 className="mb-3 pb-3 border-bottom d-flex justify-content-between align-items-center fs-18">
                {t('hrm.attendance')}<span className="text-purple fs-14">{todayStr}</span>
              </h5>
              <div className="d-flex align-items-center mb-3">
                <div className="me-3">
                  <i className="ti ti-clock fs-36 text-primary"></i>
                </div>
                <div>
                  <h2 className="mb-0">{timeStr}</h2>
                  <p className="text-muted mb-0">{t('hrm.current_time')}</p>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <a href="#" className="btn btn-primary w-100 me-2" onClick={e => e.preventDefault()}>{t('hrm.clock_in')}</a>
                <a href="#" className="btn btn-secondary w-100 me-2" onClick={e => e.preventDefault()}>{t('hrm.break_time')}</a>
              </div>
            </div>
          </div>
        </div>

        {/* Days Overview */}
        <div className="col-xl-8 col-lg-12 d-flex">
          <div className="card w-100">
            <div className="card-body">
              <h5 className="border-bottom pb-3 mb-3">{t('hrm.days_overview_this_month')}</h5>
              <div className="row gy-3">
                <div className="col-lg-2 col-md-3 col-sm-4 text-center">
                  <span className="d-flex align-items-center justify-content-center avatar avatar-xl bg-primary-transparent fw-bold fs-20 mb-2 mx-auto">
                    {String(stats.total).padStart(2, '0')}
                  </span>
                  <p className="fs-14">{t('hrm.total_working_days')}</p>
                </div>
                <div className="col-lg-2 col-md-3 col-sm-4 text-center">
                  <span className="d-flex align-items-center justify-content-center avatar avatar-xl bg-danger-transparent fw-bold fs-20 mb-2 mx-auto">
                    {String(stats.absent).padStart(2, '0')}
                  </span>
                  <p className="fs-14">{t('hrm.absent_days')}</p>
                </div>
                <div className="col-lg-2 col-md-3 col-sm-4 text-center">
                  <span className="d-flex align-items-center justify-content-center avatar avatar-xl bg-purple-transparent text-purple fw-bold fs-20 mb-2 mx-auto">
                    {String(stats.present).padStart(2, '0')}
                  </span>
                  <p className="fs-14">{t('hrm.present_days')}</p>
                </div>
                <div className="col-lg-2 col-md-3 col-sm-4 text-center">
                  <span className="d-flex align-items-center justify-content-center avatar avatar-xl bg-warning-transparent fw-bold fs-20 mb-2 mx-auto">
                    {String(stats.halfDay).padStart(2, '0')}
                  </span>
                  <p className="fs-14">{t('hrm.half_days')}</p>
                </div>
                <div className="col-lg-2 col-md-3 col-sm-4 text-center">
                  <span className="d-flex align-items-center justify-content-center avatar avatar-xl bg-cyan-transparent text-cyan fw-bold fs-20 mb-2 mx-auto">
                    {String(stats.late).padStart(2, '0')}
                  </span>
                  <p className="fs-14">{t('hrm.late_days')}</p>
                </div>
                <div className="col-lg-2 col-md-3 col-sm-4 text-center">
                  <span className="d-flex align-items-center justify-content-center avatar avatar-xl bg-success-transparent text-success fw-bold fs-20 mb-2 mx-auto">
                    {String(stats.holiday).padStart(2, '0')}
                  </span>
                  <p className="fs-14">{t('hrm.holidays')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14"></i></span>
              <input type="text" className="form-control" placeholder={t('common.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
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
                    <th>{t('common.date')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('hrm.clock_in')}</th>
                    <th>{t('hrm.clock_out')}</th>
                    <th>{t('hrm.production')}</th>
                    <th>{t('hrm.break_time')}</th>
                    <th>{t('hrm.overtime')}</th>
                    <th>{t('hrm.progress')}</th>
                    <th>{t('hrm.total_hours')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>{r.clockIn || '-'}</td>
                      <td>{r.clockOut || '-'}</td>
                      <td>{r.production || '-'}</td>
                      <td>{r.breakTime || '-'}</td>
                      <td>{r.overtime || '-'}</td>
                      <td>{progressBar(r)}</td>
                      <td>{r.totalHours || '-'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-4 text-muted">{t('hrm.no_attendance_records')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AttendanceEmployee;

