/** Adopt only the previously frozen six shared owners after exact source checks. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = process.cwd(), output = path.join(root, "output/pre-aid-common-display-adoption-1003-r1");
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const prepared = JSON.parse(fs.readFileSync(path.join(output, "result.json"), "utf8"));
assert.equal(prepared.status, "SHARED_ADOPTION_DELTA_PREPARED_NOT_APPLIED");
assert.equal(prepared.replacements.length, 6);
for (const row of prepared.replacements) {
  assert.equal(hash(fs.readFileSync(path.join(root, row.original.path))), row.original.sha256);
  assert.equal(hash(fs.readFileSync(path.join(root, row.shared.path))), row.shared.sha256);
}
for (const row of prepared.replacements)
  fs.writeFileSync(path.join(root, row.original.path), fs.readFileSync(path.join(root, row.shared.path)));
const adopted = prepared.replacements.map((row: any) => ({ path: row.original.path,
  originalSha256: row.original.sha256, sha256: hash(fs.readFileSync(path.join(root, row.original.path))) }));
assert(adopted.every((row: any, index: number) => row.sha256 === prepared.replacements[index].shared.sha256));
fs.writeFileSync(path.join(output, "adopted.json"), JSON.stringify({ status: "EXACT_SIX_SHARED_OWNERS_ADOPTED",
  sources: adopted, scope: "Production mechanism only. Normal page no science port/default auxiliary budget unchanged. Prior candidate captures remain bound to their historical task sources; no native, threshold/quality or final acceptance upgrade." }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ adopted }));
