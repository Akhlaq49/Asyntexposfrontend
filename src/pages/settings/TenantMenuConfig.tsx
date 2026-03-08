import React, { useState, useEffect, useCallback } from 'react';
import { tenantMenuService } from '../../services/tenantMenuService';
import { getMenuKeysBySection } from '../../utils/menuKeys';

const DASHBOARD_OPTIONS = [
  { value: '/admin-dashboard', label: 'Admin Dashboard' },
  { value: '/admin-dashboard-2', label: 'Admin Dashboard 2' },
];

const allSections = getMenuKeysBySection();

const TenantMenuConfig: React.FC = () => {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [defaultDashboard, setDefaultDashboard] = useState('/admin-dashboard-2');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const loadHiddenKeys = useCallback(async () => {
    setLoading(true);
    try {
      const [keys, dashboard] = await Promise.all([
        tenantMenuService.getHiddenKeys(),
        tenantMenuService.getDefaultDashboard().catch(() => '/admin-dashboard-2'),
      ]);
      setHiddenKeys(new Set(keys));
      setDefaultDashboard(dashboard || '/admin-dashboard-2');
    } catch {
      setMessage({ type: 'danger', text: 'Failed to load tenant menu configuration.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHiddenKeys();
  }, [loadHiddenKeys]);

  // Toggle visibility of an individual item (checked = visible, unchecked = hidden)
  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); // Was hidden → make visible
      else next.add(key); // Was visible → hide
      return next;
    });
  };

  // Toggle all items in a section
  const toggleSection = (sectionItems: { key: string }[], makeVisible: boolean) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      for (const item of sectionItems) {
        if (makeVisible) next.delete(item.key);
        else next.add(item.key);
      }
      return next;
    });
  };

  // Enable / disable all
  const toggleAll = (makeVisible: boolean) => {
    if (makeVisible) {
      setHiddenKeys(new Set());
    } else {
      const allKeys = allSections.flatMap((s) => s.items.map((i) => i.key));
      setHiddenKeys(new Set(allKeys));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([
        tenantMenuService.updateHiddenKeys(Array.from(hiddenKeys)),
        tenantMenuService.setDefaultDashboard(defaultDashboard),
      ]);
      setMessage({ type: 'success', text: 'Tenant menu configuration saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const totalItems = allSections.reduce((sum, s) => sum + s.items.length, 0);
  const visibleCount = totalItems - hiddenKeys.size;
  const allVisible = hiddenKeys.size === 0;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">Menu Configuration</h4>
            <h6>Enable or disable menu modules for your organization</h6>
          </div>
        </div>
      </div>

      {/* Default Dashboard Card */}
      <div className="card mb-4">
        <div className="card-header py-3">
          <h5 className="card-title mb-0">
            <i className="ti ti-home me-2"></i>Default Dashboard
          </h5>
        </div>
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <p className="text-muted mb-2 fs-13">
                Choose which dashboard users will see when they log in or visit the home page.
              </p>
              <select
                className="form-select"
                value={defaultDashboard}
                onChange={(e) => setDefaultDashboard(e.target.value)}
              >
                {DASHBOARD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 text-md-end mt-3 mt-md-0">
              <span className="badge bg-info-transparent fs-13 px-3 py-2">
                <i className="ti ti-layout-dashboard me-1"></i>
                Current: {DASHBOARD_OPTIONS.find((o) => o.value === defaultDashboard)?.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-8">
              <p className="text-muted mb-0 fs-13">
                <i className="ti ti-info-circle me-1"></i>
                Uncheck a menu to hide it for all users in your organization.
                Role permissions will only apply to visible menus.
              </p>
            </div>
            <div className="col-md-4 text-md-end mt-2 mt-md-0">
              <span className="badge bg-primary-transparent fs-13 px-3 py-2">
                <i className="ti ti-eye me-1"></i>
                {visibleCount} / {totalItems} visible
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Select All + Save */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="selectAll"
                checked={allVisible}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <label className="form-check-label fw-semibold" htmlFor="selectAll">
                Enable All ({visibleCount} / {totalItems})
              </label>
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>Saving...
                </>
              ) : (
                <>
                  <i className="ti ti-device-floppy me-1"></i>Save Configuration
                </>
              )}
            </button>
          </div>

          {/* Menu Sections */}
          <div className="row">
            {allSections.map((section) => {
              const sectionAllVisible = section.items.every((i) => !hiddenKeys.has(i.key));
              const sectionSomeVisible = section.items.some((i) => !hiddenKeys.has(i.key));

              return (
                <div className="col-lg-6 col-xl-4" key={section.header}>
                  <div className="card mb-3">
                    <div className="card-header d-flex align-items-center justify-content-between py-2">
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`section-${section.header}`}
                          checked={sectionAllVisible}
                          ref={(el) => {
                            if (el) el.indeterminate = sectionSomeVisible && !sectionAllVisible;
                          }}
                          onChange={(e) => toggleSection(section.items, e.target.checked)}
                        />
                        <label className="form-check-label fw-bold fs-14" htmlFor={`section-${section.header}`}>
                          {section.header}
                        </label>
                      </div>
                      <span className="badge bg-light text-dark fs-11">
                        {section.items.filter((i) => !hiddenKeys.has(i.key)).length}/{section.items.length}
                      </span>
                    </div>
                    <div className="card-body py-2">
                      {section.items.map((item) => (
                        <div className="form-check mb-1" key={item.key}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`menu-${item.key}`}
                            checked={!hiddenKeys.has(item.key)}
                            onChange={() => toggleKey(item.key)}
                          />
                          <label className="form-check-label fs-13" htmlFor={`menu-${item.key}`}>
                            {item.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};

export default TenantMenuConfig;
