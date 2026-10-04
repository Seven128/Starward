import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { execFileSync } from "node:child_process";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-context-v11-binding-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v11-candidate-2026-09-28.json"), "utf8"));
const observed = JSON.parse(await fs.readFile(path.join(evidence, "experience-context-native-v11-2026-09-28.json"), "utf8"));
const fingerprint = await fingerprintBundle(path.join(root, candidate.bundle)); assert.equal(fingerprint.sha256, candidate.fingerprint.sha256);
assert.equal(fingerprint.fileCount, 257);
const compiled = await fs.readFile(path.join(root, candidate.bundle, "common.js"), "utf8");
assert.ok(compiled.includes("contextFingerprint.trim()"), "latest contract guard is in the compiled candidate");
const native = JSON.parse(execFileSync(process.execPath, ["tools/run-node.cjs", ".codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-context-native-readback-2026-09-28.mjs", "v11"], { cwd: root, encoding: "utf8", timeout: 15_000 }));
assert.equal(native.description, observed.final.description); assert.equal(native.theme, observed.final.theme);
assert.equal(native.context.selectedAtUtc, "2026-09-28T16:00:00.000Z"); assert.ok(native.description.includes(native.context.selectedAtUtc));
assert.equal(native.proxy.mode, "pass"); assert.equal(native.inlineNotification, null); assert.equal(native.trackingStatus, null);
const manifest = await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest", { signal: AbortSignal.timeout(5000) })).json();
assert.equal(manifest.publicationHash, "e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5");
assert.ok(observed.paintedPhotoSource.includes(manifest.publicationHash + "/panorama-2048.png"));
const captures = [];
for (const capture of observed.captures) {
  const bytes = await fs.readFile(path.join(evidence, capture.filename)), image = PNG.sync.read(bytes);
  assert.equal(image.width, capture.width); assert.equal(image.height, capture.height);
  captures.push({ ...capture, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const result = { scope: observed.scope, candidateSha256: fingerprint.sha256, candidateFileCount: fingerprint.fileCount,
  totalRawBytes: fingerprint.totalBytes, rawPackageBytes: candidate.rawPackageBytes, native, publicationHash: manifest.publicationHash, captures,
  previousGenerationEvidence: { environment: "experience-environment-v8-readback-2026-09-28.json", faults: "experience-context-v10-binding-2026-09-28.json" } };
await fs.writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ candidateSha256: result.candidateSha256, files: result.candidateFileCount, rawBytes: result.totalRawBytes,
  selectedAtUtc: native.context.selectedAtUtc, revision: native.context.revision, captures: captures.length, proxyMode: native.proxy.mode }));
