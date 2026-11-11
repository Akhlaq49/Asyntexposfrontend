import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import PharmacyReceipt from '../../components/PharmacyReceipt';
import pharmacyService, { PharmacySettings, SaleDetail, apiError } from '../../services/pharmacyService';
import { getCustomers } from '../../services/customerService';

/** Reprint any bill: /pos-receipt/:id */
const ReceiptPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [phone, setPhone] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [s, cfg] = await Promise.all([pharmacyService.getSale(id), pharmacyService.getSettings().catch(() => null)]);
        setSale(s);
        setSettings(cfg);
        if (s.customerId) {
          const list = await getCustomers().catch(() => []);
          setPhone(list.find((c) => String(c.id) === String(s.customerId))?.phone || '');
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Bill not found', text: apiError(err) });
      }
    })();
  }, [id]);

  const resendFbr = async () => {
    if (!sale) return;
    setResending(true);
    try {
      const r = await pharmacyService.resendFbr(sale.id);
      setSale({ ...sale, fbrInvoiceNumber: r.fbrInvoiceNumber, fbrStatus: 'Sent' });
      Swal.fire({ icon: 'success', title: 'Sent to FBR', text: r.fbrInvoiceNumber });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'FBR did not accept the bill', text: apiError(err) });
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <PageHeader
        title={sale ? `Bill ${sale.reference}` : 'Bill'}
        subtitle="Reprint the receipt or send it to the customer"
        breadcrumbs={[{ title: 'Sales' }]}
        actions={(
          <div className="d-flex gap-2">
            {sale && settings?.fbrEnabled && !sale.fbrInvoiceNumber && (
              <button type="button" className="btn btn-warning" onClick={() => void resendFbr()} disabled={resending}>
                {resending && <span className="spinner-border spinner-border-sm me-1" />}Send to FBR
              </button>
            )}
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Back</button>
          </div>
        )}
      />
      <div className="card">
        <div className="card-body">
          {sale ? <PharmacyReceipt sale={sale} settings={settings} customerPhone={phone} /> : <div className="text-center py-5"><span className="spinner-border" /></div>}
        </div>
      </div>
    </>
  );
};

export default ReceiptPage;
