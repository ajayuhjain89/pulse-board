import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  if (req.headers.authorization?.startsWith("Bearer")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || "secret");
      return next();
    } catch {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  return res.status(401).json({ message: "Not authorized, no token" });
};
