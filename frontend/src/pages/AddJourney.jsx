import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  API_BASE_URL,
  getAuthHeaders,
  getStoredAuth,
} from '../utils/api';
import './RegisterProduct.css';

const ROLE_DEFAULT_EVENT = {
  Farmer: 'Production',
  Producer: 'Production',
  Processor: 'Processing',
  Transporter: 'Transportation',
  Distributor: 'Distribution',
  Admin: 'Processing',
};

const ROLE_ALLOWED_EVENTS = {
  Admin: ['Production', 'Processing', 'Transportation', 'Distribution'],
  Farmer: ['Production'],
  Producer: ['Production'],
  Processor: ['Processing'],
  Transporter: ['Transportation'],
  Distributor: ['Distribution'],
};

function AddJourney() {
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId') || '';
  const { user } = getStoredAuth();

  const allowedEventTypes =
    (user && ROLE_ALLOWED_EVENTS[user.role]) || [];

  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    productId: initialProductId,
    eventType:
      (user && ROLE_DEFAULT_EVENT[user.role]) || 'Processing',
    location: '',
    performedBy: user?.organization || user?.name || '',
    eventDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.products) {
          setProducts(data.products);
          if (!initialProductId && data.products.length > 0) {
            setFormData((prev) => ({
              ...prev,
              productId: prev.productId || data.products[0].productId,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };

    fetchProducts();
  }, [initialProductId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessResult(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/journey/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          productId: formData.productId,
          eventType: formData.eventType,
          location: formData.location.trim(),
          performedBy: formData.performedBy.trim(),
          eventDate: formData.eventDate,
          description: formData.description.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Unable to record journey event.');
      }

      setSuccessResult(result);
      setFormData((prev) => ({
        ...prev,
        location: '',
        description: '',
      }));
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to connect to the backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isConsumer = user?.role === 'Consumer';

  return (
    <div className="register-product-page">
      <div className="register-product-header">
        <div>
          <p className="register-eyebrow">SUPPLY CHAIN EVENT &amp; BLOCKCHAIN</p>
          <h1>Record Journey Event</h1>
          <p>
            Record supply-chain stage details and secure them on the blockchain.
          </p>
        </div>

        <Link to="/products" className="register-back-button">
          ← Products
        </Link>
      </div>

      <div className="registration-card">
        <div className="registration-card-header">
          <h2>Journey Event Details</h2>
          <p>
            Signed in as: <strong>{user?.name}</strong> ({user?.role})
          </p>
        </div>

        {isConsumer && (
          <div
            role="alert"
            style={{
              padding: '14px',
              marginBottom: '18px',
              color: '#9a6a00',
              background: '#fff8df',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            Your current role is <strong>Consumer</strong>. Consumers can track
            and verify products, but only supply-chain roles (Farmer, Processor,
            Transporter, Distributor, or Admin) can record new journey events.{' '}
            <Link to="/login" style={{ color: '#376f45', fontWeight: 700 }}>
              Switch Account
            </Link>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '12px',
              marginBottom: '18px',
              color: '#b42318',
              background: '#fef3f2',
              borderRadius: '8px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {successResult && (
          <div
            role="status"
            style={{
              padding: '16px',
              marginBottom: '20px',
              color: '#1d3325',
              background: successResult.blockchainRecorded
                ? '#dff4e4'
                : '#fff8df',
              borderRadius: '10px',
              border: '1px solid #bfd3c3',
              fontSize: '14px',
            }}
          >
            <strong>{successResult.message}</strong>
            <div style={{ marginTop: '8px', lineHeight: 1.6, wordBreak: 'break-all' }}>
              <div>
                <strong>Blockchain Status:</strong>{' '}
                {successResult.event?.blockchainStatus || 'Pending'}
              </div>
              {successResult.event?.blockchainHash && (
                <div>
                  <strong>SHA-256 Hash:</strong> {successResult.event.blockchainHash}
                </div>
              )}
              {successResult.event?.transactionHash && (
                <div>
                  <strong>Tx Hash:</strong> {successResult.event.transactionHash}
                </div>
              )}
              {successResult.event?.blockNumber !== null &&
                successResult.event?.blockNumber !== undefined && (
                  <div>
                    <strong>Block Number:</strong> #{successResult.event.blockNumber}
                  </div>
                )}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                to={`/trace/${successResult.event.productId}`}
                style={{ color: '#23733b', fontWeight: 700 }}
              >
                View Product Journey →
              </Link>
              <Link
                to={`/verification?product=${successResult.event.productId}`}
                style={{ color: '#23733b', fontWeight: 700 }}
              >
                Verify on Blockchain →
              </Link>
            </div>
          </div>
        )}

        <form className="registration-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="registration-form-group">
              <label htmlFor="productId">Select Product</label>
              <select
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select a registered product
                </option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName} ({product.productId})
                  </option>
                ))}
              </select>
            </div>

            <div className="registration-form-group">
              <label htmlFor="eventType">Supply Chain Stage</label>
              <select
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                required
              >
                {(allowedEventTypes.length > 0
                  ? allowedEventTypes
                  : ['Production', 'Processing', 'Transportation', 'Distribution']
                ).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="registration-form-group">
              <label htmlFor="location">Event Location</label>
              <input
                type="text"
                id="location"
                name="location"
                placeholder="e.g. Chennai Distribution Centre"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>

            <div className="registration-form-group">
              <label htmlFor="performedBy">Performed By (Person / Organization)</label>
              <input
                type="text"
                id="performedBy"
                name="performedBy"
                placeholder="e.g. ABC Food Processing Unit"
                value={formData.performedBy}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="registration-form-group">
            <label htmlFor="eventDate">Event Date</label>
            <input
              type="date"
              id="eventDate"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="registration-form-group">
            <label htmlFor="description">Event Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              placeholder="Describe quality checks, packaging, temperature, or transport details"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="registration-actions">
            <button
              type="submit"
              className="register-product-button"
              disabled={loading || isConsumer}
            >
              {loading
                ? 'Recording on MongoDB & Blockchain...'
                : 'Record Event & Anchor Hash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddJourney;

