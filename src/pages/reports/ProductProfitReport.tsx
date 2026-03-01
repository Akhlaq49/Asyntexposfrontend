import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getProductProfitReport, ProductProfitReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const ProductProfitReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getProductProfitReport(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Product Profit Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Financial' }]} />

      {/* Filter */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>Apply Filter</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = ['#', 'Customer', 'Phone', 'Product', 'Product Price', 'Down Payment', 'Total Payable', 'Interest', 'Profit', 'Profit %', 'Tenure', 'Status'];
                  const rows = data.plans.map((p, i) => [i + 1, p.customerName, p.phone || '-', p.productName, p.productPrice, p.downPayment, p.totalPayable, p.interestEarned, p.profit, `${p.profitPercentage}%`, `${p.tenure} months`, p.status]);
                  exportToExcel(cols, rows, 'Product-Profit-Report');
                }}
                onExportPDF={() => {
                  const cols = ['#', 'Customer', 'Product', 'Price', 'Down Pmt', 'Total Payable', 'Profit', 'Profit %', 'Status'];
                  const rows = data.plans.map((p, i) => [i + 1, p.customerName, p.productName, `Rs ${p.productPrice.toLocaleString()}`, `Rs ${p.downPayment.toLocaleString()}`, `Rs ${p.totalPayable.toLocaleString()}`, `Rs ${p.profit.toLocaleString()}`, `${p.profitPercentage}%`, p.status]);
                  exportToPDF(cols, rows, 'Product-Profit-Report', 'Product Profit Report', [
                    { label: 'Total Plans', value: data.totalPlans },
                    { label: 'Total Product Cost', value: `Rs ${data.totalProductCost.toLocaleString()}` },
                    { label: 'Total Financed Amount', value: `Rs ${data.totalFinancedAmount.toLocaleString()}` },
                    { label: 'Total Profit', value: `Rs ${data.totalProfit.toLocaleString()}` },
                    { label: 'Total Interest Earned', value: `Rs ${data.totalInterestEarned.toLocaleString()}` },
                    { label: 'Avg Profit / Plan', value: `Rs ${data.averageProfitPerPlan.toLocaleString()}` },
                  ]);
                }}
              />}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="row mb-4">
            {[
              { label: 'Total Plans', value: data.totalPlans, color: 'primary', isCurrency: false },
              { label: 'Total Product Cost', value: data.totalProductCost, color: 'info', isCurrency: true },
              { label: 'Total Financed Amount', value: data.totalFinancedAmount, color: 'warning', isCurrency: true },
              { label: 'Total Profit', value: data.totalProfit, color: 'success', isCurrency: true },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4 className={`text-${c.color}`}>
                      {c.isCurrency ? `Rs ${c.value.toLocaleString()}` : c.value}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row mb-4">
            {[
              { label: 'Total Interest Earned', value: data.totalInterestEarned, color: 'info' },
              { label: 'Total Down Payments', value: data.totalDownPayments, color: 'secondary' },
              { label: 'Avg Profit / Plan', value: data.averageProfitPerPlan, color: data.averageProfitPerPlan >= 0 ? 'success' : 'danger' },
            ].map((c, i) => (
              <div className="col-md-4 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4 className={`text-${c.color}`}>Rs {c.value.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Plan-wise Profit Table */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Plan-wise Profit Breakdown</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Product Price</th>
                      <th>Down Payment</th>
                      <th>Total Payable</th>
                      <th>Interest</th>
                      <th>Profit</th>
                      <th>Profit %</th>
                      <th>Tenure</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.plans.map((p, i) => (
                      <tr key={p.planId}>
                        <td>{i + 1}</td>
                        <td>
                          <div>{p.customerName}</div>
                          {p.phone && <small className="text-muted">{p.phone}</small>}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {p.productImage && (
                              <img src={p.productImage} alt="" width={32} height={32} className="rounded" style={{ objectFit: 'cover' }} />
                            )}
                            <span>{p.productName}</span>
                          </div>
                        </td>
                        <td>Rs {p.productPrice.toLocaleString()}</td>
                        <td>Rs {p.downPayment.toLocaleString()}</td>
                        <td>Rs {p.totalPayable.toLocaleString()}</td>
                        <td>Rs {p.interestEarned.toLocaleString()}</td>
                        <td className={p.profit >= 0 ? 'text-success fw-semibold' : 'text-danger fw-semibold'}>
                          Rs {p.profit.toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${p.profitPercentage >= 0 ? 'bg-success-transparent' : 'bg-danger-transparent'}`}>
                            {p.profitPercentage}%
                          </span>
                        </td>
                        <td>{p.tenure} months @ {p.interestRate}%</td>
                        <td>
                          <span className={`badge ${p.status === 'active' ? 'bg-primary' : p.status === 'completed' ? 'bg-success' : 'bg-danger'}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.plans.length === 0 && (
                      <tr><td colSpan={11} className="text-center text-muted py-4">No plans found</td></tr>
                    )}
                  </tbody>
                  {data.plans.length > 0 && (
                    <tfoot>
                      <tr className="fw-bold">
                        <td colSpan={3}>Total</td>
                        <td>Rs {data.totalProductCost.toLocaleString()}</td>
                        <td>Rs {data.totalDownPayments.toLocaleString()}</td>
                        <td>Rs {data.totalFinancedAmount.toLocaleString()}</td>
                        <td>Rs {data.totalInterestEarned.toLocaleString()}</td>
                        <td className={data.totalProfit >= 0 ? 'text-success' : 'text-danger'}>
                          Rs {data.totalProfit.toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-5 text-muted">Failed to load data</div>
      )}
    </>
  );
};

export default ProductProfitReport;
