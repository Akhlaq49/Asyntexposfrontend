import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct, getCategories, getBrands, ProductResponse, DropdownOption } from '../../services/productService';
import { mediaUrl } from '../../services/api';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<DropdownOption[]>([]);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prods, cats, brands] = await Promise.all([
          getProducts(),
          getCategories(),
          getBrands(),
        ]);
        setProducts(prods);
        setCategoryOptions(cats);
        setBrandOptions(brands);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(filtered.map((p) => p.id)) : new Set());
  }, []);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const openDeleteModal = (id: string) => { setDeleteId(id); setDeleteError(''); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete product.';
      setDeleteError(msg);
    }
  };

  const filtered = useMemo(() => products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    const matchBrand = !brandFilter || p.brand === brandFilter;
    return matchSearch && matchCategory && matchBrand;
  }), [products, searchTerm, categoryFilter, brandFilter]);

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Product List</h4>
            <h6>Manage your products</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li>
            <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="Pdf" onClick={(e) => e.preventDefault()}>
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
        </ul>
        <div className="page-btn">
          <Link to="/add-product" className="btn btn-primary">
            <i className="ti ti-circle-plus me-1"></i>Add Product
          </Link>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
              <input type="text" className="form-control" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            <div className="dropdown me-2">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {categoryFilter || 'Category'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setCategoryFilter(''); }}>All</a></li>
                {categoryOptions.map((c) => (
                  <li key={c.value}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setCategoryFilter(c.value); }}>{c.label}</a></li>
                ))}
              </ul>
            </div>
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {brandFilter || 'Brand'}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setBrandFilter(''); }}>All</a></li>
                {brandOptions.map((b) => (
                  <li key={b.value}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setBrandFilter(b.value); }}>{b.label}</a></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table datatable">
                <thead className="thead-light">
                  <tr>
                    <th className="no-sort">
                      <label className="checkboxs"><input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} /><span className="checkmarks"></span></label>
                    </th>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Price</th>
                    <th>Unit</th>
                    <th>Qty</th>
                    <th className="no-sort">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-4 text-muted">No products found.</td></tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <label className="checkboxs"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={(e) => handleSelectOne(p.id, e.target.checked)} /><span className="checkmarks"></span></label>
                        </td>
                        <td>{p.sku}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            {p.images && p.images.length > 0 && (
                              <a href="#" className="avatar avatar-md me-2" onClick={(e) => e.preventDefault()}>
                                <img src={mediaUrl(p.images[0])} alt={p.productName} />
                              </a>
                            )}
                            <Link to={`/product-details/${p.id}`}>{p.productName}</Link>
                          </div>
                        </td>
                        <td>{p.category}</td>
                        <td>{p.brand}</td>
                        <td>{fmt(p.price)}</td>
                        <td>{p.unit}</td>
                        <td>{p.quantity}</td>
                        <td className="action-table-data">
                          <div className="edit-delete-action d-flex align-items-center gap-2">
                            <Link to={`/product-details/${p.id}`} className="btn btn-icon btn-sm">
                              <i className="ti ti-eye text-blue"></i>
                            </Link>
                            <Link to={`/edit-product/${p.id}`} className="btn btn-icon btn-sm">
                              <i className="ti ti-edit text-blue"></i>
                            </Link>
                            <a href="#" className="btn btn-icon btn-sm" onClick={(e) => { e.preventDefault(); openDeleteModal(p.id); }}>
                              <i className="ti ti-trash text-danger"></i>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center pt-4 pb-4">
                <div className="mb-3">
                  <i className="ti ti-trash-x fs-36 text-danger"></i>
                </div>
                <h4>Delete Product</h4>
                <p className="text-muted">Are you sure you want to delete this product?</p>
                {deleteError && <div className="alert alert-danger py-2 px-3 text-start">{deleteError}</div>}
                <div className="d-flex justify-content-center gap-2 mt-3">
                  <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductList;
