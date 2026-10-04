import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
const output = 'output/common-opacity-doc-closeout-1002-r1/';
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const bind = async path => { const bytes = await fs.readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
const checks = await read(output + 'checks.json');
assert(checks.checks.every(x => x.status === 'fulfilled' && x.value.exit_code === 0));
const root = await read('output/common-opacity-root-join-1002-r3/result.json');
for (const entry of root.sources) assert.deepEqual(await bind(entry.path), entry);
const documents = [];
for (const p of ['PLAN.md', 'STATE.md', 'INDEX.md', 'HANDOFF-2026-10-01.md', 'PROGRESS.md', 'evidence/experience-common-opacity-development-closure-2026-10-02.md', 'evidence/experience-pre-aid-common-opacity-development-2026-10-02.md', 'evidence/experience-pre-aid-common-opacity-independent-review-2026-10-02.md']) documents.push(await bind(task + p));
for (const p of ['project_context/architecture/runtime-and-domain.md', 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md']) documents.push(await bind(p));
const plan = await fs.readFile(task + 'PLAN.md', 'utf8');
assert.equal(plan.split('当前依赖：先按真实目录major/minor/PA').length, 2);
assert(!plan.includes('当前依赖：先让Canvas实际目录辅助opacity'));
const protectedFiles = await read(task + 'tmp/resume-preserved-hashes-2026-10-01.json');
for (const entry of protectedFiles) assert.equal((await bind(entry.path)).sha256, entry.sha256);
const evidence = await Promise.all(['output/common-opacity-root-join-1002-r3/result.json', 'output/common-opacity-independent-closure-1002-r1/result.json', 'output/common-preaid-opacity-owner-1002-r1/source-bindings.json', output + 'checks.json', task + 'scripts/experience-common-opacity-context-update-2026-10-02.mjs', task + 'scripts/experience-common-opacity-doc-closeout-2026-10-02.mjs'].map(bind));
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(branch, root.branch); assert.equal(head, root.head);
const result = { passed: true, scope: 'Current-source/owner-document identity and recorded declaration/path/whitespace closeout. Not native/quality/default or final acceptance.',
  branch, head, documents, currentSources: root.sources, evidence, checks: await bind(output + 'checks.json'), protectedFiles: protectedFiles.length,
  nextDependency: 'Define justified local object region/readability against real catalog geometry/TAN/selected support and existing references; then shared local observation/natural fading, full-scene native costs/default adoption. Independent scene-resource work remains allowed by PLAN.',
  goal: 'active, unbudgeted, incomplete', noClaimUpgrade: 'Old actual GPU remains bound to its Scene. Current command/accepted-data checks do not certify target pixels/callback timing.' };
await fs.writeFile(output + 'result.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, result: await bind(output + 'result.json'), documents: documents.length, currentSources: root.sources.length, protectedFiles: protectedFiles.length, branch, head }));
