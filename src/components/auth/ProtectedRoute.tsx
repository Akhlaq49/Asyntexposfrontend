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

  // Check route-level permission
  if (!canAccessPath(location.pathname)) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <i className="ti ti-lock fs-48 text-danger mb-3"></i>
        <h3 className="fw-bold">Access Denied</h3>
        <p className="text-muted fs-16">You don't have permission to access this page.</p>
        <a href="/" className="btn btn-primary mt-2">
          <i className="ti ti-arrow-left me-1"></i>Go to Dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
