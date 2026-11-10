import { useState } from 'react';
import { Link } from 'react-router-dom';
import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    alert('Password reset functionality will be connected to the backend soon!');
  };

  return (
    <div className="forgot-page">
      <div className="forgot-container">
        <div className="forgot-icon">🔐</div>

        <h1>Forgot Password?</h1>

        <p>
          Enter your registered email address and we will help
          you reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="forgot-submit">
            Send Reset Link →
          </button>
        </form>

        <Link to="/login" className="back-login">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;