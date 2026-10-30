import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { addD2DecodeCheckpoint } from './d2-decode-checkpoint-instrumentation.mjs';
import { D2_DECODE_CHECKPOINT_SCHEMA, validateD2DecodeObservation, validateD2DecodeCheckpoint } from './d2-decode-checkpoint-protocol.mjs';
import { validateR25MemoryCheckpoint } from './r25-memory-checkpoint-protocol.mjs';
import { memoryCheckpointHarness } from './memory-checkpoint-test-support.mjs';
const require = createRequire(import.meta.url), ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const root = new URL('../../../../', import.meta.url);
const read = name => fs.readFile(new URL(name, import.meta.url), 'utf8');
const runtime = await read('d2-decode-observation.ts'), adapter = await read('r25-memory-lifetime-adapter.ts');
const request = await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts', root), 'utf8');
const transformed = addD2DecodeCheckpoint({ request, adapter });
function compile(source) {
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(v => v.category === ts.DiagnosticCategory.Error).length, 0);
  return result.outputText;
}
function moduleOf(source, imports = {}, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,require,module){' + compile(source) + '\n})', globals)(module.exports,
    name => { assert(Object.hasOwn(imports, name), 'unapproved import: ' + name); return imports[name]; }, module);
  return module.exports;
}
const fresh = globals => moduleOf(runtime, {}, globals);
const snapshot = observation => {
  const value = JSON.parse(JSON.stringify(observation.snapshot()));
  assert.equal(validateD2DecodeObservation(value), true); return value;
};
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const baseImports = {
  '../../services/sky-image-bytes': moduleOf(await fs.readFile(new URL('apps/wechat-miniapp/src/services/sky-image-bytes.ts', root), 'utf8'), {
    '@starward/miniapp-contracts': { skyImageContentHash: data => createHash('sha256').update(data).digest('hex') },
  }),
  '../../services/sky-native-array-buffer': moduleOf(await fs.readFile(new URL('apps/wechat-miniapp/src/services/sky-native-array-buffer.ts', root), 'utf8')),
  './sky-artwork-loader': moduleOf(await fs.readFile(new URL('apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts', root), 'utf8'), {
    '../../services/sky-image-diagnostics': { reportSkyImageError() {} },
  }),
};
function productHarness({ observed = true, throwCreate = false, throwSource = false, synchronousLoad = false, wrongDimensions = false, legacy = false } = {}) {
  const observation = fresh().d2DecodeObservation;
  const product = moduleOf(observed ? transformed.request : request, { ...baseImports, './d2-decode-observation': { d2DecodeObservation: observation } });
  let cancelled = 0, released = 0, removed = 0, errors = 0, loaded;
  const images = [], sequence = [], width = 8, height = 16;
  const data = new Uint8Array(64); data.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(data.buffer).setUint32(12, 0x49484452);
  new DataView(data.buffer).setUint32(16, width); new DataView(data.buffer).setUint32(20, height);
  const asset = { bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), width, height };
  let retirement;
  const lease = { filePath: '/owned/art.png', release() { released++; }, isCurrent: () => true,
    onRetire(fn) { retirement = fn; return () => {}; } };
  const input = { asset, url: 'https://fixture.invalid/hash/art.png', canvas: { createImage() {
    sequence.push('create'); if (throwCreate) throw Error('fixture create failure');
    let source = '';
    const image = { width: wrongDimensions ? width + 1 : width, height, onload: null, onerror: null,
      get src() { return source; }, set src(value) {
        sequence.push('source'); source = value;
        if (synchronousLoad) image.onload?.();
        if (throwSource) throw Error('fixture source failure');
      } };
    images.push(image); return image;
  } }, ready(value) { sequence.push('ready'); loaded = value; }, fail() { sequence.push('fail'); errors++; } };
  if (legacy) Object.assign(input, { filePath: lease.filePath,
    request(options) { options.success({ statusCode: 200, data: data.buffer }); return { abort() { cancelled++; } }; },
    writeFile(options) { options.success(); }, removeFile() { removed++; } });
  else Object.assign(input, { acquire() { return { promise: Promise.resolve(lease), cancel() { cancelled++; } }; } });
  const cancel = product.startSkyArtworkRequest(input);
  return { observation, images, sequence, cancel, get loaded() { return loaded; }, retireFile: () => retirement?.(),
    counts: () => ({ cancelled, released, removed, errors }) };
}

