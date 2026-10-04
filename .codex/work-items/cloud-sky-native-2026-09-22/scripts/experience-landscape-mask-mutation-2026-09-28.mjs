import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const root = path.resolve("."), owner = path.join(root, "apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts");
const output = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-landscape-mask-mutation-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const original = await fs.readFile(owner), sha = bytes => createHash("sha256").update(bytes).digest("hex");
const text = original.toString("utf8"), before = 'skyPanoramaAlpha(mask, ray) >= 254.5';
assert.equal(text.split(before).length, 2);
const run = () => spawnSync(process.execPath, ["tools/run-node.cjs", "--import", "tsx", "--test", "--test-reporter=tap", "apps/wechat-miniapp/src/features/sky/sky-landscape-mask.test.ts"], { cwd: root, encoding: "utf8", timeout: 30000 });
let mutant;
try {
  await fs.writeFile(owner, text.replace(before, 'false /* bounded mutation: ignore the painted image alpha */'));
  mutant = run(); assert.notEqual(mutant.status, 0);
  assert.match(mutant.stdout + mutant.stderr, /not ok.*completed image mask replaces old tree geometry/u);
} finally { await fs.writeFile(owner, original); }
assert.equal(sha(await fs.readFile(owner)), sha(original));
const restored = run(); assert.equal(restored.status, 0, restored.stdout + restored.stderr);
const record = { scope: "Bounded mutation of the actual shared panorama point/label/picking owner. Ignore photograph alpha; the consumer regression must fail. Exact source restored in finally, then affected owner checks pass. No compiled candidate modified",
  sourceSha256: sha(original), mutantExit: mutant.status, mutantOutput: mutant.stdout + mutant.stderr,
  restoredExit: restored.status, restoredOutput: restored.stdout + restored.stderr, sourceRestored: true };
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ mutantExit: mutant.status, restoredExit: restored.status, sourceRestored: true }));
