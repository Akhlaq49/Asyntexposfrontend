import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCodeLib from 'qrcode';
import api, { mediaUrl } from '../../services/api';

/* ---------- Types ---------- */
interface DropdownOption { value: string; label: string; }

interface ProductResult {
  id: string;
  productName: string;
  sku: string;
  itemBarcode: string;
  price: number;
  images: string[];
}

interface QrItem {
  id: string;
  productName: string;
  sku: string;
  itemBarcode: string;
  image: string;
  refNumber: string;
  qty: number;
}

/* ---------- QR canvas sub-component ---------- */
const QRCanvas: React.FC<{ value: string; size?: number }> = ({ value, size = 150 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, { width: size, margin: 1 }, () => {});
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
};

/* ---------- Generate a random reference number ---------- */
const generateRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = '';
  for (let i = 0; i < 8; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
  return ref;
};

/* ---------- Main QRCode Page ---------- */
const QRCode: React.FC = () => {
  /* ---- Lookups ---- */
  const [warehouses, setWarehouses] = useState<DropdownOption[]>([]);
  const [stores, setStores] = useState<DropdownOption[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedStore, setSelectedStore] = useState('');

  /* ---- Product search ---- */
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  /* ---- QR list ---- */
  const [qrItems, setQrItems] = useState<QrItem[]>([]);

  /* ---- Settings ---- */
  const [paperSize, setPaperSize] = useState('A4');
  const [showRefNumber, setShowRefNumber] = useState(true);

  /* ---- Modals ---- */
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---- Fetch lookups + products ---- */
  useEffect(() => {
    const load = async () => {
      try {
        const [wRes, sRes, pRes] = await Promise.all([
          api.get<DropdownOption[]>('/warehouses'),
          api.get<DropdownOption[]>('/stores'),
          api.get<ProductResult[]>('/products'),
        ]);
        setWarehouses(wRes.data);
        setStores(sRes.data);
        setProducts(pRes.data);
      } catch { /* ignore */ }
    };
    load();
  }, []);

  /* ---- Feather icons ---- */
  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  /* ---- Close dropdown on outside click ---- */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ---- Filtered product search results ---- */
  const searchResults = searchTerm.trim().length > 0
    ? products.filter(
        (p) =>
          p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.itemBarcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8)
    : [];

  /* ---- Add product to list ---- */
  const addProduct = useCallback((p: ProductResult) => {
    setQrItems((prev) => {
      if (prev.some((q) => q.id === p.id)) return prev;
      return [
        ...prev,
        {
          id: p.id,
          productName: p.productName,
          sku: p.sku,
          itemBarcode: p.itemBarcode || p.sku || `P${p.id}`,
          image: p.images?.[0] || '',
          refNumber: generateRef(),
          qty: 1,
        },
      ];
    });
    setSearchTerm('');
    setShowDropdown(false);
  }, []);

  /* ---- Quantity helpers ---- */
  const updateQty = useCallback((id: string, delta: number) => {
    setQrItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  }, []);

  const setQty = useCallback((id: string, val: number) => {
    setQrItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, val) } : item
      )
    );
  }, []);

  /* ---- Delete ---- */
  const openDeleteModal = (id: string) => { setDeleteId(id); setShowDeleteModal(true); };
  const handleDelete = () => {
    if (deleteId) setQrItems((prev) => prev.filter((i) => i.id !== deleteId));
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  /* ---- Reset ---- */
  const handleReset = () => {
    setQrItems([]);
    setSelectedWarehouse('');
    setSelectedStore('');
    setPaperSize('A4');
    setShowRefNumber(true);
  };

  /* ---- Print ---- */
  const handlePrint = () => { window.print(); };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Print QR Code</h4>
            <h6>Manage your QR code</h6>
          </div>
        </div>
        <div className="d-flex align-items-center">
          <ul className="table-top-head">
            <li>
              <a href="#" data-bs-placement="top" title="Refresh" onClick={(e) => { e.preventDefault(); handleReset(); }}>
                <i className="ti ti-refresh"></i>
              </a>
            </li>
            <li>
              <a href="#" data-bs-placement="top" title="Collapse" onClick={(e) => e.preventDefault()}>
                <i className="ti ti-chevron-up"></i>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Content */}
      <div className="barcode-content-list">
        {/* Warehouse & Store selectors */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="row">
            <div className="col-lg-6 col-12">
              <div className="row seacrh-barcode-item">
                <div className="col-sm-6 mb-3 seacrh-barcode-item-one">
                  <label className="form-label">Warehouse<span className="text-danger ms-1">*</span></label>
                  <select className="form-select" value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
                    <option value="">Select</option>
                    {warehouses.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-6 mb-3 seacrh-barcode-item-one">
                  <label className="form-label">Store<span className="text-danger ms-1">*</span></label>
                  <select className="form-select" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                    <option value="">Select</option>
                    {stores.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Product search */}
          <div className="row">
            <div className="col-lg-6">
              <div className="search-form seacrh-barcode-item" ref={searchRef}>
                <div className="search-form">
                  <label className="form-label">Product<span className="text-danger ms-1">*</span></label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search Product by Name or Code"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                    />
                    <i data-feather="search" className="feather-search"></i>
                  </div>
                  {showDropdown && searchResults.length > 0 && (
                    <div className="dropdown-menu search-dropdown w-100 h-auto rounded-1 mt-2 show" style={{ display: 'block', position: 'absolute', zIndex: 1050 }}>
                      <ul className="list-unstyled mb-0 p-2">
                        {searchResults.map((p) => (
                          <li
                            key={p.id}
                            className="fs-14 text-gray-9 mb-2 px-2 py-1 rounded"
                            style={{ cursor: 'pointer' }}
                            onMouseDown={() => addProduct(p)}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {p.productName} {p.sku ? `(${p.sku})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Selected products table */}
        {qrItems.length > 0 && (
          <div className="col-lg-12">
            <div className="modal-body-table search-modal-header bg-light p-2 p-sm-4">
              <div className="table-responsive rounded-1 qrcode-table">
                <table className="table datatable">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Code</th>
                      <th>Reference Number</th>
                      <th>Qty</th>
                      <th className="text-center no-sort bg-secondary-transparent"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {qrItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="avatar avatar-md me-2">
                              <img src={mediaUrl(item.image)} alt="product" />
                            </span>
                            <span>{item.productName}</span>
                          </div>
                        </td>
                        <td>{item.sku}</td>
                        <td>{item.itemBarcode}</td>
                        <td>{item.refNumber}</td>
                        <td>
                          <div className="product-quantity">
                            <span className="quantity-btn" onClick={() => updateQty(item.id, -1)} style={{ cursor: 'pointer' }}>
                              <i data-feather="minus-circle" className="feather-search"></i>
                            </span>
                            <input
                              type="text"
                              className="quntity-input"
                              value={item.qty}
                              onChange={(e) => setQty(item.id, parseInt(e.target.value) || 1)}
                            />
                            <span className="quantity-btn" onClick={() => updateQty(item.id, 1)} style={{ cursor: 'pointer' }}>
                              <i data-feather="plus-circle" className="plus-circle"></i>
                            </span>
                          </div>
                        </td>
                        <td className="action-table-data justify-content-center">
                          <div className="edit-delete-action">
                            <a href="#" className="barcode-delete-icon" onClick={(e) => { e.preventDefault(); openDeleteModal(item.id); }}>
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
        )}

        {/* Paper size & toggle */}
        <div className="paper-search-size">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <form onSubmit={(e) => e.preventDefault()}>
                <label className="form-label">Paper Size<span className="text-danger ms-1">*</span></label>
                <select className="form-select" value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                  <option value="A3">A3</option>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="A6">A6</option>
                </select>
              </form>
            </div>
            <div className="col-lg-6 pt-3">
              <div className="row">
                <div className="col-sm-4">
                  <div className="search-toggle-list">
                    <p>Reference Number</p>
                    <div className="m-0">
                      <div className="status-toggle modal-status d-flex justify-content-between align-items-center">
                        <input type="checkbox" id="toggle-ref" className="check" checked={showRefNumber} onChange={(e) => setShowRefNumber(e.target.checked)} />
                        <label htmlFor="toggle-ref" className="checktoggle mb-0"></label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="search-barcode-button">
          <a
            href="#"
            className="btn btn-submit me-2 mt-0 fs-13 btn-primary shadow-none"
            onClick={(e) => { e.preventDefault(); if (qrItems.length > 0) setShowQrModal(true); }}
          >
            <span><i className="fas fa-eye me-2"></i></span>Generate QR Code
          </a>
          <a href="#" className="btn btn-cancel me-2 fs-13 btn-secondary shadow-none" onClick={(e) => { e.preventDefault(); handleReset(); }}>
            <span><i className="fas fa-power-off me-2"></i></span>Reset
          </a>
          <a href="#" className="btn btn-cancel close-btn fs-13 btn-danger shadow-none" onClick={(e) => { e.preventDefault(); handlePrint(); }}>
            <span><i className="fas fa-print me-2"></i></span>Print QRcode
          </a>
        </div>
      </div>

      {/* ====== QR Code Preview Modal ====== */}
      {showQrModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered stock-adjust-modal modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title"><h4>QR Code</h4></div>
                <button type="button" className="close bg-danger text-white fs-16 shadow-none" onClick={() => setShowQrModal(false)} aria-label="Close">
                  <span aria-hidden="true" className="fs-16">&times;</span>
                </button>
              </div>
              <div className="modal-body pb-0" id="qr-print-area">
                <div className="d-flex justify-content-end mb-3 d-print-none">
                  <a href="#" className="btn btn-cancel close-btn bg-danger text-white shadow-none" onClick={(e) => { e.preventDefault(); handlePrint(); }}>
                    <span><i className="fas fa-print me-2"></i></span>Print QR Code
                  </a>
                </div>
                {qrItems.map((item) => (
                  <div key={item.id}>
                    <div className="barcode-scan-header">
                      <h5>{item.productName}</h5>
                    </div>
                    <div className="row">
                      {Array.from({ length: item.qty }, (_, idx) => (
                        <div className="col-sm-6" key={`${item.id}-${idx}`}>
                          <div className="barcode-scanner-link text-center">
                            <div className="barscaner-img">
                              <QRCanvas value={item.itemBarcode} size={150} />
                            </div>
                            {showRefNumber && (
                              <p className="fs-12">Ref No: {item.refNumber}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Delete Modal ====== */}
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
                  <p className="mb-0 fs-16">Are you sure you want to delete this product?</p>
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
    </>
  );
};

export default QRCode;
