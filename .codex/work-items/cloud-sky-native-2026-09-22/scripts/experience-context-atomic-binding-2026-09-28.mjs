import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-context-atomic-binding-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const read = async name => JSON.parse(await fs.readFile(path.join(evidence, name), "utf8"));
const candidate = await read("experience-combined-clean-v11-candidate-2026-09-28.json");
const captures = await read("experience-context-atomic-native-captures-2026-09-28.json");
const final = await read("experience-context-atomic-native-final-2026-09-28.json");
const fingerprint = await fingerprintBundle(path.join(root, candidate.bundle));
assert.equal(fingerprint.sha256, candidate.fingerprint.sha256); assert.equal(fingerprint.fileCount, 257);
assert.equal(final.entryRoute.sameContextAsAccepted, true); assert.equal(final.entryRoute.httpStatus, 200);
assert.equal(final.context.selectedAtUtc, "2026-09-28T16:00:00.000Z"); assert.equal(final.context.revision, 4);
assert.equal(final.proxy.mode, "pass"); assert.equal(final.inlineNotification, null); assert.equal(final.trackingStatus, null);
assert.equal(final.description, captures.captures.at(-1).description);
const manifest = await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest", { signal: AbortSignal.timeout(5000) })).json();
assert.equal(manifest.publicationHash, "e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5");
assert.ok(captures.paintedPhotoSource.includes(manifest.publicationHash + "/panorama-2048.png"));
const assetReadback = [];
for (const [file, expected] of [["panorama-1024.png", "1e4222bb02d6b4c95c643047de6916581b5e2a665e00d9cc60edd94c3cb072d3"], ["panorama-2048.png", "fd6afeebba748eb84a15c0aea2a8ce0e363571685c6b181c8511f2bb5459bb32"]]) {
  const response = await fetch(`http://127.0.0.1:8789/v2/sky/landscape/${manifest.publicationHash}/${file}`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex"); assert.equal(sha256, expected);
  assetReadback.push({ file, bytes: bytes.length, sha256 });
}
const captured = [];
for (const capture of captures.captures) {
  const bytes = await fs.readFile(path.join(evidence, capture.filename)), image = PNG.sync.read(bytes);
  assert.equal(image.width, capture.width); assert.equal(image.height, capture.height);
  captured.push({ ...capture, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const changedSource = [];
for (const file of ["workers/miniapp-api/src/cache.ts", "workers/miniapp-api/src/ports.ts", "workers/miniapp-api/src/observation-context-service.ts", "workers/miniapp-api/src/observation-context-concurrency.test.ts"]) {
  const bytes = await fs.readFile(path.join(root, file));
  changedSource.push({ file, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const record = { scope: "Current unchanged clean-v11 fingerprint, actual native Canvas/storage/BFF Context snapshots and original public landscape bytes. Only the owned local BFF was replaced to load atomic Context updates; not phone, production deployment, pixel-quality, official package size or full experience acceptance.",
  candidate: { bundle: candidate.bundle, ...fingerprint, rawPackageBytes: candidate.rawPackageBytes },
  runtime: { sdkPort: 9444, sdkPid: 34128, apiPort: 8789, apiPid: 22124, apiExecSession: 54820, apiLog: "experience-context-atomic-service-2026-09-28.log", forwardingPort: 8791, forwardingPid: 12252, forwardingExecSession: 34149, forwardingMode: "pass", retiredOwnedBffPid: 14388, untouchedSharedPids: { 8787: 2408, 8788: 15508 } },
  changedSource, concurrencyBefore: await read("experience-context-concurrency-before-2026-09-28.json"), concurrencyAfter: await read("experience-context-concurrency-after-2026-09-28.json"),
  recovered: await read("experience-context-atomic-native-recovered-2026-09-28.json"), trackedLoss: await read("experience-context-atomic-native-tracked-loss-2026-09-28.json"), final,
  publicationHash: manifest.publicationHash, assetReadback, paintedPhotoSource: captures.paintedPhotoSource, captures: captured };
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ candidateSha256: fingerprint.sha256, files: fingerprint.fileCount, rawBytes: fingerprint.totalBytes, selectedAtUtc: final.context.selectedAtUtc, revision: final.context.revision, captures: captured.length, apiPid: 22124, proxyMode: final.proxy.mode }));
