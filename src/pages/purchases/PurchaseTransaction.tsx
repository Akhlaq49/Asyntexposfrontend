import React, { useState, useEffect } from 'react';
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  Purchase,
  PurchaseItem,
} from '../../services/purchaseService';
import { getProducts, ProductResponse } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alertUtils';

const PurchaseTransaction: React.FC = () => {
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

  // Products from database
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

  useEffect(() => {
    loadPurchases();
    loadProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [purchases, searchQuery, paymentStatusFilter]);

  useEffect(() => {
    calculateTotal();
  }, [lineItems, formData.orderTax, formData.discount, formData.shipping]);

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
    setFilteredPurchases(filtered);
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
      'Are you sure you want to delete this purchase? Inventory will be reverted.',
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

  const addLineItem = () => {
    if (!newItem.productName) {
      showError('Please select a product');
      return;
    }
    const taxAmount = (newItem.purchasePrice * newItem.taxPercentage) / 100;
    const unitCost = newItem.purchasePrice + taxAmount - newItem.discount;
    const totalCost = unitCost * newItem.quantity;

    const item: PurchaseItem = { ...newItem, taxAmount, unitCost, totalCost };
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
    setFormData((prev) => ({ ...prev, total: Math.max(0, total) }));
  };

  const handleSavePurchase = async () => {
    if (!formData.supplierName || !formData.reference) {
      showError('Please fill in supplier name and reference');
      return;
    }
    try {
      const payload = {
        ...formData,
        items: lineItems.map((item) => ({
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Received':
        return <span className="badges status-badge fs-10 p-1 px-2 rounded-1">Received</span>;
      case 'Pending':
        return <span className="badges status-badge badge-pending fs-10 p-1 px-2 rounded-1">Pending</span>;
      case 'Ordered':
        return <span className="badges status-badge bg-warning fs-10 p-1 px-2 rounded-1">Ordered</span>;
      case 'Cancelled':
        return <span className="badge bg-danger fs-10 p-1 px-2 rounded-1">Cancelled</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="p-1 pe-2 rounded-1 text-success bg-success-transparent fs-10">
            <i className="ti ti-point-filled me-1 fs-11"></i>Paid
          </span>
        );
      case 'Unpaid':
        return (
          <span className="p-1 pe-2 rounded-1 text-danger bg-danger-transparent fs-10">
            <i className="ti ti-point-filled me-1 fs-11"></i>Unpaid
          </span>
        );
      case 'Partial':
        return (
          <span className="p-1 pe-2 rounded-1 text-warning bg-warning-transparent fs-10">
            <i className="ti ti-point-filled me-1 fs-11"></i>Partial
          </span>
        );
      case 'Overdue':
        return (
          <span className="p-1 pe-2 rounded-1 text-warning bg-warning-transparent fs-10">
            <i className="ti ti-point-filled me-1 fs-11"></i>Overdue
          </span>
        );
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  // Shared product search dropdown JSX
  const renderProductSearch = () => (
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
  );

  // Shared line items add row JSX
  const renderLineItemInputs = () => (
    <div className="row mb-3">
      <div className="col-lg-2">
        <input type="number" className="form-control" placeholder="Qty" value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })} />
      </div>
      <div className="col-lg-2">
        <input type="number" className="form-control" placeholder="Price($)" value={newItem.purchasePrice}
          onChange={(e) => setNewItem({ ...newItem, purchasePrice: parseFloat(e.target.value) || 0 })} />
      </div>
      <div className="col-lg-2">
        <input type="number" className="form-control" placeholder="Discount($)" value={newItem.discount}
          onChange={(e) => setNewItem({ ...newItem, discount: parseFloat(e.target.value) || 0 })} />
      </div>
      <div className="col-lg-2">
        <input type="number" className="form-control" placeholder="Tax(%)" value={newItem.taxPercentage}
          onChange={(e) => setNewItem({ ...newItem, taxPercentage: parseFloat(e.target.value) || 0 })} />
      </div>
      <div className="col-lg-4">
        <button className="btn btn-primary w-100" onClick={addLineItem}>
          <i className="ti ti-plus me-1"></i>Add Item
        </button>
      </div>
    </div>
  );

  // Shared line items table JSX
  const renderLineItemsTable = () => (
    <div className="modal-body-table mt-3">
      <div className="table-responsive">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="bg-secondary-transparent p-3">Product</th>
              <th className="bg-secondary-transparent p-3">Qty</th>
              <th className="bg-secondary-transparent p-3">Purchase Price($)</th>
              <th className="bg-secondary-transparent p-3">Discount($)</th>
              <th className="bg-secondary-transparent p-3">Tax(%)</th>
              <th className="bg-secondary-transparent p-3">Tax Amount($)</th>
              <th className="bg-secondary-transparent p-3">Unit Cost($)</th>
              <th className="bg-secondary-transparent p-3">Total Cost($)</th>
              <th className="bg-secondary-transparent p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length > 0 ? (
              lineItems.map((item, index) => (
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
                    <button className="btn btn-sm btn-danger" onClick={() => removeLineItem(index)}>
                      <i className="ti ti-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="text-center text-muted p-3">No items added</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Shared order summary fields JSX
  const renderOrderFields = () => (
    <>
      <div className="row mt-3">
        <div className="col-lg-3">
          <div className="mb-3">
            <label className="form-label">Order Tax</label>
            <input type="number" className="form-control" value={formData.orderTax}
              onChange={(e) => setFormData({ ...formData, orderTax: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="col-lg-3">
          <div className="mb-3">
            <label className="form-label">Discount</label>
            <input type="number" className="form-control" value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="col-lg-3">
          <div className="mb-3">
            <label className="form-label">Shipping</label>
            <input type="number" className="form-control" value={formData.shipping}
              onChange={(e) => setFormData({ ...formData, shipping: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="col-lg-3">
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select className="form-control" value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="">Select</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-12 float-md-right">
          <div className="total-order m-2 mb-3 ms-auto">
            <ul className="border-1 rounded-1 list-unstyled">
              <li className="border-0 border-bottom d-flex justify-content-between p-2">
                <h6>Order Tax</h6>
                <span>$ {formData.orderTax.toFixed(2)}</span>
              </li>
              <li className="border-0 border-bottom d-flex justify-content-between p-2">
                <h6>Discount</h6>
                <span>$ {formData.discount.toFixed(2)}</span>
              </li>
              <li className="border-0 border-bottom d-flex justify-content-between p-2">
                <h6>Shipping</h6>
                <span>$ {formData.shipping.toFixed(2)}</span>
              </li>
              <li className="border-0 d-flex justify-content-between p-2">
                <h6 className="fw-bold">Grand Total</h6>
                <span className="fw-bold">${formData.total.toFixed(2)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea className="form-control" rows={3} placeholder="Add purchase notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}></textarea>
        <small className="form-text text-muted">Maximum 500 characters</small>
      </div>
    </>
  );

  if (loading && purchases.length === 0) {
    return (
      <>
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Purchase Transactions</h4>
              <h6>Manage Your Purchase Transactions</h6>
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
            <h4>Purchase Transactions</h4>
            <h6>Manage Your Purchase Transactions</h6>
          </div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={e => { e.preventDefault(); handleAddPurchase(); }}>
            <i className="ti ti-circle-plus me-1"></i>Add Purchase
          </a>
        </div>
      </div>

        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="search-set">
              <div className="search-input">
                <span className="btn-searchset"><i className="ti ti-search fs-14"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by supplier or reference"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
              <div className="dropdown">
                <a href="javascript:void(0);" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                  data-bs-toggle="dropdown">
                  {paymentStatusFilter || 'Payment Status'}
                </a>
                <ul className="dropdown-menu dropdown-menu-end p-3">
                  <li><button className="dropdown-item rounded-1" onClick={() => { setPaymentStatusFilter(''); setCurrentPage(1); }}>All</button></li>
                  <li><button className="dropdown-item rounded-1" onClick={() => { setPaymentStatusFilter('Paid'); setCurrentPage(1); }}>Paid</button></li>
                  <li><button className="dropdown-item rounded-1" onClick={() => { setPaymentStatusFilter('Unpaid'); setCurrentPage(1); }}>Unpaid</button></li>
                  <li><button className="dropdown-item rounded-1" onClick={() => { setPaymentStatusFilter('Partial'); setCurrentPage(1); }}>Partial</button></li>
                  <li><button className="dropdown-item rounded-1" onClick={() => { setPaymentStatusFilter('Overdue'); setCurrentPage(1); }}>Overdue</button></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th>Supplier Name</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPurchases.length > 0 ? (
                    paginatedPurchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td>{purchase.supplierName}</td>
                        <td>{purchase.reference}</td>
                        <td>{new Date(purchase.date).toLocaleDateString()}</td>
                        <td>{getStatusBadge(purchase.status)}</td>
                        <td>${purchase.total.toFixed(2)}</td>
                        <td>${purchase.paid.toFixed(2)}</td>
                        <td>${(purchase.total - purchase.paid).toFixed(2)}</td>
                        <td>{getPaymentStatusBadge(purchase.paymentStatus)}</td>
                        <td className="action-table-data">
                          <div className="edit-delete-action">
                            <button
                              className="me-2 p-2 btn btn-sm"
                              onClick={() => handleEditPurchase(purchase)}
                              title="Edit"
                            >
                              <i className="ti ti-edit"></i>
                            </button>
                            <button
                              className="p-2 btn btn-sm"
                              onClick={() => handleDeletePurchase(purchase.id)}
                              title="Delete"
                            >
                              <i className="ti ti-trash text-danger"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-4">No purchases found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredPurchases.length > itemsPerPage && (
              <nav aria-label="Page navigation" className="mt-3 mb-3">
                <ul className="pagination justify-content-center">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>Previous</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>Next</button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>

        {/* Add Purchase Modal */}
        {showAddModal && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
            <div className="modal-dialog purchase modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '900px' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <div className="page-title"><h4>Add Purchase</h4></div>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-lg-4 col-md-6 col-sm-12">
                      <div className="mb-3 add-product">
                        <label className="form-label">Supplier Name<span className="text-danger ms-1">*</span></label>
                        <select className="form-control" value={formData.supplierName}
                          onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}>
                          <option value="">Select</option>
                          {suppliers.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 col-sm-12">
                      <div className="mb-3">
                        <label className="form-label">Date<span className="text-danger ms-1">*</span></label>
                        <input type="date" className="form-control" value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-12">
                      <div className="mb-3">
                        <label className="form-label">Reference<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" value={formData.reference}
                          onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  {renderProductSearch()}
                  {renderLineItemInputs()}
                  {renderLineItemsTable()}
                  {renderOrderFields()}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleSavePurchase}>Submit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Purchase Modal */}
        {showEditModal && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
            <div className="modal-dialog purchase modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '900px' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <div className="page-title"><h4>Edit Purchase</h4></div>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-lg-4 col-md-6 col-sm-12">
                      <div className="mb-3 add-product">
                        <label className="form-label">Supplier Name<span className="text-danger ms-1">*</span></label>
                        <select className="form-control" value={formData.supplierName}
                          onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}>
                          <option value="">Select</option>
                          {suppliers.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 col-sm-12">
                      <div className="mb-3">
                        <label className="form-label">Date<span className="text-danger ms-1">*</span></label>
                        <input type="date" className="form-control" value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                    </div>
                    <div className="col-lg-4 col-sm-12">
                      <div className="mb-3">
                        <label className="form-label">Reference<span className="text-danger ms-1">*</span></label>
                        <input type="text" className="form-control" value={formData.reference}
                          onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  {renderProductSearch()}
                  {renderLineItemInputs()}
                  {renderLineItemsTable()}
                  {renderOrderFields()}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn me-2 btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleSavePurchase}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default PurchaseTransaction;
