import { cookieConfig } from "../config/env.js";

export const REFRESH_COOKIE = "refresh_token";
export const CSRF_COOKIE = "csrf_token";

// Scoped to /api so the refresh cookie is never sent to the socket.io
// handshake or static assets — only to the auth endpoints that need it.
const baseCookie = {
  httpOnly: true,
  secure: cookieConfig.secure,
  sameSite: cookieConfig.sameSite,
  path: "/api",
};

export const setAuthCookies = (res, { refreshToken, csrfToken, expiresAt }) => {
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookie, expires: expiresAt });
  res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookie, expires: expiresAt });
};

export const clearAuthCookies = (res) => {
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie });
  res.clearCookie(CSRF_COOKIE, { ...baseCookie });
};
