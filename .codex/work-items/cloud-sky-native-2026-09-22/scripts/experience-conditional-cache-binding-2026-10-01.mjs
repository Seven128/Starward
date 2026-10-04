import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fingerprintBundle } from '../../../../tools/miniapp/release-bundle-artifact.mjs';

const task = '.codex/work-items/cloud-sky-native-2026-09-22';
const output = task + '/evidence/experience-conditional-cache-binding-2026-10-01.json';
const frozen = task + '/evidence/experience-conditional-cache-events-frozen-2026-10-01.jsonl';
const watch = task + '/evidence/experience-conditional-cache-watch-frozen-2026-10-01.log';
for (const file of [output, frozen, watch]) await assert.rejects(fs.access(file), { code: 'ENOENT' });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const record = async file => { const bytes = await fs.readFile(file); return { path: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
const previousPath = task + '/evidence/experience-canvas-view-binding-2026-10-01.json';
const previous = JSON.parse(await fs.readFile(previousPath, 'utf8'));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
assert.equal(head, previous.head); assert.equal(branch, previous.branch);
const repairedPaths = new Set(['apps/wechat-miniapp/src/services/api-client.ts', 'apps/wechat-miniapp/src/services/response-cache.ts']);
const renderingInputChanges = [];
for (const row of previous.preservedRenderingInputs) {
  const current = await record(row.path);
  if (current.sha256 !== row.sha256) {
    assert(repairedPaths.has(row.path), row.path);
    renderingInputChanges.push({ path: row.path, beforeSha256: row.sha256, afterSha256: current.sha256 });
  }
}
for (const row of [...previous.productionAndConsumerSources, ...previous.preservedOtherEdits, ...previous.byteExactConfigurations]) {
  assert.equal((await record(row.path)).sha256, row.sha256, row.path);
}
const preservedCandidates = [];
for (const row of previous.preservedCandidates) {
  const current = await fingerprintBundle(path.resolve(row.path)); assert.equal(current.sha256, row.sha256);
  preservedCandidates.push({ path: row.path, sha256: current.sha256, fileCount: current.fileCount });
}
const beforeSources = [];
for (const name of ['response-cache', 'api-client']) {
  const file = task + '/tmp/conditional-cache-before-' + name + '-2026-10-01.ts';
  const before = await fs.readFile(file, 'utf8');
  const committed = execFileSync('git', ['show', 'HEAD:apps/wechat-miniapp/src/services/' + name + '.ts'], { encoding: 'utf8' });
  assert.equal(before.replaceAll('\r\n', '\n'), committed.replaceAll('\r\n', '\n'));
  beforeSources.push(await record(file));
}
const sourcePaths = new Set(previous.productionAndConsumerSources.map(row => row.path));
for (const name of ['api-client.ts', 'response-cache.ts', 'response-cache.test.ts', 'api-request-test-support.ts',
  'request-lifecycle.ts', 'request-lifecycle.test.ts', 'cache-policy.ts', 'cache-policy.test.ts',
  'account-reauthentication.test.ts', 'sao-catalog-client.ts']) sourcePaths.add('apps/wechat-miniapp/src/services/' + name);
for (const name of ['use-sky-stellar-supplement.ts', 'sky-stellar-tile-loader.ts', 'sky-stellar-tile-loader.test.ts',
  'sky-stellar-supplement-owner.test.ts', 'sky-stellar-query.test.ts', 'sky-stellar-tile-selection.ts',
  'sky-stellar-supplement-scene.ts', 'sky-object-picking.ts']) sourcePaths.add('apps/wechat-miniapp/src/features/sky/' + name);
sourcePaths.add('apps/wechat-miniapp/src/hooks/use-resource-query.ts');
sourcePaths.add('project_context/architecture/maintenance-boundaries.md');
const productionAndConsumerSources = await Promise.all([...sourcePaths].map(record));
const raw = await fs.readFile(task + '/evidence/experience-current-native-events-2026-10-01.jsonl');
const prefix = await fs.readFile(previous.trace.path); assert(raw.subarray(0, prefix.length).equals(prefix));
assert(!/\?[^"\r\n]*(?:contextId=|spotId=)/.test(raw.toString()));
const events = raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const stage = name => { const row = events.findLast(row => row.stage === name); assert(row, name); return row.value; };
const compileIndex = events.findLastIndex(row => row.stage === 'conditional-cache-compiler-requested');
assert(compileIndex >= previous.trace.eventCount);
assert.equal(stage('conditional-cache-compiler-dispatched').success, true);
assert.equal(events.slice(compileIndex).filter(row => row.stage === 'tool-failure').length, 0);
assert(events.findLastIndex(row => row.stage === 'conditional-cache-app-running') < events.findLastIndex(row => row.stage === 'conditional-cache-native-entry'));
const beforeNetwork = JSON.parse(await fs.readFile(task + '/evidence/experience-sao-native-network-before-2026-10-01.json', 'utf8'));
assert.equal(beforeNetwork.rows.length, 112);
assert(beforeNetwork.rows.filter(row => row.type === 'HTTP_RESPONSE').every(row => [200, 304].includes(row.status)));
const priorRecovery = stage('sao-native-settled-retry-scene');
assert(!priorRecovery.actions.some(row => row.text === '重试暗星'));
const retryNetwork = stage('sao-native-retry-network-summary');
assert.equal(retryNetwork.new.length, 4);
const retriedTile = retryNetwork.new.find(row => row.type === 'HTTP_RESPONSE' && row.path.endsWith('/tiles/06-10-7-0'));
assert.equal(retriedTile?.status, 200);
const baseline = stage('conditional-cache-native-baseline-scene');
const picked = stage('conditional-cache-native-sao-picked-scene');
const information = stage('conditional-cache-native-sao-information-scene');
const returned = stage('conditional-cache-native-sao-source-returned-scene');
const current = stage('conditional-cache-native-final-scene');
for (const scene of [baseline, picked, information, returned, current]) {
  assert.equal(scene.route, 'sky/detail/index');
  assert.equal(scene.canvas.labelFacts.presented, true);
  assert.equal(scene.canvas.labelFacts.verticalFovDeg, 45);
  assert.equal(scene.canvas.labelFacts.frameAt, '2026-09-30T13:50:33.000Z');
  assert.equal(scene.canvas.labelFacts.starCount, 4051);
  assert(!scene.actions.some(row => row.text === '重试暗星'));
}
assert(picked.actions.some(row => row.cl === 'sky-object-choice__row' && row.text.startsWith('SAO 20150 ')));
for (const scene of [information, returned]) {
  assert(scene.selection.some(row => row.label === 'SAO 20150已选中，查看资料'));
  assert(scene.modal.some(row => row.label === 'SAO 20150天体信息' && row.text.includes('视觉测光') && row.text.includes('6.00')));
}
for (const key of ['selection', 'modal', 'time']) assert.equal(current[key].length, 0);
const source = stage('conditional-cache-native-sao-source-page');
assert.equal(source.route, 'sky/sources/index');
assert(source.text.includes('SAO 20150') && source.text.includes('历史天体测量与视觉测光') && source.text.includes('原始获取时刻未记录'));
const files = Object.fromEntries(['baseline', 'source', 'source-returned', 'exit', 'final'].map(name => [name, stage('conditional-cache-native-' + name + '-files')]));
for (const name of ['baseline', 'source-returned', 'final']) {
  assert.equal(files[name].count, 10); assert.equal(files[name].encodedBytes, 1789615);
}
for (const name of ['source', 'exit']) { assert.equal(files[name].count, 0); assert.equal(files[name].encodedBytes, 0); }
const readback = stage('cold-image-durable-context-readback');
assert(readback.revisionUnchanged && readback.instantUnchanged && readback.fingerprintUnchanged);
assert.equal(readback.revision, 1); assert.equal(readback.contextPuts, 0);
assert.equal(readback.moduleSha256, previous.native.readback.moduleSha256);
const selectionPath = task + '/evidence/experience-sao-native-selection-2026-10-01.json';
const selection = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
assert.equal(selection.selected.length, 17); assert.equal(selection.selectedBytes, 126797); assert.equal(selection.overBudget, false);
const candidatesPath = task + '/evidence/experience-sao-native-pick-candidates-2026-10-01.json';
const candidates = JSON.parse(await fs.readFile(candidatesPath, 'utf8'));
assert.equal(candidates.candidate.reference, 'SAO:20150'); assert.equal(candidates.supplementPaintedObjects, 129);
const publication = JSON.parse(await fs.readFile('workers/miniapp-api/assets/sao-v2/index.json', 'utf8'));
const reusedSaoAssets = await Promise.all(['publication.json', 'index.json', ...selection.selected.map(row => row.id + '.json')]
  .map(name => record('workers/miniapp-api/assets/sao-v2/' + name)));
for (const row of selection.selected) {
  const expected = publication.tiles.find(tile => tile.id === row.id); assert(expected);
  assert.equal(reusedSaoAssets.find(file => file.path.endsWith('/' + row.id + '.json')).sha256, expected.sha256);
}
const beforeLog = await fs.readFile(task + '/evidence/experience-conditional-cache-before-2026-10-01.log', 'utf8');
assert(beforeLog.includes('retention pressure does not revoke this live request') && beforeLog.includes('AssertionError'));
const affectedLog = await fs.readFile(task + '/evidence/experience-conditional-cache-affected-final-2026-10-01.log', 'utf8');
assert(affectedLog.includes('pass 63') && affectedLog.includes('fail 0'));
const ownerLog = await fs.readFile(task + '/evidence/experience-conditional-cache-owner-final-2026-10-01.log', 'utf8');
assert(ownerLog.includes('pass 25') && ownerLog.includes('fail 0'));
const checks = await Promise.all(['before', 'affected', 'affected-final', 'owner-final', 'typecheck', 'typecheck-final', 'context-check']
  .map(name => record(task + '/evidence/experience-conditional-cache-' + name + '-2026-10-01.log')));
execFileSync('git', ['diff', '--check'], { stdio: 'pipe' });
const captures = [];
for (const name of ['dispatched', 'baseline', 'sao-picked', 'sao-information', 'sao-source', 'sao-returned', 'final']) {
  const capture = await record(task + '/evidence/experience-current-native-conditional-cache-' + name + '-2026-10-01.png');
  assert.equal(capture.sha256, stage('conditional-cache-' + name).sha256); captures.push(capture);
}
const ordinaryWatch = await fingerprintBundle(path.resolve(previous.ordinaryWatch.path)); assert.notEqual(ordinaryWatch.sha256, previous.ordinaryWatch.sha256);
const watchBytes = await fs.readFile(task + '/tmp/weapp-sky-watch-2026-10-01.log'); assert(watchBytes.toString().includes('15:01:09'));
await fs.writeFile(frozen, raw, { flag: 'wx' }); await fs.writeFile(watch, watchBytes, { flag: 'wx' });
await fs.writeFile(output, JSON.stringify({ at: new Date().toISOString(), scope: 'Bounded conditional-response request lifetime repair, distinct from retention budgets and native failure attribution; ordinary DevTools real SAO viewport pick/information/visible source/Back/exit/reentry.',
  head, branch, previous: await record(previousPath), trace: { ...await record(frozen), eventCount: events.length,
    previous576EventPrefixUnchanged: true, currentSourceCompileEventIndex: compileIndex },
  preservedRenderingInputs: await Promise.all(previous.preservedRenderingInputs.map(row => record(row.path))), renderingInputChanges,
  productionAndConsumerSources, beforeSources, preservedOtherEdits: previous.preservedOtherEdits,
  byteExactConfigurations: previous.byteExactConfigurations, preservedCandidates,
  ordinaryWatch: { path: previous.ordinaryWatch.path, sha256: ordinaryWatch.sha256, fileCount: ordinaryWatch.fileCount,
    totalBytes: ordinaryWatch.totalBytes, files: ordinaryWatch.files, log: await record(watch), sourceCompileAtLocal: '2026-10-01 15:01:09',
    scope: 'Existing ordinary watch contains six other-work edits; not a clean candidate or official package measurement' },
  checks, verifiedExecution: { beforeFix: { exitCode: 1, actualBoundary: 'Real production transport rejects a 304 after memory and disk capacity reclaim its captured body' },
    affected: { exitCode: 0, pass: 63, fail: 0 }, afterFinalTestTypeNarrowing: { exitCode: 0, pass: 25, fail: 0, scope: 'Cache owner rerun; other unchanged affected checks retain prior source applicability' },
    miniTypecheck: { exitCode: 0 }, contextStructure: { exitCode: 0 }, whitespace: { exitCode: 0 },
    initialTypecheck: { exitCode: 2, reason: 'New regression catch result was unknown; narrowed through the real envelope validator; original log retained' },
    review: 'Primary-agent diff inspection only; independent review remains a gap' },
  priorNativeFailure: { previousReportedFailure: previous.native.darkStarFailure,
    network: await record(task + '/evidence/experience-sao-native-network-before-2026-10-01.json'), priorRecovery, retryNetwork,
    limits: 'One public retry recovered before the production cache edit. HTTP 200/304 does not identify the swallowed native failure. The deterministic capacity defect is not asserted to be the proven cause of that occurrence.' },
  existingDataModel: { selection: await record(selectionPath), candidates: await record(candidatesPath), reusedSaoAssets,
    scope: '17 existing tiles / 126797 selected bytes fit the unchanged 6MiB view budget. The 129 objects and coordinate are production-model results on a stub surface, not a native star census or pixel acceptance.' },
  native: { baseline, viewportTap: stage('conditional-cache-native-sao-viewport-tap'), picked, information,
    source, returned, current, files, readback,
    sourceVisibility: 'Actual source-page PNG inspected; ordinary source WXML visible with Sky Canvas retired. Main Sky ordinary controls/reticle/modal remain absent in actual images.' },
  captures, inspectedCaptureStages: ['dispatched', 'baseline', 'sao-information', 'sao-source', 'final'],
  scripts: await Promise.all(['experience-conditional-cache-native-2026-10-01.ps1', 'experience-sao-native-selection-2026-10-01.mts',
    'experience-sao-native-pick-candidates-2026-10-01.mts', 'experience-current-native-helpers-2026-10-01.ps1'].map(name => record(task + '/scripts/' + name))),
  limits: ['No new response cache, retained-byte/item limit, source download, service epoch, Context/time owner or source choice',
    'Request-held references are bounded by existing live requests and terminal cleanup; target decoded/native/GPU/OS/GC totals/peaks are unmeasured',
    'SDK viewport/control events are not physical input or visible main-Sky control acceptance; Taro raw data-* omissions are not filled as zero/READY',
    'Canvas+WXML remains FAILED_DEVTOOLS; whole-scene/source quality/coverage, full calibration/journey, Android+iOS/new moon, performance/package/cost and final independent review remain unverified',
    'No phone action, candidate replacement, Git commit/push, deploy or new agent; Goal active/unbudgeted/incomplete']
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, eventCount: events.length, sourceRecords: productionAndConsumerSources.length,
  preservedEdits: previous.preservedOtherEdits.length, renderingInputChanges: renderingInputChanges.length,
  nativePicked: 'SAO:20150', contextPuts: 0, composition: 'FAILED_DEVTOOLS', review: 'GAP' }));
