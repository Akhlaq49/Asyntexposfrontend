import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { mediaUrl } from '../../services/api';
import AdminDeleteModal from '../../components/common/AdminDeleteModal';
import Pagination from '../../components/common/Pagination';
import { usePagination } from '../../utils/usePagination';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

/* ---------- Types ---------- */

interface StockEntryDto {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  sku: string;
  category: string;
  person: string;
  quantity: number;
  date: string;
}

interface ProductResult {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  category: string;
  images: string[];
  price: number;
}

/* ---------- ManageStocks ---------- */
const ManageStocks: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formError, setFormError] = useState('');
  const [editPerson, setEditPerson] = useState('');
  const [entries, setEntries] = useState<StockEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  /* lookups */
  const [products, setProducts] = useState<ProductResult[]>([]);

  /* filters */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  /* select all */
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* add modal */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<{ productId: number; quantity: number | '' }>({ productId: 0, quantity: '' });
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [addShowDropdown, setAddShowDropdown] = useState(false);
  const [addSelectedProduct, setAddSelectedProduct] = useState<ProductResult | null>(null);
  const addSearchRef = useRef<HTMLDivElement>(null);

  /* edit modal */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<{ id: number; productId: number; quantity: number | '' }>({ id: 0, productId: 0, quantity: '' });
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [editShowDropdown, setEditShowDropdown] = useState(false);
  const [editSelectedProduct, setEditSelectedProduct] = useState<ProductResult | null>(null);
  const editSearchRef = useRef<HTMLDivElement>(null);

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- Fetch ---- */
  // Products are loaded on their own so a failing stock-entries call can't leave the product search empty
  const loadProducts = useCallback(async () => {
    try {
      const res = await api.get<ProductResult[]>('/products');
      setProducts(res.data);
    } catch { /* keep the previous list */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<StockEntryDto[]>('/stock-entries');
      setEntries(res.data);
    } catch { /* ignore */ }
    await loadProducts();
    setLoading(false);
  }, [loadProducts]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') (window as any).feather.replace();
  });

  /* ---- Close dropdowns outside ---- */
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (addSearchRef.current && !addSearchRef.current.contains(e.target as Node)) setAddShowDropdown(false);
      if (editSearchRef.current && !editSearchRef.current.contains(e.target as Node)) setEditShowDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* ---- Filters ---- */
  const filtered = entries.filter((e) => {
    const matchSearch = !searchTerm ||
      e.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.person.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProduct = !filterProduct || e.productName === filterProduct;
    return matchSearch && matchProduct;
  });

  const { paginatedData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filtered);

  /* Products matching the page search that have no stock entry shown above */
  const matchingProducts = (() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const shown = new Set(filtered.map((e) => String(e.productId)));
    return products
      .filter((p) => !shown.has(String(p.id)) &&
        (p.productName.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)))
      .slice(0, 10);
  })();

  /* ---- Select ---- */
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? new Set(filtered.map((e) => e.id)) : new Set());
  };
  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (checked) n.add(id); else n.delete(id); return n; });
  };

  /* ---- Product search helper ---- */
  const searchProducts = (term: string) =>
    term.trim().length > 0
      ? products.filter(
          (p) =>
            p.productName.toLowerCase().includes(term.toLowerCase()) ||
            p.sku.toLowerCase().includes(term.toLowerCase())
        ).slice(0, 8)
      : [];

  /* ---- Add ---- */
  const resetAdd = () => { setAddForm({ productId: 0, quantity: '' }); setFormError(''); setAddSearchTerm(''); setAddSelectedProduct(null); };
  const openAddForProduct = (p: ProductResult) => {
    resetAdd();
    loadProducts();
    setAddSelectedProduct(p);
    setAddForm((prev) => ({ ...prev, productId: parseInt(p.id) }));
    setAddSearchTerm(p.productName);
    setShowAddModal(true);
  };

  const validQty = (q: number | '') => typeof q === 'number' && q >= 1;

  const handleAddSave = async () => {
    if (!addForm.productId || !validQty(addForm.quantity)) { setFormError(t('stocks.qty_required')); return; }
    try {
      await api.post('/stock-entries', { productId: addForm.productId, quantity: addForm.quantity });
      await fetchData();
      setShowAddModal(false);
      resetAdd();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Something went wrong');
    }
  };

  /* ---- Edit ---- */
  const openEditModal = (entry: StockEntryDto) => {
    loadProducts();
    setEditForm({ id: entry.id, productId: entry.productId, quantity: entry.quantity });
    setEditPerson(entry.person);
    setFormError('');
    setEditSearchTerm(entry.productName);
    const prod = products.find((p) => parseInt(p.id) === entry.productId) || null;
    setEditSelectedProduct(prod);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editForm.productId || !validQty(editForm.quantity)) { setFormError(t('stocks.qty_required')); return; }
    try {
      await api.put(`/stock-entries/${editForm.id}`, { productId: editForm.productId, quantity: editForm.quantity });
      await fetchData();
      setShowEditModal(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Something went wrong');
    }
  };

  /* ---- Delete ---- */
  const openDeleteModal = (id: number) => { setDeleteId(id); setShowDeleteModal(true); };
  const handleDelete = async () => {
    if (deleteId == null) return;
    await api.delete(`/stock-entries/${deleteId}`);
    await fetchData();
    setShowDeleteModal(false); setDeleteId(null);
  };

  /* ---- Unique values for filters ---- */
  const uniqueProducts = [...new Set(entries.map((e) => e.productName))];

  /* ---- Product search modal form ---- */
  const renderProductSearch = (
    term: string, setTerm: (v: string) => void,
    showDd: boolean, setShowDd: (v: boolean) => void,
    ref: React.RefObject<HTMLDivElement>,
    onSelect: (p: ProductResult) => void,
    label: string
  ) => (
    <div className="col-lg-12" ref={ref as React.RefObject<HTMLDivElement>}>
      <div className="search-form mb-0">
        <label className="form-label">{label}<span className="text-danger ms-1">*</span></label>
        <div className="position-relative">
          <input
            type="text"
            className="form-control"
            placeholder={t('stocks.search_product')}
            value={term}
            onChange={(e) => { setTerm(e.target.value); setShowDd(true); }}
            onFocus={() => setShowDd(true)}
          />
          <i data-feather="search" className="feather-search"></i>
        </div>
        {showDd && searchProducts(term).length > 0 && (
          <div className="dropdown-menu search-dropdown w-100 h-auto rounded-1 mt-2 show" style={{ display: 'block', position: 'absolute', zIndex: 1050 }}>
            <ul className="list-unstyled mb-0 p-2">
              {searchProducts(term).map((p) => (
                <li
                  key={p.id}
                  className="fs-14 text-gray-9 mb-2 px-2 py-1 rounded"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={() => { onSelect(p); setShowDd(false); }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {p.productName} {p.sku ? `(${p.sku})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {showDd && term.trim().length > 0 && searchProducts(term).length === 0 && (
          <div className="dropdown-menu search-dropdown w-100 h-auto rounded-1 mt-2 show" style={{ display: 'block', position: 'absolute', zIndex: 1050 }}>
            <p className="text-muted fs-14 mb-0 px-2 py-1">{t('common.no_results')}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4>{t('stocks.manage_title')}</h4>
            <h6>{t('stocks.manage_subtitle')}</h6>
          </div>
        </div>
        <ul className="table-top-head">
          <li><a href="#" data-bs-placement="top" title={t('common.pdf')} onClick={(e) => e.preventDefault()}><img src="/assets/img/icons/pdf.svg" alt="img" /></a></li>
          <li><a href="#" data-bs-placement="top" title={t('common.excel')} onClick={(e) => e.preventDefault()}><img src="/assets/img/icons/excel.svg" alt="img" /></a></li>
          <li><a href="#" data-bs-placement="top" title={t('common.refresh')} onClick={(e) => { e.preventDefault(); fetchData(); }}><i className="ti ti-refresh"></i></a></li>
          <li><a href="#" data-bs-placement="top" title={t('common.collapse')} onClick={(e) => e.preventDefault()}><i className="ti ti-chevron-up"></i></a></li>
        </ul>
        <div className="page-btn">
          <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); resetAdd(); loadProducts(); setShowAddModal(true); }}>
            <i className="ti ti-circle-plus me-1"></i>{t('stocks.add_stock')}
          </a>
        </div>
      </div>

      {/* Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
          <div className="search-set">
            <div className="search-input">
              <span className="btn-searchset"><i className="ti ti-search fs-14 feather-search"></i></span>
              <input type="text" className="form-control" placeholder={t('common.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="d-flex table-dropdown my-xl-auto right-content align-items-center flex-wrap row-gap-3">
            {/* Product filter */}
            <div className="dropdown">
              <a href="#" className="dropdown-toggle btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown" onClick={(e) => e.preventDefault()}>
                {filterProduct || t('stocks.product')}
              </a>
              <ul className="dropdown-menu dropdown-menu-end p-3">
                <li><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterProduct(''); }}>{t('common.all')}</a></li>
                {uniqueProducts.map((p) => (
                  <li key={p}><a href="#" className="dropdown-item rounded-1" onClick={(e) => { e.preventDefault(); setFilterProduct(p); }}>{p}</a></li>
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
                      <label className="checkboxs">
                        <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} />
                        <span className="checkmarks"></span>
                      </label>
                    </th>
                    <th>{t('stocks.product')}</th>
                    <th>{t('stocks.date')}</th>
                    <th>{t('stocks.person')}</th>
                    <th>{t('stocks.qty')}</th>
                    <th className="no-sort"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={(e) => handleSelectOne(entry.id, e.target.checked)} />
                          <span className="checkmarks"></span>
                        </label>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-md me-2">
                            <img src={mediaUrl(entry.productImage)} alt="product" />
                          </span>
                          <span>{entry.productName}</span>
                        </div>
                      </td>
                      <td>{entry.date}</td>
                      <td>{entry.person}</td>
                      <td>{entry.quantity}</td>
                      <td className="d-flex">
                        <div className="d-flex align-items-center edit-delete-action">
                          <a className="me-2 border rounded d-flex align-items-center p-2" href="#" onClick={(e) => { e.preventDefault(); openEditModal(entry); }}>
                            <i data-feather="edit" className="feather-edit"></i>
                          </a>
                          <a className="p-2 border rounded d-flex align-items-center" href="#" onClick={(e) => { e.preventDefault(); openDeleteModal(entry.id); }}>
                            <i data-feather="trash-2" className="feather-trash-2"></i>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {matchingProducts.length > 0 && (
                <div className="p-3 border-top">
                  <h6 className="mb-2">{t('stocks.matching_products')}</h6>
                  <ul className="list-unstyled mb-0">
                    {matchingProducts.map((p) => (
                      <li key={p.id} className="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-md me-2">
                            <img src={mediaUrl(p.images?.[0])} alt="product" />
                          </span>
                          <div>
                            <div className="fw-medium">{p.productName}</div>
                            <small className="text-muted">{p.sku} · {t('stocks.current_stock')}: {p.quantity}</small>
                          </div>
                        </div>
                        <a href="#" className="btn btn-sm btn-primary" onClick={(e) => { e.preventDefault(); openAddForProduct(p); }}>
                          <i className="ti ti-circle-plus me-1"></i>{t('stocks.add_stock')}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ====== Add Stock Modal ====== */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>{t('stocks.add_stock')}</h4></div>
                <button type="button" className="close" onClick={() => { setShowAddModal(false); resetAdd(); }} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {renderProductSearch(
                    addSearchTerm,
                    setAddSearchTerm,
                    addShowDropdown,
                    setAddShowDropdown,
                    addSearchRef,
                    (p) => {
                      setAddSelectedProduct(p);
                      setAddForm((prev) => ({ ...prev, productId: parseInt(p.id) }));
                      setAddSearchTerm(p.productName);
                    },
                    t('stocks.product')
                  )}
                  <div className="col-lg-12">
                    <div className="mt-3 mb-3">
                      <label className="form-label">{t('stocks.quantity_units')}<span className="text-danger ms-1">*</span></label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="form-control"
                        placeholder="e.g. 50"
                        value={addForm.quantity}
                        onChange={(e) => { const v = e.target.value; setAddForm((p) => ({ ...p, quantity: v === '' ? '' : Math.max(0, Math.floor(Number(v))) })); setFormError(''); }}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <small className="text-muted">{t('stocks.added_by')}: <strong>{user?.fullName || '-'}</strong></small>
                    {formError && <div className="alert alert-danger py-2 mt-2 mb-0">{formError}</div>}
                  </div>
                </div>

                {/* Selected product preview */}
                {addSelectedProduct && (
                  <div className="modal-body-table mt-3">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{t('stocks.product')}</th>
                            <th>{t('stocks.sku')}</th>
                            <th>{t('stocks.category')}</th>
                            <th>{t('stocks.qty')}</th>
                            <th className="no-sort"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="avatar avatar-md me-2">
                                  <img src={mediaUrl(addSelectedProduct.images?.[0])} alt="product" />
                                </span>
                                <span>{addSelectedProduct.productName}</span>
                              </div>
                            </td>
                            <td>{addSelectedProduct.sku}</td>
                            <td>{addSelectedProduct.category}</td>
                            <td>
                              {addForm.quantity || 0}
                            </td>
                            <td>
                              <div className="d-flex align-items-center edit-delete-action">
                                <a className="d-flex align-items-center border rounded p-2" href="#" onClick={(e) => { e.preventDefault(); setAddSelectedProduct(null); setAddSearchTerm(''); setAddForm((p) => ({ ...p, productId: 0, quantity: '' })); }}>
                                  <i data-feather="trash-2" className="feather-trash-2"></i>
                                </a>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => { setShowAddModal(false); resetAdd(); }}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={handleAddSave}>{t('stocks.add_stock')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Edit Stock Modal ====== */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered stock-adjust-modal">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>{t('stocks.edit_stock')}</h4></div>
                <button type="button" className="close" onClick={() => setShowEditModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {renderProductSearch(
                    editSearchTerm,
                    setEditSearchTerm,
                    editShowDropdown,
                    setEditShowDropdown,
                    editSearchRef,
                    (p) => {
                      setEditSelectedProduct(p);
                      setEditForm((prev) => ({ ...prev, productId: parseInt(p.id) }));
                      setEditSearchTerm(p.productName);
                    },
                    t('stocks.product')
                  )}
                  <div className="col-lg-12">
                    <div className="mt-3 mb-3">
                      <label className="form-label">{t('stocks.quantity_units')}<span className="text-danger ms-1">*</span></label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="form-control"
                        placeholder="e.g. 50"
                        value={editForm.quantity}
                        onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, quantity: v === '' ? '' : Math.max(0, Math.floor(Number(v))) })); setFormError(''); }}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <small className="text-muted">{t('stocks.added_by')}: <strong>{editPerson || '-'}</strong></small>
                    {formError && <div className="alert alert-danger py-2 mt-2 mb-0">{formError}</div>}
                  </div>
                </div>

                {/* Selected product preview */}
                {editSelectedProduct && (
                  <div className="modal-body-table mt-3">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{t('stocks.product')}</th>
                            <th>{t('stocks.sku')}</th>
                            <th>{t('stocks.category')}</th>
                            <th>{t('stocks.qty')}</th>
                            <th className="no-sort"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="avatar avatar-md me-2">
                                  <img src={mediaUrl(editSelectedProduct.images?.[0])} alt="product" />
                                </span>
                                <span>{editSelectedProduct.productName}</span>
                              </div>
                            </td>
                            <td>{editSelectedProduct.sku}</td>
                            <td>{editSelectedProduct.category}</td>
                            <td>
                              {editForm.quantity || 0}
                            </td>
                            <td>
                              <div className="d-flex align-items-center edit-delete-action">
                                <a className="d-flex align-items-center border rounded p-2" href="#" onClick={(e) => { e.preventDefault(); setEditSelectedProduct(null); setEditSearchTerm(''); setEditForm((p) => ({ ...p, productId: 0, quantity: '' })); }}>
                                  <i data-feather="trash-2" className="feather-trash-2"></i>
                                </a>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary me-2" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" onClick={handleEditSave}>{t('common.save_changes')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Delete Modal ====== */}
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
      <AdminDeleteModal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteId(null); }} onConfirm={handleDelete} />
    </>
  );
};

export default ManageStocks;
