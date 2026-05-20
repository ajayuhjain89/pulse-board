import { getIO } from "../socket.js";

// Per-event-per-room throttle. Multiple emits within FLUSH_MS get coalesced
// into one — the latest payload wins.
const pending = new Map(); // key: `${event}:${room}` -> { payload }

const FLUSH_MS = 500;

export const emitThrottled = (room, event, payload) => {
  const key = `${event}:${room}`;
  const existing = pending.get(key);
  if (existing) {
    existing.payload = payload;
    return;
  }
  pending.set(key, { payload });

  setTimeout(() => {
    const entry = pending.get(key);
    pending.delete(key);
    if (!entry) return;
    const io = getIO();
    if (!io) return;
    io.to(room).emit(event, entry.payload);
  }, FLUSH_MS);
};

export const emitImmediate = (room, event, payload) => {
  const io = getIO();
  if (!io) return;
  io.to(room).emit(event, payload);
};
