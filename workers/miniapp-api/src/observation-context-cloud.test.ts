import assert from "node:assert/strict";
import test from "node:test";
import {
  CLOUD_SAMPLING_POLICY, copyTotalCloudContext, TOTAL_CLOUD_CONTEXT_SCHEMA, TOTAL_CLOUD_POLICY,
  totalCloudSupports240Hours, unavailableTotalCloud,
  type ContributionSubmission, type ObservationContextResolveRequest, type TotalCloudContext, type TotalCloudPublicationPin,
} from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { MemoryCache } from "./cache.ts";
import { ObservationContextService } from "./observation-context-service.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

// Synthetic identities test protocol/lifecycle only, never real data readiness.
const pin = (version: "a" | "b"): TotalCloudPublicationPin => ({
  schemaVersion: TOTAL_CLOUD_CONTEXT_SCHEMA, policy: TOTAL_CLOUD_POLICY, state: "PINNED",
  publicationId: `ecmwf-tcc:${version.repeat(64)}`, manifestSha256: (version === "a" ? "1" : "2").repeat(64),
  runAt: "2026-10-27T00:00:00Z", validFrom: "2026-10-27T00:00:00Z", validTo: "2026-11-07T12:00:00Z",
  supports240HoursUntil: "2026-10-28T12:00:00Z", samplingPolicy: CLOUD_SAMPLING_POLICY,
});
const input = {
  location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
  localDate: "2026-10-27", selectedAt: "2026-10-27T16:00:00.000Z", totalCloudPolicy: TOTAL_CLOUD_POLICY,
} satisfies ObservationContextResolveRequest;

function fixture() {
  const repository = new InMemoryTestRepository(), cache = new MemoryCache(), config = createTestRuntimeConfig();
  let selected: TotalCloudContext | null | Error = pin("a"), calls = 0;
  const owner = { selectCurrent: async () => { calls++; if (selected instanceof Error) throw selected; return selected; } };
  const service = new ObservationContextService(repository, cache, config, undefined, owner);
  return { service, repository, cache, config, owner, calls: () => calls,
    choose(value: TotalCloudContext | null | Error) { selected = value; }, close: () => cache.close() };
}

test("legacy and unconfigured Contexts retain the declared QWeather contract without selecting data", async () => {
  const f = fixture();
  try {
    const { totalCloudPolicy: _, ...legacyInput } = input;
    const legacy = await f.service.resolve(legacyInput);
    assert.equal(legacy.schemaVersion, "observation-context-v2");
    assert.equal(legacy.weatherView.totalCloud, undefined);
    assert.equal(f.calls(), 0);
    f.choose(null);
    const unconfigured = await f.service.resolve(input);
    assert.equal(unconfigured.weatherView.totalCloud, undefined);
    assert.equal(unconfigured.weatherView.primaryPolicy, "QWEATHER");
    await assert.rejects(f.service.update(legacy.contextId, { expectedRevision: 1, refreshTotalCloud: true }), /refresh_requires_policy/u);
    assert.equal(f.calls(), 1, "a legacy edit does not implicitly negotiate a new supplier");
  } finally { await f.close(); }
});

test("resolve pins the server choice and read/time edits do not follow latest or accept a client pin", async () => {
  const f = fixture();
  try {
    const spoofed = { ...input, totalCloud: pin("b"), weatherView: { totalCloud: pin("b") } };
    const initial = await f.service.resolve(spoofed);
    assert.deepEqual(initial.weatherView.totalCloud, pin("a"));
    f.choose(pin("b"));
    const read = await f.service.get(initial.contextId);
    const changed = await f.service.update(initial.contextId, { expectedRevision: 1, selectedAt: "2026-10-27T16:30:00.000Z" });
    assert.deepEqual(read.weatherView.totalCloud, pin("a"));
    assert.deepEqual(changed.weatherView.totalCloud, pin("a"));
    assert.equal(changed.contextFingerprint, initial.contextFingerprint);
    assert.equal(changed.selectedAtUtc, "2026-10-27T16:30:00.000Z");
    assert.equal(changed.revision, 2);
    assert.equal(changed.expiresAt, initial.expiresAt);
    assert.equal(f.calls(), 1);
  } finally { await f.close(); }
});

