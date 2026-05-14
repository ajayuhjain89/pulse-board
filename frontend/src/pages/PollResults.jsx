import axios from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL;

/* Animated bar that grows when it enters the viewport */
const AnimatedBar = ({ percentage, isWinner, delay = 0 }) => {
  const [width, setWidth] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        setTimeout(() => setWidth(percentage), delay);
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [percentage, delay]);

  return (
    <div
      ref={ref}
      style={{
        height: "5px",
        background: "var(--subtle)",
        borderRadius: "99px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {width > 0 && (
        <div
          style={{
            height: "100%",
            borderRadius: "99px",
            background: isWinner ? "var(--accent)" : "var(--ink-3)",
            width: `${width}%`,
            transition: "width 0.75s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        />
      )}
    </div>
  );
};

const PollResults = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [poll, setPoll] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [openVoterMenu, setOpenVoterMenu] = useState(null);
  const voterMenuRef = useRef(null);

  const fetchResults = useCallback(async () => {
    try {
      const { data } = await axios.get(`/polls/${id}/results`);
      setPoll(data.poll);
      setAnalytics(data.analytics);
      setTotalResponses(data.totalResponses || 0);
      setErrorMsg("");
    } catch (err) {
      if (err.response?.status === 403) {
        if (user) {
          try {
            const { data } = await axios.get(`/polls/${id}/analytics`);
            setPoll(data.poll);
            setAnalytics(data.analytics);
            setTotalResponses(data.totalResponses || 0);
            setErrorMsg("");
            return;
          } catch (analyticsErr) {
            setErrorMsg(analyticsErr.response?.data?.message || "Failed to load analytics");
          }
        } else {
          setErrorMsg(err.response?.data?.message || "Results are not published yet.");
        }
      } else {
        setErrorMsg("Failed to load results");
      }
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    (async () => { await fetchResults(); })();
    const socket = io(SOCKET_SERVER_URL);
    socket.emit("join_poll", id);
    socket.on("poll_updated", () => { fetchResults(); });
    return () => { socket.disconnect(); };
  }, [id, fetchResults]);

  useEffect(() => {
    if (!openVoterMenu) return undefined;

    const handlePointerDown = (event) => {
      if (voterMenuRef.current && !voterMenuRef.current.contains(event.target)) {
        setOpenVoterMenu(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenVoterMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openVoterMenu]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const { data } = await axios.put(`/polls/${id}/publish`);
      toast.success("Results published!");
      setPoll(data.poll);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish poll");
    } finally {
      setIsPublishing(false);
    }
  };

  const renderVoterAvatar = (voter, size = 28) => (
    voter.avatar ? (
      <img
        src={voter.avatar}
        alt="Avatar"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--hairline-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${Math.max(10, Math.round(size * 0.35))}px`,
          fontWeight: 700,
          color: "var(--ink)",
          flexShrink: 0,
        }}
      >
        {voter.name ? voter.name.charAt(0).toUpperCase() : "?"}
      </div>
    )
  );

  const renderVoterName = (voter) => voter.name || (voter.email ? voter.email.split("@")[0] : "Unknown");

  if (loading)
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="skeleton-card" style={{ marginBottom: '1rem' }}>
          <div className="skeleton-line" style={{ height: 20, width: '55%' }} />
          <div className="skeleton-line short" style={{ height: 12, width: '40%', marginTop: 8 }} />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ marginBottom: '1rem' }}>
            <div className="skeleton-line short" style={{ height: 12, width: '18%' }} />
            <div className="skeleton-line" style={{ height: 14, width: '70%', marginTop: 8 }} />
            <div style={{ height: 8, marginTop: 12 }} className="skeleton-line" />
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
        <p style={{ fontSize: "0.9375rem", color: "var(--ink-3)", marginBottom: "1.5rem" }}>
          {errorMsg || "This poll might have been deleted or the link is invalid."}
        </p>
        <Link to="/" className="btn-secondary inline-flex text-sm">
          <ArrowLeft size={15} className="mr-2" /> Return Home
        </Link>
      </div>
    );

  const isCreator = user && String(poll.creator) === String(user._id);
  const isExpired = new Date(poll.expiresAt) < new Date();

  return (
    <div className="max-w-2xl mx-auto py-12 animate-fade-in">
      {/* BACK LINK */}
      <Link
        to="/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--ink-3)",
          transition: "color 0.12s",
          marginBottom: "2.5rem",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-3)")}
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {/* ANALYTICS HEADER PANEL */}
      <div className="analytics-panel-header mb-8">
        {/* Live badge + response count */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
          <span className="status-dot status-dot--active" />
          <span className="mono-label">Live Insights</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: "0.375rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "1.125rem",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              {totalResponses}
            </span>
            <span className="mono-label">responses</span>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1.75rem, 5vw, 3rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
            marginBottom: "0.625rem",
          }}
        >
          {poll.title}
        </h1>

        {poll.description && (
          <p style={{ fontSize: "0.9rem", color: "var(--ink-2)", lineHeight: 1.6, marginBottom: "0" }}>
            {poll.description}
          </p>
        )}

        {/* PUBLISH BUTTON */}
        {isCreator && !poll.isPublished && (
          <>
            <div style={{ height: "1px", background: "var(--hairline)", margin: "1.5rem 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <button
                onClick={handlePublish}
                disabled={!isExpired || isPublishing}
                className="btn-accent"
                style={{
                  opacity: !isExpired || isPublishing ? 0.55 : 1,
                  cursor: !isExpired || isPublishing ? "not-allowed" : "pointer",
                  pointerEvents: !isExpired || isPublishing ? "none" : "auto",
                  padding: "0.5625rem 1.25rem",
                }}
                title={!isExpired ? "Poll must be expired to publish" : "Make results public"}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Publishing…
                  </>
                ) : (
                  "Publish Results"
                )}
              </button>
              {!isExpired && (
                <p style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>
                  Available after poll expires
                </p>
              )}
              {isExpired && !isPublishing && (
                <p style={{ fontSize: "0.8125rem", color: "var(--ink-3)" }}>
                  Ready to publish — share with respondents
                </p>
              )}
            </div>
          </>
        )}

        {poll.isPublished && (
          <>
            <div style={{ height: "1px", background: "var(--hairline)", margin: "1.5rem 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
              <span className="mono-label" style={{ color: "var(--success)" }}>Results published</span>
            </div>
          </>
        )}
      </div>

      {/* QUESTION CARDS */}
      <div className="space-y-6 animate-slide-up">
        {poll.questions.map((q, i) => {
          const qAnalytics = analytics[q._id] || { options: [] };
          const totalVotes = qAnalytics.options.reduce((sum, opt) => sum + opt.count, 0);

          let maxVotes = 0;
          let winningOptionId = null;
          qAnalytics.options.forEach((opt) => {
            if (opt.count > maxVotes) {
              maxVotes = opt.count;
              winningOptionId = opt.id;
            }
          });

          return (
            <div key={q._id} className="polished-panel" style={{ padding: "1.75rem 2rem" }}>
              {/* Question header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--hairline)", marginBottom: "1.5rem" }}>
                <h3
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "var(--ink)",
                    lineHeight: 1.4,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.625rem",
                    margin: 0,
                  }}
                >
                  <span className="section-label" style={{ flexShrink: 0, marginTop: "2px" }}>{i + 1}.</span>
                  {q.text}
                </h3>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "1.125rem",
                      fontWeight: 500,
                      color: "var(--ink)",
                      display: "block",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {totalVotes}
                  </span>
                  <span className="section-label">votes</span>
                </div>
              </div>

              {/* OPTIONS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
                {q.options.map((opt, optIdx) => {
                  const analyticsOpt = qAnalytics.options.find((o) => o.id === opt._id);
                  const votes = analyticsOpt ? analyticsOpt.count : 0;
                  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isWinner = totalVotes > 0 && opt._id === winningOptionId;

                  return (
                    <div key={opt._id} style={{ position: "relative" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: isWinner ? 600 : 500,
                            color: isWinner ? "var(--ink)" : "var(--ink-2)",
                            letterSpacing: "-0.01em",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {opt.text}
                          {isWinner && (
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.375rem", flexShrink: 0, marginLeft: "1rem" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: votes > 0 ? "var(--ink)" : "var(--ink-4)",
                            }}
                          >
                            {percentage}%
                          </span>
                          <span className="mono-label" style={{ color: "var(--ink-4)" }}>
                            · {votes}v
                          </span>
                        </div>
                      </div>
                      <AnimatedBar percentage={percentage} isWinner={isWinner} delay={optIdx * 80} />
                      {/* Votors List for Non-Anonymous Polls */}
                      {analyticsOpt && analyticsOpt.voters && analyticsOpt.voters.length > 0 && (
                        analyticsOpt.voters.length > 2 ? (
                          <div
                            ref={voterMenuRef}
                            style={{ marginTop: "0.5rem", position: "relative" }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenVoterMenu(openVoterMenu === opt._id ? null : opt._id);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.55rem",
                                padding: "0.4rem 0.6rem 0.4rem 0.45rem",
                                borderRadius: "999px",
                                border: "1px solid var(--hairline)",
                                background: "var(--subtle)",
                                color: "var(--ink-2)",
                                cursor: "pointer",
                                boxShadow: "0 10px 24px -18px rgba(0,0,0,0.35)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", paddingLeft: "0.15rem" }}>
                                {analyticsOpt.voters.slice(0, 3).map((voter, voterIndex) => (
                                  <div
                                    key={voterIndex}
                                    style={{
                                      marginLeft: voterIndex === 0 ? 0 : "-0.4rem",
                                      border: "1px solid var(--paper)",
                                      borderRadius: "50%",
                                      boxShadow: "0 6px 16px -10px rgba(0,0,0,0.45)",
                                    }}
                                  >
                                    {renderVoterAvatar(voter, 22)}
                                  </div>
                                ))}
                              </div>
                              <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.01em" }}>
                                +{analyticsOpt.voters.length - 3} more
                              </span>
                            </button>

                            {openVoterMenu === opt._id && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 0.6rem)",
                                  left: 0,
                                  zIndex: 30,
                                  minWidth: "280px",
                                  maxWidth: "360px",
                                  background: "var(--paper)",
                                  border: "1px solid var(--hairline)",
                                  borderRadius: "14px",
                                  boxShadow: "0 28px 60px -28px rgba(0,0,0,0.38)",
                                  padding: "0.75rem",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                                  <span className="section-label">All voters</span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenVoterMenu(null)}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: "var(--ink-3)",
                                      cursor: "pointer",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    Close
                                  </button>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "260px", overflowY: "auto", paddingRight: "0.15rem" }}>
                                  {analyticsOpt.voters.map((voter, voterIndex) => (
                                    <div
                                      key={voterIndex}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.65rem",
                                        padding: "0.45rem 0.5rem",
                                        borderRadius: "10px",
                                        background: "var(--subtle)",
                                        border: "1px solid var(--hairline)",
                                      }}
                                    >
                                      {renderVoterAvatar(voter, 28)}
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
                                          {renderVoterName(voter)}
                                        </div>
                                        {voter.email && (
                                          <div style={{ fontSize: "0.6875rem", color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
                                            {voter.email}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                            {analyticsOpt.voters.map((v, vIdx) => (
                              <div key={vIdx} style={{
                                display: "inline-flex",
                                alignItems: "center",
                                background: "var(--subtle)",
                                border: "1px solid var(--hairline)",
                                borderRadius: "4px",
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.6875rem",
                                color: "var(--ink-2)",
                                gap: "4px"
                              }}>
                                {v.avatar ? (
                                  <img src={v.avatar} alt="Avatar" style={{ width: 14, height: 14, borderRadius: "50%" }} />
                                ) : (
                                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--hairline-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>
                                    {v.name ? v.name.charAt(0).toUpperCase() : "?"}
                                  </div>
                                )}
                                <span>{v.name || v.email.split('@')[0]}</span>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Zero state */}
              {totalVotes === 0 && (
                <p style={{ textAlign: "center", color: "var(--ink-4)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", marginTop: "1rem" }}>
                  No responses yet
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollResults;