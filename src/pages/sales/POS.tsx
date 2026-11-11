import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { mediaUrl } from '../../services/api';
import { getCustomers, Customer } from '../../services/customerService';
import { recordSaleIncome } from '../../services/financeService';
import pharmacyService, {
  HeldBill, PharmacySettings, SaleDetail, SaleUnit, TillSummary,
  apiError, saleUnitsFor, unitLabel, unitMultiplier,
} from '../../services/pharmacyService';
import PharmacyReceipt from '../../components/PharmacyReceipt';
import suite, { Interaction, Location, PriceQuote } from '../../services/suiteService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';

/* ───── types ───── */
interface ProductItem {
  id: string;
  productName: string;
  category: string;
  brand?: string;
  sku?: string;
  itemBarcode?: string;
  price: number;
  quantity: number;
  images: string[];
  tax?: string;
  taxType?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  rackLocation?: string;
  isPrescriptionOnly?: boolean;
  isControlled?: boolean;
  unitsPerStrip?: number;
  stripsPerBox?: number;
  hasVariants?: boolean;
  /** Set on a cart copy of a sized/coloured article. */
  variant?: { id: number; label: string };
}

interface CategoryItem {
  id: number;
  name: string;
}

interface CartLine {
  product: ProductItem;
  unit: SaleUnit;
  qty: number;
  /** Discount on this line in rupees. */
  discount: number;
}

interface StoredLine {
  productId: string;
  unit: SaleUnit;
  qty: number;
  discount: number;
}

