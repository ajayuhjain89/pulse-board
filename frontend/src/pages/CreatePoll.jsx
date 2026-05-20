import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../lib/apiClient";

const MAX_QUESTIONS = 50;
const MAX_OPTIONS = 20;

// Convert a Date / ISO string to the value a datetime-local input expects
// (local time, "YYYY-MM-DDTHH:mm").
const toDatetimeLocal = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

const emptyQuestion = () => ({
  text: "",
  isOptional: false,
  options: [{ text: "" }, { text: "" }],
});

// Computed once at module load — a soft lower bound for the date picker.
// The authoritative future-date check lives in validate() and on the server.
const MIN_DATETIME = toDatetimeLocal(new Date(Date.now() + 60 * 1000));

const CreatePoll = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [submittingAs, setSubmittingAs] = useState(null); // 'draft' | 'live'
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get(`/polls/${id}`);
        if (cancelled) return;
        const poll = data.poll;
        setTitle(poll.title || "");
        setDescription(poll.description || "");
        setIsAnonymous(Boolean(poll.isAnonymous));
        setExpiresAt(toDatetimeLocal(poll.expiresAt));
        setQuestions(
          (poll.questions || []).map((q) => ({
            text: q.text,
            isOptional: Boolean(q.isOptional),
            options: q.options.map((o) => ({ text: o.text })),
          })),
        );
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to load poll for editing",
        );
        navigate("/dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, navigate]);

  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      return toast.error(`A poll can have at most ${MAX_QUESTIONS} questions.`);
    }
    setQuestions([...questions, emptyQuestion()]);
  };

  const removeQuestion = (qIndex) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== qIndex));
  };

  const updateQuestion = (qIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], [field]: value };
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length >= MAX_OPTIONS) {
      return toast.error(`A question can have at most ${MAX_OPTIONS} options.`);
    }
    updated[qIndex] = {
      ...updated[qIndex],
      options: [...updated[qIndex].options, { text: "" }],
    };
    setQuestions(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex] = {
      ...updated[qIndex],
      options: updated[qIndex].options.filter((_, i) => i !== oIndex),
    };
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    const options = [...updated[qIndex].options];
    options[oIndex] = { text: value };
    updated[qIndex] = { ...updated[qIndex], options };
    setQuestions(updated);
  };

  const validate = () => {
    if (!title.trim()) {
      toast.error("Please add a poll title.");
      return false;
    }
    if (!expiresAt) {
      toast.error("Please set an expiry date.");
      return false;
    }
    if (new Date(expiresAt).getTime() <= Date.now()) {
      toast.error("Expiry date must be in the future.");
      return false;
    }
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} needs text.`);
        return false;
      }
      if (q.options.some((o) => !o.text.trim())) {
        toast.error(`Question ${i + 1} has an empty option.`);
        return false;
      }
    }
    return true;
  };

  const submit = async (status) => {
    if (submittingAs) return;
    if (!validate()) return;

    setSubmittingAs(status);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      isAnonymous,
      status,
      expiresAt: new Date(expiresAt).toISOString(),
      questions,
    };

    try {
      if (isEditMode) {
        await apiClient.put(`/polls/${id}`, payload);
        toast.success("Poll updated");
      } else {
        await apiClient.post("/polls", payload);
        toast.success(status === "draft" ? "Draft saved" : "Poll created");
      }
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save poll");
    } finally {
      setSubmittingAs(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-14">
        <div className="skeleton-card" style={{ marginBottom: "1.25rem" }}>
          <div className="skeleton-line" style={{ height: 28, width: "50%" }} />
          <div
            className="skeleton-line short"
            style={{ height: 12, width: "70%", marginTop: 10 }}
          />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ marginBottom: "1rem" }}>
            <div className="skeleton-line" style={{ height: 14, width: "60%" }} />
            <div
              className="skeleton-line short"
              style={{ height: 12, width: "40%", marginTop: 10 }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-14 animate-fade-in">
      <div style={{ marginBottom: "3rem" }}>
        <h1 className="page-title-serif">
          {isEditMode ? "Edit Poll" : "Create a Poll"}
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--ink-3)" }}>
          Configure your poll, add questions, and share instantly.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit("live");
        }}
        style={{ display: "flex", flexDirection: "column", gap: "0" }}
      >
        <FormSection number="01" label="Details">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <Field label="Poll Title" required>
              <input
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What feedback do you need?"
                style={{ width: "100%" }}
              />
            </Field>
            <Field label="Description" hint="Optional">
              <textarea
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context or instructions for your audience…"
                style={{ width: "100%", resize: "none", height: "88px" }}
              />
            </Field>
          </div>
        </FormSection>

        <SectionDivider />

        <FormSection number="02" label="Configuration">
          <div className="create-config-grid">
            <Field label="Expiry Date & Time" required>
              <input
                type="datetime-local"
                required
                min={MIN_DATETIME}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{ width: "100%", fontSize: "0.875rem" }}
              />
            </Field>
            <div>
              <p className="field-label" style={{ marginBottom: "0.625rem" }}>
                Anonymous Responses
              </p>
              <label className="toggle-row">
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <div
                    style={{
                      width: "38px",
                      height: "22px",
                      borderRadius: "99px",
                      background: isAnonymous
                        ? "var(--ink)"
                        : "var(--hairline-strong)",
                      transition: "background 0.2s",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "3px",
                        left: isAnonymous ? "19px" : "3px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "var(--surface)",
                        transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--ink)",
                      lineHeight: 1.2,
                    }}
                  >
                    {isAnonymous ? "Enabled" : "Disabled"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ink-3)",
                      marginTop: "2px",
                    }}
                  >
                    {isAnonymous
                      ? "Voter identities are hidden"
                      : "Voters must be signed in"}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </FormSection>

        <SectionDivider />

        <FormSection
          number="03"
          label="Questions"
          right={
            <span className="pill-count">
              {questions.length} {questions.length === 1 ? "item" : "items"}
            </span>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="question-card">
                <div style={{ padding: "1.25rem 1.25rem 1.25rem 1.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <span className="question-card__index">{qIndex + 1}.</span>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        required
                        maxLength={500}
                        value={q.text}
                        onChange={(e) =>
                          updateQuestion(qIndex, "text", e.target.value)
                        }
                        placeholder="Type your question…"
                        aria-label={`Question ${qIndex + 1} text`}
                        className="question-card__text-input"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      disabled={questions.length === 1}
                      className="icon-btn-danger"
                      aria-label="Remove question"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <label className="question-card__optional">
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "3px",
                        border: `1.5px solid ${
                          q.isOptional ? "var(--ink)" : "var(--hairline-strong)"
                        }`,
                        background: q.isOptional ? "var(--ink)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                    >
                      {q.isOptional && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1.5 4L3.5 6L6.5 2"
                            stroke="var(--paper)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={q.isOptional}
                      onChange={(e) =>
                        updateQuestion(qIndex, "isOptional", e.target.checked)
                      }
                    />
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--ink-3)",
                        fontWeight: 500,
                      }}
                    >
                      Mark as optional
                    </span>
                  </label>

                  <div
                    style={{
                      paddingLeft: "2.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {q.options.map((opt, oIndex) => (
                      <div
                        key={oIndex}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.625rem",
                        }}
                      >
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            border: "1.5px solid var(--hairline-strong)",
                            flexShrink: 0,
                          }}
                        />
                        <input
                          type="text"
                          required
                          maxLength={200}
                          value={opt.text}
                          onChange={(e) =>
                            updateOption(qIndex, oIndex, e.target.value)
                          }
                          placeholder={`Option ${oIndex + 1}`}
                          aria-label={`Option ${oIndex + 1} of question ${qIndex + 1}`}
                          className="option-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(qIndex, oIndex)}
                          disabled={q.options.length <= 2}
                          className="icon-btn-danger"
                          aria-label="Remove option"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      className="inline-add-btn"
                    >
                      <Plus size={13} /> Add choice
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addQuestion} className="add-question-btn">
              <Plus size={15} /> Add Question
            </button>
          </div>
        </FormSection>

        <div className="create-actions">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="btn-ghost text-sm px-5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={Boolean(submittingAs)}
            className="btn-secondary btn-loadable"
            data-loading={submittingAs === "draft"}
          >
            {submittingAs === "draft" ? "Saving…" : "Save as Draft"}
          </button>
          <button
            type="submit"
            disabled={Boolean(submittingAs)}
            className="btn-primary btn-loadable"
            data-loading={submittingAs === "live"}
          >
            {submittingAs === "live"
              ? "Saving…"
              : isEditMode
                ? "Save & Publish"
                : "Publish Poll"}
          </button>
        </div>
      </form>
    </div>
  );
};

const SectionDivider = () => <div className="section-divider" />;

const FormSection = ({ number, label, children, right }) => (
  <div>
    <div className="form-section__head">
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <span className="form-section__num">{number}</span>
        <span className="form-section__tick" />
        <span className="form-section__label">{label}</span>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Field = ({ label, hint, required, children }) => (
  <div>
    <div className="field__head">
      <label className="field-label">{label}</label>
      {required && <span className="field__required">*</span>}
      {hint && <span className="field__hint">— {hint}</span>}
    </div>
    {children}
  </div>
);

export default CreatePoll;
