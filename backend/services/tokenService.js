import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const REFRESH_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_REFRESH_TOKENS_PER_USER = 10;
// A rotated (superseded) refresh token stays valid this long so that two tabs
// sharing one cookie can both refresh during a reload without one being kicked.
export const REFRESH_GRACE_MS = 60 * 1000;

// ─── Access token (short-lived JWT, sent as Bearer) ─────────────────────────

export const signAccessToken = (userId) =>
  jwt.sign({ id: String(userId) }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);

// ─── Refresh token (opaque random, stored hashed, sent as httpOnly cookie) ──

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateRefreshToken = () => {
  const token = crypto.randomBytes(48).toString("hex");
  return { token, tokenHash: hashToken(token) };
};

export const refreshExpiry = () => new Date(Date.now() + REFRESH_TTL_MS);

// ─── CSRF token (double-submit) ─────────────────────────────────────────────

export const generateCsrfToken = () => crypto.randomBytes(24).toString("hex");

// ─── Refresh-token list maintenance on the User document ────────────────────

// Is a stored refresh-token entry still usable? Valid when not expired and
// either not superseded, or superseded within the grace window.
export const isRefreshEntryUsable = (entry) => {
  if (!entry || !entry.expiresAt || entry.expiresAt.getTime() < Date.now()) {
    return false;
  }
  if (
    entry.supersededAt &&
    Date.now() - entry.supersededAt.getTime() > REFRESH_GRACE_MS
  ) {
    return false;
  }
  return true;
};

// Drop expired entries and superseded-beyond-grace entries, then cap the list
// so a user can't accumulate unbounded sessions (oldest are evicted first).
export const pruneRefreshTokens = (tokens = []) => {
  const now = Date.now();
  return tokens
    .filter((t) => {
      if (!t.expiresAt || t.expiresAt.getTime() <= now) return false;
      if (t.supersededAt && now - t.supersededAt.getTime() > REFRESH_GRACE_MS) {
        return false;
      }
      return true;
    })
    .slice(-(MAX_REFRESH_TOKENS_PER_USER - 1));
};
