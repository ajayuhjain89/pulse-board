const KEY = "pulseboard:anonId";
const VALID = /^[A-Za-z0-9_-]{8,64}$/;

const randomId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "");
    }
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through to Math.random */
  }
  let s = "";
  while (s.length < 32) s += Math.floor(Math.random() * 16).toString(16);
  return s;
};

/**
 * A stable, opaque per-browser participant token for anonymous polls.
 * Persisted in localStorage so a refresh/revisit reuses the same id (which the
 * backend uses to block repeat anonymous participation). It is NOT an identity
 * and carries no personal data. If localStorage is unavailable (strict private
 * mode) an ephemeral id is returned so participation still works.
 */
export const getAnonymousId = () => {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !VALID.test(id)) {
      id = randomId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
};
