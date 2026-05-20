import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import {
  generateCsrfToken,
  generateRefreshToken,
  hashToken,
  isRefreshEntryUsable,
  pruneRefreshTokens,
  refreshExpiry,
  signAccessToken,
} from "../services/tokenService.js";
import { sendOTP } from "../utils/email.js";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../utils/cookies.js";
import {
  forgotSchema,
  googleAuthSchema,
  loginSchema,
  otpVerifySchema,
  registerSchema,
  resendOtpSchema,
  resetSchema,
} from "../utils/validators.js";

// ─── Constants ──────────────────────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_LOCK_MS = 30 * 60 * 1000;

// Google auth-code flow: the backend exchanges the code using the client
// secret (a confidential-client exchange — the server-side equivalent of
// PKCE). `postmessage` is the redirect URI used by popup-based code flows.
const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  "postmessage",
);

// Always-bcrypt comparison even when no user is found — flattens timing so an
// attacker can't distinguish "no such user" from "wrong password".
const DUMMY_HASH = bcrypt.hashSync("timing-defense-placeholder", 10);

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const userPublic = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  isVerified: user.isVerified,
});

const setNewOTP = async (user) => {
  const otp = generateOTP();
  user.otpHash = await bcrypt.hash(otp, 10);
  user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpRequestedAt = new Date();
  await user.save();
  return otp;
};

const clearOTP = (user) => {
  user.otpHash = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;
};

const isLocked = (user) =>
  user.lockedUntil && user.lockedUntil.getTime() > Date.now();

// Issue a fresh refresh-token session, set cookies, return the auth payload.
const establishSession = async (res, user, statusCode = 200) => {
  const { token: refreshToken, tokenHash } = generateRefreshToken();
  const expiresAt = refreshExpiry();

  user.refreshTokens = pruneRefreshTokens(user.refreshTokens);
  user.refreshTokens.push({ tokenHash, expiresAt, createdAt: new Date() });
  await user.save();

  const csrfToken = generateCsrfToken();
  setAuthCookies(res, { refreshToken, csrfToken, expiresAt });

  res.status(statusCode).json({
    user: userPublic(user),
    accessToken: signAccessToken(user._id),
    csrfToken,
  });
};

// ─── Controllers ────────────────────────────────────────────────────────────

export const register = async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);

  let user = await User.findOne({ email });

  if (user) {
    if (user.isVerified) {
      // Don't reveal that the email is taken.
      return res.status(200).json({
        message: "If the email is available, an OTP has been sent.",
        requiresOTP: true,
        email,
      });
    }
    // Unverified account exists — do NOT overwrite name/password (that would
    // let an attacker hijack an in-progress signup). Just resend an OTP.
    const otp = await setNewOTP(user);
    try {
      await sendOTP(user.email, otp);
    } catch (e) {
      console.error("[REGISTER] OTP send failed:", e.message);
      throw new HttpError(500, "Failed to send verification email. Try again later.");
    }
    return res
      .status(200)
      .json({ message: "OTP sent to email", requiresOTP: true, email: user.email });
  }

  const salt = await bcrypt.genSalt(10);
  user = new User({
    name,
    email,
    password: await bcrypt.hash(password, salt),
    isVerified: false,
  });
  const otp = await setNewOTP(user);

  try {
    await sendOTP(user.email, otp);
  } catch (e) {
    console.error("[REGISTER] OTP send failed:", e.message);
    await User.deleteOne({ _id: user._id }).catch(() => {});
    throw new HttpError(500, "Failed to send verification email. Try again later.");
  }

  res
    .status(201)
    .json({ message: "OTP sent to email", requiresOTP: true, email: user.email });
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = otpVerifySchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user || !user.otpHash || !user.otpExpiry) {
    throw new HttpError(401, "Invalid or expired OTP");
  }
  if (user.otpExpiry.getTime() < Date.now()) {
    clearOTP(user);
    await user.save();
    throw new HttpError(401, "Invalid or expired OTP");
  }
  if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    clearOTP(user);
    await user.save();
    throw new HttpError(429, "Too many failed attempts. Request a new code.");
  }

  const ok = await bcrypt.compare(otp, user.otpHash);
  if (!ok) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw new HttpError(401, "Invalid or expired OTP");
  }

  clearOTP(user);
  user.isVerified = true;
  await establishSession(res, user, 200);
};

export const login = async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email });

  const passwordOk = await bcrypt.compare(
    password,
    user?.password || DUMMY_HASH,
  );

  if (!user || !user.password || !passwordOk) {
    if (user) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOGIN_LOCK_MS);
        user.loginAttempts = 0;
      }
      await user.save().catch(() => {});
    }
    throw new HttpError(401, "Invalid email or password");
  }

  if (isLocked(user)) {
    throw new HttpError(429, "Account temporarily locked. Try again later.");
  }

  if (!user.isVerified && !user.googleId) {
    throw new HttpError(403, "Please verify your email before signing in.");
  }

  user.loginAttempts = 0;
  user.lockedUntil = undefined;
  await establishSession(res, user, 200);
};

