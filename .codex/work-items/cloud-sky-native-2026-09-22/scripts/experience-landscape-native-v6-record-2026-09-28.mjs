import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-landscape-native-v6-readback-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v6-candidate-2026-09-28.json"), "utf8"));
for (const entry of candidate.fingerprint.files) assert.equal(sha(await fs.readFile(path.join(root, candidate.bundle, entry.path))), entry.sha256, entry.path);
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9439" }), 5000);
boundWechatProtocol(program);
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  // The route is used only in memory. No private context or session identity is retained.
  const contextId = decodeURIComponent(page.query.contextId);
  const response = await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(contextId), { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); const context = (await response.json()).data;
  const description = await (await page.$(".sky-orientation-canvas")).attribute("aria-label");
  assert.ok(description.includes(context.selectedAtUtc));
  assert.equal(context.selectedAtUtc, "2026-09-28T16:00:00.000Z");
  const manifestResponse = await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest", { signal: AbortSignal.timeout(5000) });
  const manifest = await manifestResponse.json();
  assert.equal(manifest.publicationHash, "e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5");
  const imageResponse = await fetch("http://127.0.0.1:8789" + manifest.resources[0].image.downloadUrl, { signal: AbortSignal.timeout(5000) });
  assert.equal(imageResponse.status, 200); assert.equal(sha(new Uint8Array(await imageResponse.arrayBuffer())), manifest.resources[0].image.sha256);
  const observations = JSON.parse(await fs.readFile(path.join(evidence, "experience-landscape-normal-native-observations-2026-09-28.json"), "utf8"));
  const captures = [];
  for (const item of observations.captures) {
    const bytes = await fs.readFile(path.join(evidence, item.filename));
    captures.push({ ...item, bytes: bytes.length, sha256: sha(bytes) });
  }
  const record = { scope: "Exact unchanged clean-v6 DevTools files, restored local publication and actual public observation-context readback; no phone, final quality, deployed API, peak memory or independent review acceptance",
    candidateSha256: candidate.fingerprint.sha256, candidateFilesUnchanged: candidate.fingerprint.files.length,
    selectedAtUtc: context.selectedAtUtc, localDate: context.localDate, timezone: context.timezone,
    description, located: await (await page.$(".sky-located-object"))?.attribute("aria-label") ?? null,
    theme: await (await page.$(".sky-orientation-page")).attribute("class"),
    publicationHash: manifest.publicationHash, currentPngSha256: manifest.resources[0].image.sha256,
    sourceManifestRestored: sha(await fs.readFile(path.join(root, "workers/miniapp-api/assets/landscape/manifest.json"))) === manifest.publicationHash,
    sourcePngRestored: sha(await fs.readFile(path.join(root, "workers/miniapp-api/assets/landscape/panorama-1024.png"))) === manifest.resources[0].image.sha256,
    captures };
  assert.ok(record.sourceManifestRestored && record.sourcePngRestored);
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ candidateSha256: record.candidateSha256, candidateFilesUnchanged: record.candidateFilesUnchanged, selectedAtUtc: record.selectedAtUtc, publicationHash: record.publicationHash, sourceRestored: true, captures: captures.length }));
} finally { await program.disconnect(); }