test("legacy adoption is an explicit CAS; unconfigured stays legacy and failure keeps the committed Context", async () => {
  const f = fixture();
  try {
    const { totalCloudPolicy: _, ...legacyInput } = input;
    const legacy = await f.service.resolve(legacyInput);
    await assert.rejects(f.service.update(legacy.contextId, { expectedRevision: 1, totalCloudPolicy: TOTAL_CLOUD_POLICY }), /policy_invalid/u);
    f.choose(unavailableTotalCloud("NOT_READY"));
    await assert.rejects(f.service.update(legacy.contextId, { expectedRevision: 1, refreshTotalCloud: true,
      totalCloudPolicy: TOTAL_CLOUD_POLICY }), /refresh_provider_unavailable/u);
    assert.deepEqual(await f.service.get(legacy.contextId), legacy);
    f.choose(null);
    const unchanged = await f.service.update(legacy.contextId, { expectedRevision: 1, refreshTotalCloud: true,
      totalCloudPolicy: TOTAL_CLOUD_POLICY });
    assert.equal(unchanged.weatherView.totalCloud, undefined);
    assert.equal(unchanged.revision, 2);
    assert.equal(unchanged.contextFingerprint, legacy.contextFingerprint);
    assert.equal(unchanged.expiresAt, legacy.expiresAt);
    f.choose(pin("b"));
    const adopted = await f.service.update(legacy.contextId, { expectedRevision: 2, refreshTotalCloud: true,
      totalCloudPolicy: TOTAL_CLOUD_POLICY });
    assert.deepEqual(adopted.weatherView.totalCloud, pin("b"));
    assert.equal(adopted.contextId, legacy.contextId);
    assert.equal(adopted.expiresAt, legacy.expiresAt);
    assert.notEqual(adopted.contextFingerprint, legacy.contextFingerprint);
    await assert.rejects(f.service.update(legacy.contextId, { expectedRevision: 2, refreshTotalCloud: true,
      totalCloudPolicy: TOTAL_CLOUD_POLICY }), /context_conflict/u);
  } finally { await f.close(); }
});

test("cache recovery re-admits the exact public pin and cannot select current or demote a failed binding", async () => {
  const f = fixture();
  try {
    let restored = 0;
    const service = new ObservationContextService(f.repository, f.cache, f.config, undefined, {
      selectCurrent: async () => { throw new Error("must_not_read_current"); },
      restore: async binding => { restored++; assert.deepEqual(binding, pin("a")); return pin("a"); },
    });
    const recovered = await service.resolve({ ...input, restoreTotalCloud: pin("a") });
    assert.deepEqual(recovered.weatherView.totalCloud, pin("a"));
    assert.equal(restored, 1);
    const unavailable = unavailableTotalCloud("READ_FAILED");
    const failed = await service.resolve({ ...input, restoreTotalCloud: unavailable });
    assert.deepEqual(failed.weatherView.totalCloud, unavailable);
    assert.equal(restored, 1, "unavailable keeps its source contract without following latest");
    const before = (await f.cache.operationsSnapshot()).entries;
    // The generic selector has no authority to re-admit a client identity.
    await assert.rejects(f.service.resolve({ ...input, restoreTotalCloud: pin("a") }), /restore_provider_unavailable/u);
    const wrong = new ObservationContextService(f.repository, f.cache, f.config, undefined, {
      selectCurrent: async () => pin("b"), restore: async () => pin("b"),
    });
    await assert.rejects(wrong.resolve({ ...input, restoreTotalCloud: pin("a") }), /restore_provider_unavailable/u);
    const { totalCloudPolicy: _policy, ...noPolicy } = input;
    await assert.rejects(service.resolve({ ...noPolicy, restoreTotalCloud: pin("a") }), /binding_invalid/u);
    assert.equal((await f.cache.operationsSnapshot()).entries, before, "a failed restore creates no replacement Context");
    assert.equal(f.calls(), 0);
  } finally { await f.close(); }
});

