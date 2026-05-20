import { env, corsOrigins } from "./config/env.js";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import mongoose from "mongoose";
import morgan from "morgan";
import { Server } from "socket.io";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import Poll from "./models/Poll.js";
import Response from "./models/Response.js";
import User from "./models/User.js";
import authRoutes from "./routes/authRoutes.js";
import pollRoutes from "./routes/pollRoutes.js";
import { verifyAccessToken } from "./services/tokenService.js";
import { setIO } from "./socket.js";
import { verifyEmailTransporter } from "./utils/email.js";
import { objectIdRegex } from "./utils/validators.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: corsOrigins, methods: ["GET", "POST", "PUT", "DELETE"], credentials: true },
});
setIO(io);

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(morgan(env.NODE_ENV === "production" ? "tiny" : "dev"));
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "degraded",
    db: ready ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

// Versioned routes. The unversioned /api/* aliases are kept so already-deployed
// clients keep working during a rollout — remove them once all clients use v1.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/polls", pollRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/polls", pollRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

void verifyEmailTransporter().catch((error) => {
  console.error("[SMTP] Verification failed:", error.message);
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      socket.userId = verifyAccessToken(token).id;
    } catch {
      // Unverifiable / expired token — treat as anonymous viewer.
    }
  }
  next();
});

io.on("connection", (socket) => {
  socket.on("join_poll", (pollId) => {
    if (typeof pollId !== "string" || !objectIdRegex.test(pollId)) return;
    socket.join(pollId);
    if (socket.userId) socket.join(`creator:${socket.userId}`);
  });

  socket.on("leave_poll", (pollId) => {
    if (typeof pollId !== "string" || !objectIdRegex.test(pollId)) return;
    socket.leave(pollId);
  });
});

mongoose
  // autoIndex off: we build indexes explicitly below so a failed build
  // (e.g. the Response dedup unique index) is loud, not silent.
  .connect(env.MONGO_URI, { autoIndex: false })
  .then(async () => {
    console.log("[DB] Connected to MongoDB");
    try {
      await Promise.all([
        User.syncIndexes(),
        Poll.syncIndexes(),
        Response.syncIndexes(),
      ]);
      console.log("[DB] Indexes synced");
    } catch (err) {
      // A failure here usually means legacy duplicate data blocks a unique
      // index — duplicate-vote / email-uniqueness protection is then NOT
      // enforced. Surface it loudly; do not silently continue in the dark.
      console.error(
        "[DB] Index sync FAILED — uniqueness/duplicate-vote protection may be missing:",
        err.message,
      );
    }
    server.listen(env.PORT, () => {
      console.log(`[HTTP] Server running on port ${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("[DB] Connection error:", err);
    process.exit(1);
  });

const shutdown = (signal) => {
  console.log(`[SHUTDOWN] Received ${signal}, draining…`);
  server.close(() => {
    io.close(() => {
      mongoose
        .disconnect()
        .catch((e) => console.error("[SHUTDOWN] Mongo disconnect error:", e))
        .finally(() => {
          console.log("[SHUTDOWN] Goodbye.");
          process.exit(0);
        });
    });
  });
  setTimeout(() => {
    console.error("[SHUTDOWN] Forced exit after 10s timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
