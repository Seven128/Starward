/** Independent task-only encoded-payload identity review. No network/native IO. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { skyImageContentHash } from '../../../../packages/miniapp-contracts/src/sky-image-display-support.ts';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const SCRIPT = fileURLToPath(import.meta.url);
const hash = (raw: Uint8Array | string) => createHash('sha256').update(raw).digest('hex');
const read = (name: string) => fs.readFileSync(path.join(ROOT, name));
const json = (name: string) => JSON.parse(read(name).toString('utf8'));
const bind = (name: string) => ({ path: name.replaceAll('\\', '/'), bytes: read(name).length, sha256: hash(read(name)) });
const scriptName = path.relative(ROOT, SCRIPT).replaceAll('\\', '/');
const base = 'output/sky-artwork-digest-independent-1002';
let output = base;
for (let suffix = 1; fs.existsSync(path.join(ROOT, output)); suffix++) output = `${base}-r${suffix}`;
fs.mkdirSync(path.join(ROOT, output));
const out = (name: string) => path.join(ROOT, output, name);
const save = (name: string, value: unknown) => fs.writeFileSync(out(name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

const sourceNames = [
  'apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts',
  'packages/miniapp-contracts/src/sky-image-display-support.ts',
  'packages/miniapp-contracts/src/index.ts', 'packages/miniapp-contracts/package.json',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',
  'apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',
  'apps/wechat-miniapp/src/features/sky/use-sky-fixed-image.ts',
  'apps/wechat-miniapp/src/features/sky/use-sky-galactic-image.ts',
  'apps/wechat-miniapp/src/features/sky/use-sky-wide-field-w3.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-request.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-file-retention.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-native-image-owner.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts',
  'packages/astronomy-core/src/constellation-catalog.ts',
  'packages/astronomy-core/data/stellarium-modern-v24.4.v3.json',
  'packages/astronomy-core/data/stellarium-modern-v24.4.v3.manifest.json',
  'workers/miniapp-api/src/constellation-publication.ts',
  'workers/miniapp-api/assets/moon/manifest.json',
  'workers/miniapp-api/assets/deep-sky/galactic-2mass/manifest.json',
  'workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json', scriptName,
  '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sky-artwork-digest-decode-2026-10-02.py',
];
const before = sourceNames.map(bind);
const preserved = json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
for (const entry of preserved) assert.equal(bind(entry.path).sha256, entry.sha256);
const constellation = json('packages/astronomy-core/data/stellarium-modern-v24.4.v3.json');
assert.equal(constellation.catalogVersion, 'stellarium-modern-v24.4.v3');
const largest = [...constellation.images].sort((a, b) => b.bytes - a.bytes)[0];
const moon = json('workers/miniapp-api/assets/moon/manifest.json').image;
const twoMass = json('workers/miniapp-api/assets/deep-sky/galactic-2mass/manifest.json').image;
const w3 = json('workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json').tiles[0];
const resources = [
  { role: 'largest-encoded-published-constellation', path: 'workers/miniapp-api/assets/constellations/' + largest.file, asset: largest, format: 'png' },
  { role: 'current-Moon', path: 'workers/miniapp-api/assets/moon/' + moon.file, asset: moon, format: 'jpeg' },
  { role: 'current-2MASS', path: 'workers/miniapp-api/assets/deep-sky/galactic-2mass/' + twoMass.file, asset: twoMass, format: 'jpeg' },
  { role: 'one-W3-order0-tile', path: 'workers/miniapp-api/assets/deep-sky/wide-field-w3/' + w3.file, asset: { ...w3, width: 512, height: 512 }, format: 'jpeg' },
];
const vectorInputs = [new Uint8Array(), new TextEncoder().encode('abc'), new Uint8Array([1, 2, 3, 4, 5]).subarray(1, 4)];
const vectors = vectorInputs.map(bytes => {
  const original = bytes.slice();
  const digest = skyImageContentHash(bytes);
  assert.equal(digest, hash(bytes)); assert.deepEqual(bytes, original);
  return { bytes: [...bytes], sha256: digest };
});

// Exactly one warmup plus three timed shared-helper calls per published file.
// File reads and Node crypto comparisons are outside the timed section.
const skipTiming = process.argv.includes('--skip-timing');
const timings = resources.map(resource => {
  const bytes = read(resource.path);
  assert.equal(bytes.length, resource.asset.bytes);
  const digest = hash(bytes);
  assert.equal(digest, resource.asset.sha256);
  const beforeBytes = Buffer.from(bytes);
  const timesMs: number[] = [];
  if (!skipTiming) {
    assert.equal(skyImageContentHash(bytes), digest);
    for (let repeat = 0; repeat < 3; repeat++) {
      const started = performance.now();
      const actual = skyImageContentHash(bytes);
      timesMs.push(performance.now() - started);
      assert.equal(actual, digest);
    }
  }
  assert.deepEqual(bytes, beforeBytes);
  const sorted = [...timesMs].sort((a, b) => a - b);
  return { ...resource, binding: bind(resource.path), repetitions: { warmup: skipTiming ? 0 : 1, timed: skipTiming ? 0 : 3 }, timesMs,
    minMs: sorted[0] ?? null, medianMs: sorted[1] ?? null, maxMs: sorted[2] ?? null,
    nodeCryptoMatch: skipTiming ? null : true, inputBytesUnchanged: true };
});
save('digest-timings.json', { skipTiming, timings });

const requestSource = read(sourceNames[0]).toString('utf8');
const guard = 'if(skyImageContentHash(bytes)!==input.asset.sha256){fail();return;}';
assert.equal(requestSource.split(guard).length - 1, 1);
const mutantSource = requestSource.replace(guard, '/* task-only mutation: actual payload digest predicate removed */');
fs.writeFileSync(out('request-owner.ts.txt'), requestSource, { flag: 'wx' });
fs.writeFileSync(out('request-owner-digest-bypass.ts.txt'), mutantSource, { flag: 'wx' });
function compileOwner(source: string) {
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: Record<string, any> = {};
  vm.runInNewContext(js, { exports, ArrayBuffer, Uint8Array, DataView,
    require(name: string) { assert.equal(name, '@starward/miniapp-contracts'); return { skyImageContentHash }; } }, { timeout: 5000 });
  return exports;
}
const production = compileOwner(requestSource);
const mutant = compileOwner(mutantSource);
const original = read(resources[3].path);
const changed = Buffer.from(original);
let quantizationOffset = -1;
for (let offset = 2; offset + 4 < changed.length;) {
  assert.equal(changed[offset++], 0xff);
  while (changed[offset] === 0xff) offset++;
  const marker = changed[offset++];
  if (marker === 0xda) break;
  const length = changed.readUInt16BE(offset);
  assert(length >= 2 && offset + length <= changed.length);
  if (marker === 0xdb && (changed[offset + 2] >> 4) === 0) { quantizationOffset = offset + 3; break; }
  offset += length;
}
assert(quantizationOffset > 0);
const oldQuantization = changed[quantizationOffset];
const newQuantization = Math.min(255, oldQuantization + Math.max(1, Math.floor(oldQuantization / 2)));
assert.notEqual(oldQuantization, newQuantization);
changed[quantizationOffset] = newQuantization;
assert.equal(changed.length, original.length);
assert.deepEqual(production.skyJpegDimensions(changed), production.skyJpegDimensions(original));
assert.equal(production.skyJpegDimensions(changed)?.width, 512);
assert.equal(production.skyJpegDimensions(changed)?.height, 512);
assert.notEqual(hash(changed), hash(original));
fs.writeFileSync(out('W3-Npix0-quantization-substitution.jpg'), changed, { flag: 'wx' });

