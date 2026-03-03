import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
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
          { title: t('admin_dashboard.total_sales'), value: '$307,144', icon: 'ti-shopping-cart', bg: 'primary', change: '+12.5%', up: true },
          { title: t('admin_dashboard.total_purchase'), value: '$278,431', icon: 'ti-shopping-bag', bg: 'success', change: '+8.3%', up: true },
          { title: t('admin_dashboard.total_return'), value: '$34,673', icon: 'ti-receipt-refund', bg: 'warning', change: '-3.2%', up: false },
          { title: t('admin_dashboard.total_expense'), value: '$54,321', icon: 'ti-file-dollar', bg: 'danger', change: '+5.7%', up: true },
        ].map((card, i) => (
          <div key={i} className="col-xl-3 col-sm-6 d-flex">
            <div className="card dash-widget w-100">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-2">{card.title}</p>
                  <h2 className="mb-0">{card.value}</h2>
                </div>
                <div className={`dash-widget-icon bg-${card.bg}-light`}>
                  <i className={`ti ${card.icon} fs-24`}></i>
                </div>
              </div>
              <div className="card-footer">
                <p className="mb-0">
                  <span className={`text-${card.up ? 'success' : 'danger'}`}>
                    <i className={`ti ti-arrow-${card.up ? 'up' : 'down'} me-1`}></i>{card.change}
                  </span> {t('common.vs_last_month')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales & Purchase Summary */}
      <div className="row">
        <div className="col-xl-7 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">{t('admin_dashboard.sales_purchase')}</h5>
              <div className="dropdown">
                <a href="#" className="dropdown-toggle btn btn-white btn-sm" data-bs-toggle="dropdown">2025</a>
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-end gap-2 align-items-end" style={{ height: 250 }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                  <div key={m} className="text-center flex-fill">
                    <div className="d-flex gap-1 justify-content-center align-items-end" style={{ height: 200 }}>
                      <div style={{ width: 12, height: [80, 100, 130, 120, 90, 150, 140, 160, 110, 170, 145, 155][i], background: '#FE9F43', borderRadius: 3 }}></div>
                      <div style={{ width: 12, height: [60, 80, 100, 90, 70, 120, 110, 130, 85, 140, 115, 125][i], background: '#28C76F', borderRadius: 3 }}></div>
                    </div>
                    <small className="text-muted d-block mt-1">{m}</small>
                  </div>
                ))}
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
              <Link to="/best-seller" className="btn btn-sm btn-primary">{t('common.view_all')}</Link>
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
                    {[
                      { name: 'Lenovo IdeaPad 3', qty: 302, amount: '$181,200' },
                      { name: 'Beats Pro', qty: 245, amount: '$39,200' },
                      { name: 'Nike Jordan', qty: 198, amount: '$21,780' },
                      { name: 'Apple Watch S5', qty: 167, amount: '$20,040' },
                      { name: 'Amazon Echo Dot', qty: 134, amount: '$10,720' },
                    ].map((p, i) => (
                      <tr key={i}>
                        <td><h6 className="fs-14 fw-medium mb-0">{p.name}</h6></td>
                        <td>{p.qty}</td>
                        <td className="fw-bold">{p.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0">{t('admin_dashboard.recent_orders')}</h5>
          <Link to="/online-orders" className="btn btn-sm btn-primary">{t('common.view_all')}</Link>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table">
              <thead className="thead-light">
                <tr>
                  <th>{t('admin_dashboard.order_id')}</th>
                  <th>{t('admin_dashboard.customer')}</th>
                  <th>{t('admin_dashboard.product')}</th>
                  <th>{t('common.amount')}</th>
                  <th>{t('common.date')}</th>
                  <th>{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: '#ORD-001', customer: 'Carl Evans', product: 'Lenovo IdeaPad', amount: '$600', date: '15 Jan 2025', status: 'completed', sc: 'success' },
                  { id: '#ORD-002', customer: 'Minerva Rameriz', product: 'Beats Pro', amount: '$160', date: '14 Jan 2025', status: 'processing', sc: 'warning' },
                  { id: '#ORD-003', customer: 'Robert Lamon', product: 'Nike Jordan', amount: '$110', date: '13 Jan 2025', status: 'completed', sc: 'success' },
                  { id: '#ORD-004', customer: 'Patricia Lewis', product: 'Apple Watch', amount: '$120', date: '12 Jan 2025', status: 'pending', sc: 'info' },
                  { id: '#ORD-005', customer: 'Mark Joslyn', product: 'Amazon Echo', amount: '$80', date: '11 Jan 2025', status: 'cancelled', sc: 'danger' },
                ].map((o, i) => (
                  <tr key={i}>
                    <td><Link to="/invoice-details">{o.id}</Link></td>
                    <td>{o.customer}</td>
                    <td>{o.product}</td>
                    <td>{o.amount}</td>
                    <td>{o.date}</td>
                    <td><span className={`badge badge-xs bg-${o.sc}-light text-${o.sc}`}>{t(`admin_dashboard.${o.status}`)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
