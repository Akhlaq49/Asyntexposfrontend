import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getProductSalesReport, ProductSalesReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const ProductSalesReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getProductSalesReport(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Product-wise Sales Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Sales' }]} />

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
                  const cols = ['Product', 'Units Sold', 'Total Revenue', 'Avg Price', 'Down Payment Collected'];
                  const rows = data.products.map(p => [p.productName, p.unitsSold, p.totalRevenue, p.averagePrice, p.downPaymentCollected]);
                  exportToExcel(cols, rows, 'Product-Sales-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Product', 'Units Sold', 'Total Revenue', 'Avg Price', 'Down Payment'];
                  const rows = data.products.map(p => [p.productName, p.unitsSold, `Rs ${p.totalRevenue.toLocaleString()}`, `Rs ${p.averagePrice.toLocaleString()}`, `Rs ${p.downPaymentCollected.toLocaleString()}`]);
                  exportToPDF(cols, rows, 'Product-Sales-Report', 'Product-wise Sales Report', [
                    { label: 'Total Products', value: data.totalProducts },
                    { label: 'Total Units Sold', value: data.totalUnitsSold },
                    { label: 'Total Revenue', value: `Rs ${data.totalRevenue.toLocaleString()}` },
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
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Products Sold</h6>
                  <h3 className="text-primary">{data.totalProducts}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Units Sold</h6>
                  <h3 className="text-success">{data.totalUnitsSold}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h6 className="text-muted">Total Revenue</h6>
                  <h3 className="text-info">Rs {data.totalRevenue.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Product Details</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units Sold</th>
                      <th>Total Revenue</th>
                      <th>Avg Price</th>
                      <th>Down Payment Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p, i) => (
                      <tr key={i}>
                        <td>{p.productName}</td>
                        <td>{p.unitsSold}</td>
                        <td>Rs {p.totalRevenue.toLocaleString()}</td>
                        <td>Rs {p.averagePrice.toLocaleString()}</td>
                        <td>Rs {p.downPaymentCollected.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.products.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-muted">No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-warning">Failed to load report data.</div>
      )}
    </>
  );
};

export default ProductSalesReport;
