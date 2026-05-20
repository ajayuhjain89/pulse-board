import { GoogleOAuthProvider } from "@react-oauth/google";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import ScrollToTop from "./components/ScrollToTop";
import TopProgressBar from "./components/TopProgressBar";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Pages from "./pages";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

if (!GOOGLE_CLIENT_ID) {
  console.warn(
    "[App] VITE_GOOGLE_CLIENT_ID is not set — Google sign-in will be unavailable.",
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <TopProgressBar />
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <div
              className="min-h-screen text-(--ink) transition-colors duration-300 ease-in-out font-sans relative"
              style={{ background: "var(--paper)" }}
            >
              <Navbar />

              <main
                id="main"
                tabIndex={-1}
                className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
              >
                <ErrorBoundary>
                  <Pages />
                </ErrorBoundary>
              </main>

              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "var(--toast-bg)",
                    color: "var(--toast-color)",
                    border: "1px solid var(--toast-border)",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.95rem",
                    lineHeight: 1.2,
                    alignItems: "center",
                  },
                  success: { icon: <CheckCircle size={18} /> },
                  error: { icon: <XCircle size={18} /> },
                  loading: { icon: <Loader2 size={18} className="animate-spin" /> },
                }}
              />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
