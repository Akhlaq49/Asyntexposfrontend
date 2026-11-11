import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import suite, { Location } from '../../services/suiteService';

export interface PickedProduct {
  id: number;
  productName: string;
  sku?: string;
  genericName?: string;
  quantity: number;
  price: number;
  purchasePrice?: number;
  hasVariants?: boolean;
  unit?: string;
}

/** Loads the location list once per page. */
export function useLocations(includeInactive = false) {
  const [locations, setLocations] = useState<Location[]>([]);
  useEffect(() => {
    suite.locations(includeInactive).then(setLocations).catch(() => setLocations([]));
  }, [includeInactive]);
  return locations;
}

interface LocationSelectProps {
  value: number | '' | null | undefined;
  onChange: (id: number | '') => void;
  locations: Location[];
  allowAll?: string;
  className?: string;
  disabled?: boolean;
  types?: string[];
  ariaLabel?: string;
}

export const LocationSelect: React.FC<LocationSelectProps> = ({ value, onChange, locations, allowAll, className, disabled, types, ariaLabel }) => (
  <select className={className ?? 'form-select'} value={value ?? ''} disabled={disabled} aria-label={ariaLabel ?? 'Location'}
    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
    {allowAll !== undefined && <option value="">{allowAll}</option>}
    {locations.filter((l) => !types || types.includes(l.type)).map((l) => (
      <option key={l.id} value={l.id}>{l.name}{l.isDefault ? ' (default)' : ''}</option>
    ))}
  </select>
);

interface ProductSearchProps {
  onPick: (p: PickedProduct) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Type-ahead over the product list (name, generic, SKU, barcode). */
export const ProductSearch: React.FC<ProductSearchProps> = ({ onPick, placeholder, autoFocus }) => {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PickedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setRows([]); return; }
    timer.current = window.setTimeout(async () => {
      try {
        const res = await api.get('/products', { params: { page: 1, pageSize: 15, search: q.trim() } });
        const items = (res.data?.items ?? res.data ?? []) as any[];
        setRows(items.map((p) => ({
          id: Number(p.id), productName: p.productName, sku: p.sku, genericName: p.genericName, quantity: p.quantity,
          price: Number(p.price) || 0, purchasePrice: Number(p.purchasePrice) || 0, hasVariants: p.hasVariants, unit: p.unit,
        })));
        setOpen(true);
      } catch { setRows([]); }
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  return (
    <div className="position-relative">
      <input className="form-control" value={q} placeholder={placeholder ?? 'Search product by name, generic or SKU'} autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)} onFocus={() => rows.length && setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        aria-label="Search product" />
      {open && rows.length > 0 && (
        <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 1060, maxHeight: 280, overflowY: 'auto' }}>
          {rows.map((r) => (
            <button key={r.id} type="button" className="list-group-item list-group-item-action py-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(r); setQ(''); setRows([]); setOpen(false); }}>
              <div className="d-flex justify-content-between">
                <span>{r.productName}{r.genericName ? <span className="text-muted fs-12"> · {r.genericName}</span> : null}</span>
                <span className="text-muted fs-12">stock {r.quantity}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Draft: 'bg-secondary', Submitted: 'bg-info', Dispatched: 'bg-warning text-dark', Approved: 'bg-primary', Received: 'bg-success',
    Fulfilled: 'bg-success', Rejected: 'bg-danger', Cancelled: 'bg-dark', Completed: 'bg-success', InProgress: 'bg-warning text-dark',
    Active: 'bg-success', Paused: 'bg-secondary', Error: 'bg-danger', Pending: 'bg-info', Sent: 'bg-success', Failed: 'bg-danger',
    Imported: 'bg-primary', New: 'bg-danger', Preparing: 'bg-warning text-dark', Ready: 'bg-success', Served: 'bg-secondary',
    Free: 'bg-success', Occupied: 'bg-danger', Reserved: 'bg-warning text-dark',
  };
  return <span className={`badge ${map[status] ?? 'bg-light text-dark'}`}>{status === 'InProgress' ? 'In progress' : status}</span>;
};
