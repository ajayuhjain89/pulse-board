import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      req.user = jwt.verify(token, env.JWT_SECRET);
    } catch {
      // Invalid token — treat as anonymous; do not throw.
    }
  }
  next();
};