test("all server-side child resolutions inherit the same pin, unavailable state or legacy lane", async () => {
  const f = fixture();
  try {
    const parent = await f.service.resolve(input);
    f.choose(pin("b"));
    const inherited = await f.service.resolve(input, null, { totalCloud: parent.weatherView.totalCloud });
    const legacy = await f.service.resolve(input, null, { totalCloud: undefined });
    const unavailable = await f.service.resolve(input, null, { totalCloud: unavailableTotalCloud("NOT_READY") });
    assert.deepEqual(inherited.weatherView.totalCloud, pin("a"));
    assert.equal(legacy.weatherView.totalCloud, undefined);
    assert.deepEqual(unavailable.weatherView.totalCloud, unavailableTotalCloud("NOT_READY"));
    assert.equal(f.calls(), 1, "a candidate never resolves latest independently of its parent");
    await assert.rejects(f.service.resolve(input, null, {} as { totalCloud: undefined }), /binding_invalid/u);
  } finally { await f.close(); }
});

test("configured selection failure remains ECMWF unavailable and does not poison independent Context editing", async () => {
  const f = fixture();
  try {
    f.choose(new Error("simulated_source_read_failure"));
    const failed = await f.service.resolve(input);
    assert.deepEqual(failed.weatherView.totalCloud, unavailableTotalCloud("READ_FAILED"));
    assert.equal(failed.weatherView.primaryPolicy, "QWEATHER", "other weather keeps its separate provider");
    const edited = await f.service.update(failed.contextId, { expectedRevision: 1, selectedAt: "2026-10-27T16:30:00.000Z" });
    assert.deepEqual(edited.weatherView.totalCloud, failed.weatherView.totalCloud);
    assert.equal(f.calls(), 1);
    f.choose(unavailableTotalCloud("NOT_READY"));
    const notReady = await f.service.resolve(input);
    assert.deepEqual(notReady.weatherView.totalCloud, unavailableTotalCloud("NOT_READY"));
  } finally { await f.close(); }
});

test("refresh failures retain the complete durable Context and a successful refresh changes one shared fingerprint", async () => {
  const f = fixture();
  try {
    const initial = await f.service.resolve(input);
    for (const next of [null, unavailableTotalCloud("NOT_READY"), new Error("source_unavailable")]) {
      f.choose(next);
      await assert.rejects(f.service.update(initial.contextId, { expectedRevision: 1, refreshTotalCloud: true,
        selectedAt: "2026-10-27T16:30:00.000Z" }), /refresh_provider_unavailable/u);
      assert.deepEqual(await f.service.get(initial.contextId), initial);
    }
    f.choose(pin("b"));
    const changed = await f.service.update(initial.contextId, { expectedRevision: 1, refreshTotalCloud: true });
    assert.deepEqual(changed.weatherView.totalCloud, pin("b"));
    assert.notEqual(changed.contextFingerprint, initial.contextFingerprint);
    assert.equal(changed.contextId, initial.contextId);
    assert.equal(changed.revision, 2);
    assert.equal(changed.selectedAtUtc, initial.selectedAtUtc);
    assert.equal(changed.expiresAt, initial.expiresAt);
    assert.deepEqual(await f.service.get(initial.contextId), changed);
  } finally { await f.close(); }
});

