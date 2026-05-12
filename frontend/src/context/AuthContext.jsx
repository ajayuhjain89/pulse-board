import { googleLogout } from "@react-oauth/google";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

axios.defaults.baseURL = `${import.meta.env.VITE_API_URL}/api`;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

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
      value={{ user, loading, login, loginWithGoogle, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
