import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, saveStoredAuth } from '../utils/api';
import './Register.css';

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Consumer');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match!');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          organization: organization.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed.');
      }

      saveStoredAuth(result.token, result.user);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to register. Check backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-info">
          <Link to="/" className="register-logo">
            🌱 TraceChain
          </Link>

          <h1>Join TraceChain</h1>

          <p>
            Create your account and experience transparent,
            secure, and trustworthy food tracking.
          </p>

          <div className="register-benefits">
            <p>✓ Track food products easily</p>
            <p>✓ Verify product information on-chain</p>
            <p>✓ Role-based supply chain participation</p>
          </div>
        </div>

        <div className="register-form-section">
          <h2>Create Account</h2>

          <p className="register-subtitle">
            Register to access the TraceChain platform
          </p>

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
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
              <label>Supply Chain Role</label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd8ce',
                  background: '#ffffff',
                  color: '#1d3325',
                  fontSize: '14px',
                }}
              >
                <option value="Consumer">Consumer</option>
                <option value="Farmer">Farmer / Producer</option>
                <option value="Processor">Processor</option>
                <option value="Transporter">Transporter</option>
                <option value="Distributor">Distributor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Organization / Farm Name (Optional)</label>

              <input
                type="text"
                placeholder="e.g. Green Farm or ABC Processing Unit"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Create a password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>

              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="register-submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          <p className="login-link">
            Already have an account?
            <Link to="/login"> Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
