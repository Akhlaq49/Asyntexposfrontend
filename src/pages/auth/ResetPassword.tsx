import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="main-wrapper">
      <div className="account-content">
        <div className="login-wrapper">
          <div className="login-content">
            <div className="login-userset">
              <div className="login-logo logo-normal">
                <img src="/assets/img/newlogo.png" alt="Logo" />
              </div>
              <Link to="/" className="login-logo logo-white">
                <img src="/assets/img/newlogo.png" alt="Logo" />
              </Link>
              <div className="login-userheading">
                <h3>{t('auth.reset_password')}</h3>
                <h4>{t('auth.please_enter_details')}</h4>
              </div>
              <form>
                <div className="mb-3">
                  <label className="form-label">{t('common.email')}</label>
                  <input type="email" className="form-control" />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('auth.password')}</label>
                  <input type="password" className="form-control" />
                </div>
                <div className="form-login">
                  <button type="submit" className="btn btn-primary w-100">{t('auth.reset_password')}</button>
                </div>
              </form>
              <div className="signinform text-center mt-3">
                <Link to="/signin">{t('auth.back_to_login')}</Link>
              </div>
            </div>
          </div>
          <div className="login-img">
            <img src="/assets/img/authentication/login-img.png" alt="Login" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

