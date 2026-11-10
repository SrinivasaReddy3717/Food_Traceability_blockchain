import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  API_BASE_URL,
  formatDisplayDate,
  formatDisplayDateTime,
  getAuthHeaders,
  getSavedQrBaseUrl,
  getStoredAuth,
  resolveQrBaseUrl,
  truncateHash,
} from '../utils/api';
import './TraceDetails.css';

function getEventDetails(eventType) {
  const eventDetails = {
    Production: {
      icon: '🌱',
      title: 'Production Event',
    },
    Processing: {
      icon: '🏭',
      title: 'Processing Event',
    },
    Transportation: {
      icon: '🚚',
      title: 'Transportation Event',
    },
    Distribution: {
      icon: '🏪',
      title: 'Distribution Event',
    },
    'Consumer Verification': {
      icon: '🛒',
      title: 'Consumer Verification Event',
    },
  };

  return (
    eventDetails[eventType] || {
      icon: '📋',
      title: `${eventType} Event`,
    }
  );
}

function formatJourneyEvents(rawEvents) {
  return (rawEvents || []).map((event) => {
    const details = getEventDetails(event.eventType);
    return {
      id: event._id,
      icon: details.icon,
      title: details.title,
      eventType: event.eventType,
      location: event.location,
      description: event.description,
      recordedBy: event.performedBy,
      date:
        event.eventType === 'Consumer Verification'
          ? formatDisplayDateTime(event.eventDate)
          : formatDisplayDate(event.eventDate),
      blockchainHash: event.blockchainHash,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      blockchainStatus: event.blockchainStatus,
    };
  });
}

function getBadgeStyle(status) {
  if (status === 'Verified') {
    return { background: '#dff4e4', color: '#23733b' };
  }
  if (status === 'Modified' || status === 'Not Found On-Chain') {
    return { background: '#fef3f2', color: '#b42318' };
  }
  return { background: '#fff8df', color: '#866b18' };
}

