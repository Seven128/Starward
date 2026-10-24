import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
import { configureTypeScriptImporter, runStructuredProbe } from "./probes.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
let fault = "none";
configureTypeScriptImporter(async (url, parent) => {
  const module = await tsImport(url, parent);
  if (!url.endsWith("/apps/api/src/modules/night-report/runtime.ts")) return module;
  return { ...module, async createNightReportRuntime(options) {
    const runtime = await module.createNightReportRuntime(options), selected = fault;
    const get = runtime.service.get.bind(runtime.service), create = runtime.service.create.bind(runtime.service);
    runtime.service.get = (actor, id) => selected === "missing-snapshot" ? null : get(actor, id);
    runtime.service.create = async (actor, input) => {
      const value = await create(actor, input);
      return selected === "refreshed-replay" && value.replayed ? { ...value, report: { ...value.report, generatedAt: "2026-10-25T10:00:00.000Z" } } : value;
    };
    return runtime;
  } };
});
const probe = () => runStructuredProbe({ root, outcome: "tonight-decision", carrier: "apps/api/src/modules/night-report/runtime.ts", probeName: "carrier-integrity" });
test("a useful real report is durable while the complete Tonight outcome remains unverified", async () => {
  fault = "none"; const result = await probe();
  assert.equal(result.passes, false); assert.equal(result.evidence.representative_path_passes, true);
  assert.equal(result.evidence.scope, "night-report-aggregation-snapshot-receipt-restart-replay-only");
  assert.equal(result.evidence.durable_readback.written_sha256, result.evidence.durable_readback.read_sha256);
  assert.ok(result.evidence.remaining.includes("production-identity-and-deployment"));
});
test("a receipt cannot replace a missing actual report snapshot", async () => {
  fault = "missing-snapshot"; const result = await probe(); assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
test("a replay must preserve the original evidence rather than pretend it was refreshed", async () => {
  fault = "refreshed-replay"; const result = await probe(); assert.equal(result.passes, false); assert.equal(result.evidence, null);
});
