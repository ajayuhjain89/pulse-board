import { useGoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import GoogleIcon from "../components/GoogleIcon";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, authReady, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nextPath = searchParams.get("next") || "/dashboard";

  const handleGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async ({ code }) => {
      try {
        await loginWithGoogle(code);
        toast.success("Welcome to PulseBoard");
        navigate(nextPath);
      } catch (error) {
        toast.error(error.response?.data?.message || "Google sign-in failed");
      }
    },
    onError: () => toast.error("Google sign-in failed"),
  });

  // Render the redirect synchronously — avoids the brief login-form flash.
  if (authReady && user) {
    return <Navigate to={nextPath} replace />;
  }

  const validate = () => {
    let ok = true;
    if (!email || !EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address");
      ok = false;
    }
    if (!password) {
      setPasswordError("Password is required");
      ok = false;
    }
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validate()) return;
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate(nextPath);
    } catch (error) {
      toast.error(error.response?.data?.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-box animate-slide-up">
        <h1 className="auth-headline">
          Welcome
          <br />
          back.
        </h1>
        <p className="auth-subtitle">Sign in to your PulseBoard account.</p>

        <form className="auth-form-card" onSubmit={handleSubmit}>
          <button
            onClick={() => handleGoogleLogin()}
            className="btn-google"
            type="button"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider">or continue with email</div>

          <div>
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
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
              aria-describedby={emailError ? "login-email-error" : undefined}
              required
            />
            {emailError && (
              <p id="login-email-error" className="field-error" role="alert">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <div className="field-label-row">
              <label className="field-label" htmlFor="login-password">
                Password
              </label>
              <Link to="/forgot-password" className="text-link-mono">
                Forgot?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              style={{ width: "100%" }}
              autoComplete="current-password"
              aria-invalid={passwordError ? "true" : undefined}
              aria-describedby={passwordError ? "login-password-error" : undefined}
              required
            />
            {passwordError && (
              <p id="login-password-error" className="field-error" role="alert">
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
            {isLoading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register" className="auth-switch__link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
