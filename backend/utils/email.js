import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

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

const buildMail = (to, otp) => ({
  from: env.EMAIL_FROM,
  to,
  subject: "Your PulseBoard verification code",
  text: `Your one-time password is: ${otp}\nIt will expire in 10 minutes.\n\nWelcome to PulseBoard!`,
});

const sendViaSendGridApi = async (email, otp) => {
  const apiKey = getSendGridApiKey();
  if (!apiKey) throw new Error("SendGrid API key is missing");
  sgMail.setApiKey(apiKey);

  const timeoutMs = env.SENDGRID_API_TIMEOUT_MS;
  const sendPromise = sgMail.send(buildMail(email, otp));
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`SendGrid API timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  const [response] = await Promise.race([sendPromise, timeoutPromise]);
  return response;
};

export const sendOTP = async (email, otp) => {
  try {
    const apiResponse = await sendViaSendGridApi(email, otp);
    return { transport: "sendgrid-api", status: apiResponse?.statusCode };
  } catch (apiError) {
    console.warn(
      `[OTP] SendGrid API failed for ${email}: ${apiError.message}; falling back to SMTP`,
    );
  }

  const transporter = getTransporter();
  const timeoutMs = env.SMTP_SEND_TIMEOUT_MS;
  const sendPromise = transporter.sendMail(buildMail(email, otp));
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
