import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { configureTypeScriptImporter, runStructuredProbe } from "./probes.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
let fault = "none";
configureTypeScriptImporter(async (url, parent) => {
  const module = await tsImport(url, parent);
  if (!url.endsWith("/apps/api/src/modules/itinerary/runtime.ts")) return module;
  return { ...module, async createItineraryRuntime(options) {
    const runtime = await module.createItineraryRuntime(options);
    const original = runtime.service.get.bind(runtime.service);
    const selected = fault;
    runtime.service.get = (actor, id, revision) => selected === "missing-state" ? null : original(actor, id, selected === "missing-history" ? undefined : revision);
    return runtime;
  } };
});
const probe = () => runStructuredProbe({ root, outcome: "itinerary-and-collaboration", carrier: "apps/api/src/modules/itinerary/runtime.ts", probeName: "carrier-integrity" });
test("real draft persistence does not certify the complete itinerary family", async () => {
  fault = "none"; const result = await probe();
  assert.equal(result.passes, false);
  assert.equal(result.evidence.representative_path_passes, true);
  assert.equal(result.evidence.scope, "explicit-draft-create-patch-readback-only");
  assert.equal(result.evidence.durable_readback.written_sha256, result.evidence.durable_readback.read_sha256);
  assert.ok(result.evidence.remaining.includes("qualified-place-and-route-generation"));
  assert.ok(result.evidence.remaining.includes("share-export-and-offline-handoff"));
});
test("receipts alone fail when current state cannot be read", async () => {
  fault = "missing-state"; const result = await probe();
  assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
test("a current result cannot stand in for historical revision recovery", async () => {
  fault = "missing-history"; const result = await probe();
  assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
