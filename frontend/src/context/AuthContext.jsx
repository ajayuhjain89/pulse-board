import { googleLogout } from "@react-oauth/google";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

axios.defaults.baseURL = `${import.meta.env.VITE_API_URL}/api`;

const AuthContext = createContext();

const savedUserInit = localStorage.getItem("user");
const initialUser = savedUserInit ? JSON.parse(savedUserInit) : null;

// Ensure token is applied synchronously before any React component mounts and requests
if (initialUser?.token) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${initialUser.token}`;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(initialUser);

  const loading = false;

  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [user]);

  const login = async (email, password) => {
    const { data } = await axios.post("/auth/login", { email, password });
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await axios.post("/auth/verify-otp", { email, otp });
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const forgotPassword = async (email) => {
    return await axios.post("/auth/forgot-password", { email });
  };

  const resetPassword = async (email, otp, newPassword) => {
    return await axios.post("/auth/reset-password", { email, otp, newPassword });
  };

  const loginWithGoogle = async (token) => {
    const { data } = await axios.post("/auth/google", { token });
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const register = async (name, email, password) => {
    const { data } = await axios.post("/auth/register", {
      name,
      email,
      password,
    });
    if (data.requiresOTP) return data;
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const logout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, verifyOtp, forgotPassword, resetPassword, loginWithGoogle, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
