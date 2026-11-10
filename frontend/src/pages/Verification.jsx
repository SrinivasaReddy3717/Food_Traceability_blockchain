import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  API_BASE_URL,
  formatDisplayDate,
  getAuthHeaders,
  getStoredAuth,
} from '../utils/api';
import './Verification.css';

function getStatusColors(status) {
  if (status === 'Verified') {
    return { bg: '#dff4e4', color: '#23733b', symbol: '✓' };
  }
  if (status === 'Modified' || status === 'Not Found On-Chain') {
    return { bg: '#fef3f2', color: '#b42318', symbol: '!' };
  }
  if (status === 'Blockchain Offline') {
    return { bg: '#fff8df', color: '#866b18', symbol: '⚠' };
  }
  return { bg: '#fff8df', color: '#866b18', symbol: '⏳' };
}

function Verification() {
  const [searchParams] = useSearchParams();
  const { user, token } = getStoredAuth();
  const canSyncBlockchain =
    token &&
    user &&
    ['Admin', 'Farmer', 'Producer', 'Processor', 'Transporter', 'Distributor'].includes(
      user.role
    );

  const initialScannedId = searchParams.get('product') || '';
  const [productId, setProductId] = useState(initialScannedId);
  const [catalog, setCatalog] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncingEventId, setSyncingEventId] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  const verifyProduct = useCallback(async (id) => {
    const cleanId = id.trim();
    if (!cleanId) return;

    setLoading(true);
    setSyncMessage('');
    setVerificationResult(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/blockchain/verify/${encodeURIComponent(cleanId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();

      if (res.status === 404 || res.status === 403) {
        setVerificationResult({ error: true, message: data.message });
      } else {
        setVerificationResult({ error: false, ...data });
      }
    } catch (error) {
      setVerificationResult({
        error: true,
        message: error.message || 'Failed to contact verification API.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const productsRes = await fetch(`${API_BASE_URL}/products`, {
          headers: getAuthHeaders(),
        }).catch(() => null);

        if (!active) return;

        if (productsRes && productsRes.ok) {
          const productsData = await productsRes.json();
          setCatalog(productsData.products || []);
        }

        if (initialScannedId) {
          await verifyProduct(initialScannedId);
        }
      } catch {
        // Ignore silent initialization error
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [initialScannedId, verifyProduct]);

  const handleVerify = (e) => {
    e.preventDefault();
    verifyProduct(productId);
  };

  const handleSyncPendingEvent = async (eventId) => {
    setSyncingEventId(eventId);
    setSyncMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/blockchain/sync/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Unable to anchor event on blockchain.');
      }

      setSyncMessage(
        `Event anchored on Ganache! Tx: ${data.event?.transactionHash} (Block #${data.event?.blockNumber})`
      );
      await verifyProduct(productId);
    } catch (error) {
      setSyncMessage(`Sync failed: ${error.message}`);
    } finally {
      setSyncingEventId('');
    }
  };

  const statusColors = getStatusColors(verificationResult?.overallStatus);

  return (
    <div className="verification-page">
      <header className="verification-header">
        <div>
          <h1>Blockchain Verification Dashboard</h1>
          <p>Verify the authenticity and integrity of food product records.</p>
        </div>

        <Link to="/dashboard" className="back-dashboard">
          ← Dashboard
        </Link>
      </header>

      <section className="verification-card">
        <div className="verification-icon">🔐</div>

        <h2>Verify Product Authenticity</h2>

        <p>
          Enter a Product ID to verify its supply-chain records against the
          blockchain.
        </p>

        <form onSubmit={handleVerify} className="verification-form">
          <input
            type="text"
            placeholder="Enter Product ID (e.g. FT-1794300479863)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify On-Chain →'}
          </button>
        </form>

        {catalog.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <small style={{ display: 'block', marginBottom: '8px' }}>
              Registered Products (click to verify):
            </small>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {catalog.slice(0, 6).map((item) => (
                <button
                  key={item.productId}
                  type="button"
                  onClick={() => {
                    setProductId(item.productId);
                    verifyProduct(item.productId);
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

      {syncMessage && (
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto 20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: '#eef7ef',
            color: '#1d3325',
            fontSize: '13px',
            wordBreak: 'break-all',
          }}
        >
          {syncMessage}
        </div>
      )}

      {verificationResult && (
        <section className="verification-result">
          {verificationResult.error ? (
            <div className="verification-error">
              <div>❌</div>
              <h2>Product Unavailable</h2>
              <p>
                {verificationResult.message ||
                  'No matching product record was found. Please check the Product ID.'}
              </p>
            </div>
          ) : (
            <>
              <div className="verified-heading">
                <div
                  className="verified-symbol"
                  style={{
                    background: statusColors.bg,
                    color: statusColors.color,
                  }}
                >
                  {statusColors.symbol}
                </div>

                <div style={{ flex: 1 }}>
                  <h2 style={{ color: statusColors.color }}>
                    {verificationResult.overallStatus === 'Verified'
                      ? 'Authentic Product — Verified On-Chain'
                      : verificationResult.overallStatus === 'Modified'
                      ? 'Tampering Detected — Data Modified!'
                      : `Status: ${verificationResult.overallStatus}`}
                  </h2>

                  <p>
                    {verificationResult.message ||
                      `Checked ${verificationResult.summary?.totalEvents || 0} journey event(s): ${verificationResult.summary?.verifiedCount || 0} verified, ${verificationResult.summary?.pendingCount || 0} pending, ${verificationResult.summary?.modifiedCount || 0} modified.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => verifyProduct(productId)}
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#376f45',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Re-Verify
                </button>
              </div>

              {verificationResult.product && (
                <div className="verification-details">
                  <div>
                    <span>Product ID</span>
                    <strong>{verificationResult.product.productId}</strong>
                  </div>

                  <div>
                    <span>Product Name</span>
                    <strong>{verificationResult.product.productName}</strong>
                  </div>

                  <div>
                    <span>Origin</span>
                    <strong>{verificationResult.product.origin}</strong>
                  </div>

                  <div>
                    <span>Producer</span>
                    <strong>{verificationResult.product.producer}</strong>
                  </div>

                  <div>
                    <span>Product Status</span>
                    <strong>{verificationResult.product.status}</strong>
                  </div>

                  <div>
                    <span>Smart Contract</span>
                    <strong>
                      {verificationResult.blockchain?.contractAddress ||
                        'Not available'}
                    </strong>
                  </div>
                </div>
              )}

              {/* Per-Event Proof Cards */}
              <div style={{ marginTop: '28px' }}>
                <h3 style={{ color: '#1d3325', marginBottom: '14px' }}>
                  Journey Event Blockchain Proofs (
                  {verificationResult.events?.length || 0})
                </h3>

                {(verificationResult.events || []).length === 0 && (
                  <p style={{ color: '#68756d' }}>
                    No journey events recorded for this product yet.
                  </p>
                )}

                <div style={{ display: 'grid', gap: '16px' }}>
                  {(verificationResult.events || []).map((evt) => {
                    const evtColor = getStatusColors(evt.status);
                    return (
                      <div
                        key={evt.eventId}
                        style={{
                          padding: '18px',
                          borderRadius: '12px',
                          background: '#f5f9f6',
                          border: '1px solid #dce7de',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                            marginBottom: '10px',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#1d3325', fontSize: '16px' }}>
                              {evt.eventType} — {evt.location}
                            </strong>
                            <div style={{ color: '#68756d', fontSize: '13px', marginTop: '2px' }}>
                              Performed by: {evt.performedBy} •{' '}
                              {formatDisplayDate(evt.eventDate)}
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '5px 12px',
                              borderRadius: '16px',
                              background: evtColor.bg,
                              color: evtColor.color,
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            {evt.status}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '13px',
                            lineHeight: 1.7,
                            wordBreak: 'break-all',
                            color: '#263b2c',
                          }}
                        >
                          <div>
                            <strong>Computed SHA-256:</strong>{' '}
                            {evt.computedHash || 'N/A'}
                          </div>
                          <div>
                            <strong>On-Chain Stored Hash:</strong>{' '}
                            {evt.onChainHash || 'Not yet recorded'}
                          </div>
                          <div>
                            <strong>Transaction Hash:</strong>{' '}
                            {evt.transactionHash || 'Pending'}
                          </div>
                          <div>
                            <strong>Block Number:</strong>{' '}
                            {evt.blockNumber !== null && evt.blockNumber !== undefined
                              ? `#${evt.blockNumber}`
                              : 'Pending'}
                          </div>
                          {evt.onChainTimestamp && (
                            <div>
                              <strong>On-Chain Timestamp:</strong>{' '}
                              {new Date(evt.onChainTimestamp).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: evtColor.color,
                          }}
                        >
                          {evt.message}
                        </div>

                        {evt.status === 'Pending' && (
                          <div style={{ marginTop: '12px' }}>
                            {canSyncBlockchain ? (
                              <button
                                type="button"
                                onClick={() => handleSyncPendingEvent(evt.eventId)}
                                disabled={syncingEventId === evt.eventId}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#376f45',
                                  color: '#ffffff',
                                  fontWeight: 600,
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                }}
                              >
                                {syncingEventId === evt.eventId
                                  ? 'Recording on Ganache...'
                                  : 'Record Pending Event on Blockchain'}
                              </button>
                            ) : (
                              <small style={{ color: '#68756d' }}>
                                Sign in as an authorized supply-chain role or Admin to
                                anchor this pending event on Ganache.
                              </small>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default Verification;
