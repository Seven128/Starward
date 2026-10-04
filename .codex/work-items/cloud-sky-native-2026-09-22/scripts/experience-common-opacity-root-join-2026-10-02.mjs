import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
const output = 'output/common-opacity-root-join-1002-r3/';
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const bind = async path => { const bytes = await fs.readFile(path); return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; };
await assert.rejects(fs.access(output), { code: 'ENOENT' }); await fs.mkdir(output, { recursive: true });
const ownerDir = 'output/common-preaid-opacity-owner-1002-r1/';
const author = await read(ownerDir + 'source-bindings.json');
const sources = [];
for (const entry of author.bindings) {
  const current = await bind(entry.path);
  assert.equal(current.sha256, entry.sha256, entry.path); assert.equal(current.bytes, entry.bytes, entry.path);
  if (entry.executionCopy) { const copy = await bind(entry.executionCopy); assert.equal(copy.sha256, entry.sha256); assert.equal(copy.bytes, entry.bytes); }
  sources.push(current);
}
const oldOriginal = await bind(author.oldPage.originalSnapshot), oldCopy = await bind(author.oldPage.copy);
assert.equal(oldOriginal.sha256, author.oldPage.sha256); assert.equal(oldCopy.sha256, author.oldPage.sha256);
const typecheck = await read(ownerDir + author.checks.typecheck.result);
assert.equal(typecheck.exitCode, 0); assert.equal(typecheck.stdout, '');
const tests = await fs.readFile(ownerDir + author.checks.affectedTests.log, 'utf8');
assert(/(?:#|ℹ)\s+pass 59(?:\r?\n|$)/u.test(tests), 'saved final pass count must be 59');
assert(/(?:#|ℹ)\s+fail 0(?:\r?\n|$)/u.test(tests), 'saved final fail count must be zero');
const mutant = await fs.readFile(ownerDir + author.checks.equalityMutation.log, 'utf8');
assert(/(?:#|ℹ)\s+fail 1(?:\r?\n|$)/u.test(mutant), 'saved useful equality mutant must fail');
const mutantSource = await bind(ownerDir + 'page-equality-mutant.tsx.txt');
const mutantLog = await bind(ownerDir + author.checks.equalityMutation.log);
assert.equal(mutantSource.sha256, author.checks.equalityMutation.sha256);
const reviews = [];
for (const dir of ['output/common-opacity-independent-1002-r2/', 'output/common-opacity-independent-addendum-1002-r2/']) {
  const [before, after, result] = await Promise.all(['binding-before.json', 'binding-after.json', 'result.json'].map(name => read(dir + name)));
  assert.deepEqual(after, before);
  assert.equal(result.bindings, before.length); assert(result.controls.every(control => control.status === 'passed'));
  for (const entry of before) assert.deepEqual(await bind(entry.path), entry);
  reviews.push({ result: await bind(dir + 'result.json'), before: await bind(dir + 'binding-before.json'), after: await bind(dir + 'binding-after.json'), boundFiles: before.length, scope: result.limits });
}
// Old actual GPU frames belong to the old Scene. Only the three presentation
// source files and historical root scripts differ; never upgrade their pixels.
const historicalGpu = [];
const allowed = new Set(['apps/wechat-miniapp/src/features/sky/sky-deep-auxiliary-visibility.ts',
  'apps/wechat-miniapp/src/features/sky/sky-object-picking.ts', 'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts',
  task + 'scripts/experience-science-scene-2026-10-02.mts', task + 'scripts/experience-science-scene-browser-2026-10-02.ts']);
for (const gen of ['r3', 'r4', 'r5']) {
  const dir = 'output/playwright/cloud-sky-science-scene-1002-' + gen + '/';
  const result = await read(dir + 'result.json'); const differences = [];
  for (const entry of result.before) { const current = await bind(entry.path); if (current.sha256 !== entry.sha256 || current.bytes !== entry.bytes) { assert(allowed.has(entry.path), entry.path); differences.push(entry.path); } }
  assert(differences.includes('apps/wechat-miniapp/src/features/sky/sky-scene-render.ts'));
  historicalGpu.push({ generation: gen, originalAllPassed: result.allPassed, result: await bind(dir + 'result.json'), currentDifferences: differences, scope: 'Historical pixels are not new Scene evidence; unchanged renderer/registration/receipt dependencies remain source-bound.' });
}
const protectedFiles = await read(task + 'tmp/resume-preserved-hashes-2026-10-01.json');
for (const entry of protectedFiles) assert.equal((await bind(entry.path)).sha256, entry.sha256);
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(branch, 'codex/remote-main-20260908'); assert.equal(head, '72e65cf309d700cb7d40c5b7afd53660fd39fa35');
for (const entry of sources) assert.deepEqual(await bind(entry.path), entry);
const evidence = await Promise.all([ownerDir + 'source-bindings.json', ownerDir + 'typecheck-result.json', ownerDir + 'checks.log', ownerDir + 'equality-mutant.log', ownerDir + 'page-equality-mutant.tsx.txt',
  task + 'evidence/experience-pre-aid-common-opacity-development-2026-10-02.md', task + 'scripts/experience-common-opacity-root-join-2026-10-02.mjs'].map(bind));
const result = { passed: true, scope: 'Read-only current source/copy/check-result/independent graph join. No tests, GPU, IDE, native, service or source acquisition rerun.',
  branch, head, sources, oldOriginal, oldCopy, evidence, reviews, historicalGpu, protectedFiles: protectedFiles.length,
  authorMutationShaQualification: { originalGenericShaNames: 'mutant source, not log', mutantSource, mutantLog, timing: 'Explicit current post-execution binding; original author record unchanged.' },
  limitations: ['Author saved 15 final-run execution source copies; extra current bindings are post-execution and not exhaustive historical build reproduction.',
    'Typecheck is the observed silent successful tool result; no nonexistent raw stdout log is asserted.', 'Base independent r2 toolchain gaps are not backfilled by the later addendum bindings.',
    'Controlled Scene draw parameters/page/Hook/lifecycle scheduling are development proof, not new pixels/native callback or resource performance acceptance.',
    'Legacy angular curve is unchanged tuning; science readability/default/quality and full natural fading/native resources remain open.'] };
await fs.writeFile(output + 'result.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, result: await bind(output + 'result.json'), currentSources: sources.length, reviews: reviews.map(x => x.boundFiles), protectedFiles: protectedFiles.length, historicalGpu: historicalGpu.map(x => ({ generation: x.generation, differences: x.currentDifferences })) }));
