import mongoose from "mongoose";
import { HttpError } from "../middleware/errorHandler.js";
import Poll from "../models/Poll.js";
import Response from "../models/Response.js";
import { calculateAnalytics } from "../services/analyticsService.js";
import { emitThrottled } from "../utils/socketEmit.js";
import {
  objectIdParam,
  pollCreateSchema,
  pollUpdateSchema,
  responseSubmitSchema,
} from "../utils/validators.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ensureValidId = (raw) => objectIdParam.parse(raw);

// Soft-deleted polls behave as if they don't exist.
const findActivePoll = (id) => Poll.findOne({ _id: id, deletedAt: null });

// ─── Controllers ────────────────────────────────────────────────────────────

// List the logged-in user's polls with response counts.
export const listPolls = async (req, res) => {
  const polls = await Poll.aggregate([
    {
      $match: {
        creator: new mongoose.Types.ObjectId(req.user.id),
        deletedAt: null,
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "responses",
        localField: "_id",
        foreignField: "pollId",
        as: "_responses",
      },
    },
    { $addFields: { responseCount: { $size: "$_responses" } } },
    { $project: { _responses: 0 } },
  ]);

  res.json(polls);
};

export const createPoll = async (req, res) => {
  const body = pollCreateSchema.parse(req.body);

  const poll = new Poll({
    creator: req.user.id,
    title: body.title,
    description: body.description || "",
    isAnonymous: body.isAnonymous ?? false,
    status: body.status ?? "live",
    expiresAt: new Date(body.expiresAt),
    questions: body.questions,
  });

  const createdPoll = await poll.save();
  res.status(201).json(createdPoll);
};

// Edit a poll — creator-only, only while it has no responses.
export const updatePoll = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const body = pollUpdateSchema.parse(req.body);

  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");
  if (poll.creator.toString() !== req.user.id) {
    throw new HttpError(403, "Not authorized to edit this poll");
  }

  const hasResponses = await Response.exists({ pollId: poll._id });
  if (hasResponses) {
    throw new HttpError(
      409,
      "Cannot edit a poll that already has responses. Delete and recreate instead.",
    );
  }

  if (body.title !== undefined) poll.title = body.title;
  if (body.description !== undefined) poll.description = body.description;
  if (body.isAnonymous !== undefined) poll.isAnonymous = body.isAnonymous;
  if (body.status !== undefined) poll.status = body.status;
  if (body.expiresAt !== undefined) poll.expiresAt = new Date(body.expiresAt);
  if (body.questions !== undefined) poll.questions = body.questions;

  await poll.save();
  res.json(poll);
};

// Launch a draft poll (draft -> live).
export const launchPoll = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");
  if (poll.creator.toString() !== req.user.id) {
    throw new HttpError(403, "Not authorized");
  }
  if (poll.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(400, "Cannot launch a poll whose expiry is in the past.");
  }

  poll.status = "live";
  await poll.save();
  res.json({ message: "Poll launched", poll });
};

// Get a poll for voting. Draft polls are invisible to non-creators.
export const getPoll = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");

  const isExpired = poll.expiresAt.getTime() <= Date.now();
  const isCreator = req.user && poll.creator.toString() === req.user.id;

  if (poll.status === "draft" && !isCreator) {
    throw new HttpError(404, "Poll not found");
  }
  if (isExpired && !poll.isPublished && !isCreator) {
    throw new HttpError(403, "Poll is expired and results are not published yet.");
  }

  res.json({ poll, isExpired });
};

