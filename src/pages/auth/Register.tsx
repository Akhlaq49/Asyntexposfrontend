import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const Register: React.FC = () => {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName || !email || !password) {
      setError(t('auth.all_fields_required'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.password_min_chars'));
      return;
    }
    setLoading(true);
    try {
      await register(fullName, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.registration_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-wrapper">
      <div className="account-content">
        <div className="login-wrapper">
          <div className="login-content">
            <div className="login-userset">
              <div className="login-logo logo-normal">
                <img src="/assets/img/logo.png" alt="Logo" />
              </div>
              <Link to="/" className="login-logo logo-white">
                <img src="/assets/img/logo-white.png" alt="Logo" />
              </Link>
              <div className="login-userheading">
                <h3>{t('auth.register')}</h3>
                <h4>{t('auth.create_your_account')}</h4>
              </div>
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">{t('common.full_name')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.enter_full_name')}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('common.email')}</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.enter_email')}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('auth.password')}</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.enter_password_min')}
                    required
                  />
                </div>
                <div className="form-login">
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? t('auth.creating_account') : t('auth.register')}
                  </button>
                </div>
              </form>
              <div className="signinform text-center mt-3">
                <span>{t('auth.already_have_account')} </span>
                <Link to="/signin">{t('auth.sign_in')}</Link>
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

export default Register;

