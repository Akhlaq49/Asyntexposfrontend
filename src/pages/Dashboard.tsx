import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDashboardData, DashboardData } from '../services/dashboardService';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await getDashboardData();
        setData(result);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n: number) => n.toLocaleString('en-US');

  const pctBadge = (pct: number) => {
    if (pct > 0) return <span className="text-success"><i className="ti ti-arrow-up me-1"></i>{pct}%</span>;
    if (pct < 0) return <span className="text-danger"><i className="ti ti-arrow-down me-1"></i>{Math.abs(pct)}%</span>;
    return <span className="text-muted">0%</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { active: 'bg-success', completed: 'bg-info', defaulted: 'bg-danger', cancelled: 'bg-secondary', overdue: 'bg-danger', due: 'bg-warning', upcoming: 'bg-primary', partial: 'bg-warning' };
    return <span className={`badge fw-medium fs-10 ${map[status] || 'bg-secondary'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">{t('common.loading')}</span></div>
        <p className="mt-2 text-muted">{t('common.loading_dashboard')}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="alert alert-danger">{t('common.failed_load_dashboard')}</div>;
  }

  // Always bucket dashboard lists using Pakistan local date (based on dueDate string),
  // so UI stays correct even if backend "status" is stale or timezone-shifted.
  const todayPakStr = (() => {
    // en-CA returns `YYYY-MM-DD` which matches your stored dueDate format.
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' });
    return fmt.format(new Date());
  })();

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return '';
    const parts = dueDate.split('-'); // expected: yyyy-MM-dd
    if (parts.length !== 3) return dueDate;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  };

  const derivedStatusFromDueDate = (dueDate?: string): 'due' | 'upcoming' | 'overdue' => {
    if (!dueDate) return 'upcoming';
    if (dueDate === todayPakStr) return 'due';
    if (dueDate > todayPakStr) return 'upcoming';
    return 'overdue';
  };

  const dueTodayItems = [...(data.upcomingDues ?? []), ...(data.overdueList ?? [])].filter(d => d.dueDate === todayPakStr);
  // Backend already returns overdue-only items. Keep list as-is to avoid
  // timezone/date-string re-filtering that can hide valid overdue rows.
  const overdueItems = data.overdueList ?? [];

  const currentMonthPrefix = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  })();

  const upcomingThisMonth = (data.upcomingList ?? []).filter(item => item.dueDate?.startsWith(currentMonthPrefix));

  // Chart data
  const maxExpected = Math.max(...data.monthlyCollections.map(m => Math.max(m.collected, m.expected)), 1);
  const totalStatus = data.statusDistribution.active + data.statusDistribution.completed + data.statusDistribution.defaulted + data.statusDistribution.cancelled;
  const pctActive = totalStatus > 0 ? Math.round((data.statusDistribution.active / totalStatus) * 100) : 0;
  const pctCompleted = totalStatus > 0 ? Math.round((data.statusDistribution.completed / totalStatus) * 100) : 0;
  const pctDefaulted = totalStatus > 0 ? Math.round((data.statusDistribution.defaulted / totalStatus) * 100) : 0;
  // remaining percentage fills the donut automatically via conic-gradient

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">{t('dashboard.title')}</h4>
            <h6>{t('dashboard.subtitle')}</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" title={t('common.refresh')} onClick={(e) => { e.preventDefault(); window.location.reload(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="row">
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.total_plans')}</p>
                <h2 className="mb-0">{fmtInt(data.totalPlans)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-primary-transparent">
                <i className="ti ti-file-text fs-24 text-primary"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">{pctBadge(data.plansPctChange)} {t('common.vs_last_month')} ({data.plansThisMonth} {t('dashboard.new')})</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.active_plans')}</p>
                <h2 className="mb-0">{fmtInt(data.activePlans)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-success-transparent">
                <i className="ti ti-check fs-24 text-success"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">{fmtInt(data.completedPlans)} {t('dashboard.completed')} &bull; {fmtInt(data.statusDistribution.defaulted)} {t('dashboard.defaulted')}</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.total_customers')}</p>
                <h2 className="mb-0">{fmtInt(data.totalCustomers)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-warning-transparent">
                <i className="ti ti-users fs-24 text-warning"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0"><span className="text-success">{data.customersThisMonth}</span> {t('common.new_this_month')}</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.overdue')}</p>
                <h2 className="mb-0 text-danger">{fmtInt(data.overdueCount)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-danger-transparent">
                <i className="ti ti-alert-triangle fs-24 text-danger"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">{t('common.rs')} {fmt(data.overdueAmount)} {t('dashboard.overdue_amount')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2 - Financial */}
      <div className="row">
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.total_financed')}</p>
                <h3 className="mb-0">{t('common.rs')} {fmt(data.totalFinancedAmount)}</h3>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-info-transparent">
                <i className="ti ti-currency-dollar fs-24 text-info"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.total_collected')}</p>
                <h3 className="mb-0 text-success">{t('common.rs')} {fmt(data.totalCollected)}</h3>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-success-transparent">
                <i className="ti ti-cash fs-24 text-success"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">{pctBadge(data.collectionsPctChange)} {t('common.vs_last_month')}</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.outstanding')}</p>
                <h3 className="mb-0 text-warning">{t('common.rs')} {fmt(data.totalOutstanding)}</h3>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-warning-transparent">
                <i className="ti ti-clock fs-24 text-warning"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">{t('dashboard.down_payments')}</p>
                <h3 className="mb-0">{t('common.rs')} {fmt(data.totalDownPayments)}</h3>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-primary-transparent">
                <i className="ti ti-arrow-down-circle fs-24 text-primary"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row">
        {/* Monthly Collections Bar Chart */}
        <div className="col-xxl-8 col-lg-7 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0"><i className="ti ti-chart-bar me-2"></i>{t('dashboard.monthly_collections_vs_expected')}</h5>
              <div>
                <span className="badge bg-success me-2"><i className="ti ti-circle-filled me-1"></i>{t('dashboard.collected')}</span>
                <span className="badge bg-light text-dark"><i className="ti ti-circle-filled me-1 text-muted"></i>{t('dashboard.expected')}</span>
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-end gap-1 justify-content-between" style={{ height: 220 }}>
                {data.monthlyCollections.map((m, i) => (
                  <div key={i} className="text-center flex-fill" style={{ maxWidth: 60 }}>
                    <div className="d-flex align-items-end justify-content-center gap-1" style={{ height: 190 }}>
                      <div
                        data-bs-toggle="tooltip"
                        title={`Expected: Rs ${fmt(m.expected)}`}
                        style={{
                          width: 14,
                          height: Math.max(4, (m.expected / maxExpected) * 180),
                          background: '#E8E8E8',
                          borderRadius: 3
                        }}
                      ></div>
                      <div
                        data-bs-toggle="tooltip"
                        title={`Collected: Rs ${fmt(m.collected)}`}
                        style={{
                          width: 14,
                          height: Math.max(4, (m.collected / maxExpected) * 180),
                          background: m.collected >= m.expected ? '#28C76F' : '#FE9F43',
                          borderRadius: 3
                        }}
                      ></div>
                    </div>
                    <small className="text-muted d-block mt-1" style={{ fontSize: 10 }}>{m.month.split(' ')[0]}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Plan Status Distribution Donut */}
        <div className="col-xxl-4 col-lg-5 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <h5 className="card-title mb-0"><i className="ti ti-chart-donut me-2"></i>{t('dashboard.plan_status')}</h5>
            </div>
            <div className="card-body">
              <div className="text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div style={{
                    width: 160, height: 160, borderRadius: '50%',
                    background: totalStatus > 0
                      ? `conic-gradient(#28C76F 0% ${pctActive}%, #00CFE8 ${pctActive}% ${pctActive + pctCompleted}%, #EA5455 ${pctActive + pctCompleted}% ${pctActive + pctCompleted + pctDefaulted}%, #82868B ${pctActive + pctCompleted + pctDefaulted}% 100%)`
                      : '#E8E8E8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span className="fw-bold fs-4">{fmtInt(totalStatus)}</span>
                      <small className="text-muted">Total</small>
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <span><i className="ti ti-circle-filled text-success me-1"></i>{t('common.active')} ({data.statusDistribution.active})</span>
                  <span><i className="ti ti-circle-filled text-info me-1"></i>{t('common.completed')} ({data.statusDistribution.completed})</span>
                  <span><i className="ti ti-circle-filled text-danger me-1"></i>{t('dashboard.defaulted')} ({data.statusDistribution.defaulted})</span>
                  <span><i className="ti ti-circle-filled me-1" style={{ color: '#82868B' }}></i>{t('dashboard.cancelled')} ({data.statusDistribution.cancelled})</span>
                </div>
              </div>

              {/* Collection rate summary */}
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">{t('dashboard.this_month_collections')}</span>
                  <span className="fw-bold">{t('common.rs')} {fmt(data.collectionsThisMonth)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">{t('dashboard.last_month_collections')}</span>
                  <span className="fw-medium">{t('common.rs')} {fmt(data.collectionsLastMonth)}</span>
                </div>
                {/* <div className="d-flex justify-content-between">
                  <span className="text-muted">{t('dashboard.interest_expected')}</span>
                  <span className="fw-medium">{t('common.rs')} {fmt(data.totalInterestExpected)}</span>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="row">
        {/* Upcoming Dues */}
        <div className="col-xxl-4 col-xl-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0"><i className="ti ti-calendar-due me-2 text-warning"></i>{t('dashboard.due')}</h5>
              <span className="badge bg-warning">{dueTodayItems.length}</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-borderless mb-0">
                  <tbody>
                    {dueTodayItems.length === 0 ? (
                      <tr><td className="text-center text-muted py-4">{t('dashboard.no_upcoming_dues')}</td></tr>
                    ) : (
                      dueTodayItems.map((d, i) => (
                        <tr key={i}>
                          <td className="ps-3">
                            <h6 className="fs-13 fw-medium mb-1">{d.customerName}</h6>
                            <p className="fs-12 text-muted mb-0">{d.productName} &bull; #{d.installmentNo}</p>
                          </td>
                          <td className="text-end pe-3">
                            <h6 className="fs-13 fw-bold mb-1">{t('common.rs')} {fmt(d.emiAmount)}</h6>
                            <p className="fs-12 text-muted mb-0">{formatDueDate(d.dueDate)}</p>
                          </td>
                          <td className="text-end pe-3">
                            {statusBadge(derivedStatusFromDueDate(d.dueDate))}
                          </td>
                          <td className="text-end pe-3">
                            <Link to={`/installment-details/${d.planId}`} className="btn btn-sm btn-outline-primary">
                              <i className="ti ti-eye"></i>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Installments */}
        <div className="col-xxl-4 col-xl-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0"><i className="ti ti-alert-triangle me-2 text-danger"></i>{t('dashboard.overdue_installments')}</h5>
              <span className="badge bg-danger">{fmtInt(data.overdueCount)} {t('dashboard.overdue')}</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="table table-borderless mb-0">
                  <tbody>
                    {overdueItems.length === 0 ? (
                      <tr><td className="text-center text-muted py-4">{t('dashboard.no_overdue')}</td></tr>
                    ) : (
                      overdueItems.map((d, i) => (
                        <tr key={i}>
                          <td className="ps-3">
                            <h6 className="fs-13 fw-medium mb-1">{d.customerName}</h6>
                            <p className="fs-12 text-muted mb-0">{d.productName} &bull; #{d.installmentNo}</p>
                          </td>
                          <td className="text-end pe-3">
                            <h6 className="fs-13 fw-bold mb-1 text-danger">{t('common.rs')} {fmt(d.remaining)}</h6>
                            <p className="fs-12 text-muted mb-0">Due: {formatDueDate(d.dueDate)}</p>
                          </td>
                          <td className="text-end pe-3">
                            <Link to={`/installment-details/${d.planId}`} className="btn btn-sm btn-outline-primary">
                              <i className="ti ti-eye"></i>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="col-xxl-4 col-xl-12 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0"><i className="ti ti-cash me-2 text-success"></i>{t('dashboard.recent_payments')}</h5>
              <Link to="/installment-plans" className="btn btn-sm btn-primary">{t('common.view_all')}</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-borderless mb-0">
                  <tbody>
                    {data.recentPayments.length === 0 ? (
                      <tr><td className="text-center text-muted py-4">{t('dashboard.no_payments')}</td></tr>
                    ) : (
                      data.recentPayments.map((p, i) => (
                        <tr key={i}>
                          <td className="ps-3">
                            <h6 className="fs-13 fw-medium mb-1">{p.customerName}</h6>
                            <p className="fs-12 text-muted mb-0">{p.productName} &bull; #{p.installmentNo}</p>
                          </td>
                          <td className="text-end pe-3">
                            <h6 className="fs-13 fw-bold mb-1 text-success">{t('common.rs')} {fmt(p.amount)}</h6>
                            <p className="fs-12 text-muted mb-0">{p.paidDate}</p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Installments Row */}
      <div className="row">
        <div className="col-12 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0"><i className="ti ti-calendar-event me-2 text-primary"></i>{t('Upcoming_installments') || 'Upcoming Installments'}</h5>
              <span className="badge bg-primary">{upcomingThisMonth.length}</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table className="table table-borderless mb-0">
                  <tbody>
                    {upcomingThisMonth.length === 0 ? (
                      <tr><td className="text-center text-muted py-4">{t('dashboard.no_upcoming_installments') || 'No upcoming installments'}</td></tr>
                    ) : (
                      upcomingThisMonth.map((u, i) => (
                        <tr key={i}>
                          <td className="ps-3">
                            <h6 className="fs-13 fw-medium mb-1">{u.customerName}</h6>
                            <p className="fs-12 text-muted mb-0">{u.productName} &bull; #{u.installmentNo}</p>
                          </td>
                          <td className="text-end pe-3">
                            <h6 className="fs-13 fw-bold mb-1">{t('common.rs')} {fmt(u.emiAmount)}</h6>
                            <p className="fs-12 text-muted mb-0">Due: {formatDueDate(u.dueDate)}</p>
                          </td>
                          <td className="text-end pe-3">
                            {statusBadge('upcoming')}
                          </td>
                          <td className="text-end pe-3">
                            <Link to={`/installment-details/${u.planId}`} className="btn btn-sm btn-outline-primary">
                              <i className="ti ti-eye"></i>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Plans */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0"><i className="ti ti-file-plus me-2"></i>{t('dashboard.recently_created_plans')}</h5>
              <Link to="/installment-plans" className="btn btn-sm btn-primary">{t('dashboard.view_all_plans')}</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th>{t('dashboard.customer')}</th>
                      <th>{t('dashboard.product')}</th>
                      <th>{t('dashboard.financed')}</th>
                      <th>{t('dashboard.emi')}</th>
                      <th>{t('dashboard.tenure')}</th>
                      <th>{t('common.status')}</th>
                      <th>{t('dashboard.created')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPlans.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-muted py-4">{t('dashboard.no_plans_yet')}</td></tr>
                    ) : (
                      data.recentPlans.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <h6 className="fs-13 fw-medium mb-0">{p.customerName}</h6>
                            <small className="text-muted">{p.customerPhone}</small>
                          </td>
                          <td>{p.productName}</td>
                          <td className="fw-medium">{t('common.rs')} {fmt(p.financedAmount)}</td>
                          <td className="fw-medium">{t('common.rs')} {fmt(p.emiAmount)}</td>
                          <td>{p.tenure} {t('common.mo')}</td>
                          <td>{statusBadge(p.status)}</td>
                          <td>{p.createdAt}</td>
                          <td>
                            <Link to={`/installment-details/${p.id}`} className="btn btn-sm btn-outline-primary">
                              <i className="ti ti-eye me-1"></i>{t('common.view')}
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
