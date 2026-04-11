import { useState, useEffect } from 'react';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import { showSuccess, showError } from '../../utils/alertUtils';
import {
  getSupplierLedger, getSupplierPayments, createSupplierPayment, deleteSupplierPayment,
  getSupplierBalances,
  type SupplierLedgerEntry, type SupplierPayment, type SupplierBalance, type CreateSupplierPaymentPayload
} from '../../services/manufacturingService';

interface SupplierOption { id: number; fullName: string; phone?: string; email?: string; }

const SupplierLedger = () => {
  const [activeTab, setActiveTab] = useState<'balances' | 'ledger' | 'payments'>('balances');
  const [balances, setBalances] = useState<SupplierBalance[]>([]);
  const [ledger, setLedger] = useState<SupplierLedgerEntry[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<CreateSupplierPaymentPayload>({
    supplierId: 0, reference: '', amount: 0, paymentMethod: 'Cash', description: ''
  });

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);

  useEffect(() => { loadSuppliers(); }, []);
  useEffect(() => { loadData(); }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const { default: api } = await import('../../services/api');
      const resp = await api.get('/parties?role=Supplier');
      setSuppliers(resp.data || []);
    } catch { setSuppliers([]); }
  };

  const loadData = async () => {
    setLoading(true);
    const [balData, ledgerData, payData] = await Promise.all([
      getSupplierBalances(),
      getSupplierLedger(selectedSupplier),
      getSupplierPayments(selectedSupplier)
    ]);
    setBalances(balData);
    setLedger(ledgerData);
    setPayments(payData);
    setLoading(false);
  };

  const openPaymentModal = (supplierId?: number) => {
    setPaymentForm({
      supplierId: supplierId || 0, reference: `PAY-${Date.now().toString().slice(-6)}`,
      amount: 0, paymentMethod: 'Cash', description: ''
    });
    setShowPayment(true);
  };

  const handleCreatePayment = async () => {
    if (!paymentForm.supplierId || paymentForm.amount <= 0) { showError('Select supplier and enter amount'); return; }
    const result = await createSupplierPayment(paymentForm);
    if (result) { showSuccess('Payment recorded'); setShowPayment(false); loadData(); }
    else showError('Failed to record payment');
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    try {
      const ok = await deleteSupplierPayment(deletePaymentId);
      if (ok) { showSuccess('Payment deleted and ledger reversed'); loadData(); }
    } catch (err: any) {
      showError(err?.message || 'Failed to delete payment');
    }
    setShowDelete(false); setDeletePaymentId(null);
  };

  const filteredBalances = balances.filter(b => !search || b.supplierName.toLowerCase().includes(search.toLowerCase()));
  const filteredLedger = ledger.filter(l => !search || l.supplierName.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase()));
  const filteredPayments = payments.filter(p => !search || p.supplierName.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="page-wrapper"><div className="content"><div className="text-center py-5"><div className="spinner-border" /></div></div></div>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Supplier Ledger & Payments</h4>
              <h6>Track supplier balances, transactions, and payments</h6>
            </div>
          </div>
          <div className="page-btn">
            <button className="btn btn-added" onClick={() => openPaymentModal()}><i className="ti ti-plus me-1" />Record Payment</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body py-3">
                <h6 className="text-white mb-1">Total Suppliers</h6>
                <h3 className="text-white mb-0">{balances.length}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-danger text-white">
              <div className="card-body py-3">
                <h6 className="text-white mb-1">Total Payable</h6>
                <h3 className="text-white mb-0">{balances.reduce((s, b) => s + Math.max(b.balance, 0), 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-success text-white">
              <div className="card-body py-3">
                <h6 className="text-white mb-1">Total Paid</h6>
                <h3 className="text-white mb-0">{balances.reduce((s, b) => s + b.totalPayments, 0).toFixed(2)}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="card-body">
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item"><button className={`nav-link ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>Supplier Balances</button></li>
              <li className="nav-item"><button className={`nav-link ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>Transaction Ledger</button></li>
              <li className="nav-item"><button className={`nav-link ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>Payments</button></li>
            </ul>

            <div className="table-top mb-3">
              <div className="search-set">
                <div className="search-input">
                  <input type="text" className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                  <span className="btn btn-searchset"><i className="ti ti-search" /></span>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <select className="form-select form-select-sm" style={{ width: 200 }} value={selectedSupplier || ''} onChange={e => setSelectedSupplier(e.target.value ? +e.target.value : undefined)}>
                  <option value="">All Suppliers</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </div>
            </div>

            {/* Balances Tab */}
            {activeTab === 'balances' && (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Supplier</th><th>Phone</th><th>Email</th><th>Total Purchases</th><th>Total Payments</th><th>Balance</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredBalances.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-4 text-muted">No supplier balances found</td></tr>
                    ) : filteredBalances.map(b => (
                      <tr key={b.supplierId}>
                        <td><strong>{b.supplierName}</strong></td>
                        <td>{b.supplierPhone || '-'}</td>
                        <td>{b.supplierEmail || '-'}</td>
                        <td>{b.totalPurchases.toFixed(2)}</td>
                        <td>{b.totalPayments.toFixed(2)}</td>
                        <td><span className={`fw-bold ${b.balance > 0 ? 'text-danger' : 'text-success'}`}>{b.balance.toFixed(2)}</span></td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-primary" onClick={() => openPaymentModal(b.supplierId)} title="Make Payment"><i className="ti ti-cash" /></button>
                            <button className="btn btn-sm btn-info" onClick={() => { setSelectedSupplier(b.supplierId); setActiveTab('ledger'); }} title="View Ledger"><i className="ti ti-list" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ledger Tab */}
            {activeTab === 'ledger' && (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Date</th><th>Supplier</th><th>Type</th><th>Reference</th><th>Description</th><th>Amount</th><th>Balance</th></tr></thead>
                  <tbody>
                    {filteredLedger.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-4 text-muted">No transactions found</td></tr>
                    ) : filteredLedger.map(entry => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        <td>{entry.supplierName}</td>
                        <td>
                          <span className={`badge ${entry.transactionType === 'Payment' || entry.transactionType === 'Credit' ? 'bg-success' : 'bg-danger'}`}>
                            {entry.transactionType}
                          </span>
                        </td>
                        <td><small>{entry.referenceType} {entry.referenceId ? `#${entry.referenceId}` : ''}</small></td>
                        <td><small>{entry.description}</small></td>
                        <td className={entry.transactionType === 'Payment' || entry.transactionType === 'Credit' ? 'text-success' : 'text-danger'}>
                          {entry.transactionType === 'Payment' || entry.transactionType === 'Credit' ? '-' : '+'}{entry.amount.toFixed(2)}
                        </td>
                        <td><strong>{entry.runningBalance.toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Date</th><th>Supplier</th><th>Reference</th><th>Method</th><th>Amount</th><th>Description</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-4 text-muted">No payments found</td></tr>
                    ) : filteredPayments.map(p => (
                      <tr key={p.id}>
                        <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td>{p.supplierName}</td>
                        <td>{p.reference}</td>
                        <td><span className="badge bg-info">{p.paymentMethod}</span></td>
                        <td><strong>{p.amount.toFixed(2)}</strong></td>
                        <td><small>{p.description}</small></td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => { setDeletePaymentId(p.id); setShowDelete(true); }}><i className="ti ti-trash" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Record Supplier Payment</h5>
                <button className="btn-close" onClick={() => setShowPayment(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Supplier *</label>
                  <select className="form-select" value={paymentForm.supplierId} onChange={e => setPaymentForm({ ...paymentForm, supplierId: +e.target.value })}>
                    <option value={0}>-- Select Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Reference</label>
                  <input className="form-control" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Amount *</label>
                  <input type="number" className="form-control" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: +e.target.value })} min={0} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={paymentForm.paymentMethod} onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={paymentForm.description || ''} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreatePayment}>Record Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal show={showDelete} onClose={() => { setShowDelete(false); setDeletePaymentId(null); }} onConfirm={handleDeletePayment} />
    </div>
  );
};

export default SupplierLedger;
