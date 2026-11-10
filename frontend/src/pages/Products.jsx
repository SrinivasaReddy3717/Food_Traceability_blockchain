import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  API_BASE_URL,
  getAuthHeaders,
  getStoredAuth,
  resolveQrBaseUrl,
} from '../utils/api';
import './Products.css';

function Products() {
  const { user } = getStoredAuth();
  const isStaff =
    user &&
    ['Admin', 'Farmer', 'Producer', 'Processor', 'Transporter', 'Distributor'].includes(
      user.role
    );

  const [products, setProducts] = useState([]);
  const [verifiedEventsCount, setVerifiedEventsCount] = useState(0);
  const [lanIp, setLanIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const authHeaders = getAuthHeaders();
        const [productsRes, statsRes, networkRes] = await Promise.all([
          fetch(`${API_BASE_URL}/products`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/dashboard/stats`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE_URL}/network-info`).catch(() => null),
        ]);

        if (!productsRes.ok) {
          throw new Error('Unable to fetch registered products.');
        }

        const result = await productsRes.json();

        if (statsRes && statsRes.ok) {
          const statsData = await statsRes.json();
          setVerifiedEventsCount(statsData.stats?.verifiedRecords || 0);
        }

        if (networkRes && networkRes.ok) {
          const netData = await networkRes.json();
          if (netData.lanIp) {
            setLanIp(netData.lanIp);
          }
        }

        const formattedProducts = (result.products || []).map(
          (product) => {
            let stage = 'Producer';

            if (product.status === 'Production') {
              stage = 'Producer';
            } else if (product.status === 'Processing') {
              stage = 'Processing Unit';
            } else if (product.status === 'In Transit') {
              stage = 'Transporter';
            } else if (product.status === 'Distributed') {
              stage = 'Distributor';
            } else if (product.status === 'Verified') {
              stage = 'Verification';
            }

            return {
              id: product.productId,
              name: product.productName,
              category: product.category,
              origin: product.origin,
              status: product.status || 'Registered',
              stage,
              quantity: product.quantity,
              batchNumber: product.batchNumber,
              producer: product.producer,
            };
          }
        );

        setProducts(formattedProducts);
      } catch (error) {
        console.error('Fetching products failed:', error);
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const transitCount = products.filter(
    (product) => product.status === 'In Transit'
  ).length;

  const qrBaseUrl = resolveQrBaseUrl(lanIp, import.meta.env.VITE_PUBLIC_URL || '');

  const handleDownloadQR = (productId) => {
    const canvas = document.getElementById(`qr-${productId}`);
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${productId}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="products-page">
      {/* Header */}
      <header className="products-header">
        <div>
          <h1>Food Products</h1>
          <p>Explore and monitor registered food products.</p>
        </div>

        <div className="products-header-actions">
          {isStaff && (
            <>
              <Link
                to="/register-product"
                className="register-new-product"
              >
                + Register Product
              </Link>

              <Link
                to="/add-journey"
                className="register-new-product"
              >
                + Add Journey Event
              </Link>
            </>
          )}

          <Link
            to="/dashboard"
            className="back-dashboard"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Summary */}
      <div className="products-summary">
        <div className="summary-card">
          <span>📦</span>

          <div>
            <h3>{products.length}</h3>
            <p>Total Products</p>
          </div>
        </div>

        <div className="summary-card">
          <span>✅</span>

          <div>
            <h3>{verifiedEventsCount}</h3>
            <p>On-Chain Events</p>
          </div>
        </div>

        <div className="summary-card">
          <span>🚚</span>

          <div>
            <h3>{transitCount}</h3>
            <p>In Transit</p>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <section className="products-section">
        <h2>Registered Products</h2>

        {loading && (
          <p style={{ padding: '20px', textAlign: 'center' }}>
            Loading registered products...
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            style={{
              padding: '15px',
              color: '#b42318',
              background: '#fef3f2',
              borderRadius: '8px',
            }}
          >
            {errorMessage}
          </p>
        )}

        {!loading && !errorMessage && products.length === 0 && (
          <p style={{ padding: '25px', textAlign: 'center' }}>
            {isStaff
              ? 'No products registered yet. Click Register Product to add your first product.'
              : 'No products have completed all 4 supply-chain stages (Production, Processing, Transportation, Distribution) yet.'}
          </p>
        )}

        {!loading && !errorMessage && products.length > 0 && (
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Origin</th>
                  <th>Current Stage</th>
                  <th>Status</th>
                  <th>QR Code</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const traceUrl = `${qrBaseUrl}/trace/${product.id}`;
                  return (
                    <tr key={product.id}>
                      <td>
                        <Link
                          to={`/trace/${product.id}`}
                          style={{ color: '#376f45', textDecoration: 'none' }}
                        >
                          {product.id}
                        </Link>
                      </td>

                      <td className="product-name">{product.name}</td>

                      <td>{product.category}</td>

                      <td>{product.origin}</td>

                      <td>{product.stage}</td>

                      <td>
                        <span
                          className={`product-status ${product.status
                            .toLowerCase()
                            .replace(/\s+/g, '-')}`}
                        >
                          {product.status}
                        </span>
                      </td>

                      <td className="qr-code-cell">
                        <div
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <QRCodeCanvas
                            id={`qr-${product.id}`}
                            value={traceUrl}
                            size={76}
                            includeMargin
                          />
                          <button
                            type="button"
                            onClick={() => handleDownloadQR(product.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: '1px solid #cbd8ce',
                              background: '#ffffff',
                              color: '#1d3325',
                              cursor: 'pointer',
                            }}
                          >
                            Download PNG
                          </button>
                        </div>
                      </td>

                      <td>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          <Link
                            to={`/trace/${product.id}`}
                            style={{ color: '#376f45', textDecoration: 'none' }}
                          >
                            Track Journey →
                          </Link>
                          <Link
                            to={`/verification?product=${product.id}`}
                            style={{ color: '#23733b', textDecoration: 'none' }}
                          >
                            Verify On-Chain
                          </Link>
                          <Link
                            to={`/add-journey?productId=${product.id}`}
                            style={{ color: '#4c58a8', textDecoration: 'none' }}
                          >
                            + Add Event
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Products;
