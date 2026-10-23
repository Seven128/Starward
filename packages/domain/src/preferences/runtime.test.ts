import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createUnrestrictedProfile, type PreferenceProfile } from "./index";
import { createPreferencesRuntime, type PreferenceRuntimeInput, type PreferenceRuntimeRecord, type PreferenceRuntimeStorage } from "./runtime";
import { createNodeSqliteStorage } from "./sqlite-storage";

const STATE_KEY = "preferences-runtime-state";
const ACTOR = "personal-trial-owner";
const OUTCOME = "mobile-shell-and-preferences" as const;
const INSTANT = "2026-10-23T08:00:00.000Z";

function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function digest(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }
function profile(id: string, revision = 1): PreferenceProfile {
  return { ...createUnrestrictedProfile(INSTANT), id, name: `观测-${id}`, revision };
}
function input(operation: PreferenceRuntimeInput["operation"], payload: Record<string, unknown>, nonce: string, actorId = ACTOR): PreferenceRuntimeInput {
  return { outcome: OUTCOME, actorId, operation, idempotencyKey: nonce, payload };
}
function save(candidate: PreferenceProfile, nonce = `${candidate.id}-${candidate.revision}`): PreferenceRuntimeInput {
  return input("preference.save", { token: candidate.name, profile: candidate }, nonce);
}
function memoryStorage(initial?: string) {
  const rows = new Map<string, string>(initial === undefined ? [] : [[STATE_KEY, initial]]);
  const storage: PreferenceRuntimeStorage = {
    kind: "sqlite", read: async key => rows.get(key) ?? null,
    async compareAndSwap(key, expected, value) {
      if ((rows.get(key) ?? null) !== expected) return false;
      rows.set(key, value);
      return true;
    },
  };
  return { rows, storage };
}
async function commit(runtime: Awaited<ReturnType<typeof createPreferencesRuntime>>, command: PreferenceRuntimeInput) {
  const prepared = await runtime.prepare(command);
  return { prepared, receipt: await runtime.execute(prepared) };
}
function legacyState(commands: PreferenceRuntimeInput[]) {
  const records: PreferenceRuntimeRecord[] = commands.map((command, index) => ({
    outcome: command.outcome, actorId: command.actorId, operation: command.operation,
    idempotencyKey: command.idempotencyKey, entityId: `legacy-${index}`,
    inputDigest: digest({ outcome: command.outcome, actorId: command.actorId, operation: command.operation, payload: command.payload }),
    stateVersion: index + 1, result: { token: command.payload.token, payload: command.payload, committedAt: INSTANT }, committedAt: INSTANT,
  }));
  // Serialized property order deliberately differs from commit order.
  return JSON.stringify({
    schemaVersion: "starward-preferences-runtime-v1", revision: records.length,
    records: Object.fromEntries([...records].reverse().map(record => [record.entityId, record])),
    idempotency: Object.fromEntries(records.map(record => [record.idempotencyKey, record.entityId])),
  }, null, 2);
}
async function withSqlite(run: (dataDir: string, open: () => ReturnType<typeof createPreferencesRuntime>) => Promise<void>) {
  const dataDir = await mkdtemp(join(tmpdir(), "starward-preferences-v2-"));
  const runtimes: Awaited<ReturnType<typeof createPreferencesRuntime>>[] = [];
  const open = async () => { const runtime = await createPreferencesRuntime({ dataDir }); runtimes.push(runtime); return runtime; };
  try { await run(dataDir, open); }
  finally {
    await Promise.all(runtimes.map(runtime => runtime.close()));
    // Only this invocation's generated temporary database is removed.
    expect(dirname(resolve(dataDir))).toBe(resolve(tmpdir()));
    expect(dataDir.split(/[\\/]/u).at(-1)).toMatch(/^starward-preferences-v2-/u);
    await rm(dataDir, { recursive: true });
  }
}

