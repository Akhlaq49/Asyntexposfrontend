import React from 'react';
import { Link } from 'react-router-dom';

const EmailVerification: React.FC = () => {
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
                <h3>Email Verification</h3>
                <h4>Please enter your details</h4>
              </div>
              <form>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-control" />
                </div>
                <div className="form-login">
                  <button type="submit" className="btn btn-primary w-100">Email Verification</button>
                </div>
              </form>
              <div className="signinform text-center mt-3">
                <Link to="/signin">Back to Login</Link>
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

export default EmailVerification;

