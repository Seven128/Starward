import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createPreferencesRuntime } from "../../../../packages/domain/src/preferences/runtime.ts";

const parent = fileURLToPath(new URL("../tmp/", import.meta.url));
await mkdir(parent, { recursive: true });
const dataDir = await mkdtemp(join(parent, "r20-preferences-contract-review-"));
const first = await createPreferencesRuntime({ dataDir });
const second = await createPreferencesRuntime({ dataDir });
const request = (id: string) => ({
  outcome: "mobile-shell-and-preferences" as const,
  actorId: "isolated-contract-review",
  operation: "preference.save" as const,
  idempotencyKey: `isolated-profile:${id}:1`,
  payload: { token: id, profile: { id, name: id, revision: 1 } },
});
const results = await Promise.all([first.execute(request("alpha")), second.execute(request("beta"))]);
const persisted = await first.list({ actorId: "isolated-contract-review" });
const result = {
  scope: "Two runtime instances, same new Node SQLite database; no app or device operation",
  dataDir,
  acknowledgedVersions: results.map(item => item.stateVersion),
  acknowledgedEntityIds: results.map(item => item.entityId),
  persistedEntityIds: persisted.map(item => item.entityId),
  lostIndependentProfile: results.some(item => !persisted.some(row => row.entityId === item.entityId)),
};
await first.close();
await second.close();
await writeFile(join(parent, "r20-preferences-contract-review-probe-result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
