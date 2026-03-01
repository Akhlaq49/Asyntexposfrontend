import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';

interface CouponDto {
  id: number;
  name: string;
  code: string;
  description?: string;
  type: string;          // Percentage | Fixed
  discount: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  oncePerCustomer: boolean;
  productId?: number;
  productName?: string;
  status: string;        // Active | Inactive
}

interface ProductOption {
  id: number;
  name: string;
  sku?: string;
}

const empty: Omit<CouponDto, 'id'> = {
  name: '',
  code: '',
  description: '',
  type: 'Percentage',
  discount: 0,
  limit: 0,
  startDate: '',
  endDate: '',
  oncePerCustomer: false,
  productId: undefined,
  productName: '',
  status: 'Active',
};

const Coupons: React.FC = () => {
  const [items, setItems] = useState<CouponDto[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSort, setFilterSort] = useState('');
  const [search, setSearch] = useState('');

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CouponDto | null>(null);
  const [form, setForm] = useState(empty);

  // delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CouponDto | null>(null);

  // product search
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  /* ─── data ─── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterSort) params.sort = filterSort;
      const [couponsRes, productsRes] = await Promise.all([
        api.get('/coupons', { params }),
        allProducts.length === 0 ? api.get('/products') : Promise.resolve(null),
      ]);
      setItems(couponsRes.data);
      if (productsRes) {
        const list = productsRes.data.data ?? productsRes.data;
        setAllProducts((list as any[]).map((p: any) => ({ id: p.id, name: p.productName || p.name, sku: p.sku })));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterType, filterStatus, filterSort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { try { (window as any).feather?.replace(); } catch {} });

  /* ─── click-away for product dropdown ─── */
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node))
        setShowProductDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ─── product lookup (local filter) ─── */
  const filteredProducts = productSearch.trim().length > 0
    ? allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))).slice(0, 8)
    : [];

  /* ─── helpers ─── */
  const openAdd = () => {
    setEditing(null);
    setForm({ ...empty });
    setProductSearch('');
    setShowProductDropdown(false);
    setShowModal(true);
  };

  const openEdit = (c: CouponDto) => {
    setEditing(c);
    setForm({
      name: c.name,
      code: c.code,
      description: c.description || '',
      type: c.type,
      discount: c.discount,
      limit: c.limit,
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      oncePerCustomer: c.oncePerCustomer,
      productId: c.productId,
      productName: c.productName || '',
      status: c.status,
    });
    setProductSearch(c.productName || '');
    setShowProductDropdown(false);
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/coupons/${editing.id}`, form);
      } else {
        await api.post('/coupons', form);
      }
      setShowModal(false);
      load();
    } catch { /* ignore */ }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/coupons/${deleteTarget.id}`);
      setShowDelete(false);
      setDeleteTarget(null);
      load();
    } catch { /* ignore */ }
  };

  /* ─── search filter ─── */
  const filtered = search
    ? items.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  /* ─── format discount display ─── */
  const fmtDiscount = (c: CouponDto) =>
    c.type === 'Percentage' ? `${c.discount}%` : `$${c.discount}`;

  return (
    <>
      <PageHeader
        title="Coupons"
        breadcrumbs={[{ title: 'Promo' }, { title: 'Coupons' }]}
      />

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input type="text" className="form-control" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Type */}
            <div className="dropdown me-2">
              <a href="#" className="btn btn-white dropdown-toggle" data-bs-toggle="dropdown">
                <i className="ti ti-sort-ascending-2 me-2"></i>Type{filterType ? `: ${filterType}` : ''}
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterType(''); }}>All</a></li>
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterType('Fixed'); }}>Fixed</a></li>
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterType('Percentage'); }}>Percentage</a></li>
              </ul>
            </div>

            {/* Status */}
            <div className="dropdown me-2">
              <a href="#" className="btn btn-white dropdown-toggle" data-bs-toggle="dropdown">
                <i className="ti ti-sort-ascending-2 me-2"></i>Status{filterStatus ? `: ${filterStatus}` : ''}
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterStatus(''); }}>All</a></li>
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterStatus('Active'); }}>Active</a></li>
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterStatus('Inactive'); }}>Inactive</a></li>
              </ul>
            </div>

            {/* Sort */}
            <div className="dropdown me-2">
              <a href="#" className="btn btn-white dropdown-toggle" data-bs-toggle="dropdown">
                <i className="ti ti-sort-ascending-2 me-2"></i>Sort By
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterSort(''); }}>Recently Added</a></li>
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterSort('Ascending'); }}>Ascending</a></li>
                <li><a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); setFilterSort('Descending'); }}>Descending</a></li>
              </ul>
            </div>

            <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); openAdd(); }}>
              <i className="ti ti-circle-plus me-1"></i>Add Coupon
            </a>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table datanew">
              <thead>
                <tr>
                  <th className="no-sort"><label className="checkboxs"><input type="checkbox" /><span className="checkmarks"></span></label></th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Discount</th>
                  <th>Limit</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th className="no-sort">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-4">No coupons found</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td><label className="checkboxs"><input type="checkbox" /><span className="checkmarks"></span></label></td>
                    <td className="text-gray-9">{c.name}</td>
                    <td><span className="badge purple-badge">{c.code}</span></td>
                    <td>{c.description}</td>
                    <td>{c.type === 'Fixed' ? 'Fixed Amount' : c.type}</td>
                    <td>{fmtDiscount(c)}</td>
                    <td>{c.limit === 0 ? 'Unlimited' : String(c.limit).padStart(2, '0')}</td>
                    <td>{c.endDate || '-'}</td>
                    <td>
                      <span className={`badge table-badge fw-medium fs-10 ${c.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="action-table-data">
                      <div className="edit-delete-action">
                        <a className="me-2 p-2" href="#" onClick={e => { e.preventDefault(); openEdit(c); }}>
                          <i data-feather="edit" className="feather-edit"></i>
                        </a>
                        <a className="p-2" href="#" onClick={e => { e.preventDefault(); setDeleteTarget(c); setShowDelete(true); }}>
                          <i data-feather="trash-2" className="feather-trash-2"></i>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Add / Edit Modal ─── */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>{editing ? 'Edit Coupon' : 'Add Coupon'}</h4></div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Name */}
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Coupon Name<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                  </div>
                  {/* Code */}
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Coupon Code<span className="text-danger ms-1">*</span></label>
                      <input type="text" className="form-control" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  {/* Type */}
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Type<span className="text-danger ms-1">*</span></label>
                      <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="Percentage">Percentage</option>
                        <option value="Fixed">Fixed</option>
                      </select>
                    </div>
                  </div>
                  {/* Discount */}
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Discount<span className="text-danger ms-1">*</span></label>
                      <input type="number" className="form-control" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  {/* Limit */}
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Limit<span className="text-danger ms-1">*</span></label>
                      <input type="number" className="form-control" value={form.limit} onChange={e => setForm({ ...form, limit: parseInt(e.target.value) || 0 })} />
                      <span className="unlimited-text fs-12">Enter 0 for Unlimited</span>
                    </div>
                  </div>
                  {/* Start Date */}
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">Start Date<span className="text-danger ms-1">*</span></label>
                      <input type="date" className="form-control" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                  </div>
                  {/* End Date */}
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">End Date<span className="text-danger ms-1">*</span></label>
                      <input type="date" className="form-control" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                  </div>
                  {/* Product + Once Per Customer */}
                  <div className="mt-3 mb-3">
                    <div className="status-toggle modal-status d-flex justify-content-between align-items-center mb-2">
                      <span className="status-label">Product</span>
                      <div className="d-flex align-items-center">
                        <input type="checkbox" id="oncePerCustomer" className="check" checked={form.oncePerCustomer} onChange={e => setForm({ ...form, oncePerCustomer: e.target.checked })} />
                        <label htmlFor="oncePerCustomer" className="checktoggle mb-0 me-1"></label>
                        <span className="customer-toggle">Once Per Customer</span>
                      </div>
                    </div>
                    <div className="position-relative" ref={productSearchRef}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search product..."
                        value={productSearch}
                        onChange={e => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          if (!e.target.value) setForm(prev => ({ ...prev, productId: undefined, productName: '' }));
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                      />
                      {showProductDropdown && filteredProducts.length > 0 && (
                        <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 1050, maxHeight: 200, overflowY: 'auto' }}>
                          {filteredProducts.map(p => (
                            <li
                              key={p.id}
                              className="list-group-item list-group-item-action"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setForm(prev => ({ ...prev, productId: p.id, productName: p.name }));
                                setProductSearch(p.name);
                                setShowProductDropdown(false);
                              }}
                            >
                              {p.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {/* Description */}
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Maximum 60 Words" />
                  </div>
                  {/* Status */}
                  <div className="m-0">
                    <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                      <span className="status-label">Status</span>
                      <input
                        type="checkbox"
                        id="couponStatus"
                        className="check"
                        checked={form.status === 'Active'}
                        onChange={e => setForm({ ...form, status: e.target.checked ? 'Active' : 'Inactive' })}
                      />
                      <label htmlFor="couponStatus" className="checktoggle"></label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Add Coupon'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ─── */}
      {showDelete && deleteTarget && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger"></i>
                  </span>
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Coupon</h4>
                  <p className="mb-0 fs-16">Are you sure you want to delete coupon?</p>
                  <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                    <button type="button" className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none" onClick={() => setShowDelete(false)}>Cancel</button>
                    <button type="button" className="btn btn-primary fs-13 fw-medium p-2 px-3" onClick={confirmDelete}>Yes Delete</button>
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

export default Coupons;
