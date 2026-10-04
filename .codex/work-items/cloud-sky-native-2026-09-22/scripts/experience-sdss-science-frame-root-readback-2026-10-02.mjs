import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const sha = b => createHash("sha256").update(b).digest("hex");
const read = p => JSON.parse(readFileSync(p, "utf8"));
const describe = path => { const b = readFileSync(path); return { path, bytes: b.length, sha256: sha(b) }; };
const input = "output/sdss-science-frame-independent-1002-r3";
const output = "output/sdss-science-frame-root-readback-1002-r1";
const binding = read(join(input, "binding.json"));
assert.deepEqual(binding.inputsBefore, binding.inputsAfter);
for (const row of binding.inputsBefore) assert.deepEqual(describe(row.path), row);
const result = read(join(input, "result.json"));
assert.equal(result.status, "INDEPENDENT_SCIENCE_FRAME_HANDOFF_PASS");
assert.equal(result.scene.currentScienceCredit, false);
assert.equal(result.scene.currentW3Fallback, true);
assert.equal(result.scene.guardRemovedPrematureCredit, true);
assert.equal(result.legacyFixtures.sameFailuresWithoutNewGuard, true);
assert.equal(result.legacyFixtures.repairedAllPass, true);
const artifacts = ["result.json", "binding.json", "scene-observations.json", "legacy-fixture-comparisons.json",
  "actual-owner-runtime-source-graph.json"].map(file => describe(join(input, file)));
mkdirSync(output);
const observation = { status: "ROOT_READBACK_SCIENCE_FRAME_DEVELOPMENT_PASS", inputsExact: binding.inputsBefore.length,
  sourceScope: "helper1d9b994/scene9d4343b/page960b9e0", sourceDescriptorHandoffAndLegacyRejection: true,
  oldThreeFailuresIndependentOfNewGuard: true, repairedOpaqueAndFadedSemanticsRetained: true, artifacts,
  scope: "Readonly full frozen input qualification and actual record readback. Does not rerun scene/Hook, does not prove pixels/native/normal science group/quality/capacity." };
writeFileSync(join(output, "result.json"), JSON.stringify(observation, null, 2) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify(observation, null, 2) + "\n");
