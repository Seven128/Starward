import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createPreferencesRuntime } from "../../../../packages/domain/src/preferences/runtime.ts";
import { createUnrestrictedProfile } from "../../../../packages/domain/src/preferences/index.ts";

const parent = fileURLToPath(new URL("../tmp/", import.meta.url));
await mkdir(parent, { recursive: true });
const dataDir = await mkdtemp(join(parent, "r20-preferences-v2-contract-review-"));
const first = await createPreferencesRuntime({ dataDir });
const second = await createPreferencesRuntime({ dataDir });
const actorId = "isolated-contract-review";
const request = (id: string, nonce = id) => ({
  outcome: "mobile-shell-and-preferences" as const, actorId,
  operation: "preference.save" as const, idempotencyKey: `isolated-profile:${nonce}`,
  payload: { token: id, profile: { ...createUnrestrictedProfile("2026-10-23T08:00:00.000Z"), id, name: id } },
});

let result: Record<string, unknown>;
try {
  const prepared = await Promise.all([first.prepare(request("alpha")), second.prepare(request("beta"))]);
  assert.deepEqual(prepared.map(command => command.baseRevision), [0, 0]);
  const concurrent = await Promise.allSettled([first.execute(prepared[0]), second.execute(prepared[1])]);
  const accepted = concurrent.flatMap((item, index) => item.status === "fulfilled" ? [{ receipt: item.value, index }] : []);
  const conflicts = concurrent.flatMap((item, index) => item.status === "rejected" ? [{ message: String(item.reason?.message), index }] : []);
  assert.equal(accepted.length, 1);
  assert.equal(conflicts.length, 1);
  assert.match(conflicts[0].message, /^preference_runtime_(conflict|stale_command)$/u);
  const projection = await first.getProjection({ actorId });
  assert.deepEqual(projection.profiles, accepted[0].receipt.projection.profiles);
  const rejectedProfile = conflicts[0].index === 0 ? "alpha" : "beta";
  const laterIntent = await second.prepare(request(rejectedProfile, "explicit-retry"));
  const retry = await second.execute(laterIntent);
  assert.equal(retry.stateVersion, 2);
  assert.deepEqual(retry.projection.profiles.map(profile => profile.id).sort(), ["alpha", "beta"]);

  const shared = await first.prepare(request("gamma", "same-intent"));
  const sameIntent = await Promise.allSettled([first.execute(shared), second.execute(shared)]);
  const sameReceipts = sameIntent.flatMap(item => item.status === "fulfilled" ? [item.value] : []);
  assert.ok(sameReceipts.length >= 1);
  assert.equal(new Set(sameReceipts.map(receipt => receipt.entityId)).size, 1);
  assert.ok(sameReceipts.every(receipt => receipt.stateVersion === 3));
  for (const item of sameIntent) if (item.status === "rejected") assert.equal(item.reason?.message, "preference_runtime_conflict");
  result = {
    scope: "Two actual Node SQLite handles on a fresh synthetic database; no app/device/service operation",
    dataDir, preparedVersions: prepared.map(command => command.baseRevision),
    acknowledgedVersions: accepted.map(item => item.receipt.stateVersion),
    rejectedConflicts: conflicts, lostIndependentProfile: false,
    explicitRetryVersion: retry.stateVersion,
    sameIntentResults: sameIntent.map(item => item.status === "fulfilled" ? item.value.status : String(item.reason?.message)),
  };
} finally {
  await first.close();
  await second.close();
}
const restarted = await createPreferencesRuntime({ dataDir });
try {
  const restored = await restarted.getProjection({ actorId });
  assert.deepEqual(restored.profiles.map(profile => profile.id).sort(), ["alpha", "beta", "gamma"]);
  assert.equal(restored.activeProfileId, "gamma");
  assert.equal(restored.revision, 3);
  result.restoredProfileIds = restored.profiles.map(profile => profile.id);
  result.restoredRevision = restored.revision;
} finally { await restarted.close(); }
result.passes = true;
const resultPath = join(dataDir, "result.json");
await writeFile(resultPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, resultPath }, null, 2));