export const resendOtp = async (req, res) => {
  const { email } = resendOtpSchema.parse(req.body);

  const user = await User.findOne({ email });
  const generic = { message: "If the email is registered, a new OTP has been sent." };

  if (!user || user.isVerified) return res.json(generic);

  if (
    user.otpRequestedAt &&
    Date.now() - user.otpRequestedAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    throw new HttpError(429, "Please wait a minute before requesting another code.");
  }

  const otp = await setNewOTP(user);
  try {
    await sendOTP(user.email, otp);
  } catch (e) {
    console.error("[RESEND OTP] failed:", e.message);
    throw new HttpError(500, "Failed to send OTP email. Try again later.");
  }
  res.json(generic);
};

export const forgotPassword = async (req, res) => {
  const { email } = forgotSchema.parse(req.body);

  const user = await User.findOne({ email });
  const generic = { message: "If this email is registered, an OTP has been sent." };

  if (!user) return res.status(200).json(generic);

  if (
    user.otpRequestedAt &&
    Date.now() - user.otpRequestedAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return res.status(200).json(generic);
  }

  const otp = await setNewOTP(user);
  try {
    await sendOTP(user.email, otp, "reset");
  } catch (e) {
    console.error("[FORGOT PASSWORD] OTP send failed:", e.message);
  }
  res.status(200).json(generic);
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = resetSchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user || !user.otpHash || !user.otpExpiry) {
    throw new HttpError(401, "Invalid or expired OTP");
  }
  if (user.otpExpiry.getTime() < Date.now()) {
    clearOTP(user);
    await user.save();
    throw new HttpError(401, "Invalid or expired OTP");
  }
  if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    clearOTP(user);
    await user.save();
    throw new HttpError(429, "Too many failed attempts. Request a new code.");
  }

  const ok = await bcrypt.compare(otp, user.otpHash);
  if (!ok) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw new HttpError(401, "Invalid or expired OTP");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  clearOTP(user);
  user.loginAttempts = 0;
  user.lockedUntil = undefined;
  // Invalidate all existing sessions after a password reset.
  user.refreshTokens = [];
  await user.save();

  res.json({ message: "Password reset successfully" });
};

export const googleAuth = async (req, res) => {
  const { code } = googleAuthSchema.parse(req.body);

  if (!env.GOOGLE_CLIENT_SECRET) {
    throw new HttpError(503, "Google sign-in is not configured on the server.");
  }

  let payload;
  try {
    const { tokens } = await googleClient.getToken(code);
    if (!tokens?.id_token) throw new Error("No id_token in Google response");
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (e) {
    console.error("[GOOGLE AUTH] failed:", e.message);
    throw new HttpError(401, "Google sign-in failed");
  }

  if (!payload?.email || !payload.email_verified) {
    throw new HttpError(401, "Google account email is not verified");
  }

  const email = payload.email.toLowerCase().trim();
  const { name, sub: googleId, picture: avatar } = payload;

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      name: name || email.split("@")[0],
      email,
      googleId,
      avatar,
      isVerified: true,
    });
  } else {
    user.googleId = user.googleId || googleId;
    if (avatar) user.avatar = avatar;
    if (name && name !== user.name) user.name = name;
    user.isVerified = true;
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
  }

  await establishSession(res, user, 200);
};

export const refreshSession = async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) throw new HttpError(401, "Not authenticated");

  const tokenHash = hashToken(raw);
  const user = await User.findOne({ "refreshTokens.tokenHash": tokenHash });
  if (!user) {
    clearAuthCookies(res);
    throw new HttpError(401, "Session expired");
  }

  const entry = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
  if (!isRefreshEntryUsable(entry)) {
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.tokenHash !== tokenHash,
    );
    await user.save();
    clearAuthCookies(res);
    throw new HttpError(401, "Session expired");
  }

  // Rotate with a grace window: mark the presented token superseded (rather
  // than deleting it) so a sibling tab sharing the same cookie can still
  // rotate within REFRESH_GRACE_MS instead of being logged out. establishSession
  // prunes superseded-beyond-grace entries and issues a fresh token.
  if (!entry.supersededAt) entry.supersededAt = new Date();
  await establishSession(res, user, 200);
};

export const logout = async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) {
    const tokenHash = hashToken(raw);
    await User.updateOne(
      { "refreshTokens.tokenHash": tokenHash },
      { $pull: { refreshTokens: { tokenHash } } },
    ).catch(() => {});
  }
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, "User not found");
  res.json({ user: userPublic(user) });
};
