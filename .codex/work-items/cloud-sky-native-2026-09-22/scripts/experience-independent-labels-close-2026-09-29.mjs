import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd();
const item = ".codex/work-items/cloud-sky-native-2026-09-22";
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const output = path.join(root, item, "evidence/experience-independent-labels-close-2026-09-29.json");
await assert.rejects(fs.access(output), { code: "ENOENT" });
const candidate = await read(`${item}/evidence/experience-combined-clean-v23-candidate-2026-09-29.json`);
const old = await read(`${item}/evidence/experience-combined-clean-v22-candidate-2026-09-29.json`);
const before = await read(candidate.independentLabelChecks.before);
const after = await read(candidate.independentLabelChecks.after);
const listPath = "output/playwright/cloud-sky-independent-labels-0929-list-consumers/result.json";
const list = await read(listPath);
for (const prepared of [candidate, old]) {
  assert.equal((await fingerprintBundle(path.join(root, prepared.bundle))).sha256, prepared.fingerprint.sha256);
}
assert.equal(before.useful, false);
assert.equal(after.useful, true);
assert.equal(after.rows.length, 5);
assert.equal(list.rows.length, 5);
for (const key of ["catalogHash", "deepCatalogHash", "observer", "at", "fov", "basis", "logicalCanvas", "backing",
  "componentFunctionSha256", "selectionFunctionSha256", "commitSha256"])
  assert.deepEqual(before[key], after[key]);
for (const key of ["catalogHash", "deepCatalogHash", "sourceHashes"])
  assert.deepEqual(after[key], list[key]);
assert(list.staticCatalogRetainedWithoutBorrowedFrame);
for (const input of [...candidate.independentLabelInputs, ...after.gpuSourceHashes,
  ...candidate.retainedSourceRecoveryInputs, ...candidate.retainedOpticalInputs, ...candidate.retainedPointInputs])
  assert.equal(digest(await fs.readFile(path.join(root, input.file))), input.sha256, input.file);
const rows = after.rows.map((row, index) => {
  const previous = before.rows[index];
  assert.equal(row.name, previous.name);
  assert(row.ready && row.error === 0);
  assert(row.lateFrameSuppressed && row.oldModeSuppressed && row.failedCanvasSuppressed);
  assert.equal(row.rgbaSha256, previous.rgbaSha256);
  assert.deepEqual(row.paintedObjects, previous.paintedObjects);
  assert.deepEqual(row.m42Picks, previous.m42Picks);
  const failure = row.name.startsWith("bright-");
  if (failure) {
    assert.equal(previous.controls.length, 0);
    assert.deepEqual(row.controls.map(control => control.reference), ["M:42", "M:78"]);
  } else assert.deepEqual(row.controls, previous.controls);
  assert(row.controls.every(control => control.selectedReference === control.reference));
  const objectList = list.rows[index];
  assert.equal(objectList.name, row.name);
  assert(objectList.identical);
  assert.equal(objectList.m42Retained, row.name !== "deep-layer-unavailable");
  return { name: row.name, paintedObjects: row.paintedObjects.length, pixelsAndPicksUnchanged: true,
    beforeNames: previous.controls.map(control => control.reference), afterNames: row.controls.map(control => control.reference),
    selectedIdentitiesMatch: true, lateFrameSuppressed: true, oldModeSuppressed: true, failedCanvasSuppressed: true,
    objectList: { total: objectList.total, counts: objectList.counts, identicalToBefore: true, m42Retained: objectList.m42Retained }, error: 0 };
});
const get = async route => {
  const response = await fetch(`http://127.0.0.1:8791${route}`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  return response.json();
};
const publication = await get("/__sky_test/publication-status");
const traffic = await get("/__sky_test/traffic-status");
const context = await get("/__sky_test/context-status");
assert.equal(publication.informationModuleSha256, old.runningSourceRecovery.informationModuleSha256);
assert.equal(context.mode, "pass");
assert.equal(traffic.resourceMode, "pass");
assert.equal(traffic.heldResourceCount, 0);
assert.equal(traffic.active.length, 0);
assert.equal(context.puts, 0);
const record = {
  scope: "B1/C/D independent-layer recognition/recovery, local development boundary. Controlled contract-layer failures with actual public inputs; not an observed BFF outage or native UI/phone/full-journey acceptance.",
  candidate: { bundle: candidate.bundle, sha256: candidate.fingerprint.sha256, files: candidate.fingerprint.fileCount,
    rawBytes: candidate.fingerprint.totalBytes, rawPackageBytes: candidate.rawPackageBytes, preparedUnopened: true },
  previousCandidateUnchanged: old.fingerprint.sha256,
  evidence: { before: candidate.independentLabelChecks.before, after: candidate.independentLabelChecks.after, objectList: listPath },
  inputs: { observer: after.observer, at: after.at, fov: after.fov, basis: after.basis, logicalCanvas: after.logicalCanvas,
    backing: after.backing, catalogHash: after.catalogHash, deepCatalogHash: after.deepCatalogHash, sourceHashes: after.sourceHashes,
    sourceBundleSha256: after.sourceBundleSha256, componentFunctionSha256: after.componentFunctionSha256,
    selectionFunctionSha256: after.selectionFunctionSha256, commitSha256: after.commitSha256 },
  rows, staticCatalogRetainedWithoutBorrowedFrame: true,
  checks: { relevantBehaviorExit: 0, relevantBehaviorTests: 24, miniTypeExit: 0, buildExit: 0, buildWarnings: 3,
    contextValidationExit: 0, beforeRegressionFailed: true, afterRegressionPassed: true },
  evidenceLimits: { drawing: "Actual production WebGL in headless Chromium SwiftShader; same images, points and picks in five controlled conditions.",
    controls: "Actual page commit/selector/component and selection function in Node adapters; attributes/coordinates/identity checked, no native composition/tap/modal/Back.",
    list: "Actual before/current catalogFrameObjects with real public inputs; no supplemental SAO frame in this consumer check. Above-horizon list counts are not viewport rendered counts or coverage limits.",
    initialAdapterFailure: "The initial before directory has no result.json after a cross-VM equality failure. The before-verified directory is the useful failing-before product evidence; earlier artifacts remain unchanged.",
    costs: "No new renderer/cache/publication/request owner. Raw build size is not official package size; no new performance/phone resource claim." },
  service: { informationModuleSha256: publication.informationModuleSha256, contextUpstream: publication.contextUpstream,
    contextMode: context.mode, resourceMode: traffic.resourceMode, held: traffic.heldResourceCount,
    active: traffic.active.length, contextPuts: context.puts },
  remaining: "Native combined journey/composition, real pose/full calibration/background, Android/iOS, current Moon on phone, scene/source quality and broader lawful coverage/alignment, target resources/performance/official package/costs and independent review remain open. No native RPC/new window/canceled elevation retry/phone/service replacement/deploy/Git write in this module."
};
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ candidate: record.candidate, service: record.service,
  controls: rows.map(row => ({ name: row.name, before: row.beforeNames, after: row.afterNames, samePixelsAndPicks: row.pixelsAndPicksUnchanged })),
  list: rows.map(row => ({ name: row.name, total: row.objectList.total, retained: row.objectList.m42Retained })) }));
