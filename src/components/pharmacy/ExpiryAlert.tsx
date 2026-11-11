import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import pharmacyService from '../../services/pharmacyService';
import { money } from './ReportTable';

interface Bucket { name: string; batches: number; products: number; units: number; costValue: number; retailValue: number }

/** Dashboard banner: stock that has expired or expires within the alert windows. Hidden when there is none. */
const ExpiryAlert: React.FC = () => {
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);

  useEffect(() => {
    pharmacyService.report<{ buckets: Bucket[] }>('expiry-summary')
      .then((d) => setBuckets(d.buckets))
      .catch(() => setBuckets(null));
  }, []);

  if (!buckets || buckets.every((b) => b.batches === 0)) return null;
  const [expired, critical, ...later] = buckets;
  const urgent = expired.batches > 0 || critical.batches > 0;

  return (
    <div className={`alert ${urgent ? 'alert-danger' : 'alert-warning'} d-flex flex-wrap align-items-center gap-3 mb-4`} role="alert">
      <i className="ti ti-calendar-exclamation fs-24" aria-hidden />
      <div className="flex-fill">
        <div className="fw-bold mb-1">Expiry check</div>
        <div className="d-flex flex-wrap gap-3 fs-13">
          {[expired, critical, ...later].filter((b) => b.batches > 0).map((b) => (
            <span key={b.name}><b>{b.name}:</b> {b.products} medicines, Rs {money(b.costValue)} at cost</span>
          ))}
        </div>
      </div>
      <Link to="/near-expiry" className={`btn btn-sm ${urgent ? 'btn-danger' : 'btn-warning'}`}>Review batches</Link>
    </div>
  );
};

export default ExpiryAlert;
