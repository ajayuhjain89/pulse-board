import { z } from "zod";

export const objectIdRegex = /^[a-f0-9]{24}$/i;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), {
    message: "Password must include at least one letter and one number",
  });

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export const otpVerifySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const resendOtpSchema = z.object({
  email: emailSchema,
});

export const forgotSchema = z.object({
  email: emailSchema,
});

export const resetSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  newPassword: passwordSchema,
});

// Google OAuth authorization-code flow: the client sends a short-lived code,
// the server exchanges it (with the client secret) for tokens.
export const googleAuthSchema = z.object({
  code: z.string().min(10, "Authorization code is required"),
});

const optionSchema = z.object({
  text: z.string().trim().min(1, "Option text is required").max(200),
});

const questionSchema = z.object({
  text: z.string().trim().min(1, "Question text is required").max(500),
  isOptional: z.boolean().optional(),
  options: z
    .array(optionSchema)
    .min(2, "Each question needs at least 2 options")
    .max(20, "Each question can have at most 20 options"),
});

const futureDate = z.string().refine(
  (v) => {
    const d = new Date(v);
    return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
  },
  { message: "expiresAt must be a future date" },
);

export const pollStatusSchema = z.enum(["draft", "live"]);

export const pollCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  isAnonymous: z.boolean().optional().default(false),
  status: pollStatusSchema.optional().default("live"),
  expiresAt: futureDate,
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required")
    .max(50),
});

export const pollUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  isAnonymous: z.boolean().optional(),
  status: pollStatusSchema.optional(),
  expiresAt: futureDate.optional(),
  questions: z.array(questionSchema).min(1).max(50).optional(),
});

const answerSchema = z.object({
  questionId: z.string().regex(objectIdRegex, "Invalid questionId"),
  optionId: z.string().regex(objectIdRegex, "Invalid optionId"),
});

export const responseSubmitSchema = z.object({
  // Empty is allowed: an all-optional poll may be submitted with no selection
  // (an abstain). The controller still enforces per-question required-ness, so
  // a poll with mandatory questions rejects an empty submission.
  answers: z.array(answerSchema).max(50).optional().default([]),
  // Opaque client-generated participant token for anonymous polls. Used only
  // to dedupe repeat participation — it is not an identity.
  anonymousId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, "Invalid anonymous participant id")
    .optional(),
});

export const objectIdParam = z.string().regex(objectIdRegex, "Invalid id");
