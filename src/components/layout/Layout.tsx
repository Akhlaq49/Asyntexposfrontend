import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ProtectedRoute from '../auth/ProtectedRoute';

interface LayoutProps {
  children: React.ReactNode;
}

// Pages that don't use the standard layout (auth, error, etc.)
const noLayoutPaths = [
  '/signin', '/signin-2', '/signin-3',
  '/register', '/register-2', '/register-3',
  '/forgot-password', '/forgot-password-2', '/forgot-password-3',
  '/reset-password', '/reset-password-2', '/reset-password-3',
  '/email-verification', '/email-verification-2', '/email-verification-3',
  '/two-step-verification', '/two-step-verification-2', '/two-step-verification-3',
  '/lock-screen',
  '/error-404', '/error-500',
  '/coming-soon', '/under-maintenance',
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isNoLayout = noLayoutPaths.includes(location.pathname);
  const isPOS = location.pathname.startsWith('/pos') && !location.pathname.includes('pos-orders') && !location.pathname.includes('pos-settings');

  useEffect(() => {
    // Initialize feather icons after render
    if (typeof (window as any).feather !== 'undefined') {
      (window as any).feather.replace();
    }
  }, [location.pathname]);

  // Auth/error pages render without layout and without auth check
  if (isNoLayout) {
    return <>{children}</>;
  }

  // All other pages require authentication
  if (isPOS) {
    return (
      <ProtectedRoute>
        <div className="main-wrapper">
          <Header />
          <div className="page-wrapper ms-0">
            <div className="content">
              {children}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="main-wrapper">
        <Header />
        <Sidebar />
        <div className="page-wrapper">
          <div className="content">
            {children}
          </div>
          <div className="footer">
            <p>Copyright &copy; 2025 DreamsPOS. All rights reserved.</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Layout;
