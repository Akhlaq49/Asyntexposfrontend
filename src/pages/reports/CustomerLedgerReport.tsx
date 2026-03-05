import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import { getCustomerLedger, CustomerLedger } from '../../services/reportService';
import { getCustomers, Customer } from '../../services/customerService';
import ExportButtons from '../../components/ExportButtons';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const CustomerLedgerReport: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<CustomerLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');

  // Customer search state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = searchQuery.trim().length > 0
    ? customers.filter(c => {
        const q = searchQuery.toLowerCase();
        return (
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.cnic?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          String(c.id).includes(q)
        );
      })
    : [];

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setSearchQuery(`${c.name} - ${c.phone || ''} ${c.cnic ? `- ${c.cnic}` : ''}`);
    setShowDropdown(false);
    setError('');
  };

  const fetchData = async () => {
    if (!selectedCustomer) { setError(t('reports.please_enter_valid_customer_id')); return; }
    setError('');
    setLoading(true);
    try { setData(await getCustomerLedger(Number(selectedCustomer.id))); }
    catch (err) { console.error(err); setError(t('reports.customer_not_found')); setData(null); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader title={t('reports.customer_ledger')} breadcrumbs={[{ title: t('reports.installment_reports') }, { title: t('reports.customer') }]} />

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-5" ref={dropdownRef} style={{ position: 'relative' }}>
              <label className="form-label">{t('reports.search_customer')}</label>
              <input
                type="text"
                className="form-control"
                placeholder={t('reports.search_by_name_phone_cnic')}
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (selectedCustomer) setSelectedCustomer(null);
                }}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
              />
              {showDropdown && filteredCustomers.length > 0 && (
                <div className="dropdown-menu show w-100" style={{ maxHeight: 250, overflowY: 'auto', position: 'absolute', zIndex: 1050 }}>
                  {filteredCustomers.slice(0, 50).map(c => (
                    <button key={c.id} className="dropdown-item d-flex flex-column py-2" type="button" onClick={() => handleSelectCustomer(c)}>
                      <span className="fw-semibold">{c.name} <small className="text-muted">#{c.id}</small></span>
                      <small className="text-muted">
                        {c.phone && <span className="me-3"><i className="ti ti-phone me-1"></i>{c.phone}</span>}
                        {c.cnic && <span><i className="ti ti-id me-1"></i>{c.cnic}</span>}
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && searchQuery.trim().length > 0 && filteredCustomers.length === 0 && (
                <div className="dropdown-menu show w-100" style={{ position: 'absolute', zIndex: 1050 }}>
                  <span className="dropdown-item text-muted">{t('common.no_results_found')}</span>
                </div>
              )}
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={fetchData} disabled={!selectedCustomer}>{t('reports.load_ledger')}</button>
            </div>
            <div className="col-md-3 ms-auto">
              {data && <ExportButtons
                onExportExcel={() => {
                  const cols = [t('common.date'), t('reports.type'), t('common.description'), t('reports.debit'), t('reports.credit'), t('reports.running_balance'), t('common.reference')];
                  const rows = data.transactions.map(t => [new Date(t.date).toLocaleDateString(), t.type, t.description, t.debit, t.credit, t.runningBalance, t.reference || '-']);
                  exportToExcel(cols, rows, `Customer-Ledger-${data.customerName}`);
                }}
                onExportPDF={() => {
                  const cols = [t('common.date'), t('reports.type'), t('common.description'), t('reports.debit'), t('reports.credit'), t('reports.balance'), t('common.reference')];
                  const rows = data.transactions.map(t => [new Date(t.date).toLocaleDateString(), t.type, t.description, t.debit > 0 ? `Rs ${t.debit.toLocaleString()}` : '-', t.credit > 0 ? `Rs ${t.credit.toLocaleString()}` : '-', `Rs ${t.runningBalance.toLocaleString()}`, t.reference || '-']);
                  exportToPDF(cols, rows, `Customer-Ledger-${data.customerName}`, `${t('reports.customer_ledger')} - ${data.customerName}`, [
                    { label: t('reports.customer'), value: data.customerName },
                    { label: t('common.phone'), value: data.phone || '-' },
                    { label: t('reports.total_purchases'), value: `Rs ${data.totalPurchases.toLocaleString()}` },
                    { label: t('reports.total_paid'), value: `Rs ${data.totalPaid.toLocaleString()}` },
                    { label: t('reports.remaining_balance'), value: `Rs ${data.remainingBalance.toLocaleString()}` },
                  ]);
                }}
              />}
            </div>
          </div>
          {error && <div className="text-danger mt-2">{error}</div>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : data ? (
        <>
          {/* Customer Info */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3"><strong>{t('common.name')}:</strong> {data.customerName}</div>
                <div className="col-md-3"><strong>{t('common.phone')}:</strong> {data.phone || '-'}</div>
                <div className="col-md-3"><strong>{t('common.address')}:</strong> {data.address || '-'}</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="row mb-4">
            {[
              { label: t('reports.total_purchases'), value: data.totalPurchases, color: 'primary' },
              { label: t('reports.total_paid'), value: data.totalPaid, color: 'success' },
              { label: t('reports.remaining_balance'), value: data.remainingBalance, color: 'warning' },
              { label: t('reports.total_penalties'), value: data.totalPenalties, color: 'danger' },
            ].map((c, i) => (
              <div className="col-md-3 mb-3" key={i}>
                <div className={`card border-${c.color}`}>
                  <div className="card-body text-center">
                    <h6 className="text-muted">{c.label}</h6>
                    <h4 className={`text-${c.color}`}>Rs {c.value.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions */}
          <div className="card">
            <div className="card-header"><h5 className="card-title mb-0">{t('reports.transaction_history')}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('reports.type')}</th>
                      <th>{t('common.description')}</th>
                      <th>{t('reports.debit')}</th>
                      <th>{t('reports.credit')}</th>
                      <th>{t('reports.running_balance')}</th>
                      <th>{t('common.reference')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t, i) => (
                      <tr key={i}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td><span className={`badge bg-${t.type === 'Payment' ? 'success' : t.type === 'Penalty' ? 'danger' : 'primary'}`}>{t.type}</span></td>
                        <td>{t.description}</td>
                        <td>{t.debit > 0 ? `Rs ${t.debit.toLocaleString()}` : '-'}</td>
                        <td>{t.credit > 0 ? `Rs ${t.credit.toLocaleString()}` : '-'}</td>
                        <td className="fw-bold">Rs {t.runningBalance.toLocaleString()}</td>
                        <td>{t.reference || '-'}</td>
                      </tr>
                    ))}
                    {data.transactions.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted">{t('reports.no_transactions')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};

export default CustomerLedgerReport;
