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
      <div className="text-center py-20 font-medium text-zinc-500">
        Poll not found.
      </div>
    );

  const requiresAuth = !isExpired && !poll.isAnonymous && !user;
  const isInteractive = !isExpired && !requiresAuth;

  if (hasSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-slide-up flex flex-col items-center text-center mt-12">
        <div style={{
          width:'48px', height:'48px', borderRadius:'50%',
          background:'var(--subtle)', border:'1px solid var(--hairline)',
          display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:'1.5rem', color:'var(--ink)'
        }}>
          <CheckCircle2 size={20} />
        </div>
        <h2 className="display-sm mb-2">Response recorded</h2>
        <p style={{color:'var(--ink-3)', fontSize:'0.9375rem'}}>
          Thanks for participating. The creator will review these shortly.
        </p>
        <button onClick={() => navigate("/")} className="btn-secondary mt-8">Return Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-10 pb-12 animate-fade-in">
      {/* Poll header */}
      <div className="mb-10 text-center">
        <h1 className="display-sm mb-4">{poll.title}</h1>
        {poll.description && (
          <p className="text-base text-(--ink-2) leading-relaxed max-w-lg mx-auto">
            {poll.description}
          </p>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-center gap-5 mb-12">
        <span className="mono-label">{poll.questions.length} question{poll.questions.length !== 1 ? 's' : ''}</span>
        <span style={{color:'var(--hairline-strong)'}}>·</span>
        <span className="mono-label">{poll.isAnonymous ? 'Anonymous' : 'Authenticated'}</span>
        <span style={{color:'var(--hairline-strong)'}}>·</span>
        <span className="mono-label">Closes {new Date(poll.expiresAt).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>
      </div>

      {/* Progress bar (multi-question polls) */}
      {poll.questions.length > 1 && (
        <div style={{height:'2px', background:'var(--subtle)', marginBottom:'2.5rem', borderRadius:'99px'}}>
          <div style={{
            height:'100%',
            borderRadius:'99px',
            background:'var(--accent)',
            width:`${(Object.keys(answers).length / poll.questions.length) * 100}%`,
            transition:'width 0.4s ease'
          }} />
        </div>
      )}

      {/* Status banners */}
      {isExpired && !poll.isPublished && (
        <div className="polished-panel p-5 mb-8 flex gap-3">
          <Clock className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-(--ink)">Poll Ended</h3>
            <p className="text-sm text-(--ink-2) mt-1">
              This poll is no longer accepting responses.
            </p>
          </div>
        </div>
      )}

      {isExpired && poll.isPublished && (
        <div className="polished-panel p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-(--ink)">Poll Completed</h3>
              <p className="text-sm text-(--ink-2) mt-1">Results have been published.</p>
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
        <div className="polished-panel p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-(--ink)">Authentication Required</h3>
              <p className="text-sm text-(--ink-2) mt-1">Please sign in to participate.</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="btn-primary text-sm"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Questions */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {poll.questions.map((q, i) => (
          <div
            key={q._id}
            className={`polished-panel p-6 sm:p-8 ${!isInteractive ? "opacity-60 grayscale" : ""}`}
          >
            {/* Question header */}
            <div className="mb-6">
              <span className="block mb-2" style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '2.5rem',
                lineHeight: 1,
                color: 'var(--ink-3)'
              }}>
                {i + 1}.
              </span>
              <h3 className="font-medium text-base leading-snug" style={{color:'var(--ink)'}}>
                {q.text}
                {!q.isOptional && (
                  <span style={{
                    fontFamily:'var(--font-mono)',
                    fontSize:'9px',
                    letterSpacing:'0.08em',
                    textTransform:'uppercase',
                    color:'var(--danger)',
                    opacity:0.7,
                    marginLeft:'8px',
                    verticalAlign:'middle'
                  }}>
                    req
                  </span>
                )}
              </h3>
            </div>

            {/* Options — FIX: gap-3 between dot and label */}
            <div className="space-y-3">
              {q.options.map((opt) => {
                const isSelected = answers[q._id] === opt._id;
                return (
                  <label
                    key={opt._id}
                    className={`poll-option flex items-center justify-between ${isSelected ? "poll-option--selected" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={q._id}
                        value={opt._id}
                        required={!q.isOptional}
                        disabled={!isInteractive}
                        checked={isSelected}
                        onChange={() => handleOptionChange(q._id, opt._id)}
                        className="sr-only peer"
                      />
                      <div className="poll-option__dot shrink-0"></div>
                      <span className={`text-sm font-medium ${isSelected ? "text-(--ink)" : "text-(--ink-2)"}`}>
                        {opt.text}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {isInteractive && (
          <div className="flex justify-center mt-10 mb-6">
            <button type="submit" className="btn-primary px-12 py-3 text-base">
              Submit Answers →
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PollView;