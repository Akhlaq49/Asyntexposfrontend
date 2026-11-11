import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import suite, { PriceLevel } from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';
import LevelPricesPanel from '../../components/suite/LevelPricesPanel';
import { ProductSearch } from '../../components/suite/Pickers';

/** Retail, wholesale and distributor price lists. Prices per product are set here or on the product page. */
const PriceLevels: React.FC = () => {
  const [levels, setLevels] = useState<PriceLevel[]>([]);
  const [product, setProduct] = useState<{ id: number; productName: string; price: number } | null>(null);

  const load = useCallback(async () => {
    try { setLevels(await suite.priceLevels()); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const edit = async (l?: PriceLevel) => {
    const { value, isConfirmed } = await Swal.fire({
      title: l ? `Rename ${l.name}` : 'New price level', input: 'text', inputValue: l?.name ?? '', showCancelButton: true,
      inputValidator: (v) => (!v?.trim() ? 'Enter a name' : undefined),
    });
    if (!isConfirmed) return;
    try { await suite.savePriceLevel(l?.id ?? null, { name: value, isDefault: l?.isDefault ?? false }); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err) }); }
  };

  const remove = async (l: PriceLevel) => {
    const ok = await Swal.fire({ icon: 'warning', title: `Delete ${l.name}?`, text: 'Its product prices are removed too.', showCancelButton: true });
    if (!ok.isConfirmed) return;
    try { await suite.deletePriceLevel(l.id); void load(); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not delete', text: apiError(err) }); }
  };

  return (
    <>
      <PageHeader title="Price Levels" subtitle="Wholesale and distributor prices. A customer on a level gets that price at the counter."
        breadcrumbs={[{ title: 'Sales' }, { title: 'Price Levels' }]}
        actions={<button type="button" className="btn btn-primary" onClick={() => void edit()}><i className="ti ti-plus me-1" />Add level</button>} />
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-body p-0">
              <table className="table mb-0 align-middle">
                <thead><tr><th>Level</th><th className="text-end">Prices</th><th className="text-end">Customers</th><th /></tr></thead>
                <tbody>
                  {levels.map((l) => (
                    <tr key={l.id}>
                      <td>{l.name}{l.isDefault && <span className="badge bg-light text-dark ms-2">Default</span>}</td>
                      <td className="text-end">{l.prices}</td><td className="text-end">{l.customers}</td>
                      <td className="text-end text-nowrap">
                        <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => void edit(l)} aria-label={`Rename ${l.name}`}><i className="ti ti-edit" /></button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void remove(l)} aria-label={`Delete ${l.name}`}><i className="ti ti-trash" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-muted fs-12 mt-2">Assign a customer to a level from Customer Accounts → Terms.</p>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header"><ProductSearch onPick={(p) => setProduct({ id: p.id, productName: p.productName, price: p.price })} placeholder="Pick a product to set its level prices" /></div>
            <div className="card-body">
              {product
                ? <LevelPricesPanel productId={product.id} productName={product.productName} retailPrice={product.price} levels={levels} onSaved={() => void load()} />
                : <p className="text-muted mb-0">Choose a product above.</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PriceLevels;