test("a slow refresh cannot overwrite a concurrent time edit and expiry cannot be revived", async () => {
  const f = fixture();
  try {
    const initial = await f.service.resolve(input);
    let release!: () => void, started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const refresher = new ObservationContextService(f.repository, f.cache, f.config, undefined, {
      selectCurrent: async () => { started(); await gate; return pin("b"); },
    });
    const pending = refresher.update(initial.contextId, { expectedRevision: 1, refreshTotalCloud: true });
    const rejected = assert.rejects(pending, /observation_context_conflict/u);
    await entered;
    const timeEdit = await f.service.update(initial.contextId, { expectedRevision: 1, selectedAt: "2026-10-27T16:30:00.000Z" });
    release(); await rejected;
    assert.deepEqual(await f.service.get(initial.contextId), timeEdit);
    assert.deepEqual(timeEdit.weatherView.totalCloud, pin("a"));

    const replace = f.cache.replaceIfRevision.bind(f.cache);
    f.cache.replaceIfRevision = async (...args) => { await f.cache.deleteByPrefix(`observation-context:${initial.contextId}`); return replace(...args); };
    await assert.rejects(f.service.update(initial.contextId, { expectedRevision: 2, refreshTotalCloud: true }), /observation_context_not_found/u);
    assert.equal(await f.cache.get(`observation-context:${initial.contextId}`), null);
  } finally { await f.close(); }
});

test("awaiting a publication cannot extend a precise route-origin Context past its absolute expiry", async () => {
  const f = fixture();
  try {
    const origin = await f.service.resolve({ location: { kind: "MAP_POINT", displayName: "授权当前位置", source: "USER_LOCATION",
      wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 } }, localDate: input.localDate, selectedAt: input.selectedAt });
    const expiring = { ...origin, expiresAt: new Date(Date.now() + 1_000).toISOString() };
    await f.cache.set(`observation-context:${origin.contextId}`, expiring, 60);
    let selected = 0;
    const slow = new ObservationContextService(f.repository, f.cache, f.config, undefined, {
      selectCurrent: async () => { selected++; await new Promise(resolve => setTimeout(resolve, 1_100)); return pin("a"); },
    });
    await assert.rejects(slow.resolve({ ...input, routeOriginContextId: origin.contextId }), /observation_context_expired/u);
    assert.equal(selected, 1, "the origin was valid when selection started; it expired during the wait");
    assert.equal((await f.cache.operationsSnapshot()).entries, 1, "no child Context was stored after its authority expired");
  } finally { await f.close(); }
});

test("precise cache recovery keeps the original absolute permission deadline", async () => {
  const f = fixture();
  try {
    const deadline = new Date(Date.now() + 30_000).toISOString();
    const request: ObservationContextResolveRequest = { ...input,
      location: { kind: "MAP_POINT", displayName: "当前地点", source: "USER_LOCATION",
        wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 } }, restoreExpiresAt: deadline };
    const recovered = await f.service.resolve(request);
    assert.equal(recovered.privacyClass, "SESSION_PRECISE");
    assert.equal(recovered.expiresAt, deadline);
    await assert.rejects(f.service.resolve({ ...request, restoreExpiresAt: new Date(Date.now() - 1).toISOString() }), /context_expired/u);
    await assert.rejects(f.service.resolve({ ...request, restoreExpiresAt: "invalid" }), /recovery_invalid/u);
    assert.equal((await f.cache.operationsSnapshot()).entries, 1);
  } finally { await f.close(); }
});

