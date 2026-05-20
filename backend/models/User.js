import mongoose from "mongoose";
import validator from "validator";

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    // When set, this token has been rotated. It stays usable for a short grace
    // window so concurrent tabs sharing the same cookie don't log each other
    // out (see tokenService.isRefreshEntryUsable).
    supersededAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: "Invalid email address",
      },
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    googleId: { type: String, index: true, sparse: true },
    avatar: { type: String },
    isVerified: { type: Boolean, default: false },

    // OTP (hashed). Plaintext is never stored.
    otpHash: { type: String },
    otpExpiry: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    otpRequestedAt: { type: Date },

    // Login brute-force protection.
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },

    // Active refresh-token sessions (hashed). Supports multiple devices.
    // Never exposed in API responses — controllers whitelist fields explicitly.
    refreshTokens: { type: [refreshTokenSchema], default: [] },
  },
  { timestamps: true },
);

userSchema.index({ "refreshTokens.tokenHash": 1 });

export default mongoose.model("User", userSchema);
