// Destination existence only; no anchor, remote-page or fact certification.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const files = process.argv.slice(2);
assert(files.length > 0, "Pass the actual touched Markdown owners.");
let localLinks = 0;
const missing = [];
for (const file of files) {
  const source = await fs.readFile(file, "utf8");
  for (const match of source.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split("#")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    localLinks++;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!await fs.access(resolved).then(() => true, () => false)) missing.push({ file, target });
  }
}
console.log(JSON.stringify({ scope: "Ordinary local Markdown destination existence; no anchors, remote pages or fact certification.", files, localLinks, missing }));
assert.equal(missing.length, 0);
