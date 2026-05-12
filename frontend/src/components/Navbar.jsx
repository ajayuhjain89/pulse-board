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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'border-b border-(--hairline) backdrop-blur-sm' 
        : 'border-b border-transparent'
    }`}
    style={{ background: scrolled ? 'color-mix(in srgb, var(--paper) 85%, transparent)' : 'transparent' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-(--ink) rounded-md flex items-center justify-center group-hover:opacity-80 transition-opacity">
              <Activity size={18} className="text-(--paper)" />
            </div>
            <span style={{fontFamily:'var(--font-body)', fontWeight:600, fontSize:'0.9375rem', letterSpacing:'-0.01em', color:'var(--ink)'}}>
              PulseBoard
            </span>
          </Link>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-(--ink-2) hover:text-(--ink) hover:bg-(--subtle) transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="hidden sm:block h-5 w-px bg-(--hairline)"></div>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm font-medium transition-colors nav-link ${isActive('/dashboard') ? 'nav-link--active' : ''}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/polls/create"
                  className={`text-sm font-medium transition-colors nav-link ${isActive('/polls/create') ? 'nav-link--active' : ''}`}
                >
                  New Poll
                </Link>
                <div className="hidden sm:block h-5 w-px bg-(--hairline)"></div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-(--ink-2) hover:text-red-600 dark:hover:text-red-400 transition-colors tooltip"
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className={`nav-link text-sm font-medium text-(--ink-2) hover:text-(--ink) transition-colors ${isActive('/login') ? 'nav-link--active' : ''}`}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm py-1.5 px-4 rounded-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
