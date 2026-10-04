/** Saved actual publication semantics/bytes/source readback, no repack or HTTP. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { assertSdssDisplayOpticalManifest, sdssDisplayOpticalPublicationHash } from "../../../../packages/miniapp-contracts/src/sdss-display-optical-publication.ts";
import { assertSdssScienceOpticalPublication } from "../../../../packages/miniapp-contracts/src/sdss-science-optical-publication.ts";
import { assertPreparedOpticalPublication } from "../../../../packages/miniapp-contracts/src/prepared-optical-publication.ts";
import { OPTICAL_IMAGE_LEVELS } from "../../../../packages/miniapp-contracts/src/optical-publication-content.ts";

const root = resolve(import.meta.dirname, "../../../.."), out = join(root, "output/sdss-m82-display-publication-readback-1004-r1");
mkdirSync(out);
const started = performance.now(), pins = new Map<string, { path: string; bytes: number; sha256: string }>();
const digest = (v: Uint8Array | string) => createHash("sha256").update(v).digest("hex");
function read(path: string, expected?: { bytes: number; sha256: string }) {
  const p = resolve(path);assert(p.startsWith(root + "/") || p.startsWith(root + "\\"));
  const raw = readFileSync(p), binding = { path: relative(root, p).split("\\").join("/"), bytes: raw.length, sha256: digest(raw) };
  if (expected) { assert.equal(binding.bytes, expected.bytes);assert.equal(binding.sha256, expected.sha256); }
  const previous = pins.get(p);if (previous) assert.deepEqual(previous, binding);pins.set(p, binding);
  return raw;
}
function json(path: string, expected?: { bytes: number; sha256: string }) { return JSON.parse(read(path, expected).toString("utf8")); }
const producer = json(join(root, "output/sdss-m82-display-publication-1004-r2/result.json"));
const manifestPath = join(root, producer.publication.path), directory = dirname(manifestPath);
const publication: unknown = json(manifestPath, producer.publication);
assertSdssDisplayOpticalManifest(publication, "M:82", "74f456febb06119883e1cf79f9d3d9d89d853ec4a78f7f5c93a229aef204c0ab");
assert.equal(sdssDisplayOpticalPublicationHash(publication), producer.publicationHash);
assert.throws(() => assertSdssScienceOpticalPublication(publication, "M:82"));
assert.throws(() => assertPreparedOpticalPublication(publication, "M:82"));
const current = json(join(directory, "display-candidate-receipt.json"), publication.display.candidateReceipt);
const science = json(join(directory, "science-candidate-receipt.json"), publication.display.scientificCandidateReceipt);
const previous = json(join(directory, "previous-candidate-receipt.json"), publication.display.previousCandidateReceipt);
const execution = json(join(directory, "execution-receipt.json"), publication.display.executionReceipt);
json(join(directory, "dependency-plan-receipt.json"), publication.display.dependencyPlanReceipt);
json(join(directory, "source-inputs-receipt.json"), publication.display.sourceInputsReceipt);
assert.equal(current.version, publication.display.producerVersion);
assert.equal(current.currentModel, publication.display.noiseModel);
assert.equal(current.previousModel, publication.display.previousNoiseModel);
assert.equal(current.parentReportCanonicalSha256, publication.display.parentReportCanonicalSha256);
assert.equal(current.planCanonicalSha256, publication.display.planCanonicalSha256);
assert.equal(current.parentProcessingVersion, previous.version);
assert.deepEqual(publication.display.counts, Object.fromEntries(Object.keys(publication.display.counts).map(k => [k, current[k]])));
assert.deepEqual(publication.master.transfer.recipe, current.sourceResolvedRecipe);
assert.deepEqual(publication.master.transfer.recipe, science.display.transfer);
read(join(root, execution.scienceCandidate.path), publication.display.scientificCandidateReceipt);
read(join(root, execution.previousCompleteCandidate.path), publication.display.previousCandidateReceipt);
read(join(root, execution.candidate.path), publication.display.candidateReceipt);
const levels = [];
for (const level of OPTICAL_IMAGE_LEVELS) {
  const a = publication.levels[level], bytes = read(join(directory, a.file), a);
  assert.deepEqual(bytes, read(join(dirname(join(root, execution.candidate.path)), current.levels[level].file), current.levels[level]));
  assert.deepEqual(a.masterCrop, current.levels[level].crop);
  assert.equal(a.fieldDegrees, current.levels[level].fieldDegrees);
  assert.equal(a.masterAvailabilitySha256, science.arrays["joint-availability"].sha256);
  for (const band of ["g", "r", "i"] as const) {
    assert.equal(a.masterDisplayEstimatesSha256[band], current.arrays[band].sha256);
    assert.deepEqual(publication.master.science[band], { bytes: science.arrays[band + "-science"].bytes, sha256: science.arrays[band + "-science"].sha256 });
  }
  levels.push({ level, bytes: bytes.length, actualSavedCompleteIncrementPngExact: true, originalScienceAlphaCropRecipeBound: true });
}
const frames = [];
for (const frame of publication.master.sourceFrames) {
  const id = frame.identity, name = [id.rerun, id.run, id.camcol, id.field, id.band].join("-") + ".json";
  const receipt = json(join(directory, "admission-receipts", name), frame.admissionReceipt);
  assert.equal(digest(receipt.wcs.primaryHeaderFitsCards), frame.primaryHeaderSha256);
  assert.deepEqual(receipt.identity, id);
  assert.equal(receipt.source.sourceUrl, frame.sourceUrl);
  assert.equal(receipt.source.bytes, frame.bytes);assert.equal(receipt.source.sha256, frame.sha256);
  const originals = science.science.perBand[id.band].sourceReceipts.filter((v: any) =>
    JSON.stringify(v.identity) === JSON.stringify(id));
  assert.equal(originals.length, 1);assert.deepEqual(receipt, originals[0]);
  frames.push({ ...id, sourceAndOriginalScientificReceiptExact: true });
}
assert.equal(frames.length, 18);
for (const [name, identity] of Object.entries(publication.display.implementation)) {
  read(join(root, "output/sdss-m82-noise-v2-increment-1004-r1", "executed-" + name), identity);
}
const inputs = [...pins.values()];for (const p of inputs) read(join(root, p.path), p);
const result = { scope: "Saved actual explicit display publication readback; no FITS/noise/aperture selection/repack/HTTP or rendered/native acceptance.",
  publicationHash: publication.publicationHash, inputBindings: inputs, inputsAfterExact: true, levels, frames,
  originalScientificAndPreviousAndExecutionAndDependencyReceiptsExact: true, originalScienceUnitAndEstimateMeaningDistinct: true,
  implementationBytesExact: 11, oldScienceAndPreparedAdmissionRejectNewDisplay: true,
  elapsedSeconds: (performance.now() - started) / 1000, independentReview: "MISSING", ordinaryAdoption: false,
  runtimeRegistered: false, quality: "UNVERIFIED", otherBusinessLogicEdited: false };
writeFileSync(join(out, "executed-reader.mts"), readFileSync(import.meta.filename), { flag: "wx" });
writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify({ publicationHash: result.publicationHash, levels, actualOriginalSourceFrames: frames.length,
  inputsAfterExact: true, elapsedSeconds: result.elapsedSeconds }) + "\n");
