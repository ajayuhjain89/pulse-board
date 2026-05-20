import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Restores scroll position to the top on route change — the page-transition
// remount in pages/index.jsx otherwise leaves the viewport mid-scroll.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
