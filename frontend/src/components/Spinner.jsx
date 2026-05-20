/**
 * Single source of truth for in-app loading affordances. Replaces the various
 * ad-hoc divs that animate a border + the lucide `Loader2` usage inside
 * button states. Inherits `currentColor` so it picks up the surrounding
 * context (button text colour, modal heading colour, etc.).
 */
const Spinner = ({ size = 20, label = "Loading", className = "" }) => (
  <span
    role="status"
    aria-label={label}
    className={`spinner ${className}`.trim()}
    style={{ width: size, height: size }}
  />
);

export default Spinner;
