import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getErrorMessage = (error, fallbackMessage) => {
  const responseMessage = error?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (error?.message) return error.message;
  return fallbackMessage;
};

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1 = request reset, 2 = verify and update
  const [isLoading, setIsLoading] = useState(false);
  
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");
    
    setIsLoading(true);
    try {
      await forgotPassword(email);
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send reset email"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return toast.error("Please fill all fields");
    
    setIsLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      toast.success("Password reset successfully. Please login.");
      navigate("/login");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reset password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-box">
        <h1 className="auth-headline">Reset<br />Password.</h1>
        <p className="auth-subtitle">
          {step === 1 ? "Enter your email to receive an OTP." : "Enter the OTP and your new password."}
        </p>

        <div className="auth-form-card">
          {step === 1 ? (
            <>
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

              <button
                onClick={handleRequestReset}
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
                {isLoading ? "Sending…" : "Send Reset Code"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
                  Reset Code (OTP)
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{ width: "100%", letterSpacing: "0.2em", textAlign: "center", fontSize: "1.25rem", marginBottom: "1rem" }}
                  maxLength={6}
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <button
                onClick={handleResetPassword}
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
                {isLoading ? "Resetting…" : "Reset Password"}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--ink-3)", marginTop: "1.25rem" }}>
          Remembered your password?{" "}
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

export default ForgotPassword;