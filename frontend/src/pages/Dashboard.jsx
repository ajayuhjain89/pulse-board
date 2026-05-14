import axios from "axios";
import { AlertCircle, BarChart2, Link as LinkIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pollToDelete, setPollToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const { data } = await axios.get("/polls");
        setPolls(data);
      } catch {
        toast.error("Failed to load your polls");
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, []);

  useEffect(() => {
    if (pollToDelete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [pollToDelete]);

  const copyLink = (pollId) => {
    navigator.clipboard.writeText(`${window.location.origin}/polls/${pollId}`);
    toast.success("Link copied to clipboard");
  };

  const deletePoll = async () => {
    if (!pollToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/polls/${pollToDelete}`);
      setPolls(polls.filter((poll) => poll._id !== pollToDelete));
      toast.success("Poll deleted successfully");
      setPollToDelete(null);
    } catch {
      toast.error("Failed to delete poll");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pt-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-(--hairline)">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Polls</h1>
          <p className="text-(--ink-2) text-sm mt-1">
            Manage and view insights for your polls.
          </p>
        </div>
        <Link to="/polls/create" className="btn-primary w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Create Poll
        </Link>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-(--ink-3) w-8 h-8" />
        </div>
      ) : polls.length === 0 ? (
        <div className="empty-state">
          <div style={{
            fontFamily:'var(--font-display)',
            fontStyle:'italic',
            fontSize:'3rem',
            lineHeight:1,
            color:'var(--ink-4)',
            marginBottom:'1rem'
          }}>
            No polls yet.
          </div>
          <p className="text-sm mb-6" style={{color:'var(--ink-3)', maxWidth:'28ch', textAlign:'center'}}>
            Create your first poll and start collecting responses in minutes.
          </p>
          <Link to="/polls/create" className="btn-primary">
            Create your first poll
          </Link>
        </div>
      ) : (
        <>
          <p className="section-label mb-4">
            {polls.length} {polls.length === 1 ? 'poll' : 'polls'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {polls.map((poll) => {
              // FIX: use locally computed isExpired instead of poll.isExpired
              const isExpired = new Date(poll.expiresAt) < new Date();

              return (
                <div
                  key={poll._id}
                  className="poll-card flex flex-col group relative"
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* FIX: use local isExpired for status dot and label */}
                        <span className={`status-dot status-dot--${isExpired ? 'expired' : 'active'}`} />
                        <span className="mono-label">{isExpired ? 'Expired' : 'Active'}</span>
                      </div>
                      <span className="mono-label">{poll.questions.length} Q</span>
                    </div>

                    <h3 className="font-semibold text-sm leading-snug mb-1"
                        style={{color:'var(--ink)', letterSpacing:'-0.01em'}}>
                      <Link to={`/polls/${poll._id}`} className="hover:underline focus:outline-none">
                        {poll.title}
                      </Link>
                    </h3>

                    <p className="text-xs line-clamp-2 mb-3" style={{color:'var(--ink-3)'}}>
                      {poll.description || "No description"}
                    </p>

                    <p className="mono-label mt-auto" style={{color:'var(--ink-4)'}}>
                      Expires {new Date(poll.expiresAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
                    </p>
                  </div>

                  <div style={{
                    display:'flex',
                    alignItems:'center',
                    gap:'0.5rem',
                    padding:'0.75rem 1rem',
                    borderTop:'1px solid var(--hairline)',
                    background:'var(--subtle)',
                    borderRadius:'0 0 8px 8px',
                    flexWrap:'nowrap'
                  }}>
                    <button
                      onClick={() => navigate(`/polls/${poll._id}/results`)}
                      className="btn-secondary"
                      style={{fontSize:'0.75rem', padding:'0.375rem 0.75rem', gap:'0.375rem', display:'flex', alignItems:'center'}}
                    >
                      <BarChart2 size={13} />
                      Results
                    </button>
                    <button
                      onClick={() => copyLink(poll._id)}
                      className="btn-secondary"
                      style={{fontSize:'0.75rem', padding:'0.375rem 0.75rem', gap:'0.375rem', display:'flex', alignItems:'center', whiteSpace:'nowrap'}}
                    >
                      <LinkIcon size={13} />
                      Copy Link
                    </button>
                    <div style={{flex:1}} />
                    <button
                      onClick={() => setPollToDelete(poll._id)}
                      style={{
                        background:'none',
                        border:'none',
                        cursor:'pointer',
                        padding:'0.375rem',
                        color:'var(--ink-4)',
                        display:'flex',
                        alignItems:'center',
                        borderRadius:'4px',
                        transition:'color 0.15s, background 0.15s',
                        flexShrink:0
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color='var(--danger)'; e.currentTarget.style.background='var(--subtle)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color='var(--ink-4)'; e.currentTarget.style.background='none'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {pollToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-(--paper) rounded-xl shadow-2xl max-w-sm w-full border border-(--hairline) overflow-hidden scale-in">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="text-red-600 dark:text-red-400 w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-(--ink) mb-2">
                Delete Poll
              </h3>
              <p className="text-sm text-(--ink-2) mb-6">
                Are you sure you want to permanently delete this poll? All responses and analytics will be removed. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  disabled={isDeleting}
                  onClick={() => setPollToDelete(null)}
                  className="btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={deletePoll}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-sm transition-colors flex items-center disabled:opacity-70"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;