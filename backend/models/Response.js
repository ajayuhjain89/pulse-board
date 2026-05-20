import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true,
    },
    // Set for non-anonymous polls (authenticated identity).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Set for anonymous polls — an opaque client-generated participant token
    // (NOT a real identity). Lets us dedupe repeat participation without
    // recording who the voter is.
    anonymousId: { type: String },
    answers: [
      {
        _id: false,
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
    ],
  },
  { timestamps: true },
);

// Authenticated dedup: one response per (poll, user). `$type: "objectId"`
// matches only authenticated responses; it is one of the few operators allowed
// in a partialFilterExpression and (unlike $exists) excludes a stray null.
responseSchema.index(
  { pollId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  },
);

// Anonymous dedup: one response per (poll, anonymous participant token).
// `$type: "string"` matches only responses that actually carry a token, so
// authenticated responses and tokenless edge cases are excluded.
responseSchema.index(
  { pollId: 1, anonymousId: 1 },
  {
    unique: true,
    partialFilterExpression: { anonymousId: { $type: "string" } },
  },
);

export default mongoose.model("Response", responseSchema);
