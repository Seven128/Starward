// Ordinary local Markdown link existence only. No source/fact/UI acceptance.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const task = ".codex/work-items/cloud-sky-native-2026-09-22";
const files = ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md", "evidence/experience-environment-context-recovery-2026-09-28.md", "evidence/experience-context-atomic-2026-09-28.md"].map(file => task + "/" + file);
files.push("project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md", "project_context/architecture/runtime-and-domain.md");
const missing = []; let localLinks = 0;
for (const file of files) {
  const source = await fs.readFile(file, "utf8");
  for (const match of source.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split("#")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target)); localLinks++;
    if (!await fs.access(resolved).then(() => true, () => false)) missing.push({ file, target });
  }
}
const result = { scope: "Ordinary local Markdown destination existence in touched task and Context owners; anchors, remote pages and factual correctness are not certified.", files, localLinks, missing };
console.log(JSON.stringify(result));
assert.equal(missing.length, 0);
