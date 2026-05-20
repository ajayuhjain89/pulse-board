import { Activity, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Modal from "./Modal";
import Spinner from "./Spinner";

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the sheet on Escape or click outside.
  // (Sheet links close the sheet themselves on tap — see onClick below.)
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    const onPointer = (e) => {
      if (!e.target.closest(".navbar")) setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [sheetOpen]);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      setSheetOpen(false);
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const ThemeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className="navbar__icon-btn"
      aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  return (
    <>
      <nav className="navbar" data-scrolled={scrolled || undefined}>
        <div className="navbar__inner">
          <Link to="/" className="navbar__brand">
            <span className="navbar__logo" aria-hidden="true">
              <Activity size={16} />
            </span>
            <span className="navbar__wordmark">PulseBoard</span>
          </Link>

          {/* DESKTOP actions (hidden ≤768 px) */}
          <div className="navbar__actions">
            {ThemeButton}
            <span className="navbar__separator" aria-hidden="true" />
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`navbar__link ${isActive("/dashboard") ? "navbar__link--active" : ""}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/polls/create"
                  className={`navbar__link ${isActive("/polls/create") ? "navbar__link--active" : ""}`}
                >
                  New Poll
                </Link>
                <span className="navbar__separator" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="navbar__icon-btn navbar__icon-btn--danger"
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`navbar__link ${isActive("/login") ? "navbar__link--active" : ""}`}
                >
                  Log in
                </Link>
                <Link to="/register" className="navbar__signup">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* MOBILE hamburger */}
          <button
            type="button"
            className="navbar__hamburger"
            onClick={() => setSheetOpen((s) => !s)}
            aria-label={sheetOpen ? "Close menu" : "Open menu"}
            aria-expanded={sheetOpen}
            aria-controls="primary-nav-sheet"
          >
            {sheetOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* MOBILE sheet */}
        <div
          id="primary-nav-sheet"
          className="navbar__sheet"
          data-open={sheetOpen || undefined}
          role="region"
          aria-label="Navigation menu"
        >
          <div className="navbar__sheet-inner">
            <div className="navbar__sheet-row">
              <span className="navbar__sheet-label">Theme</span>
              {ThemeButton}
            </div>
            <div className="navbar__sheet-divider" />
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="navbar__sheet-link"
                  onClick={() => setSheetOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/polls/create"
                  className="navbar__sheet-link"
                  onClick={() => setSheetOpen(false)}
                >
                  New Poll
                </Link>
                <div className="navbar__sheet-divider" />
                <button
                  type="button"
                  className="navbar__sheet-link navbar__sheet-link--danger"
                  onClick={() => {
                    setSheetOpen(false);
                    setLogoutOpen(true);
                  }}
                >
                  <LogOut size={15} /> Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="navbar__sheet-link"
                  onClick={() => setSheetOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="navbar__sheet-link navbar__sheet-link--primary"
                  onClick={() => setSheetOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <Modal
        open={logoutOpen}
        onClose={() => !loggingOut && setLogoutOpen(false)}
        title="Sign out?"
        description="Are you sure you want to sign out of your account? You will need to log back in to access your polls and dashboard."
        icon={<LogOut size={20} />}
        tone="danger"
        actions={
          <>
            <button
              type="button"
              onClick={() => setLogoutOpen(false)}
              className="btn-secondary"
              style={{ padding: "0.5rem 1rem" }}
              disabled={loggingOut}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-danger"
              data-destructive
              disabled={loggingOut}
            >
              {loggingOut ? (
                <>
                  <Spinner size={14} /> Signing out…
                </>
              ) : (
                "Sign Out"
              )}
            </button>
          </>
        }
      />
    </>
  );
};

export default Navbar;
