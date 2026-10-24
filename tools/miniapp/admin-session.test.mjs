import assert from "node:assert/strict";
import test from "node:test";
import { createAdminSessionOwner, createAdminCommandOwner, AdminSessionRetired } from "../../apps/admin-web/src/app/admin-session.ts";
import { createAdminCommandJournal, createAdminIndexedDbStorage } from "../../apps/admin-web/src/app/admin-command-journal.ts";
import { createAdminJournalFixture } from "./admin-journal-fixture.mjs";

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function authenticate(owner, token = "private-test-credential", actor = "admin:owner") {
  return owner.confirm(owner.begin(token), actor);
}
function commandOwner(sessions, key, fixture = createAdminJournalFixture(), overrides = {}) {
  return createAdminCommandOwner(sessions, key, createAdminCommandJournal({
    origin: "http://localhost", audience: "http://localhost/", storage: createAdminIndexedDbStorage(fixture.indexedDB), ...overrides,
  }));
}
const check = { kind: "case-state", caseId: "case:original", states: ["APPROVED"] };
const input = (reason = "original", revision = 7) => ({ label: "Approve", path: "/v2/admin/example", body: { reason, expectedRevision: revision }, check });

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

test("an uncertain retry preserves bytes, revision and idempotency identity and prevents a second command", async () => {
  const sessions = createAdminSessionOwner();
  const session = authenticate(sessions);
  let keys = 0;
  const owner = commandOwner(sessions, () => `key-${++keys}`);
  await owner.restore(session);
  const body = { reason: "original", expectedRevision: 7, nested: { decision: "APPROVED" } };
  const attempt = await owner.begin(session, { label: "Approve", path: "/v2/admin/example", body, check });
  body.reason = "edited"; body.expectedRevision = 8; body.nested.decision = "REJECTED";
  assert.equal(await owner.retry(session), null, "do not dispatch concurrently");
  await owner.settle(attempt, false);
  assert.equal(owner.hasUnresolvedOutcome(attempt), true);
  await assert.rejects(owner.begin(session, { label: "Changed", path: "/v2/admin/other", body, check }), /上一笔未确认/u);
  const retry = await owner.retry(session);
  assert.equal(retry.idempotencyKey, "key-1");
  assert.deepEqual(JSON.parse(retry.wireBody), { reason: "original", expectedRevision: 7, nested: { decision: "APPROVED" }, idempotencyKey: "key-1" });
  await owner.settle(retry, true);
  assert.equal(owner.pending(session), null);
  assert.equal(keys, 1);
  owner.close();
});

test("unknown commands stay isolated across principals and explicit same-principal recovery uses a new result lifetime", async () => {
  const sessions = createAdminSessionOwner();
  const a = authenticate(sessions, "A", "admin:a");
  const owner = commandOwner(sessions, () => "same-key");
  await owner.restore(a);
  const first = await owner.begin(a, { label: "Original", path: "/v2/admin/original", body: { expectedRevision: 3 }, check });
  await owner.recordCommitted(first, { actorId: "admin:a", idempotencyKey: "same-key", status: "COMMITTED" });
  sessions.retire();
  owner.retire();
  const b = authenticate(sessions, "B", "admin:b");
  await owner.restore(b);
  assert.equal(owner.pending(b), null);
  assert.equal(await owner.retry(b), null);
  const a2 = authenticate(sessions, "A", "admin:a");
  await owner.restore(a2);
  const recovered = await owner.retry(a2);
  assert.notEqual(recovered, first);
  assert.equal(recovered.session, a2);
  assert.equal(recovered.wireBody, first.wireBody);
  assert.equal(owner.hasUnresolvedOutcome(recovered), true);
  assert.equal(owner.knownReceipt(recovered).status, "COMMITTED");
  await owner.settle(first, true);
  assert.equal(owner.pending(a2), recovered, "retired completion cannot erase the successor's recovery");
  await owner.settle(recovered, true);
  assert.equal(owner.pending(a2), null);
  owner.close();
});

