import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-wrapper">
      <div className="account-content">
        <div className="row login-wrapper m-0">
          <div className="col-lg-6 p-0">
            <div className="login-content">
              <form onSubmit={handleSubmit}>
                <div className="login-userset">
                  <div className="login-logo logo-normal">
                    <img src="/assets/img/logo.svg" alt="img" />
                  </div>
                  <Link to="/" className="login-logo logo-white">
                    <img src="/assets/img/logo-white.svg" alt="Img" />
                  </Link>
                  <div className="login-userheading">
                    <h3>Sign In</h3>
                    <h4>Access the Dreamspos panel using your email and passcode.</h4>
                  </div>
                  {error && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                      {error}
                      <button type="button" className="btn-close" onClick={() => setError('')}></button>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">Email Address</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control border-end-0"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <span className="input-group-text border-start-0">
                        <i className="ti ti-mail"></i>
                      </span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <div className="pass-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="pass-input form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <span
                        className={`ti toggle-password ${showPassword ? 'ti-eye' : 'ti-eye-off'} text-gray-9`}
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ cursor: 'pointer' }}
                      ></span>
                    </div>
                  </div>
                  <div className="form-login authentication-check">
                    <div className="row">
                      <div className="col-6">
                        <div className="custom-control custom-checkbox">
                          <label className="checkboxs ps-4 mb-0 pb-0 line-height-1">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="checkmarks"></span>Remember me
                          </label>
                        </div>
                      </div>
                      <div className="col-6 text-end">
                        <Link className="forgot-link" to="/forgot-password">Forgot Password?</Link>
                      </div>
                    </div>
                  </div>
                  <div className="form-login">
                    <button type="submit" className="btn btn-login" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </div>
                  <div className="signinform">
                    <h4>New on our platform?<Link to="/register" className="hover-a"> Create an account</Link></h4>
                  </div>
                  <div className="form-setlogin or-text">
                    <h4>OR</h4>
                  </div>
                  <div className="form-sociallink">
                    <div className="d-flex align-items-center justify-content-center flex-wrap">
                      <div className="text-center me-2 flex-fill">
                        <a href="javascript:void(0);" className="br-10 p-2 btn btn-info d-flex align-items-center justify-content-center">
                          <img className="img-fluid m-1" src="/assets/img/icons/facebook-logo.svg" alt="Facebook" />
                        </a>
                      </div>
                      <div className="text-center me-2 flex-fill">
                        <a href="javascript:void(0);" className="btn btn-white br-10 p-2 border d-flex align-items-center justify-content-center">
                          <img className="img-fluid m-1" src="/assets/img/icons/google-logo.svg" alt="Google" />
                        </a>
                      </div>
                      <div className="text-center flex-fill">
                        <a href="javascript:void(0);" className="bg-dark br-10 p-2 btn btn-dark d-flex align-items-center justify-content-center">
                          <img className="img-fluid m-1" src="/assets/img/icons/apple-logo.svg" alt="Apple" />
                        </a>
                      </div>
                    </div>
                    <div className="my-4 d-flex justify-content-center align-items-center copyright-text">
                      <p>Copyright &copy; 2025 DreamsPOS</p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="col-lg-6 p-0">
            <div className="login-img">
              <img src="/assets/img/authentication/authentication-01.svg" alt="img" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;

