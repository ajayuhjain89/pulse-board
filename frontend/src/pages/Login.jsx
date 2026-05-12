import { useGoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Send access token or id token to your server depending on your backend
        // Since we're using loginWithGoogle with credential we might need ID Token OR adjust API to take access_token
        // if loginWithGoogle accepts access_token, pass it:
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
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    }
  };


  return (
  <div className="auth-container animate-fade-in">
    <div className="auth-box">
      {/* Headline */}
      <h1 className="auth-headline">Welcome<br />back.</h1>
      <p className="auth-subtitle">Sign in to your PulseBoard account.</p>

      {/* Form card */}
      <div className="auth-form-card">
        {/* Google */}
        <button onClick={handleGoogleLogin} className="btn-google">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="auth-divider">or continue with email</div>

        {/* Fields */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{color:'var(--ink-2)'}}>Email</label>
          <input
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5"
            style={{
              background:'var(--surface)',
              border:'1px solid var(--hairline)',
              borderRadius:'6px',
              color:'var(--ink)',
              fontFamily:'var(--font-body)',
              fontSize:'0.875rem',
              outline:'none',
              transition:'border-color 0.15s, box-shadow 0.15s'
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{color:'var(--ink-2)'}}>Password</label>
            <button className="text-xs" style={{color:'var(--ink-3)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-body)'}}>
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5"
            style={{
              background:'var(--surface)',
              border:'1px solid var(--hairline)',
              borderRadius:'6px',
              color:'var(--ink)',
              fontFamily:'var(--font-body)',
              fontSize:'0.875rem',
              outline:'none',
              transition:'border-color 0.15s, box-shadow 0.15s'
            }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="btn-white mt-1"
        >
          Sign In
        </button>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm mt-5" style={{color:'var(--ink-3)'}}>
        Don't have an account?{' '}
        <Link to="/register" style={{color:'var(--ink)', fontWeight:500, textDecoration:'none'}}>
          Sign up
        </Link>
      </p>
    </div>
  </div>
);
};

export default Login;
