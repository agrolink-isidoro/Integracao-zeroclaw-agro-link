import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getStoredTokens, refreshAccessToken, setStoredTokens, clearTokens, getStoredTenant } from '../hooks/useAuth'

// Resolve baseURL in a way that works for browser, Node (tests), and Vite dev server
// Avoid using the `import.meta` syntax directly to keep TS happy in Jest (ts-jest) environments.
let baseURL = 'http://localhost:8001/api/';
const maybeProcess = (globalThis as unknown as { process?: { env?: { VITE_API_BASE?: string } } }).process;
if (typeof maybeProcess !== 'undefined' && maybeProcess.env && maybeProcess.env.VITE_API_BASE) {
  baseURL = maybeProcess.env.VITE_API_BASE;
} else if (typeof window !== 'undefined' && (window as unknown as { VITE_API_BASE?: string }).VITE_API_BASE) {
  // Optional global set by dev server if needed
  baseURL = (window as unknown as { VITE_API_BASE?: string }).VITE_API_BASE as string;
}

// In Docker, frontend and backend are separate containers on the same network
// Use the backend service hostname when running in container
try {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Running in Docker container
    baseURL = 'http://backend:8001/api/';
  }
} catch (e) {
  // ignore
}

// Create axios instance and enable credentials so browser cookies (e.g., CSRF) are sent when needed
const api = axios.create({
  baseURL,
  withCredentials: true,
});


// Interceptor para adicionar o token de autenticação em todas as requisições
(api.interceptors.request as any).use(
  (config: any) => {
    const cfg = config as AxiosRequestConfig;
    const tokens = getStoredTokens();
    const token = tokens?.access;
    // compute full URL for debugging (handles relative urls)
    let fullUrl = cfg.url as string;
    try {
      if (cfg.baseURL && cfg.url) fullUrl = new URL(cfg.url as string, cfg.baseURL).toString();
      else if (typeof window !== 'undefined' && cfg.url) fullUrl = new URL(cfg.url as string, window.location.origin).toString();
    } catch (e) {
      // ignore URL building errors
    }

    console.debug(`[API] Request to ${cfg.url} (full: ${fullUrl}):`, { 
      hasToken: !!token, 
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      headers: cfg.headers,
      baseURL: cfg.baseURL || null,
      fullUrl
    });
    if (token) {
      cfg.headers = cfg.headers || {};
      (cfg.headers as Record<string, string | undefined>).Authorization = `Bearer ${token}`;
      console.debug('[API] Authorization header set:', (cfg.headers as Record<string, string | undefined>).Authorization?.substring(0, 30) + '...');
    } else {
      console.warn('[API] No token available for request');
    }
    // Sincronizar X-Tenant-ID sempre a partir do localStorage.
    // Nunca usar valor legado de api.defaults (pode ser de outra sessão).
    /*
    const tenantInfo = getStoredTenant();
    cfg.headers = cfg.headers || {};
    if (tenantInfo?.id) {
      (cfg.headers as Record<string, string>)['X-Tenant-ID'] = tenantInfo.id;
      // Manter os defaults em sincronia para evitar acúmulo de valores stale
      api.defaults.headers.common['X-Tenant-ID'] = tenantInfo.id;
    } else {
      delete (cfg.headers as any)['X-Tenant-ID'];
      // Limpar também os defaults — evita que Axios re-injete o valor stale
      delete api.defaults.headers.common['X-Tenant-ID'];
    }
    */
    return cfg;
  },
  (error: any) => Promise.reject(error)
);

// Interceptor para normalizar respostas de listagens (suporta DRF paginado)
const responseFulfilled = (response: AxiosResponse) => {
  try {
    const data = response?.data as unknown;
    if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
      // preserve metadata on a non-enumerable field in case we need it later
      Object.defineProperty(response, 'meta', {
        value: { count: (data as any).count, next: (data as any).next, previous: (data as any).previous },
        enumerable: false,
        configurable: true,
      });
      response.data = (data as any).results;
    }
  } catch (e) {
    // keep original response if normalization fails
    console.warn('Failed to normalize response data', e);
  }

  // Edge case: some backend endpoints return 200 with an error payload like { code: 403, detail: 'Forbidden' }
  // Treat those as rejections so frontend error handlers see them as errors.
  try {
    const data = response?.data as any;
    if (data && typeof data === 'object' && data.code === 403) {
      console.warn('[API] Payload indicates forbidden (code 403), rejecting response', data);
      // help debugging: keep a short in-memory trace of these anomalous responses in dev
      try {
        const events = (window as any).__apiForbiddenEvents = (window as any).__apiForbiddenEvents || [];
        events.push({ url: response.config?.url, data, ts: new Date().toISOString() });
      } catch (e) {
        // ignore when window is not available
      }
      const err: any = new Error('Forbidden');
      err.response = { status: 403, data, statusText: 'Forbidden' };
      return Promise.reject(err);
    }
  } catch (e) {
    // ignore
  }

  return response;
};

const responseRejected = async (error: unknown) => {
  const err = error as any;
  const originalRequest = err.config;

  if (err.response?.status === 401 && !originalRequest?._retry) {
    originalRequest._retry = true;

    try {
      const tokens = getStoredTokens();
      const refreshToken = tokens?.refresh;
      if (refreshToken) {
        const resp = await refreshAccessToken(refreshToken);
        const { access } = resp.data;
        // persist new access token
        setStoredTokens({ ...(tokens || {}), access });

        // retry original request
        originalRequest.headers = originalRequest.headers || {};
        (originalRequest.headers as Record<string, string | undefined>).Authorization = `Bearer ${access}`;
        return api(originalRequest);
      }
    } catch (refreshError) {
      clearTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }

  // Treat 403 Forbidden as a permission problem but do NOT clear tokens automatically.
  // Some backends return HTTP 200 with a payload like { code: 403, detail: 'Forbidden' }.
  // We already convert those to rejections with status 403 in responseFulfilled. Clearing tokens
  // and redirecting to login on every 403 causes unexpected logouts. Instead, surface the error
  // to the caller and let components decide whether to force a logout or show a friendly message.
  if (err.response?.status === 403) {
    console.warn('[API] Received 403 Forbidden (permission denied). Not clearing tokens automatically.');
    return Promise.reject(error);
  }

  return Promise.reject(error);
};

api.interceptors.response.use(responseFulfilled, responseRejected);
// Expose fulfilled handler for unit tests to avoid reaching into axios internals
;(api as unknown as Record<string, unknown>).__responseFulfilled = responseFulfilled;

// Expose base URL for debugging in dev
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).API_BASE = baseURL;
  console.debug('[API] baseURL:', baseURL);

  // Expose short history of anomalous 200-with-403 events for debugging
  (window as any).__apiForbiddenEvents = (window as any).__apiForbiddenEvents || [];

  // DEV helper: suppress noisy 'Uncaught (in promise)' logs for forbidden rejections
  // that are intentionally converted from 200-with-403 payloads. This prevents the
  // devtools clutter while we find the original endpoint returning the anomalous payload.
  window.addEventListener('unhandledrejection', (ev) => {
    try {
      const reason = (ev as any).reason;
      const resp = reason?.response;
      const data = resp?.data;
      if (resp && resp.status === 403 && data && (data.code === 403 || (data.detail && typeof data.detail === 'string'))) {
        console.warn('[API] Suppressing unhandled forbidden rejection:', data);
        // prevent default logging in devtools
        ev.preventDefault();
      }
    } catch (e) {
      // ignore any errors in the global handler
    }
  });
}

export default api;