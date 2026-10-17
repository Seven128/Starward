import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { MemoryCache } from "./cache.ts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { ContributionSubmission, ObservationContextResolveRequest } from "@starward/miniapp-contracts";

async function privateFixture() {
  const repository = new InMemoryTestRepository();
  const cache = new MemoryCache();
  const service = createTestMiniappService({ repository, cache });
  const owner = (await service.auth.login({ code: "local:pending-fixture-owner-20261005" })).data;
  const draft = await service.contributions.createDraft(owner.userId, {
    kind: "NEW_SPOT_PROPOSAL", spotId: null,
    candidateLocation: { displayName: "冻结位置", region: "", wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 } },
    observedAt: null, topics: [], detail: "", rightsConfirmed: false, preciseLocationConsent: true,
    candidateProfile: { fields: { name: "冻结位置" }, media: {}, intake: { version: 1, openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
      contact: { kind: "UNKNOWN", number: "", purpose: "", source: "", publicPermissionConfirmed: false } } },
  }, "fixture-draft");
  let current = await service.contributions.submit(owner.userId, draft.submissionId, draft.revision, "fixture-submit");
  const attempt = current.attempts.at(-1)!;
  const read = repository.getContribution.bind(repository);
  // Only lifecycle scenarios below use a controlled repository read port. The
  // ordinary draft/submit/attempt path above is the real production owner.
  repository.getContribution = async (user, id) => user === owner.userId && id === current.submissionId ? structuredClone(current) : read(user, id);
  const input: ObservationContextResolveRequest = { location: { kind: "PENDING_PROPOSAL", submissionId: current.submissionId,
    attemptId: attempt.attemptId, attemptBaseRevision: attempt.baseRevision }, localDate: "2026-10-05", selectedAt: "2026-10-05T13:00:00.000Z" };
  return { service, repository, cache, owner, input, get: () => current,
    change: (patch: Partial<ContributionSubmission>) => { current = { ...current, ...patch }; } };
}

test("actual Context HTTP pipeline resolves the owner's frozen pending identity and denies anonymous and another account", async () => {
  const service = createTestMiniappService();
  const owner = (await service.auth.login({ code: "local:pending-context-owner-20261005" })).data;
  const stranger = (await service.auth.login({ code: "local:pending-context-other-20261005" })).data;
  const draft = await service.contributions.createDraft(owner.userId, {
    kind: "NEW_SPOT_PROPOSAL", spotId: null,
    candidateLocation: { displayName: "冻结待审位置", region: "", wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 } },
    observedAt: null, topics: [], detail: "", rightsConfirmed: false, preciseLocationConsent: true,
    candidateProfile: { fields: { name: "冻结待审位置" }, media: {}, intake: { version: 1,
      openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
      contact: { kind: "UNKNOWN", number: "", purpose: "", source: "", publicPermissionConfirmed: false } } },
  }, "context-draft");
  const pending = await service.contributions.submit(owner.userId, draft.submissionId, draft.revision, "context-submit");
  const attempt = pending.attempts.at(-1)!;
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(0, "127.0.0.1");
  try {
    const base = await app.getUrl();
    const body = { location: { kind: "PENDING_PROPOSAL", submissionId: pending.submissionId, attemptId: attempt.attemptId, attemptBaseRevision: attempt.baseRevision },
      localDate: "2026-10-05", selectedAt: "2026-10-05T13:00:00.000Z" };
    const send = (token?: string) => fetch(base + "/v2/observation-contexts/resolve", { method: "POST", headers: {
      "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}),
    }, body: JSON.stringify(body) });
    const resolved = await send(owner.accessToken);
    assert.equal(resolved.status, 201);
    const context = (await resolved.json()).data;
    assert.equal(context.schemaVersion, "observation-context-v3");
    assert.equal(context.location.kind, "PENDING_PROPOSAL");
    assert.deepEqual(context.location.wgs84, attempt.snapshot.candidateLocation!.wgs84);
    assert.equal(context.privateProposal.ownerId, owner.userId);
    assert.equal(context.privateProposal.attemptId, attempt.attemptId);
    assert.equal((await send()).status, 403);
    assert.equal((await send(stranger.accessToken)).status, 404);
    const route = base + "/v2/observation-contexts/" + encodeURIComponent(context.contextId);
    assert.equal((await fetch(route)).status, 403);
    assert.equal((await fetch(route, { headers: { authorization: "Bearer " + stranger.accessToken } })).status, 403);
    assert.equal((await fetch(route, { headers: { authorization: "Bearer " + owner.accessToken } })).status, 200);
    const changed = await fetch(route, { method: "PUT", headers: { "content-type": "application/json", authorization: "Bearer " + owner.accessToken },
      body: JSON.stringify({ expectedRevision: context.revision, selectedAt: "2026-10-05T13:30:00.000Z" }) });
    assert.equal(changed.status, 200);
    const latest = (await changed.json()).data;
    assert.equal(latest.selectedAtUtc, "2026-10-05T13:30:00.000Z");
    assert.deepEqual(latest.privateProposal, context.privateProposal);
    const occurrence = service.getAstronomicalEvents().data.events[0]!.occurrenceId;
    for (const path of ["/v2/map/scene?contextId=", "/v2/astronomical-events/" + encodeURIComponent(occurrence) + "?contextId="]) {
      const denied = await fetch(base + path + encodeURIComponent(context.contextId), { headers: { authorization: "Bearer " + stranger.accessToken } });
      assert.equal(denied.status, 403); assert.equal((await denied.json()).data, undefined);
    }
    for (const location of [{ kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
      { kind: "MAP_POINT", displayName: "公开地图中心", wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 }, source: "MAP_VIEWPORT" }]) {
      const publicResult = await fetch(base + "/v2/observation-contexts/resolve", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, location }) });
      assert.equal(publicResult.status, 201);
      const publicContext = (await publicResult.json()).data;
      assert.equal(publicContext.schemaVersion, "observation-context-v2"); assert.equal(publicContext.privateProposal, undefined);
      assert.equal((await fetch(base + "/v2/observation-contexts/" + encodeURIComponent(publicContext.contextId))).status, 200);
    }
  } finally { await app.close(); }
});

