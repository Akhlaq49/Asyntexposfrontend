import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  sendWhatsAppText,
  WhatsAppConfigStatus,
} from '../../services/whatsappService';

const WhatsAppSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [config, setConfig] = useState<WhatsAppConfigStatus | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Test message fields
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from ReactPOS! This is a test message via WhatsApp Cloud API.');

  const [alert, setAlert] = useState<{ type: 'success' | 'danger' | 'info'; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getWhatsAppConfig();
      setConfig(data);
      setPhoneNumberId(data.phoneNumberId || '');
      setBusinessAccountId(data.businessAccountId || '');
    } catch {
      setAlert({ type: 'danger', message: 'Failed to load WhatsApp configuration.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken && !phoneNumberId && !businessAccountId) {
      setAlert({ type: 'danger', message: 'Please fill in at least the Access Token and Phone Number ID.' });
      return;
    }
    setSaving(true);
    setAlert(null);
    try {
      const result = await updateWhatsAppConfig({
        accessToken: accessToken || undefined,
        phoneNumberId: phoneNumberId || undefined,
        businessAccountId: businessAccountId || undefined,
      });
      setConfig(result.status);
      setAccessToken('');
      setShowToken(false);
      setAlert({ type: 'success', message: 'WhatsApp Cloud API configuration saved successfully!' });
    } catch (err: any) {
      setAlert({ type: 'danger', message: err?.response?.data?.error || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) {
      setAlert({ type: 'danger', message: 'Please enter a phone number to send a test message.' });
      return;
    }
    setTesting(true);
    setAlert(null);
    try {
      await sendWhatsAppText(testPhone, testMessage);
      setAlert({ type: 'success', message: `Test message sent successfully to ${testPhone}!` });
    } catch (err: any) {
      setAlert({ type: 'danger', message: err?.response?.data?.error || 'Failed to send test message. Check your configuration.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="WhatsApp Cloud API" breadcrumbs={[{ title: 'Settings' }]} />
        <div className="card">
          <div className="card-body text-center py-5">
            <span className="spinner-border text-primary"></span>
            <p className="mt-2 text-muted">Loading configuration...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="WhatsApp Cloud API" breadcrumbs={[{ title: 'Settings' }]} />

      {alert && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.type === 'success' && <i className="ti ti-check-circle me-2"></i>}
          {alert.type === 'danger' && <i className="ti ti-alert-triangle me-2"></i>}
          {alert.type === 'info' && <i className="ti ti-info-circle me-2"></i>}
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      <div className="row">
        {/* Status Card */}
        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="ti ti-brand-whatsapp me-2 text-success"></i>
                Connection Status
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <div className={`avatar avatar-xxl rounded-circle ${config?.isConfigured ? 'bg-success-transparent' : 'bg-danger-transparent'} d-inline-flex align-items-center justify-content-center`}>
                  <i className={`ti ${config?.isConfigured ? 'ti-check' : 'ti-x'} fs-24 ${config?.isConfigured ? 'text-success' : 'text-danger'}`}></i>
                </div>
                <h5 className={`mt-3 ${config?.isConfigured ? 'text-success' : 'text-danger'}`}>
                  {config?.isConfigured ? 'Connected' : 'Not Configured'}
                </h5>
                <p className="text-muted small">
                  {config?.isConfigured
                    ? 'WhatsApp Cloud API is ready to send messages.'
                    : 'Configure your credentials below to enable WhatsApp messaging.'}
                </p>
              </div>

              <div className="list-group list-group-flush">
                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted">Access Token</span>
                  <span className={`badge ${config?.hasAccessToken ? 'bg-success' : 'bg-secondary'}`}>
                    {config?.hasAccessToken ? 'Set' : 'Not Set'}
                  </span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted">Phone Number ID</span>
                  <span className={`badge ${config?.phoneNumberId ? 'bg-success' : 'bg-secondary'}`}>
                    {config?.phoneNumberId || 'Not Set'}
                  </span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted">Business Account ID</span>
                  <span className={`badge ${config?.businessAccountId ? 'bg-success' : 'bg-secondary'}`}>
                    {config?.businessAccountId || 'Not Set'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="ti ti-settings me-2"></i>
                API Configuration
              </h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info small">
                <i className="ti ti-info-circle me-2"></i>
                <strong>Setup Guide:</strong> Go to{' '}
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">
                  Meta Developer Portal
                </a>{' '}
                &rarr; Create/Select App &rarr; Add WhatsApp product &rarr; Get your credentials from the WhatsApp &gt; API Setup page.
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">
                  Access Token<span className="text-danger ms-1">*</span>
                </label>
                <div className="input-group">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="form-control"
                    placeholder={config?.hasAccessToken ? '••••••••••••••••••• (already set, enter new to update)' : 'Enter your permanent access token'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowToken(!showToken)}
                  >
                    <i className={`ti ${showToken ? 'ti-eye-off' : 'ti-eye'}`}></i>
                  </button>
                </div>
                <small className="text-muted">
                  Your permanent WhatsApp Cloud API access token from Meta Business Suite.
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">
                  Phone Number ID<span className="text-danger ms-1">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                />
                <small className="text-muted">
                  Found in WhatsApp &gt; API Setup &gt; Phone number ID in Meta Developer Portal.
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">
                  WhatsApp Business Account ID
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 123456789012345"
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                />
                <small className="text-muted">Optional. Used for managing templates.</small>
              </div>

              <div className="d-flex justify-content-end">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-device-floppy me-1"></i>Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Test Message Card */}
          {config?.isConfigured && (
            <div className="card mt-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="ti ti-send me-2 text-primary"></i>
                  Send Test Message
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-medium">
                    Phone Number<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., 03001234567 or +923001234567"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <small className="text-muted">Enter a WhatsApp-enabled phone number to test.</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">Message</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                  />
                </div>

                <div className="d-flex justify-content-end">
                  <button className="btn btn-success" onClick={handleTest} disabled={testing}>
                    {testing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>Sending...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-brand-whatsapp me-1"></i>Send Test Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card h-100 border-0 bg-primary-transparent">
            <div className="card-body text-center">
              <i className="ti ti-message-circle fs-36 text-primary mb-3"></i>
              <h6 className="fw-bold">Text Messages</h6>
              <p className="text-muted small mb-0">
                Send instant text notifications for due reminders, payment confirmations, and plan updates.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card h-100 border-0 bg-success-transparent">
            <div className="card-body text-center">
              <i className="ti ti-file-text fs-36 text-success mb-3"></i>
              <h6 className="fw-bold">PDF Documents</h6>
              <p className="text-muted small mb-0">
                Automatically generate and send deposit slips, due notices, and repayment plans as PDF attachments.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card h-100 border-0 bg-info-transparent">
            <div className="card-body text-center">
              <i className="ti ti-template fs-36 text-info mb-3"></i>
              <h6 className="fw-bold">Template Messages</h6>
              <p className="text-muted small mb-0">
                Use pre-approved WhatsApp templates for marketing and transactional notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WhatsAppSettings;
