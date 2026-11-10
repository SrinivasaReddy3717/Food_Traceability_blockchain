import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  API_BASE_URL,
  clearStoredAuth,
  formatDisplayDate,
  getAuthHeaders,
  getStoredAuth,
} from '../utils/api';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user, token } = getStoredAuth();
  const [quickProductId, setQuickProductId] = useState('');

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalEvents: 0,
    totalProducers: 0,
    verifiedRecords: 0,
    pendingRecords: 0,
    inTransitProducts: 0,
  });
  const [recentProducts, setRecentProducts] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminFeedback, setAdminFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const isAdmin = user?.role === 'Admin' && Boolean(token);
        const [statsRes, usersRes, feedbackRes] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: getAuthHeaders(),
          }),
          isAdmin
            ? fetch(`${API_BASE_URL}/auth/users`, {
                headers: getAuthHeaders(),
              }).catch(() => null)
            : Promise.resolve(null),
          isAdmin
            ? fetch(`${API_BASE_URL}/feedback`).catch(() => null)
            : Promise.resolve(null),
        ]);

        const data = await statsRes.json();

        if (!statsRes.ok) {
          throw new Error(data.message || 'Unable to load dashboard statistics.');
        }

        setStats(data.stats);
        setRecentProducts(data.recentProducts || []);
        setRecentEvents(data.recentEvents || []);

        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json();
          setAdminUsers(usersData.users || []);
        }

        if (feedbackRes && feedbackRes.ok) {
          const fbData = await feedbackRes.json();
          setAdminFeedback(fbData.feedback || []);
        }
      } catch (error) {
        setErrorMessage(
          error.message || 'Backend API unavailable. Ensure server is running on port 5000.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [token, user?.role]);

  const handleLogout = () => {
    clearStoredAuth();
    navigate('/login');
  };

  const workflowSteps = [
    {
      number: '01',
      title: 'Producer',
      description: 'Food production and registration',
      icon: '🌾',
    },
    {
      number: '02',
      title: 'Processor',
      description: 'Processing event recording',
      icon: '🏭',
    },
    {
      number: '03',
      title: 'Transporter',
      description: 'Transportation tracking',
      icon: '🚚',
    },
    {
      number: '04',
      title: 'Distributor',
      description: 'Distribution management',
      icon: '🏪',
    },
    {
      number: '05',
      title: 'Consumer',
      description: 'QR scan and verification',
      icon: '👤',
    },
  ];

  const userInitial = (user?.name || 'G').charAt(0).toUpperCase();
  const isStaff = Boolean(
    user &&
      ['Admin', 'Farmer', 'Producer', 'Processor', 'Transporter', 'Distributor'].includes(
        user.role
      )
  );
  const canRegisterProduct = Boolean(
    user && ['Admin', 'Farmer', 'Producer'].includes(user.role)
  );

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <span>🌿</span>
          <div>
            <h2>TraceChain</h2>
            <p>Food Traceability</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <Link to="/dashboard" className="nav-item active">
            <span>📊</span>
            Dashboard
          </Link>

          <Link to="/products" className="nav-item">
            <span>📦</span>
            Products
          </Link>

          {canRegisterProduct && (
            <Link to="/register-product" className="nav-item">
              <span>➕</span>
              Register Product
            </Link>
          )}

          {isStaff && (
            <Link to="/add-journey" className="nav-item">
              <span>📝</span>
              Add Journey
            </Link>
          )}

          <Link to="/trace" className="nav-item">
            <span>🔗</span>
            Track Food
          </Link>

          <Link to="/verification" className="nav-item">
            <span>✅</span>
            Verification
          </Link>

          <Link to="/profile" className="nav-item">
            <span>👤</span>
            Profile
          </Link>
        </nav>

        {user ? (
          <button className="dashboard-logout" onClick={handleLogout}>
            <span>↪</span>
            Logout
          </button>
        ) : (
          <Link to="/login" className="nav-item" style={{ marginTop: 'auto' }}>
            <span>🔐</span>
            Sign In
          </Link>
        )}
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">
              BLOCKCHAIN-POWERED FOOD TRACEABILITY
            </p>
            <h1>
              {user?.role === 'Admin'
                ? 'Admin Overview Dashboard'
                : user?.role === 'Consumer'
                ? 'Consumer Traceability Dashboard'
                : 'Welcome to your Dashboard'}
            </h1>
            <p>
              Monitor food products and follow their complete journey from farm
              to consumer.
            </p>
          </div>

          <div className="dashboard-user">
            <div className="dashboard-user-avatar">{userInitial}</div>
            <div>
              <strong>{user ? user.name : 'Guest Viewer'}</strong>
              <span>{user ? user.role : 'Public Consumer'}</span>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '14px 18px',
              marginBottom: '22px',
              borderRadius: '10px',
              background: '#fef3f2',
              color: '#b42318',
              fontSize: '14px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Quick Consumer Lookup Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quickProductId.trim()) {
              navigate(`/trace/${encodeURIComponent(quickProductId.trim())}`);
            }
          }}
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '22px',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Quick Track or Verify by Product ID (e.g. FT-1794300479863)"
            value={quickProductId}
            onChange={(e) => setQuickProductId(e.target.value)}
            style={{
              flex: 1,
              minWidth: '240px',
              padding: '11px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd8ce',
              background: '#ffffff',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              border: 'none',
              background: '#397247',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Track &amp; Verify →
          </button>
        </form>

        <section className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon green">📦</div>
            <div>
              <span>Total Products</span>
              <h2>{loading ? '...' : stats.totalProducts}</h2>
              <small>{stats.totalProducers} registered producers</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">✅</div>
            <div>
              <span>On-Chain Verified</span>
              <h2>{loading ? '...' : stats.verifiedRecords}</h2>
              <small>Confirmed on Ethereum</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">⏳</div>
            <div>
              <span>Pending Blockchain</span>
              <h2>{loading ? '...' : stats.pendingRecords}</h2>
              <small>Awaiting on-chain anchor</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">🔗</div>
            <div>
              <span>Total Journey Events</span>
              <h2>{loading ? '...' : stats.totalEvents}</h2>
              <small>{stats.inTransitProducts} products in transit</small>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Food Supply Chain</h2>
              <p>Track the complete journey of a food product.</p>
            </div>
          </div>

          <div className="workflow-container">
            {workflowSteps.map((step, index) => (
              <div className="workflow-item" key={step.number}>
                <div className="workflow-card">
                  <div className="workflow-icon">{step.icon}</div>
                  <span className="workflow-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>

                {index < workflowSteps.length - 1 && (
                  <div className="workflow-arrow">→</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-content-grid">
          <div className="dashboard-section recent-events-section">
            <div className="section-heading">
              <div>
                <h2>Recent Traceability Events</h2>
                <p>Latest activity across the supply chain.</p>
              </div>

              <Link to="/products" className="section-link">
                View All Products
              </Link>
            </div>

            <div className="events-list">
              {!loading && recentEvents.length === 0 && (
                <p style={{ color: '#68756d', fontSize: '14px' }}>
                  No journey events recorded yet.
                </p>
              )}

              {recentEvents.map((event) => (
                <Link
                  to={`/trace/${event.productId}`}
                  className="event-row"
                  key={event.id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="event-icon">🔗</div>

                  <div className="event-info">
                    <strong>{event.productName}</strong>
                    <span>
                      {event.eventType} — {event.location}
                    </span>
                    <small>
                      {event.productId} • {formatDisplayDate(event.eventDate)}
                      {event.blockNumber !== null && event.blockNumber !== undefined
                        ? ` • Block #${event.blockNumber}`
                        : ''}
                    </small>
                  </div>

                  <span
                    className={`event-status ${
                      event.blockchainStatus === 'Confirmed'
                        ? 'verified'
                        : 'in-transit'
                    }`}
                  >
                    {event.blockchainStatus === 'Confirmed'
                      ? 'On-Chain'
                      : 'Pending'}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="dashboard-section quick-actions-section">
            <div className="section-heading">
              <div>
                <h2>Quick Actions</h2>
                <p>Access important platform features.</p>
              </div>
            </div>

            <div className="quick-actions">
              <Link to="/products" className="quick-action">
                <span>📦</span>
                <div>
                  <strong>View Products &amp; QR Codes</strong>
                  <small>Explore registered food products</small>
                </div>
                <b>→</b>
              </Link>

              {canRegisterProduct && (
                <Link to="/register-product" className="quick-action">
                  <span>➕</span>
                  <div>
                    <strong>Register Product</strong>
                    <small>Add a new food product</small>
                  </div>
                  <b>→</b>
                </Link>
              )}

              {isStaff && (
                <Link to="/add-journey" className="quick-action">
                  <span>📝</span>
                  <div>
                    <strong>Record Journey Event</strong>
                    <small>Add a supply-chain stage update</small>
                  </div>
                  <b>→</b>
                </Link>
              )}

              <Link to="/trace" className="quick-action">
                <span>🔍</span>
                <div>
                  <strong>Track Food</strong>
                  <small>View product journey timeline</small>
                </div>
                <b>→</b>
              </Link>

              <Link to="/verification" className="quick-action">
                <span>✅</span>
                <div>
                  <strong>Blockchain Verification</strong>
                  <small>Check product authenticity</small>
                </div>
                <b>→</b>
              </Link>

              <Link to="/profile" className="quick-action">
                <span>👤</span>
                <div>
                  <strong>My Profile</strong>
                  <small>View authenticated role &amp; permissions</small>
                </div>
                <b>→</b>
              </Link>
            </div>
          </div>
        </section>

        {/* Recent Product Registrations */}
        {recentProducts.length > 0 && (
          <section className="dashboard-section" style={{ marginTop: '24px' }}>
            <div className="section-heading">
              <div>
                <h2>Recent Product Registrations</h2>
                <p>Latest registered food batches.</p>
              </div>
              <Link to="/products" className="section-link">
                Manage Products →
              </Link>
            </div>

            <div className="events-list">
              {recentProducts.map((product) => (
                <Link
                  to={`/trace/${product.productId}`}
                  className="event-row"
                  key={product.productId}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="event-icon">🌾</div>
                  <div className="event-info">
                    <strong>{product.productName}</strong>
                    <span>
                      {product.producer} • {product.origin}
                    </span>
                    <small>
                      {product.productId} • Batch {product.batchNumber || 'N/A'} •{' '}
                      {formatDisplayDate(product.productionDate)}
                    </small>
                  </div>
                  <span className="event-status completed">{product.status}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Admin-Only Supply Chain Users Directory */}
        {user?.role === 'Admin' && adminUsers.length > 0 && (
          <section className="dashboard-section" style={{ marginTop: '24px' }}>
            <div className="section-heading">
              <div>
                <h2>Registered Supply-Chain Accounts (Admin View)</h2>
                <p>Protected endpoint verified via JWT Admin role.</p>
              </div>
              <span className="section-link">{adminUsers.length} Accounts</span>
            </div>

            <div className="events-list">
              {adminUsers.map((account) => (
                <div className="event-row" key={account.id}>
                  <div className="event-icon">👤</div>
                  <div className="event-info">
                    <strong>{account.name}</strong>
                    <span>{account.email}</span>
                    <small>
                      {account.organization || 'No organization specified'}
                    </small>
                  </div>
                  <span className="event-status verified">{account.role}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Admin-Only Consumer Feedback & Reports */}
        {user?.role === 'Admin' && adminFeedback.length > 0 && (
          <section className="dashboard-section" style={{ marginTop: '24px' }}>
            <div className="section-heading">
              <div>
                <h2>Consumer Feedback &amp; Quality Reports</h2>
                <p>Latest reviews and issue reports submitted by consumers.</p>
              </div>
              <span className="section-link">{adminFeedback.length} Reviews</span>
            </div>

            <div className="events-list">
              {adminFeedback.map((fb) => (
                <Link
                  to={`/trace/${fb.productId}`}
                  className="event-row"
                  key={fb._id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="event-icon">⭐</div>
                  <div className="event-info">
                    <strong>
                      {fb.consumerName} • {'★'.repeat(fb.rating)} ({fb.productId})
                    </strong>
                    <span>{fb.comment}</span>
                    <small>{formatDisplayDate(fb.createdAt)}</small>
                  </div>
                  <span
                    className={`event-status ${
                      fb.feedbackType === 'Incorrect Information Report'
                        ? 'in-transit'
                        : 'verified'
                    }`}
                  >
                    {fb.feedbackType}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