function TraceDetails() {
  const { productId } = useParams();
  const { user } = getStoredAuth();

  const [product, setProduct] = useState(null);
  const [events, setEvents] = useState([]);
  const [verification, setVerification] = useState(null);
  const [lanIp, setLanIp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [recordingVerification, setRecordingVerification] = useState(false);
  const [verifyLocation, setVerifyLocation] = useState('');
  const [verifyNotice, setVerifyNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Consumer Feedback state
  const [feedbackList, setFeedbackList] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [consumerName, setConsumerName] = useState(user?.name || '');
  const [feedbackType, setFeedbackType] = useState('Quality Feedback');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const isConsumerOrScanner = !user || user.role === 'Consumer';

  const runBlockchainVerification = useCallback(async () => {
    try {
      setVerifying(true);
      const res = await fetch(
        `${API_BASE_URL}/blockchain/verify/${encodeURIComponent(productId)}`,
        {
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      setVerification(data);
    } catch {
      setVerification({
        overallStatus: 'Blockchain Offline',
        message: 'Unable to reach blockchain verification API.',
        events: [],
      });
    } finally {
      setVerifying(false);
    }
  }, [productId]);

  const handleRecordConsumerVerification = async (e) => {
    if (e) e.preventDefault();
    setRecordingVerification(true);
    setVerifyNotice('');

    try {
      const res = await fetch(`${API_BASE_URL}/journey/consumer-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          productId,
          consumerName: consumerName.trim() || undefined,
          location: verifyLocation.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to record consumer verification.');
      }

      if (data.product) {
        setProduct(data.product);
      }

      const authHeaders = getAuthHeaders();
      const [journeyRes, verifyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/journey/${encodeURIComponent(productId)}`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE_URL}/blockchain/verify/${encodeURIComponent(productId)}`, {
          headers: authHeaders,
        }),
      ]);

      if (journeyRes.ok) {
        const jData = await journeyRes.json();
        setEvents(formatJourneyEvents(jData.events));
      }
      if (verifyRes.ok) {
        const vData = await verifyRes.json();
        setVerification(vData);
      }

      setVerifyNotice(
        `Consumer Verification recorded (${data.verificationResult})${
          data.blockchainRecorded ? ' and anchored on Ganache!' : '.'
        }`
      );
    } catch (error) {
      setVerifyNotice(`Error: ${error.message}`);
    } finally {
      setRecordingVerification(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const fetchTraceDetails = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        setProduct(null);
        setEvents([]);

        const authHeaders = getAuthHeaders();
        const productResponse = await fetch(
          `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,
          { headers: authHeaders }
        );
        const productResult = await productResponse.json();

        if (!productResponse.ok) {
          throw new Error(productResult.message || 'Product not found.');
        }

        if (!isActive) return;
        setProduct(productResult.product);

        const [journeyResponse, verifyRes, feedbackRes, netRes] = await Promise.all([
          fetch(`${API_BASE_URL}/journey/${encodeURIComponent(productId)}`, {
            headers: authHeaders,
          }),
          fetch(`${API_BASE_URL}/blockchain/verify/${encodeURIComponent(productId)}`, {
            headers: authHeaders,
          }).catch(() => null),
          fetch(`${API_BASE_URL}/feedback/${encodeURIComponent(productId)}`).catch(() => null),
          fetch(`${API_BASE_URL}/network-info`).catch(() => null),
        ]);

        const journeyResult = await journeyResponse.json();

        if (!journeyResponse.ok) {
          throw new Error(
            journeyResult.message || 'Unable to retrieve journey events.'
          );
        }

        if (!isActive) return;

        setEvents(formatJourneyEvents(journeyResult.events));

        if (verifyRes) {
          const verifyData = await verifyRes.json();
          if (isActive) setVerification(verifyData);
        }

        if (feedbackRes && feedbackRes.ok) {
          const fbData = await feedbackRes.json();
          if (isActive) {
            setFeedbackList(fbData.feedback || []);
            setAverageRating(fbData.averageRating || 0);
          }
        }

        if (netRes && netRes.ok) {
          const netData = await netRes.json();
          if (isActive && netData.lanIp) {
            setLanIp(netData.lanIp);
          }
        }
      } catch (error) {
        console.error('Trace details error:', error);
        if (isActive) {
          setErrorMessage(error.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchTraceDetails();

    return () => {
      isActive = false;
    };
  }, [productId]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackMessage('');
    setSubmittingFeedback(true);

    try {
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          productId,
          consumerName: consumerName.trim() || 'Consumer',
          feedbackType,
          rating: Number(rating),
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to submit feedback.');
      }

      setComment('');
      setFeedbackMessage('Thank you! Your feedback has been recorded.');

      const refreshRes = await fetch(
        `${API_BASE_URL}/feedback/${encodeURIComponent(productId)}`
      );
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setFeedbackList(refreshData.feedback || []);
        setAverageRating(refreshData.averageRating || 0);
      }
    } catch (error) {
      setFeedbackMessage(`Error: ${error.message}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('trace-product-qr');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${productId}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="trace-not-found">
        <h1>Loading Product Details...</h1>
        <p>Please wait while we retrieve the traceability information.</p>
      </div>
    );
  }

  if (errorMessage || !product) {
    return (
      <div className="trace-not-found">
        <h1>
          {errorMessage && errorMessage.includes('not yet visible')
            ? 'Product Not Ready for Consumers'
            : 'Product Not Found'}
        </h1>
        <p>
          {errorMessage || 'No traceability record was found for this product.'}
        </p>
        <Link to="/products">← Back to Products</Link>
      </div>
    );
  }

  const verificationMap = {};
  for (const v of verification?.events || []) {
    verificationMap[v.eventId] = v;
  }

  const overallStatus = verification?.overallStatus || 'Checking...';
  const overallStyle = getBadgeStyle(overallStatus);
  const presentEventTypes = new Set(events.map((e) => e.eventType));
  const allFourStagesCompleted = [
    'Production',
    'Processing',
    'Transportation',
    'Distribution',
  ].every((stage) => presentEventTypes.has(stage));
  const hasConsumerVerification = presentEventTypes.has('Consumer Verification');
  const qrBaseUrl = resolveQrBaseUrl(lanIp, getSavedQrBaseUrl());
  const traceUrl = `${qrBaseUrl}/trace/${product.productId}`;

  return (
    <div className="trace-details-page">
      <header className="trace-header">
        <div>
          <h1>TraceChain</h1>
          <p>Blockchain Food Traceability &amp; Consumer Verification</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to="/dashboard" className="trace-back-button">
            Dashboard
          </Link>
          <Link to="/products" className="trace-back-button">
            ← Products
          </Link>
        </div>
      </header>

      <main className="trace-content">
        <section className="product-summary-card">
          <div className="trace-product-icon">🛡️</div>

          <h2>{product.productName}</h2>

          <p className="batch-number">Product ID: {product.productId}</p>
          <p className="batch-number">
            Batch: {product.batchNumber || 'Not available'}
          </p>

          <span className="trace-status" style={overallStyle}>
            {overallStatus === 'Verified'
              ? '✓ Verified on Ethereum Blockchain'
              : overallStatus === 'Modified'
              ? '⚠ Tampering Detected (Modified)'
              : overallStatus === 'Blockchain Offline'
              ? '⚠ Blockchain Node Offline'
              : `⏳ Blockchain: ${overallStatus}`}
          </span>

          <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={
                isConsumerOrScanner &&
                allFourStagesCompleted &&
                !hasConsumerVerification
                  ? handleRecordConsumerVerification
                  : runBlockchainVerification
              }
              disabled={verifying || recordingVerification}
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
              {verifying || recordingVerification
                ? 'Verifying...'
                : 'Verify on Blockchain'}
            </button>

            <Link
              to={`/verification?product=${product.productId}`}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd9ce',
                background: '#ffffff',
                color: '#356b43',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Full Audit →
            </Link>
          </div>

          <div className="trace-product-details">
            <div>
              <span>Product Name</span>
              <strong>{product.productName}</strong>
            </div>

            <div>
              <span>Category</span>
              <strong>{product.category}</strong>
            </div>

            <div>
              <span>Producer Name</span>
              <strong>{product.producer}</strong>
            </div>

            <div>
              <span>Origin &amp; Location</span>
              <strong>{product.origin}</strong>
            </div>

            <div>
              <span>Production Date</span>
              <strong>{formatDisplayDate(product.productionDate)}</strong>
            </div>

            <div>
              <span>Batch Number</span>
              <strong>{product.batchNumber || 'Not specified'}</strong>
            </div>

            <div>
              <span>Quantity</span>
              <strong>{product.quantity}</strong>
            </div>

            <div>
              <span>Product Status</span>
              <strong>{product.status}</strong>
            </div>

            {product.description && (
              <div>
                <span>Description</span>
                <strong>{product.description}</strong>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: '20px',
              paddingTop: '18px',
              borderTop: '1px solid #e6ece7',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '12px',
                color: '#68756d',
                marginBottom: '10px',
              }}
            >
              Scan QR Code on Any Device
            </span>
            <QRCodeCanvas
              id="trace-product-qr"
              value={traceUrl}
              size={130}
              includeMargin
            />
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleDownloadQR}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd9ce',
                  background: '#ffffff',
                  color: '#263b2c',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Download QR PNG
              </button>
            </div>
          </div>
        </section>

        <div>
          <section className="journey-section">
            <h2>Product Supply-Chain Journey</h2>

            <p className="journey-subtitle">
              Verified supply-chain journey events from farm to consumer.
            </p>

            {/* 5-Stage Supply Chain Progress */}
            {(() => {
              const eventTypes = new Set(events.map((e) => e.eventType));
              const stages = [
                { label: 'Production', icon: '🌾', done: true },
                {
                  label: 'Processing',
                  icon: '🏭',
                  done:
                    eventTypes.has('Processing') ||
                    ['Processing', 'In Transit', 'Distributed', 'Verified'].includes(
                      product.status
                    ),
                },
                {
                  label: 'Transportation',
                  icon: '🚚',
                  done:
                    eventTypes.has('Transportation') ||
                    ['In Transit', 'Distributed', 'Verified'].includes(
                      product.status
                    ),
                },
                {
                  label: 'Distribution',
                  icon: '🏪',
                  done:
                    eventTypes.has('Distribution') ||
                    ['Distributed', 'Verified'].includes(product.status),
                },
                {
                  label: 'Consumer Verify',
                  icon: '🛒',
                  done: eventTypes.has('Consumer Verification'),
                },
              ];

              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '10px',
                    marginBottom: '24px',
                  }}
                >
                  {stages.map((stage) => (
                    <div
                      key={stage.label}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        background: stage.done ? '#dff4e4' : '#ffffff',
                        border: `1px solid ${stage.done ? '#a4d3af' : '#e2ebe4'}`,
                        color: stage.done ? '#1d5e31' : '#7a887e',
                      }}
                    >
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                        {stage.icon}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>
                        {stage.label}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        {stage.done ? '✓ Completed' : 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {isConsumerOrScanner && allFourStagesCompleted && (
              <form
                onSubmit={handleRecordConsumerVerification}
                style={{
                  marginBottom: '22px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #d5e4d8',
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <strong style={{ color: '#1d3325', fontSize: '14px' }}>
                    🛒 Record Consumer Verification Event
                  </strong>
                  <span style={{ fontSize: '12px', color: '#68756d' }}>
                    Record your consumer verification timestamp &amp; location
                  </span>
                </div>

                {verifyNotice && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: verifyNotice.startsWith('Error:')
                        ? '#fef3f2'
                        : '#dff4e4',
                      color: verifyNotice.startsWith('Error:')
                        ? '#b42318'
                        : '#1d5e31',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {verifyNotice}
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '10px',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Consumer Name (optional)"
                    value={consumerName}
                    onChange={(e) => setConsumerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 11px',
                      boxSizing: 'border-box',
                      borderRadius: '8px',
                      border: '1px solid #cbd8ce',
                      background: '#ffffff',
                      color: '#1d3325',
                      fontSize: '13px',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Your City / Location (optional)"
                    value={verifyLocation}
                    onChange={(e) => setVerifyLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 11px',
                      boxSizing: 'border-box',
                      borderRadius: '8px',
                      border: '1px solid #cbd8ce',
                      background: '#ffffff',
                      color: '#1d3325',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={recordingVerification}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#376f45',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {recordingVerification
                      ? 'Recording Verification...'
                      : hasConsumerVerification
                      ? 'Verify & Record Again'
                      : 'Verify & Record Check'}
                  </button>
                </div>
              </form>
            )}

            {events.length === 0 ? (
              <p style={{ padding: '20px 0' }}>
                No journey events have been recorded for this product yet.
              </p>
            ) : (
              <div className="timeline">
                {events.map((event) => {
                  const chainCheck = verificationMap[event.id];
                  const checkStatus =
                    chainCheck?.status ||
                    (event.blockchainHash ? 'Unverified' : 'Pending');
                  const badgeStyle = getBadgeStyle(checkStatus);

                  return (
                    <div className="timeline-item" key={event.id}>
                      <div className="timeline-icon">{event.icon}</div>

                      <div className="timeline-content">
                        <div className="timeline-title-row">
                          <div>
                            <h3>{event.title}</h3>
                            <h4>{event.location}</h4>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span className="timeline-date">{event.date}</span>
                            <div style={{ marginTop: '6px' }}>
                              <span
                                style={{
                                  ...badgeStyle,
                                  padding: '4px 10px',
                                  borderRadius: '14px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                {checkStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p>{event.description}</p>

                        <small style={{ display: 'block' }}>
                          Responsible Party: <strong>{event.recordedBy}</strong>
                        </small>

                        <small
                          style={{
                            display: 'block',
                            marginTop: '8px',
                            wordBreak: 'break-all',
                          }}
                        >
                          <strong>SHA-256 Hash:</strong>{' '}
                          {event.blockchainHash || 'Pending blockchain recording'}
                        </small>

                        {event.transactionHash && (
                          <small
                            style={{
                              display: 'block',
                              marginTop: '4px',
                              wordBreak: 'break-all',
                            }}
                          >
                            <strong>Tx Hash:</strong>{' '}
                            {truncateHash(event.transactionHash, 14, 10)} •{' '}
                            <strong>Block:</strong> #{event.blockNumber}
                          </small>
                        )}

                        {chainCheck?.message && (
                          <small
                            style={{
                              display: 'block',
                              marginTop: '6px',
                              color: chainCheck.tampered ? '#b42318' : '#23733b',
                              fontWeight: 600,
                            }}
                          >
                            {chainCheck.message}
                          </small>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Consumer Feedback & Incorrect Information Reporting (visible for Consumer login or QR scan) */}
          {(!user || user.role === 'Consumer') && (
          <section
            style={{
              marginTop: '34px',
              background: '#ffffff',
              border: '1px solid #e2ebe4',
              borderRadius: '14px',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '21px', color: '#263b2c' }}>
                  Consumer Feedback &amp; Quality Review
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#68756d' }}>
                  Rate product quality or report any discrepancy in traceability records.
                </p>
              </div>
              {feedbackList.length > 0 && (
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: '#eef7ef',
                    color: '#23733b',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  ★ {averageRating} / 5 ({feedbackList.length} review
                  {feedbackList.length === 1 ? '' : 's'})
                </span>
              )}
            </div>

            {feedbackMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  marginBottom: '14px',
                  borderRadius: '8px',
                  background: feedbackMessage.startsWith('Error:')
                    ? '#fef3f2'
                    : '#dff4e4',
                  color: feedbackMessage.startsWith('Error:')
                    ? '#b42318'
                    : '#1d5e31',
                  fontSize: '13px',
                }}
              >
                {feedbackMessage}
              </div>
            )}

            <form
              onSubmit={handleFeedbackSubmit}
              style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Consumer Name"
                    value={consumerName}
                    onChange={(e) => setConsumerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      boxSizing: 'border-box',
                      borderRadius: '8px',
                      border: '1px solid #cbd8ce',
                      background: '#ffffff',
                      color: '#1d3325',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    Feedback Type
                  </label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      boxSizing: 'border-box',
                      borderRadius: '8px',
                      border: '1px solid #cbd8ce',
                      background: '#ffffff',
                      color: '#1d3325',
                      fontSize: '13px',
                    }}
                  >
                    <option value="Quality Feedback">Quality Feedback</option>
                    <option value="Incorrect Information Report">
                      Report Incorrect Information
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    Quality Rating
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      boxSizing: 'border-box',
                      borderRadius: '8px',
                      border: '1px solid #cbd8ce',
                      background: '#ffffff',
                      color: '#1d3325',
                      fontSize: '13px',
                    }}
                  >
                    <option value={5}>5 ★ - Excellent</option>
                    <option value={4}>4 ★ - Good</option>
                    <option value={3}>3 ★ - Average</option>
                    <option value={2}>2 ★ - Poor</option>
                    <option value={1}>1 ★ - Very Poor / Issue</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  rows="3"
                  placeholder="Share product quality feedback or report incorrect details..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    boxSizing: 'border-box',
                    borderRadius: '8px',
                    border: '1px solid #cbd8ce',
                    background: '#ffffff',
                    color: '#1d3325',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#376f45',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>

            {feedbackList.length > 0 && (
              <div style={{ display: 'grid', gap: '10px' }}>
                {feedbackList.map((fb) => (
                  <div
                    key={fb._id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background:
                        fb.feedbackType === 'Incorrect Information Report'
                          ? '#fef3f2'
                          : '#f7faf8',
                      border: '1px solid #e2ebe4',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '13px',
                      }}
                    >
                      <strong>
                        {fb.consumerName} • {'★'.repeat(fb.rating)}
                      </strong>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color:
                            fb.feedbackType === 'Incorrect Information Report'
                              ? '#b42318'
                              : '#23733b',
                        }}
                      >
                        {fb.feedbackType} • {formatDisplayDate(fb.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: '13px',
                        color: '#48594e',
                      }}
                    >
                      {fb.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default TraceDetails;
