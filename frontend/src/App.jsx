import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Pages from "./pages";

// Initialize with an env variable
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen text-(--ink) transition-colors duration-300 ease-in-out font-sans relative" style={{background: 'var(--paper)'}}>
              <Navbar />

              <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Pages />
              </main>

              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "var(--toast-bg)",
                    color: "var(--toast-color)",
                    border: "1px solid var(--toast-border)",
                    boxShadow:
                      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  },
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
