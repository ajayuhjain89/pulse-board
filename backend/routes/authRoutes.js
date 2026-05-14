import bcrypt from "bcryptjs";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
    expiresIn: "30d",
  });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getSmtpPort = () => Number(process.env.SMTP_PORT || 587);

const getTransporter = () => {
  const smtpPort = getSmtpPort();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.sendgrid.net",
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER || "apikey",
      pass: process.env.SMTP_PASS || ""
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      minVersion: "TLSv1.2",
    },
  });
};

export const verifyEmailTransporter = async () => {
  console.log("[SMTP] Verifying mail transporter configuration...");
  console.log(`[SMTP] host=${process.env.SMTP_HOST || "smtp.sendgrid.net"}, port=${getSmtpPort()}, user=${process.env.SMTP_USER || "apikey"}, from=${process.env.EMAIL_FROM || "<default sender>"}`);

  if (!process.env.SMTP_USER || process.env.SMTP_USER !== "apikey") {
    console.warn(`[SMTP] SMTP_USER should be \"apikey\" for SendGrid. Current value: ${process.env.SMTP_USER || "<missing>"}`);
  }

  if (!process.env.SMTP_PASS) {
    console.warn("[SMTP] SMTP_PASS is missing. Email sending will fail until Render env vars are fixed.");
  }

  if (!process.env.EMAIL_FROM) {
    console.warn("[SMTP] EMAIL_FROM is missing. Falling back to a default sender address.");
  }

  const transporter = getTransporter();
  await transporter.verify();
  console.log("[SMTP] Mail transporter verified successfully.");
};

const getFromAddress = () => process.env.EMAIL_FROM?.trim() || '"PulseBoard Auth" <noreply@pulseboard.com>';

const sendOTP = async (email, otp) => {
  console.log(`👉 [OTP] Attempting to send OTP: ${otp} to ${email}`);
  try {
    const transporter = getTransporter();
    const timeoutMs = Number(process.env.SMTP_SEND_TIMEOUT_MS || 20000);
    const sendPromise = transporter.sendMail({
      from: getFromAddress(),
      to: email,
      subject: "Your PulseBoard verification code",
      text: `Your one-time password is: ${otp}\nIt will expire in 10 minutes.\n\nWelcome to PulseBoard!`,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`SendGrid connection timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ [OTP] Email sent successfully to ${email}. Message ID: ${info.messageId || "<none>"}`);
  } catch (error) {
    console.error("❌ [OTP] Email sending failed:", error);
    throw new Error("Failed to send OTP email: " + error.message);
  }
};

router.post("/register", async (req, res) => {
  console.log(`\n[REGISTRATION] Received request for: ${req.body?.email}`);
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      console.log(`[REGISTRATION] Missing fields`);
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log(`[REGISTRATION] Checking if user ${email} exists...`);
    let user = await User.findOne({ email });

    if (user) {
      console.log(`[REGISTRATION] User exists (verified: ${user.isVerified})`);
      if (user.isVerified) {
        return res.status(400).json({ message: "User already exists" });
      }
      // Update unverified user
      user.name = name;
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    } else {
      console.log(`[REGISTRATION] Creating new user record...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        isVerified: false
      });
    }

    console.log(`[REGISTRATION] Generating OTP...`);
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60000); // 10 mins
    await user.save();

    console.log(`[REGISTRATION] Attempting to send OTP email via SendGrid...`);
    try {
      await sendOTP(user.email, otp);
    } catch (emailError) {
      console.error(`[REGISTRATION] Failed to send email: ${emailError.message}`);
      return res.status(500).json({ message: "Failed to send OTP verification email. Please try again later." });
    }

    console.log(`[REGISTRATION] Success. Requesting frontend verification.`);
    return res.status(201).json({ message: "OTP sent to email", requiresOTP: true, email: user.email });
  } catch (error) {
    console.error(`[REGISTRATION] Fatal Server Error:`, error);
    return res.status(500).json({ message: "Internal Server Error during registration" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isVerified && !user.googleId) {
        // Only require verify if it's a native user not verified
        return res.status(401).json({ message: "Please verify your email via registration first" });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });

    if (!user || user.otpExpiry < new Date()) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isVerified = true;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  console.log(`\n[FORGOT PASSWORD] Received request for: ${req.body?.email}`);
  try {
    const { email } = req.body;

    if (!email) {
      console.log("[FORGOT PASSWORD] Missing email field");
      return res.status(400).json({ message: "Email is required" });
    }

    console.log(`[FORGOT PASSWORD] Looking up user ${email}...`);
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[FORGOT PASSWORD] User not found: ${email}`);
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[FORGOT PASSWORD] Generating OTP for ${email}...`);
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60000);
    await user.save();

    console.log(`[FORGOT PASSWORD] Sending OTP email for ${email}...`);
    try {
      await sendOTP(user.email, otp);
    } catch (emailError) {
      console.error(`[FORGOT PASSWORD] Email delivery failed for ${email}:`, emailError.message);
      return res.status(500).json({ message: emailError.message || "Failed to send OTP email" });
    }

    console.log(`[FORGOT PASSWORD] OTP sent successfully for ${email}`);
    return res.status(200).json({ message: "OTP sent for password reset" });
  } catch (error) {
    console.error(`[FORGOT PASSWORD] Fatal error:`, error);
    return res.status(500).json({ message: "Internal Server Error during forgot-password request" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email, otp });

    if (!user || user.otpExpiry < new Date()) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset correctly" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    let payload;
    
    // Check if token is an idToken or accessToken based on its length/format
    // Usually idTokens are JWTs (3 parts separated by dots). Access tokens are simpler strings.
    if (token.split('.').length === 3) {
      // It's likely an ID Token
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else {
      // It's likely an Access Token (from useGoogleLogin implicit flow)
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user info with access token");
      }
      payload = await response.json();
    }

    const { name, email, sub: googleId, picture: avatar } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if they don't exist
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
      });
    } else if (!user.googleId) {
      // Link Google ID if user exists but hasn't linked Google yet
      user.googleId = googleId;
      user.avatar = avatar;
      await user.save();
    }

    // Return our own JWT and user data
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

export default router;
