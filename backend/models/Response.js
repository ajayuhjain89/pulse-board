import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Null if anonymous
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Response", responseSchema);