test("pending authorization reads frozen coordinates, accepts review metadata and rejects replaced/revoked attempts", async () => {
  const f = await privateFixture();
  try {
    const initial = await f.service.observationContexts.resolve(f.input, f.owner.userId);
    f.change({ revision: f.get().revision + 2, submissionState: "ACCEPTED", mergeState: "MERGED", spotId: TEST_PUBLISHED_SPOT.spotId,
      candidateLocation: { ...f.get().candidateLocation!, wgs84: { system: "WGS84", latitude: 23, longitude: 115 } } });
    const getSpot = f.repository.getSpot.bind(f.repository);
    f.repository.getSpot = async () => null;
    const accepted = await f.service.observationContexts.get(initial.contextId, f.owner.userId);
    assert.deepEqual(accepted.location, initial.location);
    assert.equal(accepted.revision, initial.revision, "review and merged-but-unpublished metadata are not a new frozen location");
    for (const submissionState of ["DRAFT", "CHANGES_REQUESTED", "REJECTED", "WITHDRAWN"] as const) {
      f.change({ submissionState });
      await assert.rejects(f.service.observationContexts.get(initial.contextId, f.owner.userId), /permission_denied/);
      await assert.rejects(f.service.observationContexts.resolve(f.input, f.owner.userId), /permission_denied/);
    }
    f.change({ submissionState: "PENDING_REVIEW", preciseLocationConsent: false });
    await assert.rejects(f.service.observationContexts.get(initial.contextId, f.owner.userId), /permission_denied/);
    f.change({ preciseLocationConsent: true, attempts: [...f.get().attempts, { ...f.get().attempts[0]!, attemptId: "contribution-attempt:successor", attemptNo: 2, baseRevision: 8 }] });
    await assert.rejects(f.service.observationContexts.get(initial.contextId, f.owner.userId), /permission_denied/);
    await assert.rejects(f.service.observationContexts.resolve(f.input, f.owner.userId), /permission_denied/);
    f.repository.getSpot = getSpot;
  } finally { await f.service.onModuleDestroy(); }
});

