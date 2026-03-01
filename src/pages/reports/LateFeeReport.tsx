import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { getLateFeeReport, LateFeeReport as IReport } from '../../services/reportService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const LateFeeReport: React.FC = () => {
  const [data, setData] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getLateFeeReport(fromDate || undefined, toDate || undefined)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <>
      <PageHeader title="Late Fee Report" breadcrumbs={[{ title: 'Installment Reports' }, { title: 'Operational' }]} />

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
                  const cols = ['Plan ID', 'Customer', 'Phone', 'Inst #', 'Due Date', 'Paid Date', 'Days Late', 'Late Fee', 'Status'];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.installmentNo, new Date(item.dueDate).toLocaleDateString(), item.paidDate ? new Date(item.paidDate).toLocaleDateString() : '-', item.daysLate, item.lateFeeAmount, item.isPaid ? 'Paid' : 'Unpaid']);
                  exportToExcel(cols, rows, 'Late-Fee-Report');
                }}
                onExportPDF={() => {
                  const cols = ['Plan ID', 'Customer', 'Phone', 'Inst #', 'Due Date', 'Paid Date', 'Days Late', 'Late Fee', 'Status'];
                  const rows = data.items.map(item => [item.planId, item.customerName, item.phone || '-', item.installmentNo, new Date(item.dueDate).toLocaleDateString(), item.paidDate ? new Date(item.paidDate).toLocaleDateString() : '-', item.daysLate, `Rs ${item.lateFeeAmount.toLocaleString()}`, item.isPaid ? 'Paid' : 'Unpaid']);
                  exportToPDF(cols, rows, 'Late-Fee-Report', 'Late Fee Report', [
                    { label: 'Total Late Fees', value: `Rs ${data.totalLateFees.toLocaleString()}` },
                    { label: 'Paid Late Fees', value: `Rs ${data.paidLateFees.toLocaleString()}` },
                    { label: 'Unpaid Late Fees', value: `Rs ${data.unpaidLateFees.toLocaleString()}` },
                    { label: 'Total Late Entries', value: data.totalLateEntries },
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
            {[
              { label: 'Total Late Fees', value: `Rs ${data.totalLateFees.toLocaleString()}`, color: 'primary' },
              { label: 'Paid Late Fees', value: `Rs ${data.paidLateFees.toLocaleString()}`, color: 'success' },
              { label: 'Unpaid Late Fees', value: `Rs ${data.unpaidLateFees.toLocaleString()}`, color: 'danger' },
              { label: 'Total Late Entries', value: data.totalLateEntries.toString(), color: 'warning' },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4 className={`text-${c.color}`}>{c.value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">Late Fee Details</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Plan ID</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Inst #</th>
                      <th>Due Date</th>
                      <th>Paid Date</th>
                      <th>Days Late</th>
                      <th>Late Fee</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.planId}</td>
                        <td>{item.customerName}</td>
                        <td>{item.phone || '-'}</td>
                        <td>{item.installmentNo}</td>
                        <td>{new Date(item.dueDate).toLocaleDateString()}</td>
                        <td>{item.paidDate ? new Date(item.paidDate).toLocaleDateString() : '-'}</td>
                        <td className="text-danger fw-bold">{item.daysLate}</td>
                        <td>Rs {item.lateFeeAmount.toLocaleString()}</td>
                        <td>
                          <span className={`badge bg-${item.isPaid ? 'success' : 'danger'}`}>
                            {item.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.items.length === 0 && (
                      <tr><td colSpan={9} className="text-center text-muted">No late fee data</td></tr>
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

export default LateFeeReport;
