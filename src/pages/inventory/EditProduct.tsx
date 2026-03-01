import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mediaUrl } from '../../services/api';
import {
  getProductById,
  updateProduct,
  getStores,
  getWarehouses,
  getCategories,
  getSubCategories,
  getBrands,
  getUnits,
  type DropdownOption,
} from '../../services/productService';
import { useFieldVisibility } from '../../utils/useFieldVisibility';

const EditProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isVisible } = useFieldVisibility('AddProduct');

  const [loading, setLoading] = useState(true);

  // Dropdown options state
  const [stores, setStores] = useState<DropdownOption[]>([]);
  const [warehouses, setWarehouses] = useState<DropdownOption[]>([]);
  const [categories, setCategoriesOpts] = useState<DropdownOption[]>([]);
  const [subCategories, setSubCategories] = useState<DropdownOption[]>([]);
  const [brands, setBrands] = useState<DropdownOption[]>([]);
  const [units, setUnits] = useState<DropdownOption[]>([]);

  // Form state
  const [form, setForm] = useState({
    store: '',
    warehouse: '',
    productName: '',
    slug: '',
    sku: '',
    sellingType: '',
    category: '',
    subCategory: '',
    brand: '',
    unit: '',
    barcodeSymbology: '',
    itemBarcode: '',
    description: '',
    productType: 'single' as 'single' | 'variable',
    quantity: '',
    price: '',
    taxType: '',
    tax: '',
    discountType: '',
    discountValue: '',
    quantityAlert: '',
    warranty: '',
    manufacturer: '',
    manufacturedDate: '',
    expiryDate: '',
  });

  // Images state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Existing images from server
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customFieldChecks, setCustomFieldChecks] = useState({
    warranties: false,
    manufacturer: false,
    expiry: false,
  });

  // Accordion state
  const [accordion, setAccordion] = useState({
    productInfo: true,
    pricingStocks: true,
    images: true,
    customFields: true,
  });

  // Add Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load dropdown data + existing product
  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, w, c, sc, b, u, product] = await Promise.all([
          getStores(),
          getWarehouses(),
          getCategories(),
          getSubCategories(),
          getBrands(),
          getUnits(),
          getProductById(id || ''),
        ]);
        setStores(s);
        setWarehouses(w);
        setCategoriesOpts(c);
        setSubCategories(sc);
        setBrands(b);
        setUnits(u);

        // Populate form from product
        setForm({
          store: product.store || '',
          warehouse: product.warehouse || '',
          productName: product.productName || '',
          slug: product.slug || '',
          sku: product.sku || '',
          sellingType: product.sellingType || '',
          category: product.category || '',
          subCategory: product.subCategory || '',
          brand: product.brand || '',
          unit: product.unit || '',
          barcodeSymbology: product.barcodeSymbology || '',
          itemBarcode: product.itemBarcode || '',
          description: product.description || '',
          productType: (product.productType as 'single' | 'variable') || 'single',
          quantity: product.quantity?.toString() || '',
          price: product.price?.toString() || '',
          taxType: product.taxType || '',
          tax: product.tax || '',
          discountType: product.discountType || '',
          discountValue: product.discountValue?.toString() || '',
          quantityAlert: product.quantityAlert?.toString() || '',
          warranty: product.warranty || '',
          manufacturer: product.manufacturer || '',
          manufacturedDate: product.manufacturedDate || '',
          expiryDate: product.expiryDate || '',
        });

        // Set existing images
        if (product.images && product.images.length > 0) {
          setExistingImages(product.images);
        }

        // Show custom field sections if values exist
        setCustomFieldChecks({
          warranties: !!product.warranty,
          manufacturer: !!product.manufacturer,
          expiry: !!product.manufacturedDate || !!product.expiryDate,
        });
      } catch {
        setError('Failed to load product. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Initialize feather icons
  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  // Auto-generate slug from product name
  useEffect(() => {
    if (form.productName) {
      const slug = form.productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setForm((prev) => ({ ...prev, slug }));
    }
  }, [form.productName]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const generateSKU = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let sku = 'PT';
    for (let i = 0; i < 6; i++) sku += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm((prev) => ({ ...prev, sku }));
  };

  const generateBarcode = () => {
    let barcode = '';
    for (let i = 0; i < 12; i++) barcode += Math.floor(Math.random() * 10).toString();
    setForm((prev) => ({ ...prev, itemBarcode: barcode }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setImageFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategoriesOpts((prev) => [
        ...prev,
        { value: newCategoryName.toLowerCase().replace(/\s+/g, '-'), label: newCategoryName },
      ]);
      setForm((prev) => ({ ...prev, category: newCategoryName.toLowerCase().replace(/\s+/g, '-') }));
      setNewCategoryName('');
      setShowCategoryModal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProduct(id || '', {
        ...form,
        quantity: Number(form.quantity) || 0,
        price: Number(form.price) || 0,
        discountValue: Number(form.discountValue) || 0,
        quantityAlert: Number(form.quantityAlert) || 0,
        images: imageFiles,
      });
      setSuccess(true);
      setTimeout(() => navigate('/product-list'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAccordion = (key: keyof typeof accordion) => {
    setAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const barcodeSymbologies = [
    { value: 'code128', label: 'Code 128' },
    { value: 'code39', label: 'Code 39' },
    { value: 'upc-a', label: 'UPC-A' },
    { value: 'upc-e', label: 'UPC-E' },
    { value: 'ean-8', label: 'EAN-8' },
    { value: 'ean-13', label: 'EAN-13' },
  ];
  const sellingTypes = [
    { value: 'online', label: 'Online' },
    { value: 'pos', label: 'POS' },
  ];
  const taxTypes = [
    { value: 'exclusive', label: 'Exclusive' },
    { value: 'inclusive', label: 'Inclusive' },
  ];
  const taxes = [
    { value: 'igst-8', label: 'IGST (8%)' },
    { value: 'gst-5', label: 'GST (5%)' },
    { value: 'sgst-4', label: 'SGST (4%)' },
    { value: 'cgst-16', label: 'CGST (16%)' },
    { value: 'gst-18', label: 'GST 18%' },
  ];
  const discountTypes = [
    { value: 'percentage', label: 'Percentage' },
    { value: 'fixed', label: 'Fixed' },
  ];
  const warranties = [
    { value: 'replacement', label: 'Replacement Warranty' },
    { value: 'onsite', label: 'On-Site Warranty' },
    { value: 'accidental', label: 'Accidental Protection Plan' },
  ];

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Edit Product</h4>
            <h6>Update product details</h6>
          </div>
        </div>
        <ul className="table-top-head">
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
        <div className="page-btn mt-0">
          <Link to="/product-list" className="btn btn-secondary">
            <i data-feather="arrow-left" className="me-2"></i>Back to Product
          </Link>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error!</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Success!</strong> Product updated successfully. Redirecting...
          <button type="button" className="btn-close" onClick={() => setSuccess(false)}></button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="add-product-form">
        <div className="add-product">
          <div className="accordions-items-seperate" id="accordionSpacingExample">

            {/* === Section 1: Product Information === */}
            <div className="accordion-item border mb-4">
              <h2 className="accordion-header">
                <div
                  className="accordion-button collapsed bg-white"
                  onClick={() => toggleAccordion('productInfo')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-fill">
                    <h5 className="d-flex align-items-center">
                      <i data-feather="info" className="text-primary me-2"></i>
                      <span>Product Information</span>
                    </h5>
                  </div>
                </div>
              </h2>
              {accordion.productInfo && (
                <div className="accordion-collapse collapse show">
                  <div className="accordion-body border-top">
                    {/* Store & Warehouse */}
                    <div className="row">
                      {isVisible('store') && (
                      <div className="col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">Store</label>
                          <select className="form-select" name="store" value={form.store} onChange={handleChange}>
                            <option value="">Select</option>
                            {stores.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      )}
                      {isVisible('warehouse') && (
                      <div className="col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">Warehouse</label>
                          <select className="form-select" name="warehouse" value={form.warehouse} onChange={handleChange}>
                            <option value="">Select</option>
                            {warehouses.map((w) => (
                              <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Product Name & Slug */}
                    <div className="row">
                      {isVisible('productName') && (
                      <div className="col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">Product Name</label>
                          <input type="text" className="form-control" name="productName" value={form.productName} onChange={handleChange} />
                        </div>
                      </div>
                      )}
                      {isVisible('slug') && (
                      <div className="col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">Slug</label>
                          <input type="text" className="form-control" name="slug" value={form.slug} onChange={handleChange} />
                        </div>
                      </div>
                      )}
                    </div>

                    {/* SKU & Selling Type */}
                    <div className="row">
                      {isVisible('sku') && (
                      <div className="col-sm-6 col-12">
                        <div className="mb-3 list position-relative">
                          <label className="form-label">SKU</label>
                          <input type="text" className="form-control list" name="sku" value={form.sku} onChange={handleChange} />
                          <button type="button" className="btn btn-primaryadd" onClick={generateSKU}>
                            Generate
                          </button>
                        </div>
                      </div>
                      )}
                      {isVisible('sellingType') && (
                      <div className="col-sm-6 col-12">
                        <div className="mb-3">
                          <label className="form-label">Selling Type</label>
                          <select className="form-select" name="sellingType" value={form.sellingType} onChange={handleChange}>
                            <option value="">Select</option>
                            {sellingTypes.map((st) => (
                              <option key={st.value} value={st.value}>{st.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Category & Sub Category */}
                    <div className="addservice-info">
                      <div className="row">
                        {isVisible('category') && (
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <div className="add-newplus">
                              <label className="form-label">Category</label>
                              <a href="#" onClick={(e) => { e.preventDefault(); setShowCategoryModal(true); }}>
                                <i data-feather="plus-circle" className="plus-down-add"></i>
                                <span>Add New</span>
                              </a>
                            </div>
                            <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                              <option value="">Select</option>
                              {categories.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        )}
                        {isVisible('subCategory') && (
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Sub Category</label>
                            <select className="form-select" name="subCategory" value={form.subCategory} onChange={handleChange}>
                              <option value="">Select</option>
                              {subCategories.map((sc) => (
                                <option key={sc.value} value={sc.value}>{sc.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>

                    {/* Brand & Unit */}
                    <div className="add-product-new">
                      <div className="row">
                        {isVisible('brand') && (
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <div className="add-newplus">
                              <label className="form-label">Brand</label>
                            </div>
                            <select className="form-select" name="brand" value={form.brand} onChange={handleChange}>
                              <option value="">Select</option>
                              {brands.map((b) => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        )}
                        {isVisible('unit') && (
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <div className="add-newplus">
                              <label className="form-label">Unit</label>
                            </div>
                            <select className="form-select" name="unit" value={form.unit} onChange={handleChange}>
                              <option value="">Select</option>
                              {units.map((u) => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>

                    {/* Barcode Symbology & Item Barcode */}
                    <div className="row">
                      {isVisible('barcodeSymbology') && (
                      <div className="col-sm-6">
                        <div className="mb-3">
                          <div className="add-newplus">
                            <label className="form-label">Barcode Symbology</label>
                          </div>
                          <select className="form-select" name="barcodeSymbology" value={form.barcodeSymbology} onChange={handleChange}>
                            <option value="">Select</option>
                            {barcodeSymbologies.map((bs) => (
                              <option key={bs.value} value={bs.value}>{bs.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      )}
                      {isVisible('itemBarcode') && (
                      <div className="col-lg-6 col-sm-6 col-12">
                        <div className="mb-3 list position-relative">
                          <label className="form-label">Item Barcode</label>
                          <input type="text" className="form-control list" name="itemBarcode" value={form.itemBarcode} onChange={handleChange} />
                          <button type="button" className="btn btn-primaryadd" onClick={generateBarcode}>
                            Generate
                          </button>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Description */}
                    {isVisible('description') && (
                    <div className="col-lg-12">
                      <div className="summer-description-box">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          rows={4}
                          name="description"
                          value={form.description}
                          onChange={handleChange}
                          placeholder="Enter product description..."
                        ></textarea>
                        <p className="fs-14 mt-1">Maximum 60 Words</p>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* === Section 2: Pricing & Stocks === */}
            <div className="accordion-item border mb-4">
              <h2 className="accordion-header">
                <div
                  className="accordion-button collapsed bg-white"
                  onClick={() => toggleAccordion('pricingStocks')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-fill">
                    <h5 className="d-flex align-items-center">
                      <i data-feather="life-buoy" className="text-primary me-2"></i>
                      <span>Pricing &amp; Stocks</span>
                    </h5>
                  </div>
                </div>
              </h2>
              {accordion.pricingStocks && (
                <div className="accordion-collapse collapse show">
                  <div className="accordion-body border-top">
                    {/* Product Type */}
                    <div className="mb-3s">
                      <label className="form-label">Product Type</label>
                      <div className="single-pill-product mb-3">
                        <ul className="nav nav-pills" role="tablist">
                          <li className="nav-item" role="presentation">
                            <span
                              className={`custom_radio me-4 mb-0 ${form.productType === 'single' ? 'active' : ''}`}
                              onClick={() => setForm((prev) => ({ ...prev, productType: 'single' }))}
                              style={{ cursor: 'pointer' }}
                            >
                              <input type="radio" className="form-control" name="productType" checked={form.productType === 'single'} readOnly />
                              <span className="checkmark"></span> Single Product
                            </span>
                          </li>
                          <li className="nav-item" role="presentation">
                            <span
                              className={`custom_radio me-2 mb-0 ${form.productType === 'variable' ? 'active' : ''}`}
                              onClick={() => setForm((prev) => ({ ...prev, productType: 'variable' }))}
                              style={{ cursor: 'pointer' }}
                            >
                              <input type="radio" className="form-control" name="productType" checked={form.productType === 'variable'} readOnly />
                              <span className="checkmark"></span> Variable Product
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Single Product Fields */}
                    {form.productType === 'single' && (
                      <div className="single-product">
                        <div className="row">
                          {isVisible('quantity') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Quantity</label>
                              <input type="number" className="form-control" name="quantity" value={form.quantity} onChange={handleChange} />
                            </div>
                          </div>
                          )}
                          {isVisible('price') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Price</label>
                              <input type="number" step="0.01" className="form-control" name="price" value={form.price} onChange={handleChange} />
                            </div>
                          </div>
                          )}
                          {isVisible('taxType') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Tax Type</label>
                              <select className="form-select" name="taxType" value={form.taxType} onChange={handleChange}>
                                <option value="">Select</option>
                                {taxTypes.map((tt) => (
                                  <option key={tt.value} value={tt.value}>{tt.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          )}
                          {isVisible('tax') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Tax</label>
                              <select className="form-select" name="tax" value={form.tax} onChange={handleChange}>
                                <option value="">Select</option>
                                {taxes.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          )}
                          {isVisible('discountType') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Discount Type</label>
                              <select className="form-select" name="discountType" value={form.discountType} onChange={handleChange}>
                                <option value="">Select</option>
                                {discountTypes.map((dt) => (
                                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          )}
                          {isVisible('discountValue') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Discount Value</label>
                              <input className="form-control" type="number" step="0.01" name="discountValue" value={form.discountValue} onChange={handleChange} />
                            </div>
                          </div>
                          )}
                          {isVisible('quantityAlert') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Quantity Alert</label>
                              <input type="number" className="form-control" name="quantityAlert" value={form.quantityAlert} onChange={handleChange} />
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Variable Product Fields */}
                    {form.productType === 'variable' && (
                      <div className="row select-color-add">
                        <div className="col-lg-6 col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Variant Attribute</label>
                            <select className="form-select" defaultValue="">
                              <option value="">Choose</option>
                              <option value="color">Color</option>
                              <option value="red">Red</option>
                              <option value="black">Black</option>
                            </select>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="modal-body-table border">
                            <div className="table-responsive">
                              <table className="table border">
                                <thead>
                                  <tr>
                                    <th>Variation</th>
                                    <th>Variant Value</th>
                                    <th>SKU</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td><input type="text" className="form-control" defaultValue="color" /></td>
                                    <td><input type="text" className="form-control" defaultValue="red" /></td>
                                    <td><input type="text" className="form-control" defaultValue="1234" /></td>
                                    <td><input type="number" className="form-control" defaultValue="2" /></td>
                                    <td><input type="number" className="form-control" defaultValue="50000" /></td>
                                  </tr>
                                  <tr>
                                    <td><input type="text" className="form-control" defaultValue="color" /></td>
                                    <td><input type="text" className="form-control" defaultValue="black" /></td>
                                    <td><input type="text" className="form-control" defaultValue="2345" /></td>
                                    <td><input type="number" className="form-control" defaultValue="3" /></td>
                                    <td><input type="number" className="form-control" defaultValue="50000" /></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* === Section 3: Images === */}
            <div className="accordion-item border mb-4">
              <h2 className="accordion-header">
                <div
                  className="accordion-button collapsed bg-white"
                  onClick={() => toggleAccordion('images')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-fill">
                    <h5 className="d-flex align-items-center">
                      <i data-feather="image" className="text-primary me-2"></i>
                      <span>Images</span>
                    </h5>
                  </div>
                </div>
              </h2>
              {accordion.images && (
                <div className="accordion-collapse collapse show">
                  <div className="accordion-body border-top">
                    <div className="text-editor add-list add">
                      <div className="col-lg-12">
                        <div className="add-choosen">
                          <div className="mb-3">
                            <div className="image-upload image-upload-two">
                              <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                              />
                              <div className="image-uploads">
                                <i data-feather="plus-circle" className="plus-down-add me-0"></i>
                                <h4>Add Images</h4>
                              </div>
                            </div>
                          </div>
                          {/* Existing images from server */}
                          {existingImages.map((img, idx) => (
                            <div className="phone-img" key={`existing-${idx}`}>
                              <img src={mediaUrl(img)} alt={`Existing ${idx + 1}`} />
                              <a href="#" onClick={(e) => { e.preventDefault(); removeExistingImage(idx); }}>
                                <i data-feather="x" className="x-square-add remove-product"></i>
                              </a>
                            </div>
                          ))}
                          {/* Newly added images */}
                          {imagePreviews.map((preview, idx) => (
                            <div className="phone-img" key={`new-${idx}`}>
                              <img src={preview} alt={`Preview ${idx + 1}`} />
                              <a href="#" onClick={(e) => { e.preventDefault(); removeNewImage(idx); }}>
                                <i data-feather="x" className="x-square-add remove-product"></i>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* === Section 4: Custom Fields === */}
            <div className="accordion-item border mb-4">
              <h2 className="accordion-header">
                <div
                  className="accordion-button collapsed bg-white"
                  onClick={() => toggleAccordion('customFields')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-fill">
                    <h5 className="d-flex align-items-center">
                      <i data-feather="list" className="text-primary me-2"></i>
                      <span>Custom Fields</span>
                    </h5>
                  </div>
                </div>
              </h2>
              {accordion.customFields && (
                <div className="accordion-collapse collapse show">
                  <div className="accordion-body border-top">
                    <div>
                      {/* Checkboxes */}
                      <div className="p-3 bg-light rounded d-flex align-items-center border mb-3">
                        <div className="d-flex align-items-center">
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="warranties"
                              checked={customFieldChecks.warranties}
                              onChange={(e) => setCustomFieldChecks((prev) => ({ ...prev, warranties: e.target.checked }))}
                            />
                            <label className="form-check-label" htmlFor="warranties">Warranties</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="manufacturer"
                              checked={customFieldChecks.manufacturer}
                              onChange={(e) => setCustomFieldChecks((prev) => ({ ...prev, manufacturer: e.target.checked }))}
                            />
                            <label className="form-check-label" htmlFor="manufacturer">Manufacturer</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="expiry"
                              checked={customFieldChecks.expiry}
                              onChange={(e) => setCustomFieldChecks((prev) => ({ ...prev, expiry: e.target.checked }))}
                            />
                            <label className="form-check-label" htmlFor="expiry">Expiry</label>
                          </div>
                        </div>
                      </div>

                      {/* Warranty & Manufacturer */}
                      <div className="row">
                        {customFieldChecks.warranties && (
                          <div className="col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Warranty</label>
                              <select className="form-select" name="warranty" value={form.warranty} onChange={handleChange}>
                                <option value="">Select</option>
                                {warranties.map((w) => (
                                  <option key={w.value} value={w.value}>{w.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                        {customFieldChecks.manufacturer && (
                          <div className="col-sm-6 col-12">
                            <div className="mb-3 add-product">
                              <label className="form-label">Manufacturer</label>
                              <input type="text" className="form-control" name="manufacturer" value={form.manufacturer} onChange={handleChange} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Dates */}
                      {customFieldChecks.expiry && (
                        <div className="row">
                          <div className="col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Manufactured Date</label>
                              <div className="input-groupicon calender-input">
                                <i data-feather="calendar" className="info-img"></i>
                                <input
                                  type="date"
                                  className="form-control"
                                  name="manufacturedDate"
                                  value={form.manufacturedDate}
                                  onChange={handleChange}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Expiry On</label>
                              <div className="input-groupicon calender-input">
                                <i data-feather="calendar" className="info-img"></i>
                                <input
                                  type="date"
                                  className="form-control"
                                  name="expiryDate"
                                  value={form.expiryDate}
                                  onChange={handleChange}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="col-lg-12">
          <div className="d-flex align-items-center justify-content-end mb-4">
            <Link to="/product-list" className="btn btn-secondary me-2">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Updating...
                </>
              ) : (
                'Update Product'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="page-title">
                  <h4>Add Category</h4>
                </div>
                <button type="button" className="close" onClick={() => setShowCategoryModal(false)} aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <label className="form-label">Category<span className="ms-1 text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn me-2 btn-secondary fs-13 fw-medium p-2 px-3 shadow-none"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary text-white fs-13 fw-medium p-2 px-3"
                  onClick={handleAddCategory}
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

export default EditProduct;
