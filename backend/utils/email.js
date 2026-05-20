import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { renderAuthCodeEmail } from "./emailTemplates.js";

// Mirrors OTP_TTL_MS in authController (10 min); used only for expiry copy.
const OTP_TTL_MINUTES = 10;

const getSendGridApiKey = () => env.SENDGRID_API_KEY || env.SMTP_PASS || "";

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS || "" },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { minVersion: "TLSv1.2" },
  });
  return cachedTransporter;
};

// Build a branded multipart (HTML + plain-text) message. `purpose` selects the
// verification vs password-reset copy/subject; both share the OTP-code layout.
const buildMail = (to, otp, purpose = "verify") => {
  const { subject, text, html } = renderAuthCodeEmail({
    purpose,
    otp,
    ttlMinutes: OTP_TTL_MINUTES,
    appUrl: env.APP_URL,
  });
  return { from: env.EMAIL_FROM, to, subject, text, html };
};

const sendViaSendGridApi = async (email, otp, purpose) => {
  const apiKey = getSendGridApiKey();
  if (!apiKey) throw new Error("SendGrid API key is missing");
  sgMail.setApiKey(apiKey);

  const timeoutMs = env.SENDGRID_API_TIMEOUT_MS;
  const sendPromise = sgMail.send(buildMail(email, otp, purpose));
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`SendGrid API timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  const [response] = await Promise.race([sendPromise, timeoutPromise]);
  return response;
};

// `purpose`: "verify" (email verification / signup) or "reset" (password reset).
// Defaults to "verify" so existing callers keep working unchanged.
export const sendOTP = async (email, otp, purpose = "verify") => {
  try {
    const apiResponse = await sendViaSendGridApi(email, otp, purpose);
    return { transport: "sendgrid-api", status: apiResponse?.statusCode };
  } catch (apiError) {
    console.warn(
      `[OTP] SendGrid API failed for ${email}: ${apiError.message}; falling back to SMTP`,
    );
  }

  const transporter = getTransporter();
  const timeoutMs = env.SMTP_SEND_TIMEOUT_MS;
  const sendPromise = transporter.sendMail(buildMail(email, otp, purpose));
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`SMTP timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  const info = await Promise.race([sendPromise, timeoutPromise]);
  return { transport: "smtp", messageId: info.messageId };
};

export const verifyEmailTransporter = async () => {
  console.log(
    `[SMTP] Verifying transporter (host=${env.SMTP_HOST}, port=${env.SMTP_PORT})`,
  );
  if (!env.SMTP_PASS && !env.SENDGRID_API_KEY) {
    console.warn(
      "[SMTP] No SMTP_PASS or SENDGRID_API_KEY set — OTP delivery will fail.",
    );
  }
  await getTransporter().verify();
  console.log("[SMTP] Transporter ready.");
};
