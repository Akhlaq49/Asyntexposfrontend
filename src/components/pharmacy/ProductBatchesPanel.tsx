import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import pharmacyService, { ProductBatch, apiError } from '../../services/pharmacyService';
import { expiryBadge, money } from './ReportTable';

/** Batches of one product with expiry, stock and cost; lets staff fix an expiry or write a batch off. */
const ProductBatchesPanel: React.FC<{ productId: string; showCost?: boolean }> = ({ productId, showCost = true }) => {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBatches(await pharmacyService.getBatches(productId)); } catch { setBatches([]); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { if (productId) void load(); }, [productId, load]);

  const edit = async (b: ProductBatch) => {
    const { value, isConfirmed } = await Swal.fire({
      title: `Batch ${b.batchNo}`,
      html:
        `<label class="form-label w-100 text-start">Batch number<input id="pb-no" class="form-control" value="${b.batchNo.replace(/"/g, '&quot;')}"></label>` +
        `<label class="form-label w-100 text-start mt-2">Expiry date<input id="pb-exp" type="date" class="form-control" value="${b.expiryDate ?? ''}"></label>`,
      showCancelButton: true, confirmButtonText: 'Save',
      preConfirm: () => ({ batchNo: (document.getElementById('pb-no') as HTMLInputElement).value, expiryDate: (document.getElementById('pb-exp') as HTMLInputElement).value }),
    });
    if (!isConfirmed || !value) return;
    try { await pharmacyService.updateBatch(b.id, value); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  const writeOff = async (b: ProductBatch) => {
    const r = await Swal.fire({ icon: 'warning', title: `Write off batch ${b.batchNo}?`, text: `${b.quantity} units will be removed from stock.`, showCancelButton: true, confirmButtonText: 'Write off', confirmButtonColor: '#d33' });
    if (!r.isConfirmed) return;
    try { await pharmacyService.writeOffBatch(b.id, { reason: b.expiryStatus === 'Expired' ? 'Expired write-off' : 'Other' }); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not write off', text: apiError(err) }); }
  };

  return (
    <div className="accordion-item border mb-4">
      <h2 className="accordion-header">
        <div className="accordion-button bg-white">
          <h5 className="d-flex align-items-center mb-0"><i className="ti ti-stack-2 text-primary me-2" /><span>Batches in stock</span></h5>
        </div>
      </h2>
      <div className="accordion-collapse collapse show">
        <div className="accordion-body border-top p-0">
          {loading ? <div className="text-center py-3"><span className="spinner-border spinner-border-sm" /></div> : batches.length === 0 ? (
            <p className="text-muted p-3 mb-0">No batches yet. Stock received through purchases is recorded here with its batch number and expiry.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0 align-middle">
                <thead><tr><th>Batch</th><th>Expiry</th><th>Status</th><th className="text-end">Qty</th>{showCost && <th className="text-end">Cost / unit</th>}<th>Supplier</th><th /></tr></thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className={b.quantity === 0 ? 'text-muted' : ''}>
                      <td>{b.batchNo}</td>
                      <td>{b.expiryDate ?? '—'}</td>
                      <td>{expiryBadge(b.expiryStatus, b.daysToExpiry)}</td>
                      <td className="text-end">{b.quantity}</td>
                      {showCost && <td className="text-end">{money(b.purchasePrice)}</td>}
                      <td>{b.supplier}</td>
                      <td className="text-end text-nowrap">
                        <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => void edit(b)} aria-label={`Edit batch ${b.batchNo}`}><i className="ti ti-edit" /></button>
                        {b.quantity > 0 && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void writeOff(b)} aria-label={`Write off batch ${b.batchNo}`}><i className="ti ti-trash" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductBatchesPanel;