interface HeldPayload {
  lines: StoredLine[];
  doctorName?: string;
  patientName?: string;
  billDiscount?: number;
  billDiscountType?: 'amount' | 'percent';
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

/** Tax % from the product's own tax field, else the pharmacy default. */
const taxPercentOf = (p: ProductItem, fallback: number) => {
  const m = String(p.tax ?? '').match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : fallback;
};
const taxIsInclusive = (p: ProductItem) => String(p.taxType ?? '').toLowerCase().includes('incl');

const defaultUnit = (p: ProductItem): SaleUnit => (saleUnitsFor(p).includes('Strip') ? 'Strip' : 'Unit');

/** Simple Bootstrap modal driven by React state. */
const Modal: React.FC<{ show: boolean; title: string; onClose: () => void; size?: 'sm' | 'lg' | 'xl'; children: React.ReactNode }> = ({ show, title, onClose, size, children }) => {
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose]);
  if (!show) return null;
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}>
        <div className={`modal-dialog modal-dialog-centered${size ? ` modal-${size}` : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
};

const POS: React.FC = () => {
  /* state */
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = ['Admin', 'SuperAdmin'].includes(String((user as any)?.role ?? ''));
  const [searchParams, setSearchParams] = useSearchParams();

  const [rawProducts, setProducts] = useState<ProductItem[]>([]);
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

  // pharmacy counter state
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [till, setTill] = useState<TillSummary | null>(null);
  const [stores, setStores] = useState<{ value: string; label: string }[]>([]);
  const [store, setStore] = useState<string>(() => { try { return localStorage.getItem('posStore') || ''; } catch { return ''; } });
  const [locations, setLocations] = useState<Location[]>([]);
  const [lockedBranch, setLockedBranch] = useState(false);
  const [branchQty, setBranchQty] = useState<Record<string, number> | null>(null);
  const [levelQuote, setLevelQuote] = useState<PriceQuote | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  /** With more than one branch, stock shown and checked is the stock at the chosen branch. */
  const products = useMemo(
    () => (branchQty ? rawProducts.map((p) => (p.hasVariants ? p : { ...p, quantity: branchQty[String(p.id)] ?? 0 })) : rawProducts),
    [rawProducts, branchQty],
  );
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<'amount' | 'percent'>('amount');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [prescriptionPath, setPrescriptionPath] = useState('');
  const [uploadingRx, setUploadingRx] = useState(false);
  const [cashGiven, setCashGiven] = useState('');
  const [quotationId, setQuotationId] = useState<number | null>(null);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [substitutes, setSubstitutes] = useState<{ forName: string; list: ProductItem[] } | null>(null);
  const [receipt, setReceipt] = useState<{ sale: SaleDetail; cashGiven?: number; phone?: string } | null>(null);
  const [tillDialog, setTillDialog] = useState<'open' | 'close' | null>(null);
  const [tillCash, setTillCash] = useState('');
  const [tillNotes, setTillNotes] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const productCardRefById = useRef<Map<string, HTMLDivElement>>(new Map());
  const posProductsRootRef = useRef<HTMLDivElement>(null);
  const filteredRef = useRef<ProductItem[]>([]);
  const qtyDecRefById = useRef<Map<string, HTMLButtonElement>>(new Map());
  const posWrapperRef = useRef<HTMLDivElement>(null);
  const paymentCashRef = useRef<HTMLButtonElement>(null);
  const paymentCardRef = useRef<HTMLButtonElement>(null);
  const paymentCreditRef = useRef<HTMLButtonElement>(null);
  const finalizeBtnRef = useRef<HTMLButtonElement>(null);
  const customerSelectRef = useRef<HTMLSelectElement>(null);

  /** Tracks the product just added to cart so the next Tab jumps to its qty controls */
  const justAddedProductRef = useRef<string | null>(null);

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

  /* ── Focus trap: keep Tab cycling inside the POS page ── */
  useEffect(() => {
    if (loading) return;
    const wrapper = posWrapperRef.current;
    if (!wrapper) return;

    const getFocusable = (): HTMLElement[] =>
      Array.from(
        wrapper.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]:not([disabled])'
        )
      ).filter((el) => el.offsetParent !== null);

    const handleKeyDown = (e: KeyboardEvent) => {
      const isTab = e.key === 'Tab';
      const isArrow = e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      if (!isTab && !isArrow) return;

      /* Let arrow keys work normally inside <select> and <input> */
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (isArrow && (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA')) return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      const goBack = isTab ? e.shiftKey : (e.key === 'ArrowLeft' || e.key === 'ArrowUp');
      const goForward = isTab ? !e.shiftKey : (e.key === 'ArrowRight' || e.key === 'ArrowDown');

      if (isArrow) {
        e.preventDefault();
        const idx = focusable.indexOf(document.activeElement as HTMLElement);
        if (goForward) {
          const next = idx < 0 || idx >= focusable.length - 1 ? first : focusable[idx + 1];
          next.focus();
        } else {
          const prev = idx <= 0 ? last : focusable[idx - 1];
          prev.focus();
        }
        return;
      }

      /* Tab wrap */
      if (goBack) {
        if (document.activeElement === first || !wrapper.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (goForward) {
        if (document.activeElement === last || !wrapper.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading]);

  /* ── Keyboard focus highlight via inline styles (immune to CSS overrides) ── */
  useEffect(() => {
    if (loading) return;
    const wrapper = posWrapperRef.current;
    if (!wrapper) return;

    let lastFocused: HTMLElement | null = null;
    const savedStyles = new Map<string, string>();

    const applyHighlight = (el: HTMLElement) => {
      savedStyles.set('outline', el.style.outline);
      savedStyles.set('outlineOffset', el.style.outlineOffset);
      savedStyles.set('boxShadow', el.style.boxShadow);
      savedStyles.set('transition', el.style.transition);

      el.style.outline = '2px solid #3EB780';
      el.style.outlineOffset = '2px';
      el.style.boxShadow = '0 0 0 4px rgba(62, 183, 128, 0.3)';
      el.style.transition = 'none';
    };

    const removeHighlight = (el: HTMLElement) => {
      el.style.outline = savedStyles.get('outline') || '';
      el.style.outlineOffset = savedStyles.get('outlineOffset') || '';
      el.style.boxShadow = savedStyles.get('boxShadow') || '';
      el.style.transition = savedStyles.get('transition') || '';
      savedStyles.clear();
    };

    let usingKeyboard = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        usingKeyboard = true;
      }
    };

    const onMouseDown = () => {
      usingKeyboard = false;
      if (lastFocused) {
        removeHighlight(lastFocused);
        lastFocused = null;
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!usingKeyboard) return;
      const target = e.target as HTMLElement;
      if (!wrapper.contains(target)) return;

      if (lastFocused && lastFocused !== target) {
        removeHighlight(lastFocused);
      }
      applyHighlight(target);
      lastFocused = target;
    };

    const onFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (lastFocused === target) {
        removeHighlight(target);
        lastFocused = null;
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onMouseDown, true);
    wrapper.addEventListener('focusin', onFocusIn);
    wrapper.addEventListener('focusout', onFocusOut);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      wrapper.removeEventListener('focusin', onFocusIn);
      wrapper.removeEventListener('focusout', onFocusOut);
      if (lastFocused) removeHighlight(lastFocused);
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
      // Pharmacy extras load independently so a failure never blocks the counter.
      pharmacyService.getSettings().then(setSettings).catch(() => undefined);
      pharmacyService.getCurrentTill().then(setTill).catch(() => undefined);
      pharmacyService.getHeldBills().then(setHeldBills).catch(() => undefined);
      api.get<{ value: string; label: string }[]>('/stores').then((r) => setStores(r.data || [])).catch(() => undefined);
      suite.locations().then(setLocations).catch(() => undefined);
      suite.myLocation().then((m) => { if (m.restricted) { setStore(m.location.name); setLockedBranch(true); } }).catch(() => undefined);
    })();
  }, []);

  /* stock at the chosen branch */
  useEffect(() => {
    if (locations.length < 2) { setBranchQty(null); return; }
    const loc = locations.find((l) => l.name === store || l.code === store) ?? locations.find((l) => l.isDefault);
    if (!loc) return;
    suite.stockMatrix({ take: 5000 })
      .then((m) => setBranchQty(Object.fromEntries(m.rows.map((r) => [String(r.id), r.perLocation[String(loc.id)] ?? 0]))))
      .catch(() => setBranchQty(null));
  }, [locations, store]);

  /* wholesale / distributor prices for the chosen customer */
  useEffect(() => {
    if (!selectedCustomer) { setLevelQuote(null); return; }
    suite.quote(Number(selectedCustomer)).then((q) => setLevelQuote(q.priceLevelId && q.prices.length ? q : null)).catch(() => setLevelQuote(null));
  }, [selectedCustomer]);

  useEffect(() => {
    try { localStorage.setItem('posStore', store); } catch { /* ignore */ }
  }, [store]);

  /* Quotation → cart: /pos?quotation=12 */
  useEffect(() => {
    const qid = Number(searchParams.get('quotation'));
    if (!qid || loading || products.length === 0) return;
    (async () => {
      try {
        const { data } = await api.get<any>(`/quotations/${qid}`);
        const lines: CartLine[] = [];
        for (const it of data.items || []) {
          const p = products.find((x) => Number(x.id) === Number(it.productId));
          if (p) lines.push({ product: p, unit: 'Unit', qty: Math.max(1, Number(it.quantity) || 1), discount: Number(it.discount) || 0 });
        }
        setCart(lines);
        if (data.customerId) setSelectedCustomer(String(data.customerId));
        setQuotationId(qid);
        Swal.fire({ icon: 'info', title: `Quotation ${data.reference || qid} loaded`, text: 'Check quantities and complete the sale.', timer: 2200, showConfirmButton: false });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Could not load quotation', text: apiError(err) });
      } finally {
        searchParams.delete('quotation');
        setSearchParams(searchParams, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products.length]);

  /* filtered products: name, generic (salt) name, brand, SKU, barcode */
  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory)
      list = list.filter((p) => p.category === activeCategory);
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.genericName || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase() === q ||
        (p.itemBarcode || '').toLowerCase() === q);
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

  /* stock already in the cart for a product, in base units */
  const baseInCart = useCallback((lines: CartLine[], productId: string, exceptIndex = -1) =>
    lines.reduce((s, l, i) => (i !== exceptIndex && l.product.id === productId && !l.product.variant ? s + l.qty * unitMultiplier(l.product, l.unit) : s), 0), []);

  const showSubstitutes = useCallback(async (p: ProductItem) => {
    if (!p.genericName) {
      Swal.fire({ icon: 'warning', title: 'Out of Stock', text: `${p.productName} is out of stock.`, timer: 2000, showConfirmButton: false });
      return;
    }
    try {
      const list = (await pharmacyService.getSubstitutes(p.id)) as ProductItem[];
      if (list.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Out of Stock', text: `${p.productName} is out of stock and no other brand of ${p.genericName}${p.strength ? ' ' + p.strength : ''} is in stock.` });
        return;
      }
      setSubstitutes({ forName: `${p.productName} (${p.genericName}${p.strength ? ' ' + p.strength : ''})`, list });
    } catch {
      Swal.fire({ icon: 'warning', title: 'Out of Stock', text: `${p.productName} is out of stock.` });
    }
  }, []);

  /* cart helpers */
  /** Adds one size/colour of an article (stock was checked when it was picked). */
  const addVariantLine = useCallback((p: ProductItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === p.id && c.product.variant?.id === p.variant?.id);
      if (idx >= 0) {
        const next = [...prev];
        if (next[idx].qty + 1 > p.quantity) return prev;
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { product: p, unit: 'Unit', qty: 1, discount: 0 }];
    });
  }, []);

  const chooseVariant = useCallback(async (p: ProductItem) => {
    const loc = locations.find((l) => l.name === store || l.code === store);
    try {
      const d = await suite.productVariants(Number(p.id), loc?.id);
      const live = d.variants.filter((v) => v.isActive && v.stock > 0);
      if (live.length === 0) { Swal.fire({ icon: 'warning', title: 'Out of stock', text: `No size or colour of ${p.productName} is in stock here.` }); return; }
      const label = (v: { option1?: string | null; option2?: string | null; option3?: string | null }) => [v.option1, v.option2, v.option3].filter(Boolean).join(' / ');
      const { value } = await Swal.fire({
        title: p.productName, input: 'select', showCancelButton: true, confirmButtonText: 'Add',
        inputOptions: Object.fromEntries(live.map((v) => [String(v.id), `${label(v)} · ${v.stock} in stock${v.price != null ? ` · Rs ${v.price}` : ''}`])),
      });
      if (!value) return;
      const v = live.find((x) => x.id === Number(value))!;
      addVariantLine({ ...p, price: v.price ?? p.price, quantity: v.stock, variant: { id: v.id, label: label(v) } });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load sizes', text: apiError(err) });
    }
  }, [locations, store, addVariantLine]);

  const addToCart = useCallback((p: ProductItem, opts?: { focusQty?: boolean; unit?: SaleUnit }) => {
    if (p.hasVariants && !p.variant) {
      void chooseVariant(p);
      return;
    }
    if (p.quantity <= 0) {
      void showSubstitutes(p);
      return;
    }
    let changed = false;
    setCart((prev) => {
      const unit = opts?.unit ?? defaultUnit(p);
      const mult = unitMultiplier(p, unit);
      const idx = prev.findIndex((c) => c.product.id === p.id && c.unit === unit);
      const needed = baseInCart(prev, p.id) + mult;
      if (needed > p.quantity) {
        Swal.fire({ icon: 'warning', title: 'Stock Limit', text: `Only ${p.quantity} ${unitLabel('Unit', p.dosageForm).toLowerCase()}s of ${p.productName} in stock.`, timer: 2200, showConfirmButton: false });
        return prev;
      }
      changed = true;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { product: p, unit, qty: 1, discount: 0 }];
    });
    if (opts?.focusQty !== false && changed) {
      focusQtyDec(p.id);
    }
  }, [focusQtyDec, baseInCart, showSubstitutes, chooseVariant]);

  const removeLine = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQty = useCallback((index: number, delta: number) => {
    setCart((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const next = c.qty + delta;
        if (next < 1) return c;
        const needed = baseInCart(prev, c.product.id, i) + next * unitMultiplier(c.product, c.unit);
        if (needed > c.product.quantity) {
          Swal.fire({ icon: 'warning', title: 'Stock Limit', text: `Only ${c.product.quantity} in stock for ${c.product.productName}.`, timer: 2000, showConfirmButton: false });
          return c;
        }
        return { ...c, qty: next };
      }),
    );
  }, [baseInCart]);

  const changeUnit = useCallback((index: number, unit: SaleUnit) => {
    setCart((prev) => prev.map((c, i) => {
      if (i !== index) return c;
      const needed = baseInCart(prev, c.product.id, i) + c.qty * unitMultiplier(c.product, unit);
      if (needed > c.product.quantity) {
        Swal.fire({ icon: 'warning', title: 'Stock Limit', text: `Not enough ${c.product.productName} for ${c.qty} ${unit.toLowerCase()}(s).`, timer: 2000, showConfirmButton: false });
        return c;
      }
      return { ...c, unit };
    }));
  }, [baseInCart]);

  const setLineDiscount = useCallback((index: number, value: number) => {
    setCart((prev) => prev.map((c, i) => (i === index ? { ...c, discount: Math.max(0, value || 0) } : c)));
  }, []);

  const resetBill = useCallback(() => {
    setCart([]);
    setSelectedCustomer('');
    setPaymentMethod('Cash');
    setBillDiscount(0);
    setCoupon(null);
    setCouponInput('');
    setDoctorName('');
    setPatientName('');
    setPrescriptionPath('');
    setCashGiven('');
    setQuotationId(null);
  }, []);

  /* totals */
  const defaultTax = Number(settings?.defaultTaxPercent) || 0;
  /** Price from the customer's price level for this line (largest quantity break that applies), if any. */
  const levelPrice = useCallback((c: CartLine): number | null => {
    if (!levelQuote) return null;
    const rows = levelQuote.prices.filter((r) => String(r.productId) === String(c.product.id) && (r.variantId ?? null) === (c.product.variant?.id ?? null));
    const pick = (unit: string) => rows.filter((r) => r.saleUnit === unit && r.minQty <= c.qty).sort((a, b) => b.minQty - a.minQty)[0];
    const same = pick(c.unit);
    if (same) return same.price;
    const perUnit = c.unit !== 'Unit' ? pick('Unit') : undefined;
    return perUnit ? perUnit.price * unitMultiplier(c.product, c.unit) : null;
  }, [levelQuote]);
  const totals = useMemo(() => {
    const lines = cart.map((c) => {
      const unitPrice = levelPrice(c) ?? Number(c.product.price) * unitMultiplier(c.product, c.unit);
      const gross = unitPrice * c.qty;
      const discount = Math.min(c.discount, gross);
      return { c, unitPrice, gross, discount, net: gross - discount, taxPct: taxPercentOf(c.product, defaultTax), inclusive: taxIsInclusive(c.product) };
    });
    const gross = lines.reduce((s, l) => s + l.gross, 0);
    const lineDiscount = lines.reduce((s, l) => s + l.discount, 0);
    const afterLines = gross - lineDiscount;
    const billDisc = Math.min(afterLines, billDiscountType === 'percent' ? (afterLines * billDiscount) / 100 : billDiscount);
    const couponDisc = Math.min(afterLines - billDisc, coupon?.discount ?? 0);
    const ratio = afterLines > 0 ? (billDisc + couponDisc) / afterLines : 0;

    let tax = 0;
    let exclusiveTax = 0;
    const items = lines.map((l) => {
      const taxable = l.net * (1 - ratio);
      const lineTax = l.taxPct > 0
        ? (l.inclusive ? taxable - taxable / (1 + l.taxPct / 100) : (taxable * l.taxPct) / 100)
        : 0;
      const rounded = Math.round(lineTax * 100) / 100;
      tax += rounded;
      if (!l.inclusive) exclusiveTax += rounded;
      return { ...l, taxAmount: rounded, total: l.net + (l.inclusive ? 0 : rounded) };
    });
    const grand = Math.round(afterLines - billDisc - couponDisc + exclusiveTax);
    const discountTotal = lineDiscount + billDisc + couponDisc;
    return { items, gross, lineDiscount, billDisc, couponDisc, tax: Math.round(tax * 100) / 100, grand, discountTotal, discountPct: gross > 0 ? (discountTotal / gross) * 100 : 0 };
  }, [cart, billDiscount, billDiscountType, coupon, defaultTax, levelPrice]);

  /* drug interaction warnings */
  const cartIds = Array.from(new Set(cart.map((c) => Number(c.product.id)))).sort((a, b) => a - b).join(',');
  useEffect(() => {
    const ids = cartIds ? cartIds.split(',').map(Number) : [];
    if (ids.length < 2) { setInteractions([]); return; }
    const t = window.setTimeout(() => { suite.interactions(ids).then(setInteractions).catch(() => setInteractions([])); }, 400);
    return () => window.clearTimeout(t);
  }, [cartIds]);

  const subTotal = totals.gross;
  const grandTotal = totals.grand;
  const rxLines = cart.filter((c) => c.product.isPrescriptionOnly || c.product.isControlled);
  const needsRx = rxLines.length > 0 && (settings?.requirePrescription ?? true);
  const maxDiscount = Number(settings?.maxCashierDiscountPercent ?? 100);
  const overDiscount = !isAdmin && totals.discountPct > maxDiscount + 0.01;
  const cashGivenNum = Number(cashGiven) || 0;
  const change = paymentMethod === 'Cash' && cashGivenNum > 0 ? cashGivenNum - grandTotal : 0;

  // A coupon is re-checked whenever the bill changes, because its value depends on the amount.
  useEffect(() => { if (coupon) setCoupon(null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cart.length]);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const res = await pharmacyService.checkCoupon(couponInput.trim(), subTotal - totals.lineDiscount - totals.billDisc, selectedCustomer ? Number(selectedCustomer) : null);
      setCoupon(res);
    } catch (err) {
      setCoupon(null);
      Swal.fire({ icon: 'warning', title: 'Coupon not applied', text: apiError(err) });
    }
  };

  const uploadPrescription = async (file?: File | null) => {
    if (!file) return;
    setUploadingRx(true);
    try {
      setPrescriptionPath(await pharmacyService.uploadPrescription(file));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload failed', text: apiError(err) });
    } finally {
      setUploadingRx(false);
    }
  };

  /* ── held bills ── */
  const holdCurrentBill = async () => {
    if (cart.length === 0) return;
    const { value: label, isConfirmed } = await Swal.fire({
      title: 'Hold this bill',
      input: 'text',
      inputLabel: 'Name or note (optional)',
      inputPlaceholder: 'e.g. Lady in blue, fetching prescription',
      showCancelButton: true,
      confirmButtonText: 'Hold bill',
    });
    if (!isConfirmed) return;
    const customer = customers.find((c) => String(c.id) === selectedCustomer);
    const payload: HeldPayload = {
      lines: cart.map((c) => ({ productId: c.product.id, unit: c.unit, qty: c.qty, discount: c.discount })),
      doctorName, patientName, billDiscount, billDiscountType,
    };
    try {
      const held = await pharmacyService.holdBill({
        label: label || undefined,
        customerId: customer ? Number(customer.id) : null,
        customerName: customer?.name ?? null,
        cartJson: JSON.stringify(payload),
        total: grandTotal,
      });
      setHeldBills((h) => [held, ...h]);
      resetBill();
      Swal.fire({ icon: 'success', title: `Held as "${held.label}"`, timer: 1400, showConfirmButton: false })
        .then(() => searchInputRef.current?.focus());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not hold the bill', text: apiError(err) });
    }
  };

  const recallBill = async (bill: HeldBill) => {
    if (cart.length > 0) {
      const res = await Swal.fire({
        icon: 'question', title: 'Replace the current bill?',
        text: 'The bill on screen will be cleared. Hold it first if you still need it.',
        showCancelButton: true, confirmButtonText: 'Replace',
      });
      if (!res.isConfirmed) return;
    }
    try {
      const recalled = await pharmacyService.recallBill(bill.id);
      const payload: HeldPayload = JSON.parse(recalled.cartJson || '{}');
      const lines: CartLine[] = [];
      const missing: string[] = [];
      for (const l of payload.lines || []) {
        const p = products.find((x) => String(x.id) === String(l.productId));
        if (p) lines.push({ product: p, unit: l.unit, qty: l.qty, discount: l.discount || 0 });
        else missing.push(String(l.productId));
      }
      resetBill();
      setCart(lines);
      setSelectedCustomer(recalled.customerId ? String(recalled.customerId) : '');
      setDoctorName(payload.doctorName || '');
      setPatientName(payload.patientName || '');
      setBillDiscount(payload.billDiscount || 0);
      setBillDiscountType(payload.billDiscountType || 'amount');
      setHeldBills((h) => h.filter((x) => x.id !== bill.id));
      setShowHeld(false);
      if (missing.length) Swal.fire({ icon: 'warning', title: 'Some items were skipped', text: 'They are no longer in the product list.' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not recall the bill', text: apiError(err) });
    }
  };

  /* ── till ── */
  const openTill = async () => {
    try {
      const t = await pharmacyService.openTill(Number(tillCash) || 0, store || undefined);
      setTill(t);
      setTillDialog(null);
      setTillCash('');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not open the till', text: apiError(err) });
    }
  };

  const showCloseTill = async () => {
    if (!till) return;
    try { setTill(await pharmacyService.getCurrentTill()); } catch { /* keep last known */ }
    setTillCash('');
    setTillNotes('');
    setTillDialog('close');
  };

  const closeTill = async () => {
    if (!till) return;
    try {
      const closed = await pharmacyService.closeTill(till.id, Number(tillCash) || 0, tillNotes || undefined);
      setTill(null);
      setTillDialog(null);
      const diff = closed.difference ?? 0;
      Swal.fire({
        icon: Math.abs(diff) < 1 ? 'success' : 'warning',
        title: 'Till closed',
        html: `Expected cash: <b>Rs ${fmt(closed.expectedCash)}</b><br/>Counted: <b>Rs ${fmt(closed.countedCash ?? 0)}</b><br/>` +
          (Math.abs(diff) < 1 ? 'Cash matches.' : `Difference: <b>Rs ${fmt(diff)}</b> ${diff < 0 ? 'short' : 'over'}`),
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not close the till', text: apiError(err) });
    }
  };

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
    if (!till) {
      Swal.fire({ icon: 'info', title: 'Open the till first', text: 'Enter the opening cash to start your shift, then complete the bill.' })
        .then(() => setTillDialog('open'));
      return;
    }
    if (needsRx && !doctorName.trim()) {
      Swal.fire({ icon: 'info', title: 'Prescription needed', text: `${rxLines.map((l) => l.product.productName).join(', ')} need a prescription. Enter the doctor's name.` });
      return;
    }
    if (overDiscount) {
      Swal.fire({ icon: 'warning', title: 'Discount too high', text: `Discount is ${totals.discountPct.toFixed(1)}% of the bill. Your limit is ${maxDiscount}%.` });
      return;
    }
    if (paymentMethod === 'Cash' && cashGivenNum > 0 && cashGivenNum < grandTotal) {
      Swal.fire({ icon: 'warning', title: 'Cash is short', text: `Cash given Rs ${fmt(cashGivenNum)} is less than the bill Rs ${fmt(grandTotal)}.` });
      return;
    }
    let creditOverride = false;
    if (paymentMethod === 'Credit' && selectedCustomer) {
      try {
        const chk = await suite.creditCheck(Number(selectedCustomer), grandTotal);
        if (!chk.ok) {
          if (!isAdmin) {
            Swal.fire({ icon: 'warning', title: 'Credit not allowed', html: `${chk.problems.join('<br/>')}<br/><br/>Ask a manager, or take payment.` });
            return;
          }
          const ok = await Swal.fire({ icon: 'warning', title: 'Outside credit terms', html: `${chk.problems.join('<br/>')}<br/><br/>Allow this credit sale? It is recorded in the activity log.`, showCancelButton: true, confirmButtonText: 'Allow' });
          if (!ok.isConfirmed) return;
          creditOverride = true;
        }
      } catch { /* the server checks again */ }
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
        orderTax: totals.tax,
        discount: Math.round((totals.billDisc + totals.couponDisc) * 100) / 100,
        shipping: 0,
        status: isNet ? 'Completed' : 'Pending',
        notes: '',
        source: 'pos',
        expectedDate: expectedDateForOrder,
        store: store || null,
        paymentMethod,
        couponCode: coupon?.code ?? null,
        patientName: patientName.trim() || null,
        doctorName: doctorName.trim() || null,
        prescriptionImage: prescriptionPath || null,
        quotationId,
        creditOverride,
        priceLevelId: levelQuote?.priceLevelId ?? null,
        items: totals.items.map((l) => ({
          productId: Number(l.c.product.id),
          productName: l.c.product.variant ? `${l.c.product.productName} (${l.c.product.variant.label})` : l.c.product.productName,
          variantId: l.c.product.variant?.id ?? null,
          quantity: l.c.qty * unitMultiplier(l.c.product, l.c.unit),
          saleUnit: l.c.unit,
          unitQuantity: l.c.qty,
          purchasePrice: l.unitPrice,
          discount: l.discount,
          taxPercent: l.taxPct,
          taxAmount: l.taxAmount,
          unitCost: l.unitPrice,
          totalCost: Math.round(l.total * 100) / 100,
        })),
      };
      const res = await api.post('/sales', payload);
      const saleId = (res.data as any).id;
      const saleRef = (res.data as any).reference;
      const fbrError = (res.data as any).fbrError as string | undefined;

      // Only auto-create payment for net (immediate) sales
      if (isNet) {
        const payType = paymentMethod as 'Cash' | 'Card';
        await api.post(`/sales/${saleId}/payments`, {
          reference: `PAY-${saleRef}`,
          receivedAmount: payType === 'Cash' && cashGivenNum > 0 ? cashGivenNum : payload.grandTotal,
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
      const usedOf = (id: string) => cart.filter((c) => c.product.id === id).reduce((s, c) => s + c.qty * unitMultiplier(c.product, c.unit), 0);
      setProducts((prev) =>
        prev.map((p) => {
          const used = usedOf(p.id);
          return used ? { ...p, quantity: Math.max(0, p.quantity - used) } : p;
        }),
      );
      setBranchQty((prev) => (prev ? Object.fromEntries(Object.entries(prev).map(([id, q]) => [id, Math.max(0, q - usedOf(id))])) : prev));
      const given = paymentMethod === 'Cash' && cashGivenNum > 0 ? cashGivenNum : undefined;
      const phone = (customer as any)?.phone as string | undefined;
      resetBill();

      try {
        const sale = await pharmacyService.getSale(saleId);
        setReceipt({ sale, cashGiven: given, phone });
      } catch {
        Swal.fire({ icon: 'success', title: isNet ? 'Sale Completed!' : 'Credit order placed!', text: `Reference: ${saleRef}`, timer: 2000, showConfirmButton: false });
      }
      if (fbrError) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `FBR: ${fbrError}`, showConfirmButton: false, timer: 5000 });
      }
      pharmacyService.getCurrentTill().then(setTill).catch(() => undefined);
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: apiError(err, 'Failed to process sale') });
    } finally {
      setSubmitting(false);
    }
  }, [cart, submitting, customers, selectedCustomer, userName, paymentMethod, grandTotal, totals, till, needsRx, doctorName, patientName,
    prescriptionPath, overDiscount, maxDiscount, rxLines, cashGivenNum, store, coupon, quotationId, resetBill, isAdmin, levelQuote]);

  /* Shortcuts: F2 search, F4 hold, F8 held bills, F9 pay */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (receipt || tillDialog || showHeld || substitutes) return;
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
      else if (e.key === 'F4') { e.preventDefault(); void holdCurrentBill(); }
      else if (e.key === 'F8') { e.preventDefault(); setShowHeld(true); }
      else if (e.key === 'F9') { e.preventDefault(); void handlePay(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

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
    <div className="page-wrapper pos-pg-wrapper ms-0" ref={posWrapperRef}>
      {/* POS header bar: clock, till, branch */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 px-3 py-2 border-bottom bg-white">
        <div className="d-flex align-items-center gap-2 flex-wrap">
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
          {till ? (
            <button type="button" tabIndex={-1} className="btn btn-sm btn-outline-success" onClick={showCloseTill}
              title="Till is open. Click to count cash and close your shift.">
              <i className="ti ti-cash-register me-1" />Till open · {till.bills} bills · Close shift
            </button>
          ) : (
            <button type="button" tabIndex={-1} className="btn btn-sm btn-warning" onClick={() => setTillDialog('open')}>
              <i className="ti ti-cash-register me-1" />{t('counter.openTill', 'Open till')}
            </button>
          )}
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {stores.length > 0 && (
            <select tabIndex={-1} className="form-select form-select-sm" style={{ width: 170 }} value={store} disabled={lockedBranch}
              onChange={(e) => setStore(e.target.value)} aria-label="Branch" title={lockedBranch ? 'You are assigned to this branch' : undefined}>
              <option value="">{t('counter.mainBranch', "Main branch")}</option>
              {stores.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
            </select>
          )}
          <button type="button" tabIndex={-1} className="btn btn-sm btn-outline-primary position-relative" onClick={() => setShowHeld(true)}>
            <i className="ti ti-player-pause me-1" />{t('counter.heldBills', 'Held bills')}
            {heldBills.length > 0 && <span className="badge bg-danger ms-1">{heldBills.length}</span>}
          </button>
          <span className="text-muted fs-12 d-none d-xl-inline">F2 search · F4 hold · F8 held · F9 pay</span>
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
                      placeholder={t('counter.search', "Medicine, salt name or barcode")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== 'NumpadEnter') return;
                        e.preventDefault();
                        // A scanned barcode or exact SKU goes straight into the bill.
                        const code = searchTerm.trim().toLowerCase();
                        const exact = code && products.find((p) =>
                          (p.itemBarcode || '').toLowerCase() === code || (p.sku || '').toLowerCase() === code);
                        if (exact) {
                          addToCart(exact, { focusQty: false });
                          setSearchTerm('');
                          return;
                        }
                        if (filteredRef.current.length === 0) {
                          // Could be the barcode of one size/colour of an article.
                          const raw = searchTerm.trim();
                          if (raw && !raw.includes(' ')) {
                            suite.lookupVariant(raw).then((r) => {
                              const base = products.find((x) => Number(x.id) === r.product.id);
                              if (!base) return;
                              addVariantLine({ ...base, price: r.variant.price, quantity: Number.MAX_SAFE_INTEGER, variant: { id: r.variant.id, label: r.label } });
                              setSearchTerm('');
                            }).catch(() => undefined);
                          }
                          return;
                        }
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
                      No medicines found
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
                          aria-label={
                            productInStock(p)
                              ? `Add ${p.productName} to cart`
                              : `${p.productName} (out of stock, show substitutes)`
                          }
                          className={`product-info card${inCart ? ' active' : ''}${!productInStock(p) ? ' opacity-50' : ''}`}
                          style={{ cursor: 'pointer', position: 'relative' }}
                          onClick={() => addToCart(p)}
                          onKeyDown={(e) => {
                            /* After adding to cart, next Tab jumps to qty controls instead of next product */
                            if (e.key === 'Tab') {
                              if (!e.shiftKey && justAddedProductRef.current) {
                                e.preventDefault();
                                const targetId = justAddedProductRef.current;
                                justAddedProductRef.current = null;
                                const btn = qtyDecRefById.current.get(targetId);
                                if (btn) btn.focus();
                                else paymentCashRef.current?.focus();
                                return;
                              }
                              justAddedProductRef.current = null;
                              return;
                            }
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              addToCart(p, { focusQty: false });
                              if (productInStock(p)) justAddedProductRef.current = productDomId(p.id);
                            }
                          }}
                        >
                          {!productInStock(p) && (
                            <span className="badge bg-danger position-absolute top-0 end-0 m-1" style={{ zIndex: 1 }}>{t('counter.outOfStock', "Out of Stock")}</span>
                          )}
                          {p.isPrescriptionOnly && (
                            <span className={`badge ${p.isControlled ? 'bg-dark' : 'bg-warning text-dark'} position-absolute top-0 start-0 m-1`} style={{ zIndex: 1 }}>
                              {p.isControlled ? 'Controlled' : 'Rx'}
                            </span>
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
                            <h6 className="fs-14 fw-bold mb-0">
                              {p.productName}{p.strength ? ` ${p.strength}` : ''}
                            </h6>
                            {p.genericName && <p className="fs-12 text-muted mb-1 text-truncate" title={p.genericName}>{p.genericName}</p>}
                            <div className="d-flex align-items-center justify-content-between">
                              <h6 className="text-teal fs-14 fw-bold">
                                Rs {fmt(p.price)}
                              </h6>
                              <p className={`mb-0 ${!productInStock(p) ? 'text-danger fw-bold' : 'text-pink'}`}>{p.quantity} {p.dosageForm?.toLowerCase().includes('tab') ? 'tabs' : 'pcs'}</p>
                            </div>
                            {p.rackLocation && <p className="fs-11 text-muted mb-0"><i className="ti ti-map-pin me-1" />{p.rackLocation}</p>}
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
                  <h4 className="mb-0">New Order{quotationId ? <span className="badge bg-info ms-2 fs-12">{t('counter.fromQuotation', "From quotation")}</span> : null}</h4>
                </div>
                <select
                  ref={customerSelectRef}
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
                  <option value="">{t('counter.walkIn', "Walk in Customer")}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order items */}
              {levelQuote && (
                <div className="alert alert-info py-2 mb-2 fs-13"><i className="ti ti-tag me-1" />{levelQuote.priceLevel} prices apply to this customer.</div>
              )}
              {interactions.length > 0 && (
                <div className={`alert ${interactions.some((x) => x.severity === 'Major') ? 'alert-danger' : 'alert-warning'} py-2 mb-2 fs-13`} role="alert">
                  <b><i className="ti ti-alert-triangle me-1" />{t('counter.interactionCheck', "Interaction check")}</b>
                  {interactions.map((x, i) => (
                    <div key={i}>{x.severity}: {x.genericA} + {x.genericB}{x.note ? ` · ${x.note}` : ''}</div>
                  ))}
                </div>
              )}
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
                      <p className="fw-bold mb-0">{t('counter.noProducts', "No Products Selected")}</p>
                    </div>
                  ) : (
                    <div className="product-list border-0 p-0">
                      <div className="table-responsive">
                        <table className="table table-borderless mb-0 align-middle">
                          <thead>
                            <tr>
                              <th className="bg-transparent fw-bold">{t('counter.product', "Product")}</th>
                              <th className="bg-transparent fw-bold">{t('counter.qty', "QTY")}</th>
                              <th className="bg-transparent fw-bold text-end">{t('counter.amount', "Amount")}</th>
                              <th className="bg-transparent fw-bold text-end" />
                            </tr>
                          </thead>
                          <tbody>
                            {totals.items.map((l, index) => {
                              const line = l.c;
                              const units = saleUnitsFor(line.product);
                              return (
                                <tr key={`${line.product.id}-${line.product.variant?.id ?? 0}-${line.unit}`}>
                                  <td style={{ minWidth: 150 }}>
                                    <h6 className="fs-14 fw-medium mb-1">
                                      {line.product.productName}
                                      {line.product.variant && <span className="text-muted fw-normal"> ({line.product.variant.label})</span>}
                                      {line.product.isPrescriptionOnly && <span className="badge bg-warning text-dark ms-1 fs-10">Rx</span>}
                                    </h6>
                                    <div className="d-flex align-items-center gap-1 flex-wrap">
                                      {units.length > 1 ? (
                                        <select className="form-select form-select-sm py-0" style={{ width: 92 }} value={line.unit}
                                          aria-label={`Unit for ${line.product.productName}`}
                                          onChange={(e) => changeUnit(index, e.target.value as SaleUnit)}>
                                          {units.map((u) => <option key={u} value={u}>{unitLabel(u, line.product.dosageForm)}</option>)}
                                        </select>
                                      ) : null}
                                      <span className="text-muted fs-12">@ Rs {fmt(l.unitPrice)}</span>
                                    </div>
                                    <div className="input-group input-group-sm mt-1" style={{ width: 130 }}>
                                      <span className="input-group-text py-0 fs-11">{t('counter.disc', "Disc")}</span>
                                      <input type="number" min={0} className="form-control py-0" value={line.discount || ''}
                                        tabIndex={-1} placeholder="0" aria-label={`Discount on ${line.product.productName}`}
                                        onChange={(e) => setLineDiscount(index, Number(e.target.value))} />
                                    </div>
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
                                        onClick={() => updateQty(index, -1)}
                                        className="dec d-flex justify-content-center align-items-center border-0 bg-transparent p-0"
                                        aria-label="Decrease quantity"
                                      >
                                        <i className="ti ti-minus fs-14" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateQty(index, 1)}
                                        className="inc d-flex justify-content-center align-items-center border-0 bg-transparent p-0"
                                        aria-label="Increase quantity"
                                      >
                                        <i className="ti ti-plus fs-14" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="fw-bold text-end">
                                    Rs {fmt(l.net)}
                                    {l.taxAmount > 0 && <div className="fs-11 text-muted fw-normal">tax {fmt(l.taxAmount)}{l.inclusive ? ' incl.' : ''}</div>}
                                  </td>
                                  <td className="text-end">
                                    <a
                                      className="btn-icon delete-icon"
                                      href="#!"
                                      tabIndex={-1}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        removeLine(index);
                                      }}
                                    >
                                      <i className="ti ti-trash" />
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription (only when an Rx item is on the bill) */}
              {rxLines.length > 0 && (
                <div className="block-section border-top">
                  <h6 className="mb-2"><i className="ti ti-prescription me-1" />Prescription{needsRx ? <span className="text-danger"> *</span> : null}</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <input className={`form-control form-control-sm${needsRx && !doctorName.trim() ? ' is-invalid' : ''}`}
                        placeholder={t('counter.doctor', "Doctor's name")} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} aria-label="Doctor's name" />
                    </div>
                    <div className="col-6">
                      <input className="form-control form-control-sm" placeholder={t('counter.patient', "Patient name")} value={patientName}
                        onChange={(e) => setPatientName(e.target.value)} aria-label="Patient name" />
                    </div>
                    <div className="col-12 d-flex align-items-center gap-2">
                      <label className="btn btn-sm btn-outline-secondary mb-0">
                        {uploadingRx ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="ti ti-camera me-1" />}
                        {prescriptionPath ? 'Replace photo' : 'Attach photo'}
                        <input type="file" accept="image/*,application/pdf" capture="environment" hidden
                          onChange={(e) => void uploadPrescription(e.target.files?.[0])} />
                      </label>
                      {prescriptionPath && <a href={mediaUrl(prescriptionPath)} target="_blank" rel="noreferrer" className="fs-12">{t('counter.viewAttached', "View attached")}</a>}
                    </div>
                  </div>
                </div>
              )}

              {/* Totals & actions */}
              <div className="block-section order-method bg-light m-0">
                <div className="row g-2 mb-2">
                  <div className="col-7">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">{t('counter.billDisc', "Bill disc.")}</span>
                      <input type="number" min={0} className="form-control" value={billDiscount || ''} placeholder="0"
                        tabIndex={-1} aria-label="Bill discount" onChange={(e) => setBillDiscount(Math.max(0, Number(e.target.value) || 0))} />
                      <select className="form-select" style={{ maxWidth: 62 }} value={billDiscountType} tabIndex={-1}
                        aria-label="Discount type" onChange={(e) => setBillDiscountType(e.target.value as 'amount' | 'percent')}>
                        <option value="amount">Rs</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-5">
                    <div className="input-group input-group-sm">
                      <input className="form-control" placeholder={t('counter.coupon', "Coupon")} value={coupon ? coupon.code : couponInput} tabIndex={-1}
                        aria-label="Coupon code" disabled={!!coupon}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void applyCoupon(); } }} />
                      {coupon
                        ? <button type="button" className="btn btn-outline-danger" tabIndex={-1} onClick={() => { setCoupon(null); setCouponInput(''); }} aria-label="Remove coupon"><i className="ti ti-x" /></button>
                        : <button type="button" className="btn btn-outline-primary" tabIndex={-1} onClick={() => void applyCoupon()} disabled={!couponInput.trim() || cart.length === 0}>{t('counter.apply', "Apply")}</button>}
                    </div>
                  </div>
                </div>
                <div className="order-total">
                  <div className="table-responsive">
                    <table className="table table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td>{t('counter.subTotal', "Sub Total")}</td>
                          <td className="text-end">Rs {fmt(subTotal)}</td>
                        </tr>
                        {totals.discountTotal > 0 && (
                          <tr className={overDiscount ? 'text-danger' : ''}>
                            <td>Discount{coupon ? ` (${coupon.code})` : ''} · {totals.discountPct.toFixed(1)}%{overDiscount ? ` over your ${maxDiscount}% limit` : ''}</td>
                            <td className="text-end">- Rs {fmt(totals.discountTotal)}</td>
                          </tr>
                        )}
                        {totals.tax > 0 && (
                          <tr>
                            <td>{t('counter.salesTax', "Sales tax")}</td>
                            <td className="text-end">Rs {fmt(totals.tax)}</td>
                          </tr>
                        )}
                        <tr className="fw-bold">
                          <td>{t('counter.grandTotal', "Grand Total")}</td>
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
                      className="btn btn-secondary d-flex align-items-center justify-content-center w-100 mb-2"
                      onClick={resetBill}
                      disabled={cart.length === 0}
                    >
                      <i className="ti ti-reload me-2" />
                      Reset
                    </button>
                  </div>
                  <div className="col-6">
                    <button
                      type="button"
                      className="btn btn-info d-flex align-items-center justify-content-center w-100 mb-2"
                      disabled={cart.length === 0}
                      onClick={() => void holdCurrentBill()}
                    >
                      <i className="ti ti-player-pause me-2" />
                      Hold
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="block-section payment-method">
                <h5 className="mb-2">{t('counter.selectPayment', "Select Payment")}</h5>
                <div className="row align-items-center justify-content-center methods g-2 mb-2">
                  <div className="col d-flex">
                    <button
                      type="button"
                      ref={paymentCashRef}
                      onMouseDown={() => setPaymentMethod('Cash')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPaymentMethod('Cash');
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
                      <p className="fw-medium">{t('counter.cash', "Cash")}</p>
                    </button>
                  </div>
                  <div className="col d-flex">
                    <button
                      type="button"
                      ref={paymentCardRef}
                      onMouseDown={() => setPaymentMethod('Card')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPaymentMethod('Card');
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
                      <p className="fw-medium">{t('counter.card', "Card")}</p>
                    </button>
                  </div>
                  <div className="col d-flex">
                    <button
                      type="button"
                      ref={paymentCreditRef}
                      onMouseDown={() => {
                        if (!hasRegisteredCustomer) {
                          Swal.fire({
                            icon: 'info',
                            title: 'Credit not available',
                            text: 'This option is not available for walk-in customers. First choose any registered customer to proceed with this option.',
                          });
                          return;
                        }
                        setPaymentMethod('Credit');
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
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
                      }}
                      className={`payment-item flex-fill${paymentMethod === 'Credit' ? ' active' : ''}`}
                    >
                      <i className="ti ti-file-invoice fs-28 text-teal d-block mb-1" aria-hidden />
                      <p className="fw-medium">{t('counter.credit', "Credit")}</p>
                    </button>
                  </div>
                </div>
                {paymentMethod === 'Cash' && cart.length > 0 && (
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">{t('counter.cashGiven', "Cash given")}</span>
                      <input type="number" min={0} className="form-control" value={cashGiven} placeholder={String(grandTotal)}
                        aria-label="Cash given" onChange={(e) => setCashGiven(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handlePay(); } }} />
                    </div>
                    {change > 0 && <span className="badge bg-success fs-13 text-nowrap">Change Rs {fmt(change)}</span>}
                  </div>
                )}
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

      {/* ── Receipt after a sale ── */}
      <Modal show={!!receipt} title={receipt ? `Bill ${receipt.sale.reference}` : ''} size="lg"
        onClose={() => { setReceipt(null); window.setTimeout(() => searchInputRef.current?.focus(), 0); }}>
        {receipt && (
          <PharmacyReceipt sale={receipt.sale} settings={settings} cashGiven={receipt.cashGiven} customerPhone={receipt.phone}
            onClose={() => { setReceipt(null); window.setTimeout(() => searchInputRef.current?.focus(), 0); }} />
        )}
      </Modal>

      {/* ── Held bills ── */}
      <Modal show={showHeld} title="Held bills" onClose={() => setShowHeld(false)} size="lg">
        {heldBills.length === 0 ? (
          <p className="text-muted mb-0">No bills on hold. Use Hold (F4) to park a bill while a customer is away.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>{t('counter.bill', "Bill")}</th><th>{t('counter.customer', "Customer")}</th><th>{t('counter.heldBy', "Held by")}</th><th>{t('counter.time', "Time")}</th><th className="text-end">{t('counter.total', "Total")}</th><th /></tr></thead>
              <tbody>
                {heldBills.map((b) => (
                  <tr key={b.id}>
                    <td className="fw-medium">{b.label}</td>
                    <td>{b.customerName || 'Walk-in'}</td>
                    <td>{b.userName}</td>
                    <td>{new Date(b.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="text-end">Rs {fmt(b.total)}</td>
                    <td className="text-end text-nowrap">
                      <button type="button" className="btn btn-sm btn-primary me-1" onClick={() => void recallBill(b)}>{t('counter.recall', "Recall")}</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Discard ${b.label}`}
                        onClick={async () => {
                          const r = await Swal.fire({ icon: 'warning', title: `Discard "${b.label}"?`, showCancelButton: true, confirmButtonText: 'Discard' });
                          if (!r.isConfirmed) return;
                          await pharmacyService.deleteHeldBill(b.id).catch(() => undefined);
                          setHeldBills((h) => h.filter((x) => x.id !== b.id));
                        }}><i className="ti ti-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ── Substitutes for an out-of-stock brand ── */}
      <Modal show={!!substitutes} title="Out of stock: same medicine, other brands" onClose={() => setSubstitutes(null)} size="lg">
        {substitutes && (
          <>
            <p className="mb-3">{substitutes.forName} is out of stock. These brands have the same salt and strength:</p>
            <div className="list-group">
              {substitutes.list.map((s) => (
                <button key={s.id} type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  onClick={() => { const p = products.find((x) => String(x.id) === String(s.id)) ?? s; setSubstitutes(null); addToCart(p); }}>
                  <span>
                    <span className="fw-medium">{s.productName}{s.strength ? ` ${s.strength}` : ''}</span>
                    <span className="text-muted fs-12 ms-2">{(s as any).manufacturer || s.brand || ''}</span>
                  </span>
                  <span className="text-nowrap">Rs {fmt(s.price)} · <span className="text-success">{s.quantity} in stock</span></span>
                </button>
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* ── Till open / close ── */}
      <Modal show={tillDialog === 'open'} title="Open till" size="sm" onClose={() => setTillDialog(null)}>
        <label className="form-label" htmlFor="till-open-cash">{t('counter.openingCashRs', "Opening cash in drawer (Rs)")}</label>
        <input id="till-open-cash" type="number" min={0} className="form-control mb-3" value={tillCash} autoFocus
          onChange={(e) => setTillCash(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void openTill(); }} />
        <button type="button" className="btn btn-primary w-100" onClick={() => void openTill()}>{t('counter.openTill', "Open till")}</button>
      </Modal>

      <Modal show={tillDialog === 'close' && !!till} title="Close shift" onClose={() => setTillDialog(null)}>
        {till && (
          <>
            <table className="table table-sm mb-3">
              <tbody>
                <tr><td>{t('counter.opened', "Opened")}</td><td className="text-end">{new Date(till.openedAt).toLocaleString('en-GB')}</td></tr>
                <tr><td>{t('counter.bills', "Bills")}</td><td className="text-end">{till.bills}</td></tr>
                <tr><td>{t('counter.openingCash', "Opening cash")}</td><td className="text-end">Rs {fmt(till.openingCash)}</td></tr>
                <tr><td>{t('counter.cashSales', "Cash sales")}</td><td className="text-end">Rs {fmt(till.cashSales)}</td></tr>
                <tr><td>{t('counter.cashRefunds', "Cash refunds")}</td><td className="text-end">- Rs {fmt(till.cashRefunds)}</td></tr>
                <tr className="fw-bold"><td>{t('counter.expectedCash', "Expected cash in drawer")}</td><td className="text-end">Rs {fmt(till.expectedCash)}</td></tr>
                <tr><td>{t('counter.card', "Card")}</td><td className="text-end">Rs {fmt(till.cardSales)}</td></tr>
                <tr><td>{t('counter.creditOnAccount', "Credit (on account)")}</td><td className="text-end">Rs {fmt(till.creditSales)}</td></tr>
              </tbody>
            </table>
            <label className="form-label" htmlFor="till-count">{t('counter.cashCounted', "Cash counted (Rs)")}</label>
            <input id="till-count" type="number" min={0} className="form-control mb-2" value={tillCash} autoFocus
              onChange={(e) => setTillCash(e.target.value)} />
            {tillCash !== '' && (
              <p className={`mb-2 ${Math.abs(Number(tillCash) - till.expectedCash) < 1 ? 'text-success' : 'text-danger'}`}>
                {Math.abs(Number(tillCash) - till.expectedCash) < 1
                  ? 'Cash matches.'
                  : `Difference Rs ${fmt(Number(tillCash) - till.expectedCash)} (${Number(tillCash) < till.expectedCash ? 'short' : 'over'})`}
              </p>
            )}
            <textarea className="form-control mb-3" rows={2} placeholder={t('counter.notesOptional', "Notes (optional)")} value={tillNotes}
              onChange={(e) => setTillNotes(e.target.value)} aria-label="Notes" />
            <button type="button" className="btn btn-danger w-100" onClick={() => void closeTill()} disabled={tillCash === ''}>{t('counter.closeTill', "Close till")}</button>
          </>
        )}
      </Modal>
    </div>
  );
};

export default POS;
