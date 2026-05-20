/**
 * Live verification for the Response duplicate-vote index.
 *
 * Spins up an ephemeral in-memory MongoDB, runs the same `syncIndexes()` the
 * server runs on boot, and asserts the four guarantees:
 *   1. syncIndexes() succeeds (logs "[DB] Indexes synced" like index.js)
 *   2. authenticated duplicate vote is blocked (E11000 → 409)
 *   3. anonymous responses remain unlimited
 *   4. no unintended uniqueness constraints exist
 *
 * Run from the backend dir:  node scripts/verify-response-index.mjs
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
const sampleAnswers = () => [{ questionId: oid(), optionId: oid() }];

const run = async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri(), { autoIndex: false });

  try {
    // 1) Mimic the server boot index sync.
    console.log("\n[1] syncIndexes()");
    try {
      await Response.syncIndexes();
      console.log("[DB] Indexes synced"); // same log line as index.js
      ok("syncIndexes() resolved without error");
    } catch (e) {
      fail(`syncIndexes() threw: ${e.message}`);
      return;
    }

    // 2) Inspect the resulting indexes.
    console.log("\n[2] index inspection");
    const indexes = await Response.collection.indexes();
    const dedup = indexes.find(
      (i) => i.unique && i.key?.pollId === 1 && i.key?.userId === 1,
    );
    if (dedup?.partialFilterExpression) {
      ok(
        `partial unique index present: partialFilterExpression=${JSON.stringify(
          dedup.partialFilterExpression,
        )}`,
      );
    } else {
      fail(`expected partial unique index missing. got: ${JSON.stringify(indexes)}`);
    }
    const strayUnique = indexes.filter(
      (i) =>
        i.unique &&
        i.name !== "_id_" &&
        !(i.key?.pollId === 1 && i.key?.userId === 1) &&
        !(i.key?.pollId === 1 && i.key?.anonymousId === 1),
    );
    if (strayUnique.length === 0) ok("no unintended uniqueness constraints");
    else fail(`unexpected unique indexes: ${JSON.stringify(strayUnique)}`);

    // 3) Authenticated duplicate vote → blocked.
    console.log("\n[3] authenticated duplicate vote");
    const pollId = oid();
    const userId = oid();
    await Response.create({ pollId, userId, answers: sampleAnswers() });
    try {
      await Response.create({ pollId, userId, answers: sampleAnswers() });
      fail("duplicate authenticated vote was NOT blocked");
    } catch (e) {
      if (e.code === 11000) ok("duplicate authenticated vote blocked (E11000 → 409)");
      else fail(`unexpected error on duplicate: ${e.message}`);
    }
    await Response.create({ pollId, userId: oid(), answers: sampleAnswers() });
    ok("a different authenticated user can still vote on the same poll");

    // 4) Anonymous responses (no userId) → unlimited.
    console.log("\n[4] anonymous responses");
    const anonPoll = oid();
    await Response.create({ pollId: anonPoll, answers: sampleAnswers() });
    await Response.create({ pollId: anonPoll, answers: sampleAnswers() });
    const anonCount = await Response.countDocuments({ pollId: anonPoll });
    if (anonCount === 2) ok(`multiple anonymous responses allowed (count=${anonCount})`);
    else fail(`anonymous responses unexpectedly constrained (count=${anonCount})`);
  } finally {
    await mongoose.disconnect();
    await mem.stop();
  }
};

run()
  .then(() => {
    console.log(
      failures === 0
        ? "\n=== VERIFICATION PASSED ==="
        : `\n=== VERIFICATION FAILED (${failures}) ===`,
    );
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error("\nverification crashed:", e);
    process.exit(1);
  });
