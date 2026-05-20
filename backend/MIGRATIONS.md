# Migrations

Schema/data changes that require manual execution against existing databases.

## 2026-05 — Lowercase email addresses

The `User.email` field now has `lowercase: true` and a unique index. Existing
rows with mixed-case emails (`User@Example.com`) won't be touched automatically
and may collide with the new constraint.

Run once against the prod DB:

```js
// In `mongosh` connected to the production database:
db.users.updateMany({}, [
  { $set: { email: { $toLower: { $trim: { input: "$email" } } } } },
]);
```

If duplicates surface (`User@x.com` and `user@x.com` both exist), pick a
winner manually before running the update.

## 2026-05 — OTP plaintext → bcrypt hash

The `User.otp` field has been renamed to `otpHash` and stores a bcrypt hash.
Any live, unexpired OTPs from the previous schema become invalid. Affected
users will need to request a new OTP. No data deletion required — Mongoose
will silently ignore the old `otp` field.

## 2026-05 — Response compound unique index

`Response` now enforces a compound unique index on `(pollId, userId)` with
`partialFilterExpression: { userId: { $exists: true } }`. Mongoose creates this
on first connect. If existing data already has duplicates, the index build will
fail — clean them up first:

```js
// Find duplicates
db.responses.aggregate([
  { $match: { userId: { $ne: null } } },
  { $group: { _id: { pollId: "$pollId", userId: "$userId" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } },
]);

// Then delete all but the first per group, e.g.:
// db.responses.deleteMany({ _id: { $in: [<duplicate ids except one>] } });
```
