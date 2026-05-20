import { useGoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate } from "react-router-dom";
import GoogleIcon from "../components/GoogleIcon";
import OTPInput from "../components/OTPInput";
import { useAuth } from "../context/AuthContext";

const RESEND_COOLDOWN = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isStrongPassword = (pw) =>
  pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [nameError, setNameError] = useState("");
  const [otpError, setOtpError] = useState(false);
  const { user, authReady, register, verifyOtp, resendOtp, loginWithGoogle } =
    useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async ({ code }) => {
      try {
        await loginWithGoogle(code);
        toast.success("Welcome to PulseBoard");
        navigate("/dashboard");
      } catch (error) {
        toast.error(error.response?.data?.message || "Google sign-in failed");
      }
    },
    onError: () => toast.error("Google sign-in failed"),
  });

  if (authReady && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendOtp(email);
      setCooldown(RESEND_COOLDOWN);
      toast.success("A new code is on its way");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend code");
    }
  };

  const validateRegister = () => {
    let ok = true;
    if (!name.trim()) {
      setNameError("Name is required");
      ok = false;
    }
    if (!email || !EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address");
      ok = false;
    }
    if (!isStrongPassword(password)) {
      setPasswordError(
        "Password needs 8+ characters with at least one letter and one number",
      );
      ok = false;
    }
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (showOtp) {
        if (otp.length !== 6) {
          setOtpError(true);
          return;
        }
        try {
          await verifyOtp(email, otp);
        } catch (err) {
          setOtpError(true);
          throw err;
        }
        toast.success("Account verified!");
        navigate("/dashboard");
      } else {
        if (!validateRegister()) return;
        const res = await register(name, email, password);
        if (res?.requiresOTP) {
          setShowOtp(true);
          setCooldown(RESEND_COOLDOWN);
          toast.success("OTP sent to your email");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-box animate-slide-up">
        <h1 className="auth-headline">
          Create your
          <br />
          account.
        </h1>
        <p className="auth-subtitle">
          {showOtp
            ? "Enter the code sent to your email to verify."
            : "Start capturing context immediately."}
        </p>

        <form className="auth-form-card" onSubmit={handleSubmit}>
          {!showOtp ? (
            <>
              <button
                onClick={() => handleGoogleLogin()}
                className="btn-google"
                type="button"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="auth-divider">or sign up with email</div>

              <div>
                <label className="field-label" htmlFor="reg-name">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  style={{ width: "100%" }}
                  autoComplete="name"
                  aria-invalid={nameError ? "true" : undefined}
                  aria-describedby={nameError ? "reg-name-error" : undefined}
                  required
                />
                {nameError && (
                  <p id="reg-name-error" className="field-error" role="alert">
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label className="field-label" htmlFor="reg-email">
                  Email
                </label>
                <input
                  id="reg-email"
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
                  aria-describedby={emailError ? "reg-email-error" : undefined}
                  required
                />
                {emailError && (
                  <p id="reg-email-error" className="field-error" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <div className="field-label-row">
                  <label className="field-label" htmlFor="reg-password">
                    Password
                  </label>
                  <span className="field-label__hint">
                    8+ chars · letter · number
                  </span>
                </div>
                <input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  onBlur={() => {
                    if (password && !isStrongPassword(password)) {
                      setPasswordError(
                        "Needs 8+ chars with a letter and a number",
                      );
                    }
                  }}
                  style={{ width: "100%" }}
                  autoComplete="new-password"
                  aria-invalid={passwordError ? "true" : undefined}
                  aria-describedby={
                    passwordError ? "reg-password-error" : undefined
                  }
                  required
                />
                {passwordError && (
                  <p
                    id="reg-password-error"
                    className="field-error"
                    role="alert"
                  >
                    {passwordError}
                  </p>
                )}
              </div>

              {password.length > 0 && (
                <div className="pw-strength">
                  {[1, 2, 3, 4].map((level) => {
                    const strength =
                      password.length >= 12 && isStrongPassword(password)
                        ? 4
                        : password.length >= 8 && isStrongPassword(password)
                          ? 3
                          : password.length >= 6
                            ? 2
                            : 1;
                    const colors = [
                      "",
                      "var(--danger)",
                      "var(--accent)",
                      "var(--accent)",
                      "var(--success)",
                    ];
                    return (
                      <div
                        key={level}
                        className="pw-strength__bar"
                        style={{
                          background:
                            level <= strength
                              ? colors[strength]
                              : "var(--hairline)",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="field-label">Authentication Code</label>
              <OTPInput
                length={6}
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  if (otpError) setOtpError(false);
                }}
                autoFocus
                name="register-otp"
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
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-white btn-loadable"
            data-loading={isLoading}
          >
            {isLoading
              ? "Processing…"
              : showOtp
                ? "Verify Account"
                : "Create Account"}
          </button>

          {!showOtp && (
            <p className="auth-fineprint">
              By signing up you agree to our{" "}
              <Link to="/terms" className="auth-fineprint__link">
                Terms of Service
              </Link>
              .
            </p>
          )}
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-switch__link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
