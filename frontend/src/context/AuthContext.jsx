import { googleLogout } from "@react-oauth/google";
import { createContext, useContext, useEffect, useState } from "react";
import {
  apiClient,
  clearAuthTokens,
  refreshSession,
  registerSessionHandlers,
  setAuthTokens,
} from "../lib/apiClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // React to refreshes / session loss triggered by the axios interceptor.
  useEffect(() => {
    registerSessionHandlers({
      onRefreshed: (data) => {
        if (data?.user) setUser(data.user);
      },
      onLost: () => setUser(null),
    });
  }, []);

  // Cross-tab logout: when one tab logs out it writes a key; sibling tabs hear
  // the storage event and clear their in-memory token + user so no tab keeps a
  // zombie session. (Only a timestamp is stored — never a token.)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "pulseboard:logout") {
        clearAuthTokens();
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // On boot the access token is gone (memory-only). Ask the server to mint a
  // new one from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    setAuthTokens(data);
    setUser(data.user);
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await apiClient.post("/auth/verify-otp", { email, otp });
    setAuthTokens(data);
    setUser(data.user);
  };

  const register = async (name, email, password) => {
    const { data } = await apiClient.post("/auth/register", {
      name,
      email,
      password,
    });
    return data; // { message, requiresOTP, email }
  };

  const resendOtp = (email) => apiClient.post("/auth/resend-otp", { email });

  const forgotPassword = (email) =>
    apiClient.post("/auth/forgot-password", { email });

  const resetPassword = (email, otp, newPassword) =>
    apiClient.post("/auth/reset-password", { email, otp, newPassword });

  const loginWithGoogle = async (code) => {
    const { data } = await apiClient.post("/auth/google", { code });
    setAuthTokens(data);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore — clearing local state below is what matters.
    }
    googleLogout();
    clearAuthTokens();
    setUser(null);
    // Signal sibling tabs to drop their in-memory session too.
    try {
      localStorage.setItem("pulseboard:logout", String(Date.now()));
    } catch {
      // localStorage unavailable (private mode quota) — non-fatal.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        login,
        verifyOtp,
        register,
        resendOtp,
        forgotPassword,
        resetPassword,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
