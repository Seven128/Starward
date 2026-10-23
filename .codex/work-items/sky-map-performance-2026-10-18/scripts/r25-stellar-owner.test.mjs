import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { addR25StellarOwnerObservation } from './r25-stellar-owner-instrumentation.mjs';
const require = createRequire(import.meta.url);
const ts = require('../../../../apps/wechat-miniapp/node_modules/typescript');
const observerSource = await fs.readFile(new URL('./r25-stellar-owner-observer.ts', import.meta.url), 'utf8');
function load(source, imports = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,require,module){' + compiled.outputText + '\n})', { WeakRef })(
    module.exports, name => { assert(Object.hasOwn(imports, name), 'unexpected import ' + name); return imports[name]; }, module);
  return module.exports;
}
const create = load(observerSource).createR25StellarOwnerObserver;
const plain = value => JSON.parse(JSON.stringify(value));

test('unsupported and failed reference construction are explicit, not invented collection', () => {
  const p = create({ WeakRef: null });
  assert.equal(p.start(), false); p.observeTile({}, { transform: {} }); p.observeAggregate({}, []);
  const empty = p.snapshot();
  assert.equal(empty.capability, 'unsupported'); assert.equal(empty.tiles.length, 0);
  assert.equal(empty.aggregates.length, 0); assert.equal(empty.diagnostics.tileCalls, 0);
  let calls = 0;
  class Failing { constructor(value) { if (calls++ > 0) throw Error('unavailable'); this.value = value; } deref() { return this.value; } }
  const fail = create({ WeakRef: Failing }); assert(fail.start());
  fail.observeTile({}, { transform: {} }); fail.observeAggregate({}, []);
  const r = fail.snapshot();
  assert.equal(r.diagnostics.referenceErrors, 4); assert.equal(r.diagnostics.refsCreated, 0);
  assert.equal(r.tiles[0].key, 'unknown'); assert.equal(r.tiles[0].firstEntry, 'unknown');
  assert.equal(r.aggregates[0].alive, 'unknown');
});

test('fixed samples relate real object identities without retaining span arrays in receipts', () => {
  const p = create(); assert(p.start()); assert.equal(p.start(), false);
  const tile = {}, first = { transform: {} }, latest = { transform: {} };
  p.observeTile(tile, first);
  const spans = [{ cached: first }], a = {}, b = {};
  p.observeAggregate(a, spans); p.observeTile(tile, latest); p.observeAggregate(b, [{ cached: latest }]);
  p.observeTile(tile, latest); p.observeAggregate(a, spans);
  const r = p.snapshot();
  assert.equal(r.tiles[0].writes, 3); assert.equal(r.tiles[0].replacements, 1);
  assert.equal(r.tiles[0].firstIsLatestObserved, false);
  assert.deepEqual(plain(r.aggregates.map(v => v.firstEntryTileIds)), [[1], []]);
  assert.equal(r.aggregates.length, 2); assert(Object.isFrozen(r.aggregates[0].firstEntryTileIds));
  spans.length = 0; assert.deepEqual(plain(r.aggregates[0].firstEntryTileIds), [1]);
  const text = JSON.stringify(r);
  p.stopTracking(); p.observeTile(tile, first); p.observeAggregate({}, [{ cached: first }]);
  assert.equal(p.snapshot().tiles[0].writes, 3); assert.equal(JSON.stringify(r), text);
  p.release(); const released = p.snapshot();
  assert.equal(released.released, true); assert.equal(released.tiles.length, 0);
  assert.equal(released.aggregates.length, 0); assert(p.start());
  assert.equal(p.snapshot().diagnostics.tileCalls, 0);
});

test('coverage and serialized observations stay bounded, with explicit rejected calls', () => {
  const p = create(); p.start();
  const tiles = Array.from({ length: 100 }, () => ({}));
  for (const tile of tiles) p.observeTile(tile, { transform: {} });
  for (let i = 0; i < 100; i++) p.observeAggregate({}, []);
  p.observeTile(null, {}); p.observeAggregate(null, []);
  const r = p.snapshot();
  assert.equal(r.tiles.length, 8); assert.equal(r.aggregates.length, 8);
  assert.equal(r.diagnostics.unselectedTileCalls, 92);
  assert.equal(r.diagnostics.unselectedAggregateCalls, 92);
  assert.equal(r.diagnostics.rejectedCalls, 2);
  assert.equal(r.diagnostics.refsCreated, 32); // 3 per selected tile + 1 per selected aggregate.
  assert(Buffer.byteLength(JSON.stringify(r)) < 5000);
});

const scenePath = new URL('../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts', import.meta.url);
const transformPath = new URL('../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-transform.ts', import.meta.url);
const [sceneSource, transformSource] = await Promise.all([fs.readFile(scenePath, 'utf8'), fs.readFile(transformPath, 'utf8')]);

