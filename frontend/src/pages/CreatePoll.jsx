import axios from "axios";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const CreatePoll = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [questions, setQuestions] = useState([
    { text: "", isOptional: false, options: [{ text: "" }, { text: "" }] },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = () =>
    setQuestions([...questions, { text: "", isOptional: false, options: [{ text: "" }, { text: "" }] }]);

  const removeQuestion = (qIndex) => {
    if (questions.length === 1) return toast.error("Minimum one question is required.");
    setQuestions(questions.filter((_, i) => i !== qIndex));
  };

  const updateQuestion = (qIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex][field] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push({ text: "" });
    setQuestions(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return toast.error("Minimum 2 options required.");
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex].text = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expiresAt) return toast.error("Please set an expiry date.");
    setIsSubmitting(true);
    try {
      await axios.post("/polls", {
        title, description, isAnonymous,
        expiresAt: new Date(expiresAt).toISOString(),
        questions,
      });
      toast.success("Poll created!");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to create poll");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-14 animate-fade-in">
      {/* PAGE TITLE */}
      <div style={{ marginBottom: "3rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            letterSpacing: "-0.025em",
            lineHeight: 1,
            color: "var(--ink)",
            marginBottom: "0.75rem",
          }}
        >
          Create a Poll
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--ink-3)" }}>
          Configure your poll, add questions, and share instantly.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {/* ── SECTION 1: DETAILS ── */}
        <FormSection number="01" label="Details">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <Field label="Poll Title" required>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What feedback do you need?"
                style={{ width: "100%" }}
              />
            </Field>
            <Field label="Description" hint="Optional">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context or instructions for your audience…"
                style={{ width: "100%", resize: "none", height: "88px" }}
              />
            </Field>
          </div>
        </FormSection>

        <SectionDivider />

        {/* ── SECTION 2: CONFIGURATION ── */}
        <FormSection number="02" label="Configuration">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <Field label="Expiry Date & Time" required>
              <input
                type="datetime-local"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{ width: "100%", fontSize: "0.875rem" }}
              />
            </Field>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  marginBottom: "0.625rem",
                }}
              >
                Anonymous Responses
              </p>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  cursor: "pointer",
                  padding: "0.875rem 1rem",
                  background: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "6px",
                  transition: "border-color 0.15s",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--hairline-strong)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--hairline)")}
              >
                {/* Toggle */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <div
                    style={{
                      width: "38px", height: "22px", borderRadius: "99px",
                      background: isAnonymous ? "var(--ink)" : "var(--hairline-strong)",
                      transition: "background 0.2s",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "3px",
                        left: isAnonymous ? "19px" : "3px",
                        width: "16px", height: "16px",
                        borderRadius: "50%",
                        background: "var(--surface)",
                        transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--ink)", lineHeight: 1.2 }}>
                    {isAnonymous ? "Enabled" : "Disabled"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-3)", marginTop: "2px" }}>
                    {isAnonymous ? "Voter identities are hidden" : "Voters must be signed in"}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </FormSection>

        <SectionDivider />

        {/* ── SECTION 3: QUESTIONS ── */}
        <FormSection
          number="03"
          label="Questions"
          right={
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.06em",
                color: "var(--ink-4)",
                background: "var(--subtle)",
                padding: "3px 10px",
                borderRadius: "99px",
                border: "1px solid var(--hairline)",
              }}
            >
              {questions.length} {questions.length === 1 ? "item" : "items"}
            </span>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="question-card">
                <div style={{ padding: "1.25rem 1.25rem 1.25rem 1.75rem" }}>
                  {/* Question text + index */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: "1rem" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontSize: "1.5rem",
                        lineHeight: 1,
                        color: "var(--ink-4)",
                        flexShrink: 0,
                        marginTop: "4px",
                      }}
                    >
                      {qIndex + 1}.
                    </span>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        required
                        value={q.text}
                        onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                        placeholder="Type your question…"
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--hairline)",
                          borderRadius: "0",
                          padding: "0 0 8px 0",
                          fontSize: "0.9375rem",
                          fontWeight: 500,
                          color: "var(--ink)",
                          outline: "none",
                          boxShadow: "none",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--ink)")}
                        onBlur={(e) => (e.target.style.borderColor = "var(--hairline)")}
                      />
                    </div>
                    {/* Remove question */}
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "4px", color: "var(--ink-4)", borderRadius: "4px",
                        flexShrink: 0, transition: "color 0.15s",
                        display: "flex", alignItems: "center",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-4)")}
                      aria-label="Remove question"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Optional toggle */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      marginBottom: "1rem",
                      paddingLeft: "2.25rem",
                    }}
                  >
                    <div
                      style={{
                        width: "14px", height: "14px", borderRadius: "3px",
                        border: `1.5px solid ${q.isOptional ? "var(--ink)" : "var(--hairline-strong)"}`,
                        background: q.isOptional ? "var(--ink)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all 0.15s",
                      }}
                    >
                      {q.isOptional && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--paper)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={q.isOptional}
                      onChange={(e) => updateQuestion(qIndex, "isOptional", e.target.checked)}
                    />
                    <span style={{ fontSize: "0.8125rem", color: "var(--ink-3)", fontWeight: 500 }}>
                      Mark as optional
                    </span>
                  </label>

                  {/* OPTIONS */}
                  <div style={{ paddingLeft: "2.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {q.options.map((opt, oIndex) => (
                      <div
                        key={oIndex}
                        style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
                        className="group/opt"
                      >
                        <div
                          style={{
                            width: "12px", height: "12px", borderRadius: "50%",
                            border: "1.5px solid var(--hairline-strong)",
                            flexShrink: 0,
                          }}
                        />
                        <input
                          type="text"
                          required
                          value={opt.text}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          style={{
                            flex: 1,
                            fontSize: "0.875rem",
                            padding: "0.5rem 0.75rem",
                            background: "var(--paper)",
                            border: "1px solid var(--hairline)",
                            borderRadius: "5px",
                            transition: "border-color 0.12s",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(qIndex, oIndex)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: "4px", color: "var(--ink-4)", borderRadius: "3px",
                            display: "flex", alignItems: "center",
                            opacity: q.options.length <= 2 ? 0.25 : 1,
                            pointerEvents: q.options.length <= 2 ? "none" : "auto",
                            transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-4)")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Add option */}
                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.375rem",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--ink-3)", fontSize: "0.8125rem", fontWeight: 500,
                        fontFamily: "var(--font-body)", padding: "0.375rem 0",
                        marginTop: "0.25rem", transition: "color 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-3)")}
                    >
                      <Plus size={13} /> Add choice
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add question */}
            <button
              type="button"
              onClick={addQuestion}
              style={{
                width: "100%",
                padding: "1.25rem",
                background: "var(--subtle)",
                border: "1.5px dashed var(--hairline-strong)",
                borderRadius: "10px",
                color: "var(--ink-3)",
                fontSize: "0.875rem",
                fontWeight: 500,
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "border-color 0.15s, color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--ink-3)";
                e.currentTarget.style.color = "var(--ink)";
                e.currentTarget.style.background = "var(--hairline)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--hairline-strong)";
                e.currentTarget.style.color = "var(--ink-3)";
                e.currentTarget.style.background = "var(--subtle)";
              }}
            >
              <Plus size={15} /> Add Question
            </button>
          </div>
        </FormSection>

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
            paddingTop: "2.5rem",
            borderTop: "1px solid var(--hairline)",
            marginTop: "2rem",
          }}
        >
          <button type="button" onClick={() => navigate("/dashboard")} className="btn-ghost text-sm px-5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              background: "var(--ink)", color: "var(--paper)",
              border: "1px solid var(--ink)", borderRadius: "6px",
              padding: "0.5625rem 1.5rem",
              fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.65 : 1,
              transition: "opacity 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = "1"; }}
          >
            {isSubmitting ? "Creating…" : "Create Poll →"}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ── Small layout helpers ── */
const SectionDivider = () => (
  <div style={{ height: "1px", background: "var(--hairline)", margin: "2.5rem 0" }} />
);

const FormSection = ({ number, label, children, right }) => (
  <div style={{ marginBottom: "0" }}>
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500,
            letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)",
          }}
        >
          {number}
        </span>
        <span style={{ width: "1px", height: "12px", background: "var(--hairline-strong)" }} />
        <span
          style={{
            fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500,
            letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)",
          }}
        >
          {label}
        </span>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Field = ({ label, hint, required, children }) => (
  <div>
    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.5rem" }}>
      <label
        style={{
          fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 500,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)",
        }}
      >
        {label}
      </label>
      {required && (
        <span style={{ color: "var(--danger)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>*</span>
      )}
      {hint && (
        <span style={{ fontSize: "10px", color: "var(--ink-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
          — {hint}
        </span>
      )}
    </div>
    {children}
  </div>
);

export default CreatePoll;