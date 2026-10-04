// Owned local fixture only. New publication identity avoids old immutable HTTP
// cache; exact source backups support restoration even across tool sessions.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = path.resolve("."), phase = process.argv[2];
assert.ok(["prepare", "image", "restore"].includes(phase));
const evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const manifestFile = path.join(root, "workers/miniapp-api/assets/landscape/manifest.json");
const imageFile = path.join(root, "workers/miniapp-api/assets/landscape/panorama-2048.png");
const manifestBackup = path.join(evidence, "experience-landscape-lod-original-manifest-2026-09-28.json");
const imageBackup = path.join(evidence, "experience-landscape-lod-original-detail-2026-09-28.png");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const manifestSha = "e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5";
const imageSha = "fd6afeebba748eb84a15c0aea2a8ce0e363571685c6b181c8511f2bb5459bb32";
if (phase === "prepare") {
  const manifest = await fs.readFile(manifestFile), image = await fs.readFile(imageFile);
  assert.equal(sha(manifest), manifestSha); assert.equal(sha(image), imageSha);
  await fs.writeFile(manifestBackup, manifest, { flag: "wx" }); await fs.writeFile(imageBackup, image, { flag: "wx" });
  const fresh = Buffer.concat([manifest, Buffer.from("\n \n \n")]);
  assert.notEqual(sha(fresh), manifestSha);
  const corrupt = Buffer.from(image); corrupt[80] ^= 1;
  await fs.writeFile(manifestFile, fresh); await fs.writeFile(imageFile, corrupt);
  console.log(JSON.stringify({ phase, publicationHash: sha(fresh), overviewUnchanged: true, actualDetailCorrupted: sha(corrupt) !== imageSha }));
} else {
  const image = await fs.readFile(imageBackup); assert.equal(sha(image), imageSha); await fs.writeFile(imageFile, image);
  if (phase === "restore") {
    const manifest = await fs.readFile(manifestBackup); assert.equal(sha(manifest), manifestSha); await fs.writeFile(manifestFile, manifest);
  }
  console.log(JSON.stringify({ phase, publicationHash: sha(await fs.readFile(manifestFile)), imageSha256: sha(await fs.readFile(imageFile)) }));
}
