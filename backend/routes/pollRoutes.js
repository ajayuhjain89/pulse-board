import express from "express";
import * as pollController from "../controllers/pollController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import {
  pollVoteLimiter,
  readLimiter,
  voteLimiter,
  writeLimiter,
} from "../middleware/rateLimits.js";

const router = express.Router();

router.get("/", protect, readLimiter, asyncHandler(pollController.listPolls));
router.post("/", protect, writeLimiter, asyncHandler(pollController.createPoll));

router.put("/:id", protect, writeLimiter, asyncHandler(pollController.updatePoll));
router.post(
  "/:id/launch",
  protect,
  writeLimiter,
  asyncHandler(pollController.launchPoll),
);
router.put(
  "/:id/publish",
  protect,
  writeLimiter,
  asyncHandler(pollController.publishPoll),
);
router.delete(
  "/:id",
  protect,
  writeLimiter,
  asyncHandler(pollController.deletePoll),
);

router.get(
  "/:id/analytics",
  protect,
  readLimiter,
  asyncHandler(pollController.getAnalytics),
);
router.get(
  "/:id/results",
  optionalAuth,
  readLimiter,
  asyncHandler(pollController.getResults),
);
router.get("/:id", optionalAuth, readLimiter, asyncHandler(pollController.getPoll));

router.post(
  "/:id/responses",
  optionalAuth,
  voteLimiter, // coarse burst guard: 20/min/IP across all polls
  pollVoteLimiter, // sustained per-(IP, poll) anonymous-spam backstop
  asyncHandler(pollController.submitResponse),
);

export default router;
