import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import PageHeader from '../../components/common/PageHeader';
import pharmacyService, { PharmacySettings, apiError } from '../../services/pharmacyService';

const blank: PharmacySettings = {
  pharmacyName: '', address: '', phone: '', drugLicenceNo: '', ntn: '', strn: '', receiptFooter: '',
  defaultTaxPercent: 0, maxCashierDiscountPercent: 10, expiryAlertDays1: 90, expiryAlertDays2: 60, expiryAlertDays3: 30,
  requirePrescription: true, refillRemindersEnabled: false, fbrEnabled: false, fbrPosId: '', fbrToken: '', fbrEnvironment: 'Sandbox', receiptLanguage: 'en', blockOverCreditLimit: true,
};

const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode; col?: string }> = ({ id, label, hint, children, col = 'col-md-6' }) => (
  <div className={col}>
    <label className="form-label" htmlFor={id}>{label}</label>
    {children}
    {hint && <div className="form-text">{hint}</div>}
  </div>
);

const PharmacySettingsPage: React.FC = () => {
  const [s, setS] = useState<PharmacySettings>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    pharmacyService.getSettings()
      .then((v) => setS({ ...blank, ...v }))
      .catch((err) => Swal.fire({ icon: 'error', title: 'Could not load settings', text: apiError(err) }))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof PharmacySettings>(k: K, v: PharmacySettings[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const text = (k: keyof PharmacySettings) => ({ id: `ps-${k}`, className: 'form-control', value: String(s[k] ?? ''), onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value as never) });
  const num = (k: keyof PharmacySettings) => ({ id: `ps-${k}`, type: 'number', min: 0, className: 'form-control', value: String(s[k] ?? 0), onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never) });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.pharmacyName.trim()) { Swal.fire({ icon: 'info', title: 'Enter the pharmacy name' }); return; }
    if (!(s.expiryAlertDays1 >= s.expiryAlertDays2 && s.expiryAlertDays2 >= s.expiryAlertDays3)) {
      Swal.fire({ icon: 'info', title: 'Check the expiry alerts', text: 'The first alert must be the longest, e.g. 90, 60, 30 days.' });
      return;
    }
    setSaving(true);
    try {
      setS({ ...blank, ...(await pharmacyService.saveSettings(s)) });
      Swal.fire({ icon: 'success', title: 'Settings saved', timer: 1400, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not save', text: apiError(err, 'Only an admin can change these settings.') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-5"><span className="spinner-border" /></div>;

  return (
    <>
      <PageHeader title="Pharmacy Settings" subtitle="Receipt details, tax, discount limits, expiry alerts and FBR" breadcrumbs={[{ title: 'Settings' }]} />
      <form onSubmit={save}>
        <div className="card">
          <div className="card-header"><h5 className="mb-0">Receipt header</h5></div>
          <div className="card-body row g-3">
            <Field id="ps-pharmacyName" label="Pharmacy name"><input {...text('pharmacyName')} required /></Field>
            <Field id="ps-phone" label="Phone"><input {...text('phone')} /></Field>
            <Field id="ps-address" label="Address" col="col-12"><input {...text('address')} /></Field>
            <Field id="ps-drugLicenceNo" label="Drug licence number" col="col-md-4"><input {...text('drugLicenceNo')} /></Field>
            <Field id="ps-ntn" label="NTN" col="col-md-4"><input {...text('ntn')} /></Field>
            <Field id="ps-strn" label="STRN" col="col-md-4"><input {...text('strn')} /></Field>
            <Field id="ps-receiptFooter" label="Receipt footer" col="col-12" hint="Printed at the bottom of every receipt, e.g. your return policy.">
              <input {...text('receiptFooter')} placeholder="Medicines once sold are returned only with this bill." />
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h5 className="mb-0">Counter rules</h5></div>
          <div className="card-body row g-3">
            <Field id="ps-defaultTaxPercent" label="Default sales tax (%)" col="col-md-4" hint="Used for items that have no tax of their own. 0 for exempt medicines.">
              <input {...num('defaultTaxPercent')} step="0.01" max={100} />
            </Field>
            <Field id="ps-maxCashierDiscountPercent" label="Highest discount for staff (%)" col="col-md-4" hint="Admins are not limited.">
              <input {...num('maxCashierDiscountPercent')} step="0.5" max={100} />
            </Field>
            <div className="col-md-4 d-flex flex-column justify-content-center gap-2">
              <label className="form-check mb-0">
                <input type="checkbox" className="form-check-input" checked={s.requirePrescription} onChange={(e) => set('requirePrescription', e.target.checked)} />
                <span className="form-check-label">Ask for the doctor's name on prescription-only items</span>
              </label>
              <label className="form-check mb-0">
                <input type="checkbox" className="form-check-input" checked={s.refillRemindersEnabled} onChange={(e) => set('refillRemindersEnabled', e.target.checked)} />
                <span className="form-check-label">Send refill reminders by SMS</span>
              </label>
              <label className="form-check mb-0">
                <input type="checkbox" className="form-check-input" checked={s.blockOverCreditLimit !== false} onChange={(e) => set('blockOverCreditLimit', e.target.checked)} />
                <span className="form-check-label">Block credit sales over a customer's limit (managers can override)</span>
              </label>
            </div>
            <Field id="ps-receiptLanguage" label="Receipt language" col="col-md-4" hint="Urdu/Arabic lines use the names set on each product.">
              <select id="ps-receiptLanguage" className="form-select" value={s.receiptLanguage ?? 'en'} onChange={(e) => set('receiptLanguage', e.target.value)}>
                <option value="en">English</option>
                <option value="en+ur">English + Urdu</option>
                <option value="en+ar">English + Arabic</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h5 className="mb-0">Expiry alerts</h5></div>
          <div className="card-body row g-3">
            <Field id="ps-expiryAlertDays1" label="First alert (days before expiry)" col="col-md-4"><input {...num('expiryAlertDays1')} /></Field>
            <Field id="ps-expiryAlertDays2" label="Second alert" col="col-md-4"><input {...num('expiryAlertDays2')} /></Field>
            <Field id="ps-expiryAlertDays3" label="Final alert" col="col-md-4"><input {...num('expiryAlertDays3')} /></Field>
          </div>
        </div>

        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">FBR invoicing</h5>
            <label className="form-check form-switch mb-0">
              <input type="checkbox" className="form-check-input" checked={s.fbrEnabled} onChange={(e) => set('fbrEnabled', e.target.checked)} />
              <span className="form-check-label">Report counter bills to FBR</span>
            </label>
          </div>
          <div className="card-body row g-3">
            <Field id="ps-fbrPosId" label="FBR POS ID" col="col-md-4"><input {...text('fbrPosId')} disabled={!s.fbrEnabled} /></Field>
            <Field id="ps-fbrToken" label="Access token" col="col-md-5" hint="Stored on the server. Leave as is to keep the saved token.">
              <input {...text('fbrToken')} type="password" autoComplete="off" disabled={!s.fbrEnabled} />
            </Field>
            <Field id="ps-fbrEnvironment" label="Environment" col="col-md-3">
              <select id="ps-fbrEnvironment" className="form-select" value={s.fbrEnvironment} disabled={!s.fbrEnabled}
                onChange={(e) => set('fbrEnvironment', e.target.value as PharmacySettings['fbrEnvironment'])}>
                <option value="Sandbox">Sandbox (testing)</option>
                <option value="Production">Production</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="text-end mb-4">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-border spinner-border-sm me-1" />}Save settings</button>
        </div>
      </form>
    </>
  );
};

export default PharmacySettingsPage;
