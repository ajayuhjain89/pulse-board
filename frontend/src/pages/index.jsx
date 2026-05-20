import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
// Cold-start paths stay in the initial chunk.
import ForgotPassword from "./ForgotPassword";
import Home from "./Home";
import Login from "./Login";
import NotFound from "./NotFound";
import Register from "./Register";

// Heavier / authenticated routes are split into their own chunks so the
// landing + auth pages load fast.
const Dashboard = lazy(() => import("./Dashboard"));
const CreatePoll = lazy(() => import("./CreatePoll"));
const PollView = lazy(() => import("./PollView"));
const PollResults = lazy(() => import("./PollResults"));
const Terms = lazy(() => import("./Terms"));
const Privacy = lazy(() => import("./Privacy"));

const AuthLoading = () => (
  <div className="route-loading">
    <Spinner size={24} />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) return <AuthLoading />;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
};

const Pages = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      <Suspense fallback={<AuthLoading />}>
        <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
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
        <Route
          path="/polls/:id/edit"
          element={
            <ProtectedRoute>
              <CreatePoll />
            </ProtectedRoute>
          }
        />
        <Route path="/polls/:id" element={<PollView />} />
        <Route path="/polls/:id/results" element={<PollResults />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default Pages;
