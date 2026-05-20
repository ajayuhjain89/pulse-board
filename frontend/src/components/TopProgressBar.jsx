import { useLocation } from "react-router-dom";

/**
 * A lightweight top-of-page progress affordance. It is intentionally
 * CSS-only: changing `key` on each route remounts the element, which replays
 * the one-shot animation — no effects, no state, no setState-in-effect.
 * Pairs well with React.lazy route chunks loading in the background.
 */
const TopProgressBar = () => {
  const { pathname } = useLocation();
  return <div key={pathname} className="route-progress" aria-hidden="true" />;
};

export default TopProgressBar;