test('complete request retains product success/release behavior and records a real decode rather than empty success', async () => {
  for (const legacy of [false, true]) {
    const original = productHarness({ observed: false, legacy }), observed = productHarness({ legacy });
    await flush(); assert.equal(observed.loaded, undefined);
    assert.equal(snapshot(observed.observation).decode.sourceAttempts, 1);
    assert.equal(snapshot(observed.observation).decode.ownedCallbacks, 1);
    original.images[0].onload(); observed.images[0].onload();
    assert.equal(observed.loaded.image, observed.images[0]);
    const ready = snapshot(observed.observation);
    assert.equal(ready.decode.loadCallbacks, 1); assert.equal(ready.decode.ownedCallbacks, 0);
    assert.equal(ready.images.logicalImages, 1); assert.equal(ready.images.logicalPixels, 128);
    original.loaded.release(); observed.loaded.release(); observed.loaded.release(); original.loaded.release();
    assert.deepEqual(observed.sequence, original.sequence); assert.deepEqual(observed.counts(), original.counts());
    assert.equal(snapshot(observed.observation).images.logicalImages, 0);
  }
});

test('detach cancellation records cumulative unconfirmed work; a retained late callback cannot revive the product', async () => {
  const h = productHarness(); await flush(); const late = h.images[0].onload;
  h.cancel(); h.cancel();
  const cancelled = snapshot(h.observation);
  assert.equal(cancelled.decode.ownedCallbacks, 0); assert.equal(cancelled.decode.detachedWithoutCallback, 1);
  assert.equal(h.images[0].onload, null); assert.equal(h.images[0].onerror, null);
  late(); late();
  const after = snapshot(h.observation);
  assert.equal(after.decode.detachedWithoutCallback, 1, 'the cumulative missing-callback-at-detach fact is not erased');
  assert.equal(after.decode.callbacksAfterDetach, 1); assert.equal(after.decode.duplicateCallbacks, 1);
  assert.equal(after.images.logicalImages, 0); assert.equal(h.loaded, undefined); assert.equal(h.counts().errors, 0);
});

test('load dimensions failure, native error and synchronous failures preserve failure/recovery without invented completion', async () => {
  for (const input of [{ wrongDimensions: true }, { throwCreate: true }, { throwSource: true }, {}]) {
    const original = productHarness({ ...input, observed: false }), h = productHarness(input); await flush();
    if (!input.throwCreate && !input.throwSource) {
      const kind = input.wrongDimensions ? 'onload' : 'onerror'; original.images[0][kind](); h.images[0][kind]();
    }
    assert.deepEqual(h.sequence, original.sequence); assert.deepEqual(h.counts(), original.counts());
    assert.equal(h.loaded, undefined); assert.equal(h.counts().errors, 1);
    const value = snapshot(h.observation); assert.equal(value.images.logicalImages, 0);
    if (input.throwCreate) { assert.equal(value.decode.sourceAttempts, 0); assert.equal(value.decode.caughtSyncBeforeSource, 1); }
    else if (input.throwSource) {
      assert.equal(value.decode.caughtSyncAfterSource, 1); assert.equal(value.decode.detachedWithoutCallback, 1);
      assert.equal(value.decode.loadCallbacks + value.decode.errorCallbacks, 0, 'a synchronous throw is not native completion');
    }
  }
  const h = productHarness({ synchronousLoad: true }); await flush();
  assert.equal(h.counts().errors, 0); assert(h.loaded);
  assert.equal(snapshot(h.observation).decode.detachedWithoutCallback, 0);
});

