import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import ReportTable from '../../components/pharmacy/ReportTable';
import { LocationSelect, ProductSearch, useLocations } from '../../components/suite/Pickers';
import suite, { Movement } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

const TYPES = ['Purchase', 'Sale', 'SaleReturn', 'PurchaseReturn', 'Adjustment', 'WriteOff', 'TransferOut', 'TransferIn', 'Production', 'Consumption', 'OnlineOrder', 'Opening', 'StockEntry'];
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

/** Every stock movement with the document behind it. */
const StockLedger: React.FC = () => {
  const locations = useLocations(true);
  const [product, setProduct] = useState<{ id: number; productName: string } | null>(null);
  const [locationId, setLocationId] = useState<number | ''>('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(daysAgo(0));
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [recon, setRecon] = useState<{ mismatched: number; rows: { id: number; productName: string; total: number; inBatches: number }[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await suite.movements({ productId: product?.id, locationId: locationId || undefined, type: type || undefined, from, to, take: 2000 }));
    } catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
    finally { setLoading(false); }
  }, [product, locationId, type, from, to]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { suite.reconcile().then(setRecon).catch(() => setRecon(null)); }, []);

  const totalIn = rows.filter((r) => r.quantity > 0).reduce((s, r) => s + r.quantity, 0);
  const totalOut = rows.filter((r) => r.quantity < 0).reduce((s, r) => s - r.quantity, 0);

  return (
    <>
      <PageHeader title="Stock Ledger" subtitle="Every stock change, by product, branch and document." breadcrumbs={[{ title: 'Stock' }, { title: 'Stock Ledger' }]} />
      {recon && (recon.mismatched === 0
        ? <div className="alert alert-success py-2">Every product's total matches its batches.</div>
        : <div className="alert alert-warning py-2">{recon.mismatched} product(s) do not match their batches: {recon.rows.slice(0, 5).map((r) => `${r.productName} (total ${r.total}, batches ${r.inBatches})`).join('; ')}</div>)}
      <ReportTable title="Stock ledger" filename="stock-ledger" rows={rows} loading={loading}
        summary={[{ label: 'In', value: totalIn }, { label: 'Out', value: totalOut }, { label: 'Net', value: totalIn - totalOut }]}
        toolbar={<>
          <div style={{ width: 240 }}>{product
            ? <div className="input-group input-group-sm"><span className="form-control">{product.productName}</span><button type="button" className="btn btn-outline-secondary" onClick={() => setProduct(null)} aria-label="Clear product"><i className="ti ti-x" /></button></div>
            : <ProductSearch onPick={setProduct} placeholder="All products" />}</div>
          <div style={{ width: 170 }}><LocationSelect locations={locations} value={locationId} onChange={setLocationId} allowAll="All locations" className="form-select form-select-sm" /></div>
          <select className="form-select form-select-sm" style={{ width: 150 }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Movement type">
            <option value="">All movements</option>{TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
          <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        </>}
        columns={[
          { key: 'createdAt', label: 'When', value: (r) => new Date(r.createdAt + (r.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString() },
          { key: 'productName', label: 'Product' },
          { key: 'location', label: 'Location' },
          { key: 'batchNo', label: 'Batch' },
          { key: 'movementType', label: 'Type' },
          { key: 'reference', label: 'Document' },
          { key: 'quantity', label: 'Qty', align: 'end', render: (r) => <span className={r.quantity < 0 ? 'text-danger' : 'text-success'}>{r.quantity > 0 ? `+${r.quantity}` : r.quantity}</span> },
          { key: 'unitCost', label: 'Unit cost', align: 'end', value: (r) => r.unitCost.toFixed(2) },
          { key: 'createdBy', label: 'By' },
        ]} />
    </>
  );
};

export default StockLedger;
