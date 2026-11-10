export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'tracechainToken';
const USER_KEY = 'tracechainUser';
const QR_BASE_KEY = 'tracechainQrBaseUrl';

export function getStoredAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function saveStoredAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.setItem('isLoggedIn', 'true');
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem('isLoggedIn');
}

export function getAuthHeaders() {
  const { token } = getStoredAuth();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getSavedQrBaseUrl() {
  try {
    return localStorage.getItem(QR_BASE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveQrBaseUrl(url) {
  try {
    const clean = (url || '').trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem(QR_BASE_KEY, clean);
    } else {
      localStorage.removeItem(QR_BASE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Compute a phone-scannable base URL for QR codes so phones never get
 * sent to http://localhost:5173 (which points to the phone itself).
 */
export function resolveQrBaseUrl(lanIp, customBaseUrl = '') {
  const custom = (customBaseUrl || '').trim().replace(/\/+$/, '');
  if (custom) {
    return custom;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:5173';
  }

  const { hostname, port, protocol, origin } = window.location;
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLoopback && lanIp && lanIp !== '127.0.0.1') {
    const portSuffix = port ? `:${port}` : ':5173';
    return `${protocol}//${lanIp}${portSuffix}`;
  }

  return origin;
}

export function truncateHash(value, start = 12, end = 8) {
  if (!value) return 'Not available';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function formatDisplayDate(dateValue) {
  if (!dateValue) return 'Date not available';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Date not available';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDisplayDateTime(dateValue) {
  if (!dateValue) return 'Date not available';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Date not available';
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
