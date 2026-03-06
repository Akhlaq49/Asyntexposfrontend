import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { mediaUrl, MEDIA_BASE_URL } from '../../services/api';
import {
  CreateInstallmentPayload,
  createInstallment,
  addGuarantor,
  RepaymentEntry,
  previewInstallment,
  InstallmentPreview,
  searchParties,
  PartySearchResult,
} from '../../services/installmentService';
import { getProducts, createProduct, ProductResponse } from '../../services/productService';
import { getCustomers, Customer, createCustomer, uploadCustomerPicture } from '../../services/customerService';
import { useFieldVisibility } from '../../utils/useFieldVisibility';

const CreateInstallment: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { isVisible } = useFieldVisibility('CreateInstallment');

  // Collapsible sections state – accordion: only one open at a time
  type SectionKey = 'customer' | 'guarantor' | 'product' | 'financial' | 'plan';
  const sectionOrder: SectionKey[] = ['customer', 'guarantor', 'product', 'financial', 'plan'];
  const [activeSection, setActiveSection] = useState<SectionKey>('customer');

  const toggleSection = (section: SectionKey) => {
    setActiveSection(prev => prev === section ? prev : section);
  };

  const goNext = () => {
    const idx = sectionOrder.indexOf(activeSection);
    if (idx < sectionOrder.length - 1) setActiveSection(sectionOrder[idx + 1]);
  };

  const goBack = () => {
    const idx = sectionOrder.indexOf(activeSection);
    if (idx > 0) setActiveSection(sectionOrder[idx - 1]);
  };

  // Helper to check if a section is collapsed
  const collapsedSections = {
    customer: activeSection !== 'customer',
    guarantor: activeSection !== 'guarantor',
    product: activeSection !== 'product',
    financial: activeSection !== 'financial',
    plan: activeSection !== 'plan'
  };

  // Customer search state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // New customer modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerSaving, setNewCustomerSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', so: '', cnic: '', phone: '', email: '', address: '', city: '' });
  const [newCustomerPicture, setNewCustomerPicture] = useState<File | null>(null);
  const [newCustomerPicturePreview, setNewCustomerPicturePreview] = useState('');

  // Product search state
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // New product modal state
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductSaving, setNewProductSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({ productName: '', sku: '', category: '', brand: '', price: '', quantity: '', description: '' });
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [newProductImagePreview, setNewProductImagePreview] = useState('');

  const [form, setForm] = useState<CreateInstallmentPayload>({
    customerId: 0,
    productId: 0,
    financeAmount: undefined as number | undefined,
    downPayment: 0,
    interestRate: 0,
    tenure: 12,
    startDate: new Date().toISOString().split('T')[0],
  });

  // Guarantors local state
  interface LocalGuarantor {
    partyId: number | null;
    name: string;
    so: string;
    phone: string;
    cnic: string;
    address: string;
    relationship: string;
    pictureFile: File | null;
    picturePreview: string;
  }
  const emptyGuarantor: LocalGuarantor = { partyId: null, name: '', so: '', phone: '', cnic: '', address: '', relationship: '', pictureFile: null, picturePreview: '' };
  const [guarantors, setGuarantors] = useState<LocalGuarantor[]>([]);
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(0);

  // Guarantor search state
  const [guarantorSearchResults, setGuarantorSearchResults] = useState<PartySearchResult[]>([]);
  const [guarantorSearchLoading, setGuarantorSearchLoading] = useState(false);
  const [guarantorSearchTexts, setGuarantorSearchTexts] = useState<string[]>([]);
  const [showGuarantorDropdown, setShowGuarantorDropdown] = useState<number | null>(null);
  const guarantorSearchRef = useRef<HTMLDivElement>(null);

  // Preview data via API
  const productPrice = selectedProduct?.price ?? 0;
  const baseAmount = (form.financeAmount && form.financeAmount > 0) ? form.financeAmount : productPrice;
  const financedAmount = baseAmount - form.downPayment;

  const [preview, setPreview] = useState<InstallmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced preview from backend
  useEffect(() => {
    if (financedAmount <= 0 || form.tenure <= 0 || !form.startDate) {
      setPreview(null);
      return;
    }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await previewInstallment({
          productPrice,
          financeAmount: form.financeAmount,
          downPayment: form.downPayment,
          interestRate: form.interestRate,
          tenure: form.tenure,
          startDate: form.startDate,
        });
        setPreview(result);
      } catch {
        // silent – keep previous preview
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [productPrice, form.financeAmount, form.downPayment, form.interestRate, form.tenure, form.startDate, financedAmount]);

  const emi = preview?.emiAmount ?? 0;
  const totalPayable = preview?.totalPayable ?? 0;
  const totalInterest = preview?.totalInterest ?? 0;
  const schedule: RepaymentEntry[] = preview?.schedule ?? [];

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const set = (field: keyof CreateInstallmentPayload, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      setCustomersLoading(true);
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch {
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch products from inventory
  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const data = await getProducts();
        setProducts(data);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
      if (guarantorSearchRef.current && !guarantorSearchRef.current.contains(e.target as Node)) {
        setShowGuarantorDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setForm((prev) => ({
      ...prev,
      customerId: Number(customer.id),
    }));
  }, []);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setForm((prev) => ({
      ...prev,
      customerId: 0,
    }));
  }, []);

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) return;
    setNewCustomerSaving(true);
    try {
      let created = await createCustomer({ ...newCustomer, status: 'active' } as Omit<Customer, 'id'>);
      if (newCustomerPicture) {
        created = await uploadCustomerPicture(created.id, newCustomerPicture);
      }
      setCustomers(prev => [created, ...prev]);
      handleSelectCustomer(created);
      setShowNewCustomerModal(false);
      setNewCustomer({ name: '', so: '', cnic: '', phone: '', email: '', address: '', city: '' });
      setNewCustomerPicture(null);
      setNewCustomerPicturePreview('');
    } catch {
      setError(t('create_installment.failed_create_customer'));
    } finally {
      setNewCustomerSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) =>
      p.productName.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const handleSelectProduct = useCallback((product: ProductResponse) => {
    setSelectedProduct(product);
    setProductSearch(product.productName);
    setShowProductDropdown(false);
    setForm((prev) => ({
      ...prev,
      productId: Number(product.id),
    }));
  }, []);

  const handleClearProduct = useCallback(() => {
    setSelectedProduct(null);
    setProductSearch('');
    setForm((prev) => ({
      ...prev,
      productId: 0,
    }));
  }, []);

  // Guarantor search handler
  const handleGuarantorSearch = useCallback(async (query: string, idx: number) => {
    setGuarantorSearchTexts(prev => {
      const next = [...prev];
      next[idx] = query;
      return next;
    });
    setShowGuarantorDropdown(idx);
    if (query.trim().length < 2) {
      setGuarantorSearchResults([]);
      return;
    }
    setGuarantorSearchLoading(true);
    try {
      const results = await searchParties(query);
      setGuarantorSearchResults(results);
    } catch {
      setGuarantorSearchResults([]);
    } finally {
      setGuarantorSearchLoading(false);
    }
  }, []);

  const handleSelectGuarantorParty = useCallback((party: PartySearchResult, idx: number) => {
    setGuarantors(prev => prev.map((item, i) => i === idx ? {
      ...item,
      partyId: party.id,
      name: party.name,
      so: party.so || '',
      phone: party.phone || '',
      cnic: party.cnic || '',
      address: party.address || '',
      picturePreview: party.picture ? `${MEDIA_BASE_URL}${party.picture}` : '',
    } : item));
    setGuarantorSearchTexts(prev => {
      const next = [...prev];
      next[idx] = party.name;
      return next;
    });
    setShowGuarantorDropdown(null);
  }, []);

  const handleClearGuarantor = useCallback((idx: number) => {
    setGuarantors(prev => prev.map((item, i) => i === idx ? { ...emptyGuarantor } : item));
    setGuarantorSearchTexts(prev => {
      const next = [...prev];
      next[idx] = '';
      return next;
    });
  }, []);

  const handleCreateProduct = async () => {
    if (!newProduct.productName.trim()) return;
    setNewProductSaving(true);
    try {
      const images: File[] = newProductImage ? [newProductImage] : [];
      const created = await createProduct({
        store: '',
        warehouse: '',
        productName: newProduct.productName,
        slug: newProduct.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: newProduct.sku || ('PT' + Math.random().toString(36).substring(2, 8).toUpperCase()),
        sellingType: 'pos',
        category: newProduct.category,
        subCategory: '',
        brand: newProduct.brand,
        unit: '',
        barcodeSymbology: '',
        itemBarcode: '',
        description: newProduct.description,
        productType: 'single',
        quantity: Number(newProduct.quantity) || 0,
        price: Number(newProduct.price) || 0,
        taxType: '',
        tax: '',
        discountType: '',
        discountValue: 0,
        quantityAlert: 0,
        warranty: '',
        manufacturer: '',
        manufacturedDate: '',
        expiryDate: '',
        images,
      });
      setProducts(prev => [created, ...prev]);
      handleSelectProduct(created);
      setShowNewProductModal(false);
      setNewProduct({ productName: '', sku: '', category: '', brand: '', price: '', quantity: '', description: '' });
      setNewProductImage(null);
      setNewProductImagePreview('');
    } catch {
      setError(t('create_installment.failed_create_product'));
    } finally {
      setNewProductSaving(false);
    }
  };

  const isValid = form.customerId > 0 && form.productId > 0 && baseAmount > 0 && form.downPayment >= 0 && form.downPayment < baseAmount && form.tenure > 0 && form.startDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');

    try {
      const result = await createInstallment(form);
      // Upload guarantors
      for (const g of guarantors) {
        if (!g.name.trim()) continue;
        const fd = new FormData();
        fd.append('name', g.name);
        fd.append('so', g.so);
        fd.append('phone', g.phone);
        fd.append('cnic', g.cnic);
        fd.append('address', g.address);
        fd.append('relationship', g.relationship);
        if (g.partyId) fd.append('partyId', String(g.partyId));
        if (g.pictureFile) fd.append('picture', g.pictureFile);
        await addGuarantor(result.id, fd);
      }
      navigate('/installment-plans');
    } catch (err: unknown) {
      if (
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: unknown } }).response?.data === 'object'
      ) {
        const data = (err as { response: { data: Record<string, unknown> } }).response.data;
        const msg = typeof data.message === 'string' ? data.message
          : Array.isArray(data.errors) ? (data.errors as string[]).join(', ')
          : typeof data.error === 'string' ? data.error
          : null;
        if (msg) { setError(msg); } else { setError(t('create_installment.failed_create_plan')); }
      } else {
        setError(t('create_installment.failed_create_plan'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">{t('create_installment.title')}</h4>
            <h6>{t('create_installment.subtitle')}</h6>
          </div>
        </div>
        <div className="page-btn">
          <a href="#" className="btn btn-secondary" onClick={(e) => { e.preventDefault(); navigate('/installment-plans'); }}>
            <i className="ti ti-arrow-left me-1"></i>{t('create_installment.back_to_plans')}
          </a>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Form Sections */}
          <div className="col-12">
            {/* Customer Information */}
            <div className="card">
              <div 
                className="card-header d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => toggleSection('customer')}
                style={{ cursor: 'pointer' }}
              >
                <h5 className="card-title mb-0">
                  <i className="ti ti-user me-2"></i>
                  {t('create_installment.customer_info')}
                  <i className={`ti ${collapsedSections.customer ? 'ti-chevron-down' : 'ti-chevron-up'} ms-2`}></i>
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-primary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewCustomerModal(true);
                  }}
                >
                  <i className="ti ti-plus me-1"></i>{t('create_installment.new_customer')}
                </button>
              </div>
              <div className={`collapse ${!collapsedSections.customer ? 'show' : ''}`}>
                <div className="card-body">
                  <div className="row">
                  <div className="col-12 mb-3">
                    <label className="form-label">{t('create_installment.search_customer')}<span className="text-danger ms-1">*</span></label>
                    <div ref={customerSearchRef} style={{ position: 'relative' }}>
                      <div className="input-group">
                        <span className="input-group-text"><i className="ti ti-search"></i></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={t('create_installment.customer_search_placeholder')}
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                            if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                              setSelectedCustomer(null);
                              setForm((prev) => ({ ...prev, customerId: 0 }));
                            }
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                        />
                        {selectedCustomer && (
                          <button type="button" className="btn btn-outline-secondary" onClick={handleClearCustomer}>
                            <i className="ti ti-x"></i>
                          </button>
                        )}
                      </div>
                      {showCustomerDropdown && (
                        <div className="border rounded shadow-sm bg-white" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050, maxHeight: 300, overflowY: 'auto' }}>
                          {customersLoading ? (
                            <div className="text-center p-3"><span className="spinner-border spinner-border-sm text-primary"></span> {t('create_installment.loading_customers')}</div>
                          ) : filteredCustomers.length === 0 ? (
                            <div className="text-center p-3 text-muted">{t('create_installment.no_customers')}</div>
                          ) : (
                            filteredCustomers.map((customer) => (
                              <div
                                key={customer.id}
                                className={`d-flex align-items-center p-2 border-bottom ${selectedCustomer?.id === customer.id ? 'bg-primary-transparent' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelectCustomer(customer)}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = selectedCustomer?.id === customer.id ? '' : '#f8f9fa')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedCustomer?.id === customer.id ? '' : '')}
                              >
                                {customer.picture ? (
                                  <img src={`${MEDIA_BASE_URL}${customer.picture}`} alt={customer.name} className="rounded-circle border me-2" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                                ) : (
                                  <span className="avatar avatar-md me-2 bg-primary-transparent text-primary d-flex align-items-center justify-content-center rounded-circle fw-bold">
                                    {customer.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                <div className="flex-grow-1">
                                  <h6 className="mb-0 fs-13 fw-medium">{customer.name}</h6>
                                  <small className="text-muted">{customer.phone} &bull; {customer.email || '-'}</small>
                                </div>
                                <div className="text-end">
                                  <small className="text-muted">{customer.city || '-'}</small>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected customer preview */}
                  {selectedCustomer && (
                    <div className="col-12 mb-3">
                      <div className="alert alert-success d-flex align-items-center mb-0" role="alert">
                        {selectedCustomer.picture ? (
                          <img src={`${MEDIA_BASE_URL}${selectedCustomer.picture}`} alt={selectedCustomer.name} className="rounded-circle border me-3" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                        ) : (
                          <span className="avatar avatar-lg me-3 bg-success-transparent text-success d-flex align-items-center justify-content-center rounded-circle fw-bold fs-20">
                            {selectedCustomer.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-bold">{selectedCustomer.name}</h6>
                          <div className="d-flex gap-3 flex-wrap">
                            {selectedCustomer.so && <small><strong>{t('create_installment.so_label')}</strong> {selectedCustomer.so}</small>}
                            {selectedCustomer.cnic && <small><strong>{t('create_installment.cnic_label')}</strong> {selectedCustomer.cnic}</small>}
                            <small><strong>{t('create_installment.phone_label')}</strong> {selectedCustomer.phone}</small>
                            <small><strong>{t('create_installment.email_label')}</strong> {selectedCustomer.email || '-'}</small>
                            <small><strong>{t('create_installment.city_label')}</strong> {selectedCustomer.city || '-'}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.customer_name')}<span className="text-danger ms-1">*</span></label>
                    <input type="text" className="form-control" value={selectedCustomer?.name ?? ''} readOnly placeholder={t('create_installment.select_customer_hint')} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.phone_number')}<span className="text-danger ms-1">*</span></label>
                    <input type="text" className="form-control" value={selectedCustomer?.phone ?? ''} readOnly placeholder={t('create_installment.auto_filled')} />
                  </div>
                  <div className="col-12 mb-0">
                    <label className="form-label">{t('common.address')}</label>
                    <textarea className="form-control" rows={2} value={selectedCustomer?.address ?? ''} readOnly placeholder={t('create_installment.auto_filled')} />
                  </div>
                  </div>
                  <div className="d-flex justify-content-end mt-3">
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      {t('common.next')} <i className="ti ti-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantors */}
            <div className="card">
              <div 
                className="card-header d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => toggleSection('guarantor')}
                style={{ cursor: 'pointer' }}
              >
                <h5 className="card-title mb-0">
                  <i className="ti ti-shield-check me-2"></i>
                  {t('create_installment.guarantors')}
                  <i className={`ti ${collapsedSections.guarantor ? 'ti-chevron-down' : 'ti-chevron-up'} ms-2`}></i>
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-primary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setGuarantors(prev => [...prev, { ...emptyGuarantor }]);
                    setGuarantorSearchTexts(prev => [...prev, '']);
                    setActiveGuarantorTab(guarantors.length);
                  }}
                >
                  <i className="ti ti-plus me-1"></i>{t('create_installment.add_guarantor')}
                </button>
              </div>
              <div className={`collapse ${!collapsedSections.guarantor ? 'show' : ''}`}>
                <div className="card-body">
                  {guarantors.length === 0 && (
                    <p className="text-muted text-center mb-0">{t('create_installment.no_guarantors')}</p>
                  )}
                  {guarantors.length > 0 && (
                    <>
                      <ul className="nav nav-tabs mb-3">
                        {guarantors.map((_, idx) => (
                          <li className="nav-item" key={idx}>
                            <button
                              type="button"
                              className={`nav-link ${activeGuarantorTab === idx ? 'active' : ''}`}
                              onClick={() => setActiveGuarantorTab(idx)}
                            >
                              Guarantor {idx + 1}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {guarantors.map((g, idx) => (
                        <div key={idx} className={activeGuarantorTab === idx ? '' : 'd-none'}>
                          <div className="d-flex justify-content-end mb-3">
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => {
                              setGuarantors(prev => prev.filter((_, i) => i !== idx));
                              setGuarantorSearchTexts(prev => prev.filter((_, i) => i !== idx));
                              setActiveGuarantorTab(prev => prev >= guarantors.length - 1 ? Math.max(0, guarantors.length - 2) : prev);
                            }}>
                              <i className="ti ti-trash me-1"></i>{t('common.remove')}
                            </button>
                          </div>

                          {/* Search Existing Person */}
                          <div className="mb-3" ref={showGuarantorDropdown === idx ? guarantorSearchRef : undefined}>
                            <label className="form-label">{t('create_installment.search_person')}</label>
                            <div style={{ position: 'relative' }}>
                              <div className="input-group">
                                <span className="input-group-text"><i className="ti ti-search"></i></span>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder={t('create_installment.person_search_placeholder')}
                                  value={guarantorSearchTexts[idx] || ''}
                                  onChange={(e) => handleGuarantorSearch(e.target.value, idx)}
                                  onFocus={() => {
                                    if ((guarantorSearchTexts[idx] || '').trim().length >= 2) {
                                      setShowGuarantorDropdown(idx);
                                    }
                                  }}
                                />
                                {g.partyId && (
                                  <button type="button" className="btn btn-outline-secondary" onClick={() => handleClearGuarantor(idx)}>
                                    <i className="ti ti-x"></i>
                                  </button>
                                )}
                              </div>
                              {showGuarantorDropdown === idx && (guarantorSearchTexts[idx] || '').trim().length >= 2 && (
                                <div className="border rounded shadow-sm bg-white" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050, maxHeight: 250, overflowY: 'auto' }}>
                                  {guarantorSearchLoading ? (
                                    <div className="text-center p-3"><span className="spinner-border spinner-border-sm text-primary"></span> {t('common.searching')}</div>
                                  ) : guarantorSearchResults.length === 0 ? (
                                    <div className="text-center p-3 text-muted">{t('create_installment.no_results_fill')}</div>
                                  ) : (
                                    guarantorSearchResults.map((party) => (
                                      <div
                                        key={party.id}
                                        className="d-flex align-items-center p-2 border-bottom"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSelectGuarantorParty(party, idx)}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                                      >
                                        {party.picture ? (
                                          <img src={`${MEDIA_BASE_URL}${party.picture}`} alt={party.name} className="rounded-circle border me-2" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                                        ) : (
                                          <span className="avatar avatar-md me-2 bg-warning-transparent text-warning d-flex align-items-center justify-content-center rounded-circle fw-bold">
                                            {party.name.charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                        <div className="flex-grow-1">
                                          <h6 className="mb-0 fs-13 fw-medium">{party.name}</h6>
                                          <small className="text-muted">{party.phone || '-'} &bull; {party.cnic || '-'}</small>
                                        </div>
                                        <div className="text-end">
                                          <span className="badge bg-secondary-transparent">{party.role}</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                            <small className="text-muted">{t('create_installment.select_existing')}</small>
                          </div>

                          {/* Selected guarantor preview */}
                          {g.partyId && (
                            <div className="alert alert-info d-flex align-items-center mb-3" role="alert">
                              {g.picturePreview ? (
                                <img src={g.picturePreview} alt={g.name} className="rounded-circle border me-3" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                              ) : (
                                <span className="avatar avatar-lg me-3 bg-info-transparent text-info d-flex align-items-center justify-content-center rounded-circle fw-bold fs-20">
                                  {g.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-bold">{g.name}</h6>
                                <div className="d-flex gap-3 flex-wrap">
                                  {g.so && <small><strong>{t('create_installment.so_label')}</strong> {g.so}</small>}
                                  {g.cnic && <small><strong>{t('create_installment.cnic_label')}</strong> {g.cnic}</small>}
                                  {g.phone && <small><strong>{t('create_installment.phone_label')}</strong> {g.phone}</small>}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <label className="form-label">{t('common.full_name')}<span className="text-danger ms-1">*</span></label>
                              <input type="text" className="form-control" placeholder={t('create_installment.guarantor_name')} value={g.name}
                                onChange={e => setGuarantors(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} />
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label">{t('customers.so_father')}</label>
                              <input type="text" className="form-control" placeholder={t('customers.so_placeholder')} value={g.so}
                                onChange={e => setGuarantors(prev => prev.map((item, i) => i === idx ? { ...item, so: e.target.value } : item))} />
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label">{t('common.phone')}</label>
                              <input type="text" className="form-control" placeholder={t('customers.phone_placeholder')} value={g.phone}
                                onChange={e => setGuarantors(prev => prev.map((item, i) => i === idx ? { ...item, phone: e.target.value } : item))} />
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label">{t('create_installment.cnic_id')}</label>
                              <input type="text" className="form-control" placeholder={t('create_installment.cnic_placeholder')} value={g.cnic}
                                onChange={e => setGuarantors(prev => prev.map((item, i) => i === idx ? { ...item, cnic: e.target.value } : item))} />
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label">{t('create_installment.relationship')}</label>
                              <select className="form-select" value={g.relationship}
                                onChange={e => setGuarantors(prev => prev.map((item, i) => i === idx ? { ...item, relationship: e.target.value } : item))}>
                                <option value="">{t('create_installment.select_relationship')}</option>
                                <option value="Father">{t('create_installment.father')}</option>
                                <option value="Brother">{t('create_installment.brother')}</option>
                                <option value="Uncle">{t('create_installment.uncle')}</option>
                                <option value="Friend">{t('create_installment.friend')}</option>
                                <option value="Colleague">{t('create_installment.colleague')}</option>
                                <option value="Employer">{t('create_installment.employer')}</option>
                                <option value="Neighbor">{t('create_installment.neighbor')}</option>
                                <option value="Other">{t('create_installment.other')}</option>
                              </select>
                            </div>
                            <div className="col-12 mb-3">
                              <label className="form-label">{t('common.address')}</label>
                              <textarea className="form-control" rows={2} placeholder={t('customers.address_placeholder')} value={g.address}
                                onChange={e => setGuarantors(prev => prev.map((item, i) => i === idx ? { ...item, address: e.target.value } : item))} />
                            </div>
                            <div className="col-12 mb-0">
                              <label className="form-label">{t('create_installment.photo_id')}</label>
                              <div className="d-flex align-items-center gap-3">
                                <input type="file" className="form-control" accept="image/*"
                                  onChange={e => {
                                    const file = e.target.files?.[0] || null;
                                    setGuarantors(prev => prev.map((item, i) => i === idx ? {
                                      ...item,
                                      pictureFile: file,
                                      picturePreview: file ? URL.createObjectURL(file) : ''
                                    } : item));
                                  }} />
                                {g.picturePreview && (
                                  <img src={g.picturePreview} alt="Preview" className="rounded border" style={{ width: 60, height: 60, objectFit: 'cover' }} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="d-flex justify-content-between mt-3">
                    <button type="button" className="btn btn-secondary" onClick={goBack}>
                      <i className="ti ti-arrow-left me-1"></i> {t('common.back')}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      {t('common.next')} <i className="ti ti-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="card">
              <div 
                className="card-header d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => toggleSection('product')}
                style={{ cursor: 'pointer' }}
              >
                <h5 className="card-title mb-0">
                  <i className="ti ti-box me-2"></i>
                  {t('create_installment.product_info')}
                  <i className={`ti ${collapsedSections.product ? 'ti-chevron-down' : 'ti-chevron-up'} ms-2`}></i>
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-primary" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewProductModal(true);
                  }}
                >
                  <i className="ti ti-plus me-1"></i>{t('create_installment.new_product')}
                </button>
              </div>
              <div className={`collapse ${!collapsedSections.product ? 'show' : ''}`}>
                <div className="card-body">
                  <div className="row">
                  <div className="col-12 mb-3">
                    <label className="form-label">{t('create_installment.search_product')}<span className="text-danger ms-1">*</span></label>
                    <div ref={productSearchRef} style={{ position: 'relative' }}>
                      <div className="input-group">
                        <span className="input-group-text"><i className="ti ti-search"></i></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={t('create_installment.product_search_placeholder')}
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setShowProductDropdown(true);
                            if (selectedProduct && e.target.value !== selectedProduct.productName) {
                              setSelectedProduct(null);
                              setForm((prev) => ({ ...prev, productId: 0 }));
                            }
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                        />
                        {selectedProduct && (
                          <button type="button" className="btn btn-outline-secondary" onClick={handleClearProduct}>
                            <i className="ti ti-x"></i>
                          </button>
                        )}
                      </div>
                      {showProductDropdown && (
                        <div className="border rounded shadow-sm bg-white" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050, maxHeight: 300, overflowY: 'auto' }}>
                          {productsLoading ? (
                            <div className="text-center p-3"><span className="spinner-border spinner-border-sm text-primary"></span> {t('create_installment.loading_products')}</div>
                          ) : filteredProducts.length === 0 ? (
                            <div className="text-center p-3 text-muted">{t('create_installment.no_products')}</div>
                          ) : (
                            filteredProducts.map((product) => (
                              <div
                                key={product.id}
                                className={`d-flex align-items-center p-2 border-bottom cursor-pointer ${selectedProduct?.id === product.id ? 'bg-primary-transparent' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelectProduct(product)}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = selectedProduct?.id === product.id ? '' : '#f8f9fa')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedProduct?.id === product.id ? '' : '')}
                              >
                                <div className="avatar avatar-md me-2">
                                  <img src={mediaUrl(product.images?.[0])} alt={product.productName} />
                                </div>
                                <div className="flex-grow-1">
                                  <h6 className="mb-0 fs-13 fw-medium">{product.productName}</h6>
                                  <small className="text-muted">{product.sku || '-'} &bull; {product.category || '-'} &bull; {product.brand || '-'}</small>
                                </div>
                                <div className="text-end">
                                  <span className="fw-bold text-primary">Rs {fmt(product.price)}</span>
                                  {product.quantity !== undefined && <br />}
                                  {product.quantity !== undefined && <small className="text-muted">{t('create_installment.qty_label')} {product.quantity}</small>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected product preview */}
                  {selectedProduct && (
                    <div className="col-12 mb-3">
                      <div className="alert alert-primary d-flex align-items-center mb-0" role="alert">
                        <div className="avatar avatar-lg me-3">
                          <img src={mediaUrl(selectedProduct.images?.[0])} alt={selectedProduct.productName} />
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-bold">{selectedProduct.productName}</h6>
                          <div className="d-flex gap-3 flex-wrap">
                            <small><strong>{t('create_installment.sku_label')}</strong> {selectedProduct.sku || '-'}</small>
                            <small><strong>{t('create_installment.category_label')}</strong> {selectedProduct.category || '-'}</small>
                            <small><strong>{t('create_installment.brand_label')}</strong> {selectedProduct.brand || '-'}</small>
                            <small><strong>{t('create_installment.price_label')}</strong> Rs {fmt(selectedProduct.price)}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.product_name')}<span className="text-danger ms-1">*</span></label>
                    <input type="text" className="form-control" value={selectedProduct?.productName ?? ''} readOnly placeholder={t('create_installment.select_from_search')} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.product_price')}<span className="text-danger ms-1">*</span></label>
                    <input type="number" className="form-control" value={productPrice || ''} readOnly placeholder={t('create_installment.auto_filled_product')} />
                  </div>
                  {isVisible('financeAmount') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.finance_amount')}</label>
                    <input type="number" className="form-control" min={0} step="0.01" value={form.financeAmount ?? ''} onChange={(e) => set('financeAmount', parseFloat(e.target.value) || 0)} placeholder={t('create_installment.leave_blank_price')} />
                    <small className="text-muted">{t('create_installment.custom_finance')}</small>
                  </div>
                  )}
                  </div>
                  <div className="d-flex justify-content-between mt-3">
                    <button type="button" className="btn btn-secondary" onClick={goBack}>
                      <i className="ti ti-arrow-left me-1"></i> {t('common.back')}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      {t('common.next')} <i className="ti ti-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Installment Settings */}
            <div className="card">
              <div 
                className="card-header cursor-pointer"
                onClick={() => toggleSection('financial')}
                style={{ cursor: 'pointer' }}
              >
                <h5 className="card-title mb-0">
                  <i className="ti ti-settings me-2"></i>
                  Financial Details & Settings
                  <i className={`ti ${collapsedSections.financial ? 'ti-chevron-down' : 'ti-chevron-up'} ms-2`}></i>
                </h5>
              </div>
              <div className={`collapse ${!collapsedSections.financial ? 'show' : ''}`}>
                <div className="card-body">
                  <div className="row">
                  {isVisible('downPayment') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.down_payment')}<span className="text-danger ms-1">*</span></label>
                    <input type="number" className="form-control" min={0} step="0.01" value={form.downPayment || ''} onChange={(e) => set('downPayment', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                    {productPrice > 0 && <small className="text-muted">{t('create_installment.down_payment_pct', { pct: ((form.downPayment / baseAmount) * 100).toFixed(1), type: form.financeAmount && form.financeAmount > 0 ? t('create_installment.finance_type') : t('create_installment.product_type') })}</small>}
                  </div>
                  )}
                  {isVisible('interestRate') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.interest_rate')}</label>
                    <input type="number" className="form-control" min={0} max={100} step="0.1" value={form.interestRate || ''} onChange={(e) => set('interestRate', parseFloat(e.target.value) || 0)} placeholder="0" />
                    <small className="text-muted">{t('create_installment.interest_free')}</small>
                  </div>
                  )}
                  {isVisible('tenure') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.tenure_months')}<span className="text-danger ms-1">*</span></label>
                    <select className="form-select" value={form.tenure} onChange={(e) => set('tenure', parseInt(e.target.value))}>
                      {[2,3,4,5, 6,7,8, 9,10,11, 12, 15, 18, 24, 30, 36, 48, 60].map((m) => (
                        <option key={m} value={m}>{t('create_installment.months_suffix', { m })}</option>
                      ))}
                    </select>
                  </div>
                  )}
                  {isVisible('startDate') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.start_date')}<span className="text-danger ms-1">*</span></label>
                    <input type="date" className="form-control" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
                  </div>
                  )}
                  </div>
                  <div className="d-flex justify-content-between mt-3">
                    <button type="button" className="btn btn-secondary" onClick={goBack}>
                      <i className="ti ti-arrow-left me-1"></i> {t('common.back')}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      {t('common.next')} <i className="ti ti-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Summary & Schedule */}
            <div className="card border-primary">
              <div 
                className="card-header bg-primary text-white cursor-pointer"
                onClick={() => toggleSection('plan')}
                style={{ cursor: 'pointer' }}
              >
                <h5 className="card-title mb-0 text-white">
                  <i className="ti ti-calculator me-2"></i>
                  {t('create_installment.plan_summary_schedule')}
                  <i className={`ti ${collapsedSections.plan ? 'ti-chevron-down' : 'ti-chevron-up'} ms-2 text-white`}></i>
                  {previewLoading && <span className="spinner-border spinner-border-sm ms-2"></span>}
                </h5>
              </div>
              <div className={`collapse ${!collapsedSections.plan ? 'show' : ''}`}>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-5 mb-3 mb-lg-0">
                      <table className="table table-borderless mb-0">
                        <tbody>
                          <tr><td className="text-muted">{t('create_installment.product_price_label')}</td><td className="text-end fw-medium">Rs {fmt(productPrice)}</td></tr>
                          {form.financeAmount && form.financeAmount > 0 && form.financeAmount !== productPrice && (
                            <tr><td className="text-muted">{t('create_installment.finance_amount_label')}</td><td className="text-end fw-medium text-info">Rs {fmt(form.financeAmount)}</td></tr>
                          )}
                          <tr><td className="text-muted">{t('create_installment.down_payment_label')}</td><td className="text-end fw-medium text-success">- Rs {fmt(form.downPayment)}</td></tr>
                          <tr className="border-top"><td className="text-muted">{t('create_installment.financed_amount')}</td><td className="text-end fw-bold">Rs {fmt(financedAmount)}</td></tr>
                          <tr><td className="text-muted">{t('create_installment.interest_rate_label')}</td><td className="text-end">{form.interestRate}% {t('create_installment.pa_suffix')}</td></tr>
                          <tr><td className="text-muted">{t('create_installment.tenure_label')}</td><td className="text-end">{form.tenure} {t('create_installment.months_word')}</td></tr>
                          <tr className="border-top"><td className="text-muted">{t('create_installment.monthly_emi')}</td><td className="text-end fw-bold fs-16 text-primary">Rs {fmt(Math.round(emi * 100) / 100)}</td></tr>
                          <tr><td className="text-muted">{t('create_installment.total_interest')}</td><td className="text-end text-danger">Rs {fmt(Math.round(totalInterest * 100) / 100)}</td></tr>
                          <tr className="border-top"><td className="fw-bold">{t('create_installment.total_payable')}</td><td className="text-end fw-bold fs-16">Rs {fmt(Math.round(totalPayable * 100) / 100)}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Repayment Schedule Preview */}
                    {schedule.length > 0 && (
                      <div className="col-lg-7">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <h6 className="mb-0"><i className="ti ti-calendar me-2"></i>{t('create_installment.repayment_schedule')}</h6>
                          <span className="badge bg-primary">{schedule.length} {t('create_installment.installments_count')}</span>
                        </div>
                        <div className="table-responsive" style={{ maxHeight: 400, overflowY: 'auto' }}>
                          <table className="table table-sm mb-0">
                            <thead className="thead-light">
                              <tr>
                                <th>#</th>
                                <th>{t('create_installment.due_date')}</th>
                                <th>{t('create_installment.emi_amount')}</th>
                                <th>{t('create_installment.balance_label')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schedule.map((entry) => (
                                <tr key={entry.installmentNo}>
                                  <td>{entry.installmentNo}</td>
                                  <td>{entry.dueDate}</td>
                                  <td className="fw-medium">{fmt(entry.emiAmount)}</td>
                                  <td>{fmt(entry.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-top">
                              <tr className="fw-bold">
                                <td colSpan={2}>{t('common.total')}</td>
                                <td>{fmt(schedule.reduce((s, e) => s + e.emiAmount, 0))}</td>
                                <td>-</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="d-flex justify-content-between mt-3">
                    <button type="button" className="btn btn-secondary" onClick={goBack}>
                      <i className="ti ti-arrow-left me-1"></i> {t('common.back')}
                    </button>
                    {/* <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
                      {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('create_installment.creating')}</> : <><i className="ti ti-check me-1"></i>{t('create_installment.create_plan_btn')}</>}
                    </button> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="card">
          <div className="card-body d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/installment-plans')}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('create_installment.creating')}</> : <><i className="ti ti-check me-1"></i>{t('create_installment.create_plan_btn')}</>}
            </button>
          </div>
        </div>
      </form>

      {/* New Product Modal */}
      {showNewProductModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ti ti-box me-2"></i>{t('create_installment.add_new_product')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowNewProductModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.product_name')}<span className="text-danger ms-1">*</span></label>
                    <input type="text" className="form-control" placeholder={t('create_installment.customer_name_placeholder')} value={newProduct.productName}
                      onChange={e => setNewProduct(prev => ({ ...prev, productName: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.price_label')} (Rs)<span className="text-danger ms-1">*</span></label>
                    <input type="number" className="form-control" placeholder="0.00" min={0} step="0.01" value={newProduct.price}
                      onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.sku_placeholder')}</label>
                    <input type="text" className="form-control" placeholder={t('create_installment.auto_gen_sku')} value={newProduct.sku}
                      onChange={e => setNewProduct(prev => ({ ...prev, sku: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.quantity_label')}</label>
                    <input type="number" className="form-control" placeholder="0" min={0} value={newProduct.quantity}
                      onChange={e => setNewProduct(prev => ({ ...prev, quantity: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.category_label')}</label>
                    <input type="text" className="form-control" placeholder={t('create_installment.category_placeholder')} value={newProduct.category}
                      onChange={e => setNewProduct(prev => ({ ...prev, category: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.brand_label')}</label>
                    <input type="text" className="form-control" placeholder={t('create_installment.brand_placeholder')} value={newProduct.brand}
                      onChange={e => setNewProduct(prev => ({ ...prev, brand: e.target.value }))} />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">{t('common.description')}</label>
                    <textarea className="form-control" rows={2} placeholder={t('create_installment.product_description')} value={newProduct.description}
                      onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div className="col-12 mb-0">
                    <label className="form-label">{t('create_installment.product_image')}</label>
                    <div className="d-flex align-items-center gap-3">
                      <input type="file" className="form-control" accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setNewProductImage(file);
                          setNewProductImagePreview(file ? URL.createObjectURL(file) : '');
                        }} />
                      {newProductImagePreview && (
                        <img src={newProductImagePreview} alt="Preview" className="rounded border" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewProductModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" disabled={!newProduct.productName.trim() || !newProduct.price || newProductSaving} onClick={handleCreateProduct}>
                  {newProductSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('create_installment.saving')}</> : <><i className="ti ti-check me-1"></i>{t('create_installment.add_product')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="ti ti-user-plus me-2"></i>{t('create_installment.add_new_customer')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowNewCustomerModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.full_name_modal')}<span className="text-danger ms-1">*</span></label>
                    <input type="text" className="form-control" placeholder={t('create_installment.customer_name_placeholder')} value={newCustomer.name}
                      onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.so_modal')}</label>
                    <input type="text" className="form-control" placeholder={t('create_installment.so_placeholder')} value={newCustomer.so}
                      onChange={e => setNewCustomer(prev => ({ ...prev, so: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.cnic_modal')}</label>
                    <input type="text" className="form-control" placeholder={t('create_installment.cnic_placeholder_modal')} value={newCustomer.cnic}
                      onChange={e => setNewCustomer(prev => ({ ...prev, cnic: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.phone_modal')}<span className="text-danger ms-1">*</span></label>
                    <input type="text" className="form-control" placeholder={t('create_installment.phone_placeholder')} value={newCustomer.phone}
                      onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.email_modal')}</label>
                    <input type="email" className="form-control" placeholder={t('create_installment.email_placeholder')} value={newCustomer.email}
                      onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">{t('create_installment.city_modal')}</label>
                    <input type="text" className="form-control" placeholder={t('create_installment.city_modal')} value={newCustomer.city}
                      onChange={e => setNewCustomer(prev => ({ ...prev, city: e.target.value }))} />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">{t('create_installment.address_modal')}</label>
                    <textarea className="form-control" rows={2} placeholder={t('create_installment.address_placeholder')} value={newCustomer.address}
                      onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))} />
                  </div>
                  <div className="col-12 mb-0">
                    <label className="form-label">{t('create_installment.photo_label')}</label>
                    <div className="d-flex align-items-center gap-3">
                      <input type="file" className="form-control" accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setNewCustomerPicture(file);
                          setNewCustomerPicturePreview(file ? URL.createObjectURL(file) : '');
                        }} />
                      {newCustomerPicturePreview && (
                        <img src={newCustomerPicturePreview} alt="Preview" className="rounded-circle border" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewCustomerModal(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" disabled={!newCustomer.name.trim() || !newCustomer.phone.trim() || newCustomerSaving} onClick={handleCreateCustomer}>
                  {newCustomerSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('create_installment.saving')}</> : <><i className="ti ti-check me-1"></i>{t('create_installment.add_customer_btn')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateInstallment;
