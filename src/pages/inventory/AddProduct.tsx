import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createProduct,
  getCategories,
  getBrands,
  getUnits,
  getWarranties,
  type DropdownOption,
} from '../../services/productService';
import { useFieldVisibility } from '../../utils/useFieldVisibility';
import { AppliedTax, cleanTaxes } from '../../components/common/TaxSelector';
import VariantBuilder, { VariantRow, variantLabel, resolveVariantSku } from '../../components/products/VariantBuilder';

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isVisible } = useFieldVisibility('AddProduct');

  // Dropdown options state
  const [categories, setCategoriesOpts] = useState<DropdownOption[]>([]);
  const [brands, setBrands] = useState<DropdownOption[]>([]);
  const [units, setUnits] = useState<DropdownOption[]>([]);
  const [warranties, setWarranties] = useState<DropdownOption[]>([]);

  // Form state
  // tax and discount are no longer entered on products: new products have none
  const taxes: AppliedTax[] = [];
  const discountOn = false;
  // variable product: one row per variant (each is saved as its own product)
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [form, setForm] = useState({
    productName: '',
    slug: '',
    sku: '',
    sellingType: 'pos', // new products are sold in the shop by default
    category: '',
    brand: '',
    color: '',
    model: '',
    unit: '',
    description: '',
    productType: 'single' as 'single' | 'variable',
    quantity: '0', // new products start with 0 stock (stock usually arrives through purchase orders)
    price: '',
    taxType: '',
    tax: '',
    discountType: '',
    discountValue: '',
    quantityAlert: '',
    warranty: '',
  });

  // Images state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customFieldChecks, setCustomFieldChecks] = useState({
    warranties: false,
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

  // Load dropdown data
  useEffect(() => {
    const loadDropdowns = async () => {
      const [c, b, u, w] = await Promise.all([
        getCategories(),
        getBrands(),
        getUnits(),
        getWarranties(),
      ]);
      setCategoriesOpts(c);
      setBrands(b);
      setUnits(u);
      setWarranties(w);
    };
    loadDropdowns();
  }, []);

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
    // Reset input so re-selecting same file works
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
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
      if (form.productType === 'variable') {
        if (!form.productName.trim()) throw new Error('Enter the product name.');
        if (variantRows.length === 0) throw new Error('Tick at least one variant value (or choose Single Product).');
        const skus = variantRows.map((r) => resolveVariantSku(r, form.sku).toLowerCase());
        const dup = skus.find((k, i) => skus.indexOf(k) !== i);
        if (dup) throw new Error(`Two variants have the same SKU (${dup.toUpperCase()}) - give each its own SKU.`);
        const created: string[] = [];
        for (const r of variantRows) {
          const price = r.price.trim() !== '' ? Number(r.price) || 0 : Number(form.price) || 0;
          const colorPart = r.parts.find((p) => /^colou?r$/i.test(p.attribute));
          const modelPart = r.parts.find((p) => /^model$/i.test(p.attribute));
          try {
            await createProduct({
              ...form,
              productName: `${form.productName.trim()} - ${variantLabel(r)}`,
              slug: form.slug ? `${form.slug}-${resolveVariantSku(r, '').toLowerCase()}` : '',
              sku: resolveVariantSku(r, form.sku),
              color: colorPart ? colorPart.value : form.color,
              model: modelPart ? modelPart.value : form.model,
              description: [form.description, r.parts.map((p) => `${p.attribute}: ${p.value}`).join(', ')].filter(Boolean).join('\n'),
              productType: 'single',
              quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)),
              price,
              discountType: discountOn ? (form.discountType || 'fixed') : '',
              discountValue: discountOn ? Number(form.discountValue) || 0 : 0,
              quantityAlert: Math.max(0, Math.floor(Number(form.quantityAlert) || 0)),
              taxesJson: JSON.stringify(cleanTaxes(taxes, price)),
              images: imageFiles,
            });
            created.push(variantLabel(r));
          } catch (err: any) {
            const why = err.response?.data?.message || err.message || 'failed';
            throw new Error(created.length
              ? `Saved ${created.length} variant(s) (${created.join(', ')}), but "${variantLabel(r)}" failed: ${why}`
              : `"${variantLabel(r)}" could not be saved: ${why}`);
          }
        }
        setSuccess(true);
        setTimeout(() => navigate('/product-list'), 1500);
        return;
      }
      await createProduct({
        ...form,
        quantity: Math.max(0, Math.floor(Number(form.quantity) || 0)),
        price: Number(form.price) || 0,
        discountType: discountOn ? (form.discountType || 'fixed') : '',
        discountValue: discountOn ? Number(form.discountValue) || 0 : 0,
        quantityAlert: Math.max(0, Math.floor(Number(form.quantityAlert) || 0)),
        // taxes go as a JSON list; the backend works out the amounts on the price
        taxesJson: JSON.stringify(cleanTaxes(taxes, Number(form.price) || 0)),
        images: imageFiles,
      });

      // Opening stock (quantity × price) is recorded as a purchase by the backend

      setSuccess(true);
      setTimeout(() => navigate('/product-list'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAccordion = (key: keyof typeof accordion) => {
    setAccordion((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sellingTypes = [
    { value: 'online', label: 'Online' },
    { value: 'pos', label: 'POS' },
  ];
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Create Product</h4>
            <h6>Create new product</h6>
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
          <strong>Success!</strong> Product created successfully. Redirecting...
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
                        {isVisible('color') && (
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Color</label>
                            <input type="text" className="form-control" name="color" maxLength={100} placeholder="e.g. White, Black" value={form.color} onChange={handleChange} />
                          </div>
                        </div>
                        )}
                        {isVisible('model') && (
                        <div className="col-sm-6 col-12">
                          <div className="mb-3">
                            <label className="form-label">Model</label>
                            <input type="text" className="form-control" name="model" maxLength={150} placeholder="e.g. 1 Gang Matrix" value={form.model} onChange={handleChange} />
                          </div>
                        </div>
                        )}
                      </div>
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
                    {/* Price, tax, discount and alert apply to a single product or to every variant */}
                    {(
                      <div className="single-product">
                        <div className="row">
                          {isVisible('quantity') && form.productType === 'single' && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">Quantity</label>
                              <input type="number" min={0} step={1} className="form-control" name="quantity" placeholder="0" value={form.quantity} onChange={handleChange} />
                            </div>
                          </div>
                          )}
                          {isVisible('price') && (
                          <div className="col-lg-4 col-sm-6 col-12">
                            <div className="mb-3">
                              <label className="form-label">{form.productType === 'variable' ? 'Price (all variants)' : 'Price'}</label>
                              <input type="number" step="0.01" className="form-control" name="price" value={form.price || ''} onChange={handleChange} />
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Variable Product: variants from Inventory > Variant Attributes */}
                    {form.productType === 'variable' && (
                      <VariantBuilder baseSku={form.sku} basePrice={form.price} rows={variantRows} onChange={setVariantRows} />
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
                          {imagePreviews.map((preview, idx) => (
                            <div className="phone-img" key={idx}>
                              <img src={preview} alt={`Preview ${idx + 1}`} />
                              <a href="#" onClick={(e) => { e.preventDefault(); removeImage(idx); }}>
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
                        </div>
                      </div>

                      {/* Warranty */}
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
                              {warranties.length === 0 && (
                                <small className="text-muted d-block mt-1">
                                  No warranties yet. Add them in <Link to="/warranty">Inventory → Warranties</Link>.
                                </small>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

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
                  Saving...
                </>
              ) : (
                'Add Product'
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

export default AddProduct;
