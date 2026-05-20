import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Shared dialog. Owns:
 *   - portal mount onto document.body
 *   - body scroll-lock (preserves & restores prior overflow/padding)
 *   - ESC to close
 *   - backdrop click to close
 *   - focus trap (Tab cycles within the dialog)
 *   - initial focus on the first interactive element by default (the consumer
 *     can override by passing an `initialFocusRef` and assigning it to the
 *     element that should receive focus)
 *
 * Visual structure mirrors the existing `.modal-overlay` / `.modal-card`
 * classes already in `index.css`, so adopting it does not shift the look.
 */
const Modal = ({
  open,
  onClose,
  title,
  description,
  icon,
  tone = "neutral", // 'neutral' | 'danger' | 'accent'
  actions,
  children,
  closeOnBackdrop = true,
  initialFocusRef,
  labelledBy,
  describedBy,
}) => {
  const dialogRef = useRef(null);
  const reactId = useId();
  const autoTitleId = `modal-title-${reactId}`;
  const autoDescId = `modal-desc-${reactId}`;

  useEffect(() => {
    if (!open) return undefined;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      // Default: focus the first non-destructive interactive element.
      const focusables = dialogRef.current?.querySelectorAll(
        'button:not([data-destructive]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = Array.from(focusables || []).find((el) => !el.disabled);
      first?.focus();
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const items = Array.from(focusable).filter((el) => !el.disabled);
        if (items.length === 0) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && active === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open, onClose, initialFocusRef]);

  if (!open || typeof document === "undefined") return null;

  const titleId = labelledBy || (title ? autoTitleId : undefined);
  const descId = describedBy || (description ? autoDescId : undefined);

  return createPortal(
    <div
      className="modal-overlay animate-fade-in"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`modal-card scale-in modal-card--${tone}`}
      >
        <div className="modal-card__body">
          {icon && (
            <div className={`modal-card__icon modal-card__icon--${tone}`}>
              {icon}
            </div>
          )}
          {title && (
            <h3 id={titleId} className="modal-card__title">
              {title}
            </h3>
          )}
          {description && (
            <p id={descId} className="modal-card__text">
              {description}
            </p>
          )}
          {children}
          {actions && <div className="modal-card__actions">{actions}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
