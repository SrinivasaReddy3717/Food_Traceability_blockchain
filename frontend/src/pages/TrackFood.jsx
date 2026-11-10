import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, formatDisplayDate, getAuthHeaders } from '../utils/api';
import './TrackFood.css';

const STAGE_ORDER = ['Producer', 'Processing', 'Transporter', 'Distributor', 'Consumer'];

function getCurrentStageFromProductAndEvents(product, events) {
  if (!events || events.length === 0) {
    if (product?.status === 'Verified') return 'Consumer';
    if (product?.status === 'Distributed') return 'Distributor';
    if (product?.status === 'In Transit') return 'Transporter';
    if (product?.status === 'Processing') return 'Processing';
    return 'Producer';
  }

  const types = new Set(events.map((e) => e.eventType));
  if (types.has('Consumer Verification')) return 'Consumer';
  if (types.has('Distribution')) return 'Distributor';
  if (types.has('Transportation')) return 'Transporter';
  if (types.has('Processing')) return 'Processing';
  return 'Producer';
}

function getCompletedStages(currentStage) {
  const stageIndex = STAGE_ORDER.indexOf(currentStage);
  return STAGE_ORDER.map((stage, index) => ({
    stage,
    completed: index <= stageIndex,
  }));
}

function TrackFood() {
  const [productId, setProductId] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [searchedProduct, setSearchedProduct] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.products) {
          setAvailableProducts(data.products);
        }
      } catch {
        // Ignore silent catalog error
      }
    };
    loadCatalog();
  }, []);

  const searchByProductId = async (targetId) => {
    const cleanId = targetId.trim();
    if (!cleanId) return;

    setLoading(true);
    setErrorMessage('');
    setSearchedProduct(null);
    setEvents([]);

    try {
      const authHeaders = getAuthHeaders();
      const [productRes, journeyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products/${encodeURIComponent(cleanId)}`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE_URL}/journey/${encodeURIComponent(cleanId)}`, {
          headers: authHeaders,
        }),
      ]);

      const productData = await productRes.json();
      if (!productRes.ok) {
        throw new Error(productData.message || 'Product not found.');
      }

      const journeyData = await journeyRes.json();
      const loadedEvents = journeyRes.ok ? journeyData.events || [] : [];

      const currentStage = getCurrentStageFromProductAndEvents(
        productData.product,
        loadedEvents
      );

      setSearchedProduct({
        id: productData.product.productId,
        name: productData.product.productName,
        category: productData.product.category,
        origin: productData.product.origin,
        producer: productData.product.producer,
        batchNumber: productData.product.batchNumber,
        status: productData.product.status,
        currentStage,
      });
      setEvents(loadedEvents);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to track product.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchByProductId(productId);
  };

  const journeySteps = [
    {
      name: 'Farm / Producer',
      stage: 'Producer',
      icon: '🌾',
      description: 'Product harvested & registered',
    },
    {
      name: 'Processing Unit',
      stage: 'Processing',
      icon: '🏭',
      description: 'Cleaned, graded & packed',
    },
    {
      name: 'Transporter',
      stage: 'Transporter',
      icon: '🚚',
      description: 'Transported in supply chain',
    },
    {
      name: 'Distributor',
      stage: 'Distributor',
      icon: '🏪',
      description: 'Received at distribution hub',
    },
    {
      name: 'Consumer',
      stage: 'Consumer',
      icon: '🛒',
      description: 'Ready for QR verification',
    },
  ];

  return (
    <div className="track-page">
      <header className="track-header">
        <div>
          <h1>Track Your Food</h1>
          <p>Follow the complete journey of your food product.</p>
        </div>

        <Link to="/dashboard" className="back-dashboard">
          ← Dashboard
        </Link>
      </header>

      <section className="track-search-card">
        <h2>Search Product</h2>

        <p>Enter a registered Product ID to view its real supply-chain journey.</p>

        <form onSubmit={handleSearch} className="track-search-form">
          <input
            type="text"
            placeholder="Enter Product ID (e.g. FT-1794300479863)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Track Product →'}
          </button>
        </form>

        {availableProducts.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <small style={{ display: 'block', marginBottom: '8px' }}>
              Registered Products (click to track):
            </small>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {availableProducts.slice(0, 6).map((item) => (
                <button
                  key={item.productId}
                  type="button"
                  onClick={() => {
                    setProductId(item.productId);
                    searchByProductId(item.productId);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: '1px solid #cbd8ce',
                    background: '#f5f9f6',
                    color: '#1d3325',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {item.productName} ({item.productId})
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {errorMessage && (
        <section className="trace-result" style={{ textAlign: 'center', color: '#b42318' }}>
          <p>{errorMessage}</p>
        </section>
      )}

      {searchedProduct && (
        <section className="trace-result">
          <div className="product-result-header">
            <div>
              <span className="result-label">Product ID</span>
              <h2>{searchedProduct.id}</h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                to={`/trace/${searchedProduct.id}`}
                className="result-status"
                style={{ textDecoration: 'none' }}
              >
                Full Details &amp; QR →
              </Link>
              <Link
                to={`/verification?product=${searchedProduct.id}`}
                className="result-status"
                style={{ textDecoration: 'none', background: '#1d3325', color: '#ffffff' }}
              >
                Verify On-Chain
              </Link>
            </div>
          </div>

          <div className="product-details">
            <div>
              <span>Product Name</span>
              <strong>{searchedProduct.name}</strong>
            </div>

            <div>
              <span>Category</span>
              <strong>{searchedProduct.category}</strong>
            </div>

            <div>
              <span>Producer</span>
              <strong>{searchedProduct.producer}</strong>
            </div>

            <div>
              <span>Origin</span>
              <strong>{searchedProduct.origin}</strong>
            </div>

            <div>
              <span>Current Stage</span>
              <strong>{searchedProduct.currentStage}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{searchedProduct.status}</strong>
            </div>
          </div>

          <h2 className="journey-title">Supply Chain Journey</h2>

          <div className="journey">
            {journeySteps.map((step, index) => {
              const completedStages = getCompletedStages(
                searchedProduct.currentStage
              );

              const currentStep = completedStages.find(
                (item) => item.stage === step.stage
              );

              return (
                <div key={step.stage} className="journey-group">
                  <div
                    className={`journey-step ${
                      currentStep?.completed ? 'completed' : ''
                    }`}
                  >
                    <div className="journey-icon">{step.icon}</div>

                    <h3>{step.name}</h3>

                    <p>
                      {currentStep?.completed ? step.description : 'Pending'}
                    </p>
                  </div>

                  {index < journeySteps.length - 1 && (
                    <div className="journey-line"></div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: '#1d3325', marginBottom: '12px' }}>
              Recorded Events ({events.length})
            </h3>
            {events.length === 0 ? (
              <p style={{ color: '#68756d' }}>
                No journey events recorded yet for this product.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {events.map((evt) => (
                  <div
                    key={evt._id}
                    style={{
                      padding: '14px 16px',
                      background: '#f5f9f6',
                      borderRadius: '10px',
                      border: '1px solid #e2ebe4',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <strong style={{ color: '#1d3325' }}>
                        {evt.eventType} — {evt.location}
                      </strong>
                      <small style={{ color: '#68756d' }}>
                        {formatDisplayDate(evt.eventDate)}
                      </small>
                    </div>
                    <p style={{ margin: '6px 0', color: '#526259', fontSize: '14px' }}>
                      {evt.description}
                    </p>
                    <small style={{ color: '#68756d' }}>
                      Performed by: {evt.performedBy} • Blockchain:{' '}
                      {evt.blockchainStatus === 'Confirmed' && evt.transactionHash
                        ? `Confirmed (Block #${evt.blockNumber})`
                        : 'Pending'}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default TrackFood;
