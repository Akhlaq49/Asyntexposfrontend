import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData, DashboardData } from '../services/dashboardService';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
        <p className="mt-2 text-muted">Loading dashboard data...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="alert alert-danger">Failed to load dashboard data.</div>;
  }

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
            <h4 className="fw-bold">Installment Business Dashboard</h4>
            <h6>Overview of your installment plans, collections &amp; performance</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-toggle="tooltip" title="Refresh" onClick={(e) => { e.preventDefault(); window.location.reload(); }}><i className="ti ti-refresh"></i></a></li>
        </ul>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="row">
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">Total Plans</p>
                <h2 className="mb-0">{fmtInt(data.totalPlans)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-primary-transparent">
                <i className="ti ti-file-text fs-24 text-primary"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">{pctBadge(data.plansPctChange)} vs last month ({data.plansThisMonth} new)</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">Active Plans</p>
                <h2 className="mb-0">{fmtInt(data.activePlans)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-success-transparent">
                <i className="ti ti-check fs-24 text-success"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">{fmtInt(data.completedPlans)} completed &bull; {fmtInt(data.statusDistribution.defaulted)} defaulted</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">Total Customers</p>
                <h2 className="mb-0">{fmtInt(data.totalCustomers)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-warning-transparent">
                <i className="ti ti-users fs-24 text-warning"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0"><span className="text-success">{data.customersThisMonth}</span> new this month</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">Overdue</p>
                <h2 className="mb-0 text-danger">{fmtInt(data.overdueCount)}</h2>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-danger-transparent">
                <i className="ti ti-alert-triangle fs-24 text-danger"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">Rs {fmt(data.overdueAmount)} overdue amount</p>
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
                <p className="mb-2 text-muted">Total Financed</p>
                <h3 className="mb-0">Rs {fmt(data.totalFinancedAmount)}</h3>
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
                <p className="mb-2 text-muted">Total Collected</p>
                <h3 className="mb-0 text-success">Rs {fmt(data.totalCollected)}</h3>
              </div>
              <div className="rounded-circle d-inline-flex p-3 bg-success-transparent">
                <i className="ti ti-cash fs-24 text-success"></i>
              </div>
            </div>
            <div className="card-footer">
              <p className="mb-0">{pctBadge(data.collectionsPctChange)} vs last month</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card dash-widget w-100">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <p className="mb-2 text-muted">Outstanding</p>
                <h3 className="mb-0 text-warning">Rs {fmt(data.totalOutstanding)}</h3>
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
                <p className="mb-2 text-muted">Down Payments</p>
                <h3 className="mb-0">Rs {fmt(data.totalDownPayments)}</h3>
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
              <h5 className="card-title mb-0"><i className="ti ti-chart-bar me-2"></i>Monthly Collections vs Expected</h5>
              <div>
                <span className="badge bg-success me-2"><i className="ti ti-circle-filled me-1"></i>Collected</span>
                <span className="badge bg-light text-dark"><i className="ti ti-circle-filled me-1 text-muted"></i>Expected</span>
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
              <h5 className="card-title mb-0"><i className="ti ti-chart-donut me-2"></i>Plan Status</h5>
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
                  <span><i className="ti ti-circle-filled text-success me-1"></i>Active ({data.statusDistribution.active})</span>
                  <span><i className="ti ti-circle-filled text-info me-1"></i>Completed ({data.statusDistribution.completed})</span>
                  <span><i className="ti ti-circle-filled text-danger me-1"></i>Defaulted ({data.statusDistribution.defaulted})</span>
                  <span><i className="ti ti-circle-filled me-1" style={{ color: '#82868B' }}></i>Cancelled ({data.statusDistribution.cancelled})</span>
                </div>
              </div>

              {/* Collection rate summary */}
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">This Month Collections</span>
                  <span className="fw-bold">Rs {fmt(data.collectionsThisMonth)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Last Month Collections</span>
                  <span className="fw-medium">Rs {fmt(data.collectionsLastMonth)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Interest Expected</span>
                  <span className="fw-medium">Rs {fmt(data.totalInterestExpected)}</span>
                </div>
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
              <h5 className="card-title mb-0"><i className="ti ti-calendar-due me-2 text-warning"></i>Upcoming Dues</h5>
              <span className="badge bg-warning">{data.dueCount} due</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-borderless mb-0">
                  <tbody>
                    {data.upcomingDues.length === 0 ? (
                      <tr><td className="text-center text-muted py-4">No upcoming dues</td></tr>
                    ) : (
                      data.upcomingDues.map((d, i) => (
                        <tr key={i}>
                          <td className="ps-3">
                            <h6 className="fs-13 fw-medium mb-1">{d.customerName}</h6>
                            <p className="fs-12 text-muted mb-0">{d.productName} &bull; #{d.installmentNo}</p>
                          </td>
                          <td className="text-end pe-3">
                            <h6 className="fs-13 fw-bold mb-1">Rs {fmt(d.emiAmount)}</h6>
                            <p className="fs-12 text-muted mb-0">{d.dueDate}</p>
                          </td>
                          <td className="text-end pe-3">
                            {statusBadge(d.status)}
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
              <h5 className="card-title mb-0"><i className="ti ti-alert-triangle me-2 text-danger"></i>Overdue Installments</h5>
              <span className="badge bg-danger">{data.overdueCount} overdue</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-borderless mb-0">
                  <tbody>
                    {data.overdueList.length === 0 ? (
                      <tr><td className="text-center text-muted py-4">No overdue installments</td></tr>
                    ) : (
                      data.overdueList.map((d, i) => (
                        <tr key={i}>
                          <td className="ps-3">
                            <h6 className="fs-13 fw-medium mb-1">{d.customerName}</h6>
                            <p className="fs-12 text-muted mb-0">{d.productName} &bull; #{d.installmentNo}</p>
                          </td>
                          <td className="text-end pe-3">
                            <h6 className="fs-13 fw-bold mb-1 text-danger">Rs {fmt(d.remaining)}</h6>
                            <p className="fs-12 text-muted mb-0">Due: {d.dueDate}</p>
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
              <h5 className="card-title mb-0"><i className="ti ti-cash me-2 text-success"></i>Recent Payments</h5>
              <Link to="/installment-plans" className="btn btn-sm btn-primary">View All</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-borderless mb-0">
                  <tbody>
                    {data.recentPayments.length === 0 ? (
                      <tr><td className="text-center text-muted py-4">No payments yet</td></tr>
                    ) : (
                      data.recentPayments.map((p, i) => (
                        <tr key={i}>
                          <td className="ps-3">
                            <h6 className="fs-13 fw-medium mb-1">{p.customerName}</h6>
                            <p className="fs-12 text-muted mb-0">{p.productName} &bull; #{p.installmentNo}</p>
                          </td>
                          <td className="text-end pe-3">
                            <h6 className="fs-13 fw-bold mb-1 text-success">Rs {fmt(p.amount)}</h6>
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

      {/* Recent Plans */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0"><i className="ti ti-file-plus me-2"></i>Recently Created Plans</h5>
              <Link to="/installment-plans" className="btn btn-sm btn-primary">View All Plans</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Financed</th>
                      <th>EMI</th>
                      <th>Tenure</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPlans.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-muted py-4">No plans created yet</td></tr>
                    ) : (
                      data.recentPlans.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <h6 className="fs-13 fw-medium mb-0">{p.customerName}</h6>
                            <small className="text-muted">{p.customerPhone}</small>
                          </td>
                          <td>{p.productName}</td>
                          <td className="fw-medium">Rs {fmt(p.financedAmount)}</td>
                          <td className="fw-medium">Rs {fmt(p.emiAmount)}</td>
                          <td>{p.tenure} mo</td>
                          <td>{statusBadge(p.status)}</td>
                          <td>{p.createdAt}</td>
                          <td>
                            <Link to={`/installment-details/${p.id}`} className="btn btn-sm btn-outline-primary">
                              <i className="ti ti-eye me-1"></i>View
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
