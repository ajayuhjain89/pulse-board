import { Check, Link as LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Copy a string to the clipboard with an inline icon swap (link → check) for
 * 1.5 s. Replaces the toast-only pattern in the dashboard so the affordance
 * lives where the user just clicked.
 *
 * Props match the existing icon-button style classes so the consumer can hand
 * in `btn-secondary poll-card__action` etc. without restyling.
 */
const CopyButton = ({
  value,
  label = "Copy Link",
  copiedLabel = "Copied",
  className = "",
  iconSize = 13,
  onCopied,
  onFailed,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
    } catch (err) {
      onFailed?.(err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-label={copied ? copiedLabel : label}
      data-copied={copied || undefined}
    >
      {copied ? <Check size={iconSize} /> : <LinkIcon size={iconSize} />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
};

export default CopyButton;
