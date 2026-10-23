import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { configureTypeScriptImporter, runStructuredProbe } from "./probes.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
let fault = "none";
let firstProjection;
configureTypeScriptImporter(async (url, parent) => {
  const module = await tsImport(url, parent);
  if (!url.endsWith("/packages/domain/src/preferences/runtime.ts")) return module;
  return {
    ...module,
    async createPreferencesRuntime(options) {
      const runtime = await module.createPreferencesRuntime(options);
      const selectedFault = fault;
      return {
        ...runtime,
        async execute(request) {
          const receipt = await runtime.execute(request);
          firstProjection ??= receipt.projection;
          return selectedFault === "historical-replay" && receipt.status === "replayed"
            ? { ...receipt, projection: firstProjection }
            : receipt;
        },
        async getProjection(query) {
          return selectedFault === "missing-current-state"
            ? { profiles: [], revision: 0 }
            : runtime.getProjection(query);
        },
      };
    },
  };
});

const probe = () => runStructuredProbe({ root, outcome: "mobile-shell-and-preferences", carrier: "apps/mobile/app/_layout.tsx", probeName: "carrier-integrity" });
test.beforeEach(() => { firstProjection = undefined; });

test("preferences carrier proves full profile projection through SQLite restart", async () => {
  fault = "none";
  const result = await probe();
  assert.equal(result.passes, true);
  assert.deepEqual(result.evidence.state_delta.changed_fields, ["profiles", "activeProfileId", "revision"]);
  assert.equal(result.evidence.durable_readback.written_sha256, result.evidence.durable_readback.read_sha256);
});

test("successful receipts cannot pass when the current projection is missing", async () => {
  fault = "missing-current-state";
  const result = await probe();
  assert.equal(result.passes, false);
});

test("historical replay cannot pass if it replaces the authoritative current projection", async () => {
  fault = "historical-replay";
  const result = await probe();
  assert.equal(result.passes, false);
});
