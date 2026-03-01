import React, { useState, useEffect } from 'react';
import { getPayrolls, createPayroll, updatePayroll, deletePayroll, getEmployees, Payroll, CreatePayroll, Employee } from '../../services/hrmService';
import { showSuccess, showError } from '../../utils/alertUtils';

const EmployeeSalary: React.FC = () => {
  const [items, setItems] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const emptyForm: CreatePayroll = { employeeId: 0, basicSalary: 0, hra: 0, conveyance: 0, medicalAllowance: 0, bonus: 0, otherAllowance: 0, pf: 0, professionalTax: 0, tds: 0, loanDeduction: 0, otherDeduction: 0, totalAllowance: 0, totalDeduction: 0, netSalary: 0, status: 'Unpaid', month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const [form, setForm] = useState<CreatePayroll>({ ...emptyForm });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyFilters(); }, [items, searchTerm, filterStatus, sortBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrolls, emps] = await Promise.all([getPayrolls(), getEmployees()]);
      setItems(payrolls); setEmployees(emps);
    } catch { showError('Failed to load payroll'); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = items;
    if (searchTerm) { const q = searchTerm.toLowerCase(); result = result.filter(i => i.employeeName.toLowerCase().includes(q) || (i.employeeEmail || '').toLowerCase().includes(q)); }
    if (filterStatus) result = result.filter(i => i.status === filterStatus);
    if (sortBy === 'asc') result = [...result].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    else if (sortBy === 'desc') result = [...result].sort((a, b) => b.employeeName.localeCompare(a.employeeName));
    setFiltered(result);
    setCurrentPage(1);
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => { setSelectAll(checked); setSelectedIds(checked ? new Set(paginated.map(i => i.id)) : new Set()); };
  const handleSelectOne = (id: number, checked: boolean) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); setSelectAll(next.size === paginated.length); };

  const recalcTotals = (f: CreatePayroll): CreatePayroll => {
    const totalAllowance = f.basicSalary + f.hra + f.conveyance + f.medicalAllowance + f.bonus + f.otherAllowance;
    const totalDeduction = f.pf + f.professionalTax + f.tds + f.loanDeduction + f.otherDeduction;
    return { ...f, totalAllowance, totalDeduction, netSalary: totalAllowance - totalDeduction };
  };

  const updateForm = (partial: Partial<CreatePayroll>) => { setForm(prev => recalcTotals({ ...prev, ...partial })); };

  const openAddModal = () => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEditModal = (item: Payroll) => {
    setEditingId(item.id);
    setForm({ employeeId: item.employeeId, basicSalary: item.basicSalary, hra: item.hra, conveyance: item.conveyance, medicalAllowance: item.medicalAllowance, bonus: item.bonus, otherAllowance: item.otherAllowance, pf: item.pf, professionalTax: item.professionalTax, tds: item.tds, loanDeduction: item.loanDeduction, otherDeduction: item.otherDeduction, totalAllowance: item.totalAllowance, totalDeduction: item.totalDeduction, netSalary: item.netSalary, status: item.status, month: item.month, year: item.year });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employeeId) { showError('Employee is required'); return; }
    try {
      const data = recalcTotals(form);
      if (editingId) await updatePayroll(editingId, data);
      else await createPayroll(data);
      setShowModal(false); showSuccess(editingId ? 'Salary updated' : 'Salary created'); loadData();
    } catch { showError('Failed to save'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deletePayroll(deleteId); setShowDeleteModal(false); setDeleteId(null); showSuccess('Payroll deleted'); loadData(); }
    catch { showError('Failed to delete'); }
  };

  const statusBadge = (s: string) => s === 'Paid' ? 'badge-success' : 'badge-warning';
  const fmtCurrency = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <>
      <div className="page-header">
        <div className="add-item d-flex"><div className="page-title"><h4>Employee Salary</h4><h6>Manage employee salary</h6></div></div>
        <div className="page-btn"><a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAddModal(); }}><i className="ti ti-circle-plus me-1"></i>Add Salary</a></div>
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set"><div className="search-input"><a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a><input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">{filterStatus || 'Status'}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>All</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('Paid'); }}>Paid</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setFilterStatus('Unpaid'); }}>Unpaid</a></li>
              </ul>
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">Sort By: {sortBy === 'asc' ? 'Ascending' : sortBy === 'desc' ? 'Descending' : 'Recently Added'}</a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('recent'); }}>Recently Added</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('asc'); }}>Ascending</a></li>
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setSortBy('desc'); }}>Descending</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div> : (
            <div className="table-responsive">
              <table className="table datanew">
                <thead>
                  <tr>
                    <th className="no-sort"><label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label></th>
                    <th>Employee</th><th>Email</th><th>Salary</th><th>Net Salary</th><th>Month</th><th>Status</th><th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? <tr><td colSpan={8} className="text-center py-4">No payroll records found</td></tr> : paginated.map(item => (
                    <tr key={item.id}>
                      <td><label className="checkboxs"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectOne(item.id, e.target.checked)} /><span className="checkmarks"></span></label></td>
                      <td><div className="d-flex align-items-center"><a href="#" className="avatar avatar-md me-2"><img src={item.employeePicture || '/assets/img/users/user-01.jpg'} alt="" /></a><a href="#">{item.employeeName}</a></div></td>
                      <td>{item.employeeEmail}</td>
                      <td>{fmtCurrency(item.basicSalary)}</td>
                      <td>{fmtCurrency(item.netSalary)}</td>
                      <td>{item.month && item.year ? `${months[(item.month || 1) - 1]} ${item.year}` : '—'}</td>
                      <td><span className={`badge ${statusBadge(item.status)} d-inline-flex align-items-center badge-xs`}><i className="ti ti-point-filled me-1"></i>{item.status}</span></td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown"><i className="fa fa-ellipsis-v"></i></a>
                        <ul className="dropdown-menu">
                          <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); openEditModal(item); }}><i data-feather="edit" className="info-img"></i>Edit</a></li>
                          <li><a className="dropdown-item" href={`/payslip?id=${item.id}`}><i data-feather="eye" className="info-img"></i>View Payslip</a></li>
                          <li><a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); setDeleteId(item.id); setShowDeleteModal(true); }}><i data-feather="trash-2" className="info-img"></i>Delete</a></li>
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header"><h4 className="modal-title">{editingId ? 'Edit Salary' : 'Add Salary'}</h4><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-6"><div className="mb-3"><label className="form-label">Employee<span className="text-danger ms-1">*</span></label>
                    <select className="form-select" value={form.employeeId || ''} onChange={e => updateForm({ employeeId: parseInt(e.target.value) || 0 })}>
                      <option value="">Select Employee</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}{emp.lastName ? ` ${emp.lastName}` : ''}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-3"><div className="mb-3"><label className="form-label">Month</label>
                    <select className="form-select" value={form.month || ''} onChange={e => updateForm({ month: parseInt(e.target.value) || undefined })}>
                      {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div></div>
                  <div className="col-lg-3"><div className="mb-3"><label className="form-label">Year</label><input type="number" className="form-control" value={form.year || ''} onChange={e => updateForm({ year: parseInt(e.target.value) || undefined })} /></div></div>
                </div>

                <h6 className="text-primary mb-3">Earnings</h6>
                <div className="row">
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Basic Salary</label><input type="number" className="form-control" value={form.basicSalary} onChange={e => updateForm({ basicSalary: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">HRA</label><input type="number" className="form-control" value={form.hra} onChange={e => updateForm({ hra: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Conveyance</label><input type="number" className="form-control" value={form.conveyance} onChange={e => updateForm({ conveyance: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Medical Allowance</label><input type="number" className="form-control" value={form.medicalAllowance} onChange={e => updateForm({ medicalAllowance: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Bonus</label><input type="number" className="form-control" value={form.bonus} onChange={e => updateForm({ bonus: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Other Allowance</label><input type="number" className="form-control" value={form.otherAllowance} onChange={e => updateForm({ otherAllowance: parseFloat(e.target.value) || 0 })} /></div></div>
                </div>

                <h6 className="text-danger mb-3">Deductions</h6>
                <div className="row">
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">PF</label><input type="number" className="form-control" value={form.pf} onChange={e => updateForm({ pf: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Professional Tax</label><input type="number" className="form-control" value={form.professionalTax} onChange={e => updateForm({ professionalTax: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">TDS</label><input type="number" className="form-control" value={form.tds} onChange={e => updateForm({ tds: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Loan Deduction</label><input type="number" className="form-control" value={form.loanDeduction} onChange={e => updateForm({ loanDeduction: parseFloat(e.target.value) || 0 })} /></div></div>
                  <div className="col-lg-4"><div className="mb-3"><label className="form-label">Other Deduction</label><input type="number" className="form-control" value={form.otherDeduction} onChange={e => updateForm({ otherDeduction: parseFloat(e.target.value) || 0 })} /></div></div>
                </div>

                <div className="row bg-light rounded p-3">
                  <div className="col-lg-4"><strong>Total Earnings:</strong> {fmtCurrency(form.totalAllowance)}</div>
                  <div className="col-lg-4"><strong>Total Deductions:</strong> {fmtCurrency(form.totalDeduction)}</div>
                  <div className="col-lg-4"><strong>Net Salary:</strong> {fmtCurrency(form.netSalary)}</div>
                </div>

                <div className="mt-3"><label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Unpaid">Unpaid</option><option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn me-2 btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleSave}>{editingId ? 'Save Changes' : 'Submit'}</button></div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-5">
              <div className="modal-body text-center p-0">
                <div className="mb-3"><i className="ti ti-trash-x fs-36 text-danger"></i></div>
                <h4>Delete Payroll</h4><p className="text-muted">Are you sure you want to delete this payroll record?</p>
                <div className="d-flex justify-content-center gap-2"><button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button><button className="btn btn-danger" onClick={confirmDelete}>Delete</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeSalary;

