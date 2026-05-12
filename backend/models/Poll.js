import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    description: { type: String },
    isAnonymous: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    isPublished: { type: Boolean, default: false },
    questions: [
      {
        text: { type: String, required: true },
        isOptional: { type: Boolean, default: false },
        options: [
          {
            text: { type: String, required: true },
          },
        ],
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Poll", pollSchema);