test('file transfer retires the decoded claim and a later decode creates a distinct logical image', async () => {
  const h = productHarness(); await flush(); h.images[0].onload();
  const file = h.loaded.retainFile();
  assert.equal(snapshot(h.observation).images.logicalImages, 0); assert.equal(h.counts().released, 0);
  let next; file.decode(value => { next = value; }, () => assert.fail('unexpected retry failure'));
  h.images[1].onload(); assert.notEqual(next.image, h.loaded.image);
  assert.equal(snapshot(h.observation).images.uniqueRegistrations, 2);
  assert.equal(snapshot(h.observation).images.logicalImages, 1);
  next.release(); assert.equal(snapshot(h.observation).images.logicalPixels, 0);
});

test('shared image claims are counted once and repeated retirements never subtract twice', () => {
  const observation = fresh().createD2DecodeObservation(), image = {};
  const first = observation.imageClaim(image, 8, 16), second = observation.imageClaim(image, 8, 16);
  let value = snapshot(observation);
  assert.equal(value.images.logicalClaims, 2); assert.equal(value.images.logicalImages, 1); assert.equal(value.images.logicalPixels, 128);
  first(); first(); value = snapshot(observation);
  assert.equal(value.images.logicalClaims, 1); assert.equal(value.images.logicalImages, 1); assert.equal(value.diagnostics.duplicateRetirements, 1);
  observation.imageClaim(image, 9, 16)(); assert.equal(snapshot(observation).diagnostics.dimensionConflicts, 1);
  second(); assert.equal(snapshot(observation).images.logicalImages, 0);
  const again = observation.imageClaim(image, 8, 16); assert.equal(snapshot(observation).images.uniqueRegistrations, 2); again();
  const throwing = observation.withImageRetirement(() => { throw Error('original failure'); }, {}, 1, 1);
  assert.throws(throwing, /original failure/); assert.equal(snapshot(observation).images.logicalImages, 0);
});

test('unsupported image identity and saturation remain explicit and snapshots contain only finite copied scalars', () => {
  const unavailable = fresh({ WeakMap: undefined }).createD2DecodeObservation(); unavailable.imageClaim({}, 2, 2)();
  assert.equal(snapshot(unavailable).imageIdentity, 'unavailable'); assert.equal(snapshot(unavailable).diagnostics.untrackedImageClaims, 1);
  const observation = fresh().createD2DecodeObservation();
  const old = snapshot(observation); observation.imageClaim({}, 1e6, 1e6); observation.imageClaim({}, 1e6, 1e6);
  assert.equal(snapshot(observation).diagnostics.overflow, true); assert.equal(old.images.logicalImages, 0);
  assert.equal(snapshot(observation).images.logicalPixels, 1e12);
  const serial = JSON.stringify(observation.snapshot()); assert(!/https:|\/owned\/|filePath|nativeInFlight/.test(serial));
});

test('the observer and surviving retirement closure do not strongly retain an image', async () => {
  const code = `const module={exports:{}};new Function('exports','module',${JSON.stringify(compile(runtime))})(module.exports,module);
    const observation=module.exports.createD2DecodeObservation();let image={payload:new Uint8Array(1024)};
    const weak=new WeakRef(image);const retire=observation.imageClaim(image,8,16);image=null;
    (async()=>{for(let i=0;i<12;i++){await new Promise(setImmediate);global.gc();}
      const alive=weak.deref()!==undefined;retire();console.log(JSON.stringify({alive,logical:observation.snapshot().images.logicalImages}));})().catch(()=>process.exit(2));`;
  const { stdout } = await promisify(execFile)(process.execPath, ['--expose-gc', '-e', code], { timeout: 15000, maxBuffer: 4096 });
  assert.deepEqual(JSON.parse(stdout), { alive: false, logical: 0 });
});

