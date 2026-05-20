import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { apiClient, getAccessToken, SERVER_ORIGIN } from "../lib/apiClient";

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
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [percentage, delay]);

  return (
    <div ref={ref} className="result-bar">
      {width > 0 && (
        <div
          className="result-bar__fill"
          style={{
            background: isWinner ? "var(--accent)" : "var(--ink-3)",
            width: `${width}%`,
          }}
        />
      )}
    </div>
  );
};

const PollResults = () => {
  const { id } = useParams();
  const { user, authReady } = useAuth();
  const [poll, setPoll] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [openVoterMenu, setOpenVoterMenu] = useState(null);
  const [socketState, setSocketState] = useState("connecting");
  const [flashId, setFlashId] = useState(null);
  const voterMenuRef = useRef(null);
  const isCreatorRef = useRef(false);
  const prevCountsRef = useRef(null);

  // Initial load. The async worker is defined inside the effect so its
  // post-await setState calls aren't flagged as synchronous effect updates.
  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      try {
        const { data } = await apiClient.get(`/polls/${id}/results`);
        if (cancelled) return;
        setPoll(data.poll);
        setAnalytics(data.analytics);
        setTotalResponses(data.totalResponses || 0);
        setErrorMsg("");
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 403 && user) {
          try {
            const { data } = await apiClient.get(`/polls/${id}/analytics`);
            if (cancelled) return;
            setPoll(data.poll);
            setAnalytics(data.analytics);
            setTotalResponses(data.totalResponses || 0);
            setErrorMsg("");
          } catch (analyticsErr) {
            if (!cancelled) {
              setErrorMsg(
                analyticsErr.response?.data?.message ||
                  "Failed to load analytics",
              );
            }
          }
        } else if (err.response?.status === 403) {
          setErrorMsg(
            err.response?.data?.message || "Results are not published yet.",
          );
        } else {
          setErrorMsg(err.response?.data?.message || "Failed to load results");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadResults();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  // Keep an up-to-date creator flag for the socket handlers (which close over
  // stale state otherwise).
  useEffect(() => {
    isCreatorRef.current = Boolean(
      user && poll && String(poll.creator) === String(user._id),
    );
  }, [user, poll]);

  // Live updates — consume the socket payload directly (no refetch).
  // Wait for authReady so a signed-in creator's access token is in memory
  // before the handshake (otherwise the socket connects anonymous and never
  // joins the creator room).
  useEffect(() => {
    if (!authReady) return undefined;

    const socket = io(SERVER_ORIGIN, {
      auth: { token: getAccessToken() },
    });

    // setState calls run inside socket callbacks (not synchronously in the
    // effect body) — the canonical pattern for syncing with an external source.
    socket.on("connect", () => {
      setSocketState("connected");
      // (Re)join on initial connect AND after every reconnect — Socket.IO does
      // not replay room joins on reconnect.
      socket.emit("join_poll", id);
    });
    socket.on("disconnect", () => setSocketState("disconnected"));
    socket.on("connect_error", () => setSocketState("disconnected"));
    socket.io.on("reconnect_attempt", () => {
      setSocketState("connecting");
      // Re-auth with the current (possibly rotated) access token.
      socket.auth = { token: getAccessToken() };
    });

    socket.on("poll_updated", (payload) => {
      // The creator gets the richer `poll_updated_creator` event instead.
      if (isCreatorRef.current) return;
      if (payload?.analytics) setAnalytics(payload.analytics);
      if (typeof payload?.totalResponses === "number") {
        setTotalResponses(payload.totalResponses);
      }
    });

    socket.on("poll_updated_creator", (payload) => {
      if (payload?.pollId !== id) return;
      if (payload?.analytics) setAnalytics(payload.analytics);
      if (typeof payload?.totalResponses === "number") {
        setTotalResponses(payload.totalResponses);
      }
    });

    return () => {
      socket.emit("leave_poll", id);
      socket.disconnect();
    };
  }, [id, authReady]);

  // When an option's count increases vs the previous render, briefly flash a
  // "+1" chip next to its bar. The first render seeds `prevCountsRef` so
  // existing votes don't trigger a flash.
  useEffect(() => {
    const currentCounts = new Map();
    Object.values(analytics).forEach((q) =>
      q.options.forEach((o) => currentCounts.set(o.id, o.count)),
    );

    if (!prevCountsRef.current) {
      prevCountsRef.current = currentCounts;
      return undefined;
    }

    let increased = null;
    let delta = 0;
    for (const [optId, count] of currentCounts) {
      const prev = prevCountsRef.current.get(optId);
      if (prev !== undefined && count > prev) {
        increased = optId;
        delta = count - prev;
        break;
      }
    }
    prevCountsRef.current = currentCounts;
    if (!increased) return undefined;

    // Intentional animation trigger — fires once when new vote(s) arrive.
    setFlashId({ id: increased, t: Date.now(), delta });
    const timer = setTimeout(() => setFlashId(null), 1500);
    return () => clearTimeout(timer);
  }, [analytics]);

  useEffect(() => {
    if (!openVoterMenu) return undefined;

    const handlePointerDown = (event) => {
      if (voterMenuRef.current && !voterMenuRef.current.contains(event.target)) {
        setOpenVoterMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpenVoterMenu(null);
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
      const { data } = await apiClient.put(`/polls/${id}/publish`);
      toast.success("Results published!");
      setPoll(data.poll);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish poll");
    } finally {
      setIsPublishing(false);
    }
  };

  const renderVoterAvatar = (voter, size = 28) =>
    voter.avatar ? (
      <img
        src={voter.avatar}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    ) : (
      <div
        className="voter-avatar-fallback"
        style={{
          width: size,
          height: size,
          fontSize: `${Math.max(10, Math.round(size * 0.35))}px`,
        }}
      >
        {voter.name ? voter.name.charAt(0).toUpperCase() : "?"}
      </div>
    );

  const renderVoterName = (voter) =>
    voter.name || (voter.email ? voter.email.split("@")[0] : "Unknown");

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="skeleton-card" style={{ marginBottom: "1rem" }}>
          <div className="skeleton-line" style={{ height: 20, width: "55%" }} />
          <div
            className="skeleton-line short"
            style={{ height: 12, width: "40%", marginTop: 8 }}
          />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ marginBottom: "1rem" }}>
            <div className="skeleton-line short" style={{ height: 12, width: "18%" }} />
            <div
              className="skeleton-line"
              style={{ height: 14, width: "70%", marginTop: 8 }}
            />
            <div style={{ height: 8, marginTop: 12 }} className="skeleton-line" />
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
          {errorMsg || "This poll might have been deleted or the link is invalid."}
        </p>
        <Link to="/" className="btn-secondary inline-flex text-sm">
          <ArrowLeft size={15} className="mr-2" /> Return Home
        </Link>
      </div>
    );
  }

  const isCreator = user && String(poll.creator) === String(user._id);
  const isExpired = new Date(poll.expiresAt) < new Date();

  return (
    <div className="max-w-2xl mx-auto py-12 animate-fade-in">
      <Link to="/dashboard" className="results-back">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="analytics-panel-header mb-8">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginBottom: "1.25rem",
          }}
        >
          <span
            className={`status-dot status-dot--${
              socketState === "connected"
                ? "active"
                : socketState === "connecting"
                  ? "connecting"
                  : "disconnected"
            }`}
            title={
              socketState === "connected"
                ? "Live — updates arrive in real time"
                : socketState === "connecting"
                  ? "Reconnecting…"
                  : "Offline — updates paused"
            }
          />
          <span className="mono-label">
            {socketState === "connected"
              ? "Live"
              : socketState === "connecting"
                ? "Reconnecting…"
                : "Offline"}
          </span>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "baseline",
              gap: "0.375rem",
            }}
          >
            <span className="results-count">{totalResponses}</span>
            <span className="mono-label">responses</span>
          </div>
        </div>

        <h1 className="results-title">{poll.title}</h1>

        {poll.description && <p className="results-desc">{poll.description}</p>}

        {isCreator && !poll.isPublished && (
          <>
            <div className="results-hr" />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
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
                title={
                  !isExpired
                    ? "Poll must be expired to publish"
                    : "Make results public"
                }
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
            <div className="results-hr" />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--success)",
                  display: "inline-block",
                }}
              />
              <span className="mono-label" style={{ color: "var(--success)" }}>
                Results published
              </span>
            </div>
          </>
        )}
      </div>

      <div className="space-y-6 animate-slide-up">
        {poll.questions.map((q, i) => {
          const qAnalytics = analytics[q._id] || { options: [] };
          const totalVotes = qAnalytics.options.reduce(
            (sum, opt) => sum + opt.count,
            0,
          );

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
              <div className="result-q-head">
                <h3 className="result-q-title">
                  <span className="section-label result-q-num">{i + 1}.</span>
                  {q.text}
                </h3>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <span className="result-q-count">{totalVotes}</span>
                  <span className="section-label">votes</span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.125rem",
                }}
              >
                {q.options.map((opt, optIdx) => {
                  const analyticsOpt = qAnalytics.options.find(
                    (o) => o.id === opt._id,
                  );
                  const votes = analyticsOpt ? analyticsOpt.count : 0;
                  const percentage =
                    totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isWinner = totalVotes > 0 && opt._id === winningOptionId;

                  return (
                    <div key={opt._id} style={{ position: "relative" }}>
                      <div className="result-opt-head">
                        <span
                          className="result-opt-label"
                          style={{
                            fontWeight: isWinner ? 600 : 500,
                            color: isWinner ? "var(--ink)" : "var(--ink-2)",
                          }}
                        >
                          {opt.text}
                          {isWinner && (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 14 14"
                              fill="none"
                            >
                              <path
                                d="M2.5 7L5.5 10L11.5 4"
                                stroke="var(--accent)"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <div className="result-opt-stats">
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
                      <AnimatedBar
                        percentage={percentage}
                        isWinner={isWinner}
                        delay={optIdx * 80}
                      />
                      {flashId?.id === opt._id && (
                        <span
                          key={flashId.t}
                          className="vote-flash"
                          aria-hidden="true"
                        >
                          +{flashId.delta}
                        </span>
                      )}
                      {analyticsOpt &&
                        analyticsOpt.voters &&
                        analyticsOpt.voters.length > 0 &&
                        (analyticsOpt.voters.length > 2 ? (
                          <div
                            ref={voterMenuRef}
                            style={{ marginTop: "0.5rem", position: "relative" }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenVoterMenu(
                                  openVoterMenu === opt._id ? null : opt._id,
                                )
                              }
                              className="voter-pill"
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  paddingLeft: "0.15rem",
                                }}
                              >
                                {analyticsOpt.voters.slice(0, 3).map((voter, vi) => (
                                  <div
                                    key={vi}
                                    className="voter-pill__avatar"
                                    style={{ marginLeft: vi === 0 ? 0 : "-0.4rem" }}
                                  >
                                    {renderVoterAvatar(voter, 22)}
                                  </div>
                                ))}
                              </div>
                              <span className="voter-pill__more">
                                +{analyticsOpt.voters.length - 3} more
                              </span>
                            </button>

                            {openVoterMenu === opt._id && (
                              <div className="voter-menu">
                                <div className="voter-menu__head">
                                  <span className="section-label">All voters</span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenVoterMenu(null)}
                                    className="voter-menu__close"
                                  >
                                    Close
                                  </button>
                                </div>
                                <div className="voter-menu__list">
                                  {analyticsOpt.voters.map((voter, vi) => (
                                    <div key={vi} className="voter-menu__row">
                                      {renderVoterAvatar(voter, 28)}
                                      <div style={{ minWidth: 0 }}>
                                        <div className="voter-menu__name">
                                          {renderVoterName(voter)}
                                        </div>
                                        {voter.email && (
                                          <div className="voter-menu__email">
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
                          <div className="voter-chips">
                            {analyticsOpt.voters.map((v, vIdx) => (
                              <div key={vIdx} className="voter-chip">
                                {v.avatar ? (
                                  <img
                                    src={v.avatar}
                                    alt=""
                                    style={{
                                      width: 14,
                                      height: 14,
                                      borderRadius: "50%",
                                    }}
                                  />
                                ) : (
                                  <div className="voter-chip__fallback">
                                    {v.name ? v.name.charAt(0).toUpperCase() : "?"}
                                  </div>
                                )}
                                <span>{renderVoterName(v)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>

              {totalVotes === 0 && (
                <p className="result-empty">No responses yet</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollResults;