test("authoritative mapping CAS preserves time and original expiry and cannot revert after formal access disappears", async () => {
  const f = await privateFixture();
  try {
    const initial = await f.service.observationContexts.resolve(f.input, f.owner.userId);
    f.change({ submissionState: "ACCEPTED", mergeState: "MERGED", spotId: TEST_PUBLISHED_SPOT.spotId, publicationImpact: "SPOT_PUBLISHED" });
    const [a, b] = await Promise.all([f.service.observationContexts.get(initial.contextId, f.owner.userId), f.service.observationContexts.get(initial.contextId, f.owner.userId)]);
    assert.equal(a.location.kind, "FORMAL_SPOT"); assert.deepEqual(a, b);
    assert.equal(a.contextId, initial.contextId); assert.equal(a.revision, initial.revision + 1);
    assert.equal(a.selectedAtUtc, initial.selectedAtUtc); assert.equal(a.localDate, initial.localDate);
    assert.equal(a.createdAt, initial.createdAt); assert.equal(a.expiresAt, initial.expiresAt);
    assert.deepEqual(a.privateProposal, initial.privateProposal); assert.notEqual(a.contextFingerprint, initial.contextFingerprint);
    assert.equal((await f.service.observationContexts.update(a.contextId, { expectedRevision: a.revision, selectedAt: "2026-10-05T13:30:00.000Z" }, f.owner.userId)).location.kind, "FORMAL_SPOT");
    f.repository.getSpot = async () => null;
    await assert.rejects(f.service.observationContexts.get(a.contextId, f.owner.userId), /formal_spot_not_found/);
    await assert.rejects(f.service.observationContexts.resolve(f.input, f.owner.userId), /formal_spot_not_found/);
    assert.equal((await f.cache.get<typeof a>(`observation-context:${a.contextId}`))!.location.kind, "FORMAL_SPOT", "denial cannot revive a pending marker");
  } finally { await f.service.onModuleDestroy(); }
});

test("a withdrawal during an awaited private Context write is rejected at the return boundary", async () => {
  const f = await privateFixture();
  try {
    const initial = await f.service.observationContexts.resolve(f.input, f.owner.userId);
    const replace = f.cache.replaceIfRevision.bind(f.cache);
    f.cache.replaceIfRevision = async (...args) => { f.change({ submissionState: "WITHDRAWN" }); return replace(...args); };
    await assert.rejects(f.service.observationContexts.update(initial.contextId, { expectedRevision: initial.revision, selectedAt: "2026-10-05T13:30:00.000Z" }, f.owner.userId), /permission_denied/);
    await assert.rejects(f.service.observationContexts.get(initial.contextId, f.owner.userId), /permission_denied/);
  } finally { await f.service.onModuleDestroy(); }
});

test("mapped authority and expiry are rechecked after an awaited canonical read", async () => {
  const f = await privateFixture();
  try {
    const initial = await f.service.observationContexts.resolve(f.input, f.owner.userId);
    f.change({ submissionState: "ACCEPTED", mergeState: "MERGED", spotId: TEST_PUBLISHED_SPOT.spotId, publicationImpact: "SPOT_PUBLISHED" });
    const mapped = await f.service.observationContexts.get(initial.contextId, f.owner.userId);
    const readSpot = f.repository.getSpot.bind(f.repository);
    f.repository.getSpot = async (id) => { const spot = await readSpot(id); f.change({ submissionState: "WITHDRAWN" }); return spot; };
    await assert.rejects(f.service.observationContexts.get(mapped.contextId, f.owner.userId), /permission_denied/);
    f.change({ submissionState: "ACCEPTED" });
    const expiring = { ...mapped, expiresAt: new Date(Date.now() + 50).toISOString() };
    await f.cache.set(`observation-context:${mapped.contextId}`, expiring, 60);
    f.repository.getSpot = async (id) => { await new Promise(resolve => setTimeout(resolve, 100)); return readSpot(id); };
    await assert.rejects(f.service.observationContexts.get(mapped.contextId, f.owner.userId), /observation_context_expired/);
  } finally { await f.service.onModuleDestroy(); }
});
