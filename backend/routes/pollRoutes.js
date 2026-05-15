import express from "express";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/auth.js";
import Poll from "../models/Poll.js";
import Response from "../models/Response.js";
import { getIO } from "../socket.js";

const router = express.Router();

// Get all polls for logged in user
router.get("/", protect, async (req, res) => {
  try {
    const polls = await Poll.find({ creator: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new poll
router.post("/", protect, async (req, res) => {
  try {
    const { title, description, isAnonymous, expiresAt, questions } = req.body;

    if (!title || !expiresAt || !questions || questions.length === 0) {
      return res.status(400).json({
        message: "Title, expiry date, and at least one question are required",
      });
    }

    const poll = new Poll({
      creator: req.user.id,
      title,
      description,
      isAnonymous,
      expiresAt: new Date(expiresAt),
      questions,
    });

    const createdPoll = await poll.save();
    res.status(201).json(createdPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a poll by ID for voting
router.get("/:id", async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    const now = new Date();
    const isExpired = new Date(poll.expiresAt) <= now;

    // Check if the caller is the creator
    let token = null;
    let isCreator = false;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        if (poll.creator.toString() === decoded.id) {
          isCreator = true;
        }
      } catch (e) {}
    }

    if (isExpired && !poll.isPublished && !isCreator) {
      return res.status(403).json({
        message: "Poll is expired and results are not published yet.",
      });
    }

    res.json({ poll, isExpired });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit a response
router.post("/:id/responses", async (req, res) => {
  try {
    const { answers } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (new Date(poll.expiresAt) <= new Date()) {
      return res.status(400).json({ message: "Poll has expired" });
    }

    // Process authentication if the poll requires it
    let userId = null;
    if (!poll.isAnonymous) {
      let token;
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
      ) {
        token = req.headers.authorization.split(" ")[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
          userId = decoded.id;
        } catch (error) {
          return res
            .status(401)
            .json({ message: "Not authorized for this poll" });
        }
      }
      if (!userId) {
        return res
          .status(401)
          .json({ message: "Authentication required for this poll" });
      }
    }

    if (userId) {
      const existing = await Response.findOne({ pollId: poll._id, userId });
      if (existing) {
        return res
          .status(400)
          .json({ message: "You have already responded to this poll" });
      }
    }

    // Check mandatory questions
    for (let q of poll.questions) {
      if (!q.isOptional) {
        const answered = answers.find(
          (a) => a.questionId.toString() === q._id.toString(),
        );
        if (!answered || !answered.optionId) {
          return res
            .status(400)
            .json({ message: `Question "${q.text}" is mandatory` });
        }
      }
    }

    const response = new Response({
      pollId: poll._id,
      userId,
      answers,
    });

    await response.save();

    // Send real-time updates to creator/dashboard via socket.io
    const allResponses = await Response.find({ pollId: poll._id });

    // Aggregation for analytics
    const analytics = calculateAnalytics(poll, allResponses);
    const io = getIO();
    if (io) {
      io.to(poll._id.toString()).emit("poll_updated", {
        totalResponses: allResponses.length,
        analytics,
      });
    }

    res.status(201).json({ message: "Response submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get analytics (Only for creator)
router.get("/:id/analytics", protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (poll.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const responses = await Response.find({ pollId: poll._id }).populate("userId", "name email avatar");
    const analytics = calculateAnalytics(poll, responses);

    res.json({ totalResponses: responses.length, analytics, poll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Publish results (Only for creator)
router.put("/:id/publish", protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (poll.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    poll.isPublished = true;
    await poll.save();

    res.json({ message: "Poll results published", poll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get public results
router.get("/:id/results", async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (!poll.isPublished) {
      return res.status(403).json({ message: "Results are not published yet" });
    }

    const responses = await Response.find({ pollId: poll._id }).populate("userId", "name email avatar");
    const analytics = calculateAnalytics(poll, responses);

    res.json({ poll, totalResponses: responses.length, analytics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper for analytics
function calculateAnalytics(poll, responses) {
  const analytics = {};
  poll.questions.forEach((q) => {
    analytics[q._id.toString()] = {
      text: q.text,
      options: q.options.map((opt) => ({
        id: opt._id.toString(),
        text: opt.text,
        count: 0,
        voters: []
      })),
    };
  });

  responses.forEach((res) => {
    res.answers.forEach((ans) => {
      if (analytics[ans.questionId.toString()]) {
        const option = analytics[ans.questionId.toString()].options.find(
          (o) => o.id === ans.optionId.toString()
        );
        if (option) {
          option.count += 1;
          if (!poll.isAnonymous && res.userId) {
            option.voters.push({
              name: res.userId.name,
              email: res.userId.email,
              avatar: res.userId.avatar
            });
          }
        }
      }
    });
  });

  return analytics;
}

// Delete a poll (Only for creator)
router.delete("/:id", protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (poll.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this poll" });
    }

    await Response.deleteMany({ pollId: poll._id });
    await Poll.findByIdAndDelete(req.params.id);

    res.json({ message: "Poll deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
