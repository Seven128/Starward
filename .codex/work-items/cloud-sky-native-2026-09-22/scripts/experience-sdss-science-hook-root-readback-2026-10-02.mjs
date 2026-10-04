import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const read = path => JSON.parse(readFileSync(path, "utf8"));
const describe = path => { const b = readFileSync(path); return { path, bytes: b.length, sha256: digest(b) }; };
const resource = "output/sdss-science-optical-resource-after-1002-r2";
const independent = "output/sdss-science-hook-independent-1002-r4";
const output = "output/sdss-science-hook-root-readback-1002-r1";
const authorBefore = read(join(resource, "bindings-before.json"));
assert.deepEqual(authorBefore, read(join(resource, "bindings-after.json")));
const bindings = read(join(independent, "binding.json"));
assert.equal(bindings.unchanged, true); assert.deepEqual(bindings.inputsBefore, bindings.inputsAfter);
for (const row of [...authorBefore, ...bindings.inputsBefore]) assert.deepEqual(describe(row.path), row);
const before = read("output/sdss-science-optical-resource-before-1002-r1/resource-traces.json");
assert.equal(before.evidence[0].outerFrozen, false);
const traces = read(join(resource, "resource-traces.json"));
assert.equal(traces.evidence[0].outerFrozen, true); assert.equal(traces.evidence[0].nestedFrozen, true);
for (const fault of ["none", "taro-abort-throws", "controller-abort-throws"]) {
  const early = traces.evidence.find(row => row.case === "pending-clear-before-late-callback" && row.fault === fault);
  const late = traces.evidence.find(row => row.case === "pending-clear-after-late-callback" && row.fault === fault);
  assert.equal(early.snapshot.pendingMetadataListeners, 0);
  assert.equal(early.snapshot.requests[0].completed, fault === "none");
  assert.equal(early.snapshot.controllers[1].listeners, fault === "controller-abort-throws" ? 1 : 0);
  assert.equal(late.snapshot.controllers[1].listeners, 0);
}
const observations = read(join(independent, "whole-hook-observations.json"));
assert.equal(observations.length, 9);
const coarse = observations.find(row => row.label === "fine-decode-failed-real-medium-recovery");
assert.equal(coarse.renderedLevel, "MEDIUM"); assert.equal(coarse.updateFailed, true); assert.equal(coarse.failed, false);
const fine = observations.find(row => row.label === "explicit-retry-fine-plus-same-master-coarse");
assert.equal(fine.renderedLevel, "DETAIL"); assert(fine.imageId && fine.coarserImageId);
assert.equal(fine.renderedAsset.masterRgbSha256, fine.coarserAsset.masterRgbSha256);
assert.equal(fine.renderedAsset.masterAvailabilitySha256, fine.coarserAsset.masterAvailabilitySha256);
const imageTransfers = row => row.events.filter(event => event.type === "image-transfer").length;
assert.equal(imageTransfers(coarse), 2); assert.equal(imageTransfers(fine), 2);
const mutation = read(join(independent, "effect-gap-mutation.json"));
assert.equal(mutation[0].publicAcquisitionAttemptsAfterStaleRender, 0);
assert.equal(mutation[0].imageTransfersAfterStaleRender, 0);
assert.equal(mutation[1].publicAcquisitionAttemptsAfterStaleRender, 2);
assert.equal(mutation[1].imageTransfersAfterStaleRender, 2);
assert.equal(mutation[1].cache.bytes, 711847);
const final = observations.at(-1).cache;
for (const name of ["entries", "leased", "bytes", "reserved", "running", "pending", "retired", "failures"]) assert.equal(final[name], 0);
mkdirSync(output); // Exclusive new evidence generation, never replace older observations.
const result = { status: "ROOT_READBACK_HOOK_EPOCH_DEVELOPMENT_PASS", currentAuthorInputs: authorBefore.length,
  currentIndependentInputs: bindings.inputsBefore.length, sourceAndRealPublicationExact: true,
  actualBeforeOuterFailurePreserved: true, pendingNativeAbortFaultsDistinguished: true,
  coarseRecoveryThenFileReuse: true, staleAcquisitionMutation: { current: 0, mutant: 2, mutantBytes: 711847 }, final,
  artifacts: [join(resource, "resource-traces.json"), join(independent, "binding.json"),
    join(independent, "whole-hook-observations.json"), join(independent, "effect-gap-mutation.json"),
    join(independent, "result.json"), "output/sdss-science-hook-independent-closure-1002-r1/result.json"].map(describe),
  scope: "Readonly current-input and raw observation readback. Does not rerun Hook/native/HTTP/GPU, and does not cover subsequent scene envelope or normal science contribution/credit/quality/capacity." };
writeFileSync(join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
