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

  const addQuestion = () =>
    setQuestions([
      ...questions,
      { text: "", isOptional: false, options: [{ text: "" }, { text: "" }] },
    ]);

  const removeQuestion = (qIndex) => {
    if (questions.length === 1)
      return toast.error("Minimum one question is required.");
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
    if (updated[qIndex].options.length <= 2)
      return toast.error("Minimum 2 options required.");
    updated[qIndex].options = updated[qIndex].options.filter(
      (_, i) => i !== oIndex,
    );
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex].text = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!expiresAt) return toast.error("Please set an expiry date.");
      await axios.post("/polls", {
        title,
        description,
        isAnonymous,
        expiresAt: new Date(expiresAt).toISOString(),
        questions,
      });
      toast.success("Poll created successfully!");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to create poll");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 animate-fade-in">
      <div className="mb-12 text-center">
        <h1 className="display-sm mb-3">Create Poll</h1>
        <p className="text-base text-(--ink-2)">
          Configure your poll's details and questions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Details */}
        <div className="mb-14">
          <div className="flex items-center text-sm mb-6">
            <span className="section-label">Details</span>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-(--ink-3) mb-2">
                Poll Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 input-ring"
                placeholder="What feedback do you need?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-(--ink-3) mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 input-ring resize-none h-24"
                placeholder="Add context or instructions for your audience..."
              ></textarea>
            </div>
          </div>
        </div>

        <hr className="my-10" style={{border:'none', height:'1px', background:'var(--hairline)'}} />

        {/* Configuration */}
        <div className="mb-14">
          <div className="flex items-center text-sm mb-6">
            <span className="section-label">Configuration</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-(--ink-3) mb-2">
                Expiry Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2.5 input-ring text-sm"
              />
            </div>
            <div className="flex items-center sm:pt-6">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <div
                    className={`block w-10 h-6 rounded-full transition-colors ${isAnonymous ? "bg-(--ink)" : "bg-(--hairline)"}`}
                  ></div>
                  <div
                    className={`absolute left-1 top-1 bg-(--surface) w-4 h-4 rounded-full transition-transform ${isAnonymous ? "transform translate-x-4" : ""}`}
                  ></div>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-(--ink)">
                    Anonymous Submissions
                  </div>
                  <div className="text-xs text-(--ink-2) mt-0.5">
                    Keep voter identities private
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <hr className="my-10" style={{border:'none', height:'1px', background:'var(--hairline)'}} />

        {/* Builder */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center text-sm">
              <span className="section-label">Questions</span>
            </div>
            <span className="text-xs font-medium text-(--ink-2) bg-(--subtle) px-2.5 py-1 rounded-md">
              {questions.length} Items
            </span>
          </div>

          <div className="space-y-5">
            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="p-5 bg-(--subtle) border border-(--hairline) rounded-lg relative group transition-colors"
              >
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="absolute top-3 right-3 p-1.5 text-(--ink-3) hover:text-red-500 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Remove question"
                >
                  <Trash2 size={16} />
                </button>

                <div className="mb-5 pr-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold text-(--ink-3) w-5 shrink-0">
                      Q{qIndex + 1}
                    </span>
                    <input
                      type="text"
                      required
                      value={q.text}
                      onChange={(e) =>
                        updateQuestion(qIndex, "text", e.target.value)
                      }
                      className="w-full bg-transparent border-b border-(--hairline) focus:border-(--ink) outline-none text-sm font-medium pb-1.5 transition-colors px-0 placeholder-zinc-400"
                      placeholder="Type your question..."
                    />
                  </div>

                  <label className="flex items-center ml-8 mt-3 cursor-pointer w-max">
                    <input
                      type="checkbox"
                      checked={q.isOptional}
                      onChange={(e) =>
                        updateQuestion(qIndex, "isOptional", e.target.checked)
                      }
                      className="rounded border-(--hairline) text-(--ink) focus:ring-(--ink) w-3.5 h-3.5"
                    />
                    <span className="text-xs font-medium text-(--ink-2) ml-2">
                      Make this question optional
                    </span>
                  </label>
                </div>

                <div className="pl-8 space-y-3">
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      className="flex items-center gap-3 group/opt"
                    >
                      <div className="w-3 h-3 rounded-full border border-(--hairline) shrink-0 ml-1"></div>
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) =>
                          updateOption(qIndex, oIndex, e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-(--surface) border border-(--hairline) rounded-md focus:outline-none focus:ring-1 focus:ring-(--ink) text-sm transition-all placeholder-zinc-400"
                        placeholder={`Option ${oIndex + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        className="p-1.5 text-(--ink-3) hover:text-red-500 opacity-0 group-hover/opt:opacity-100 focus:opacity-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addOption(qIndex)}
                    className="btn-secondary text-xs px-3 py-1.5 mt-3 inline-flex items-center"
                  >
                    <Plus size={14} className="mr-1.5" /> Add Choice
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="w-full mt-6 py-5 bg-(--subtle) border border-(--hairline) text-(--ink) text-sm font-medium rounded-lg hover:border-(--hairline-strong) transition-colors flex justify-center items-center gap-2"
          >
            <Plus size={16} /> Add Question
          </button>
        </div>

        {/* Global Actions */}
        <div className="flex justify-end pt-6 border-t border-(--hairline)">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="btn-ghost mr-3 text-sm"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary text-sm px-6">
            Create Poll
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePoll;