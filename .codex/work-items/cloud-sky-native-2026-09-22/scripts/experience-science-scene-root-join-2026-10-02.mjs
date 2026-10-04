import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const task = '.codex/work-items/cloud-sky-native-2026-09-22/';
const output = 'output/science-scene-root-join-1002-r2/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const bind = async file => { const bytes = await fs.readFile(file); return { path: file, bytes: bytes.length, sha256: sha(bytes) }; };
const scriptPaths = [task + 'scripts/experience-science-scene-2026-10-02.mts', task + 'scripts/experience-science-scene-browser-2026-10-02.ts'];
const expectedFailures = {
  r3: ['default-no-group-no-aux', 'late-occlusion-withdraws-credit-not-spectral-selection'],
  r4: ['late-opaque.actual-complete-opaque-and-navigation-output', 'late-occlusion-withdraws-credit-not-spectral-selection'],
  r5: [],
};
const browserCopies = { r3: 'failed-oracle-browser-source.ts.txt', r4: 'failed-origin-browser-source.ts.txt' };
await assert.rejects(fs.access(output), { code: 'ENOENT' });
await fs.mkdir(output, { recursive: true });
const inputs = [], generations = [], comparisons = [];
const beforeNow = [];
let r3Observation, r5Observation;

for (const gen of ['r3', 'r4', 'r5']) {
  const dir = 'output/playwright/cloud-sky-science-scene-1002-' + gen + '/';
  const [result, before, after, observation] = await Promise.all(['result.json', 'inputs-before.json', 'inputs-after.json', 'observations.json'].map(name => read(dir + name)));
  assert.deepEqual(before.before, after.after); assert.equal(after.unchanged, true);
  assert.deepEqual(result.before, before.before); assert.deepEqual(result.after, after.after);
  assert.equal(new Set(before.before.map(x => x.path)).size, before.before.length);
  const bundle = await bind(dir + 'executed-bundle.js');
  assert.equal(bundle.bytes, before.bundle.bytes); assert.equal(bundle.sha256, before.bundle.sha256);
  const beforeMap = new Map(before.before.map(x => [x.path, x]));
  for (const file of Object.keys(before.metafile.inputs)) {
    const relative = path.relative(process.cwd(), path.resolve(file)).replaceAll('\\', '/');
    assert(beforeMap.has(relative), 'executed esbuild input is bound: ' + relative);
    assert.equal(beforeMap.get(relative).bytes, before.metafile.inputs[file].bytes);
  }
  const currentDifferences = [];
  for (const historical of before.before) {
    const now = await bind(historical.path);
    if (now.sha256 !== historical.sha256 || now.bytes !== historical.bytes) currentDifferences.push(historical.path);
    if (!scriptPaths.includes(historical.path)) assert.deepEqual(now, historical);
    if (!beforeNow.some(x => x.path === now.path)) beforeNow.push(now);
  }
  assert.deepEqual(currentDifferences.sort(), gen === 'r5' ? [] : [...scriptPaths].sort());
  if (browserCopies[gen]) {
    const copy = await bind(dir + browserCopies[gen]);
    const original = beforeMap.get(scriptPaths[1]);
    assert.equal(copy.sha256, original.sha256); assert.equal(copy.bytes, original.bytes);
    inputs.push(copy);
  } else {
    // Freeze the exact still-current executed scripts after execution. These
    // copies are additive evidence, never backdated into the old pre-inventory.
    const copied = [];
    for (const [index, file] of scriptPaths.entries()) {
      const original = beforeMap.get(file); const bytes = await fs.readFile(file);
      assert.equal(sha(bytes), original.sha256); assert.equal(bytes.length, original.bytes);
      const target = dir + (index === 0 ? 'postexecution-exact-host.mts.txt' : 'postexecution-exact-browser.ts.txt');
      try { await fs.writeFile(target, bytes, { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; assert.equal(sha(await fs.readFile(target)), original.sha256); }
      copied.push(await bind(target));
    }
    const copiesRecord = { timing: 'Post-execution exact copies; original before/after SHA-256 verified. No pre-execution inventory is changed.', copied };
    try { await fs.writeFile(dir + 'postexecution-exact-copies.json', JSON.stringify(copiesRecord, null, 2) + '\n', { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; assert.deepEqual(await read(dir + 'postexecution-exact-copies.json'), copiesRecord); }
    inputs.push(...copied, await bind(dir + 'postexecution-exact-copies.json'));
  }
  assert.deepEqual(observation.checks.filter(x => !x.pass).map(x => x.name).sort(), [...expectedFailures[gen]].sort());
  assert.equal(result.allPassed, gen === 'r5');
  assert.equal(observation.failure, null); assert.deepEqual(observation.pageErrors, []);
  assert.equal(observation.final.contextLost, false); assert.equal(observation.final.glError, 0);
  assert(Object.values(observation.final.counts).every(x => x === 0));
  for (const capture of observation.captures) {
    for (const field of ['raw', 'png']) { assert.deepEqual(await bind(capture[field].path), capture[field]); inputs.push(capture[field]); }
    assert.equal(capture.raw.bytes, 4 * capture.width * capture.height);
  }
  for (const name of ['result.json', 'inputs-before.json', 'inputs-after.json', 'observations.json', 'executed-bundle.js']) inputs.push(await bind(dir + name));
  generations.push({ generation: gen, originalAllPassed: result.allPassed, rows: observation.rows.map(x => x.name), expectedHistoricalFailedChecks: expectedFailures[gen], currentDifferences, metafileInputs: Object.keys(before.metafile.inputs).length, bindingCount: before.before.length });
  if (gen === 'r3') r3Observation = observation;
  if (gen === 'r5') r5Observation = observation;
}

// Recompute the entire saved framebuffer comparisons. Saved result booleans
// alone cannot establish equality or the actual late opaque extent.
for (const [a, b] of [['actual-pair', 'probe-budget-denied'], ['no-intent', 'complete-ready-empty'], ['no-intent', 'whole-unsubmitted']]) {
  const capture = name => r3Observation.captures.find(x => x.name === name);
  const [x, y] = await Promise.all([fs.readFile(capture(a).raw.path), fs.readFile(capture(b).raw.path)]);
  assert.equal(x.length, y.length); let unequal = 0;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) unequal++;
  assert.equal(unequal, 0); comparisons.push({ a, b, bytes: x.length, unequal });
}
const lateCapture = r5Observation.captures.find(x => x.name === 'late-opaque');
const lateRaw = await fs.readFile(lateCapture.raw.path); let wrongLatePixels = 0;
for (let y = 0; y < lateCapture.height; y++) for (let x = 0; x < lateCapture.width; x++) {
  const at = 4 * (y * lateCapture.width + x);
  const expected = y < lateCapture.height - 8 ? [255, 255, 255, 255] : [8, 13, 23, 255];
  if (expected.some((value, c) => lateRaw[at + c] !== value)) wrongLatePixels++;
}
assert.equal(wrongLatePixels, 0);
const high = r3Observation.rows.find(x => x.name === 'actual-high-dpr');
const [width, height] = high.physical; let w = width, h = height, scratch = 0;
while (w > 1 || h > 1) { w = Math.ceil(w / 2); h = Math.ceil(h / 2); scratch += 4 * w * h; }
const auxiliary = 4 * width * height + scratch;
assert.equal(auxiliary, 15803512); assert.equal(high.plannedAuxiliary.total, auxiliary);
assert.equal(high.peakLogicalAttachedTextureBytes, auxiliary);
const highReads = r3Observation.events.slice(high.eventsFrom, high.eventsTo).filter(x => x.event === 'read');
assert.equal(highReads.length, 2); assert(highReads.every(x => x.width === 1 && x.height === 1));

const authorFile = 'output/sdss-science-scene-consumer-1002-r1/source-bindings.json';
const author = await read(authorFile);
for (const [file, hash] of Object.entries(author.files)) assert.equal((await bind(file)).sha256, hash);
assert.equal(author.appTypecheck.exitCode, 0);
for (const field of ['newSceneActualWriter', 'newScenePortable', 'legacyScene']) assert.equal(author[field].fail, 0);
inputs.push(await bind(authorFile), await bind(author.actualWriterLog));
const preserved = await read(task + 'tmp/resume-preserved-hashes-2026-10-01.json');
for (const entry of preserved) assert.equal((await bind(entry.path)).sha256, entry.sha256);
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(branch, 'codex/remote-main-20260908'); assert.equal(head, '72e65cf309d700cb7d40c5b7afd53660fd39fa35');
for (const entry of beforeNow) assert.deepEqual(await bind(entry.path), entry);
inputs.push(await bind(task + 'scripts/experience-science-scene-root-join-2026-10-02.mjs'));
const result = {
  passed: true, scope: 'Read-only current-production/file/full-raw join plus explicit post-execution exact script copies. No new GPU/test/IDE/device/acquisition.',
  branch, head, generations, currentBindings: beforeNow, evidenceBindings: inputs, comparisons,
  lateOpaque: { pixels: lateCapture.width * lateCapture.height, wrongLatePixels },
  highDpr: { backing: high.physical, logicalAuxiliaryBytes: auxiliary, probeReads: highReads.length, totalLogicalTexturePeak: high.peakLogicalTextureBytes },
  preservedFiles: preserved.length, authorChecks: author,
  limitations: ['r3 and r4 remain overall failed; only explicitly scoped corrected assertions are joined from r4/r5.', 'r3/r4 raw host text was not preserved. Their executed bundles are bound; historical browser raw copies are exact.', 'tsconfig and esbuild toolchain version were not included in the historic input inventory. This join does not certify fully reproducible historical builds.', 'Texture-attached byte totals can include ordinary W3 source-window FBOs and are not universally auxiliary totals.', 'Software WebGL task opt-in is not native/default/quality/readability/whole-scene performance acceptance.'],
};
await fs.writeFile(output + 'result.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, output, result: await bind(output + 'result.json'), generations, comparisons, lateOpaque: result.lateOpaque, highDpr: result.highDpr, preservedFiles: preserved.length }));
