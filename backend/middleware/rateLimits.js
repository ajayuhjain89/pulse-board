import rateLimit from "express-rate-limit";

const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const authLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many requests, please slow down." },
});

export const otpLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 3,
  message: { message: "Please wait before requesting another code." },
});

export const writeLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many requests, please slow down." },
});

export const readLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 120,
});

export const voteLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many vote attempts. Please wait a moment." },
});

// Per-(IP, poll) backstop against anonymous vote spam (e.g. incognito/storage
// clearing loops from one machine). Deliberately lenient so a shared NAT —
// many legitimate voters behind one IP — isn't blocked: the per-participant
// `anonymousId` dedup is the primary guard; this only stops bulk scripted
// spam. Authenticated voters never reach the cap (they get a 409 after one
// vote). `validate:false` silences the IPv6 keyGenerator dev warning for the
// intentional composite key.
export const pollVoteLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `${req.ip}:${req.params.id || "?"}`,
  message: {
    message:
      "Too many submissions from this network for this poll. Please try again later.",
  },
  validate: false,
});