test("binding validation rejects false identity/time coverage and never demotes corrupt stored bindings", async () => {
  const f = fixture();
  try {
    const canonical = copyTotalCloudContext({ ...pin("a"), runAt: "2026-10-27T08:00:00+08:00" });
    assert.deepEqual(canonical, pin("a"));
    assert.equal(totalCloudSupports240Hours(canonical, Date.parse("2026-10-28T12:00:00Z")), true);
    assert.equal(totalCloudSupports240Hours(canonical, Date.parse("2026-10-28T12:00:01Z")), false);
    for (const malformed of [{ ...pin("a"), runAt: "2026-10-27T00:00:00" }, { ...pin("a"), validTo: "2026-11-31T00:00:00Z" },
      { ...pin("a"), supports240HoursUntil: "2026-10-29T12:00:00Z" }, { ...pin("a"), manifestSha256: "incorrect" },
      { ...pin("a"), directory: "C:/not-a-client-capability" }])
      assert.throws(() => copyTotalCloudContext(malformed), /binding_invalid/u);
    await assert.rejects(f.service.resolve({ ...input, totalCloudPolicy: "UNKNOWN" } as unknown as ObservationContextResolveRequest), /policy_invalid/u);
    const initial = await f.service.resolve(input);
    const corrupted = { ...initial, weatherView: { ...initial.weatherView, totalCloud: { ...pin("a"), samplingPolicy: "unknown" } } };
    await f.cache.set(`observation-context:${initial.contextId}`, corrupted, 60);
    await assert.rejects(f.service.get(initial.contextId), /binding_invalid/u);
    assert.deepEqual(await f.cache.get(`observation-context:${initial.contextId}`), corrupted, "failure neither erases the Context nor drops its selected provider");
  } finally { await f.close(); }
});

test("cloud publication negotiation keeps v3 private authority and late withdrawal checks", async () => {
  const f = fixture(), product = createTestMiniappService({ repository: f.repository, cache: f.cache, config: f.config });
  try {
    const owner = (await product.auth.login({ code: "local:cloud-context-owner" })).data;
    const stranger = (await product.auth.login({ code: "local:cloud-context-stranger" })).data;
    const draft = await product.contributions.createDraft(owner.userId, {
      kind: "NEW_SPOT_PROPOSAL", spotId: null,
      candidateLocation: { displayName: "绑定的待审位置", region: "", wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 } },
      observedAt: null, topics: [], detail: "", rightsConfirmed: false, preciseLocationConsent: true,
      candidateProfile: { fields: { name: "绑定的待审位置" }, media: {}, intake: { version: 1, openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
        contact: { kind: "UNKNOWN", number: "", purpose: "", source: "", publicPermissionConfirmed: false } } },
    }, "cloud-context-draft");
    let submitted = await product.contributions.submit(owner.userId, draft.submissionId, draft.revision, "cloud-context-submit");
    const attempt = submitted.attempts.at(-1)!;
    const read = f.repository.getContribution.bind(f.repository);
    f.repository.getContribution = async (user, id) => user === owner.userId && id === submitted.submissionId ? structuredClone(submitted) : read(user, id);
    const request: ObservationContextResolveRequest = { ...input, location: { kind: "PENDING_PROPOSAL", submissionId: submitted.submissionId,
      attemptId: attempt.attemptId, attemptBaseRevision: attempt.baseRevision } };
    const context = await f.service.resolve(request, owner.userId);
    assert.equal(context.schemaVersion, "observation-context-v3");
    assert.equal(context.privacyClass, "ACCOUNT_PRIVATE");
    assert.equal(context.privateProposal?.ownerId, owner.userId);
    assert.deepEqual(context.weatherView.totalCloud, pin("a"));
    await assert.rejects(f.service.get(context.contextId), /permission_denied/u);
    await assert.rejects(f.service.get(context.contextId, stranger.userId), /permission_denied/u);
    await assert.rejects(f.service.update(context.contextId, { expectedRevision: 1, refreshTotalCloud: true }, stranger.userId), /permission_denied/u);
    const late = new ObservationContextService(f.repository, f.cache, f.config, undefined, {
      selectCurrent: async () => {
        submitted = { ...submitted, submissionState: "WITHDRAWN" } as ContributionSubmission;
        return pin("b");
      },
    });
    await assert.rejects(late.update(context.contextId, { expectedRevision: 1, refreshTotalCloud: true }, owner.userId), /permission_denied/u);
    await assert.rejects(f.service.get(context.contextId, owner.userId), /permission_denied/u);
  } finally { await product.onModuleDestroy(); }
});
