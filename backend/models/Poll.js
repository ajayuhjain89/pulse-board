import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 200 },
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 500 },
  isOptional: { type: Boolean, default: false },
  options: {
    type: [optionSchema],
    validate: [
      {
        validator: (arr) =>
          Array.isArray(arr) && arr.length >= 2 && arr.length <= 20,
        message: "Each question must have between 2 and 20 options",
      },
    ],
  },
});

const pollSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    isAnonymous: { type: Boolean, default: false },

    // draft = not yet open to voters; live = accepting responses.
    status: {
      type: String,
      enum: ["draft", "live"],
      default: "live",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          // Only enforce future date on creation, not on every save.
          if (!this.isNew) return true;
          return v instanceof Date && v.getTime() > Date.now();
        },
        message: "expiresAt must be a future date",
      },
    },
    isPublished: { type: Boolean, default: false },

    // Soft delete — set instead of removing the document.
    deletedAt: { type: Date, default: null },

    questions: {
      type: [questionSchema],
      validate: [
        {
          validator: (arr) =>
            Array.isArray(arr) && arr.length >= 1 && arr.length <= 50,
          message: "A poll must have between 1 and 50 questions",
        },
      ],
    },
  },
  { timestamps: true },
);

pollSchema.index({ creator: 1, createdAt: -1 });
pollSchema.index({ deletedAt: 1 });

export default mongoose.model("Poll", pollSchema);
