import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getInstallmentCollectionReport, InstallmentCollectionReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const InstallmentCollectionReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getInstallmentCollectionReport(fromDate || undefined, toDate || undefined);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Installment Collection Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Financial' }]} />

      {/* Filters */}
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
                  const cols = ['Date', 'Count', 'Amount'];
                  const rows = data.collectionByDate.map(r => [new Date(r.date).toLocaleDateString(), r.count, r.amount]);
                  exportToExcel(cols, rows, 'Installment-Collection-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Date', 'Count', 'Amount'];
                  const rows = data.collectionByDate.map(r => [new Date(r.date).toLocaleDateString(), r.count, r.amount]);
                  exportToPDF(cols, rows, 'Installment-Collection-Report', 'Installment Collection Report', [
                    { label: 'Total Due', value: data.totalInstallmentsDue },
                    { label: 'Total Collected', value: data.totalCollected },
                    { label: 'Pending', value: data.pendingCount },
                    { label: 'Late Payments', value: data.latePayments },
                    { label: 'Amount Due', value: `Rs ${data.totalAmountDue.toLocaleString()}` },
                    { label: 'Amount Collected', value: `Rs ${data.totalAmountCollected.toLocaleString()}` },
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
              { label: 'Total Due', value: data.totalInstallmentsDue, color: 'primary' },
              { label: 'Total Collected', value: data.totalCollected, color: 'success' },
              { label: 'Pending', value: data.pendingCount, color: 'warning' },
              { label: 'Late Payments', value: data.latePayments, color: 'danger' },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h3 className={`text-${c.color}`}>{c.value}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Amount Cards */}
          <div className="row mb-4">
            {[
              { label: 'Amount Due', value: data.totalAmountDue },
              { label: 'Amount Collected', value: data.totalAmountCollected },
              { label: 'Pending Amount', value: data.pendingAmount },
              { label: 'Late Amount', value: data.lateAmount },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className="card">
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4>Rs {c.value.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Collection By Date */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Collection By Date</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr><th>Date</th><th>Count</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {data.collectionByDate.map((r, i) => (
                      <tr key={i}>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td>{r.count}</td>
                        <td>Rs {r.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {data.collectionByDate.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-muted">No data available</td></tr>
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

export default InstallmentCollectionReport;