async function checkpointHarness({ observation = fresh().d2DecodeObservation, ...options } = {}) {
  const { imports: suppliedImports = {}, ...rest } = options;
  const h = await memoryCheckpointHarness({ generation: 35, transformAdapter: source => addD2DecodeCheckpoint({ request, adapter: source }).adapter,
    validate: validateD2DecodeCheckpoint, imports: { './d2-decode-observation': { d2DecodeObservation: observation }, ...suppliedImports }, ...rest });
  return { ...h, observation };
}
test('existing checkpoints include pre-Play baseline and real post-Pause/retire changes without new weak tracking', async () => {
  const h = await checkpointHarness(), retire = h.observation.imageClaim({}, 8, 16);
  assert.equal(h.api.r25MemoryStarted(), true); await flush();
  const baselineBytes = h.requests[0].data;
  assert.equal(h.receipt().schemaVersion, D2_DECODE_CHECKPOINT_SCHEMA); assert.equal(h.receipt().decode.images.logicalImages, 1);
  await h.advance(1000); h.api.r25MemoryPaused(); await flush(); assert.equal(h.receipt().owners.tracking, false);
  const attempt = h.observation.createAttempt(); h.observation.created(attempt); h.observation.sourceAttempt(attempt);
  h.observation.detached(attempt); retire();
  await h.advance(11000); assert.equal(h.receipt().observation.checkpoints[0].phase, 'drain-10');
  assert.equal(h.receipt().decode.images.logicalImages, 0); assert.equal(h.receipt().decode.decode.detachedWithoutCallback, 1);
  h.api.r25MemoryRetired(); await flush(); assert.equal(h.receipt().observation.checkpoints[0].phase, 'retired');
  await h.advance(90000); assert.equal(h.receipt().observation.checkpoints[0].phase, 'end');
  assert.equal(h.requests[0].data, baselineBytes); assert.equal(JSON.parse(baselineBytes).decode.images.logicalImages, 1);
});

test('v2 scalar drain still works with unsupported WeakRef; old v1 template stays unchanged', async () => {
  const h = await checkpointHarness({ weakRefSupported: false }); assert.equal(h.api.r25MemoryStarted(), true); await flush();
  assert.equal(h.receipt().observation.capability, 'unsupported'); assert.equal(h.receipt().owners.capability, 'unsupported');
  h.api.r25MemoryPaused(); await flush(); await h.advance(10000);
  assert.equal(h.receipt().observation.checkpoints[0].phase, 'drain-10');
  assert(h.receipt().observation.checkpoints[0].sites.every(site => site.first === null && site.allocations === 0));
  assert(adapter.includes('if (!tracking) { probe.seal(); owners.release(); return false; }'));
});

test('v2 retains original single-flight exact bytes/retry budgets and cannot replay a workload', async () => {
  const pending = [];
  const h = await checkpointHarness({ imports: { '@tarojs/taro': { __esModule: true, default: { request(options) {
    return new Promise((resolve, reject) => pending.push({ options, resolve, reject }));
  } } } } });
  h.api.r25MemoryStarted(); const baseline = pending[0].options.data;
  await h.advance(5000); assert.equal(pending.length, 1);
  pending[0].reject(Error('fixture transport')); await flush(); assert.equal(pending[1].options.data, baseline);
  pending[1].resolve({ statusCode: 200, data: { stored: false } }); await flush(); assert.equal(pending.length, 3);
  assert.equal(JSON.parse(pending[2].options.data).sequence, 2);
  pending[2].resolve({ statusCode: 200, data: { stored: true } }); await flush();
  const exporting = h.api.r25MemoryExport(), again = h.api.r25MemoryExport();
  assert.equal(pending.length, 4, 'one terminal packet remains single flight');
  pending[3].resolve({ statusCode: 200, data: { stored: true } }); await flush();
  assert.equal(pending[4].options.data, baseline);
  pending[4].resolve({ statusCode: 200, data: { stored: true } }); await exporting; await again;
  assert.equal(pending.length, 5); assert.equal(pending[0].options.data, baseline);
});