function exercise(owner: Record<string, any>, payload: Uint8Array, manifestHash = w3.sha256) {
  const events: string[] = [];
  let requestOptions: any, writeOptions: any, image: any, loaded: any;
  const cancel = owner.startSkyArtworkRequest({
    asset: { ...w3, width: 512, height: 512, sha256: manifestHash }, format: 'jpeg',
    url: '/task-only-controlled-response', filePath: '/task-only-controlled-file',
    canvas: { createImage() { events.push('createImage'); image = { width: 512, height: 512, src: '', onload: null, onerror: null }; return image; } },
    request(options: any) { events.push('request'); requestOptions = options; return { abort() { events.push('abort'); } }; },
    writeFile(options: any) { events.push('writeFile'); writeOptions = options; },
    removeFile() { events.push('removeFile'); },
    ready(value: any) { events.push('ready'); loaded = value; },
    fail() { events.push('fail'); },
  });
  if (requestOptions) {
    const response = payload.slice();
    requestOptions.success({ statusCode: 200, data: response.buffer.slice(response.byteOffset, response.byteOffset + response.byteLength) });
    if (writeOptions) { assert.equal(hash(new Uint8Array(writeOptions.data)), hash(payload)); writeOptions.success(); }
    image?.onload?.();
  }
  const counts = Object.fromEntries(['request', 'writeFile', 'createImage', 'ready', 'fail', 'removeFile'].map(name => [name, events.filter(e => e === name).length]));
  loaded?.release(); loaded?.release(); cancel();
  return { events, countsBeforeRelease: counts, removeCountAfterRelease: events.filter(e => e === 'removeFile').length,
    note: 'Controlled request/write/native callbacks; independent Pillow decode proves payload validity separately.' };
}
const originalPath = exercise(production, original);
assert.deepEqual(originalPath.countsBeforeRelease, { request: 1, writeFile: 1, createImage: 1, ready: 1, fail: 0, removeFile: 0 });
assert.equal(originalPath.removeCountAfterRelease, 1);
const guardedReplacement = exercise(production, changed);
assert.deepEqual(guardedReplacement.countsBeforeRelease, { request: 1, writeFile: 0, createImage: 0, ready: 0, fail: 1, removeFile: 0 });
const bypassReplacement = exercise(mutant, changed);
assert.deepEqual(bypassReplacement.countsBeforeRelease, { request: 1, writeFile: 1, createImage: 1, ready: 1, fail: 0, removeFile: 0 });
const invalidManifest = ['', 'asset-0', 'a'.repeat(63), 'A'.repeat(64)].map(manifestHash => {
  const result = exercise(production, original, manifestHash);
  assert.deepEqual(result.countsBeforeRelease, { request: 0, writeFile: 0, createImage: 0, ready: 0, fail: 1, removeFile: 0 });
  return { manifestHash, result };
});

