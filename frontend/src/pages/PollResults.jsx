import axios from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL;

const PollResults = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [poll, setPoll] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

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
            setErrorMsg(
              analyticsErr.response?.data?.message || "Failed to load analytics",
            );
          }
        } else {
          setErrorMsg(
            err.response?.data?.message || "Results are not published yet.",
          );
        }
      } else {
        setErrorMsg("Failed to load results");
      }
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    // FIX: wrap in async IIFE so the initial fetch is not a synchronous
    // setState call in the effect body — avoids cascading render warning
    (async () => {
      await fetchResults();
    })();

    const socket = io(SOCKET_SERVER_URL);
    socket.emit("join_poll", id);

    // Socket callback is fine — setState inside an async callback is allowed
    socket.on("poll_updated", () => {
      fetchResults();
    });

    return () => {
      socket.disconnect();
    };
  }, [id, fetchResults]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const { data } = await axios.put(`/polls/${id}/publish`);
      toast.success("Poll published!");
      setPoll(data.poll);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish poll");
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-zinc-400 w-8 h-8" />
      </div>
    );

  if (!poll)
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-(--ink) mb-2">
          Results not found
        </h2>
        <p className="text-sm text-(--ink-2) mb-6">
          {errorMsg || "This poll might have been deleted or the link is invalid."}
        </p>
        <Link to="/" className="btn-secondary inline-flex text-sm">
          <ArrowLeft size={16} className="mr-2" /> Return Home
        </Link>
      </div>
    );

  const isCreator = user && String(poll.creator) === String(user._id);
  const isExpired = new Date(poll.expiresAt) < new Date();

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-10"
      >
        <ArrowLeft size={16} className="mr-1.5" /> Back to Dashboard
      </Link>

      <div className="mb-12 analytics-panel-header">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="status-dot status-dot--active"></span>
            <span className="mono-label">Live Insights</span>
            <span className="mono-label" style={{marginLeft:'auto'}}>
              <span className="mono-stat" style={{fontSize:'0.875rem'}}>{totalResponses}</span>
              {' '}<span style={{opacity:0.5}}>responses</span>
            </span>
          </div>
          <h1 className="display-sm">{poll.title}</h1>
        </div>

        {poll.description && (
          <p className="text-sm text-(--ink-2) mt-3">
            {poll.description}
          </p>
        )}

        {isCreator && !poll.isPublished && (
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handlePublish}
              disabled={!isExpired || isPublishing}
              style={{
                display:'inline-flex',
                alignItems:'center',
                gap:'0.375rem',
                background:'var(--accent)',
                color:'#ffffff',
                border:'1px solid var(--accent)',
                borderRadius:'6px',
                padding:'0.5rem 1.125rem',
                fontFamily:'var(--font-body)',
                fontSize:'0.8125rem',
                fontWeight:500,
                cursor: !isExpired || isPublishing ? 'not-allowed' : 'pointer',
                transition:'opacity 0.15s',
                whiteSpace:'nowrap',
                opacity: !isExpired || isPublishing ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (isExpired && !isPublishing) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { if (isExpired && !isPublishing) e.currentTarget.style.opacity = '1'; }}
              title={!isExpired ? "Poll must be expired to publish" : "Make results public"}
            >
              {isPublishing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Results"
              )}
            </button>
            {!isExpired && (
              <p style={{fontSize:'0.75rem', color:'var(--ink-3)'}}>
                Available after poll expires
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-8 animate-slide-up">
        {poll.questions.map((q, i) => {
          const qAnalytics = analytics[q._id] || { options: [] };
          const totalVotes = qAnalytics.options.reduce(
            (sum, opt) => sum + opt.count, 0,
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
            <div key={q._id} className="polished-panel p-6 sm:p-8">
              <div className="mb-6 pb-6">
                <h3 className="text-base font-semibold leading-snug flex items-baseline gap-2 mb-0">
                  <span className="mono-label shrink-0">{i + 1}.</span>
                  <span>{q.text}</span>
                  <span className="mono-label shrink-0" style={{marginLeft:'0.5rem', whiteSpace:'nowrap'}}>
                    — <span style={{color:'var(--ink)'}}>{totalVotes}</span> votes
                  </span>
                </h3>
              </div>

              <div style={{
                height:'1px',
                background:'var(--hairline-strong)',
                margin:'-1.5rem 0 1.5rem 0',
              }} />

              <div className="space-y-5 pt-2">
                {q.options.map((opt) => {
                  const analyticsOpt = qAnalytics.options.find(
                    (o) => o.id === opt._id,
                  );
                  const votes = analyticsOpt ? analyticsOpt.count : 0;
                  const percentage =
                    totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isWinner = totalVotes > 0 && opt._id === winningOptionId;

                  return (
                    <div key={opt._id}>
                      {/* label row: name left, stat right */}
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`flex items-center text-sm ${isWinner ? "text-(--ink) font-semibold" : "text-(--ink-2) font-medium"}`}
                          style={{letterSpacing:'-0.01em'}}
                        >
                          {opt.text}
                          {isWinner && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{display:'inline', marginLeft:'6px', verticalAlign:'middle'}}>
                              <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span className="flex items-baseline gap-1 shrink-0 ml-3">
                          <span className="text-xs font-semibold" style={{color: votes > 0 ? 'var(--ink)' : 'var(--ink-4)'}}>{percentage}%</span>
                          <span className="mono-label" style={{color:'var(--ink-4)'}}>· {votes} vote{votes !== 1 ? 's' : ''}</span>
                        </span>
                      </div>
                      {/* bar always rendered */}
                      <div className="progress-bar">
                        {votes > 0 && (
                          <div
                            className={`progress-bar__fill animate-slide-right ${isWinner ? "progress-bar__fill--winner" : ""}`}
                            style={{width:`${percentage}%`}}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollResults;