import React, { useState, useEffect } from 'react';
import { 
  MiscTransaction, 
  CreateMiscTransaction, 
  getMiscSummary, 
  getCustomerMiscTransactions, 
  createMiscTransaction, 
  deleteMiscTransaction 
} from '../../services/miscService';

interface CustomerMiscSummary {
  customerId: number;
  customerName: string;
  totalCredits: number;
  totalDebits: number;
  balance: number;
  transactionCount: number;
  lastTransaction: string;
}

const MiscBalanceManagement: React.FC = () => {
  const [summary, setSummary] = useState<CustomerMiscSummary[]>([]);
  const [transactions, setTransactions] = useState<MiscTransaction[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateMiscTransaction>({
    customerId: 0,
    transactionType: 'Credit',
    amount: 0,
    description: '',
    referenceType: 'ManualAdjustment'
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await getMiscSummary();
      setSummary(data);
    } catch {
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerTransactions = async (customerId: string, customerName: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customerName);
    try {
      const data = await getCustomerMiscTransactions(customerId);
      setTransactions(data);
    } catch {
      setTransactions([]);
    }
  };

  const openAddModal = (customerId: number, customerName: string) => {
    setForm({
      customerId,
      transactionType: 'Credit',
      amount: 0,
      description: '',
      referenceType: 'ManualAdjustment'
    });
    setSelectedCustomerName(customerName);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || form.amount <= 0) return;
    setSaving(true);
    try {
      await createMiscTransaction(form);
      setShowAddModal(false);
      await fetchSummary();
      if (selectedCustomerId) {
        await fetchCustomerTransactions(selectedCustomerId, selectedCustomerName);
      }
    } catch {
      alert('Failed to create transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteMiscTransaction(id);
      await fetchSummary();
      if (selectedCustomerId) {
        await fetchCustomerTransactions(selectedCustomerId, selectedCustomerName);
      }
    } catch {
      alert('Failed to delete transaction');
    }
  };

  const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Misc Balance Management</h4>
            <h6>Manage customer miscellaneous account balances</h6>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Summary */}
        <div className={selectedCustomerId ? "col-lg-6" : "col-12"}>
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Customer Balances</h5>
              <button className="btn btn-primary btn-sm" onClick={fetchSummary}>
                <i className="ti ti-refresh me-1"></i>Refresh
              </button>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>
              ) : summary.length === 0 ? (
                <div className="text-center p-5 text-muted">No customers with misc balances found</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th>Customer</th>
                        <th>Balance</th>
                        <th>Transactions</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((s) => (
                        <tr key={s.customerId}>
                          <td>
                            <div>
                              <span className="fw-medium">{s.customerName}</span>
                              <small className="text-muted d-block">Last: {formatDate(s.lastTransaction)}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`fw-medium ${s.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                              {formatAmount(s.balance)}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-primary-transparent">{s.transactionCount}</span>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button 
                                className="btn btn-icon btn-sm" 
                                title="View Transactions"
                                onClick={() => fetchCustomerTransactions(s.customerId.toString(), s.customerName)}
                              >
                                <i className="ti ti-eye text-primary"></i>
                              </button>
                              <button 
                                className="btn btn-icon btn-sm" 
                                title="Add Transaction"
                                onClick={() => openAddModal(s.customerId, s.customerName)}
                              >
                                <i className="ti ti-plus text-success"></i>
                              </button>
                            </div>
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

        {/* Transactions */}
        {selectedCustomerId && (
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0">{selectedCustomerName} - Transactions</h5>
                <button className="btn btn-outline-primary btn-sm" onClick={() => openAddModal(parseInt(selectedCustomerId), selectedCustomerName)}>
                  <i className="ti ti-plus me-1"></i>Add Transaction
                </button>
              </div>
              <div className="card-body p-0">
                {transactions.length === 0 ? (
                  <div className="text-center p-5 text-muted">No transactions found</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="thead-light">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <small>{formatDate(t.createdAt)}</small>
                            </td>
                            <td>
                              <span className={`badge ${t.transactionType === 'Credit' ? 'bg-success' : 'bg-danger'}`}>
                                {t.transactionType}
                              </span>
                            </td>
                            <td className={t.transactionType === 'Credit' ? 'text-success' : 'text-danger'}>
                              {t.transactionType === 'Credit' ? '+' : '-'}{formatAmount(t.amount)}
                            </td>
                            <td>
                              <div>
                                <span className="fw-medium">{t.description}</span>
                                {t.referenceType !== 'ManualAdjustment' && (
                                  <small className="text-muted d-block">{t.referenceType}</small>
                                )}
                              </div>
                            </td>
                            <td>
                              <button 
                                className="btn btn-icon btn-sm" 
                                title="Delete"
                                onClick={() => handleDelete(t.id)}
                              >
                                <i className="ti ti-trash text-danger"></i>
                              </button>
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
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ti ti-plus me-2"></i>Add Transaction - {selectedCustomerName}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Transaction Type<span className="text-danger ms-1">*</span></label>
                    <select 
                      className="form-select" 
                      value={form.transactionType}
                      onChange={(e) => setForm({...form, transactionType: e.target.value as 'Credit' | 'Debit'})}
                    >
                      <option value="Credit">Credit (Add Balance)</option>
                      <option value="Debit">Debit (Deduct Balance)</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Amount<span className="text-danger ms-1">*</span></label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Enter amount"
                      value={form.amount || ''}
                      onChange={(e) => setForm({...form, amount: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-12 mb-0">
                    <label className="form-label">Description<span className="text-danger ms-1">*</span></label>
                    <textarea 
                      className="form-control" 
                      rows={3}
                      placeholder="Enter transaction description"
                      value={form.description}
                      onChange={(e) => setForm({...form, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={!form.description.trim() || form.amount <= 0 || saving}
                >
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="ti ti-check me-1"></i>Save Transaction</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MiscBalanceManagement;