const python = 'C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const decodeScript = path.join(ROOT, '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sky-artwork-digest-decode-2026-10-02.py');
const decoded = spawnSync(python, [decodeScript, path.join(ROOT, resources[3].path), out('W3-Npix0-quantization-substitution.jpg')], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
fs.writeFileSync(out('decode-probe-stdout.txt'), decoded.stdout, { flag: 'wx' });
fs.writeFileSync(out('decode-probe-stderr.txt'), decoded.stderr, { flag: 'wx' });
assert.equal(decoded.status, 0, decoded.stderr);
const actualDecode = JSON.parse(decoded.stdout);
assert(actualDecode.changedPixels > 0 && actualDecode.sameDimensions && actualDecode.sameEncodedLength);
save('decode.json', actualDecode);

const testArgs = ['tools/run-node.cjs', '--import', 'tsx', '--test',
  'apps/wechat-miniapp/src/features/sky/sky-artwork-request.test.ts',
  'apps/wechat-miniapp/src/features/sky/sky-native-image-chain.test.ts'];
const tests = spawnSync(process.execPath, testArgs, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
fs.writeFileSync(out('representative-tests.txt'), tests.stdout + tests.stderr, { flag: 'wx' });
assert.equal(tests.status, 0, tests.stdout + tests.stderr);
const after = sourceNames.map(bind);
assert.deepEqual(after, before);
for (const entry of preserved) assert.equal(bind(entry.path).sha256, entry.sha256);
save('result.json', {
  scope: 'Independent task-only payload identity review; controlled callbacks plus real local JPEG/Pillow decode. No HTTP, native runtime, GPU, FS readback or persistence certification.',
  generatedAt: new Date().toISOString(), output,
  environment: { node: process.version, platform: process.platform, architecture: process.arch, cpu: os.cpus()[0].model,
    typescript: ts.version, nobleDeclaredVersion: json('packages/miniapp-contracts/package.json').dependencies['@noble/hashes'] },
  sourceBindingsBefore: before, sourceBindingsAfter: after, sourcesUnchanged: true, preservedSixUnchanged: true,
  vectors, publishedCatalog: { version: constellation.catalogVersion, imageCount: constellation.images.length, largestSelection: 'max manifest encoded bytes, not decoded memory' },
  digestTimings: timings,
  timingSkipped: skipTiming,
  timingBoundary: 'Unless explicitly skipped, one warmup and three timed pure-JS shared-helper calls per cached encoded file. Independent Node crypto comparison outside timers. Digest belongs to one downloaded response before write/decode, not a frame/render or retained-file redecode loop. Desktop only, no native/4GB/16GB/DAU inference.',
  mutation: { productionSnapshotSha256: hash(requestSource), mutantSnapshotSha256: hash(mutantSource), guardRemovedExactlyOnce: true,
    meaning: 'Counterfactual bypass of current digest predicate; not a claim about a historical Git revision.',
    resource: resources[3].path, originalSha256: hash(original), changedSha256: hash(changed), encodedBytes: original.length,
    quantizationOffset, oldQuantization, newQuantization, metadataDimensionsUnchanged: true, actualDecode,
    originalPath, guardedReplacement, bypassReplacement, invalidManifest },
  tests: { command: [process.execPath, ...testArgs], status: tests.status, expectedRepresentativePasses: 11,
    boundary: 'Request/native-chain controlled callback tests, with real published encoded files in chain tests; not actual WeChat native decoder or driver.' },
  limitations: ['Digest establishes encoded content identity only.', 'No scientific validity, rights or authorization decision.',
    'No FS write/readback, persistent cache integrity or target-native decode/timing claim.', 'PNG request fixtures have controlled headers, not necessarily full decodable PNGs.'],
});
const resultBinding = bind(output + '/result.json');
console.log(JSON.stringify({ resultBinding, timings: timings.map(t => ({ role: t.role, bytes: t.binding.bytes, timesMs: t.timesMs })),
  mutation: { changedPixels: actualDecode.changedPixels, guarded: guardedReplacement.countsBeforeRelease, bypass: bypassReplacement.countsBeforeRelease } }));
