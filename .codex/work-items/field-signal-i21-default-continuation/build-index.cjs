const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const dir = '.codex/work-items/field-signal-i21-default-continuation';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const git = args => cp.execFileSync('git', args, { encoding: 'utf8' }).trim();
const original = 'C:/Users/777/.codex/attachments/841761c7-182d-4094-adba-ecf5cf18e6e3/goal-objective.md';
if (fs.existsSync(original)) fs.copyFileSync(original, dir + '/original-goal.md');
const files = new Set(['AGENTS.md', 'DESIGN.md', dir + '/original-goal.md', '.codex/work-items/wechat-miniapp-field-signal-i21-remaining-work-handoff-2026-09-06.md', '.codex/work-items/wechat-miniapp-field-signal-i21-long-task-input.md', '.long-task/delivery-contract.yaml', 'tools/miniapp/selected-design-bindings.json', 'tools/miniapp/fixtures/nightchina-import-cases.json', 'tools/miniapp/verification-spec-field-signal-i21.json', '.codex/skills/uiux_design/SKILL.md', '.codex/skills/starward-wechat-device-verification/SKILL.md', '.codex/skills/design-resource-authoring/SKILL.md']);
function walk(p) { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = p + '/' + e.name; if (e.isDirectory()) walk(q); else files.add(q); } }
walk('project_context');
walk('docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source');
walk('docs/design-resources/miniapp-field-signal-unified-flow-forms/selected-source');
walk('docs/design-resources/miniapp-field-signal-i21-binding-2026-09-04-r6');
walk('docs/design-resources/miniapp-field-signal-i21-binding-2026-09-06-r11');
const rows = [];
for (const p of files) {
  const b = fs.readFileSync(p);
  const row = { path: path.resolve(p).replaceAll('\\', '/'), bytes: b.length, sha256: hash(b) };
  if (/\.(md|yaml|toml)$/.test(p)) {
    const lines = b.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
    row.line_count = lines.length; row.sections = []; row.source_items = [];
    let pending = null;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^#{1,6} /.test(l) || (/\.yaml$/.test(p) && /^[a-z_]+:/.test(l))) row.sections.push({ line: i + 1, title: l });
      const m = l.match(/^<!-- ty-source-item:start key=(\S+) kind=(\S+)(?: [^>]*)? -->/);
      if (m) { if (pending) throw Error(`Nested marker ${p}:${i+1}`); pending = { key: m[1], kind: m[2], start_line: i + 1 }; }
      if (l === '<!-- ty-source-item:end -->') { if (!pending) throw Error(`Unmatched end ${p}:${i+1}`); pending.end_line = i + 1; row.source_items.push(pending); pending = null; }
    }
    if (pending) throw Error('Unclosed marker ' + p);
    row.sections.forEach((s, i) => s.end_line = (row.sections[i + 1]?.line ?? lines.length + 1) - 1);
  }
  rows.push(row);
}
if (!fs.existsSync(dir + '/baseline.json')) {
  const changed = git(['diff', '--name-only']).split('\n');
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n');
  const baseline = { created_at: new Date().toISOString(), note: 'Captured after recovery documents only; no product edits in this Goal yet.', head: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), status: git(['status', '--porcelain=v1', '--untracked-files=all']), files: [...new Set([...changed, ...untracked])].filter(p => p && !p.startsWith(dir + '/')).map(p => ({ path: p, sha256: fs.existsSync(p) && fs.statSync(p).isFile() ? hash(fs.readFileSync(p)) : null })) };
  fs.writeFileSync(dir + '/baseline.json', JSON.stringify(baseline, null, 2) + '\n');
}
const source = rows.find(r => r.path.endsWith('i21-long-task-input.md'));
const handoff = fs.readFileSync('.codex/work-items/wechat-miniapp-field-signal-i21-remaining-work-handoff-2026-09-06.md', 'utf8');
const appendix = handoff.split('## 附录 A：')[1].split('## 附录 B：')[0];
const controls = [...appendix.matchAll(/^- `([^`]+)`/gm)].map(m => m[1]);
const corpus = JSON.parse(fs.readFileSync('tools/miniapp/fixtures/nightchina-import-cases.json', 'utf8').replace(/^\uFEFF/, ''));
const cases = Array.isArray(corpus) ? corpus : corpus.cases;
if (controls.length !== 62 || new Set(controls).size !== 62) throw Error('control count');
if (!cases || cases.length !== 10) throw Error('case count ' + Object.keys(corpus));
const index = { created_at: new Date().toISOString(), purpose: 'Task-local full-file and section navigation, not product authority or acceptance. Re-read original requirements. Historical Long-Task procedures superseded by current user instruction.', original_goal_attachment: original, files: rows, controls, case_keys: cases.map(c => c.key), source_item_count: source.source_items.length };
fs.writeFileSync(dir + '/source-index.json', JSON.stringify(index, null, 2) + '\n');
console.log(JSON.stringify({ files: rows.length, source_items: source.source_items.length, controls: controls.length, cases: cases.length, original_goal_copy_equal: !fs.existsSync(original) ? 'attachment unavailable' : hash(fs.readFileSync(original)) === hash(fs.readFileSync(dir + '/original-goal.md')) }));

