import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { mediaUrl } from '../../services/api';
import { getCustomers, Customer } from '../../services/customerService';
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
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [submitting, setSubmitting] = useState(false);

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

  /* cart helpers */
  const addToCart = useCallback((p: ProductItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product.id !== productId) return c;
        const next = c.qty + delta;
        return next < 1 ? c : { ...c, qty: next };
      }),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  /* totals */
  const subTotal = useMemo(
    () => cart.reduce((s, c) => s + c.product.price * c.qty, 0),
    [cart],
  );
  const taxRate = 0.15;
  const taxAmount = Math.round(subTotal * taxRate);
  const grandTotal = subTotal + taxAmount;

  /* ── submit sale ── */
  const handlePay = useCallback(async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const customer = customers.find(c => String(c.id) === selectedCustomer);
      const payload = {
        customerId: customer ? Number(customer.id) : null,
        customerName: customer ? customer.name : 'Walk in Customer',
        biller: userName,
        grandTotal: subTotal + Math.round(subTotal * 0.15),
        orderTax: Math.round(subTotal * 0.15),
        discount: 0,
        shipping: 0,
        status: 'Completed',
        notes: '',
        source: 'pos',
        items: cart.map(line => ({
          productId: Number(line.product.id),
          productName: line.product.productName,
          quantity: line.qty,
          purchasePrice: line.product.price,
          discount: 0,
          taxPercent: 15,
          taxAmount: Math.round(line.product.price * line.qty * 0.15),
          unitCost: line.product.price,
          totalCost: line.product.price * line.qty,
        })),
      };
      const res = await api.post('/sales', payload);
      const saleId = (res.data as any).id;
      const saleRef = (res.data as any).reference;

      // Auto-create payment (full paid)
      await api.post(`/sales/${saleId}/payments`, {
        reference: `PAY-${saleRef}`,
        receivedAmount: payload.grandTotal,
        payingAmount: payload.grandTotal,
        paymentType: paymentMethod,
        description: `POS ${paymentMethod} Payment`,
      });

      setCart([]);
      setSelectedCustomer('');
      Swal.fire({ icon: 'success', title: 'Sale Completed!', text: `Reference: ${saleRef}`, timer: 2000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || 'Failed to process sale' });
    } finally {
      setSubmitting(false);
    }
  }, [cart, submitting, customers, selectedCustomer, userName, subTotal, paymentMethod]);

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
            className="btn btn-sm btn-purple d-inline-flex align-items-center"
          >
            <i className="ti ti-world me-1" />
            Dashboard
          </Link>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
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
                      type="text"
                      className="form-control"
                      placeholder="Search Product"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Category chips */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                <button
                  className={`btn btn-sm ${!activeCategory ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveCategory('')}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`btn btn-sm ${activeCategory === cat.name ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setActiveCategory(cat.name)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Product grid */}
              <div className="pos-products">
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
                          className={`product-info card${inCart ? ' active' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => addToCart(p)}
                        >
                          <span className="product-image d-block">
                            <img
                              src={mediaUrl(p.images?.[0])}
                              alt={p.productName}
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
                              <p className="text-pink mb-0">{p.quantity} Pcs</p>
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
                  className="form-select"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
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
                                  <div className="qty-item m-0 d-flex align-items-center">
                                    <a
                                      href="#!"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        updateQty(line.product.id, -1);
                                      }}
                                      className="dec d-flex justify-content-center align-items-center"
                                    >
                                      <i className="ti ti-minus fs-14" />
                                    </a>
                                    <input
                                      type="text"
                                      className="form-control text-center"
                                      readOnly
                                      value={line.qty}
                                      style={{ width: 40 }}
                                    />
                                    <a
                                      href="#!"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        updateQty(line.product.id, 1);
                                      }}
                                      className="inc d-flex justify-content-center align-items-center"
                                    >
                                      <i className="ti ti-plus fs-14" />
                                    </a>
                                  </div>
                                </td>
                                <td className="fw-bold">
                                  Rs {fmt(line.product.price * line.qty)}
                                </td>
                                <td className="text-end">
                                  <a
                                    className="btn-icon delete-icon"
                                    href="#!"
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
                        <tr>
                          <td>Tax (15%)</td>
                          <td className="text-end">Rs {fmt(taxAmount)}</td>
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
                <div className="row align-items-center justify-content-center methods g-2 mb-4">
                  <div className="col d-flex">
                    <a
                      href="#!"
                      onClick={(e) => { e.preventDefault(); setPaymentMethod('Cash'); }}
                      className={`payment-item flex-fill${paymentMethod === 'Cash' ? ' active' : ''}`}
                    >
                      <img
                        src="/assets/img/icons/cash-icon.svg"
                        alt="Cash"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="fw-medium">Cash</p>
                    </a>
                  </div>
                  <div className="col d-flex">
                    <a
                      href="#!"
                      onClick={(e) => { e.preventDefault(); setPaymentMethod('Card'); }}
                      className={`payment-item flex-fill${paymentMethod === 'Card' ? ' active' : ''}`}
                    >
                      <img
                        src="/assets/img/icons/card.svg"
                        alt="Card"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="fw-medium">Card</p>
                    </a>
                  </div>
                </div>
                <div className="btn-block m-0">
                  <button
                    className="btn btn-teal w-100 py-2 fs-16 fw-bold"
                    disabled={cart.length === 0 || submitting}
                    onClick={handlePay}
                  >
                    {submitting ? (
                      <span className="spinner-border spinner-border-sm me-2" />
                    ) : null}
                    Pay : Rs {fmt(grandTotal)}
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
