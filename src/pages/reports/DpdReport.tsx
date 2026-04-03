import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { getDpdReport, DpdReport, DpdCustomerItem } from '../../services/reportService';
import { getCustomers, Customer } from '../../services/customerService';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dpdBadgeColor = (dpd: number) => {
  if (dpd === 0) return '#28a745';   // green - on time
  if (dpd <= 30) return '#ffc107';   // yellow
  if (dpd <= 60) return '#fd7e14';   // orange
  if (dpd <= 90) return '#dc3545';   // red
  return '#6f42c1';                  // purple - severe
};

const dpdLabel = (dpd: number) => {
  if (dpd === 0) return 'On Time';
  if (dpd <= 30) return '1-30 Days';
  if (dpd <= 60) return '31-60 Days';
  if (dpd <= 90) return '61-90 Days';
  return '90+ Days';
};

const DpdReportPage: React.FC = () => {
  const [report, setReport] = useState<DpdReport | null>(null);
  const [customerById, setCustomerById] = useState<Map<number, Customer>>(new Map());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [repRes, custRes] = await Promise.allSettled([getDpdReport(), getCustomers()]);
    if (repRes.status === 'fulfilled') setReport(repRes.value);
    else {
      console.error(repRes.reason);
      setReport(null);
    }
    if (custRes.status === 'fulfilled') {
      const m = new Map<number, Customer>();
      for (const cu of custRes.value) {
        const id = Number(cu.id);
        if (!Number.isNaN(id)) m.set(id, cu);
      }
      setCustomerById(m);
    } else {
      console.error(custRes.reason);
      setCustomerById(new Map());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const customers = useMemo(() => {
    const list = report?.customers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const master = customerById.get(c.customerId);
      const address = (c.address ?? master?.address ?? '').toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        address.includes(q)
      );
    });
  }, [report, search, customerById]);

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(customers);

  const cols = ['Customer', 'Phone', 'Total Amount', 'Paid', 'Due', 'Orders', 'Overdue', 'Max DPD'];
  const rows = customers.map(c => [c.customerName, c.phone ?? '', fmt(c.totalAmount), fmt(c.paidAmount), fmt(c.dueAmount), String(c.totalOrders), String(c.overdueOrders), String(c.maxDpd)]);

  const summary = useMemo(() => {
    const totalCustomers = customers.length;
    const totalDueAmount = customers.reduce((sum, c) => sum + (c.dueAmount ?? 0), 0);
    const totalOverdueOrders = customers.reduce((sum, c) => sum + (c.overdueOrders ?? 0), 0);
    const totalOverdueAmount = customers
      .filter(c => (c.maxDpd ?? 0) > 0)
      .reduce((sum, c) => sum + (c.dueAmount ?? 0), 0);
    return { totalCustomers, totalDueAmount, totalOverdueOrders, totalOverdueAmount };
  }, [customers]);

  return (
    <>
      <PageHeader title="DPD Report" breadcrumbs={[{ title: 'Reports' }, { title: 'DPD Report' }]} />

      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><Link className="nav-link" to="/customer-report">Customer Report</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/customer-due-report">Customer Due Report</Link></li>
        <li className="nav-item"><Link className="nav-link active" to="/dpd-report">DPD Report</Link></li>
      </ul>

      {/* Summary Cards */}
      {report && (
        <div className="row mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 80, height: 80, background: '#e8f5e9', color: '#28a745', fontSize: 20, fontWeight: 700 }}>
                  {summary.totalCustomers}
                </div>
                <h6 className="mb-0">Total Customers</h6>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 80, height: 80, background: '#fff3e0', color: '#fd7e14', fontSize: 16, fontWeight: 700 }}>
                  Rs {fmt(summary.totalDueAmount)}
                </div>
                <h6 className="mb-0">Total Due Amount</h6>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 80, height: 80, background: '#fce4ec', color: '#dc3545', fontSize: 20, fontWeight: 700 }}>
                  {summary.totalOverdueOrders}
                </div>
                <h6 className="mb-0">Overdue Orders</h6>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6">
            <div className="card text-center">
              <div className="card-body">
                <div className="mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: 80, height: 80, background: '#fce4ec', color: '#dc3545', fontSize: 16, fontWeight: 700 }}>
                  Rs {fmt(summary.totalOverdueAmount)}
                </div>
                <h6 className="mb-0">Overdue Amount</h6>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0">Customer DPD Overview</h5>
          <div className="d-flex align-items-center gap-2">
            <input type="text" className="form-control form-control-sm" placeholder="Search by name, phone, address..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220, maxWidth: 280 }} />
            <ExportButtons onExportExcel={() => exportToExcel(
              cols,
              rows,
              'dpd-report',
              'Report',
              [{ label: 'Total Due Amount', value: fmt(summary.totalDueAmount) }]
            )}
              onExportPDF={() => exportToPDF(
                cols,
                rows,
                'dpd-report',
                'DPD Report',
                [{ label: 'Total Due Amount', value: fmt(summary.totalDueAmount) }]
              )} />
          </div>
        </div>
        <div className="card-body p-0">
          <div className="px-3 pt-3">
            <small className="text-muted">
              Total Due Amount: <span className="fw-bold">Rs {fmt(summary.totalDueAmount)}</span>
            </small>
          </div>
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
            <>
              {/* Customer Cards with Circle Amounts */}
              <div className="p-3">
                {customers.length === 0 ? (
                  <div className="text-center py-5 text-muted">No pending orders with expected dates found</div>
                ) : paginatedData.map((c: DpdCustomerItem) => {
                  const master = customerById.get(c.customerId);
                  const displayAddress = c.address || master?.address;
                  return (
                  <div key={c.customerId} className="card border mb-3">
                    <div className="card-body">
                      <div className="row align-items-center">
                        {/* Customer Info */}
                        <div className="col-lg-3">
                          <h6 className="fw-bold mb-1">{c.customerName}</h6>
                          {c.phone && <small className="text-muted d-block"><i className="ti ti-phone me-1"></i>{c.phone}</small>}
                          {displayAddress && (
                            <small className="text-muted d-block mt-1">
                              <i className="ti ti-map-pin me-1"></i>
                              {displayAddress}
                            </small>
                          )}
                          <div className="mt-1">
                            <small className="text-muted">{c.totalOrders} order(s) &middot; {c.overdueOrders} overdue</small>
                          </div>
                        </div>

                        {/* Amount Circles */}
                        <div className="col-lg-6">
                          <div className="d-flex align-items-center justify-content-center gap-4 flex-wrap">
                            {/* Total Amount Circle */}
                            <div className="text-center">
                              <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto"
                                style={{ width: 90, height: 90, border: '3px solid #0d6efd', color: '#0d6efd', fontSize: 13, fontWeight: 700 }}>
                                Rs {fmt(c.totalAmount)}
                              </div>
                              <small className="text-muted mt-1 d-block">Total</small>
                            </div>
                            {/* Paid Circle */}
                            <div className="text-center">
                              <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto"
                                style={{ width: 90, height: 90, border: '3px solid #28a745', color: '#28a745', fontSize: 13, fontWeight: 700 }}>
                                Rs {fmt(c.paidAmount)}
                              </div>
                              <small className="text-muted mt-1 d-block">Paid</small>
                            </div>
                            {/* Due Circle */}
                            <div className="text-center">
                              <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto"
                                style={{ width: 90, height: 90, border: '3px solid #dc3545', color: '#dc3545', fontSize: 13, fontWeight: 700 }}>
                                Rs {fmt(c.dueAmount)}
                              </div>
                              <small className="text-muted mt-1 d-block">Due</small>
                            </div>
                          </div>
                        </div>

                        {/* DPD Badge + Expand */}
                        <div className="col-lg-3 text-center">
                          <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-2"
                            style={{ width: 70, height: 70, background: dpdBadgeColor(c.maxDpd), color: '#fff', fontSize: 18, fontWeight: 700 }}>
                            {c.maxDpd}
                          </div>
                          <small className="d-block mb-2" style={{ color: dpdBadgeColor(c.maxDpd), fontWeight: 600 }}>
                            {dpdLabel(c.maxDpd)} DPD
                          </small>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setExpandedCustomer(expandedCustomer === c.customerId ? null : c.customerId)}>
                            <i className={`ti ti-chevron-${expandedCustomer === c.customerId ? 'up' : 'down'} me-1`}></i>
                            {expandedCustomer === c.customerId ? 'Hide' : 'View'} Orders
                          </button>
                        </div>
                      </div>

                      {/* Expanded Order Details */}
                      {expandedCustomer === c.customerId && (
                        <div className="mt-3 border-top pt-3">
                          <div className="table-responsive">
                            <table className="table table-sm table-hover mb-0">
                              <thead>
                                <tr>
                                  <th>Reference</th>
                                  <th>Sale Date</th>
                                  <th>Expected Date</th>
                                  <th>Grand Total</th>
                                  <th>Paid</th>
                                  <th>Due</th>
                                  <th>DPD</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.orders.map(o => (
                                  <tr key={o.saleId}>
                                    <td>{o.reference}</td>
                                    <td>{o.saleDate}</td>
                                    <td>{o.expectedDate || '—'}</td>
                                    <td>Rs {fmt(o.grandTotal)}</td>
                                    <td>Rs {fmt(o.paid)}</td>
                                    <td>Rs {fmt(o.due)}</td>
                                    <td>
                                      <span className="badge rounded-pill" style={{ background: dpdBadgeColor(o.dpd), color: '#fff', minWidth: 50 }}>
                                        {o.dpd} days
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`badge ${o.paymentStatus === 'Paid' ? 'bg-success' : o.paymentStatus === 'Pending' ? 'bg-warning' : 'bg-danger'}`}>
                                        {o.paymentStatus}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <Pagination currentPage={currentPage} totalItems={customers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default DpdReportPage;
