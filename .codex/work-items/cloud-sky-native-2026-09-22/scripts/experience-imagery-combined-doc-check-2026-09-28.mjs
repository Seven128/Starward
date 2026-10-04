import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const task = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22");
const files = ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md", "evidence/experience-imagery-combined-2026-09-28.md"];
const missing = []; let localLinks = 0;
for (const file of files) {
  const source = await fs.readFile(path.join(task, file), "utf8");
  for (const match of source.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split("#")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    localLinks++;
    if (!await fs.access(path.resolve(task, path.dirname(file), decodeURIComponent(target))).then(() => true, () => false)) missing.push({ file, target });
  }
}
assert.deepEqual(missing, []);
const plan = await fs.readFile(path.join(task, "PLAN.md"), "utf8");
assert.equal(plan.includes("先有界核对D Context服务端并发revision提交路径"), false);
assert.equal(plan.includes("下一小路径回到C实际影像/地景组合"), false);
assert.ok(plan.includes("下一小路径转D原生请求与渐进加载"));
assert.ok(plan.includes("DSS营利使用需书面许可") && plan.includes("PS1/SkyMapper自托管加工分发未闭合"));
assert.ok(plan.includes("Android/iOS") && plan.includes("独立审查") && plan.includes("不能判质量通过"));
assert.ok(plan.includes("revision6"));
const result = { scope: "Task Markdown local destination existence and current dependency/valid obligations only; no remote/anchor, independent-review or product-quality certification.", files, localLinks, missing, staleContextAuditRemoved: true, currentRevision: 6, contextChanged: false };
const output = path.join(task, "evidence/experience-imagery-combined-doc-check-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
await fs.writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result));
