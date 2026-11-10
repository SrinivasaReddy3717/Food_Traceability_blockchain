import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL, saveStoredAuth } from '../utils/api';
import './Login.css';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@tracechain.com' },
  { label: 'Farmer', email: 'farmer@tracechain.com' },
  { label: 'Processor', email: 'processor@tracechain.com' },
  { label: 'Transporter', email: 'transporter@tracechain.com' },
  { label: 'Distributor', email: 'distributor@tracechain.com' },
  { label: 'Consumer', email: 'consumer@tracechain.com' },
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from || '/dashboard';
  const redirectNotice = location.state?.notice || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDemoFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('TraceChain@123');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed.');
      }

      saveStoredAuth(result.token, result.user);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in. Check backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Section */}
        <div className="login-info">
          <Link to="/" className="login-logo">
            🌱 TraceChain
          </Link>

          <h1>Welcome Back!</h1>

          <p>
            Track your food journey with transparency,
            security, and trust.
          </p>

          <div className="login-benefits">
            <p>✓ Blockchain-powered traceability</p>
            <p>✓ Role-based supply chain access</p>
            <p>✓ Real-time blockchain verification</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="login-form-section">
          <h2>Sign In</h2>

          <p className="login-subtitle">
            Enter your credentials to access your account
          </p>

          {redirectNotice && (
            <div
              role="status"
              style={{
                padding: '10px 12px',
                marginBottom: '14px',
                borderRadius: '8px',
                background: '#eef7ef',
                color: '#236b3c',
                fontSize: '13px',
              }}
            >
              {redirectNotice}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                marginBottom: '14px',
                borderRadius: '8px',
                background: '#fef3f2',
                color: '#b42318',
                fontSize: '13px',
              }}
            >
              {errorMessage}
            </div>
          )}

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

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="forgot-password">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In →'}
            </button>
          </form>

          <div
            style={{
              marginTop: '18px',
              padding: '12px',
              borderRadius: '10px',
              background: '#f5f9f6',
              border: '1px solid #dfeae1',
            }}
          >
            <small
              style={{
                display: 'block',
                color: '#376f45',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              Quick Fill Seeded Role Accounts (Password: TraceChain@123)
            </small>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => handleDemoFill(acc.email)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #bfd3c3',
                    background: '#ffffff',
                    color: '#1d3325',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <p className="register-link">
            Don't have an account?
            <Link to="/register"> Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
