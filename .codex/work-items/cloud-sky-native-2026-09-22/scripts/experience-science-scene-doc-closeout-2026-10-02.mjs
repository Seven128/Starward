import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
const output = 'output/science-scene-doc-closeout-1002-r1/';
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const bind = async path => { const bytes = await fs.readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
await assert.rejects(fs.access(output), { code: 'ENOENT' }); await fs.mkdir(output, { recursive: true });
const root = await read('output/science-scene-root-join-1002-r2/result.json');
for (const entry of root.currentBindings) assert.deepEqual(await bind(entry.path), entry);
const author = await read('output/sdss-science-scene-consumer-1002-r1/source-bindings.json');
for (const [path, hash] of Object.entries(author.files)) assert.equal((await bind(path)).sha256, hash);
const docs = [];
for (const p of ['PLAN.md', 'STATE.md', 'INDEX.md', 'HANDOFF-2026-10-01.md', 'PROGRESS.md', 'evidence/experience-science-scene-development-2026-10-02.md', 'evidence/experience-sdss-science-scene-independent-review-2026-10-02.md']) docs.push(await bind(task + p));
docs.push(await bind('project_context/architecture/runtime-and-domain.md'));
const plan = await fs.readFile(task + 'PLAN.md', 'utf8');
assert.equal(plan.split('当前依赖：先让Canvas实际目录辅助opacity').length, 2);
assert(!plan.includes('当前依赖：按已核caller有限政策'));
const protectedFiles = await read(task + 'tmp/resume-preserved-hashes-2026-10-01.json');
for (const entry of protectedFiles) assert.equal((await bind(entry.path)).sha256, entry.sha256);
const evidence = await Promise.all(['output/science-scene-root-join-1002-r2/result.json', 'output/science-scene-independent-1002-r2/result.json', 'output/science-scene-independent-closure-1002-r1/result.json', 'output/sdss-science-scene-consumer-1002-r1/source-bindings.json', task + 'scripts/experience-science-scene-context-update-2026-10-02.mjs'].map(bind));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
assert.equal(head, root.head); assert.equal(branch, root.branch);
const result = { scope: 'Current source/document identity plus recorded declaration, ordinary local path and scoped whitespace checks. No runtime/quality acceptance.',
  head, branch, docs, currentSources: author.files, currentRootBindingCount: root.currentBindings.length, evidence,
  checks: [
    { toolChunk: 'b70e8d', exitCode: 1, scope: 'Unqualified ty-context command unavailable on PATH; not interpreted as empty/valid Context.' },
    { toolChunk: 'fd6eb9', exitCode: 0, command: 'node tools/run-node.cjs --bin project-tiny-context-harness ty-context validate-context', scope: 'Configured installed harness: manifest paths and explicit controlling-source declarations only.' },
    { toolChunk: '269bff', exitCode: 0, localDestinations: 908, missing: [], scope: 'Eight explicit touched Markdown files; no anchors/remote/fact certification.' },
    { toolChunk: 'b17f8d', exitCode: 0, scope: 'Explicit tracked touched docs and Scene diff check; CRLF warning only.' },
  ], protectedFiles: protectedFiles.length, currentDependency: 'Canvas actual aid opacity → accepted frame → DOM; justified local readability, real repaint recovery, native full-scene budget/default adoption remain open.', goal: 'active, unbudgeted, incomplete' };
await fs.writeFile(output + 'result.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, result: await bind(output + 'result.json'), docs: docs.length, exactRootInputs: root.currentBindings.length, protectedFiles: protectedFiles.length }));
