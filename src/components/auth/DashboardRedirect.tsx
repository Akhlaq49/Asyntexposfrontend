import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { tenantMenuService } from '../../services/tenantMenuService';
import { getAllMenuKeys } from '../../utils/menuKeys';

const DashboardRedirect: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canAccessPath, allowedKeys, tenantHiddenKeys, isLoading: permLoading } = usePermissions();
  const [defaultDashboard, setDefaultDashboard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    tenantMenuService
      .getDefaultDashboard()
      .then((path) => setDefaultDashboard(path || '/admin-dashboard'))
      .catch(() => setDefaultDashboard('/admin-dashboard'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (authLoading || permLoading || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // Try the tenant's configured default dashboard first
  const target = defaultDashboard || '/admin-dashboard';
  if (canAccessPath(target)) {
    return <Navigate to={target} replace />;
  }

  // Default dashboard not accessible — find the first page the user CAN access
  // so they land on a real page rather than a generic hub.
  const allKeys = getAllMenuKeys();
  for (const mk of allKeys) {
    const key = mk.key;
    if (tenantHiddenKeys.has(key)) continue;
    if (!allowedKeys.has('*') && !allowedKeys.has(key)) continue;
    // Find the first real path inside this menu item
    const firstPath = mk.paths.find((p) => p !== '/user-dashboard');
    if (firstPath && canAccessPath(firstPath)) {
      return <Navigate to={firstPath} replace />;
    }
  }

  // Nothing accessible at all — fall back to user dashboard hub
  return <Navigate to="/user-dashboard" replace />;
};

export default DashboardRedirect;
