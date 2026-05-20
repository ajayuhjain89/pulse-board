import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const protect = (req, res, next) => {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.slice(7);
    try {
      req.user = jwt.verify(token, env.JWT_SECRET);
      return next();
    } catch {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  return res.status(401).json({ message: "Not authorized, no token" });
};
