import express from "express";
import * as authController from "../controllers/authController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimits.js";

const router = express.Router();

router.post("/register", authLimiter, asyncHandler(authController.register));
router.post("/login", authLimiter, asyncHandler(authController.login));
router.post("/verify-otp", authLimiter, asyncHandler(authController.verifyOtp));
router.post("/resend-otp", otpLimiter, asyncHandler(authController.resendOtp));
router.post(
  "/forgot-password",
  otpLimiter,
  asyncHandler(authController.forgotPassword),
);
router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(authController.resetPassword),
);
router.post("/google", authLimiter, asyncHandler(authController.googleAuth));
// NOTE: /refresh is intentionally NOT CSRF-guarded. The SPA cannot read the
// httpOnly csrf cookie on a cold page load, so a double-submit check here would
// reject every reload (breaking session persistence). /refresh is safe without
// it: an attacker can force a token rotation but cannot read the cross-origin
// JSON response (CORS-blocked), so no access token is leaked. All data-mutating
// routes remain Bearer-authed and therefore CSRF-immune.
router.post("/refresh", authLimiter, asyncHandler(authController.refreshSession));
router.post("/logout", requireCsrf, asyncHandler(authController.logout));
router.get("/me", protect, asyncHandler(authController.getMe));

export default router;
