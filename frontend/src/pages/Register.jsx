import { useGoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import OTPInput from "../components/OTPInput";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const { user, register, verifyOtp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await loginWithGoogle(tokenResponse.access_token);
        toast.success("Welcome to PulseBoard");
        navigate("/dashboard");
      } catch (error) {
        console.error(error);
        toast.error("Google sign-in failed");
      }
    },
    onError: (error) => {
      console.error(error);
      toast.error("Google sign-in failed");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (showOtp) {
        await verifyOtp(email, otp);
        toast.success("Account verified!");
        navigate("/dashboard");
      } else {
        if (password.length < 6) {
          setIsLoading(false);
          return toast.error("Password must be at least 6 characters");
        }
        const res = await register(name, email, password);
        if (res && res.requiresOTP) {
          setShowOtp(true);
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
        <h1 className="auth-headline">Create your<br />account.</h1>
        <p className="auth-subtitle">{showOtp ? "Enter the code sent to your email to verify." : "Start capturing context immediately."}</p>

        <form className="auth-form-card" onSubmit={handleSubmit}>
          {!showOtp ? (
            <>
              {/* Google */}
              <button onClick={() => handleGoogleLogin()} className="btn-google" type="button">
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="auth-divider">or sign up with email</div>

              {/* Full Name */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%" }}
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%" }}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                    Password
                  </label>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--ink-4)", letterSpacing: "0.04em" }}>
                    min. 6 chars
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%" }}
                  autoComplete="new-password"
                />
              </div>

              {/* Password strength strip */}
              {password.length > 0 && (
                <div style={{ display: "flex", gap: "3px", marginTop: "-0.375rem" }}>
                  {[1, 2, 3, 4].map((level) => {
                    const strength =
                      password.length >= 12 ? 4 :
                      password.length >= 8 ? 3 :
                      password.length >= 6 ? 2 : 1;
                    const colors = ["", "var(--danger)", "var(--accent)", "var(--accent)", "var(--success)"];
                    return (
                      <div
                        key={level}
                        style={{
                          flex: 1, height: "3px", borderRadius: "99px",
                          background: level <= strength ? colors[strength] : "var(--hairline)",
                          transition: "background 0.3s",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div>
              <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
                Authentication Code
              </label>
              <OTPInput length={6} value={otp} onChange={setOtp} autoFocus={true} name="register-otp" />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-white"
            style={{
              marginTop: "0.25rem",
              opacity: isLoading ? 0.65 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
              letterSpacing: "0.01em",
              fontWeight: 600,
            }}
          >
            {isLoading ? "Processing…" : (showOtp ? "Verify Account" : "Create Account")}
          </button>

          {!showOtp && (
            <p style={{ fontSize: "0.75rem", color: "var(--ink-4)", textAlign: "center", margin: "0" }}>
              By signing up you agree to our Terms of Service.
            </p>
          )}
        </form>

        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--ink-3)", marginTop: "1.25rem" }}>
          Already have an account?{" "}
          <Link
            to="/login"
            style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
  </svg>
);

export default Register;