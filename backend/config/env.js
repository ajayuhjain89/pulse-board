import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const boolFromString = z.enum(["true", "false"]).transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5001),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,https://pulse-board-mauve.vercel.app"),

  COOKIE_SECURE: boolFromString.optional(),
  COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).optional(),

  SMTP_HOST: z.string().default("smtp.sendgrid.net"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default("apikey"),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('"PulseBoard Auth" <noreply@pulseboard.com>'),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  SMTP_SEND_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n[ENV] Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  console.error("\nFix the above and restart.\n");
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isProd = env.NODE_ENV === "production";

// Cross-domain deployments (frontend and API on different domains) require
// SameSite=None + Secure. Localhost dev uses Lax so cookies work over http.
export const cookieConfig = {
  secure: env.COOKIE_SECURE ?? isProd,
  sameSite: env.COOKIE_SAMESITE ?? (isProd ? "none" : "lax"),
};
