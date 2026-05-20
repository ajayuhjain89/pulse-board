import { CSRF_COOKIE, REFRESH_COOKIE } from "../utils/cookies.js";
import { HttpError } from "./errorHandler.js";

// Double-submit CSRF check for cookie-authenticated endpoints (/refresh,
// /logout). The CSRF token value is delivered to the client in the login
// response body AND as a cookie; a forged cross-site request carries the
// cookie automatically but cannot set the matching X-CSRF-Token header.
//
// When there is no session cookie at all there is nothing to protect — the
// downstream handler will return 401 — so we let the request through.
export const requireCsrf = (req, _res, next) => {
  if (!req.cookies?.[REFRESH_COOKIE]) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new HttpError(403, "Invalid CSRF token"));
  }
  next();
};
