import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getPaymentHistoryReport, PaymentHistoryReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const PaymentHistoryReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerId, setCustomerId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const cid = customerId ? parseInt(customerId) : undefined;
      setData(await getPaymentHistoryReport(cid, fromDate || undefined, toDate || undefined));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title={t('reports.payment_history_report')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('common.customer') }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">{t('reports.customer_id_optional')}</label>
              <input type="number" className="form-control" placeholder={t('reports.all_customers')} value={customerId} onChange={e => setCustomerId(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('reports.from_date')}</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('reports.to_date')}</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData}>{t('reports.apply_filter')}</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = [t('common.date'), t('common.customer'), t('common.phone'), t('common.product'), t('reports.installment_no'), t('common.amount'), t('reports.method')];
                  const rows = data.payments.map(p => [new Date(p.paidDate).toLocaleDateString(), p.customerName, p.phone || '-', p.productName, p.installmentNo, p.amount, p.paymentMethod]);
                  exportToExcel(cols, rows, 'Payment-History-Report');
                }}
                onExportPDF={() => {
                  const cols = [t('common.date'), t('common.customer'), t('common.phone'), t('common.product'), t('reports.inst_no'), t('common.amount'), t('reports.method')];
                  const rows = data.payments.map(p => [new Date(p.paidDate).toLocaleDateString(), p.customerName, p.phone || '-', p.productName, p.installmentNo, `Rs ${p.amount.toLocaleString()}`, p.paymentMethod]);
                  exportToPDF(cols, rows, 'Payment-History-Report', t('reports.payment_history_report'), [
                    { label: t('reports.total_payments'), value: data.totalPayments },
                    { label: t('reports.total_amount'), value: `Rs ${data.totalAmount.toLocaleString()}` },
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
                  <h6 className="text-muted">{t('reports.total_payments')}</h6>
                  <h3 className="text-primary">{data.totalPayments}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h6 className="text-muted">{t('reports.total_amount')}</h6>
                  <h3 className="text-success">Rs {data.totalAmount.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Summary */}
          {data.methodSummary.length > 0 && (
            <div className="card mb-4">
              <div className="card-header"><h5 className="card-title mb-0">{t('reports.by_payment_method')}</h5></div>
              <div className="card-body">
                <div className="row">
                  {data.methodSummary.map((m, i) => (
                    <div className="col-md-3 mb-3" key={i}>
                      <div className="card">
                        <div className="card-body text-center">
                          <h6 className="text-muted">{m.method || t('reports.unknown')}</h6>
                          <h5>{t('reports.payments_count', { count: m.count })}</h5>
                          <p className="mb-0 text-success">Rs {m.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payments Table */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.payment_details')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('common.customer')}</th>
                      <th>{t('common.phone')}</th>
                      <th>{t('common.product')}</th>
                      <th>{t('reports.installment_no')}</th>
                      <th>{t('common.amount')}</th>
                      <th>{t('reports.method')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.paidDate).toLocaleDateString()}</td>
                        <td>{p.customerName}</td>
                        <td>{p.phone || '-'}</td>
                        <td>{p.productName}</td>
                        <td>{p.installmentNo}</td>
                        <td>Rs {p.amount.toLocaleString()}</td>
                        <td><span className="badge bg-info">{p.paymentMethod}</span></td>
                      </tr>
                    ))}
                    {data.payments.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted">{t('reports.no_payments_found')}</td></tr>
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

export default PaymentHistoryReport;