export const submitResponse = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const { answers, anonymousId } = responseSubmitSchema.parse(req.body);

  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");
  if (poll.status !== "live") {
    throw new HttpError(403, "This poll is not open for responses.");
  }
  if (poll.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(400, "Poll has expired");
  }

  // Identity is mutually exclusive by poll type:
  //   - non-anonymous poll → requires & records userId (unchanged auth flow)
  //   - anonymous poll      → records only the opaque anonymousId token (if
  //                           any); never records userId, even for a logged-in
  //                           requester, so the poll stays truly anonymous.
  let identity = {};
  if (poll.isAnonymous) {
    if (anonymousId) identity = { anonymousId };
  } else {
    const userId = req.user?.id || null;
    if (!userId) {
      throw new HttpError(401, "Authentication required for this poll");
    }
    identity = { userId };
  }

  // Validate every answer references real question + option IDs of this poll.
  const questionMap = new Map();
  for (const q of poll.questions) {
    questionMap.set(q._id.toString(), {
      isOptional: q.isOptional,
      optionIds: new Set(q.options.map((o) => o._id.toString())),
      text: q.text,
    });
  }

  const seenQuestions = new Set();
  const dedupedAnswers = [];
  for (const ans of answers) {
    const qInfo = questionMap.get(ans.questionId);
    if (!qInfo) throw new HttpError(400, "Answer references unknown questionId");
    if (!qInfo.optionIds.has(ans.optionId)) {
      throw new HttpError(400, "Answer references unknown optionId");
    }
    if (seenQuestions.has(ans.questionId)) continue; // de-dupe
    seenQuestions.add(ans.questionId);
    dedupedAnswers.push(ans);
  }

  for (const [qid, info] of questionMap.entries()) {
    if (info.isOptional) continue;
    if (!seenQuestions.has(qid)) {
      throw new HttpError(400, `Question "${info.text}" is mandatory`);
    }
  }

  const response = new Response({
    pollId: poll._id,
    ...identity,
    answers: dedupedAnswers,
  });

  try {
    await response.save();
  } catch (err) {
    // Either unique index (auth {pollId,userId} or anon {pollId,anonymousId}).
    if (err?.code === 11000) {
      throw new HttpError(409, "You have already responded to this poll");
    }
    throw err;
  }

  // Recompute analytics and broadcast (throttled). Public room gets no PII;
  // the creator's private room gets the full voter list.
  const allResponses = await Response.find({ pollId: poll._id }).populate(
    "userId",
    "name email avatar",
  );
  const totalResponses = allResponses.length;

  emitThrottled(poll._id.toString(), "poll_updated", {
    totalResponses,
    analytics: calculateAnalytics(poll, allResponses, { includeVoterPII: false }),
  });
  emitThrottled(`creator:${poll.creator.toString()}`, "poll_updated_creator", {
    pollId: poll._id.toString(),
    totalResponses,
    analytics: calculateAnalytics(poll, allResponses, { includeVoterPII: true }),
  });

  res.status(201).json({ message: "Response submitted successfully" });
};

// Creator-only analytics (full voter PII).
export const getAnalytics = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");
  if (poll.creator.toString() !== req.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  const responses = await Response.find({ pollId: poll._id }).populate(
    "userId",
    "name email avatar",
  );
  res.json({
    totalResponses: responses.length,
    analytics: calculateAnalytics(poll, responses, { includeVoterPII: true }),
    poll,
  });
};

export const publishPoll = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");
  if (poll.creator.toString() !== req.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  poll.isPublished = true;
  await poll.save();
  res.json({ message: "Poll results published", poll });
};

// Public results (after publish). Voter PII scrubbed unless caller is creator.
export const getResults = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");
  if (!poll.isPublished) {
    throw new HttpError(403, "Results are not published yet");
  }

  const isCreator = req.user && poll.creator.toString() === req.user.id;
  const responses = await Response.find({ pollId: poll._id }).populate(
    "userId",
    "name email avatar",
  );

  res.json({
    poll,
    totalResponses: responses.length,
    analytics: calculateAnalytics(poll, responses, { includeVoterPII: !!isCreator }),
  });
};

// Soft delete — keep the document and its responses, just mark it removed.
export const deletePoll = async (req, res) => {
  const pollId = ensureValidId(req.params.id);
  const poll = await findActivePoll(pollId);
  if (!poll) throw new HttpError(404, "Poll not found");
  if (poll.creator.toString() !== req.user.id) {
    throw new HttpError(403, "Not authorized to delete this poll");
  }

  poll.deletedAt = new Date();
  await poll.save();
  res.json({ message: "Poll deleted successfully" });
};
