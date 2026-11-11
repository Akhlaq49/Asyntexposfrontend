import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import ReportTable, { Column, expiryBadge, money } from '../../components/pharmacy/ReportTable';
import pharmacyService, { ProductBatch, apiError } from '../../services/pharmacyService';

interface Bucket { name: string; batches: number; products: number; units: number; costValue: number; retailValue: number }

const NearExpiry: React.FC = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(90);
  const [includeExpired, setIncludeExpired] = useState(true);
  const [manufacturer, setManufacturer] = useState('');
  const [supplier, setSupplier] = useState('');
  const [rows, setRows] = useState<ProductBatch[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, summary] = await Promise.all([
        pharmacyService.getExpiring({ days, includeExpired, manufacturer: manufacturer || undefined, supplier: supplier || undefined }),
        pharmacyService.report<{ buckets: Bucket[] }>('expiry-summary'),
      ]);
      setRows(list);
      setBuckets(summary.buckets);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load expiry list', text: apiError(err) });
    } finally {
      setLoading(false);
    }
  }, [days, includeExpired, manufacturer, supplier]);

  useEffect(() => { void load(); }, [load]);

  const editBatch = async (b: ProductBatch) => {
    const { value, isConfirmed } = await Swal.fire({
      title: `${b.productName} · batch ${b.batchNo}`,
      html:
        `<label class="form-label w-100 text-start">Batch number<input id="sw-batch" class="form-control" value="${b.batchNo.replace(/"/g, '&quot;')}"></label>` +
        `<label class="form-label w-100 text-start mt-2">Expiry date<input id="sw-exp" type="date" class="form-control" value="${b.expiryDate ?? ''}"></label>`,
      showCancelButton: true,
      confirmButtonText: 'Save',
      preConfirm: () => ({
        batchNo: (document.getElementById('sw-batch') as HTMLInputElement).value,
        expiryDate: (document.getElementById('sw-exp') as HTMLInputElement).value,
      }),
    });
    if (!isConfirmed || !value) return;
    try {
      await pharmacyService.updateBatch(b.id, value);
      void load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) });
    }
  };

  const writeOff = async (b: ProductBatch) => {
    const { value, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `Write off ${b.productName}?`,
      html:
        `<p class="mb-2">Batch ${b.batchNo}, ${b.quantity} in stock (cost Rs ${money(b.stockValue)}). The stock is removed and recorded as a stock adjustment.</p>` +
        `<label class="form-label w-100 text-start">Quantity<input id="sw-qty" type="number" min="1" max="${b.quantity}" class="form-control" value="${b.quantity}"></label>` +
        `<label class="form-label w-100 text-start mt-2">Reason<select id="sw-reason" class="form-select"><option>Expired write-off</option><option>Damage</option><option>Breakage</option><option>Other</option></select></label>`,
      showCancelButton: true,
      confirmButtonText: 'Write off',
      confirmButtonColor: '#d33',
      preConfirm: () => ({
        quantity: Number((document.getElementById('sw-qty') as HTMLInputElement).value),
        reason: (document.getElementById('sw-reason') as HTMLSelectElement).value,
      }),
    });
    if (!isConfirmed || !value) return;
    try {
      await pharmacyService.writeOffBatch(b.id, value);
      void load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not write off', text: apiError(err) });
    }
  };

  const columns: Column<ProductBatch>[] = [
    { key: 'productName', label: 'Medicine', render: (r) => <><div className="fw-medium">{r.productName}</div><div className="fs-12 text-muted">{r.genericName}</div></> },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'expiryDate', label: 'Expiry' },
    { key: 'daysToExpiry', label: 'Status', render: (r) => expiryBadge(r.expiryStatus, r.daysToExpiry), value: (r) => r.daysToExpiry ?? '' },
    { key: 'quantity', label: 'Qty', align: 'end', total: true },
    { key: 'stockValue', label: 'Cost value (Rs)', align: 'end', money: true, total: true },
    { key: 'retail', label: 'Retail value (Rs)', align: 'end', money: true, total: true, value: (r) => r.quantity * r.retailPrice },
    { key: 'supplier', label: 'Supplier' },
    {
      key: 'actions', label: '', value: () => '',
      render: (r) => (
        <div className="d-flex gap-1 justify-content-end text-nowrap">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void editBatch(r)} title="Correct batch or expiry"><i className="ti ti-edit" /></button>
          <button type="button" className="btn btn-sm btn-outline-primary" title="Return to supplier"
            onClick={() => navigate(`/purchase-returns?productId=${r.productId}&batchId=${r.id}&supplier=${encodeURIComponent(r.supplier || '')}`)}>
            <i className="ti ti-truck-return" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void writeOff(r)} title="Write off"><i className="ti ti-trash" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
        <PageHeader title="Near Expiry" subtitle="Batches expiring soon, earliest first. Sell, discount or return them before they expire." breadcrumbs={[{ title: 'Inventory' }]} />

        <div className="row g-3 mb-3">
          {buckets.map((b, i) => (
            <div className="col-6 col-xl-3" key={b.name}>
              <div className={`card mb-0 border-start border-3 ${i === 0 ? 'border-danger' : i === 1 ? 'border-danger' : i === 2 ? 'border-warning' : 'border-info'}`}>
                <div className="card-body py-3">
                  <div className="text-muted fs-12">{b.name}</div>
                  <div className="fs-18 fw-bold">Rs {money(b.costValue)}</div>
                  <div className="fs-12">{b.products} medicines · {b.batches} batches · {b.units} units</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <ReportTable
          title="Near Expiry"
          filename="near-expiry"
          columns={columns}
          rows={rows}
          loading={loading}
          rowKey={(r) => r.id}
          rowClassName={(r) => (r.expiryStatus === 'Expired' ? 'table-danger' : '')}
          empty="No batches expire in this window."
          toolbar={(
            <>
              <select className="form-select form-select-sm" style={{ width: 150 }} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Window">
                <option value={30}>Next 30 days</option>
                <option value={60}>Next 60 days</option>
                <option value={90}>Next 90 days</option>
                <option value={180}>Next 6 months</option>
                <option value={365}>Next 12 months</option>
              </select>
              <input className="form-control form-control-sm" style={{ width: 150 }} placeholder="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
              <input className="form-control form-control-sm" style={{ width: 150 }} placeholder="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              <label className="form-check mb-0 d-flex align-items-center gap-1">
                <input type="checkbox" className="form-check-input mt-0" checked={includeExpired} onChange={(e) => setIncludeExpired(e.target.checked)} />
                <span className="fs-13">Include expired</span>
              </label>
            </>
          )}
        />
    </>
  );
};

export default NearExpiry;
