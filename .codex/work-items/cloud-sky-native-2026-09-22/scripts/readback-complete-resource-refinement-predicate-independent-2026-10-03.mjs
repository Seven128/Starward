import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
const original = 'output/playwright/cloud-sky-complete-resource-1003-r1/';
const launch = 'output/playwright/cloud-sky-complete-resource-execution-1003-r2/';
const out = path.join(root, 'output/complete-resource-refinement-predicate-independent-1003-r1');
await fs.mkdir(out);
const hash = b => createHash('sha256').update(b).digest('hex');
const bindings = [];
async function read(file, copy = false) {
  const bytes = await fs.readFile(path.join(root, file));
  bindings.push({ path: file, bytes: bytes.length, sha256: hash(bytes) });
  if (copy) { const target = path.join(out, 'sources', file); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, bytes, { flag: 'wx' }); }
  return bytes;
}
const failed = JSON.parse(await read(original + 'failed.json'));
const execution = JSON.parse(await read(launch + 'result.json'));
assert.equal(failed.status, 'FAILED');
assert.notEqual(execution.exitCode, 0);
const start = failed.message.indexOf('{"qualification"');
const end = failed.message.indexOf('\n    at eval', start);
assert(start > 0 && end > start);
const state = JSON.parse(failed.message.slice(start, end));
const sdss = state.sdss;
assert.deepEqual(sdss, { requested: true, loading: false, failed: false, updateFailed: true, renderedLevel: 'MEDIUM', parent: 'OVERVIEW' });
assert.equal(state.held, 0);
assert.equal(state.counters.nativeRunning, 0);
assert.equal(state.counters.decodedPending, 0);
const hook = state.hooks.find(h => h.name === 'sdssOptical');
assert.equal(hook.failed, true);
assert.deepEqual(hook.wanted.map(a => a.id), ['sdss:M:51:DETAIL', 'sdss:M:51:MEDIUM']);
assert.equal(hook.ready[0].id, 'sdss:M:51:MEDIUM');
assert.equal(hook.ready[0].objectId, 25);
assert.equal(hook.ready[0].sha256, 'eee315a0e76c58d5ba67072764d54c7cfa7979c8f060cce8e548150aba497de0');
const held = failed.partial.passes.find(p => p.label === 'detail-held-medium-ready');
assert(held);
assert.equal(held.presented.sdss.image.objectId, hook.ready[0].objectId);
assert.equal(held.presented.sdss.image.sha256, hook.ready[0].sha256);
assert.equal(held.sourceCredit.sdssOpticalStatus, 'CREDIT');
assert.equal(held.state.sdss.parent, 'OVERVIEW');
assert.equal(held.glError, 0);
const oldHelper = (await read(launch + 'source-2.txt', true)).toString('utf8');
const currentHelper = (await read(task + 'scripts/experience-complete-resource-browser-2026-10-02.ts', true)).toString('utf8');
assert.equal(hash(oldHelper), '432ddb742b1475567a09edc6759bbb21b3c05f24e23c6aeaad3d4ad7c82a3e2e');
assert.equal(hash(currentHelper), '1f56f54413dc382e539b5b616ca04af83d6896f81596042f2fc09869c7bb9c5e');
const reversed = currentHelper.replace('s.sdss.updateFailed&&!s.sdss.failed&&!s.sdss.loading&&!s.sao.loading', 's.sdss.failed&&!s.sdss.loading&&!s.sao.loading')
  .replace('!s.sdss.failed&&!s.sdss.updateFailed&&s.sdss.renderedLevel', '!s.sdss.failed&&s.sdss.renderedLevel');
assert.equal(reversed, oldHelper);
const main = await read(task + 'scripts/experience-complete-resource-journey-2026-10-02.mts', true);
assert.equal(hash(main), '1178c9146381a9e2e646ca7e6211607259859efd48969a49e4231c41f07e137c');
const currentOwner = await read('apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.ts', true);
const executedOwner = await read(original + 'source-inputs/apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.ts', true);
assert(currentOwner.equals(executedOwner));
await read('apps/wechat-miniapp/src/features/sky/sky-fixed-image-status.ts', true);
await read(original + 'executor-journey.js.txt', true);
await read(launch + 'raw.log');
for (let i = 0; i < failed.partial.passes.length; i++) {
  await read(original + `failure-partial-${i}.png`);
  const raw = await read(original + `failure-partial-${i}.rgba`);
  assert.equal(raw.length, 390 * 844 * 4);
}
const oldPredicate = Boolean(sdss.failed && !sdss.loading && !state.sao.loading);
const fixedPredicate = Boolean(sdss.updateFailed && !sdss.failed && !sdss.loading && !state.sao.loading);
assert.equal(oldPredicate, false);
assert.equal(fixedPredicate, true);
const result = {
  status: 'READONLY_ACTUAL_FAILURE_AND_TWO_PREDICATE_DELTA_CONFIRMED',
  failedRunRemainsOverallFailed: true, originalExitCode: execution.exitCode,
  savedCompletedRows: failed.rows, observedTimeout: { sdss, counters: state.counters, held: state.held,
    underlyingHookFailed: hook.failed, wanted: hook.wanted.map(a => a.id), ready: hook.ready.map(a => ({ id: a.id, objectId: a.objectId, sha256: a.sha256 })) },
  heldPublished: { publicationHash: held.presented.sdss.publicationHash, image: held.presented.sdss.image, credit: held.sourceCredit, glError: held.glError },
  actualOldPredicate: oldPredicate, fixedFailurePredicate: fixedPredicate,
  exactHelperDeltaOnly: true, productionOwnerMatchesExecutedCopy: true, mainUnchanged: true,
  findings: [
    'The actual default status defines failed only when no decoded image survives. Underlying DETAIL failure while MEDIUM survives is updateFailed, not image unavailability.',
    'The saved timeout state witnesses the escaped harness predicate: failed=false/updateFailed=true, no pending native/decode and independent MEDIUM retained.',
    'The new wait observes refinement update failure while keeping image-available false-failed meaning, then explicitly requires updateFailed=false on successful DETAIL retry.',
    'Removing the two exact predicate additions reproduces the entire executed old helper. No production code, camera, assets, budget, draw, source or phase was changed.'
  ],
  limits: [
    'No GPU or new test was executed. Saved raw/PNG files are bound here, not independently decoded or compared by this narrow predicate review.',
    'The failed run has only three complete rows and three fourth-row partial captures; it has no completed retry/return/final cleanup or full post-run qualification.',
    'No new actual result, scientific JPEG coverage, image quality, native memory, 12 Mbps or 200 DAU capacity is certified.'
  ], bindings
};
await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, out), bindings: bindings.length, sha256: hash(await fs.readFile(path.join(out, 'result.json'))) }));
