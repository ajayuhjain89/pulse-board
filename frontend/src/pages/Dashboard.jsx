import {
  AlertCircle,
  BarChart2,
  Pencil,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import CopyButton from "../components/CopyButton";
import Modal from "../components/Modal";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../lib/apiClient";

const FILTER_LABELS = {
  all: "All",
  drafts: "Drafts",
  active: "Active",
  expired: "Expired",
};

const EMPTY_STATE = {
  all: {
    title: "No polls yet.",
    text: "Create your first poll and start collecting responses in minutes.",
  },
  drafts: {
    title: "No drafts.",
    text: "Save a poll as Draft when you create it to keep working on it later.",
  },
  active: {
    title: "No active polls.",
    text: "Polls show as Active when they're live and accepting responses.",
  },
  expired: {
    title: "No expired polls.",
    text: "Past-expiry polls will appear here.",
  },
};

const classifyPoll = (poll) => {
  const isDraft = poll.status === "draft";
  const isExpired = new Date(poll.expiresAt) < new Date();
  if (isDraft) return "drafts";
  if (isExpired) return "expired";
  return "active";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { authReady } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pollToDelete, setPollToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [launchingId, setLaunchingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");

  const counts = useMemo(() => {
    const c = { all: polls.length, drafts: 0, active: 0, expired: 0 };
    for (const p of polls) c[classifyPoll(p)] += 1;
    return c;
  }, [polls]);

  const displayedPolls = useMemo(() => {
    const filtered =
      filter === "all" ? polls : polls.filter((p) => classifyPoll(p) === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "expiry") {
        return new Date(a.expiresAt) - new Date(b.expiresAt);
      }
      // 'recent' — newest createdAt first; falls back to expiresAt if missing
      const ad = new Date(a.createdAt || a.expiresAt);
      const bd = new Date(b.createdAt || b.expiresAt);
      return bd - ad;
    });
  }, [polls, filter, sort]);

  useEffect(() => {
    if (!authReady) return;

    const fetchPolls = async () => {
      try {
        const { data } = await apiClient.get("/polls");
        setPolls(data);
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error("Failed to load your polls");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, [authReady]);

  const launchPoll = async (pollId) => {
    setLaunchingId(pollId);
    try {
      const { data } = await apiClient.post(`/polls/${pollId}/launch`);
      setPolls((prev) =>
        prev.map((p) =>
          p._id === pollId ? { ...p, status: data.poll.status } : p,
        ),
      );
      toast.success("Poll is now live");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to launch poll");
    } finally {
      setLaunchingId(null);
    }
  };

  const deletePoll = async () => {
    if (!pollToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/polls/${pollToDelete}`);
      setPolls((prev) => prev.filter((poll) => poll._id !== pollToDelete));
      toast.success("Poll deleted successfully");
      setPollToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete poll");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pt-20">
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div
                className="skeleton-line short"
                style={{ height: 16, width: "60%" }}
              />
              <div className="skeleton-line" style={{ height: 12 }} />
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <div className="skeleton-line" style={{ height: 10, width: 80 }} />
                <div
                  className="skeleton-line short"
                  style={{ height: 10, width: 40 }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : polls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__display">No polls yet.</div>
          <p className="empty-state__text">
            Create your first poll and start collecting responses in minutes.
          </p>
          <Link to="/polls/create" className="btn-primary">
            Create your first poll
          </Link>
        </div>
      ) : (
        <>
          <div className="dashboard-filters">
            {Object.keys(FILTER_LABELS).map((key) => (
              <button
                key={key}
                type="button"
                className={`filter-chip ${filter === key ? "filter-chip--active" : ""}`}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
              >
                {FILTER_LABELS[key]}
                <span className="filter-chip__count">{counts[key]}</span>
              </button>
            ))}
            <div className="dashboard-filters__spacer" />
            <label className="sr-only" htmlFor="dashboard-sort">
              Sort polls
            </label>
            <select
              id="dashboard-sort"
              className="dashboard-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Most recent</option>
              <option value="expiry">Soonest expiry</option>
            </select>
          </div>

          {displayedPolls.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__display">
                {EMPTY_STATE[filter].title}
              </div>
              <p className="empty-state__text">{EMPTY_STATE[filter].text}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedPolls.map((poll) => {
              const isDraft = poll.status === "draft";
              const isExpired = new Date(poll.expiresAt) < new Date();
              const responseCount = poll.responseCount ?? 0;
              const canEdit = responseCount === 0;

              const statusKind = isDraft
                ? "draft"
                : isExpired
                  ? "expired"
                  : "active";
              const statusLabel = isDraft
                ? "Draft"
                : isExpired
                  ? "Expired"
                  : "Active";

              return (
                <div
                  key={poll._id}
                  className="poll-card flex flex-col group relative"
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`status-dot status-dot--${statusKind}`}
                        />
                        <span className="mono-label">{statusLabel}</span>
                      </div>
                      <span className="mono-label">
                        {poll.questions.length} Q
                      </span>
                    </div>

                    <h3
                      className="font-semibold text-sm leading-snug mb-1"
                      style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
                    >
                      <Link
                        to={`/polls/${poll._id}`}
                        className="hover:underline focus:outline-none"
                      >
                        {poll.title}
                      </Link>
                    </h3>

                    <p
                      className="text-xs line-clamp-2 mb-3"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {poll.description || "No description"}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                      <span className="mono-label" style={{ color: "var(--ink-4)" }}>
                        {new Date(poll.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="mono-label" style={{ color: "var(--ink-3)" }}>
                        {responseCount}{" "}
                        {responseCount === 1 ? "response" : "responses"}
                      </span>
                    </div>
                  </div>

                  <div className="poll-card__footer">
                    {isDraft ? (
                      <button
                        onClick={() => launchPoll(poll._id)}
                        disabled={launchingId === poll._id}
                        className="btn-secondary poll-card__action"
                      >
                        {launchingId === poll._id ? (
                          <Spinner size={13} />
                        ) : (
                          <Rocket size={13} />
                        )}
                        Launch
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/polls/${poll._id}/results`)}
                          className="btn-secondary poll-card__action"
                        >
                          <BarChart2 size={13} />
                          Results
                        </button>
                        <CopyButton
                          value={`${window.location.origin}/polls/${poll._id}`}
                          className="btn-secondary poll-card__action"
                          iconSize={13}
                          onFailed={() =>
                            toast.error("Couldn't copy — copy it manually")
                          }
                        />
                      </>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => navigate(`/polls/${poll._id}/edit`)}
                        className="poll-card__icon-btn"
                        aria-label="Edit poll"
                        title="Edit poll"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => setPollToDelete(poll._id)}
                      className="poll-card__icon-btn poll-card__icon-btn--danger"
                      aria-label="Delete poll"
                      title="Delete poll"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </>
      )}

      <Modal
        open={Boolean(pollToDelete)}
        onClose={() => !isDeleting && setPollToDelete(null)}
        title="Delete Poll"
        description="Are you sure you want to permanently delete this poll? All responses and analytics will be removed. This action cannot be undone."
        icon={<AlertCircle size={22} />}
        tone="danger"
        actions={
          <>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setPollToDelete(null)}
              className="btn-secondary"
              style={{ padding: "0.5rem 1rem" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={deletePoll}
              className="btn-danger"
              data-destructive
            >
              {isDeleting ? (
                <>
                  <Spinner size={14} /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </button>
          </>
        }
      />
    </div>
  );
};

export default Dashboard;
