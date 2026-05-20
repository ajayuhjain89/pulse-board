import { describe, expect, it } from "vitest";
import {
  generateRefreshToken,
  hashToken,
  isRefreshEntryUsable,
  pruneRefreshTokens,
  REFRESH_GRACE_MS,
  signAccessToken,
  verifyAccessToken,
} from "../services/tokenService.js";

describe("access tokens", () => {
  it("signs a token that verifies back to the user id", () => {
    const token = signAccessToken("user-123");
    expect(verifyAccessToken(token).id).toBe("user-123");
  });

  it("rejects a tampered token", () => {
    expect(() => verifyAccessToken("not.a.jwt")).toThrow();
  });
});

describe("refresh tokens", () => {
  it("hashToken is deterministic and collision-distinct", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("generateRefreshToken returns a token whose hash matches", () => {
    const { token, tokenHash } = generateRefreshToken();
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("generates unique tokens", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
  });
});

describe("pruneRefreshTokens", () => {
  it("drops expired entries and keeps valid ones", () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 100_000);
    const result = pruneRefreshTokens([
      { tokenHash: "a", expiresAt: past },
      { tokenHash: "b", expiresAt: future },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].tokenHash).toBe("b");
  });

  it("handles an undefined list", () => {
    expect(pruneRefreshTokens(undefined)).toEqual([]);
  });

  it("keeps a token superseded within the grace window", () => {
    const future = new Date(Date.now() + 100_000);
    const result = pruneRefreshTokens([
      { tokenHash: "a", expiresAt: future, supersededAt: new Date() },
    ]);
    expect(result).toHaveLength(1);
  });

  it("drops a token superseded beyond the grace window", () => {
    const future = new Date(Date.now() + 100_000);
    const result = pruneRefreshTokens([
      {
        tokenHash: "a",
        expiresAt: future,
        supersededAt: new Date(Date.now() - REFRESH_GRACE_MS - 1000),
      },
    ]);
    expect(result).toHaveLength(0);
  });
});

describe("isRefreshEntryUsable", () => {
  const future = () => new Date(Date.now() + 100_000);

  it("accepts a fresh, non-superseded entry", () => {
    expect(isRefreshEntryUsable({ expiresAt: future() })).toBe(true);
  });

  it("rejects an expired entry", () => {
    expect(
      isRefreshEntryUsable({ expiresAt: new Date(Date.now() - 1000) }),
    ).toBe(false);
  });

  it("accepts an entry superseded within grace (concurrent-tab refresh)", () => {
    expect(
      isRefreshEntryUsable({ expiresAt: future(), supersededAt: new Date() }),
    ).toBe(true);
  });

  it("rejects an entry superseded beyond grace (possible reuse)", () => {
    expect(
      isRefreshEntryUsable({
        expiresAt: future(),
        supersededAt: new Date(Date.now() - REFRESH_GRACE_MS - 1000),
      }),
    ).toBe(false);
  });

  it("rejects a missing entry", () => {
    expect(isRefreshEntryUsable(undefined)).toBe(false);
  });
});
