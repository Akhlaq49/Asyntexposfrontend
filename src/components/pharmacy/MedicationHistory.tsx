import React, { useEffect, useState } from 'react';
import pharmacyService from '../../services/pharmacyService';

interface Row {
  productId: number;
  productName: string;
  genericName: string;
  timesBought: number;
  totalQuantity: number;
  lastBought: string;
  nextRefill: string | null;
  lastDoctor: string | null;
}

/** What a customer buys regularly, with the next refill date where the medicine has one. */
const MedicationHistory: React.FC<{ customerId: string | number }> = ({ customerId }) => {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    setRows(null);
    pharmacyService.report<Row[]>(`customer-medication/${customerId}`).then(setRows).catch(() => setRows([]));
  }, [customerId]);

  if (rows === null) return <div className="text-center py-2"><span className="spinner-border spinner-border-sm" /></div>;
  if (rows.length === 0) return <p className="text-muted fs-13 mb-0">No purchases on record yet.</p>;

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0 fs-13">
        <thead><tr><th>Medicine</th><th className="text-end">Times</th><th>Last bought</th><th>Next refill</th></tr></thead>
        <tbody>
          {rows.slice(0, 12).map((r) => (
            <tr key={r.productId}>
              <td>{r.productName}{r.lastDoctor && <div className="text-muted fs-11">Dr. {r.lastDoctor}</div>}</td>
              <td className="text-end">{r.timesBought}</td>
              <td>{r.lastBought}</td>
              <td className={r.nextRefill && r.nextRefill <= today ? 'text-danger fw-medium' : ''}>{r.nextRefill ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MedicationHistory;
