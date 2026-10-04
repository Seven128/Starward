import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const generation = process.argv[2] ?? "v7";
assert.ok(["v7", "v8"].includes(generation));
const port = generation === "v7" ? 9440 : 9441;
const output = path.join(evidence, generation === "v7" ? "experience-landscape-lod-readback-2026-09-28.json" : "experience-landscape-gpu-retry-readback-v8-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, `experience-combined-clean-${generation}-candidate-2026-09-28.json`), "utf8"));
const current = await fingerprintBundle(path.join(root, candidate.bundle));
assert.equal(current.sha256, candidate.fingerprint.sha256); assert.equal(current.fileCount, candidate.fingerprint.fileCount);
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${port}` }), 5000);
boundWechatProtocol(program);
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  // Used only in memory. No account/context/route IDs leave this script.
  const response = await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(decodeURIComponent(page.query.contextId)), { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); const context = (await response.json()).data;
  const description = await (await page.$(".sky-orientation-canvas")).attribute("aria-label");
  assert.ok(description.includes(context.selectedAtUtc)); assert.equal(context.selectedAtUtc, "2026-09-28T16:00:00.000Z");
  const manifest = await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest")).json();
  assert.equal(manifest.publicationHash, "e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5");
  const resources = [];
  for (const resource of manifest.resources) {
    const served = await fetch("http://127.0.0.1:8789" + resource.image.downloadUrl); assert.equal(served.status, 200);
    assert.equal(sha(new Uint8Array(await served.arrayBuffer())), resource.image.sha256);
    assert.equal(sha(await fs.readFile(path.join(root, "workers/miniapp-api/assets/landscape", resource.image.file))), resource.image.sha256);
    resources.push({ id: resource.id, sha256: resource.image.sha256, bytes: resource.image.bytes, status: served.status });
  }
  assert.equal(sha(await fs.readFile(path.join(root, "workers/miniapp-api/assets/landscape/manifest.json"))), manifest.publicationHash);
  const observations = JSON.parse(await fs.readFile(path.join(evidence, generation === "v7" ? "experience-landscape-lod-native-2026-09-28.json" : "experience-landscape-gpu-retry-native-v8-2026-09-28.json"), "utf8"));
  const captures = [];
  for (const item of observations.captures) { const bytes = await fs.readFile(path.join(evidence, item.filename)); captures.push({ ...item, bytes: bytes.length, sha256: sha(bytes) }); }
  const record = { scope: `Exact unchanged clean-${generation} files and restored original local source/publication; real public observation context equals current Canvas. No phone, final visual, official package, native peak or independent review acceptance.`,
    generation, sdkPort: port,
    candidateSha256: current.sha256, candidateFilesUnchanged: current.fileCount, totalRawBytes: current.totalBytes,
    selectedAtUtc: context.selectedAtUtc, localDate: context.localDate, timezone: context.timezone, description,
    located: await (await page.$(".sky-located-object"))?.attribute("aria-label") ?? null,
    theme: await (await page.$(".sky-orientation-page")).attribute("class"), publicationHash: manifest.publicationHash,
    resources, originalSourcesRestored: true, captures };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ candidateSha256: record.candidateSha256, candidateFilesUnchanged: record.candidateFilesUnchanged,
    selectedAtUtc: record.selectedAtUtc, originalSourcesRestored: true, captures: captures.length }));
} finally { await program.disconnect(); }
