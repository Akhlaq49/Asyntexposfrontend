import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/common/PageHeader';
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  sendWhatsAppText,
  WhatsAppConfigStatus,
} from '../../services/whatsappService';

const WhatsAppSettings: React.FC = () => {
  const { t } = useTranslation();
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
      setAlert({ type: 'danger', message: t('settings.whatsapp_load_failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken && !phoneNumberId && !businessAccountId) {
      setAlert({ type: 'danger', message: t('settings.whatsapp_fill_required') });
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
      setAlert({ type: 'success', message: t('settings.whatsapp_save_success') });
    } catch (err: any) {
      setAlert({ type: 'danger', message: err?.response?.data?.error || t('settings.whatsapp_save_failed') });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) {
      setAlert({ type: 'danger', message: t('settings.whatsapp_enter_phone') });
      return;
    }
    setTesting(true);
    setAlert(null);
    try {
      await sendWhatsAppText(testPhone, testMessage);
      setAlert({ type: 'success', message: t('settings.whatsapp_test_success', { phone: testPhone }) });
    } catch (err: any) {
      setAlert({ type: 'danger', message: err?.response?.data?.error || t('settings.whatsapp_test_failed') });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title={t('settings.whatsapp_cloud_api')} breadcrumbs={[{ title: t('settings.settings') }]} />
        <div className="card">
          <div className="card-body text-center py-5">
            <span className="spinner-border text-primary"></span>
            <p className="mt-2 text-muted">{t('settings.loading_configuration')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('settings.whatsapp_cloud_api')} breadcrumbs={[{ title: t('settings.settings') }]} />

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
                {t('settings.connection_status')}
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <div className={`avatar avatar-xxl rounded-circle ${config?.isConfigured ? 'bg-success-transparent' : 'bg-danger-transparent'} d-inline-flex align-items-center justify-content-center`}>
                  <i className={`ti ${config?.isConfigured ? 'ti-check' : 'ti-x'} fs-24 ${config?.isConfigured ? 'text-success' : 'text-danger'}`}></i>
                </div>
                <h5 className={`mt-3 ${config?.isConfigured ? 'text-success' : 'text-danger'}`}>
                  {config?.isConfigured ? t('settings.connected') : t('settings.not_configured')}
                </h5>
                <p className="text-muted small">
                  {config?.isConfigured
                    ? t('settings.whatsapp_ready')
                    : t('settings.whatsapp_configure_credentials')}
                </p>
              </div>

              <div className="list-group list-group-flush">
                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted">{t('settings.access_token')}</span>
                  <span className={`badge ${config?.hasAccessToken ? 'bg-success' : 'bg-secondary'}`}>
                    {config?.hasAccessToken ? t('settings.set') : t('settings.not_set')}
                  </span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted">{t('settings.phone_number_id')}</span>
                  <span className={`badge ${config?.phoneNumberId ? 'bg-success' : 'bg-secondary'}`}>
                    {config?.phoneNumberId || t('settings.not_set')}
                  </span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span className="text-muted">{t('settings.business_account_id')}</span>
                  <span className={`badge ${config?.businessAccountId ? 'bg-success' : 'bg-secondary'}`}>
                    {config?.businessAccountId || t('settings.not_set')}
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
                {t('settings.api_configuration')}
              </h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info small">
                <i className="ti ti-info-circle me-2"></i>
                <strong>{t('settings.setup_guide')}</strong> {t('settings.setup_guide_goto')}{' '}
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">
                  {t('settings.meta_developer_portal')}
                </a>{' '}
                &rarr; {t('settings.setup_guide_instructions')}
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">
                  {t('settings.access_token')}<span className="text-danger ms-1">*</span>
                </label>
                <div className="input-group">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="form-control"
                    placeholder={config?.hasAccessToken ? t('settings.access_token_placeholder_set') : t('settings.access_token_placeholder')}
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
                  {t('settings.access_token_help')}
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">
                  {t('settings.phone_number_id')}<span className="text-danger ms-1">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('settings.phone_number_id_placeholder')}
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                />
                <small className="text-muted">
                  {t('settings.phone_number_id_help')}
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">
                  {t('settings.whatsapp_business_account_id')}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('settings.phone_number_id_placeholder')}
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                />
                <small className="text-muted">{t('settings.business_account_id_help')}</small>
              </div>

              <div className="d-flex justify-content-end">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>{t('settings.saving')}
                    </>
                  ) : (
                    <>
                      <i className="ti ti-device-floppy me-1"></i>{t('settings.save_configuration')}
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
                    {t('settings.phone_number')}<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('settings.test_phone_placeholder')}
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <small className="text-muted">{t('settings.test_phone_help')}</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium">{t('settings.message')}</label>
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
                        <span className="spinner-border spinner-border-sm me-2"></span>{t('settings.sending')}
                      </>
                    ) : (
                      <>
                        <i className="ti ti-brand-whatsapp me-1"></i>{t('settings.send_test_message')}
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
              <h6 className="fw-bold">{t('settings.text_messages')}</h6>
              <p className="text-muted small mb-0">
                {t('settings.text_messages_desc')}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card h-100 border-0 bg-success-transparent">
            <div className="card-body text-center">
              <i className="ti ti-file-text fs-36 text-success mb-3"></i>
              <h6 className="fw-bold">{t('settings.pdf_documents')}</h6>
              <p className="text-muted small mb-0">
                {t('settings.pdf_documents_desc')}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-4">
          <div className="card h-100 border-0 bg-info-transparent">
            <div className="card-body text-center">
              <i className="ti ti-template fs-36 text-info mb-3"></i>
              <h6 className="fw-bold">{t('settings.template_messages')}</h6>
              <p className="text-muted small mb-0">
                {t('settings.template_messages_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WhatsAppSettings;