test("new window owners recover exact encrypted attempts and known cache failures only for the same origin, audience, credential and server actor", async () => {
  const fixture = createAdminJournalFixture();
  const firstSessions = createAdminSessionOwner();
  const firstSession = authenticate(firstSessions);
  const firstOwner = commandOwner(firstSessions, () => "original-key", fixture);
  await firstOwner.restore(firstSession);
  const first = await firstOwner.begin(firstSession, input());
  await firstOwner.recordCommitted(first, { actorId: firstSession.actor, idempotencyKey: first.idempotencyKey, status: "COMMITTED" }, true);
  await firstOwner.settle(first, false);
  firstSessions.retire(); firstOwner.close();

  const sessions = createAdminSessionOwner();
  for (const variant of [
    { token: "other", actor: "admin:owner" },
    { token: "private-test-credential", actor: "admin:another" },
    { token: "private-test-credential", actor: "admin:owner", origin: "https://other.example" },
    { token: "private-test-credential", actor: "admin:owner", audience: "https://other-api.example/" },
  ]) {
    const owner = commandOwner(sessions, () => "must-not-generate", fixture, { ...(variant.origin ? { origin: variant.origin } : {}), ...(variant.audience ? { audience: variant.audience } : {}) });
    const session = authenticate(sessions, variant.token, variant.actor);
    assert.equal(await owner.restore(session), null, "a replacement identity cannot discover the attempt");
    owner.close();
  }
  const owner = commandOwner(sessions, () => "must-not-generate", fixture);
  const session = authenticate(sessions);
  const restored = await owner.restore(session);
  assert.equal(restored.wireBody, first.wireBody);
  assert.deepEqual(restored.input.check, check);
  assert.equal(owner.knownReceipt(restored).status, "COMMITTED");
  assert.equal(owner.cacheFailureObserved(restored), true);
  assert.equal(owner.hasUnresolvedOutcome(restored), true);
  assert.ok([...fixture.rows].every(([key, value]) => !/private-test-credential|original-key|original|expectedRevision|actorId/u.test(key + value)), "only opaque scope and encrypted command/receipt are stored");
  const retry = await owner.retry(session);
  assert.equal(retry.wireBody, first.wireBody);
  await assert.rejects(owner.settle(retry, true), /公共缓存/u);
  assert.equal(owner.pending(session), retry);
  const confirmedRetry = await owner.retry(session);
  await owner.settle(confirmedRetry, true, "COMPLETE");
  assert.equal(owner.pending(session), null);
  owner.close();
});

