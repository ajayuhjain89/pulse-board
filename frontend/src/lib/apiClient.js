import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  // Fail loudly rather than silently 404-ing every request.
  console.error(
    "[apiClient] VITE_API_URL is not set. Create frontend/.env with " +
      "VITE_API_URL pointing at the backend (e.g. http://localhost:5001).",
  );
}

// Raw server origin (no /api) — used for the socket.io connection.
export const SERVER_ORIGIN = API_BASE ?? "";

export const apiClient = axios.create({
  baseURL: `${SERVER_ORIGIN}/api/v1`,
  withCredentials: true, // send the refresh-token cookie to /auth/* endpoints
});

// ─── In-memory auth state (never persisted to localStorage) ─────────────────

let accessToken = null;
let csrfToken = null;

export const getAccessToken = () => accessToken;

export const setAuthTokens = (data) => {
  accessToken = data?.accessToken ?? null;
  csrfToken = data?.csrfToken ?? null;
};

export const clearAuthTokens = () => {
  accessToken = null;
  csrfToken = null;
};

const handlers = { onRefreshed: null, onLost: null };

export const registerSessionHandlers = ({ onRefreshed, onLost }) => {
  handlers.onRefreshed = onRefreshed ?? null;
  handlers.onLost = onLost ?? null;
};

// ─── Interceptors ───────────────────────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
  return config;
});

// A single in-flight refresh shared by all callers, so a burst of 401s only
// triggers one /auth/refresh round-trip.
let refreshPromise = null;

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh", null, { _skipAuthRefresh: true })
      .then((res) => {
        setAuthTokens(res.data);
        handlers.onRefreshed?.(res.data);
        return res.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original._skipAuthRefresh
    ) {
      original._retry = true;
      try {
        const data = await refreshSession();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch {
        // Refresh failed — the session is genuinely over.
        clearAuthTokens();
        handlers.onLost?.();
      }
    }

    return Promise.reject(error);
  },
);
