import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { configureTypeScriptImporter, runStructuredProbe } from "./probes.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
let fault = "none";
configureTypeScriptImporter(async (url, parent) => {
  const module = await tsImport(url, parent);
  if (!url.endsWith("/apps/api/src/modules/field/report-runtime.ts")) return module;
  return { ...module, async createFieldReportRuntime(options) {
    const runtime = await module.createFieldReportRuntime(options), get = runtime.service.get.bind(runtime.service), selected = fault;
    runtime.service.get = (actor, id, revision) => selected === "missing-state" ? null : get(actor, id, selected === "missing-history" ? undefined : revision);
    return runtime;
  } };
});
const probe = () => runStructuredProbe({ root, outcome: "field-offline-safety", carrier: "apps/api/src/modules/field/report-runtime.ts", probeName: "carrier-integrity" });
test("private notes have actual durable effects while the full offline/safety family remains failed", async () => {
  fault = "none"; const result = await probe();
  assert.equal(result.passes, false); assert.equal(result.evidence.representative_path_passes, true);
  assert.equal(result.evidence.scope, "private-field-note-create-update-current-history-restart-replay-only");
  assert.equal(result.evidence.durable_readback.written_sha256, result.evidence.durable_readback.read_sha256);
  assert.equal(result.evidence.visibility, "private"); assert.equal(result.evidence.publication, "not-submitted");
  assert.equal(result.evidence.offline_pack, "unavailable"); assert.equal(result.evidence.safety_session, "unavailable"); assert.equal(result.evidence.sharing, "unavailable");
  assert.ok(result.evidence.remaining.includes("native-sqlite-first-offline-writes-media-dependencies-conflict-and-replay"));
  assert.ok(result.evidence.remaining.includes("native-safety-permission-timer-background-location-expiry-and-stop"));
});
test("a generic receipt cannot stand in for missing current private content", async () => {
  fault = "missing-state"; const result = await probe(); assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
test("current private content cannot substitute for its preserved historical revision", async () => {
  fault = "missing-history"; const result = await probe(); assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
