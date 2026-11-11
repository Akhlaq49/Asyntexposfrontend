import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { rolePermissionService } from '../../services/rolePermissionService';
import { getMenuKeysBySection } from '../../utils/menuKeys';
import { usePermissions } from '../../context/PermissionContext';

const ROLES = ['Manager', 'Pharmacist', 'Cashier', 'Salesman', 'Supervisor', 'Store Keeper', 'Delivery Biker', 'Maintenance', 'Quality Analyst', 'Accountant', 'Purchase', 'User'];

const allSections = getMenuKeysBySection();

const RolesPermissions: React.FC = () => {
  const { t } = useTranslation();
  const { tenantHiddenKeys } = usePermissions();
  const [selectedRole, setSelectedRole] = useState('');
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter sections to only show menus visible for this tenant
  const visibleSections = useMemo(() => {
    if (!tenantHiddenKeys || tenantHiddenKeys.size === 0) return allSections;
    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !tenantHiddenKeys.has(item.key)),
      }))
      .filter((section) => section.items.length > 0);
  }, [tenantHiddenKeys]);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Load permissions when role changes
  const loadPermissions = useCallback(async (role: string) => {
    if (!role) {
      setCheckedKeys(new Set());
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const keys = await rolePermissionService.getByRole(role);
      setCheckedKeys(new Set(keys));
    } catch {
      setMessage({ type: 'danger', text: t('users.failed_load_permissions') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRole) loadPermissions(selectedRole);
  }, [selectedRole, loadPermissions]);

  // Toggle individual item
  const toggleKey = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toggle all items in a section
  const toggleSection = (sectionItems: { key: string }[], checked: boolean) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      for (const item of sectionItems) {
        if (checked) next.add(item.key);
        else next.delete(item.key);
      }
      return next;
    });
  };

  // Check / uncheck all
  const toggleAll = (checked: boolean) => {
    if (checked) {
      const allKeys = visibleSections.flatMap((s) => s.items.map((i) => i.key));
      setCheckedKeys(new Set(allKeys));
    } else {
      setCheckedKeys(new Set());
    }
  };

  // Ready-made access for pharmacy staff. Cashiers get no Profit & Margin key, which also hides trade prices.
  const PHARMACY_PRESETS: Record<string, string[]> = {
    Cashier: ['Main/Dashboard', 'Sales/POS', 'Sales/Sales', 'Sales/Sales Return', 'Sales/Customer Accounts', 'Peoples/Customers'],
    Pharmacist: [
      'Main/Dashboard', 'Sales/POS', 'Sales/Sales', 'Sales/Sales Return', 'Sales/Quotation', 'Peoples/Customers',
      'Inventory/Products', 'Inventory/Near Expiry', 'Inventory/Expired Products', 'Inventory/Low Stocks', 'Inventory/Print Barcode',
      'Stock/Manage Stock', 'Stock/Stock Adjustment', 'Stock/Stock Transfer', 'Stock/Requisitions', 'Stock/Stock Ledger',
      'Inventory/Medicine Catalogue', 'Sales/Customer Accounts',
      'Purchases/Purchases', 'Purchases/Reorder List', 'Purchases/Purchase Return', 'Reports/Pharmacy Reports',
    ],
    Manager: [
      'Main/Dashboard', 'Sales/POS', 'Sales/Sales', 'Sales/Invoices', 'Sales/Sales Return', 'Sales/Quotation', 'Sales/Till Sessions',
      'Peoples/Customers', 'Peoples/Suppliers', 'Promo/Coupons',
      'Inventory/Products', 'Inventory/Create Product', 'Inventory/Near Expiry', 'Inventory/Expired Products', 'Inventory/Low Stocks',
      'Inventory/Category', 'Inventory/Sub Category', 'Inventory/Brands', 'Inventory/Units', 'Inventory/Print Barcode',
      'Stock/Manage Stock', 'Stock/Stock Adjustment', 'Stock/Stock Transfer', 'Stock/Requisitions', 'Stock/Stock Ledger', 'Stock/Head Office',
      'Inventory/Medicine Catalogue', 'Sales/Customer Accounts', 'Sales/Price Levels',
      'Purchases/Purchases', 'Purchases/Reorder List', 'Purchases/Purchase Return', 'Purchases/Supplier Payments',
      'Finance & Accounts/Expenses', 'Finance & Accounts/Income',
      'Reports/Sales Report', 'Reports/Purchase report', 'Reports/Inventory Report', 'Reports/Supplier Report', 'Reports/Customer Report',
      'Reports/Product Report', 'Reports/Pharmacy Reports', 'Reports/Profit & Margin', 'Reports/Expense Report', 'Reports/Tax Report',
    ],
  };
  const applyPreset = () => {
    const preset = PHARMACY_PRESETS[selectedRole];
    if (!preset) return;
    const available = new Set(visibleSections.flatMap((s) => s.items.map((i) => i.key)));
    setCheckedKeys(new Set(preset.filter((k) => available.has(k))));
    setMessage({ type: 'success', text: `Pharmacy preset applied for ${selectedRole}. Review it, then save.` });
  };

  // Save
  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setMessage(null);
    try {
      await rolePermissionService.updateRole(selectedRole, Array.from(checkedKeys));
      setMessage({ type: 'success', text: t('users.permissions_saved', { role: selectedRole }) });
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.response?.data?.message || t('users.failed_save_permissions') });
    } finally {
      setSaving(false);
    }
  };

  const totalItems = visibleSections.reduce((sum, s) => sum + s.items.length, 0);
  const allChecked = checkedKeys.size === totalItems && totalItems > 0;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="add-item d-flex">
          <div className="page-title">
            <h4 className="fw-bold">{t('users.roles_permissions_title')}</h4>
            <h6>{t('users.roles_permissions_subtitle')}</h6>
          </div>
        </div>
      </div>

      {/* Role Selector */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('users.select_role')}</label>
              <select
                className="form-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">{t('users.choose_role')}</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-center gap-2 mt-3 mt-md-0">
              {selectedRole && (
                <span className="badge bg-primary-transparent fs-13 px-3 py-2">
                  <i className="ti ti-shield-check me-1"></i>{selectedRole}
                </span>
              )}
              {PHARMACY_PRESETS[selectedRole] && (
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={applyPreset}>
                  Use pharmacy preset
                </button>
              )}
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <p className="text-muted mb-0 fs-13">
                <i className="ti ti-info-circle me-1"></i>{t('users.admin_full_access')}
              </p>
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

      {!selectedRole ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="ti ti-shield-lock fs-48 text-muted d-block mb-3"></i>
            <h5 className="text-muted">{t('users.select_role_prompt')}</h5>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('common.loading')}</span>
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
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <label className="form-check-label fw-semibold" htmlFor="selectAll">
                {t('users.select_all')} ({checkedKeys.size} / {totalItems})
              </label>
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>{t('common.saving')}
                </>
              ) : (
                <>
                  <i className="ti ti-device-floppy me-1"></i>{t('users.save_permissions')}
                </>
              )}
            </button>
          </div>

          {/* Permission Sections */}
          <div className="row">
            {visibleSections.map((section) => {
              const sectionAllChecked = section.items.every((i) => checkedKeys.has(i.key));
              const sectionSomeChecked = section.items.some((i) => checkedKeys.has(i.key));

              return (
                <div className="col-lg-6 col-xl-4" key={section.header}>
                  <div className="card mb-3">
                    <div className="card-header d-flex align-items-center justify-content-between py-2">
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`section-${section.header}`}
                          checked={sectionAllChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = sectionSomeChecked && !sectionAllChecked;
                          }}
                          onChange={(e) => toggleSection(section.items, e.target.checked)}
                        />
                        <label className="form-check-label fw-bold fs-14" htmlFor={`section-${section.header}`}>
                          {section.header}
                        </label>
                      </div>
                      <span className="badge bg-light text-dark fs-11">
                        {section.items.filter((i) => checkedKeys.has(i.key)).length}/{section.items.length}
                      </span>
                    </div>
                    <div className="card-body py-2">
                      {section.items.map((item) => (
                        <div className="form-check mb-1" key={item.key}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`perm-${item.key}`}
                            checked={checkedKeys.has(item.key)}
                            onChange={() => toggleKey(item.key)}
                          />
                          <label className="form-check-label fs-13" htmlFor={`perm-${item.key}`}>
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

export default RolesPermissions;

