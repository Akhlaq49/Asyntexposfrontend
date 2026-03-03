import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getOutstandingBalanceReport, OutstandingBalanceReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const OutstandingBalanceReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOutstandingBalanceReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title={t('reports.outstanding_balance_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.financial') }]} />

      {data && (
        <div className="d-flex justify-content-end mb-3">
          <ExportButtons
            onExportExcel={() => {
              const cols = [t('common.customer'), t('common.phone'), t('common.product'), t('reports.remaining_balance'), t('reports.overdue_amount'), t('reports.max_days_overdue')];
              const rows = data.customers.map(c => [c.customerName, c.phone || '-', c.productName, c.remainingBalance, c.overdueAmount, c.maxDaysOverdue]);
              exportToExcel(cols, rows, 'Outstanding-Balance-Report');
            }}
            onExportPDF={() => {
              const cols = [t('common.customer'), t('common.phone'), t('common.product'), t('reports.remaining_balance'), t('reports.overdue_amount'), t('reports.max_days_overdue')];
              const rows = data.customers.map(c => [c.customerName, c.phone || '-', c.productName, `Rs ${c.remainingBalance.toLocaleString()}`, `Rs ${c.overdueAmount.toLocaleString()}`, c.maxDaysOverdue]);
              exportToPDF(cols, rows, 'Outstanding-Balance-Report', t('reports.outstanding_balance_report'), [
                { label: t('reports.total_outstanding'), value: `Rs ${data.totalOutstanding.toLocaleString()}` },
                { label: t('reports.total_overdue'), value: `Rs ${data.totalOverdue.toLocaleString()}` },
                { label: t('reports.total_customers'), value: data.totalCustomers },
              ]);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_outstanding')}</h6>
                  <h3 className="text-primary">Rs {data.totalOutstanding.toLocaleString()}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_overdue')}</h6>
                  <h3 className="text-danger">Rs {data.totalOverdue.toLocaleString()}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_customers')}</h6>
                  <h3 className="text-info">{data.totalCustomers}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Aging Buckets */}
          <div className="card mb-4">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.aging_buckets')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered text-center">
                  <thead>
                    <tr>
                      <th>{t('reports.bucket')}</th>
                      <th>{t('reports.days_0_to_30')}</th>
                      <th>{t('reports.days_31_to_60')}</th>
                      <th>{t('reports.days_61_to_90')}</th>
                      <th>{t('reports.days_90_plus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="fw-bold">{t('common.amount')}</td>
                      <td>Rs {data.aging.days0To30.toLocaleString()}</td>
                      <td>Rs {data.aging.days31To60.toLocaleString()}</td>
                      <td>Rs {data.aging.days61To90.toLocaleString()}</td>
                      <td className="text-danger fw-bold">Rs {data.aging.days90Plus.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">{t('reports.count')}</td>
                      <td>{data.aging.count0To30}</td>
                      <td>{data.aging.count31To60}</td>
                      <td>{data.aging.count61To90}</td>
                      <td className="text-danger fw-bold">{data.aging.count90Plus}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Customer Breakdown */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.customer_wise_outstanding')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('common.customer')}</th>
                      <th>{t('common.phone')}</th>
                      <th>{t('common.product')}</th>
                      <th>{t('reports.remaining_balance')}</th>
                      <th>{t('reports.overdue_amount')}</th>
                      <th>{t('reports.max_days_overdue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((c, i) => (
                      <tr key={i}>
                        <td>{c.customerName}</td>
                        <td>{c.phone || '-'}</td>
                        <td>{c.productName}</td>
                        <td>Rs {c.remainingBalance.toLocaleString()}</td>
                        <td className={c.overdueAmount > 0 ? 'text-danger fw-bold' : ''}>Rs {c.overdueAmount.toLocaleString()}</td>
                        <td>{c.maxDaysOverdue}</td>
                      </tr>
                    ))}
                    {data.customers.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted">{t('reports.no_data_available')}</td></tr>
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

export default OutstandingBalanceReport;
