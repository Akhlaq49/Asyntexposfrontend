import React, { useState, useEffect, useCallback } from 'react';
import api, { mediaUrl } from '../../services/api';

interface ProductDto {
  id: string;
  sku: string;
  productName: string;
  manufacturedDate: string;
  expiryDate: string;
  images: string[];
}

interface ExpiredProduct {
  id: string;
  sku: string;
  name: string;
  image: string;
  manufacturedDate: string;
  expiredDate: string;
}

const mapDtoToExpired = (dto: ProductDto): ExpiredProduct => ({
  id: dto.id,
  sku: dto.sku,
  name: dto.productName,
  image: dto.images && dto.images.length > 0 ? dto.images[0] : '',
  manufacturedDate: dto.manufacturedDate,
  expiredDate: dto.expiryDate,
});

const ExpiredProducts: React.FC = () => {
  const [products, setProducts] = useState<ExpiredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [sortBy, setSortBy] = useState('Last 7 Days');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', sku: '', name: '', manufacturedDate: '', expiredDate: '' });

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const fetchExpiredProducts = async () => {
      try {
        const response = await api.get<ProductDto[]>('/products/expired');
        setProducts(response.data.map(mapDtoToExpired));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchExpiredProducts();
  }, []);

  // Feather icons
  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(products.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [products]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const openEditModal = (product: ExpiredProduct) => {
    setEditForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      manufacturedDate: product.manufacturedDate,
      expiredDate: product.expiredDate,
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/products/expired/${editForm.id}`, {
        sku: editForm.sku,
        productName: editForm.name,
        manufacturedDate: editForm.manufacturedDate,
        expiryDate: editForm.expiredDate,
      });
      // Refetch from server after successful update
      const response = await api.get<ProductDto[]>('/products/expired');
      setProducts(response.data.map(mapDtoToExpired));
    } catch {
      // Update locally on API failure
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editForm.id
            ? { ...p, sku: editForm.sku, name: editForm.name, manufacturedDate: editForm.manufacturedDate, expiredDate: editForm.expiredDate }
            : p
        )
      );
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
      await api.delete(`/products/expired/${deleteId}`);
    } catch {
      // Delete locally on API failure
    }
    setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProduct = !productFilter || p.name === productFilter;
    return matchesSearch && matchesProduct;
  });

  const productNames = [...new Set(products.map((p) => p.name))];

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Expired Products</h4>
            <h6>Manage your expired products</h6>
          </div>
        </div>
        <ul className="table-top-head">
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
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>
              <i className="ti ti-refresh"></i>
            </a>
          </li>
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Collapse" onClick={(e) => e.preventDefault()}>
              <i className="ti ti-chevron-up"></i>
            </a>
          </li>
        </ul>
      </div>

      {/* Product List Card */}
      <div className="card">
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
            {/* Product Filter */}
            <div className="dropdown me-2">
              <a
                href="#"
                className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                data-bs-toggle="dropdown"
                onClick={(e) => e.preventDefault()}
              >
                {productFilter || 'Product'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li>
                  <a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setProductFilter(''); }}>All</a>
                </li>
                {productNames.map((name) => (
                  <li key={name}>
                    <a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setProductFilter(name); }}>{name}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Sort By */}
            <div className="dropdown">
              <a
                href="#"
                className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center"
                data-bs-toggle="dropdown"
                onClick={(e) => e.preventDefault()}
              >
                Sort By : {sortBy}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                {['Recently Added', 'Ascending', 'Descending', 'Last Month', 'Last 7 Days'].map((opt) => (
                  <li key={opt}>
                    <a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setSortBy(opt); }}>{opt}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
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
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Manufactured Date</th>
                    <th>Expired Date</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <label className="checkboxs">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={(e) => handleSelectOne(product.id, e.target.checked)}
                          />
                          <span className="checkmarks"></span>
                        </label>
                      </td>
                      <td>{product.sku}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <a href="#" className="avatar avatar-md me-2" onClick={(e) => e.preventDefault()}>
                            <img src={mediaUrl(product.image)} alt="product" />
                          </a>
                          <a href="#" onClick={(e) => e.preventDefault()}>{product.name}</a>
                        </div>
                      </td>
                      <td>{product.manufacturedDate}</td>
                      <td>{product.expiredDate}</td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <a
                            className="me-2 p-2"
                            href="#"
                            onClick={(e) => { e.preventDefault(); openEditModal(product); }}
                          >
                            <i data-feather="edit" className="feather-edit"></i>
                          </a>
                          <a
                            className="p-2"
                            href="#"
                            onClick={(e) => { e.preventDefault(); openDeleteModal(product.id); }}
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
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title">
                  <h4>Edit Expired Product</h4>
                </div>
                <button type="button" className="close" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">SKU<span className="text-danger ms-1">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.sku}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Product Name<span className="text-danger ms-1">*</span></label>
                      <select
                        className="form-select"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      >
                        <option value="">Select</option>
                        {productNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-3">
                      <label className="form-label">Manufacturer Date<span className="text-danger ms-1">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={editForm.manufacturedDate}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, manufacturedDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="mb-0">
                      <label className="form-label">Expiry Date<span className="text-danger ms-1">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={editForm.expiredDate}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, expiredDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary fs-13 fw-medium p-2 px-3" onClick={handleEditSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="page-wrapper-new p-0">
                <div className="content p-5 px-3 text-center">
                  <span className="rounded-circle d-inline-flex p-2 bg-danger-transparent mb-2">
                    <i className="ti ti-trash fs-24 text-danger"></i>
                  </span>
                  <h4>Delete Product</h4>
                  <p className="fs-14 text-muted">Are you sure you want to delete this expired product?</p>
                  <div className="d-flex justify-content-center gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
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

export default ExpiredProducts;
