import fs from 'node:fs';
import assert from 'node:assert/strict';
const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
const from = '已接既有publisher；r2批量报告、M42完整源重建、M82缺源拒绝及旧201资产字节保持有实际绑定，质量仍未验。';
const to = '已接既有publisher；[独立审查](evidence/experience-shared-imagery-quality-independent-review-2026-10-02.md)已核r2真实输入/资产身份与六项结构准入反例，三处发现已修。M42完整源重建、M82缺源拒绝及旧201资产字节保持有实际绑定，质量仍未验。';
for (const name of ['PLAN.md', 'STATE.md', 'INDEX.md', 'HANDOFF-2026-10-01.md', 'PROGRESS.md']) {
  const path = task + name;
  const content = fs.readFileSync(path, 'utf8');
  assert(content.includes(from), name);
  fs.writeFileSync(path, content.replace(from, to));
}
console.log('Bound the shared structural QC independent review to existing current task entries.');
