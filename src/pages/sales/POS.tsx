import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { mediaUrl } from '../../services/api';
import { getCustomers, Customer } from '../../services/customerService';
import { recordSaleIncome } from '../../services/financeService';
import Swal from 'sweetalert2';

/* ───── types ───── */
interface ProductItem {
  id: string;
  productName: string;
  category: string;
  price: number;
  quantity: number;
  images: string[];
}

interface CategoryItem {
  id: number;
  name: string;
}

interface CartLine {
  product: ProductItem;
  qty: number;
}

/* ───── helpers ───── */
const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const localTodayYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Normalize API id (string | number) for Maps / data attributes */
const productDomId = (id: string | number) => String(id);

const productInStock = (p: ProductItem) => Number(p.quantity) > 0;

const POS: React.FC = () => {
  /* state */
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  /** Cash/Card = immediate net sale; Credit = pending for today (selecting Credit requires a registered customer) */
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Credit'>('Cash');
  const [submitting, setSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const productCardRefById = useRef<Map<string, HTMLDivElement>>(new Map());
  const posProductsRootRef = useRef<HTMLDivElement>(null);
  const filteredRef = useRef<ProductItem[]>([]);
  const qtyDecRefById = useRef<Map<string, HTMLButtonElement>>(new Map());
  const paymentCashRef = useRef<HTMLButtonElement>(null);
  const paymentCardRef = useRef<HTMLButtonElement>(null);
  const paymentCreditRef = useRef<HTMLButtonElement>(null);
  const finalizeBtnRef = useRef<HTMLButtonElement>(null);
  const customerSelectRef = useRef<HTMLSelectElement>(null);

  const hasRegisteredCustomer = Boolean(selectedCustomer);

  const focusQtyDec = useCallback((productId: string) => {
    window.setTimeout(() => {
      qtyDecRefById.current.get(productDomId(productId))?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!hasRegisteredCustomer) {
      setPaymentMethod((pm) => (pm === 'Credit' ? 'Cash' : pm));
    }
  }, [hasRegisteredCustomer]);

  /* Keep app Header + floating widgets out of Tab order so Tab flows Search → products → cart → pay */
  useEffect(() => {
    if (loading) return;

    const collect = (): HTMLElement[] => {
      const set = new Set<HTMLElement>();
      document.querySelectorAll<HTMLElement>('.header a[href], .header button, .header input, .header select, .header textarea').forEach((el) => set.add(el));
      const main = document.querySelector('.main-wrapper');
      if (main) {
        main.querySelectorAll<HTMLElement>(':scope > button').forEach((el) => set.add(el));
      }
      return [...set];
    };

    const els = collect();
    const backup = new Map<HTMLElement, string | null>();
    els.forEach((el) => {
      backup.set(el, el.getAttribute('tabindex'));
      el.tabIndex = -1;
    });

    const focusSearch = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusSearch);
      backup.forEach((prev, el) => {
        if (!el.isConnected) return;
        if (prev === null) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', prev);
      });
    };
  }, [loading]);

  /* clock */
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const userName = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').name || 'User';
    } catch {
      return 'User';
    }
  }, []);

  /* fetch */
  useEffect(() => {
    (async () => {
      try {
        const [prodRes, catRes, custList] = await Promise.all([
          api.get<ProductItem[]>('/products'),
          api.get<CategoryItem[]>('/categories'),
          getCustomers(),
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
        setCustomers(custList);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* filtered products */
  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory)
      list = list.filter((p) => p.category === activeCategory);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) => p.productName.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, searchTerm]);

  filteredRef.current = filtered;

  const focusFirstFilteredProduct = useCallback(() => {
    const list = filteredRef.current;
    const root = posProductsRootRef.current;
    if (!root || list.length === 0) return;

    const target = list.find(productInStock) ?? list[0];
    const key = productDomId(target.id);

    let el: HTMLElement | null = productCardRefById.current.get(key) ?? null;
    if (!el || !root.contains(el)) {
      const esc =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(key)
          : key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      el = root.querySelector<HTMLElement>(`[data-pos-product-id="${esc}"]`);
    }
    if (!el) {
      el = root.querySelector<HTMLElement>('[data-pos-product-id]');
    }
    if (!el) return;

    el.focus({ preventScroll: false });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, []);

  /* cart helpers */
  const addToCart = useCallback((p: ProductItem, opts?: { focusQty?: boolean }) => {
    if (p.quantity <= 0) {
      Swal.fire({ icon: 'warning', title: 'Out of Stock', text: `${p.productName} is out of stock.`, timer: 2000, showConfirmButton: false });
      return;
    }
    let changed = false;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === p.id);
      if (idx >= 0) {
        if (prev[idx].qty >= p.quantity) {
          Swal.fire({ icon: 'warning', title: 'Stock Limit', text: `Only ${p.quantity} units available for ${p.productName}.`, timer: 2000, showConfirmButton: false });
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        changed = true;
        return next;
      }
      changed = true;
      return [...prev, { product: p, qty: 1 }];
    });
    if (opts?.focusQty !== false && changed) {
      focusQtyDec(p.id);
    }
  }, [focusQtyDec]);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product.id !== productId) return c;
        const next = c.qty + delta;
        if (next < 1) return c;
        if (next > c.product.quantity) {
          Swal.fire({ icon: 'warning', title: 'Stock Limit', text: `Only ${c.product.quantity} units available for ${c.product.productName}.`, timer: 2000, showConfirmButton: false });
          return c;
        }
        return { ...c, qty: next };
      }),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  /* totals */
  const subTotal = useMemo(
    () => cart.reduce((s, c) => s + c.product.price * c.qty, 0),
    [cart],
  );
  const taxRate = 0;
  const taxAmount = Math.round(subTotal * taxRate);
  const grandTotal = subTotal + taxAmount;

  /* ── submit sale ── */
  const handlePay = useCallback(async () => {
    if (cart.length === 0 || submitting) return;
    if (paymentMethod === 'Credit' && !selectedCustomer) {
      Swal.fire({
        icon: 'info',
        title: 'Credit not available',
        text: 'This option is not available for walk-in customers. First choose any registered customer to proceed with this option.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const customer = customers.find(c => String(c.id) === selectedCustomer);
      const isNet = paymentMethod !== 'Credit';
      const expectedDateForOrder = isNet ? null : localTodayYMD();
      const payload = {
        customerId: customer ? Number(customer.id) : null,
        customerName: customer ? customer.name : 'Walk in Customer',
        biller: userName,
        grandTotal: grandTotal,
        orderTax: taxAmount,
        discount: 0,
        shipping: 0,
        status: isNet ? 'Completed' : 'Pending',
        notes: '',
        source: 'pos',
        expectedDate: expectedDateForOrder,
        items: cart.map(line => ({
          productId: Number(line.product.id),
          productName: line.product.productName,
          quantity: line.qty,
          purchasePrice: line.product.price,
          discount: 0,
          taxPercent: 0,
          taxAmount: 0,
          unitCost: line.product.price,
          totalCost: line.product.price * line.qty,
        })),
      };
      const res = await api.post('/sales', payload);
      const saleId = (res.data as any).id;
      const saleRef = (res.data as any).reference;

      // Only auto-create payment for net (immediate) sales
      if (isNet) {
        const payType = paymentMethod as 'Cash' | 'Card';
        await api.post(`/sales/${saleId}/payments`, {
          reference: `PAY-${saleRef}`,
          receivedAmount: payload.grandTotal,
          payingAmount: payload.grandTotal,
          paymentType: payType,
          description: `POS ${payType} Payment`,
        });

        // Record in finance income so it appears in financial reports
        await recordSaleIncome({
          amount: payload.grandTotal,
          date: new Date().toISOString().slice(0, 10),
          reference: saleRef,
          description: `POS Sale - ${customer ? customer.name : 'Walk in Customer'}`,
          paymentType: payType,
        });
      }

      // Update local product stock after successful sale
      setProducts((prev) =>
        prev.map((p) => {
          const sold = cart.find((c) => c.product.id === p.id);
          return sold ? { ...p, quantity: Math.max(0, p.quantity - sold.qty) } : p;
        }),
      );
      setCart([]);
      setSelectedCustomer('');
      setPaymentMethod('Cash');
      Swal.fire({
        icon: 'success',
        title: isNet ? 'Sale Completed!' : 'Credit order placed!',
        text: `Reference: ${saleRef}`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || 'Failed to process sale' });
    } finally {
      setSubmitting(false);
    }
  }, [cart, submitting, customers, selectedCustomer, userName, paymentMethod, grandTotal, taxAmount]);

  /* ───── render ───── */
  if (loading)
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="page-wrapper pos-pg-wrapper ms-0">
      {/* Minimal POS header bar */}
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white">
        <div className="d-flex align-items-center gap-3">
          <span className="bg-teal text-white d-inline-flex align-items-center px-3 py-1 rounded fs-14 fw-medium">
            <i className="ti ti-clock me-2" />
            {clock}
          </span>
          <Link
            to="/dashboard"
            tabIndex={-1}
            className="btn btn-sm btn-purple d-inline-flex align-items-center"
          >
            <i className="ti ti-world me-1" />
            Dashboard
          </Link>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              if (!document.fullscreenElement)
                document.documentElement.requestFullscreen();
              else document.exitFullscreen();
            }}
          >
            <i className="ti ti-maximize" />
          </button>
        </div>
      </div>

      <div className="content pos-design p-0">
        <div className="row align-items-start pos-wrapper">
          {/* ═══ LEFT: Products ═══ */}
          <div className="col-md-12 col-lg-7 col-xl-8">
            <div className="pos-categories tabs_wrapper">
              {/* Welcome + Search */}
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
                <div>
                  <h5 className="mb-1">Welcome, {userName}</h5>
                  <p className="mb-0">{today}</p>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="input-icon-start pos-search position-relative">
                    <span className="input-icon-addon">
                      <i className="ti ti-search" />
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="form-control"
                      placeholder="Search Product"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== 'NumpadEnter') return;
                        e.preventDefault();
                        if (filteredRef.current.length === 0) return;
                        /* Sync + deferred: ensures focus leaves search and lands on first grid card (not payment) */
                        focusFirstFilteredProduct();
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => focusFirstFilteredProduct());
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Category chips */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  tabIndex={-1}
                  className={`btn btn-sm ${!activeCategory ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveCategory('')}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    tabIndex={-1}
                    className={`btn btn-sm ${activeCategory === cat.name ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setActiveCategory(cat.name)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Product grid */}
              <div className="pos-products" ref={posProductsRootRef}>
                <div className="row row-cols-xxl-5 g-3">
                  {filtered.length === 0 && (
                    <div className="col-12 text-center py-5 text-muted">
                      No products found
                    </div>
                  )}
                  {filtered.map((p) => {
                    const inCart = cart.some((c) => c.product.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="col-sm-6 col-md-6 col-lg-4 col-xl-3 col-xxl"
                      >
                        <div
                          ref={(el) => {
                            const key = productDomId(p.id);
                            if (el) productCardRefById.current.set(key, el);
                            else productCardRefById.current.delete(key);
                          }}
                          data-pos-product-id={productDomId(p.id)}
                          role="button"
                          tabIndex={0}
                          aria-disabled={!productInStock(p)}
                          aria-label={
                            productInStock(p)
                              ? `Add ${p.productName} to cart`
                              : `${p.productName} (out of stock)`
                          }
                          className={`product-info card${inCart ? ' active' : ''}${!productInStock(p) ? ' opacity-50' : ''}`}
                          style={{ cursor: productInStock(p) ? 'pointer' : 'not-allowed', position: 'relative' }}
                          onClick={() => addToCart(p)}
                          onKeyDown={(e) => {
                            if (!productInStock(p)) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              addToCart(p);
                            }
                          }}
                        >
                          {!productInStock(p) && (
                            <span className="badge bg-danger position-absolute top-0 end-0 m-1" style={{ zIndex: 1 }}>Out of Stock</span>
                          )}
                          <span className="product-image d-block">
                            <img
                              src={mediaUrl(p.images?.[0])}
                              alt=""
                              tabIndex={-1}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  '/assets/img/products/stock-img-01.png';
                              }}
                            />
                          </span>
                          <div className="product-content">
                            <h6 className="fs-14 fw-bold mb-1">
                              {p.productName}
                            </h6>
                            <div className="d-flex align-items-center justify-content-between">
                              <h6 className="text-teal fs-14 fw-bold">
                                Rs {fmt(p.price)}
                              </h6>
                              <p className={`mb-0 ${!productInStock(p) ? 'text-danger fw-bold' : 'text-pink'}`}>{p.quantity} Pcs</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT: Cart ═══ */}
          <div className="col-md-12 col-lg-5 col-xl-4 ps-0">
            <aside className="product-order-list">
              {/* Customer header */}
              <div className="customer-info">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <h4 className="mb-0">New Order</h4>
                </div>
                <select
                  ref={customerSelectRef}
                  tabIndex={-1}
                  className="form-select"
                  value={selectedCustomer}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedCustomer(v);
                    if (paymentMethod === 'Credit' && v) {
                      window.setTimeout(() => finalizeBtnRef.current?.focus(), 0);
                    }
                  }}
                >
                  <option value="">Walk in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order items */}
              <div className="product-added block-section">
                <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                  <h5 className="d-flex align-items-center mb-0">
                    Order Details
                  </h5>
                  <div className="badge bg-light text-gray-9 fs-12 fw-semibold py-2 border rounded">
                    Items : <span className="text-teal">{cart.length}</span>
                  </div>
                </div>
                <div className="product-wrap">
                  {cart.length === 0 ? (
                    <div className="empty-cart text-center py-4">
                      <i className="ti ti-shopping-cart-off fs-36 text-muted mb-2 d-block" />
                      <p className="fw-bold mb-0">No Products Selected</p>
                    </div>
                  ) : (
                    <div className="product-list border-0 p-0">
                      <div className="table-responsive">
                        <table className="table table-borderless mb-0">
                          <thead>
                            <tr>
                              <th className="bg-transparent fw-bold">
                                Product
                              </th>
                              <th className="bg-transparent fw-bold">QTY</th>
                              <th className="bg-transparent fw-bold">Price</th>
                              <th className="bg-transparent fw-bold text-end" />
                            </tr>
                          </thead>
                          <tbody>
                            {cart.map((line) => (
                              <tr key={line.product.id}>
                                <td>
                                  <h6 className="fs-14 fw-medium mb-1">
                                    {line.product.productName}
                                  </h6>
                                  <span className="text-muted fs-12">
                                    Rs {fmt(line.product.price)}
                                  </span>
                                </td>
                                <td>
                                  <div className="qty-item m-0">
                                    <input
                                      type="text"
                                      className="form-control text-center"
                                      readOnly
                                      tabIndex={-1}
                                      value={line.qty}
                                      aria-label={`Quantity for ${line.product.productName}`}
                                    />
                                    <button
                                      type="button"
                                      ref={(el) => {
                                        if (el) qtyDecRefById.current.set(productDomId(line.product.id), el);
                                        else qtyDecRefById.current.delete(productDomId(line.product.id));
                                      }}
                                      onClick={() => updateQty(line.product.id, -1)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          paymentCashRef.current?.focus();
                                        }
                                      }}
                                      className="dec d-flex justify-content-center align-items-center border-0 bg-transparent p-0"
                                      aria-label="Decrease quantity"
                                    >
                                      <i className="ti ti-minus fs-14" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateQty(line.product.id, 1)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          paymentCashRef.current?.focus();
                                        }
                                      }}
                                      className="inc d-flex justify-content-center align-items-center border-0 bg-transparent p-0"
                                      aria-label="Increase quantity"
                                    >
                                      <i className="ti ti-plus fs-14" />
                                    </button>
                                  </div>
                                </td>
                                <td className="fw-bold">
                                  Rs {fmt(line.product.price * line.qty)}
                                </td>
                                <td className="text-end">
                                  <a
                                    className="btn-icon delete-icon"
                                    href="#!"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeFromCart(line.product.id);
                                    }}
                                  >
                                    <i className="ti ti-trash" />
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals & actions */}
              <div className="block-section order-method bg-light m-0">
                <div className="order-total">
                  <div className="table-responsive">
                    <table className="table table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td>Sub Total</td>
                          <td className="text-end">Rs {fmt(subTotal)}</td>
                        </tr>
                       
                        <tr className="fw-bold">
                          <td>Grand Total</td>
                          <td className="text-end">Rs {fmt(grandTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="row gx-2 mt-3">
                  <div className="col-6">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="btn btn-secondary d-flex align-items-center justify-content-center w-100 mb-2"
                      onClick={clearCart}
                      disabled={cart.length === 0}
                    >
                      <i className="ti ti-reload me-2" />
                      Reset
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="btn btn-info d-flex align-items-center justify-content-center w-100 mb-2"
                      disabled={cart.length === 0}
                    >
                      <i className="ti ti-trash me-2" />
                      Void
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="block-section payment-method">
                <h5 className="mb-2">Select Payment</h5>
                <div className="row align-items-center justify-content-center methods g-2 mb-2">
                  <div className="col d-flex">
                    <button
                      type="button"
                      ref={paymentCashRef}
                      onClick={() => setPaymentMethod('Cash')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setPaymentMethod('Cash');
                          window.setTimeout(() => finalizeBtnRef.current?.focus(), 0);
                        }
                      }}
                      className={`payment-item flex-fill${paymentMethod === 'Cash' ? ' active' : ''}`}
                    >
                      <img
                        src="/assets/img/icons/cash-icon.svg"
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="fw-medium">Cash</p>
                    </button>
                  </div>
                  <div className="col d-flex">
                    <button
                      type="button"
                      ref={paymentCardRef}
                      onClick={() => setPaymentMethod('Card')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setPaymentMethod('Card');
                          window.setTimeout(() => finalizeBtnRef.current?.focus(), 0);
                        }
                      }}
                      className={`payment-item flex-fill${paymentMethod === 'Card' ? ' active' : ''}`}
                    >
                      <img
                        src="/assets/img/icons/card.svg"
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="fw-medium">Card</p>
                    </button>
                  </div>
                  <div className="col d-flex">
                    <button
                      type="button"
                      ref={paymentCreditRef}
                      onClick={() => {
                        if (!hasRegisteredCustomer) {
                          Swal.fire({
                            icon: 'info',
                            title: 'Credit not available',
                            text: 'This option is not available for walk-in customers. First choose any registered customer to proceed with this option.',
                          });
                          return;
                        }
                        setPaymentMethod('Credit');
                        window.setTimeout(() => customerSelectRef.current?.focus(), 0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        if (!hasRegisteredCustomer) {
                          Swal.fire({
                            icon: 'info',
                            title: 'Credit not available',
                            text: 'This option is not available for walk-in customers. First choose any registered customer to proceed with this option.',
                          });
                          return;
                        }
                        setPaymentMethod('Credit');
                        window.setTimeout(() => customerSelectRef.current?.focus(), 0);
                      }}
                      className={`payment-item flex-fill${paymentMethod === 'Credit' ? ' active' : ''}`}
                    >
                      <i className="ti ti-file-invoice fs-28 text-teal d-block mb-1" aria-hidden />
                      <p className="fw-medium">Credit</p>
                    </button>
                  </div>
                </div>
                <div className="btn-block m-0">
                  <button
                    type="button"
                    ref={finalizeBtnRef}
                    className="btn btn-teal w-100 py-2 fs-16 fw-bold"
                    disabled={cart.length === 0 || submitting}
                    onClick={() => void handlePay()}
                  >
                    {submitting ? (
                      <span className="spinner-border spinner-border-sm me-2" />
                    ) : null}
                    {paymentMethod === 'Credit' ? `Place order : Rs ${fmt(grandTotal)}` : `Pay : Rs ${fmt(grandTotal)}`}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
