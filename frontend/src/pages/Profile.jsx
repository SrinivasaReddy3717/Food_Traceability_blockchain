import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  API_BASE_URL,
  clearStoredAuth,
  getAuthHeaders,
  getStoredAuth,
} from '../utils/api';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const { user: storedUser, token } = getStoredAuth();

  const [user, setUser] = useState(storedUser);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          clearStoredAuth();
          setUser(null);
          return;
        }
        const result = await response.json();
        setUser(result.user);
      } catch {
        // Keep stored user snapshot if backend temporarily unreachable
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const handleLogout = () => {
    clearStoredAuth();
    navigate('/login');
  };

  return (
    <div className="profile-page">
      <div className="profile-top-section">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Authenticated account details and supply-chain permissions.</p>
        </div>

        <Link to="/dashboard" className="dashboard-button">
          ← Dashboard
        </Link>
      </div>

      <div className="profile-card">
        {loading ? (
          <p>Loading account profile...</p>
        ) : !user ? (
          <>
            <div className="profile-avatar">?</div>
            <h2>Not Signed In</h2>
            <p className="profile-role">Guest Viewer</p>
            <p style={{ color: '#68756d', marginBottom: '20px' }}>
              Sign in with your supply-chain role to register products or record
              blockchain journey events.
            </p>
            <Link to="/login" className="edit-profile-button" style={{ textDecoration: 'none' }}>
              Sign In →
            </Link>
          </>
        ) : (
          <>
            <div className="profile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <h2>{user.name}</h2>
            <p className="profile-role">{user.role}</p>

            <div className="profile-details">
              <div className="profile-detail">
                <span>Name</span>
                <strong>{user.name}</strong>
              </div>

              <div className="profile-detail">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>

              <div className="profile-detail">
                <span>Role</span>
                <strong>{user.role}</strong>
              </div>

              <div className="profile-detail">
                <span>Organization</span>
                <strong>{user.organization || 'Not specified'}</strong>
              </div>

              <div className="profile-detail">
                <span>Session Status</span>
                <strong className="status-active">Authenticated (JWT)</strong>
              </div>
            </div>

            <button
              className="edit-profile-button"
              onClick={handleLogout}
              style={{ background: '#9c3e3e' }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
