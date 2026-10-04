import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "../../../..");
const target = path.join(root, "apps/wechat-miniapp/src/features/sky/sky-landscape-geometry.ts");
const evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-landscape-outline-regression-2026-09-28.json");
assert.ok(!fs.existsSync(evidence), "preserve prior regression evidence");
const original = fs.readFileSync(target);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const variants = [
  { name: "painted canopy absent from point mask",
    old: "    || SKY_LANDSCAPE_CANOPIES.some(canopy=>canopyOccludes(canopy,direction));",
    replacement: ";", test: "sky-object-picking.test.ts", pattern: "above-horizon star covered" },
  { name: "nonconvex outline used as whole-image certificate",
    old: "canopyOccludes(canopy,direction,true)", replacement: "canopyOccludes(canopy,direction)",
    test: "sky-landscape.test.ts", pattern: "lobed canopy point hits" },
];
const results = [];
for (const variant of variants) {
  const source = original.toString("utf8");
  assert.equal(source.split(variant.old).length, 2, "one bounded mutation");
  const modified = Buffer.from(source.replace(variant.old, variant.replacement));
  assert.ok(fs.readFileSync(target).equals(original), "no intervening source edits");
  let child;
  try {
    fs.writeFileSync(target, modified);
    child = spawnSync(process.execPath, ["tools/run-node.cjs", "--import", "tsx", "--test",
      `--test-name-pattern=${variant.pattern}`, `apps/wechat-miniapp/src/features/sky/${variant.test}`],
    { cwd: root, encoding: "utf8", timeout: 20000, windowsHide: true });
    assert.ok(child.status !== 0 && /AssertionError/.test(child.stdout + child.stderr), "escaped effect must fail its consumer regression");
  } finally {
    assert.ok(fs.readFileSync(target).equals(modified), "do not overwrite an intervening edit during restore");
    fs.writeFileSync(target, original);
    assert.ok(fs.readFileSync(target).equals(original), "exact source restoration");
  }
  results.push({ name: variant.name, exitCode: child.status, detected: true, restored: true,
    output: (child.stdout + child.stderr).slice(-5000) });
}
const restored = spawnSync(process.execPath, ["tools/run-node.cjs", "--import", "tsx", "--test",
  "apps/wechat-miniapp/src/features/sky/sky-landscape.test.ts",
  "apps/wechat-miniapp/src/features/sky/sky-object-picking.test.ts"],
{ cwd: root, encoding: "utf8", timeout: 20000, windowsHide: true });
assert.equal(restored.status, 0, "restored behavior passes");
const record = { scope: "bounded consumer mutations; not independent review or target acceptance",
  sourceHash: hash(original), finalHash: hash(fs.readFileSync(target)), results,
  restoredExitCode: restored.status, restoredOutput: (restored.stdout + restored.stderr).slice(-5000) };
fs.writeFileSync(evidence, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ mutations: results.length, detected: results.every(result => result.detected),
  restored: record.sourceHash === record.finalHash, restoredExitCode: restored.status }));