describe("preferences runtime v2", () => {
  it("rejects a changed payload under the same key without changing the committed state", async () => {
    const { rows, storage } = memoryStorage();
    const runtime = await createPreferencesRuntime({ storage });
    try {
      const original = await runtime.prepare(save(profile("alpha"), "profile-bound-input"));
      expect(original).toMatchObject({ baseRevision: 0, idempotencyKey: "preferences-v2:0:profile-bound-input" });
      const committed = await runtime.execute(original);
      const raw = rows.get(STATE_KEY);
      for (const changed of [
        { ...original, payload: { ...original.payload, token: "已经更改" } },
        { ...original, actorId: "different-owner" },
        { ...original, baseRevision: 1 },
        { ...original, operation: "preference.activate" as const, payload: { token: "alpha", profileId: "alpha" } },
      ]) {
        await expect(runtime.execute(changed)).rejects.toThrow("preference_runtime_idempotency_conflict");
        expect(rows.get(STATE_KEY)).toBe(raw);
      }
      const equivalent = { ...original, payload: { profile: Object.fromEntries(Object.entries(original.payload.profile as object).reverse()), token: original.payload.token } };
      await expect(runtime.execute(equivalent)).resolves.toMatchObject({ status: "replayed", entityId: committed.entityId, stateVersion: 1 });
      expect(await runtime.getProjection({ actorId: ACTOR })).toEqual({ profiles: [profile("alpha")], activeProfileId: "alpha", revision: 1 });
      expect(rows.get(STATE_KEY)).toBe(raw);
    } finally { await runtime.close(); }
  });

  it("survives SQLite restart and returns current projection when an older retained save is replayed", async () => {
    await withSqlite(async (_dataDir, open) => {
      const runtime = await open();
      const alpha = await commit(runtime, save(profile("alpha", 2))); // First save of an unsaved revision-1 preset.
      const beta = await commit(runtime, save(profile("beta")));
      expect(alpha.receipt.inputDigest).toBe(digest({ outcome: OUTCOME, actorId: ACTOR, operation: alpha.prepared.operation, payload: alpha.prepared.payload }));
      expect(beta.receipt.projection).toEqual({ profiles: [profile("alpha", 2), profile("beta")], activeProfileId: "beta", revision: 2 });
      await runtime.close();
      const restarted = await open();
      expect(await restarted.getProjection({ actorId: ACTOR })).toEqual(beta.receipt.projection);
      expect(await restarted.read({ outcome: OUTCOME, actorId: ACTOR, entityId: alpha.receipt.entityId })).toMatchObject({ status: "succeeded", inputDigest: alpha.receipt.inputDigest });
      const replay = await restarted.execute(alpha.prepared);
      expect(replay).toMatchObject({ status: "replayed", sideEffects: [], entityId: alpha.receipt.entityId, projection: beta.receipt.projection });
      expect(replay.projection.activeProfileId).toBe("beta");
      expect(await restarted.getProjection({ actorId: ACTOR })).toEqual(beta.receipt.projection);
    });
  });

  it("retires superseded receipts without making old commands eligible again, including after restart", async () => {
    const { rows, storage } = memoryStorage();
    const runtime = await createPreferencesRuntime({ storage });
    const first = await commit(runtime, save(profile("alpha")));
    const second = await commit(runtime, save({ ...profile("alpha", 2), name: "更新后的预设" }));
    await runtime.close();
    const restarted = await createPreferencesRuntime({ storage });
    try {
      const raw = rows.get(STATE_KEY);
      await expect(restarted.execute(first.prepared)).rejects.toThrow("preference_runtime_stale_command");
      expect(await restarted.read({ outcome: OUTCOME, actorId: ACTOR, entityId: first.receipt.entityId })).toMatchObject({ status: "not-found" });
      expect(await restarted.list({ actorId: ACTOR })).toHaveLength(1);
      expect(await restarted.getProjection({ actorId: ACTOR })).toEqual(second.receipt.projection);
      expect(rows.get(STATE_KEY)).toBe(raw);
      const later = await restarted.prepare(save({ ...profile("alpha", 3), name: "新意图" }, "later-intent"));
      expect(later.baseRevision).toBe(2);
      expect(later.idempotencyKey).toBe("preferences-v2:2:later-intent");
      expect((await restarted.execute(later)).projection.profiles[0].name).toBe("新意图");
    } finally { await restarted.close(); }
  });

  it("bounds receipts by current responsibilities while retaining all independently saved profiles", async () => {
    const { rows, storage } = memoryStorage();
    const runtime = await createPreferencesRuntime({ storage });
    try {
      for (let revision = 1; revision <= 24; revision += 1) {
        for (const id of ["alpha", "beta"]) await commit(runtime, save(profile(id, revision)));
        await commit(runtime, input("preference.activate", { token: "alpha", profileId: "alpha" }, `active-${revision}`));
        await commit(runtime, input("shell.location.set", { token: `位置${revision}`, source: "manual", label: `位置${revision}` }, `location-${revision}`));
        await commit(runtime, input("shell.destination.set", { token: "sky", destination: "sky" }, `destination-${revision}`));
      }
      let state = JSON.parse(rows.get(STATE_KEY)!);
      expect(state.schemaVersion).toBe("starward-preferences-runtime-v2");
      expect(state).not.toHaveProperty("records");
      expect(state).not.toHaveProperty("idempotency");
      expect(state.actors).toHaveLength(1);
      expect(state.actors[0].receipts).toHaveLength(5);
      expect(state.actors[0].receipts.flatMap((receipt: { slots: string[] }) => receipt.slots).sort()).toEqual(["active", "destination", "location", "profile:alpha", "profile:beta"]);
      const projection = await runtime.getProjection({ actorId: ACTOR });
      expect(projection).toEqual({ profiles: [profile("alpha", 24), profile("beta", 24)], activeProfileId: "alpha", location: { source: "manual", label: "位置24" }, activeDestination: "sky", revision: 120 });
      const newProfiles = Array.from({ length: 12 }, (_, index) => profile(`independent-${index}`));
      for (const candidate of newProfiles) await commit(runtime, save(candidate));
      expect((await runtime.getProjection({ actorId: ACTOR })).profiles).toEqual([...projection.profiles, ...newProfiles]);
      state = JSON.parse(rows.get(STATE_KEY)!);
      expect(state.actors[0].receipts.length).toBeLessThanOrEqual(14 + 3);
      expect(await runtime.list({ actorId: ACTOR })).toHaveLength(state.actors[0].receipts.length);
    } finally { await runtime.close(); }
  });

  it("migrates v1 in commit order, preserves raw bytes, location history and destination aliases across restart", async () => {
    const alpha = profile("alpha", 2);
    const beta = profile("beta");
    const updatedAlpha = { ...alpha, revision: 3, name: "新名字" };
    const goodLocation = { token: "零经纬", source: "device", label: "零经纬", latitude: 0, longitude: 0 };
    const commands = [
      save(alpha), save(beta), save(updatedAlpha),
      input("preference.activate", { token: beta.id, profileId: beta.id }, "legacy-active"),
      input("shell.location.set", goodLocation, "legacy-good-location"),
      input("shell.location.set", { ...goodLocation, latitude: 200 }, "legacy-invalid-location"),
      input("shell.destination.set", { token: "itinerary", destination: "itinerary" }, "legacy-trips"),
      input("shell.destination.set", { token: "profile", destination: "profile" }, "legacy-me", "second-actor"),
    ];
    const raw = legacyState(commands);
    const expected = {
      profiles: [updatedAlpha, beta], activeProfileId: "beta",
      location: { source: "device", label: "零经纬", latitude: 0, longitude: 0 }, activeDestination: "trips", revision: commands.length,
    };
    await withSqlite(async (dataDir, open) => {
      const storage = await createNodeSqliteStorage(dataDir);
      try {
        expect(await storage.compareAndSwap(STATE_KEY, null, raw)).toBe(true);
        const runtime = await open();
        expect(await runtime.getProjection({ actorId: ACTOR })).toEqual(expected);
        expect(await runtime.getProjection({ actorId: "second-actor" })).toEqual({ profiles: [], activeDestination: "me", revision: commands.length });
        expect(await storage.read(`${STATE_KEY}:legacy:${createHash("sha256").update(raw).digest("hex")}`)).toBe(raw);
        expect(JSON.parse((await storage.read(STATE_KEY))!).schemaVersion).toBe("starward-preferences-runtime-v2");
        await runtime.close();
      } finally { await storage.close?.(); }
      const restarted = await open();
      expect(await restarted.getProjection({ actorId: ACTOR })).toEqual(expected);
      const next = await commit(restarted, save(profile("gamma", 2)));
      expect(next.receipt.stateVersion).toBe(commands.length + 1);
      expect(next.receipt.projection.profiles).toEqual([updatedAlpha, beta, profile("gamma", 2)]);
      expect(next.receipt.projection.location).not.toHaveProperty("accuracyMeters");
      expect(next.receipt.projection.location).not.toHaveProperty("timestampMs");
    });
  });

  it("preserves a legacy digest that cannot be reconstructed from lossy JSON instead of certifying changed input", async () => {
    const historical = save(profile("alpha"), "legacy-lossy");
    historical.payload.legacyOptional = undefined;
    const raw = legacyState([historical]);
    const { rows, storage } = memoryStorage(raw);
    const runtime = await createPreferencesRuntime({ storage });
    try {
      const record = (await runtime.list({ actorId: ACTOR }))[0];
      const migratedBytes = rows.get(STATE_KEY);
      expect(record.inputDigest).toBe(JSON.parse(raw).records["legacy-0"].inputDigest);
      const serializedInput = { ...historical, payload: JSON.parse(JSON.stringify(historical.payload)) };
      await expect(runtime.execute(serializedInput)).rejects.toThrow("preference_runtime_idempotency_conflict");
      await expect(runtime.execute(historical)).resolves.toMatchObject({ status: "replayed", inputDigest: record.inputDigest });
      expect(rows.get(STATE_KEY)).toBe(migratedBytes);
    } finally { await runtime.close(); }
  });

  it.each([
    JSON.stringify({ schemaVersion: "future-v3", revision: 1, actors: [] }),
    JSON.stringify({ schemaVersion: "starward-preferences-runtime-v1", revision: 1, records: {}, idempotency: { orphan: "missing" } }),
    "{broken",
  ])("rejects unrecognized or broken storage without changing its bytes: %s", async raw => {
    const { rows, storage } = memoryStorage(raw);
    const runtime = await createPreferencesRuntime({ storage });
    try {
      await expect(runtime.getProjection({ actorId: ACTOR })).rejects.toThrow();
      expect(rows.get(STATE_KEY)).toBe(raw);
    } finally { await runtime.close(); }
  });

  it.each([undefined, NaN, new Date(INSTANT), 1n])("rejects non-JSON input before storing a new command (%s)", async invalid => {
    const { rows, storage } = memoryStorage();
    const runtime = await createPreferencesRuntime({ storage });
    try {
      const candidate = save(profile("alpha"));
      candidate.payload.invalid = invalid;
      await expect(runtime.prepare(candidate)).rejects.toThrow("preference_runtime_payload_invalid");
      expect(rows.has(STATE_KEY)).toBe(false);
    } finally { await runtime.close(); }
  });

  it("rejects incomplete profiles and invalid coordinates without replacing valid current data", async () => {
    const { rows, storage } = memoryStorage();
    const runtime = await createPreferencesRuntime({ storage });
    try {
      await commit(runtime, save(profile("alpha")));
      const raw = rows.get(STATE_KEY);
      await expect(runtime.prepare(input("preference.save", { token: "generic", profile: { id: "generic", name: "generic", revision: 1 } }, "invalid-profile"))).rejects.toThrow("preference_runtime_payload_invalid");
      await expect(runtime.prepare(input("shell.location.set", { token: "bad-location", source: "device", label: "坏位置", latitude: 200, longitude: 40 }, "invalid-location"))).rejects.toThrow("preference_runtime_payload_invalid");
      expect(rows.get(STATE_KEY)).toBe(raw);
    } finally { await runtime.close(); }
  });

  it("isolates prepared inputs and returned projections from caller mutation", async () => {
    const { storage } = memoryStorage();
    const runtime = await createPreferencesRuntime({ storage });
    try {
      const candidate = profile("alpha");
      const prepared = await runtime.prepare(save(candidate));
      candidate.name = "变更的源对象";
      const receipt = await runtime.execute(prepared);
      expect(receipt.projection.profiles[0]).toEqual(profile("alpha"));
      receipt.projection.profiles[0].name = "变更的响应";
      expect((await runtime.getProjection({ actorId: ACTOR })).profiles[0]).toEqual(profile("alpha"));
    } finally { await runtime.close(); }
  });

  it("recovers a write whose commit reply was lost, without repeating the durable effect", async () => {
    const { rows, storage } = memoryStorage();
    const atomicWrite = storage.compareAndSwap;
    let commits = 0;
    storage.compareAndSwap = async (key, expected, value) => {
      const written = await atomicWrite(key, expected, value);
      if (key === STATE_KEY && written) { commits += 1; throw new Error("lost write reply"); }
      return written;
    };
    const runtime = await createPreferencesRuntime({ storage });
    try {
      const prepared = await runtime.prepare(save(profile("alpha")));
      const receipt = await runtime.execute(prepared);
      expect(receipt.projection).toEqual({ profiles: [profile("alpha")], activeProfileId: "alpha", revision: 1 });
      const raw = rows.get(STATE_KEY);
      await expect(runtime.execute(prepared)).resolves.toMatchObject({ status: "replayed", projection: receipt.projection });
      expect(commits).toBe(1);
      expect(rows.get(STATE_KEY)).toBe(raw);
    } finally { await runtime.close(); }
  });

  it("retains committed state through unknown readback and resolves the same original command on retry", async () => {
    const { rows, storage } = memoryStorage();
    const atomicWrite = storage.compareAndSwap;
    const read = storage.read;
    let unavailable = false;
    storage.read = async key => { if (unavailable) throw new Error("read unavailable"); return read(key); };
    storage.compareAndSwap = async (key, expected, value) => {
      const written = await atomicWrite(key, expected, value);
      if (key === STATE_KEY && written) { unavailable = true; throw new Error("lost write reply"); }
      return written;
    };
    const runtime = await createPreferencesRuntime({ storage });
    try {
      const prepared = await runtime.prepare(save(profile("alpha")));
      await expect(runtime.execute(prepared)).rejects.toThrow("preference_runtime_commit_unknown");
      const raw = rows.get(STATE_KEY);
      expect(JSON.parse(raw!).revision).toBe(1);
      unavailable = false;
      await expect(runtime.execute(prepared)).resolves.toMatchObject({ status: "replayed", projection: { profiles: [profile("alpha")], activeProfileId: "alpha", revision: 1 } });
      expect(rows.get(STATE_KEY)).toBe(raw);
    } finally { await runtime.close(); }
  });

  it("preserves the v1 archive when migration commits but its reply is lost", async () => {
    const raw = legacyState([save(profile("alpha"))]);
    const { rows, storage } = memoryStorage(raw);
    const atomicWrite = storage.compareAndSwap;
    storage.compareAndSwap = async (key, expected, value) => {
      const written = await atomicWrite(key, expected, value);
      if (written) throw new Error("lost migration reply");
      return written;
    };
    const runtime = await createPreferencesRuntime({ storage });
    try {
      expect(await runtime.getProjection({ actorId: ACTOR })).toEqual({ profiles: [profile("alpha")], activeProfileId: "alpha", revision: 1 });
      expect(rows.get(`${STATE_KEY}:legacy:${createHash("sha256").update(raw).digest("hex")}`)).toBe(raw);
      expect(JSON.parse(rows.get(STATE_KEY)!).schemaVersion).toBe("starward-preferences-runtime-v2");
    } finally { await runtime.close(); }
  });

  it("two SQLite handles acknowledge no lost writes and accept an explicitly prepared later retry", async () => {
    await withSqlite(async (_dataDir, open) => {
      const first = await open();
      const second = await open();
      const prepared = await Promise.all([first.prepare(save(profile("alpha"))), second.prepare(save(profile("beta")))]);
      expect(prepared.map(command => command.baseRevision)).toEqual([0, 0]);
      const results = await Promise.allSettled([first.execute(prepared[0]), second.execute(prepared[1])]);
      const accepted = results.flatMap((result, index) => result.status === "fulfilled" ? [{ receipt: result.value, index }] : []);
      expect(accepted).toHaveLength(1);
      const rejectedIndex = results.findIndex(result => result.status === "rejected");
      expect((results[rejectedIndex] as PromiseRejectedResult).reason.message).toMatch(/^preference_runtime_(conflict|stale_command)$/u);
      expect((await first.getProjection({ actorId: ACTOR })).profiles).toEqual(accepted[0].receipt.projection.profiles);
      const explicitRetry = await commit(second, save(profile(rejectedIndex === 0 ? "alpha" : "beta"), "explicit-retry"));
      expect(explicitRetry.receipt.stateVersion).toBe(2);
      await first.close();
      await second.close();
      const restarted = await open();
      expect((await restarted.getProjection({ actorId: ACTOR })).profiles.map(item => item.id).sort()).toEqual(["alpha", "beta"]);
    });
  });

  it("two SQLite handles submit one effect for the same prepared intent", async () => {
    await withSqlite(async (_dataDir, open) => {
      const first = await open();
      const second = await open();
      const prepared = await first.prepare(save(profile("alpha"), "shared-intent"));
      const results = await Promise.allSettled([first.execute(prepared), second.execute(prepared)]);
      const receipts = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      expect(receipts.length).toBeGreaterThanOrEqual(1);
      expect(new Set(receipts.map(receipt => receipt.entityId)).size).toBe(1);
      expect(receipts.every(receipt => receipt.stateVersion === 1)).toBe(true);
      for (const result of results) if (result.status === "rejected") expect(result.reason.message).toBe("preference_runtime_conflict");
      expect(await second.getProjection({ actorId: ACTOR })).toEqual({ profiles: [profile("alpha")], activeProfileId: "alpha", revision: 1 });
      await expect(second.execute(prepared)).resolves.toMatchObject({ status: "replayed", stateVersion: 1 });
    });
  });
});