test('strict v2 schema rejects extra native claims and remains within the original packet budget', async () => {
  const h = await checkpointHarness(); h.api.r25MemoryStarted(); await flush(); const packet = h.receipt();
  assert.equal(validateR25MemoryCheckpoint(packet), false, 'a new payload is never passed off as v1');
  for (const alter of [
    v => { v.schemaVersion = 'starward-r25-memory-checkpoint-v1'; },
    v => { v.decode.nativeInFlight = 0; }, v => { v.decode.images.physicalBytes = 0; },
    v => { v.decode.decode.sourceAttempts = -1; }, v => { v.decode.decode.ownedCallbacks = 1; },
    v => { v.decode.images.logicalPixels = 1; }, v => { v.decode.images.logicalImages = 1; },
    v => { v.decode.coverage = 'whole-native-decoder'; }, v => { v.extra = 'x'.repeat(32768); },
  ]) { const invalid = structuredClone(packet); alter(invalid); assert.equal(validateD2DecodeCheckpoint(invalid), false); }
  const entries = [];
  for (let i = 0; i < 8; i++) { const entry = { transform: {} }; entries.push(entry); h.api.r25MemoryTile({}, entry); }
  for (let i = 0; i < 8; i++) h.api.r25MemoryAggregate({}, entries.map(cached => ({ cached })));
  for (const site of ['stellar-vectors', 'stellar-positions', 'stellar-directions', 'stellar-transmissions', 'gpu-upload-view', 'gpu-upload-backing'])
    for (let i = 0; i < 600; i++) h.api.r25MemoryTrack(site, {}, 1e12);
  await h.advance(5000); const full = h.receipt();
  assert.equal(full.owners.tiles.length, 8); assert.equal(full.owners.aggregates.length, 8);
  for (const key of Object.keys(full.decode.decode)) full.decode.decode[key] = 1e12;
  for (const key of Object.keys(full.decode.images)) full.decode.images[key] = 1e12;
  full.decode.diagnostics.overflow = true;
  assert.equal(validateD2DecodeCheckpoint(full), true);
  assert(Buffer.byteLength(JSON.stringify(full)) < 32768);
});

test('collector admits v2 on the existing route/storage policy while preserving v1 and conflict/capacity checks', async () => {
  // Dynamic import permits independent pure-module checks while Root restores
  // an unavailable original native-region protocol input; never stub that input.
  const { createR17PhoneProbeCollector, nativeRegionProbeDependencyStatus } = await import('./r17-phone-probe-collector.mjs');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'starward-d2-decode-checkpoints-'));
  try {
    const h = await checkpointHarness(); h.api.r25MemoryStarted(); await flush(); const packet = h.receipt();
    const directory = path.join(temp, 'receipts'), collector = createR17PhoneProbeCollector(directory);
    const nativeDependency = await nativeRegionProbeDependencyStatus();
    assert.equal(nativeDependency, 'MISSING', 'the current original native-region input is still absent, not replaced');
    for (const schemaVersion of ['starward-r17-native-region-v1', 'starward-r17-native-region-v2'])
      assert.equal(await collector.store({ schemaVersion, variant: '../outside', runId: '../outside' }), 503);
    await assert.rejects(fs.stat(directory), { code: 'ENOENT' });
    assert.equal(await collector.store({ ...packet, runId: '../outside' }), 400);
    await assert.rejects(fs.stat(directory), { code: 'ENOENT' });
    assert.equal(await collector.store(packet), 200); assert.equal(await collector.store(packet), 200);
    const file = path.join(directory, `baseline-${packet.runId}-checkpoint-1.json`), saved = await fs.readFile(file, 'utf8');
    assert.deepEqual(JSON.parse(saved), packet);
    const changed = structuredClone(packet); changed.decode.diagnostics.duplicateRetirements++;
    assert.equal(await collector.store(changed), 409); assert.equal(await fs.readFile(file, 'utf8'), saved);
    const { decode: ignored, ...old } = structuredClone(packet);
    old.schemaVersion = 'starward-r25-memory-checkpoint-v1'; old.runId = old.observation.runId = 'r25-2-other';
    assert.equal(validateR25MemoryCheckpoint(old), true); assert.equal(await collector.store(old), 200);
    for (let i = 0; i < 30; i++) await fs.writeFile(path.join(directory, `reserved-${i}.json`), '{}', { flag: 'wx' });
    const next = structuredClone(packet); next.runId = next.observation.runId = 'r25-3-other';
    assert.equal(await collector.store(next), 429); assert.equal(await collector.store(packet), 200);
  } finally {
    const target = path.resolve(temp), base = path.resolve(os.tmpdir());
    assert.equal(path.dirname(target), base); assert(path.basename(target).startsWith('starward-d2-decode-checkpoints-'));
    await fs.rm(target, { recursive: true });
  }
});
