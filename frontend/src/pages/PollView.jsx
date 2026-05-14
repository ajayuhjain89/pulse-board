import axios from "axios";
import {
    CheckCircle2,
    Clock,
    Loader2,
    Lock
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PollView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [poll, setPoll] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const { data } = await axios.get(`/polls/${id}`);
        setPoll(data.poll);
        setIsExpired(data.isExpired);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load poll");
      } finally {
        setLoading(false);
      }
    };
    fetchPoll();
  }, [id]);

  const handleOptionChange = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const formattedAnswers = Object.entries(answers).map(
      ([questionId, optionId]) => ({ questionId, optionId }),
    );
    try {
      await axios.post(`/polls/${id}/responses`, { answers: formattedAnswers });
      toast.success("Response recorded!");
      if (poll.isPublished) {
        navigate(`/polls/${id}/results`);
      } else {
        setHasSubmitted(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="skeleton-card" style={{ marginBottom: '1.25rem' }}>
          <div className="skeleton-line" style={{ height: 28, width: '60%' }} />
          <div className="skeleton-line short" style={{ height: 12, width: '45%', marginTop: 8 }} />
          <div style={{ height: 12, marginTop: 14, width: '80%' }} className="skeleton-line" />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ marginBottom: '1rem' }}>
            <div className="skeleton-line short" style={{ height: 14, width: '20%' }} />
            <div className="skeleton-line" style={{ height: 14, width: '70%', marginTop: 10 }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <div className="skeleton-line" style={{ height: 10, width: 120 }} />
              <div className="skeleton-line short" style={{ height: 10, width: 60 }} />
            </div>
          </div>
        ))}
      </div>
    );

  if (!poll)
    return (
      <div className="text-center py-32">
        <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "2.5rem", color: "var(--ink-3)", marginBottom: "1rem" }}>
          Not found.
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
          This poll might have been deleted or the link is invalid.
        </p>
        <button onClick={() => navigate("/")} className="btn-secondary text-sm">
          Return Home
        </button>
      </div>
    );

  const requiresAuth = !isExpired && !poll.isAnonymous && !user;
  const isInteractive = !isExpired && !requiresAuth;
  const answeredCount = Object.keys(answers).length;
  const totalRequired = poll.questions.filter((q) => !q.isOptional).length;
  const progress = poll.questions.length > 0 ? (answeredCount / poll.questions.length) * 100 : 0;

  if (hasSubmitted) {
    return (
      <div className="max-w-lg mx-auto py-24 animate-fade-in flex flex-col items-center text-center">
        <div
          style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "var(--subtle)", border: "1px solid var(--hairline)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "1.75rem",
          }}
        >
          <CheckCircle2 size={22} style={{ color: "var(--accent)" }} />
        </div>
        <h2 className="display-sm mb-3">Response recorded</h2>
        <p style={{ color: "var(--ink-3)", fontSize: "0.9375rem", maxWidth: "28ch", lineHeight: 1.6 }}>
          Thanks for participating. The creator will review these shortly.
        </p>
        <button onClick={() => navigate("/")} className="btn-secondary mt-8 text-sm px-6">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-10 pb-16 animate-fade-in">
      {/* POLL HEADER */}
      <div className="mb-8 text-center">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            marginBottom: "1rem",
          }}
        >
          {poll.title}
        </h1>
        {poll.description && (
          <p style={{ fontSize: "1rem", color: "var(--ink-2)", lineHeight: 1.65, maxWidth: "42ch", margin: "0 auto" }}>
            {poll.description}
          </p>
        )}
      </div>

      {/* META ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          marginBottom: "2.5rem",
          flexWrap: "wrap",
        }}
      >
        <span className="mono-label">{poll.questions.length} question{poll.questions.length !== 1 ? "s" : ""}</span>
        <span style={{ color: "var(--hairline-strong)" }}>·</span>
        <span className="mono-label">{poll.isAnonymous ? "Anonymous" : "Authenticated"}</span>
        <span style={{ color: "var(--hairline-strong)" }}>·</span>
        <span className="mono-label">
          Closes {new Date(poll.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* PROGRESS BAR (multi-question) */}
      {poll.questions.length > 1 && isInteractive && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span className="section-label">{answeredCount} of {poll.questions.length} answered</span>
            <span className="section-label">{Math.round(progress)}%</span>
          </div>
          <div style={{ height: "3px", background: "var(--subtle)", borderRadius: "99px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: "99px",
                background: "var(--accent)",
                width: `${progress}%`,
                transition: "width 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            />
          </div>
        </div>
      )}

      {/* STATUS BANNERS */}
      {isExpired && !poll.isPublished && (
        <div className="polished-panel p-5 mb-8 flex gap-3" style={{ borderLeft: "3px solid var(--ink-4)" }}>
          <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--ink-4)" }} />
          <div>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>Poll Ended</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--ink-2)" }}>
              This poll is no longer accepting responses.
            </p>
          </div>
        </div>
      )}

      {isExpired && poll.isPublished && (
        <div className="polished-panel p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderLeft: "3px solid var(--success)" }}>
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
            <div>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>Poll Completed</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--ink-2)" }}>Results have been published.</p>
            </div>
          </div>
          <button onClick={() => navigate(`/polls/${id}/results`)} className="btn-secondary text-sm">
            View Results
          </button>
        </div>
      )}

      {requiresAuth && (
        <div className="polished-panel p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderLeft: "3px solid var(--accent)" }}>
          <div className="flex gap-3">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <div>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>Authentication Required</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--ink-2)" }}>Please sign in to participate in this poll.</p>
            </div>
          </div>
          <button onClick={() => navigate("/login")} className="btn-primary text-sm">
            Sign In
          </button>
        </div>
      )}

      {/* QUESTIONS */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {poll.questions.map((q, i) => (
          <div
            key={q._id}
            className="polished-panel"
            style={{
              padding: "1.75rem 2rem",
              opacity: !isInteractive ? 0.55 : 1,
              filter: !isInteractive ? "grayscale(0.4)" : "none",
              transition: "opacity 0.2s, filter 0.2s",
            }}
          >
            {/* Question header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "2rem",
                    lineHeight: 1,
                    color: "var(--ink-4)",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {i + 1}.
                </span>
                <div>
                  <h3
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: "var(--ink)",
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {q.text}
                  </h3>
                  {!q.isOptional ? (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--danger)",
                        opacity: 0.8,
                        display: "inline-block",
                        marginTop: "4px",
                      }}
                    >
                      Required
                    </span>
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--ink-4)",
                        display: "inline-block",
                        marginTop: "4px",
                      }}
                    >
                      Optional
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* OPTIONS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {q.options.map((opt) => {
                const isSelected = answers[q._id] === opt._id;
                return (
                  <label
                    key={opt._id}
                    className={`poll-option ${isSelected ? "poll-option--selected" : ""}`}
                    style={{ cursor: !isInteractive ? "not-allowed" : "pointer" }}
                  >
                    <input
                      type="radio"
                      name={q._id}
                      value={opt._id}
                      required={!q.isOptional}
                      disabled={!isInteractive}
                      checked={isSelected}
                      onChange={() => handleOptionChange(q._id, opt._id)}
                      className="sr-only"
                    />
                    <div className="poll-option__dot shrink-0" />
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? "var(--ink)" : "var(--ink-2)",
                        letterSpacing: "-0.005em",
                        transition: "color 0.15s, font-weight 0.1s",
                        flex: 1,
                      }}
                    >
                      {opt.text}
                    </span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--ink)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* SUBMIT */}
        {isInteractive && (
          <div style={{ paddingTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "var(--ink)",
                color: "var(--paper)",
                border: "1px solid var(--ink)",
                borderRadius: "7px",
                padding: "0.875rem 3rem",
                fontFamily: "var(--font-body)",
                fontSize: "0.9375rem",
                fontWeight: 600,
                letterSpacing: "0.01em",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
                transition: "opacity 0.15s, transform 0.1s",
                minWidth: "200px",
              }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = "1"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.978)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                <>Submit Answers →</>
              )}
            </button>
            {totalRequired > 0 && answeredCount < totalRequired && (
              <p className="section-label" style={{ color: "var(--ink-4)" }}>
                {totalRequired - answeredCount} required question{totalRequired - answeredCount !== 1 ? "s" : ""} remaining
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default PollView;