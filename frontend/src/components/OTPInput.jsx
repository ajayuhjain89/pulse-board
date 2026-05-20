import { useEffect, useRef } from "react";

const OTPInput = ({
  length = 6,
  value = "",
  onChange,
  autoFocus = true,
  name = "otp",
  error = false,
}) => {
  const inputs = useRef([]);

  useEffect(() => {
    if (autoFocus && inputs.current[0]) inputs.current[0].focus();
  }, [autoFocus]);

  const handleChange = (e, idx) => {
    const v = e.target.value.replace(/[^0-9]/g, "");
    const chars = value.split("");
    chars[idx] = v.slice(-1) || "";
    onChange(chars.join(""));
    if (v && idx < length - 1) inputs.current[idx + 1].focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      if (!value[idx] && idx > 0) {
        const chars = value.split("");
        chars[idx - 1] = "";
        onChange(chars.join(""));
        inputs.current[idx - 1].focus();
        e.preventDefault();
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      inputs.current[idx - 1].focus();
      e.preventDefault();
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      inputs.current[idx + 1].focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData)
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!paste) return;
    const chars = paste.split("");
    onChange(chars.join(""));
    const last = Math.min(paste.length - 1, length - 1);
    if (inputs.current[last]) inputs.current[last].focus();
  };

  return (
    <div className="otp-input" aria-invalid={error || undefined}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          aria-label={`${name}-${i + 1}`}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          ref={(el) => (inputs.current[i] = el)}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={error ? "otp-input__box--error" : ""}
          style={{
            width: "3rem",
            height: "3rem",
            textAlign: "center",
            fontSize: "1.25rem",
            borderRadius: "8px",
            border: "1px solid var(--hairline)",
            background: "var(--paper)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
          }}
        />
      ))}
    </div>
  );
};

export default OTPInput;
