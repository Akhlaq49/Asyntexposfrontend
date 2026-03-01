import React, { useState, useEffect } from 'react';
import { 
  getPurchases, 
  createPurchase, 
  updatePurchase, 
  deletePurchase,
  Purchase,
  PurchaseItem
} from '../../services/purchaseService';
import { getProducts, ProductResponse } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alertUtils';

const PurchaseList: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'asc' | 'desc'>('recent');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Products from database for dropdown
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierRef: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Received',
    orderTax: 0,
    discount: 0,
    shipping: 0,
    total: 0,
    paid: 0,
    notes: '',
  });

  const [lineItems, setLineItems] = useState<PurchaseItem[]>([]);
  const [newItem, setNewItem] = useState<{
    productId?: number;
    productName: string;
    quantity: number;
    purchasePrice: number;
    discount: number;
    taxPercentage: number;
    taxAmount: number;
    unitCost: number;
    totalCost: number;
  }>({
    productName: '',
    quantity: 1,
    purchasePrice: 0,
    discount: 0,
    taxPercentage: 0,
    taxAmount: 0,
    unitCost: 0,
    totalCost: 0,
  });

  const suppliers = ['Apex Computers', 'Dazzle Shoes', 'Best Accessories', 'Global Traders'];
  const statuses = ['Received', 'Pending', 'Ordered', 'Cancelled'];

  // Fetch purchases and products on mount
  useEffect(() => {
    loadPurchases();
    loadProducts();
  }, []);

  // Filter purchases when search or status filter changes
  useEffect(() => {
    applyFilters();
  }, [purchases, searchQuery, paymentStatusFilter, statusFilter, sortBy]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const data = await getPurchases();
      setPurchases(data);
    } catch (error) {
      showError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  // Filtered products for search dropdown
  const filteredProducts = products.filter(
    (p) =>
      p.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const applyFilters = () => {
    let filtered = purchases;

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.reference.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (paymentStatusFilter) {
      filtered = filtered.filter((p) => p.paymentStatus === paymentStatusFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (sortBy === 'asc') {
      filtered = [...filtered].sort((a, b) => a.supplierName.localeCompare(b.supplierName));
    } else if (sortBy === 'desc') {
      filtered = [...filtered].sort((a, b) => b.supplierName.localeCompare(a.supplierName));
    }

    setFilteredPurchases(filtered);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(paginatedPurchases.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
    setSelectAll(next.size === paginatedPurchases.length);
  };

  const fmt = (v: number) => `$${v.toFixed(2)}`;

  const handleAddPurchase = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setFormData({
      supplierName: purchase.supplierName,
      supplierRef: purchase.supplierRef || '',
      reference: purchase.reference,
      date: purchase.date.toString().split('T')[0],
      status: purchase.status,
      orderTax: purchase.orderTax,
      discount: purchase.discount,
      shipping: purchase.shipping,
      total: purchase.total,
      paid: purchase.paid,
      notes: purchase.notes || '',
    });
    setLineItems(purchase.items || []);
    setShowEditModal(true);
  };

  const handleDeletePurchase = async (id: number) => {
    const confirmed = await showConfirm(
      'Delete Purchase',
      'Are you sure you want to delete this purchase?',
      'Delete',
      'Cancel'
    );

    if (confirmed.isConfirmed) {
      try {
        await deletePurchase(id);
        showSuccess('Purchase deleted successfully');
        loadPurchases();
      } catch (error) {
        showError('Failed to delete purchase');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      supplierName: '',
      supplierRef: '',
      reference: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Received',
      orderTax: 0,
      discount: 0,
      shipping: 0,
      total: 0,
      paid: 0,
      notes: '',
    });
    setLineItems([]);
    setNewItem({
      productName: '',
      quantity: 1,
      purchasePrice: 0,
      discount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      unitCost: 0,
      totalCost: 0,
    });
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedPurchase(null);
  };

  const addLineItem = () => {
    if (!newItem.productName) {
      showError('Please select a product');
      return;
    }

    // Calculate tax amount
    const taxAmount = (newItem.purchasePrice * newItem.taxPercentage) / 100;
    const unitCost = newItem.purchasePrice + (newItem.purchasePrice * newItem.taxPercentage) / 100 - newItem.discount;
    const totalCost = unitCost * newItem.quantity;

    const item: PurchaseItem = {
      ...newItem,
      taxAmount,
      unitCost,
      totalCost,
    };

    setLineItems([...lineItems, item]);
    setNewItem({
      productName: '',
      quantity: 1,
      purchasePrice: 0,
      discount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      unitCost: 0,
      totalCost: 0,
    });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const itemsTotal = lineItems.reduce((sum, item) => sum + item.totalCost, 0);
    const total = itemsTotal + formData.orderTax + formData.shipping - formData.discount;
    setFormData({ ...formData, total: Math.max(0, total) });
  };

  useEffect(() => {
    calculateTotal();
  }, [lineItems, formData.orderTax, formData.discount, formData.shipping]);

  const selectProduct = (product: ProductResponse) => {
    setNewItem({
      ...newItem,
      productId: parseInt(product.id),
      productName: product.productName,
      purchasePrice: product.price,
      quantity: 1,
    });
    setProductSearch(product.productName);
    setShowProductDropdown(false);
  };

  const handleSavePurchase = async () => {
    if (!formData.supplierName || !formData.reference) {
      showError('Please fill in supplier name and reference');
      return;
    }

    try {
      const payload = {
        ...formData,
        items: lineItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          discount: item.discount,
          taxPercentage: item.taxPercentage,
          taxAmount: item.taxAmount,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        })),
      };

      if (selectedPurchase) {
        await updatePurchase(selectedPurchase.id, payload);
        showSuccess('Purchase updated successfully');
      } else {
        await createPurchase(payload);
        showSuccess('Purchase created successfully');
      }

      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      loadPurchases();
    } catch (error) {
      showError('Failed to save purchase');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const cls: Record<string, string> = {
      Paid: 'bg-success',
      Unpaid: 'bg-danger',
      Partial: 'bg-warning',
      Overdue: 'bg-info',
    };
    return (
      <span className={`badge ${cls[status] || 'bg-secondary'} shadow-none badge-xs`}>
        <i className="ti ti-point-filled me-1"></i>{status}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const cls: Record<string, string> = {
      Received: 'badge-success',
      Pending: 'badge-warning',
      Ordered: 'badge-info',
      Cancelled: 'badge-danger',
    };
    return <span className={`badge ${cls[status] || 'badge-secondary'}`}>{status}</span>;
  };

  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  if (loading && purchases.length === 0) {
    return (
      <>
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Purchases</h4>
              <h6>Manage Your Purchases</h6>
            </div>
          </div>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>Purchases</h4>
            <h6>Manage Your Purchases</h6>
          </div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); handleAddPurchase(); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Purchase
          </a>
        </div>
      </div>

      {/* ---- Card ---- */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <a href="#" className="btn btn-searchset"><i className="ti ti-search fs-14"></i></a>
              <input
                type="text"
                className="form-control"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Status filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {statusFilter || 'Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setStatusFilter(''); }}>All</a></li>
                {statuses.map(s => (
                  <li key={s}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setStatusFilter(s); }}>{s}</a></li>
                ))}
              </ul>
            </div>
            {/* Payment Status filter */}
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                {paymentStatusFilter || 'Payment Status'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setPaymentStatusFilter(''); }}>All</a></li>
                {['Paid', 'Unpaid', 'Partial', 'Overdue'].map(s => (
                  <li key={s}><a className="dropdown-item rounded-1" href="#" onClick={e => { e.preventDefault(); setPaymentStatusFilter(s); }}>{s}</a></li>
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
          <div className="table-responsive">
            <table className="table datanew">
              <thead>
                <tr>
                  <th className="no-sort">
                    <label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label>
                  </th>
                  <th>Supplier Name</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Payment Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPurchases.length > 0 ? (
                  paginatedPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(purchase.id)} onChange={e => handleSelectOne(purchase.id, e.target.checked)} /><span className="checkmarks"></span></label>
                      </td>
                      <td>{purchase.supplierName}</td>
                      <td>{purchase.reference}</td>
                      <td>{new Date(purchase.date).toLocaleDateString()}</td>
                      <td>{getStatusBadge(purchase.status)}</td>
                      <td>{fmt(purchase.total)}</td>
                      <td>{fmt(purchase.paid)}</td>
                      <td>{fmt(purchase.total - purchase.paid)}</td>
                      <td>{getPaymentStatusBadge(purchase.paymentStatus)}</td>
                      <td className="text-center">
                        <a className="action-set" href="#" data-bs-toggle="dropdown" aria-expanded="false">
                          <i className="fa fa-ellipsis-v" aria-hidden="true"></i>
                        </a>
                        <ul className="dropdown-menu">
                          <li>
                            <a className="dropdown-item" href="#" onClick={e => { e.preventDefault(); handleEditPurchase(purchase); }}>
                              <i data-feather="edit" className="info-img"></i>Edit Purchase
                            </a>
                          </li>
                          <li>
                            <a className="dropdown-item mb-0" href="#" onClick={e => { e.preventDefault(); handleDeletePurchase(purchase.id); }}>
                              <i data-feather="trash-2" className="info-img"></i>Delete Purchase
                            </a>
                          </li>
                        </ul>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-4">
                      No purchases found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredPurchases.length > itemsPerPage && (
            <nav aria-label="Page navigation" className="mt-3 mb-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  >
                    Previous
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

        {/* Add Purchase Modal */}
        {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add Purchase</h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Supplier Name <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.supplierName}
                        onChange={(e) =>
                          setFormData({ ...formData, supplierName: e.target.value })
                        }
                      >
                        <option value="">Select</option>
                        {suppliers.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Reference <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.reference}
                        onChange={(e) =>
                          setFormData({ ...formData, reference: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3 position-relative">
                      <label className="form-label">
                        Product <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search Product by name or SKU..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                      />
                      {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                        <div className="dropdown-menu show w-100" style={{ maxHeight: '200px', overflowY: 'auto', position: 'absolute', zIndex: 1050 }}>
                          {filteredProducts.slice(0, 10).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="dropdown-item d-flex justify-content-between align-items-center"
                              onClick={() => selectProduct(product)}
                            >
                              <span>{product.productName}</span>
                              <small className="text-muted">
                                {product.sku ? `SKU: ${product.sku}` : ''} | Stock: {product.quantity} | ${product.price}
                              </small>
                            </button>
                          ))}
                        </div>
                      )}
                      {showProductDropdown && productSearch && filteredProducts.length === 0 && (
                        <div className="dropdown-menu show w-100" style={{ position: 'absolute', zIndex: 1050 }}>
                          <span className="dropdown-item text-muted">No products found</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Qty"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Price($)"
                      value={newItem.purchasePrice}
                      onChange={(e) =>
                        setNewItem({ ...newItem, purchasePrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Discount($)"
                      value={newItem.discount}
                      onChange={(e) =>
                        setNewItem({ ...newItem, discount: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Tax(%)"
                      value={newItem.taxPercentage}
                      onChange={(e) =>
                        setNewItem({ ...newItem, taxPercentage: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-4">
                    <button className="btn btn-primary w-100" onClick={addLineItem}>
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price($)</th>
                        <th>Discount($)</th>
                        <th>Tax(%)</th>
                        <th>Tax Amt($)</th>
                        <th>Unit Cost($)</th>
                        <th>Total($)</th>
                        <th>Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName}</td>
                          <td>{item.quantity}</td>
                          <td>${item.purchasePrice.toFixed(2)}</td>
                          <td>${item.discount.toFixed(2)}</td>
                          <td>{item.taxPercentage}%</td>
                          <td>${item.taxAmount.toFixed(2)}</td>
                          <td>${item.unitCost.toFixed(2)}</td>
                          <td>${item.totalCost.toFixed(2)}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => removeLineItem(index)}
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row mt-3">
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Order Tax</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.orderTax}
                        onChange={(e) =>
                          setFormData({ ...formData, orderTax: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Discount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Shipping</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.shipping}
                        onChange={(e) =>
                          setFormData({ ...formData, shipping: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-control"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                      >
                        <option value="">Select</option>
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Add purchase notes..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  ></textarea>
                  <small className="form-text text-muted">Maximum 500 characters</small>
                </div>

                <div className="alert alert-info">
                  <strong>Total Amount:</strong> ${formData.total.toFixed(2)}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePurchase}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Edit Purchase Modal */}
        {showEditModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Purchase</h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Supplier Name <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={formData.supplierName}
                        onChange={(e) =>
                          setFormData({ ...formData, supplierName: e.target.value })
                        }
                      >
                        <option value="">Select</option>
                        {suppliers.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Reference <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.reference}
                        onChange={(e) =>
                          setFormData({ ...formData, reference: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3 position-relative">
                      <label className="form-label">
                        Product <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search Product by name or SKU..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                      />
                      {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                        <div className="dropdown-menu show w-100" style={{ maxHeight: '200px', overflowY: 'auto', position: 'absolute', zIndex: 1050 }}>
                          {filteredProducts.slice(0, 10).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="dropdown-item d-flex justify-content-between align-items-center"
                              onClick={() => selectProduct(product)}
                            >
                              <span>{product.productName}</span>
                              <small className="text-muted">
                                {product.sku ? `SKU: ${product.sku}` : ''} | Stock: {product.quantity} | ${product.price}
                              </small>
                            </button>
                          ))}
                        </div>
                      )}
                      {showProductDropdown && productSearch && filteredProducts.length === 0 && (
                        <div className="dropdown-menu show w-100" style={{ position: 'absolute', zIndex: 1050 }}>
                          <span className="dropdown-item text-muted">No products found</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Qty"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Price($)"
                      value={newItem.purchasePrice}
                      onChange={(e) =>
                        setNewItem({ ...newItem, purchasePrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Discount($)"
                      value={newItem.discount}
                      onChange={(e) =>
                        setNewItem({ ...newItem, discount: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Tax(%)"
                      value={newItem.taxPercentage}
                      onChange={(e) =>
                        setNewItem({ ...newItem, taxPercentage: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-lg-4">
                    <button className="btn btn-primary w-100" onClick={addLineItem}>
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price($)</th>
                        <th>Discount($)</th>
                        <th>Tax(%)</th>
                        <th>Tax Amt($)</th>
                        <th>Unit Cost($)</th>
                        <th>Total($)</th>
                        <th>Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName}</td>
                          <td>{item.quantity}</td>
                          <td>${item.purchasePrice.toFixed(2)}</td>
                          <td>${item.discount.toFixed(2)}</td>
                          <td>{item.taxPercentage}%</td>
                          <td>${item.taxAmount.toFixed(2)}</td>
                          <td>${item.unitCost.toFixed(2)}</td>
                          <td>${item.totalCost.toFixed(2)}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => removeLineItem(index)}
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row mt-3">
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Order Tax</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.orderTax}
                        onChange={(e) =>
                          setFormData({ ...formData, orderTax: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Discount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Shipping</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.shipping}
                        onChange={(e) =>
                          setFormData({ ...formData, shipping: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-control"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                      >
                        <option value="">Select</option>
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Add purchase notes..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  ></textarea>
                  <small className="form-text text-muted">Maximum 500 characters</small>
                </div>

                <div className="alert alert-info">
                  <strong>Total Amount:</strong> ${formData.total.toFixed(2)}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePurchase}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
    </>
  );
};

export default PurchaseList;
