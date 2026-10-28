import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // logout asks "Do you want to logout?" first
  const [confirmLogout, setConfirmLogout] = useState(false);
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    setConfirmLogout(true);
  };
  const doLogout = () => {
    setConfirmLogout(false);
    logout();
    navigate('/signin');
  };

  const handleMobileToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.classList.toggle('slide-nav');
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="header">
      <div className="main-header">
        {/* Logo */}
        <div className="header-left active">
          <Link to="/" className="logo logo-normal">
            <img src="/assets/img/newlogo-sidebar.png" alt="Logo" />
          </Link>
          <Link to="/" className="logo logo-white">
            <img src="/assets/img/newlogo-sidebar.png" alt="Logo" />
          </Link>
          <Link to="/" className="logo-small">
            <img src="/assets/img/newlogo-sidebar.png" alt="Logo" />
          </Link>
          <Link to="/" className="logo-small-white">
            <img src="/assets/img/newlogo-sidebar.png" alt="Logo" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <a id="mobile_btn" className="mobile_btn" href="#sidebar" onClick={handleMobileToggle}>
          <span className="bar-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </a>

        {/* Header Menu */}
        <ul className="nav user-menu">
          {/* Select Store */}
          {/* Add New */}
          <li className="nav-item dropdown link-nav">
            <a href="#" className="btn btn-primary btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
              <i className="ti ti-circle-plus me-1"></i><span className="header-btn-text">{t('header.add_new')}</span>
            </a>
            <div className="dropdown-menu dropdown-xl dropdown-menu-center">
              <div className="row g-2">
                <div className="col-md-2">
                  <Link to="/category-list" className="link-item">
                    <span className="link-icon"><i className="ti ti-brand-codepen"></i></span>
                    <p>{t('header.category')}</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/add-product" className="link-item">
                    <span className="link-icon"><i className="ti ti-square-plus"></i></span>
                    <p>{t('header.product')}</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/expense-list" className="link-item">
                    <span className="link-icon"><i className="ti ti-file-text"></i></span>
                    <p>{t('header.expense')}</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/quotation-list" className="link-item">
                    <span className="link-icon"><i className="ti ti-device-floppy"></i></span>
                    <p>{t('header.quotation')}</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/sales-returns" className="link-item">
                    <span className="link-icon"><i className="ti ti-copy"></i></span>
                    <p>{t('header.return')}</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/users" className="link-item">
                    <span className="link-icon"><i className="ti ti-user"></i></span>
                    <p>{t('header.user')}</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/customers" className="link-item">
                    <span className="link-icon"><i className="ti ti-users"></i></span>
                    <p>{t('header.customer')}</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/suppliers" className="link-item">
                    <span className="link-icon"><i className="ti ti-user-check"></i></span>
                    <p>{t('header.supplier')}</p>
                  </Link>
                </div>
              </div>
            </div>
          </li>


          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Fullscreen */}
          <li className="nav-item nav-item-box">
            <a href="#" id="btnFullscreen" onClick={handleFullscreen}>
              <i className="ti ti-maximize"></i>
            </a>
          </li>

        </ul>

        {/* Logout: a plain text button in the top-right corner, with who is signed in */}
        <div className="header-logout d-none d-md-flex align-items-center gap-2"
          style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
          <div className="text-end lh-sm">
            <div className="fw-medium" style={{ fontSize: 13 }}>{user?.fullName || 'User'}</div>
            <small className="text-muted">{user?.role || ''}</small>
          </div>
          <button type="button" className="btn btn-outline-danger btn-sm px-3 fw-medium" onClick={handleLogout}>{t('auth.logout')}</button>
        </div>

        {/* Mobile Menu */}
        <div className="dropdown mobile-user-menu">
          <a href="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
            <i className="fa fa-ellipsis-v"></i>
          </a>
          <div className="dropdown-menu dropdown-menu-right">
            <a className="dropdown-item" href="#" onClick={handleLogout}>{t('auth.logout')}</a>
          </div>
        </div>
      </div>

      {/* Logout confirmation */}
      {confirmLogout && createPortal(
        <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,.5)', zIndex: 2000 }} onClick={() => setConfirmLogout(false)}>
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-transparent text-danger mb-3" style={{ width: 56, height: 56 }}>
                  <i className="ti ti-logout fs-24"></i>
                </span>
                <h5 className="mb-3">Do you want to logout?</h5>
                <div className="d-flex justify-content-center gap-2">
                  <button type="button" className="btn btn-secondary px-4" onClick={() => setConfirmLogout(false)}>No</button>
                  <button type="button" className="btn btn-danger px-4" onClick={doLogout}>Yes</button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Header;
