import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import TrackFood from './pages/TrackFood';
import Verification from './pages/Verification';
import Profile from './pages/Profile';
import RegisterProduct from './pages/RegisterProduct';
import AddJourney from './pages/AddJourney';
import TraceDetails from './pages/TraceDetails';
import { getStoredAuth } from './utils/api';
import './App.css';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { token, user } = getStoredAuth();

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          notice: 'Please sign in with an authorized account to continue.',
        }}
      />
    );
  }

  return children;
}

function Home() {
  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <Link to="/" className="logo">
          <span>🌱</span>
          TraceChain
        </Link>

        <div className="nav-links">
          <a href="#home">Home</a>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/trace">Track Food</Link>
          <Link to="/verification">Verify</Link>
        </div>

        <Link to="/login" className="login-btn">
          Login
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <p className="subtitle">BLOCKCHAIN-POWERED FOOD TRACEABILITY</p>

          <h1>
            Know Your Food.
            <br />
            Trust Every Step.
          </h1>

          <p className="hero-description">
            Track your food journey from farm to consumer with secure,
            transparent, and tamper-evident Ethereum blockchain verification.
          </p>

          <div className="hero-buttons">
            <Link
              to="/trace"
              className="primary-btn"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Track Your Food →
            </Link>

            <Link
              to="/dashboard"
              className="secondary-btn"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Open Dashboard
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card">
            <div className="visual-image">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e"
                alt="Fresh vegetables from farm"
              />
            </div>

            <div className="visual-content">
              <span className="status-badge">✓ Traceable Product</span>

              <h3>Farm to Consumer</h3>

              <p>Secure • Transparent • Traceable</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-heading">
          <p className="subtitle">OUR TECHNOLOGY</p>

          <h2>Transparency at Every Step</h2>

          <p>
            Modern technology for a safer and more trustworthy food supply
            chain.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">⛓️</div>

            <h3>Blockchain Security</h3>

            <p>
              Anchor SHA-256 event hashes in immutable Solidity smart contract
              records on Ethereum.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🗄️</div>

            <h3>MongoDB Storage</h3>

            <p>
              Store rich supply-chain product and journey details off-chain for
              fast retrieval and auditing.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>

            <h3>QR Verification</h3>

            <p>
              Allow consumers to scan a QR code and verify authenticity against
              on-chain records.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="contact">
        <p>© 2026 TraceChain. Building trust from farm to consumer.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/products" element={<Products />} />
      <Route path="/trace" element={<TrackFood />} />
      <Route path="/verification" element={<Verification />} />
      <Route path="/profile" element={<Profile />} />
      <Route
        path="/register-product"
        element={
          <ProtectedRoute>
            <RegisterProduct />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-journey"
        element={
          <ProtectedRoute>
            <AddJourney />
          </ProtectedRoute>
        }
      />
      <Route path="/trace/:productId" element={<TraceDetails />} />
    </Routes>
  );
}

export default App;
