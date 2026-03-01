import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { mediaUrl } from '../../services/api';

interface InvoiceItemDto {
  id: number; description: string; quantity: number; cost: number; discount: number; total: number;
}
interface InvoiceDto {
  id: number; invoiceNo: string; customerId: number | null; customerName: string;
  customerImage: string | null; totalAmount: number; paid: number; amountDue: number;
  status: string; dueDate: string; createdAt: string;
  items: InvoiceItemDto[];
}
interface CustomerResult { id: number; name: string; }

const STATUS_OPTIONS = ['Paid', 'Unpaid', 'Overdue'];

const statusBadge = (s: string) => {
  if (s === 'Paid') return 'badge-soft-success';
  if (s === 'Unpaid') return 'badge-soft-danger';
  if (s === 'Overdue') return 'badge-soft-warning';
  return 'badge-soft-secondary';
};

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Invoice: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setCustomers] = useState<CustomerResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  /* select */
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, cRes] = await Promise.all([
        api.get<InvoiceDto[]>('/invoices'),
        api.get<CustomerResult[]>('/customers'),
      ]);
      setInvoices(iRes.data);
      setCustomers(cRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace(); });

  /* distinct customer names from invoices for filter */
  const customerNames = [...new Set(invoices.map(i => i.customerName).filter(Boolean))];

  const filtered = invoices
    .filter((inv) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || inv.invoiceNo.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q);
      const matchCustomer = !filterCustomer || inv.customerName === filterCustomer;
      const matchStatus = !filterStatus || inv.status === filterStatus;
      return matchSearch && matchCustomer && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') return a.totalAmount - b.totalAmount;
      if (sortBy === 'desc') return b.totalAmount - a.totalAmount;
      return 0; // recent = default server order
    });

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(filtered.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { setSelectedIds(prev => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; }); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/invoices/${deleteId}`); setShowDeleteModal(false); setDeleteId(null); fetchData(); } catch { /* ignore */ }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Invoices</h4>
            <h6>Manage your stock invoices</h6>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Customer filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterCustomer || 'Customer'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCustomer(''); }}>All</a></li>
                {customerNames.map(c => (
                  <li key={c}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterCustomer(c); }}>{c}</a></li>
                ))}
              </ul>
            </div>
            {/* Status filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {filterStatus || 'Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>All</a></li>
                {STATUS_OPTIONS.map(s => (
                  <li key={s}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            {/* Sort */}
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                Sort By: {sortBy === 'asc' ? 'Ascending' : sortBy === 'desc' ? 'Descending' : 'Recently Added'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('recent'); }}>Recently Added</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('asc'); }}>Ascending</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('desc'); }}>Descending</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table datanew">
                <thead>
                  <tr>
                    <th className="no-sort">
                      <label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label>
                    </th>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Amount Due</th>
                    <th>Status</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-4">No invoices found</td></tr>
                  ) : filtered.map(inv => (
                    <tr key={inv.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(inv.id)} onChange={e => handleSelectOne(inv.id, e.target.checked)} /><span className="checkmarks"></span></label>
                      </td>
                      <td><Link to={`/invoice-details/${inv.id}`}>{inv.invoiceNo}</Link></td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2">
                            <img src={inv.customerImage ? mediaUrl(inv.customerImage) : '/assets/img/users/user-01.jpg'} alt="" />
                          </a>
                          <a href="#">{inv.customerName}</a>
                        </div>
                      </td>
                      <td>{inv.dueDate}</td>
                      <td>{fmt(inv.totalAmount)}</td>
                      <td>{fmt(inv.paid)}</td>
                      <td>{fmt(inv.amountDue)}</td>
                      <td>
                        <span className={`badge ${statusBadge(inv.status)} badge-xs shadow-none`}>
                          <i className="ti ti-point-filled me-1"></i>{inv.status}
                        </span>
                      </td>
                      <td className="d-flex">
                        <div className="edit-delete-action d-flex align-items-center justify-content-center">
                          <Link className="me-2 p-2 d-flex align-items-center justify-content-between border rounded" to={`/invoice-details/${inv.id}`}>
                            <i data-feather="eye" className="feather-eye"></i>
                          </Link>
                          <a className="p-2 d-flex align-items-center justify-content-between border rounded" href="#"
                            onClick={e => { e.preventDefault(); setDeleteId(inv.id); setShowDeleteModal(true); }}>
                            <i data-feather="trash-2" className="feather-trash-2"></i>
                          </a>
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

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body p-0">
                <div className="success-wrap text-center p-4">
                  <div className="icon-success bg-danger-transparent text-danger mb-2" style={{ width: 50, height: 50, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-trash fs-20"></i>
                  </div>
                  <h3 className="mb-2">Delete Invoice</h3>
                  <p className="fs-16 mb-3">Are you sure you want to delete this invoice?</p>
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteId(null); }}>No, Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={confirmDelete}>Yes, Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Invoice;
