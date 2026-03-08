import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPosDashboardData, PosDashboardData } from '../services/dashboardService';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<PosDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getPosDashboardData();
        setData(result);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (n: number) => n.toLocaleString('en-US');

  const pctBadge = (pct: number) => {
    if (pct > 0) return <span className="text-success"><i className="ti ti-arrow-up me-1"></i>{pct}%</span>;
    if (pct < 0) return <span className="text-danger"><i className="ti ti-arrow-down me-1"></i>{Math.abs(pct)}%</span>;
    return <span className="text-muted">0%</span>;
  };

  const statusColor: Record<string, string> = {
    completed: 'success', processing: 'warning', pending: 'info', cancelled: 'danger',
    paid: 'success', partial: 'warning', unpaid: 'danger', due: 'warning',
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

  const chartMax = Math.max(...data.monthlyTrend.map(m => Math.max(m.sales, m.purchases)), 1);

  return (
    <>
      <div className="d-lg-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1">{t('admin_dashboard.welcome')}</h2>
          <p>{t('admin_dashboard.orders_today')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row">
        {[
          { title: t('admin_dashboard.total_sales'), value: fmt(data.totalSalesAmount), icon: 'ti-shopping-cart', bg: 'primary', pct: data.salesPctChange },
          { title: t('admin_dashboard.total_purchase'), value: fmt(data.totalPurchaseAmount), icon: 'ti-shopping-bag', bg: 'success', pct: data.purchasePctChange },
          { title: t('admin_dashboard.total_return'), value: fmt(data.totalReturnAmount), icon: 'ti-receipt-refund', bg: 'warning', pct: data.returnPctChange },
          { title: t('admin_dashboard.total_expense'), value: fmt(data.totalExpenseAmount), icon: 'ti-file-dollar', bg: 'danger', pct: data.expensePctChange },
        ].map((card, i) => (
          <div key={i} className="col-xl-3 col-sm-6 d-flex">
            <div className="card dash-widget w-100">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-2">{card.title}</p>
                  <h2 className="mb-0">${card.value}</h2>
                </div>
                <div className={`dash-widget-icon bg-${card.bg}-light`}>
                  <i className={`ti ${card.icon} fs-24`}></i>
                </div>
              </div>
              <div className="card-footer">
                <p className="mb-0">
                  {pctBadge(card.pct)} {t('common.vs_last_month')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="row">
        {[
          { label: t('admin_dashboard.total_customers'), value: fmtInt(data.totalCustomers), sub: `+${fmtInt(data.customersThisMonth)} ${t('common.this_month')}`, icon: 'ti-users', bg: 'info' },
          { label: t('admin_dashboard.total_products'), value: fmtInt(data.totalProducts), sub: `${fmtInt(data.lowStockProducts)} ${t('admin_dashboard.low_stock')}`, icon: 'ti-package', bg: 'secondary' },
          { label: t('admin_dashboard.sales_this_month'), value: fmtInt(data.salesCountThisMonth), sub: `$${fmt(data.salesThisMonth)}`, icon: 'ti-chart-bar', bg: 'primary' },
          { label: t('admin_dashboard.total_profit'), value: `$${fmt(data.totalProfit)}`, sub: `${t('admin_dashboard.due')}: $${fmt(data.totalSalesDue)}`, icon: 'ti-coin', bg: 'success' },
        ].map((s, i) => (
          <div key={i} className="col-xl-3 col-sm-6 d-flex">
            <div className="card w-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className={`dash-widget-icon bg-${s.bg}-light me-3`}>
                    <i className={`ti ${s.icon} fs-24`}></i>
                  </div>
                  <div>
                    <p className="mb-1 text-muted">{s.label}</p>
                    <h4 className="mb-0">{s.value}</h4>
                    <small className="text-muted">{s.sub}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales & Purchase Chart + Best Sellers */}
      <div className="row">
        <div className="col-xl-7 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">{t('admin_dashboard.sales_purchase')}</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-end gap-2 align-items-end" style={{ height: 250 }}>
                {data.monthlyTrend.map((m) => {
                  const sH = Math.round((m.sales / chartMax) * 200) || 2;
                  const pH = Math.round((m.purchases / chartMax) * 200) || 2;
                  return (
                    <div key={m.month} className="text-center flex-fill" title={`${m.month}\nSales: $${fmt(m.sales)}\nPurchases: $${fmt(m.purchases)}`}>
                      <div className="d-flex gap-1 justify-content-center align-items-end" style={{ height: 200 }}>
                        <div style={{ width: 12, height: sH, background: '#FE9F43', borderRadius: 3 }}></div>
                        <div style={{ width: 12, height: pH, background: '#28C76F', borderRadius: 3 }}></div>
                      </div>
                      <small className="text-muted d-block mt-1">{m.month}</small>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex justify-content-center gap-4 mt-3">
                <span><span className="legend-dot bg-primary"></span> {t('admin_dashboard.sales')}</span>
                <span><span className="legend-dot bg-success"></span> {t('admin_dashboard.purchase')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-5 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">{t('admin_dashboard.best_seller')}</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-borderless">
                  <thead>
                    <tr>
                      <th>{t('admin_dashboard.product')}</th>
                      <th>{t('admin_dashboard.sales')}</th>
                      <th>{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bestSellers.map((p, i) => (
                      <tr key={i}>
                        <td><h6 className="fs-14 fw-medium mb-0">{p.productName}</h6></td>
                        <td>{fmtInt(p.totalQty)}</td>
                        <td className="fw-bold">${fmt(p.totalRevenue)}</td>
                      </tr>
                    ))}
                    {data.bestSellers.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-muted">{t('common.no_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expense by Category + This Month Summary */}
      <div className="row">
        <div className="col-xl-5 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <h5 className="card-title mb-0">{t('admin_dashboard.expense_by_category')}</h5>
            </div>
            <div className="card-body">
              {data.expenseByCategory.length === 0 ? (
                <p className="text-center text-muted">{t('common.no_data')}</p>
              ) : (
                data.expenseByCategory.map((e, i) => {
                  const maxCat = Math.max(...data.expenseByCategory.map(c => c.total), 1);
                  const pct = Math.round((e.total / maxCat) * 100);
                  const colors = ['primary', 'success', 'warning', 'danger', 'info'];
                  return (
                    <div key={i} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span>{e.category}</span>
                        <span className="fw-bold">${fmt(e.total)}</span>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className={`progress-bar bg-${colors[i % colors.length]}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <div className="col-xl-7 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <h5 className="card-title mb-0">{t('admin_dashboard.this_month_summary')}</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-3">
                  <h4 className="text-primary mb-1">${fmt(data.salesThisMonth)}</h4>
                  <p className="text-muted mb-0">{t('admin_dashboard.sales')}</p>
                </div>
                <div className="col-3">
                  <h4 className="text-success mb-1">${fmt(data.purchasesThisMonth)}</h4>
                  <p className="text-muted mb-0">{t('admin_dashboard.purchase')}</p>
                </div>
                <div className="col-3">
                  <h4 className="text-warning mb-1">${fmt(data.returnsThisMonth)}</h4>
                  <p className="text-muted mb-0">{t('admin_dashboard.returns')}</p>
                </div>
                <div className="col-3">
                  <h4 className="text-danger mb-1">${fmt(data.expensesThisMonth)}</h4>
                  <p className="text-muted mb-0">{t('admin_dashboard.expenses')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0">{t('admin_dashboard.recent_orders')}</h5>
          <Link to="/sales-list" className="btn btn-sm btn-primary">{t('common.view_all')}</Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table">
              <thead className="thead-light">
                <tr>
                  <th>{t('admin_dashboard.order_id')}</th>
                  <th>{t('admin_dashboard.customer')}</th>
                  <th>{t('common.amount')}</th>
                  <th>{t('admin_dashboard.paid')}</th>
                  <th>{t('admin_dashboard.due')}</th>
                  <th>{t('common.date')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('admin_dashboard.payment')}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/sales-detail/${o.id}`}>{o.reference}</Link></td>
                    <td>{o.customerName}</td>
                    <td>${fmt(o.grandTotal)}</td>
                    <td>${fmt(o.paid)}</td>
                    <td>${fmt(o.due)}</td>
                    <td>{new Date(o.saleDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-xs bg-${statusColor[o.status] || 'secondary'}-light text-${statusColor[o.status] || 'secondary'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-xs bg-${statusColor[o.paymentStatus] || 'secondary'}-light text-${statusColor[o.paymentStatus] || 'secondary'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.recentSales.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted">{t('common.no_data')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
