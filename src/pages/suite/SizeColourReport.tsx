import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import ReportTable from '../../components/pharmacy/ReportTable';
import { LocationSelect, useLocations } from '../../components/suite/Pickers';
import suite from '../../services/suiteService';
import { apiError } from '../../services/pharmacyService';

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
type Row = { value: string; units: number; sales: number; margin: number };

/** Which colours and sizes sell, across all articles. */
const SizeColourReport: React.FC = () => {
  const locations = useLocations();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));
  const [locationId, setLocationId] = useState<number | ''>('');
  const [data, setData] = useState<{ byFirst: Row[]; bySecond: Row[] } | null>(null);

  const load = useCallback(async () => {
    try { setData(await suite.variantReport(from, to, locationId || undefined)); }
    catch (err) { Swal.fire({ icon: 'error', title: 'Could not load', text: apiError(err) }); }
  }, [from, to, locationId]);
  useEffect(() => { void load(); }, [load]);

  const cols = (label: string) => [
    { key: 'value', label },
    { key: 'units', label: 'Units sold', align: 'end' as const, total: true },
    { key: 'sales', label: 'Sales (Rs)', align: 'end' as const, money: true, total: true },
    { key: 'margin', label: 'Margin (Rs)', align: 'end' as const, money: true, total: true },
  ];
  const toolbar = <>
    <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
    <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
    <div style={{ width: 170 }}><LocationSelect locations={locations} value={locationId} onChange={setLocationId} allowAll="All branches" className="form-select form-select-sm" /></div>
  </>;

  return (
    <>
      <PageHeader title="Size & Colour Sales" subtitle="Sales by the first option (usually colour) and the second (usually size) of every article." breadcrumbs={[{ title: 'Reports' }, { title: 'Size & Colour Sales' }]} />
      <div className="row g-3">
        <div className="col-lg-6"><ReportTable title="By colour" filename="sales-by-colour" columns={cols('Colour / option 1')} rows={data?.byFirst ?? []} toolbar={toolbar} /></div>
        <div className="col-lg-6"><ReportTable title="By size" filename="sales-by-size" columns={cols('Size / option 2')} rows={data?.bySecond ?? []} /></div>
      </div>
    </>
  );
};

export default SizeColourReport;
