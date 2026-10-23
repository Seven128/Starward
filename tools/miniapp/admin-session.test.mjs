import assert from "node:assert/strict";
import test from "node:test";
import { createAdminSessionOwner, createAdminCommandOwner, AdminSessionRetired } from "../../apps/admin-web/src/app/admin-session.ts";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function authenticate(owner, token = "private-test-credential", actor = "admin:owner") {
  return owner.confirm(owner.begin(token), actor);
}

test("logout and replacement retire late results even when the same credential returns", async () => {
  const owner = createAdminSessionOwner();
  const original = authenticate(owner);
  const response = deferred();
  const read = owner.read(original, () => response.promise);
  owner.retire();
  const replacement = authenticate(owner);
  response.resolve({ privateContent: "old" });
  await assert.rejects(read, AdminSessionRetired);
  assert.equal(owner.isCurrent(replacement), true);
  let dispatched = false;
  await assert.rejects(owner.read(original, async () => { dispatched = true; }), AdminSessionRetired);
  assert.equal(dispatched, false);
});

test("an uncertain retry preserves bytes, revision and idempotency identity and prevents a second command", () => {
  const sessions = createAdminSessionOwner();
  const session = authenticate(sessions);
  let keys = 0;
  const owner = createAdminCommandOwner(sessions, () => `key-${++keys}`);
  const body = { reason: "original", expectedRevision: 7, nested: { decision: "APPROVED" } };
  const attempt = owner.begin(session, { label: "Approve", path: "/v2/admin/example", body });
  body.reason = "edited"; body.expectedRevision = 8; body.nested.decision = "REJECTED";
  assert.equal(owner.retry(session), null, "do not dispatch concurrently");
  owner.settle(attempt, false);
  assert.equal(owner.hasUnresolvedOutcome(attempt), true);
  assert.throws(() => owner.begin(session, { label: "Changed", path: "/v2/admin/other", body }), /上一笔未确认/u);
  const retry = owner.retry(session);
  assert.equal(retry.idempotencyKey, "key-1");
  assert.deepEqual(JSON.parse(retry.wireBody), { reason: "original", expectedRevision: 7, nested: { decision: "APPROVED" }, idempotencyKey: "key-1" });
  owner.settle(retry, true);
  assert.equal(owner.pending(session), null);
  assert.equal(keys, 1);
});

test("unknown commands stay isolated across principals and explicit same-principal recovery uses a new result lifetime", () => {
  const sessions = createAdminSessionOwner();
  const a = authenticate(sessions, "A", "admin:a");
  const owner = createAdminCommandOwner(sessions, () => "same-key");
  const first = owner.begin(a, { label: "Original", path: "/v2/admin/original", body: { expectedRevision: 3 } });
  owner.recordCommitted(first, { actorId: "admin:a", idempotencyKey: "same-key", status: "COMMITTED" });
  sessions.retire();
  const b = authenticate(sessions, "B", "admin:b");
  assert.equal(owner.pending(b), null);
  assert.equal(owner.retry(b), null);
  const a2 = authenticate(sessions, "A", "admin:a");
  const recovered = owner.retry(a2);
  assert.notEqual(recovered, first);
  assert.equal(recovered.session, a2);
  assert.equal(recovered.wireBody, first.wireBody);
  assert.equal(owner.hasUnresolvedOutcome(recovered), true);
  assert.equal(owner.knownReceipt(recovered).status, "COMMITTED");
  owner.settle(first, true);
  assert.equal(owner.pending(a2), recovered, "retired completion cannot erase the successor's recovery");
  owner.settle(recovered, true);
  assert.equal(owner.pending(a2), null);
});
