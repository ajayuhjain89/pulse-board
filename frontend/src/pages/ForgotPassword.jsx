import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import OTPInput from "../components/OTPInput";
import { useAuth } from "../context/AuthContext";

const RESEND_COOLDOWN = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const isStrongPassword = (pw) =>
  pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1 = request reset, 2 = verify + update
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [otpError, setOtpError] = useState(false);

  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!email || !EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email);
      toast.success("If that email is registered, an OTP has been sent");
      setStep(2);
      setCooldown(RESEND_COOLDOWN);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send reset email"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await forgotPassword(email);
      setCooldown(RESEND_COOLDOWN);
      toast.success("A new code is on its way");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to resend code"));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (otp.length !== 6) {
      setOtpError(true);
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setPasswordError("Needs 8+ chars with a letter and a number");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      toast.success("Password reset successfully. Please log in.");
      navigate("/login");
    } catch (error) {
      setOtpError(true);
      toast.error(getErrorMessage(error, "Failed to reset password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-box">
        <h1 className="auth-headline">
          Reset
          <br />
          Password.
        </h1>
        <p className="auth-subtitle">
          {step === 1
            ? "Enter your email to receive an OTP."
            : "Enter the OTP and your new password."}
        </p>

        <div className="auth-form-card">
          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="auth-form-stack">
              <div>
                <label className="field-label" htmlFor="fp-email">
                  Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  onBlur={() => {
                    if (email && !EMAIL_RE.test(email.trim())) {
                      setEmailError("Enter a valid email address");
                    }
                  }}
                  style={{ width: "100%" }}
                  autoComplete="email"
                  aria-invalid={emailError ? "true" : undefined}
                  aria-describedby={emailError ? "fp-email-error" : undefined}
                  required
                />
                {emailError && (
                  <p id="fp-email-error" className="field-error" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-white btn-loadable"
                data-loading={isLoading}
              >
                {isLoading ? "Sending…" : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="auth-form-stack">
              <div>
                <label className="field-label">Reset Code (OTP)</label>
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    if (otpError) setOtpError(false);
                  }}
                  autoFocus
                  name="reset-otp"
                  error={otpError}
                />
                {otpError && (
                  <p
                    className="field-error"
                    role="alert"
                    style={{ textAlign: "center" }}
                  >
                    Invalid or expired code — try again or request a new one
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="text-link-mono otp-resend"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
              </div>

              <div>
                <label className="field-label" htmlFor="fp-newpw">
                  New Password
                </label>
                <input
                  id="fp-newpw"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  onBlur={() => {
                    if (newPassword && !isStrongPassword(newPassword)) {
                      setPasswordError(
                        "Needs 8+ chars with a letter and a number",
                      );
                    }
                  }}
                  style={{ width: "100%" }}
                  autoComplete="new-password"
                  aria-invalid={passwordError ? "true" : undefined}
                  aria-describedby={
                    passwordError ? "fp-newpw-error" : undefined
                  }
                  required
                />
                {passwordError && (
                  <p id="fp-newpw-error" className="field-error" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-white btn-loadable"
                data-loading={isLoading}
              >
                {isLoading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}
        </div>

        <p className="auth-switch">
          Remembered your password?{" "}
          <Link to="/login" className="auth-switch__link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