test("two window reservations are atomic and a stale completion cannot clear the successor's attempt", async () => {
  const fixture = createAdminJournalFixture();
  const sessionsA = createAdminSessionOwner(), sessionsB = createAdminSessionOwner();
  const a = authenticate(sessionsA), b = authenticate(sessionsB);
  const ownerA = commandOwner(sessionsA, () => "key-a", fixture), ownerB = commandOwner(sessionsB, () => "key-b", fixture);
  await Promise.all([ownerA.restore(a), ownerB.restore(b)]);
  const results = await Promise.allSettled([ownerA.begin(a, input("A")), ownerB.begin(b, input("B"))]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected").length, 1);
  const [winner, winnerSession, winnerOwner, loserSession, loserOwner] = results[0].status === "fulfilled"
    ? [results[0].value, a, ownerA, b, ownerB] : [results[1].value, b, ownerB, a, ownerA];
  assert.equal(loserOwner.pending(loserSession).wireBody, winner.wireBody);
  await winnerOwner.settle(winner, false);
  const otherRetry = await loserOwner.retry(loserSession);
  assert.equal(otherRetry.idempotencyKey, winner.idempotencyKey, "simultaneous explicit retries can only use the same server receipt identity");
  await loserOwner.settle(otherRetry, true);
  const next = await loserOwner.begin(loserSession, input("new", 8));
  await assert.rejects(winnerOwner.settle(winner, true), /另一窗口/u);
  assert.equal(loserOwner.pending(loserSession), next);
  await assert.rejects(winnerOwner.retry(winnerSession), /先核对，再明确重试/u);
  assert.equal(winnerOwner.pending(winnerSession).wireBody, next.wireBody, "a different durable attempt must be shown before it can be explicitly retried");
  const refreshed = await winnerOwner.retry(winnerSession);
  assert.equal(refreshed.wireBody, next.wireBody);
  await winnerOwner.settle(refreshed, false); await loserOwner.settle(next, false);
  ownerA.close(); ownerB.close();
});

test("a cache failure recorded by another window cannot be erased by an unqualified completion", async () => {
  const fixture = createAdminJournalFixture();
  const sessionsA = createAdminSessionOwner(), sessionsB = createAdminSessionOwner();
  const a = authenticate(sessionsA), b = authenticate(sessionsB);
  const ownerA = commandOwner(sessionsA, () => "shared-key", fixture), ownerB = commandOwner(sessionsB, () => "unused-key", fixture);
  try {
    await ownerA.restore(a);
    const first = await ownerA.begin(a, input());
    await ownerB.restore(b);
    const otherRetry = await ownerB.retry(b);
    const receipt = { actorId: a.actor, idempotencyKey: first.idempotencyKey, status: "REPLAYED" };
    await ownerB.recordCommitted(otherRetry, receipt, true);
    await ownerB.settle(otherRetry, false);
    await ownerA.recordCommitted(first, receipt);
    assert.equal(ownerA.cacheFailureObserved(first), false, "the original window has not observed the other response");
    await assert.rejects(ownerA.settle(first, true), /公共缓存/u);
    assert.ok(fixture.rows.size > 1, "the durable failure must survive the original window's completion");
    const recovered = await ownerA.retry(a);
    assert.equal(recovered.wireBody, first.wireBody);
    assert.equal(ownerA.cacheFailureObserved(recovered), true);
    await ownerA.recordCommitted(recovered, receipt);
    await ownerA.settle(recovered, true, "COMPLETE");
    assert.equal(ownerA.pending(a), null);
    assert.equal(fixture.rows.size, 1);
  } finally { ownerA.close(); ownerB.close(); }
});

test("post-response journal failures retain the original attempt and cannot turn a known commit into a first rejection", async () => {
  const fixture = createAdminJournalFixture();
  const sessions = createAdminSessionOwner(), session = authenticate(sessions);
  const owner = commandOwner(sessions, () => "known-key", fixture);
  await owner.restore(session);
  const attempt = await owner.begin(session, input());
  fixture.failNextWrite();
  await assert.rejects(owner.recordCommitted(attempt, { actorId: session.actor, idempotencyKey: attempt.idempotencyKey, status: "COMMITTED" }, true), /恢复记录不可读写/u);
  await owner.settle(attempt, false);
  assert.equal(owner.knownReceipt(attempt).status, "COMMITTED");
  assert.equal(owner.cacheFailureObserved(attempt), true);
  await assert.rejects(owner.settle(attempt, true), /公共缓存/u, "memory retains a failure even when its journal write failed");
  const retry = await owner.retry(session);
  assert.equal(owner.knownReceipt(retry).status, "COMMITTED", "a fresh disk read cannot erase the in-memory commit fact");
  assert.equal(retry.wireBody, attempt.wireBody);
  await owner.recordCommitted(retry, { actorId: session.actor, idempotencyKey: retry.idempotencyKey, status: "REPLAYED" }, true);
  fixture.failNextWrite();
  await assert.rejects(owner.settle(retry, true, "COMPLETE"), /恢复记录不可读写/u);
  assert.equal(owner.pending(session), retry);
  const recovered = await owner.retry(session);
  assert.equal(owner.knownReceipt(recovered).status, "REPLAYED");
  await owner.settle(recovered, true, "COMPLETE");
  owner.close();
});

test("a transient open failure can reconnect and a corrupt sealed row fails closed without replacing recovery material", async () => {
  const fixture = createAdminJournalFixture();
  const sessions = createAdminSessionOwner(), session = authenticate(sessions);
  const owner = commandOwner(sessions, () => "unchanged-key", fixture);
  fixture.failNextOpen();
  await assert.rejects(owner.restore(session), /恢复记录不可读写/u);
  assert.equal(await owner.restore(session), null);
  const attempt = await owner.begin(session, input());
  await owner.settle(attempt, false); owner.close();
  const [key, raw] = [...fixture.rows].find(([key]) => key !== "scope-salt-v1");
  const sealed = JSON.parse(raw);
  sealed.command.ciphertext = sealed.command.ciphertext.slice(0, -4) + "AAAA";
  fixture.rows.set(key, JSON.stringify(sealed));
  const preserved = JSON.stringify([...fixture.rows]);
  const replacement = commandOwner(sessions, () => "must-not-create", fixture);
  await assert.rejects(replacement.restore(session), /恢复记录不可读写/u);
  await assert.rejects(replacement.begin(session, input("replacement")), /先重新连接/u);
  assert.equal(JSON.stringify([...fixture.rows]), preserved, "a malformed old row is not deleted or overwritten");
  replacement.close();
});

test("the command owner rejects a non-scalar committed receipt status before recording a commit fact", async () => {
  const sessions = createAdminSessionOwner(), session = authenticate(sessions);
  const owner = commandOwner(sessions, () => "scalar-status-key");
  await owner.restore(session);
  const attempt = await owner.begin(session, input());
  try {
    await assert.rejects(owner.recordCommitted(attempt, { actorId: session.actor, idempotencyKey: attempt.idempotencyKey, status: ["COMMITTED"] }), /回执身份或操作标识不匹配/u);
    assert.equal(owner.knownReceipt(attempt), undefined);
  } finally { owner.close(); }
});
