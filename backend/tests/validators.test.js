import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  pollCreateSchema,
  responseSubmitSchema,
} from "../utils/validators.js";

describe("emailSchema", () => {
  it("lowercases and trims input", () => {
    expect(emailSchema.parse("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("rejects malformed emails", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
  });
});

describe("passwordSchema", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(() => passwordSchema.parse("short1")).toThrow();
  });

  it("rejects passwords with no number", () => {
    expect(() => passwordSchema.parse("allletters")).toThrow();
  });

  it("rejects passwords with no letter", () => {
    expect(() => passwordSchema.parse("12345678")).toThrow();
  });

  it("accepts a valid password", () => {
    expect(passwordSchema.parse("goodpass1")).toBe("goodpass1");
  });
});

describe("pollCreateSchema", () => {
  const base = {
    title: "Sample poll",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    questions: [
      { text: "Question 1", options: [{ text: "A" }, { text: "B" }] },
    ],
  };

  it("accepts a well-formed poll", () => {
    expect(() => pollCreateSchema.parse(base)).not.toThrow();
  });

  it("rejects an expiry in the past", () => {
    expect(() =>
      pollCreateSchema.parse({
        ...base,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toThrow();
  });

  it("rejects a question with fewer than 2 options", () => {
    expect(() =>
      pollCreateSchema.parse({
        ...base,
        questions: [{ text: "Q", options: [{ text: "only one" }] }],
      }),
    ).toThrow();
  });

  it("rejects a poll with no questions", () => {
    expect(() => pollCreateSchema.parse({ ...base, questions: [] })).toThrow();
  });
});

describe("responseSubmitSchema", () => {
  it("rejects answers with non-ObjectId ids", () => {
    expect(() =>
      responseSubmitSchema.parse({
        answers: [{ questionId: "x", optionId: "y" }],
      }),
    ).toThrow();
  });

  it("accepts answers with valid ObjectId-shaped ids", () => {
    expect(() =>
      responseSubmitSchema.parse({
        answers: [
          {
            questionId: "0123456789abcdef01234567",
            optionId: "89abcdef0123456789abcdef",
          },
        ],
      }),
    ).not.toThrow();
  });
});
