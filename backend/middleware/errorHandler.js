export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (err?.name === "ValidationError" && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join("; ") });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: "Duplicate value not allowed" });
  }
  if (err?.name === "ZodError") {
    const messages = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    return res.status(400).json({ message: messages.join("; ") });
  }
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large" });
  }

  const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const message =
    status >= 500 ? "Internal server error" : err?.message || "Request failed";

  if (status >= 500) {
    console.error("[ERROR]", err);
  }

  res.status(status).json({ message });
};