test('instrumentation adds exactly the two owner calls and refuses moved boundaries', () => {
  const altered = addR25StellarOwnerObservation(sceneSource);
  const original = altered
    .replace('import { r25MemoryTile, r25MemoryAggregate } from "./r25-memory-lifetime-adapter";\n', '')
    .replace('\n      r25MemoryTile(tile,cached);', '')
    .replace('  r25MemoryAggregate(resolved,spans);\n', '');
  assert.equal(original, sceneSource);
  assert.throws(() => addR25StellarOwnerObservation(sceneSource.replace('transformed.set(tile,cached);', 'changed();')),
    /r25_stellar_owner_boundary_changed:actual_tile_cache_write/);
});

test('actual resolver replacement distinguishes a held old aggregate from the latest tile cache',
  { skip: typeof global.gc !== 'function' }, async () => {
  const p = create(); p.start();
  // Full production resolver and transform are executed. This fixture controls
  // geometry admission and numerical helpers; it tests ownership, not astronomy
  // correctness. The prior real-SAO experiment owns real-byte numerical coverage.
  const transform = load(transformSource, {
    '@starward/astronomy-core/stellar-vectors': {
      projectStellarMotionDirection: () => [1, 0, 0],
      stellarHorizontalPosition: () => ({ azimuthDeg: 90, altitudeDeg: 0 }),
    },
    './sky-view-projection': { prepareSkyDirection: () => ({}) },
    './sky-star-appearance': { skyStarDisplayTransmission: () => 1 },
  });
  const resolver = load(addR25StellarOwnerObservation(sceneSource), {
    './r25-memory-lifetime-adapter': { r25MemoryTile: p.observeTile, r25MemoryAggregate: p.observeAggregate },
    '@starward/miniapp-contracts': { assertStellarGeometryFrame: () => {} },
    './sky-time-frame': { exactSkyTimeFrame: (frames, at) => frames.find(frame => frame.at === at) },
    './sky-stellar-transform': transform,
    '../../services/sao-catalog-client': { isAdmittedSaoIndexPublication: () => false, isAdmittedSaoTilePublication: () => false },
  });
  const publication = { publicationHash: 'owner-fixture', index: { catalogHash: 'sao', catalogVersion: 'sao',
    baseCatalogVersion: 'bsc', baseAssetSha256: 'base' } };
  let tiles = Array.from({ length: 8 }, () => ({ publicationHash: publication.publicationHash,
    tile: { catalogHash: 'sao', rows: [['sao:test', 1, 1, 0, 0, 0, 0, 0]] } }));
  const make = step => {
    const at = String(step), geometry = { at, julianYears: step, equatorialToEnu: [], observer: {} };
    const frame = resolver.resolveSkyStellarSupplement(publication, tiles, {
      state: 'AVAILABLE', publication: { catalogVersion: 'bsc', catalogHash: 'base' }, observer: {},
      frames: [{ at, geometry }],
    }, at);
    assert.equal(frame.pointCount, 8); assert.equal(frame.points.length, 8);
    return frame;
  };
  let a = make(0); make(1); make(2);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const drain = async () => { for (let i = 0; i < 6; i++) { await tick(); global.gc(); } await tick(); };
  await drain();
  assert.equal(a.pointCount, 8); // Deliberate strong positive control.
  const held = p.snapshot();
  for (const tile of held.tiles) {
    assert.equal(tile.writes, 3); assert.equal(tile.replacements, 2);
    assert.equal(tile.firstIsLatestObserved, false);
    assert.equal(tile.key, 'alive'); assert.equal(tile.firstEntry, 'alive');
    assert.equal(tile.firstTransform, 'alive'); assert.equal(tile.latestObservedEntry, 'alive');
  }
  assert.equal(held.aggregates[0].alive, 'alive');
  assert.deepEqual(plain(held.aggregates[0].firstEntryTileIds), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(held.aggregates[1].alive, 'collected'); assert.equal(held.aggregates[2].alive, 'collected');
  a = null; await drain();
  const oldReleased = p.snapshot();
  for (const tile of oldReleased.tiles) {
    assert.equal(tile.firstEntry, 'collected'); assert.equal(tile.firstTransform, 'collected');
    assert.equal(tile.latestObservedEntry, 'alive'); assert.equal(tile.latestObservedTransform, 'alive');
  }
  assert.equal(oldReleased.aggregates[0].alive, 'collected');
  tiles = []; await drain(); const allReleased = p.snapshot();
  for (const tile of allReleased.tiles) {
    assert.equal(tile.key, 'collected'); assert.equal(tile.latestObservedEntry, 'collected');
    assert.equal(tile.latestObservedTransform, 'collected');
  }
  p.release();
});
