import React from 'react';
import { Link } from 'react-router-dom';

const Error500: React.FC = () => {
  return (
    <div className="main-wrapper">
      <div className="error-box">
        <div className="error-img">
          <img src="/assets/img/authentication/error-500.png" alt="Error" className="img-fluid" />
        </div>
        <h3 className="h2 mb-3">500 - Page Not Found</h3>
        <p className="mb-4">The page you are looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );
};

export default Error500;

