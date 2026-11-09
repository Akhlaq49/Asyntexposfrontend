import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccessPath, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  if (isLoading || permLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Check route-level permission — /user-dashboard is always accessible
  if (location.pathname !== '/user-dashboard' && !canAccessPath(location.pathname)) {
    return <Navigate to="/user-dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
