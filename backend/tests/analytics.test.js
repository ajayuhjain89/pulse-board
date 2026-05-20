import { describe, expect, it } from "vitest";
import { calculateAnalytics } from "../services/analyticsService.js";

// String ids work because calculateAnalytics only ever calls `.toString()`,
// and a string's toString() returns itself.
const poll = {
  isAnonymous: false,
  questions: [
    {
      _id: "q1",
      text: "Question 1",
      options: [
        { _id: "o1", text: "A" },
        { _id: "o2", text: "B" },
      ],
    },
  ],
};

const responses = [
  {
    userId: { name: "Al", email: "al@example.com", avatar: "" },
    answers: [{ questionId: "q1", optionId: "o1" }],
  },
  {
    userId: { name: "Bo", email: "bo@example.com", avatar: "" },
    answers: [{ questionId: "q1", optionId: "o1" }],
  },
];

describe("calculateAnalytics", () => {
  it("counts votes per option", () => {
    const a = calculateAnalytics(poll, responses, { includeVoterPII: true });
    expect(a.q1.options.find((o) => o.id === "o1").count).toBe(2);
    expect(a.q1.options.find((o) => o.id === "o2").count).toBe(0);
  });

  it("includes voter email only when includeVoterPII is true", () => {
    const withPII = calculateAnalytics(poll, responses, { includeVoterPII: true });
    const noPII = calculateAnalytics(poll, responses, { includeVoterPII: false });
    expect(withPII.q1.options[0].voters[0].email).toBe("al@example.com");
    expect(noPII.q1.options[0].voters[0].email).toBeUndefined();
    expect(noPII.q1.options[0].voters[0].name).toBe("Al");
  });

  it("omits voter lists entirely for anonymous polls", () => {
    const a = calculateAnalytics({ ...poll, isAnonymous: true }, responses, {
      includeVoterPII: true,
    });
    expect(a.q1.options[0].voters).toHaveLength(0);
  });

  it("de-dupes multiple answers to the same question in one response", () => {
    const dup = [
      {
        userId: null,
        answers: [
          { questionId: "q1", optionId: "o1" },
          { questionId: "q1", optionId: "o2" },
        ],
      },
    ];
    const a = calculateAnalytics({ ...poll, isAnonymous: true }, dup, {
      includeVoterPII: false,
    });
    expect(a.q1.options.find((o) => o.id === "o1").count).toBe(1);
    expect(a.q1.options.find((o) => o.id === "o2").count).toBe(0);
  });
});
