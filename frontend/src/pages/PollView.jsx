import { CheckCircle2, Clock, FileText, Info, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAnonymousId } from "../lib/anonId";
import { apiClient } from "../lib/apiClient";

const draftStorageKey = (id) => `pollAnswers:${id}`;

const PollView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [poll, setPoll] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  // Completion state after a submit attempt:
  //   null       → still answering
  //   "recorded" → a fresh response was accepted by the backend
  //   "already"  → backend rejected it (409): this account/browser already
  //                responded, so nothing new was recorded
  const [completion, setCompletion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchPoll = async () => {
      try {
        const { data } = await apiClient.get(`/polls/${id}`);
        if (cancelled) return;
        setPoll(data.poll);
        setIsExpired(data.isExpired);

        // Re-hydrate answers preserved before a sign-in redirect.
        try {
          const saved = sessionStorage.getItem(draftStorageKey(id));
          if (saved) {
            setAnswers(JSON.parse(saved));
            sessionStorage.removeItem(draftStorageKey(id));
          }
        } catch {
          /* ignore malformed storage */
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Failed to load poll");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPoll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleOptionChange = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const goToLogin = () => {
    // Preserve in-progress answers across the login round-trip.
    try {
      sessionStorage.setItem(draftStorageKey(id), JSON.stringify(answers));
    } catch {
      /* storage may be unavailable; proceed anyway */
    }
    navigate(`/login?next=${encodeURIComponent(`/polls/${id}`)}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const formattedAnswers = Object.entries(answers).map(
      ([questionId, optionId]) => ({ questionId, optionId }),
    );
    const payload = { answers: formattedAnswers };
    // Anonymous polls: attach a stable per-browser participant token so the
    // backend can block repeat participation. Not sent for authenticated polls.
    if (poll.isAnonymous) payload.anonymousId = getAnonymousId();
    try {
      await apiClient.post(`/polls/${id}/responses`, payload);
      toast.success("Response recorded!");
      if (poll.isPublished) {
        navigate(`/polls/${id}/results`);
      } else {
        setCompletion("recorded");
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Backend authoritatively rejected this as a duplicate — this
        // account/browser already responded. Surface a distinct
        // already-participated state, NOT the fresh-success screen.
        toast("You've already responded to this poll.");
        setCompletion("already");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to submit response",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="skeleton-card" style={{ marginBottom: "1.25rem" }}>
          <div className="skeleton-line" style={{ height: 28, width: "60%" }} />
          <div
            className="skeleton-line short"
            style={{ height: 12, width: "45%", marginTop: 8 }}
          />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ marginBottom: "1rem" }}>
            <div className="skeleton-line short" style={{ height: 14, width: "20%" }} />
            <div
              className="skeleton-line"
              style={{ height: 14, width: "70%", marginTop: 10 }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="status-page">
        <div className="status-page__display-serif">Not found.</div>
        <p className="status-page__text">
          This poll might have been deleted or the link is invalid.
        </p>
        <button onClick={() => navigate("/")} className="btn-secondary text-sm">
          Return Home
        </button>
      </div>
    );
  }

  const isDraft = poll.status === "draft";
  const requiresAuth = !isExpired && !poll.isAnonymous && !user;
  const isInteractive = !isExpired && !requiresAuth && !isDraft;

  const requiredQuestions = poll.questions.filter((q) => !q.isOptional);
  const requiredAnswered = requiredQuestions.filter((q) => answers[q._id]).length;
  const allRequiredAnswered = requiredAnswered === requiredQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const progress =
    poll.questions.length > 0
      ? (answeredCount / poll.questions.length) * 100
      : 0;

  if (completion === "recorded") {
    return (
      <div className="max-w-lg mx-auto py-24 animate-fade-in flex flex-col items-center text-center">
        <div className="success-badge">
          <CheckCircle2 size={22} style={{ color: "var(--accent)" }} />
        </div>
        <h2 className="display-sm mb-3">Response recorded</h2>
        <p
          style={{
            color: "var(--ink-3)",
            fontSize: "0.9375rem",
            maxWidth: "28ch",
            lineHeight: 1.6,
          }}
        >
          Thanks for participating. The creator will review these shortly.
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn-secondary mt-8 text-sm px-6"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (completion === "already") {
    return (
      <div className="max-w-lg mx-auto py-24 animate-fade-in flex flex-col items-center text-center">
        <div className="success-badge">
          <Info size={22} style={{ color: "var(--ink-3)" }} />
        </div>
        <h2 className="display-sm mb-3">You’ve already participated</h2>
        <p
          style={{
            color: "var(--ink-3)",
            fontSize: "0.9375rem",
            maxWidth: "34ch",
            lineHeight: 1.6,
          }}
        >
          We already have a response from{" "}
          {poll.isAnonymous ? "this browser" : "your account"} for this poll, so
          nothing new was recorded. You can respond only once.
        </p>
        <div className="flex gap-3 mt-8">
          {poll.isPublished && (
            <button
              onClick={() => navigate(`/polls/${id}/results`)}
              className="btn-primary text-sm px-6"
            >
              View Results
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="btn-secondary text-sm px-6"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-10 pb-16 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="poll-view__title">{poll.title}</h1>
        {poll.description && <p className="poll-view__desc">{poll.description}</p>}
      </div>

      <div className="poll-view__meta">
        <span className="mono-label">
          {poll.questions.length} question
          {poll.questions.length !== 1 ? "s" : ""}
        </span>
        <span style={{ color: "var(--hairline-strong)" }}>·</span>
        <span className="mono-label">
          {poll.isAnonymous ? "Anonymous" : "Authenticated"}
        </span>
        <span style={{ color: "var(--hairline-strong)" }}>·</span>
        <span className="mono-label">
          Closes{" "}
          {new Date(poll.expiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {poll.questions.length > 1 && isInteractive && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <span className="section-label">
              {answeredCount} of {poll.questions.length} answered
            </span>
            <span className="section-label">{Math.round(progress)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-track__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {isDraft && (
        <div
          className="polished-panel p-5 mb-8 flex gap-3"
          style={{ borderLeft: "3px solid var(--accent)" }}
        >
          <FileText className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
          <div>
            <h3 className="banner__title">Draft preview</h3>
            <p className="banner__text">
              This poll is a draft and isn’t collecting responses yet. Launch it
              from your dashboard to share it.
            </p>
          </div>
        </div>
      )}

      {isExpired && !poll.isPublished && (
        <div
          className="polished-panel p-5 mb-8 flex gap-3"
          style={{ borderLeft: "3px solid var(--ink-4)" }}
        >
          <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--ink-4)" }} />
          <div>
            <h3 className="banner__title">Poll Ended</h3>
            <p className="banner__text">
              This poll is no longer accepting responses.
            </p>
          </div>
        </div>
      )}

      {isExpired && poll.isPublished && (
        <div
          className="polished-panel p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ borderLeft: "3px solid var(--success)" }}
        >
          <div className="flex gap-3">
            <CheckCircle2
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: "var(--success)" }}
            />
            <div>
              <h3 className="banner__title">Poll Completed</h3>
              <p className="banner__text">Results have been published.</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/polls/${id}/results`)}
            className="btn-secondary text-sm"
          >
            View Results
          </button>
        </div>
      )}

      {requiresAuth && (
        <div
          className="polished-panel p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ borderLeft: "3px solid var(--accent)" }}
        >
          <div className="flex gap-3">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <div>
              <h3 className="banner__title">Authentication Required</h3>
              <p className="banner__text">
                Please sign in to participate in this poll. Your answers so far
                will be kept.
              </p>
            </div>
          </div>
          <button onClick={goToLogin} className="btn-primary text-sm">
            Sign In
          </button>
        </div>
      )}

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
            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.875rem",
                }}
              >
                <span className="poll-view__q-index">{i + 1}.</span>
                <div>
                  <h3 className="poll-view__q-text">{q.text}</h3>
                  <span
                    className={
                      q.isOptional
                        ? "poll-view__q-tag"
                        : "poll-view__q-tag poll-view__q-tag--required"
                    }
                  >
                    {q.isOptional ? "Optional" : "Required"}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}
            >
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
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        style={{ flexShrink: 0 }}
                      >
                        <path
                          d="M2.5 7L5.5 10L11.5 4"
                          stroke="var(--ink)"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {isInteractive && (
          <div className="poll-view__submit-row">
            <button
              type="submit"
              disabled={isSubmitting || !allRequiredAnswered}
              className="poll-view__submit"
              data-disabled={isSubmitting || !allRequiredAnswered}
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
            {!allRequiredAnswered && (
              <p className="section-label" style={{ color: "var(--ink-4)" }}>
                {requiredQuestions.length - requiredAnswered} required question
                {requiredQuestions.length - requiredAnswered !== 1 ? "s" : ""}{" "}
                remaining
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default PollView;
