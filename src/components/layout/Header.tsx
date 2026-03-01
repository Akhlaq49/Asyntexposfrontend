import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
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
            <img src="/assets/img/logo.svg" alt="Logo" />
          </Link>
          <Link to="/" className="logo logo-white">
            <img src="/assets/img/logo-white.svg" alt="Logo" />
          </Link>
          <Link to="/" className="logo-small">
            <img src="/assets/img/logo-small.png" alt="Logo" />
          </Link>
          <Link to="/" className="logo-small-white">
            <img src="/assets/img/logo-small-white.png" alt="Logo" />
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
          <li className="nav-item dropdown has-arrow main-drop select-store-dropdown">
            <a href="#" className="dropdown-toggle nav-link select-store" data-bs-toggle="dropdown">
              <span className="user-info">
                <span className="user-letter">
                  <img src="/assets/img/store/store-01.png" alt="Store" className="img-fluid" />
                </span>
                <span className="user-detail">
                  <span className="user-name">Freshmart</span>
                </span>
              </span>
            </a>
            <div className="dropdown-menu dropdown-menu-right">
              <a href="#" className="dropdown-item">
                <img src="/assets/img/store/store-01.png" alt="" className="img-fluid" />Freshmart
              </a>
              <a href="#" className="dropdown-item">
                <img src="/assets/img/store/store-02.png" alt="" className="img-fluid" />Grocery Apex
              </a>
              <a href="#" className="dropdown-item">
                <img src="/assets/img/store/store-03.png" alt="" className="img-fluid" />Grocery Bevy
              </a>
              <a href="#" className="dropdown-item">
                <img src="/assets/img/store/store-04.png" alt="" className="img-fluid" />Grocery Eden
              </a>
            </div>
          </li>

          {/* Add New */}
          <li className="nav-item dropdown link-nav">
            <a href="#" className="btn btn-primary btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
              <i className="ti ti-circle-plus me-1"></i>Add New
            </a>
            <div className="dropdown-menu dropdown-xl dropdown-menu-center">
              <div className="row g-2">
                <div className="col-md-2">
                  <Link to="/category-list" className="link-item">
                    <span className="link-icon"><i className="ti ti-brand-codepen"></i></span>
                    <p>Category</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/add-product" className="link-item">
                    <span className="link-icon"><i className="ti ti-square-plus"></i></span>
                    <p>Product</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/purchase-list" className="link-item">
                    <span className="link-icon"><i className="ti ti-shopping-bag"></i></span>
                    <p>Purchase</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/online-orders" className="link-item">
                    <span className="link-icon"><i className="ti ti-shopping-cart"></i></span>
                    <p>Sale</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/expense-list" className="link-item">
                    <span className="link-icon"><i className="ti ti-file-text"></i></span>
                    <p>Expense</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/quotation-list" className="link-item">
                    <span className="link-icon"><i className="ti ti-device-floppy"></i></span>
                    <p>Quotation</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/sales-returns" className="link-item">
                    <span className="link-icon"><i className="ti ti-copy"></i></span>
                    <p>Return</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/users" className="link-item">
                    <span className="link-icon"><i className="ti ti-user"></i></span>
                    <p>User</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/customers" className="link-item">
                    <span className="link-icon"><i className="ti ti-users"></i></span>
                    <p>Customer</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/billers" className="link-item">
                    <span className="link-icon"><i className="ti ti-shield"></i></span>
                    <p>Biller</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/suppliers" className="link-item">
                    <span className="link-icon"><i className="ti ti-user-check"></i></span>
                    <p>Supplier</p>
                  </Link>
                </div>
                <div className="col-md-2">
                  <Link to="/stock-transfer" className="link-item">
                    <span className="link-icon"><i className="ti ti-truck"></i></span>
                    <p>Transfer</p>
                  </Link>
                </div>
              </div>
            </div>
          </li>

          {/* POS Button */}
          <li className="nav-item pos-nav">
            <Link to="/pos" className="btn btn-dark btn-md d-inline-flex align-items-center">
              <i className="ti ti-device-laptop me-1"></i>POS
            </Link>
          </li>

          {/* Language Flag */}
          <li className="nav-item dropdown has-arrow flag-nav nav-item-box">
            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#">
              <img src="/assets/img/flags/us-flag.svg" alt="Language" className="img-fluid" />
            </a>
            <div className="dropdown-menu dropdown-menu-right">
              <a href="#" className="dropdown-item">
                <img src="/assets/img/flags/english.svg" alt="" height="16" />English
              </a>
              <a href="#" className="dropdown-item">
                <img src="/assets/img/flags/arabic.svg" alt="" height="16" />Arabic
              </a>
            </div>
          </li>

          {/* Fullscreen */}
          <li className="nav-item nav-item-box">
            <a href="#" id="btnFullscreen" onClick={handleFullscreen}>
              <i className="ti ti-maximize"></i>
            </a>
          </li>

          {/* Email */}
          <li className="nav-item nav-item-box">
            <Link to="/email">
              <i className="ti ti-mail"></i>
              <span className="badge rounded-pill">1</span>
            </Link>
          </li>

          {/* Notifications */}
          <li className="nav-item dropdown nav-item-box">
            <a href="#" className="dropdown-toggle nav-link" data-bs-toggle="dropdown">
              <i className="ti ti-bell"></i>
            </a>
            <div className="dropdown-menu notifications">
              <div className="topnav-dropdown-header">
                <h5 className="notification-title">Notifications</h5>
                <a href="#" className="clear-noti">Mark all as read</a>
              </div>
              <div className="noti-content">
                <ul className="notification-list">
                  <li className="notification-message">
                    <Link to="/activities">
                      <div className="media d-flex">
                        <span className="avatar flex-shrink-0">
                          <img alt="" src="/assets/img/profiles/avatar-13.jpg" />
                        </span>
                        <div className="flex-grow-1">
                          <p className="noti-details"><span className="noti-title">James Kirwin</span> confirmed his order. Order No: #78901</p>
                          <p className="noti-time">4 mins ago</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                  <li className="notification-message">
                    <Link to="/activities">
                      <div className="media d-flex">
                        <span className="avatar flex-shrink-0">
                          <img alt="" src="/assets/img/profiles/avatar-03.jpg" />
                        </span>
                        <div className="flex-grow-1">
                          <p className="noti-details"><span className="noti-title">Leo Kelly</span> cancelled his order scheduled for 17 Jan 2025</p>
                          <p className="noti-time">10 mins ago</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                  <li className="notification-message">
                    <Link to="/activities" className="recent-msg">
                      <div className="media d-flex">
                        <span className="avatar flex-shrink-0">
                          <img alt="" src="/assets/img/profiles/avatar-17.jpg" />
                        </span>
                        <div className="flex-grow-1">
                          <p className="noti-details">Payment of $50 received for Order #67890 from <span className="noti-title">Antonio Engle</span></p>
                          <p className="noti-time">05 mins ago</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                  <li className="notification-message">
                    <Link to="/activities" className="recent-msg">
                      <div className="media d-flex">
                        <span className="avatar flex-shrink-0">
                          <img alt="" src="/assets/img/profiles/avatar-02.jpg" />
                        </span>
                        <div className="flex-grow-1">
                          <p className="noti-details"><span className="noti-title">Andrea</span> confirmed his order. Order No: #73401</p>
                          <p className="noti-time">4 mins ago</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="topnav-dropdown-footer d-flex align-items-center gap-3">
                <a href="#" className="btn btn-secondary btn-md w-100">Cancel</a>
                <Link to="/activities" className="btn btn-primary btn-md w-100">View all</Link>
              </div>
            </div>
          </li>

          {/* Settings */}
          <li className="nav-item nav-item-box">
            <Link to="/general-settings"><i className="ti ti-settings"></i></Link>
          </li>

          {/* Profile */}
          <li className="nav-item dropdown has-arrow main-drop profile-nav">
            <a href="#" className="nav-link userset" data-bs-toggle="dropdown">
              <span className="user-info p-0">
                <span className="user-letter">
                  <img src="/assets/img/profiles/avator1.jpg" alt="" className="img-fluid" />
                </span>
              </span>
            </a>
            <div className="dropdown-menu menu-drop-user">
              <div className="profileset d-flex align-items-center">
                <span className="user-img me-2">
                  <img src="/assets/img/profiles/avator1.jpg" alt="" />
                </span>
                <div>
                  <h6 className="fw-medium">{user?.fullName || 'User'}</h6>
                  <p>{user?.role || 'User'}</p>
                </div>
              </div>
              <Link className="dropdown-item" to="/profile"><i className="ti ti-user-circle me-2"></i>My Profile</Link>
              <Link className="dropdown-item" to="/sales-report"><i className="ti ti-file-text me-2"></i>Reports</Link>
              <Link className="dropdown-item" to="/general-settings"><i className="ti ti-settings-2 me-2"></i>Settings</Link>
              <hr className="my-2" />
              <a className="dropdown-item logout" href="#" onClick={handleLogout}><i className="ti ti-logout me-2"></i>Logout</a>
            </div>
          </li>
        </ul>

        {/* Mobile Menu */}
        <div className="dropdown mobile-user-menu">
          <a href="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
            <i className="fa fa-ellipsis-v"></i>
          </a>
          <div className="dropdown-menu dropdown-menu-right">
            <Link className="dropdown-item" to="/profile">My Profile</Link>
            <Link className="dropdown-item" to="/general-settings">Settings</Link>
            <a className="dropdown-item" href="#" onClick={handleLogout}>Logout</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
