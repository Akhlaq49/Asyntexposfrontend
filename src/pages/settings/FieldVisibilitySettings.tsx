import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getFormFieldConfigs,
  saveFormFieldConfigs,
  seedFormFieldConfigs,
  FormFieldConfig,
  FormFieldConfigDto,
} from '../../services/formFieldConfigService';

const FieldVisibilitySettings: React.FC = () => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeForm, setActiveForm] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await getFormFieldConfigs();
      setConfigs(data);
      // Set first form as active if none selected
      if (!activeForm && data.length > 0) {
        const forms = [...new Set(data.map((c) => c.formName))];
        setActiveForm(forms[0]);
      }
    } catch {
      setErrorMsg(t('settings.failed_load_field_configs'));
    } finally {
      setLoading(false);
    }
  };

  const formNames = useMemo(() => {
    return [...new Set(configs.map((c) => c.formName))].sort();
  }, [configs]);

  const activeFormConfigs = useMemo(() => {
    return configs.filter((c) => c.formName === activeForm);
  }, [configs, activeForm]);

  const toggleVisibility = (fieldName: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.formName === activeForm && c.fieldName === fieldName
          ? { ...c, isVisible: !c.isVisible }
          : c
      )
    );
  };

  const toggleAllForForm = (visible: boolean) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.formName === activeForm ? { ...c, isVisible: visible } : c
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const dtos: FormFieldConfigDto[] = configs.map((c) => ({
        formName: c.formName,
        fieldName: c.fieldName,
        fieldLabel: c.fieldLabel,
        isVisible: c.isVisible,
      }));
      const saved = await saveFormFieldConfigs(dtos);
      setConfigs(saved);
      setSuccessMsg(t('settings.field_visibility_saved'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg(t('settings.failed_save_settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const data = await seedFormFieldConfigs();
      setConfigs(data);
      if (data.length > 0) {
        const forms = [...new Set(data.map((c) => c.formName))];
        if (!forms.includes(activeForm)) setActiveForm(forms[0]);
      }
      setSuccessMsg(t('settings.default_configs_seeded'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg(t('settings.failed_seed_defaults'));
    } finally {
      setSeeding(false);
    }
  };

  const formDisplayNames: Record<string, { label: string; icon: string }> = {
    Customer: { label: t('settings.customer'), icon: 'ti-users' },
    AddProduct: { label: t('settings.add_product'), icon: 'ti-package' },
    CreateInstallment: { label: t('settings.create_installment'), icon: 'ti-receipt' },
    POS: { label: t('settings.pos'), icon: 'ti-device-desktop' },
  };

  const visibleCount = activeFormConfigs.filter((c) => c.isVisible).length;
  const hiddenCount = activeFormConfigs.filter((c) => !c.isVisible).length;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">{t('settings.field_visibility_settings')}</h4>
            <h6>{t('settings.configure_fields_visible')}</h6>
          </div>
        </div>
        <div className="page-btn d-flex gap-2">
          {configs.length === 0 && !loading && (
            <button className="btn btn-outline-info" onClick={handleSeed} disabled={seeding}>
              {seeding ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>{t('settings.seeding')}</>
              ) : (
                <><i className="ti ti-database-plus me-1"></i>{t('settings.seed_defaults')}</>
              )}
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading || configs.length === 0}>
            {saving ? (
              <><span className="spinner-border spinner-border-sm me-1"></span>{t('settings.saving')}</>
            ) : (
              <><i className="ti ti-device-floppy me-1"></i>{t('settings.save_changes')}</>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="ti ti-check me-2"></i>{successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="ti ti-alert-circle me-2"></i>{errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary"></div>
          <p className="mt-2 text-muted">{t('settings.loading_configurations')}</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="card">
          <div className="card-body text-center p-5">
            <i className="ti ti-settings-2 fs-48 text-muted mb-3 d-block"></i>
            <h5>{t('settings.no_field_configurations')}</h5>
            <p className="text-muted mb-3">{t('settings.seed_defaults_description')}</p>
            <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
              {seeding ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>{t('settings.seeding')}</>
              ) : (
                <><i className="ti ti-database-plus me-1"></i>{t('settings.seed_defaults')}</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {/* Form Selection Sidebar */}
          <div className="col-lg-3 col-md-4">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0"><i className="ti ti-forms me-2"></i>{t('settings.forms')}</h5>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {formNames.map((formName) => {
                    const display = formDisplayNames[formName] || { label: formName, icon: 'ti-file' };
                    const formConfigs = configs.filter((c) => c.formName === formName);
                    const hidden = formConfigs.filter((c) => !c.isVisible).length;
                    return (
                      <button
                        key={formName}
                        className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${activeForm === formName ? 'active' : ''}`}
                        onClick={() => setActiveForm(formName)}
                      >
                        <span>
                          <i className={`ti ${display.icon} me-2`}></i>
                          {display.label}
                        </span>
                        <span className="d-flex gap-1">
                          <span className="badge bg-success-transparent text-success rounded-pill">{formConfigs.length - hidden}</span>
                          {hidden > 0 && (
                            <span className="badge bg-danger-transparent text-danger rounded-pill">{hidden}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Field Configuration Table */}
          <div className="col-lg-9 col-md-8">
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <div>
                  <h5 className="card-title mb-1">
                    <i className={`ti ${(formDisplayNames[activeForm] || { icon: 'ti-file' }).icon} me-2`}></i>
                    {(formDisplayNames[activeForm] || { label: activeForm }).label} {t('settings.form_fields')}
                  </h5>
                  <small className="text-muted">
                    <span className="text-success fw-medium">{visibleCount} {t('settings.visible')}</span>
                    {hiddenCount > 0 && <> &middot; <span className="text-danger fw-medium">{hiddenCount} {t('settings.hidden')}</span></>}
                  </small>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-success" onClick={() => toggleAllForForm(true)} title={t('settings.show_all')}>
                    <i className="ti ti-eye me-1"></i>{t('settings.show_all')}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => toggleAllForForm(false)} title={t('settings.hide_all')}>
                    <i className="ti ti-eye-off me-1"></i>{t('settings.hide_all')}
                  </button>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        <th>{t('settings.field_name')}</th>
                        <th>{t('settings.label')}</th>
                        <th style={{ width: 120 }} className="text-center">{t('settings.visibility')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeFormConfigs.map((cfg, idx) => (
                        <tr key={cfg.id} className={!cfg.isVisible ? 'table-light' : ''}>
                          <td className="text-muted">{idx + 1}</td>
                          <td>
                            <code className="text-primary">{cfg.fieldName}</code>
                          </td>
                          <td>
                            <span className={!cfg.isVisible ? 'text-muted text-decoration-line-through' : ''}>
                              {cfg.fieldLabel}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="form-check form-switch d-inline-block">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={cfg.isVisible}
                                onChange={() => toggleVisibility(cfg.fieldName)}
                                style={{ width: '2.5em', height: '1.25em', cursor: 'pointer' }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FieldVisibilitySettings;
