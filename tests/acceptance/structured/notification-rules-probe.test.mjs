import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { configureTypeScriptImporter, runStructuredProbe } from "./probes.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
let fault = "none";
configureTypeScriptImporter(async (url, parent) => {
  const module = await tsImport(url, parent);
  if (!url.endsWith("/apps/api/src/modules/notifications/runtime.ts")) return module;
  return { ...module, async createNotificationToolsRuntime(options) {
    const runtime = await module.createNotificationToolsRuntime(options), get = runtime.service.get.bind(runtime.service), selected = fault;
    runtime.service.get = (actor, id, revision) => selected === "missing-state" ? null : get(actor, id, selected === "missing-history" ? undefined : revision);
    return runtime;
  } };
});
const probe = () => runStructuredProbe({ root, outcome: "notifications-and-toolbox", carrier: "apps/api/src/modules/notifications/runtime.ts", probeName: "carrier-integrity" });
test("real rule configuration remains failed at the complete notification family boundary", async () => {
  fault = "none"; const result = await probe();
  assert.equal(result.passes, false); assert.equal(result.evidence.representative_path_passes, true);
  assert.equal(result.evidence.scope, "explicit-rule-configuration-create-update-stop-readback-only");
  assert.equal(result.evidence.durable_readback.written_sha256, result.evidence.durable_readback.read_sha256);
  assert.equal(result.evidence.evaluation, "not-evaluated"); assert.equal(result.evidence.delivery, "not-configured");
  assert.ok(result.evidence.remaining.includes("native-permission-local-scheduling"));
  assert.ok(result.evidence.remaining.includes("event-driven-evaluation-edge-quiet-hours-cooldown"));
});
test("a receipt cannot replace a missing current rule", async () => {
  fault = "missing-state"; const result = await probe(); assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
test("a current rule cannot replace its historical revision", async () => {
  fault = "missing-history"; const result = await probe(); assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
