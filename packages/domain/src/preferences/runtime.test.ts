import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPreferencesRuntime, type PreferenceRuntimeRequest } from "./runtime";

function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function request(token: string, idempotencyKey: string): PreferenceRuntimeRequest {
  return {
    outcome: "mobile-shell-and-preferences",
    actorId: "personal-trial-owner",
    operation: "preference.save",
    idempotencyKey,
    payload: { token, profile: { id: token, name: token, revision: 1 } },
  };
}

describe("preferences runtime", () => {
  it("rejects a changed payload under the same key without changing the committed state", async () => {
    const rows = new Map<string, string>();
    const runtime = await createPreferencesRuntime({ storage: {
      kind: "sqlite", read: async key => rows.get(key) ?? null,
      write: async (key, value) => { rows.set(key, value); },
    } });
    const original = request("银河摄影", "profile-bound-input");
    const committed = await runtime.execute(original);
    await expect(runtime.execute({ ...original, payload: { ...original.payload, token: "已经更改" } }))
      .rejects.toThrow("preference_runtime_idempotency_conflict");
    expect(await runtime.list({ actorId: original.actorId })).toEqual([expect.objectContaining({ inputDigest: committed.inputDigest, stateVersion: 1 })]);
    await expect(runtime.execute({ ...original, payload: { profile: original.payload.profile, token: original.payload.token } }))
      .resolves.toMatchObject({ status: "replayed", entityId: committed.entityId, stateVersion: 1 });
    await runtime.close();
  });

  it("commits variable inputs, survives restart, replays idempotently, and rejects invalid input", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-preferences-"));
    try {
      const firstRuntime = await createPreferencesRuntime({
        dataDir,
        releaseProfile: { id: "individual-personal-trial", productionTrafficAllowed: false },
      });
      const alphaRequest = request("银河摄影", "profile-alpha-v1");
      const betaRequest = request("目视观测", "profile-beta-v1");
      const alpha = await firstRuntime.execute(alphaRequest);
      const beta = await firstRuntime.execute(betaRequest);

      expect(alpha.entityId).not.toBe(beta.entityId);
      expect(alpha.stateVersion).toBe(1);
      expect(beta.stateVersion).toBe(2);
      expect(alpha.result.token).toBe("银河摄影");
      expect(alpha.sideEffects).toEqual([expect.objectContaining({ kind: "sqlite", status: "committed" })]);
      expect(alpha.inputDigest).toBe(createHash("sha256").update(canonicalJson({
        outcome: alphaRequest.outcome,
        actorId: alphaRequest.actorId,
        operation: alphaRequest.operation,
        payload: alphaRequest.payload,
      })).digest("hex"));
      await firstRuntime.close();

      const restoredRuntime = await createPreferencesRuntime({ dataDir });
      expect(await restoredRuntime.read({ outcome: alpha.outcome, actorId: alpha.actorId, entityId: alpha.entityId })).toEqual(expect.objectContaining({ status: "succeeded", inputDigest: alpha.inputDigest }));
      expect(await restoredRuntime.read({ outcome: beta.outcome, actorId: beta.actorId, entityId: beta.entityId })).toEqual(expect.objectContaining({ status: "succeeded", inputDigest: beta.inputDigest }));

      const replay = await restoredRuntime.execute(alphaRequest);
      expect(replay).toEqual(expect.objectContaining({ status: "replayed", replayed: true, entityId: alpha.entityId, sideEffects: [] }));
      const beforeInvalid = await restoredRuntime.list({ actorId: "personal-trial-owner" });
      await expect(restoredRuntime.execute({ ...request("", "invalid-empty"), payload: { token: "" } })).rejects.toThrow("preference_runtime_payload_invalid");
      expect(await restoredRuntime.list({ actorId: "personal-trial-owner" })).toHaveLength(beforeInvalid.length);
      await restoredRuntime.close();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
