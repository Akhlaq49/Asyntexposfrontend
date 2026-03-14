import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { filterMenuDataByKeys } from '../utils/menuKeys';

const UserDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { allowedKeys, tenantHiddenKeys } = usePermissions();

  // Get the menus this user can actually see
  const visibleMenus = filterMenuDataByKeys(allowedKeys, tenantHiddenKeys);

  // Collect all accessible leaf paths for quick-link cards
  const quickLinks: { title: string; path: string; icon: string; iconType: string }[] = [];
  for (const section of visibleMenus) {
    for (const item of section.items) {
      if ('path' in item && item.path && item.path !== '/user-dashboard') {
        quickLinks.push({
          title: item.title,
          path: item.path,
          icon: ('icon' in item ? item.icon : 'ti-link') || 'ti-link',
          iconType: ('iconType' in item ? item.iconType : 'tabler') || 'tabler',
        });
      } else if ('children' in item && item.children) {
        for (const child of item.children) {
          if ('path' in child && child.path && child.path !== '/user-dashboard') {
            quickLinks.push({
              title: child.title,
              path: child.path,
              icon: ('icon' in item ? item.icon : 'ti-link') || 'ti-link',
              iconType: ('iconType' in item ? item.iconType : 'tabler') || 'tabler',
            });
          }
        }
      }
    }
  }

  const colors = ['primary', 'success', 'warning', 'info', 'danger', 'secondary'];

  return (
    <>
      {/* Welcome Header */}
      <div className="d-lg-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1">
            {t('user_dashboard.welcome')}, {user?.fullName || t('user_dashboard.user')}
          </h2>
          <p className="text-muted mb-0">{t('user_dashboard.subtitle')}</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="row mb-4">
        <div className="col-xl-4 col-md-6">
          <div className="card">
            <div className="card-body text-center">
              <div className="avatar avatar-xl bg-primary-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center">
                <i className="ti ti-user fs-36 text-primary"></i>
              </div>
              <h4 className="mb-1">{user?.fullName}</h4>
              <p className="text-muted mb-1">{user?.email}</p>
              <span className="badge bg-primary-light text-primary">{user?.role}</span>
            </div>
          </div>
        </div>
        <div className="col-xl-8 col-md-6">
          <div className="card h-100">
            <div className="card-body d-flex flex-column justify-content-center">
              <h5 className="card-title mb-3">{t('user_dashboard.quick_info')}</h5>
              <div className="row text-center">
                <div className="col-4">
                  <div className="dash-widget-icon bg-primary-light mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, borderRadius: '50%' }}>
                    <i className="ti ti-menu-2 fs-24 text-primary"></i>
                  </div>
                  <h4 className="mb-0">{quickLinks.length}</h4>
                  <small className="text-muted">{t('user_dashboard.accessible_pages')}</small>
                </div>
                <div className="col-4">
                  <div className="dash-widget-icon bg-success-light mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, borderRadius: '50%' }}>
                    <i className="ti ti-layout-grid fs-24 text-success"></i>
                  </div>
                  <h4 className="mb-0">{visibleMenus.length}</h4>
                  <small className="text-muted">{t('user_dashboard.menu_sections')}</small>
                </div>
                <div className="col-4">
                  <div className="dash-widget-icon bg-info-light mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, borderRadius: '50%' }}>
                    <i className="ti ti-shield-check fs-24 text-info"></i>
                  </div>
                  <h4 className="mb-0">{user?.role}</h4>
                  <small className="text-muted">{t('user_dashboard.your_role')}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Links */}
      {quickLinks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">{t('user_dashboard.quick_access')}</h5>
          </div>
          <div className="card-body">
            <div className="row">
              {quickLinks.slice(0, 12).map((link, i) => (
                <div key={link.path} className="col-xl-2 col-lg-3 col-sm-4 col-6 mb-3">
                  <Link to={link.path} className="text-decoration-none">
                    <div className="card border mb-0 h-100 text-center p-3 hover-shadow">
                      <div className={`dash-widget-icon bg-${colors[i % colors.length]}-light mx-auto mb-2 d-flex align-items-center justify-content-center`} style={{ width: 40, height: 40, borderRadius: '50%' }}>
                        <i className={`${link.iconType === 'feather' ? 'fe fe-' : 'ti '}${link.icon} fs-20 text-${colors[i % colors.length]}`}></i>
                      </div>
                      <small className="fw-medium text-dark">{link.title}</small>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            {quickLinks.length > 12 && (
              <p className="text-muted text-center mb-0 mt-2">
                {t('user_dashboard.more_pages', { count: quickLinks.length - 12 })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* No Access at all */}
      {quickLinks.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="ti ti-lock fs-48 text-muted mb-3 d-block"></i>
            <h5>{t('user_dashboard.no_access_title')}</h5>
            <p className="text-muted">{t('user_dashboard.no_access_message')}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDashboard;
