import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { filterMenuDataByKeys } from '../utils/menuKeys';

// Recursively collect all leaf paths from a menu item tree
function collectLeafLinks(
  node: any,
  parentIcon: string,
  parentIconType: string,
): { title: string; path: string; icon: string; iconType: string }[] {
  const links: { title: string; path: string; icon: string; iconType: string }[] = [];
  const icon = node.icon || parentIcon;
  const iconType = node.iconType || parentIconType;

  if (node.path && node.path !== '/user-dashboard') {
    links.push({ title: node.title, path: node.path, icon, iconType });
  }
  if (node.children) {
    for (const child of node.children) {
      links.push(...collectLeafLinks(child, icon, iconType));
    }
  }
  return links;
}

const UserDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { allowedKeys, tenantHiddenKeys, isLoading } = usePermissions();

  // Get the menus this user can actually see
  const visibleMenus = filterMenuDataByKeys(allowedKeys, tenantHiddenKeys);

  // Recursively collect all accessible leaf paths for quick-link cards
  const quickLinks: { title: string; path: string; icon: string; iconType: string }[] = [];
  for (const section of visibleMenus) {
    for (const item of section.items) {
      quickLinks.push(...collectLeafLinks(item, 'ti-link', 'tabler'));
    }
  }

  const colors = ['primary', 'success', 'warning', 'info', 'danger', 'secondary'];

  // ProtectedRoute already guards with a spinner, but defensively show one here
  // too in case permissions are still loading (e.g. after a token refresh).
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

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
