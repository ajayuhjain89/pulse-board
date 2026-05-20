/**
 * Live verification for anonymous participant dedup (+ unchanged auth dedup).
 *
 * Spins up an ephemeral MongoDB, builds the Response indexes via syncIndexes(),
 * and asserts:
 *   1. both partial unique indexes build and only those two are unique
 *   2. refresh/revisit spam (same anonymousId, same poll) → blocked (E11000→409)
 *   3. a different participant (different anonymousId) → allowed
 *   4. same participant on a different poll → allowed (per-poll scope)
 *   5. authenticated dedup (pollId+userId) still works, unchanged
 *   6. tokenless anonymous responses remain allowed (documented limitation)
 *
 * Run from the backend dir:  node scripts/verify-anon-dedup.mjs
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Response from "../models/Response.js";

let failures = 0;
const ok = (m) => console.log("  ✅", m);
const fail = (m) => {
  failures += 1;
  console.error("  ❌", m);
};
const oid = () => new mongoose.Types.ObjectId();
const ans = () => [{ questionId: oid(), optionId: oid() }];
const isDup = (e) => e && e.code === 11000;

const run = async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri(), { autoIndex: false });
  try {
    console.log("\n[1] syncIndexes() + index inspection");
    await Response.syncIndexes();
    console.log("[DB] Indexes synced");
    const idx = await Response.collection.indexes();
    const authIdx = idx.find((i) => i.unique && i.key?.userId === 1 && i.key?.pollId === 1);
    const anonIdx = idx.find((i) => i.unique && i.key?.anonymousId === 1 && i.key?.pollId === 1);
    authIdx ? ok(`auth unique index: ${JSON.stringify(authIdx.partialFilterExpression)}`) : fail("auth index missing");
    anonIdx ? ok(`anon unique index: ${JSON.stringify(anonIdx.partialFilterExpression)}`) : fail("anon index missing");
    const stray = idx.filter(
      (i) =>
        i.unique &&
        i.name !== "_id_" &&
        !(i.key?.pollId === 1 && i.key?.userId === 1) &&
        !(i.key?.pollId === 1 && i.key?.anonymousId === 1),
    );
    stray.length === 0 ? ok("no unintended unique indexes") : fail(`stray unique: ${JSON.stringify(stray)}`);

    console.log("\n[2] anonymous refresh/revisit spam");
    const pollA = oid();
    const tokenA = "anonparticipanttoken0001";
    await Response.create({ pollId: pollA, anonymousId: tokenA, answers: ans() });
    try {
      await Response.create({ pollId: pollA, anonymousId: tokenA, answers: ans() });
      fail("repeat anonymous participation was NOT blocked");
    } catch (e) {
      isDup(e) ? ok("repeat anonymous participation blocked (E11000 → 409)") : fail(`unexpected: ${e.message}`);
    }

    console.log("\n[3] different participant, same poll");
    await Response.create({ pollId: pollA, anonymousId: "anonparticipanttoken0002", answers: ans() });
    ok("a different anonymous participant can vote on the same poll");

    console.log("\n[4] same participant, different poll");
    const pollB = oid();
    await Response.create({ pollId: pollB, anonymousId: tokenA, answers: ans() });
    ok("same participant token can vote on a different poll (per-poll scope)");

    console.log("\n[5] authenticated dedup unchanged");
    const pollC = oid();
    const userId = oid();
    await Response.create({ pollId: pollC, userId, answers: ans() });
    try {
      await Response.create({ pollId: pollC, userId, answers: ans() });
      fail("authenticated duplicate was NOT blocked");
    } catch (e) {
      isDup(e) ? ok("authenticated duplicate still blocked (E11000 → 409)") : fail(`unexpected: ${e.message}`);
    }
    await Response.create({ pollId: pollC, userId: oid(), answers: ans() });
    ok("a different authenticated user can still vote on the same poll");

    console.log("\n[6] tokenless anonymous responses (documented limitation)");
    const pollD = oid();
    await Response.create({ pollId: pollD, answers: ans() });
    await Response.create({ pollId: pollD, answers: ans() });
    const tokenless = await Response.countDocuments({ pollId: pollD });
    tokenless === 2
      ? ok(`tokenless anonymous responses remain unlimited (count=${tokenless})`)
      : fail(`tokenless anonymous unexpectedly constrained (count=${tokenless})`);
  } finally {
    await mongoose.disconnect();
    await mem.stop();
  }
};

run()
  .then(() => {
    console.log(failures === 0 ? "\n=== VERIFICATION PASSED ===" : `\n=== VERIFICATION FAILED (${failures}) ===`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error("\nverification crashed:", e);
    process.exit(1);
  });
