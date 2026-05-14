import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CreatePoll from "./CreatePoll";
import Dashboard from "./Dashboard";
import ForgotPassword from "./ForgotPassword";
import Home from "./Home";
import Login from "./Login";
import PollResults from "./PollResults";
import PollView from "./PollView";
import Register from "./Register";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}>
        <div style={{
          width: "20px", height: "20px",
          border: "2px solid var(--hairline)",
          borderTopColor: "var(--ink)",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
        }} />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

const Pages = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/polls/create"
          element={
            <ProtectedRoute>
              <CreatePoll />
            </ProtectedRoute>
          }
        />
        <Route path="/polls/:id" element={<PollView />} />
        <Route path="/polls/:id/results" element={<PollResults />} />
      </Routes>
    </div>
  );
};

export default Pages;
