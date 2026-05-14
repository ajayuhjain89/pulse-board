import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { setIO } from "./socket.js";

dotenv.config({ path: new URL("./.env", import.meta.url) });

const { default: authRoutes, verifyEmailTransporter } = await import("./routes/authRoutes.js");
const { default: pollRoutes } = await import("./routes/pollRoutes.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://pulse-board-mauve.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});
setIO(io);

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://pulse-board-mauve.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/polls", pollRoutes);

void verifyEmailTransporter().catch((error) => {
  console.error("[SMTP] Transporter verification failed:", error.message);
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_poll", (pollId) => {
    socket.join(pollId);
    console.log(`Socket ${socket.id} joined poll ${pollId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pulse-board")
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

    dotenv.config({ path: new URL("./.env", import.meta.url) });
