// Build per-question vote analytics for a poll.
//
// `includeVoterPII` controls whether voter email addresses are attached.
// Voter lists are only populated for non-anonymous polls.
export function calculateAnalytics(poll, responses, { includeVoterPII = false } = {}) {
  const analytics = {};

  for (const q of poll.questions) {
    analytics[q._id.toString()] = {
      text: q.text,
      options: q.options.map((opt) => ({
        id: opt._id.toString(),
        text: opt.text,
        count: 0,
        voters: [],
      })),
    };
  }

  for (const resp of responses) {
    const seenQuestionIds = new Set();
    for (const ans of resp.answers) {
      const qKey = ans.questionId.toString();
      // Only count the first answer per question per response.
      if (seenQuestionIds.has(qKey)) continue;
      seenQuestionIds.add(qKey);

      const qBucket = analytics[qKey];
      if (!qBucket) continue;
      const optBucket = qBucket.options.find(
        (o) => o.id === ans.optionId.toString(),
      );
      if (!optBucket) continue;

      optBucket.count += 1;
      if (!poll.isAnonymous && resp.userId) {
        const voter = {
          name: resp.userId.name,
          avatar: resp.userId.avatar,
        };
        if (includeVoterPII) voter.email = resp.userId.email;
        optBucket.voters.push(voter);
      }
    }
  }

  return analytics;
}
