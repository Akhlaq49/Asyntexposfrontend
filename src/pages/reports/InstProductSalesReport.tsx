import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getProductSalesReport, ProductSalesReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const ProductSalesReport: React.FC = () => {
  const { t } = useTranslation();
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
      <PageHeader title={t('reports.product_wise_sales_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.sales') }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">{t('common.from_date')}</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('common.to_date')}</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>{t('reports.apply_filter')}</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = [t('common.product'), t('reports.units_sold'), t('reports.total_revenue'), t('reports.avg_price'), t('reports.down_payment_collected')];
                  const rows = data.products.map(p => [p.productName, p.unitsSold, p.totalRevenue, p.averagePrice, p.downPaymentCollected]);
                  exportToExcel(cols, rows, 'Product-Sales-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('common.product'), t('reports.units_sold'), t('reports.total_revenue'), t('reports.avg_price'), t('reports.down_payments')];
                  const rows = data.products.map(p => [p.productName, p.unitsSold, `Rs ${p.totalRevenue.toLocaleString()}`, `Rs ${p.averagePrice.toLocaleString()}`, `Rs ${p.downPaymentCollected.toLocaleString()}`]);
                  exportToPDF(cols, rows, 'Product-Sales-Report', t('reports.product_wise_sales_report'), [
                    { label: t('reports.total_products'), value: data.totalProducts },
                    { label: t('reports.total_units_sold'), value: data.totalUnitsSold },
                    { label: t('reports.total_revenue'), value: `Rs ${data.totalRevenue.toLocaleString()}` },
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
                  <h6 className="text-muted">{t('reports.total_products_sold')}</h6>
                  <h3 className="text-primary">{data.totalProducts}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_units_sold')}</h6>
                  <h3 className="text-success">{data.totalUnitsSold}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_revenue')}</h6>
                  <h3 className="text-info">Rs {data.totalRevenue.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.product_details')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('common.product')}</th>
                      <th>{t('reports.units_sold')}</th>
                      <th>{t('reports.total_revenue')}</th>
                      <th>{t('reports.avg_price')}</th>
                      <th>{t('reports.down_payment_collected')}</th>
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
                      <tr><td colSpan={5} className="text-center text-muted">{t('reports.no_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-warning">{t('reports.failed_to_load_report')}</div>
      )}
    </>
  );
};

export default ProductSalesReport;
