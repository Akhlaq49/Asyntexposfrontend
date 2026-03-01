import React, { useState, useEffect, useCallback } from 'react';
import api, { mediaUrl } from '../../services/api';

interface ProductDto {
  id: string;
  warehouse: string;
  store: string;
  productName: string;
  category: string;
  sku: string;
  quantity: number;
  quantityAlert: number;
  images: string[];
}

interface LowStockItem {
  id: string;
  warehouse: string;
  store: string;
  name: string;
  image: string;
  category: string;
  sku: string;
  qty: number;
  qtyAlert: number;
}

const mapDto = (dto: ProductDto): LowStockItem => ({
  id: dto.id,
  warehouse: dto.warehouse,
  store: dto.store,
  name: dto.productName,
  image: dto.images && dto.images.length > 0 ? dto.images[0] : '',
  category: dto.category,
  sku: dto.sku,
  qty: dto.quantity,
  qtyAlert: dto.quantityAlert,
});

const LowStocks: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'low' | 'out'>('low');
  const [lowStocks, setLowStocks] = useState<LowStockItem[]>([]);
  const [outOfStocks, setOutOfStocks] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Select all
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '', warehouse: '', store: '', sku: '', category: '', name: '', qty: 0, qtyAlert: 0,
  });

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Send email modal
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lowRes, outRes] = await Promise.all([
        api.get<ProductDto[]>('/products/low-stocks'),
        api.get<ProductDto[]>('/products/out-of-stocks'),
      ]);
      setLowStocks(lowRes.data.map(mapDto));
      setOutOfStocks(outRes.data.map(mapDto));
    } catch {
      setLowStocks([]);
      setOutOfStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Feather icons
  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  // Current tab data
  const currentData = activeTab === 'low' ? lowStocks : outOfStocks;

  // Filter
  const filteredData = currentData.filter((p) => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchWarehouse = !warehouseFilter || p.warehouse === warehouseFilter;
    const matchStore = !storeFilter || p.store === storeFilter;
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchWarehouse && matchStore && matchCategory;
  });

  // Unique values for filters
  const allItems = [...lowStocks, ...outOfStocks];
  const warehouses = [...new Set(allItems.map((p) => p.warehouse).filter(Boolean))];
  const stores = [...new Set(allItems.map((p) => p.store).filter(Boolean))];
  const categories = [...new Set(allItems.map((p) => p.category).filter(Boolean))];

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(filteredData.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredData]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const openEditModal = (item: LowStockItem) => {
    setEditForm({
      id: item.id,
      warehouse: item.warehouse,
      store: item.store,
      sku: item.sku,
      category: item.category,
      name: item.name,
      qty: item.qty,
      qtyAlert: item.qtyAlert,
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/products/low-stocks/${editForm.id}`, {
        warehouse: editForm.warehouse,
        store: editForm.store,
        sku: editForm.sku,
        category: editForm.category,
        productName: editForm.name,
        quantity: editForm.qty,
        quantityAlert: editForm.qtyAlert,
      });
      await fetchData();
    } catch {
      // Update locally on API failure
      const updater = (prev: LowStockItem[]) =>
        prev.map((p) =>
          p.id === editForm.id
            ? { ...p, warehouse: editForm.warehouse, store: editForm.store, sku: editForm.sku, category: editForm.category, name: editForm.name, qty: editForm.qty, qtyAlert: editForm.qtyAlert }
            : p
        );
      setLowStocks(updater);
      setOutOfStocks(updater);
    }
    setShowEditModal(false);
  };

  const openDeleteModal = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/products/${deleteId}`);
    } catch {
      // ignore
    }
    setLowStocks((prev) => prev.filter((p) => p.id !== deleteId));
    setOutOfStocks((prev) => prev.filter((p) => p.id !== deleteId));
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  const renderTable = () => (
    <div className="table-responsive">
      <table className="table datatable">
        <thead className="thead-light">
          <tr>
            <th className="no-sort">
              <label className="checkboxs">
                <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} />
                <span className="checkmarks"></span>
              </label>
            </th>
            <th>Warehouse</th>
            <th>Store</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>SKU</th>
            <th>Qty</th>
            <th>Qty Alert</th>
            <th className="no-sort"></th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item) => (
            <tr key={item.id}>
              <td>
                <label className="checkboxs">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                  />
                  <span className="checkmarks"></span>
                </label>
              </td>
              <td>{item.warehouse}</td>
              <td>{item.store}</td>
              <td>
                <div className="d-flex align-items-center">
                  <a href="#" className="avatar avatar-md me-2" onClick={(e) => e.preventDefault()}>
                    <img src={mediaUrl(item.image)} alt="product" />
                  </a>
                  <a href="#" onClick={(e) => e.preventDefault()}>{item.name}</a>
                </div>
              </td>
              <td>{item.category}</td>
              <td>{item.sku}</td>
              <td>{item.qty}</td>
              <td>{item.qtyAlert}</td>
              <td className="action-table-data">
                <div className="edit-delete-action">
                  <a
                    className="me-2 p-2"
                    href="#"
                    onClick={(e) => { e.preventDefault(); openEditModal(item); }}
                  >
                    <i data-feather="edit" className="feather-edit"></i>
                  </a>
                  <a
                    className="p-2"
                    href="#"
                    onClick={(e) => { e.preventDefault(); openDeleteModal(item.id); }}
                  >
                    <i data-feather="trash-2" className="feather-trash-2"></i>
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFilters = () => (
    <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
      <div className="search-set">
        <div className="search-input">
          <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
          <input
            type="text"
            className="form-control"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
        {/* Warehouse Filter */}
        <div className="dropdown me-2">
          <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
            {warehouseFilter || 'Warehouse'}
          </a>
          <ul className="dropdown-menu dropdown-menu-end p-3">
            <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setWarehouseFilter(''); }}>All</a></li>
            {warehouses.map((w) => (
              <li key={w}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setWarehouseFilter(w); }}>{w}</a></li>
            ))}
          </ul>
        </div>
        {/* Store Filter */}
        <div className="dropdown me-2">
          <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
            {storeFilter || 'Store'}
          </a>
          <ul className="dropdown-menu dropdown-menu-end p-3">
            <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStoreFilter(''); }}>All</a></li>
            {stores.map((s) => (
              <li key={s}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setStoreFilter(s); }}>{s}</a></li>
            ))}
          </ul>
        </div>
        {/* Category Filter */}
        <div className="dropdown">
          <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
            {categoryFilter || 'Category'}
          </a>
          <ul className="dropdown-menu dropdown-menu-end p-3">
            <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setCategoryFilter(''); }}>All</a></li>
            {categories.map((c) => (
              <li key={c}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setCategoryFilter(c); }}>{c}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title me-auto">
          <h4 className="fw-bold">Low Stocks</h4>
          <h6>Manage your low stocks</h6>
        </div>
        <ul className="table-top-head low-stock-top-head">
          <li>
            <a href="#" data-bs-placement="top" title="Pdf" onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/pdf.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Excel" onClick={(e) => e.preventDefault()}>
              <img src="/assets/img/icons/excel.svg" alt="img" />
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); fetchData(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Collapse" onClick={(e) => e.preventDefault()}>
              <i className="ti ti-chevron-up"></i>
            </a>
          </li>
          <li>
            <a href="#" className="btn btn-secondary w-auto shadow-none" onClick={(e) => { e.preventDefault(); setShowEmailModal(true); }}>
              <i data-feather="mail" className="feather-mail"></i>Send Email
            </a>
          </li>
        </ul>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <ul className="nav nav-pills low-stock-tab d-flex me-2 mb-0" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'low' ? 'active' : ''}`}
                type="button"
                onClick={() => { setActiveTab('low'); setSelectAll(false); setSelectedIds(new Set()); }}
              >
                Low Stocks
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'out' ? 'active' : ''}`}
                type="button"
                onClick={() => { setActiveTab('out'); setSelectAll(false); setSelectedIds(new Set()); }}
              >
                Out of Stocks
              </button>
            </li>
          </ul>
          <div className="notify d-flex bg-white p-1 px-2 border rounded">
            <div className="status-toggle text-secondary d-flex justify-content-between align-items-center">
              <input type="checkbox" id="notify-toggle" className="check" defaultChecked />
              <label htmlFor="notify-toggle" className="checktoggle me-2">checkbox</label>
              Notify
            </div>
          </div>
        </div>

        {/* Card with table */}
        <div className="card">
          {renderFilters()}
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              renderTable()
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title">
                  <h4>Edit Low Stocks</h4>
                </div>
                <button type="button" className="close bg-danger text-white fs-16" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true" className="fs-16">&times;</span>
                </button>
              </div>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Warehouse<span className="text-danger ms-1">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.warehouse}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, warehouse: e.target.value }))}
                    />
                  </div>
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Store<span className="text-danger ms-1">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.store}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, store: e.target.value }))}
                    />
                  </div>
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">SKU<span className="text-danger ms-1">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.sku}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                    />
                  </div>
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Category<span className="text-danger ms-1">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.category}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Product Name<span className="text-danger ms-1">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Qty<span className="text-danger ms-1">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      value={editForm.qty}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, qty: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Qty Alert<span className="text-danger ms-1">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      value={editForm.qtyAlert}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, qtyAlert: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger"></i>
                  </span>
                  <h4 className="fs-20 fw-bold mb-2 mt-1">Delete Product</h4>
                  <p className="mb-0 fs-16">Are you sure you want to delete product from low stock?</p>
                  <div className="modal-footer-btn mt-3 d-flex justify-content-center">
                    <button type="button" className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    <button type="button" className="btn btn-primary fs-13 fw-medium p-2 px-3" onClick={handleDelete}>Yes Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Success Modal */}
      {showEmailModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="success-email-send modal-body text-center">
                <span className="rounded-circle d-inline-flex p-2 bg-success-transparent mb-2">
                  <i className="ti ti-checks fs-24 text-success"></i>
                </span>
                <h4 className="fs-20 fw-semibold">Success</h4>
                <p>Email Sent Successfully</p>
                <a href="#" className="btn btn-primary p-1 px-2 fs-13 fw-normal" onClick={(e) => { e.preventDefault(); setShowEmailModal(false); }}>Close</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LowStocks;
