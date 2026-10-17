import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import { skyImageRecoveryTestOwner } from "./sky-image-recovery-test-support";

test("current selection follows the actual object while a shared failed refresh preserves its edition and bounded retry", () => {
  const recovery = skyImageRecoveryTestOwner();
  const discovery: contracts.PreparedOpticalDiscovery = { schemaVersion: "prepared-optical-discovery-v1", publications: [
    { kind: "prepared-optical-v1", reference: "M:51", publicationHash: "a".repeat(64) },
    { kind: "prepared-native-optical-v1", reference: "NGC:253", publicationHash: "b".repeat(64) },
    { kind: "prepared-native-optical-v1", reference: "REGION:field", publicationHash: "c".repeat(64) },
  ] };
  const queries: any[] = []; let refreshes = 0, refreshError: unknown;
  const get = () => Promise.resolve(discovery), exports: any = {};
  const bindings: Record<string, unknown> = {
    "@starward/miniapp-contracts": contracts,
    "@/hooks/use-resource-query": { useResourceQuery(options: unknown) { queries.push(options); return {
      data: discovery, isError: false, refreshError, refetch() { refreshes++; },
    }; } },
    "@/services/prepared-optical-client": { getPreparedOpticalDiscovery: get },
    "./use-sky-image-recovery": recovery,
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-sky-prepared-optical-discovery.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require(name: string) { assert.ok(name in bindings, name); return bindings[name]; } });
  const use = exports.useSkyPreparedOpticalDiscovery as typeof import("./use-sky-prepared-optical-discovery").useSkyPreparedOpticalDiscovery;
  const first = use("M:51", true); assert.equal(first.publication, discovery.publications[0]);
  assert.equal(queries[0].queryFn, get); assert.equal(queries[0].enabled, true);
  refreshError = new Error("offline");
  const retained = use("M:51", true); assert.equal(retained.publication, first.publication); assert.equal(retained.failed, true);
  retained.retry(); assert.equal(refreshes, 1);
  assert.equal(use("NGC:253", true).publication, discovery.publications[1]);
  assert.equal(use("M:82", true).publication, undefined, "unrelated fields cannot substitute for an absent target");
  use("M:51", true, true); retained.retry(); assert.equal(refreshes, 1); assert.equal(queries.at(-1).enabled, false);
  assert.equal(use("M:51", false).publication, undefined); retained.retry(); assert.equal(refreshes, 1);
  const sky = use(null, true); assert.equal(queries.at(-1).enabled, true);
  assert.equal(sky.publication, undefined); assert.equal(sky.publications, discovery.publications);
  retained.retry(); assert.equal(refreshes, 2, "ordinary region discovery requires no catalogue pick");
  use("M:51", true); recovery.dispose(); first.retry(); assert.equal(refreshes, 2);
});
