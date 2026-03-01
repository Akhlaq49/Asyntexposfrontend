import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register: React.FC = () => {
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
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(fullName, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                <img src="/assets/img/logo.svg" alt="Logo" />
              </div>
              <Link to="/" className="login-logo logo-white">
                <img src="/assets/img/logo-white.svg" alt="Logo" />
              </Link>
              <div className="login-userheading">
                <h3>Register</h3>
                <h4>Create your account</h4>
              </div>
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password (min 6 chars)"
                    required
                  />
                </div>
                <div className="form-login">
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? 'Creating account...' : 'Register'}
                  </button>
                </div>
              </form>
              <div className="signinform text-center mt-3">
                <span>Already have an account? </span>
                <Link to="/signin">Sign In</Link>
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

