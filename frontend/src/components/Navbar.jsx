import { Activity, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (showLogoutModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showLogoutModal]);

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, backdrop-filter 0.3s ease",
        background: scrolled
          ? "color-mix(in srgb, var(--paper) 75%, transparent)"
          : "transparent",
        backdropFilter: scrolled ? "blur(18px) saturate(120%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(18px) saturate(120%)" : "none",
        borderBottom: `1px solid ${scrolled ? "var(--hairline)" : "transparent"}`,
      }}
    >
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
          {/* LOGO */}
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
          >
            <div
              style={{
                width: "30px", height: "30px",
                background: "var(--ink)",
                borderRadius: "7px",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Activity size={16} style={{ color: "var(--paper)" }} />
            </div>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: "0.9375rem",
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              PulseBoard
            </span>
          </Link>

          {/* RIGHT SIDE */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: "34px", height: "34px",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "7px",
                background: "transparent",
                border: "none",
                color: "var(--ink-3)",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--subtle)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--ink-3)";
              }}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Separator */}
            <div style={{ width: "1px", height: "18px", background: "var(--hairline)", margin: "0 0.375rem" }} />

            {user ? (
              <>
                <NavLink to="/dashboard" active={isActive("/dashboard")}>Dashboard</NavLink>
                <NavLink to="/polls/create" active={isActive("/polls/create")}>New Poll</NavLink>
                <div style={{ width: "1px", height: "18px", background: "var(--hairline)", margin: "0 0.25rem" }} />
                <button
                  onClick={() => setShowLogoutModal(true)}
                  style={{
                    width: "34px", height: "34px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "7px",
                    background: "transparent",
                    border: "none",
                    color: "var(--ink-3)",
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(192,57,43,0.08)";
                    e.currentTarget.style.color = "var(--danger)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--ink-3)";
                  }}
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <NavLink to="/login" active={isActive("/login")}>Log in</NavLink>
                <Link
                  to="/register"
                  style={{
                    display: "inline-flex", alignItems: "center",
                    background: "var(--ink)", color: "var(--paper)",
                    border: "1px solid var(--ink)",
                    borderRadius: "6px",
                    padding: "0.375rem 0.875rem",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    transition: "opacity 0.15s",
                    textDecoration: "none",
                    marginLeft: "0.25rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.82")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutModal(false); }}
        >
          <div
            className="scale-in"
            style={{
              background: "var(--paper)",
              borderRadius: "12px",
              border: "1px solid var(--hairline)",
              maxWidth: "360px",
              width: "100%",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.75rem" }}>
              <div
                style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  background: "rgba(192,57,43,0.1)",
                  display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
                  marginBottom: "1.25rem",
                }}
              >
                <LogOut style={{ color: "var(--danger)", width: "20px", height: "20px" }} />
              </div>
              <h3
                style={{
                  fontSize: "1.0625rem", fontWeight: 600, color: "var(--ink)",
                  marginBottom: "0.625rem", letterSpacing: "-0.01em",
                }}
              >
                Sign out?
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--ink-2)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
                Are you sure you want to sign out of your account? You will need to log back in to access your polls and dashboard.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="btn-secondary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "var(--danger)",
                    color: "#fff",
                    borderRadius: "6px",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    border: "none",
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

/* Compact nav link */
const NavLink = ({ to, active, children }) => (
  <Link
    to={to}
    style={{
      fontSize: "0.8125rem",
      fontWeight: active ? 600 : 500,
      color: active ? "var(--ink)" : "var(--ink-3)",
      textDecoration: "none",
      padding: "0.375rem 0.625rem",
      borderRadius: "6px",
      transition: "background 0.12s, color 0.12s",
      display: "inline-flex", alignItems: "center",
      background: active ? "var(--subtle)" : "transparent",
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = "var(--subtle)";
        e.currentTarget.style.color = "var(--ink)";
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--ink-3)";
      }
    }}
  >
    {children}
  </Link>
);

export default Navbar;