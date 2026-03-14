import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { tenantMenuService } from '../../services/tenantMenuService';

const DashboardRedirect: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canAccessPath, isLoading: permLoading } = usePermissions();
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

  // If user can access the tenant's default dashboard, go there;
  // otherwise fall back to the user dashboard
  const target = defaultDashboard || '/admin-dashboard';
  if (canAccessPath(target)) {
    return <Navigate to={target} replace />;
  }
  return <Navigate to="/user-dashboard" replace />;
};

export default DashboardRedirect;
