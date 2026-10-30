import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Full production module with real Query cache/observer retirement. Controlled
// React and geometry inputs isolate the index fetch's ownership; this does not
// emulate WEAPP GC or measure native images, GPU memory or phone heap bytes.
const probe = String.raw`
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient, QueryObserver } = require('@tanstack/query-core');

const fixture = process.argv[2] === 'true';
const file = path.join(process.argv[1], 'use-sky-optical-hips.ts');
const source = fs.readFileSync(file, 'utf8');

let run;
const noop = () => {};
function forwardSignal(fn, { signal }) { return fn(signal); }
function resourceQuery(options) {
  // Observe real Query cache/observer ownership independently of the resource
  // wrapper. This adapter binds only the actual production fetch function.
  if (fixture && options.queryKey[0] === 'optical-hips-index')
    run.client.setQueryData(options.queryKey, { data: [], failed: false });
  const observer = new QueryObserver(run.client, {
    ...options, queryFn: forwardSignal.bind(null, options.queryFn), retry: false,
  });
  run.observers.push(observer);
  run.unsubscribers.push(observer.subscribe(noop));
  const current = observer.getCurrentResult();
  run.eligibility.push({ key: options.queryKey[0], enabled: options.enabled === true });
  return { data: current.data, isError: current.isError, isFetching: current.isFetching,
    refetch: observer.refetch, refreshError: undefined };
}
function nativeImages(_canvas, _revision, _publication, active) {
  const image = active ? { marker: 'synthetic-decoded-image' } : null;
  if (image) run.weak.image = new WeakRef(image);
  const state = { images: new Map(image ? [['ps1:3:166', image]] : []), retainedImages: new Map() };
  return { ...state, currentImages: () => state, failed: false, loading: false, retryImages: noop, failedImage: noop };
}
function selectedCandidates() {
  const value = [{ sourceId: 'ps1', order: 3, format: 'jpeg', pixels: [166], dirs: [0] }];
  run.weak.candidates = new WeakRef(value); return value;
}
function selectedReference() {
  const value = { state: 'SELECTED', order: 3, pixels: [166] };
  run.weak.reference = new WeakRef(value); return value;
}
function getIndex(publication, sourceId, order, dir, signal) {
  run.serviceCalls.push({ publicationMatches: publication === run.weak.publication?.deref(), sourceId, order, dir,
    sameSignal: signal === run.signal });
  return Promise.resolve({ sourceId, order, dir, tiles: [] });
}
function prepare() {
  run = { client: new QueryClient({ defaultOptions: { queries: { gcTime: 30 * 60_000, retry: false } } }),
    observers: [], unsubscribers: [], weak: {}, eligibility: [], serviceCalls: [], signal: new AbortController().signal };
  const bindings = {
    react: { useMemo: fn => fn(), useCallback: fn => fn },
    './use-sky-image-recovery': { useSkyImageRecovery: () => noop },
    '@/hooks/use-resource-query': { useResourceQuery: resourceQuery },
    '@/services/optical-hips-client': { getOpticalHipsManifest: () => Promise.resolve(null), getOpticalHipsIndex: getIndex, opticalHipsTileUrl: p => p },
    './sky-observation-frame': { exactSkyObservationFrame: report => report.observationFrames[0] },
    './sky-hips-tile-selection': { selectSkyHipsTiles: selectedReference },
    './sky-optical-tile-selection': { selectPublishedOpticalCandidates: selectedCandidates,
      resolvePublishedOpticalTiles: () => [], orderPublishedOpticalTilesForView: x => x, publishedOpticalCoverageComplete: () => true },
    './use-sky-artwork': { useSkyNativeImages: nativeImages },
  };
  const runtime = { exports: {}, __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: fixture,
    require: name => { assert(name in bindings, name); return bindings[name]; } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText, runtime);
  (() => {
    const publication = { publicationHash: 'a'.repeat(64) };
    if (fixture) run.client.setQueryData(['optical-hips-manifest'], publication);
    run.weak.publication = new WeakRef(publication);
    const frame = { equatorialToEnu: [1,0,0,0,1,0,0,0,1], marker: 'render-frame' };
    const report = { observationFrames: [frame], hourly: [], marker: 'render-report' };
    const view = { basis: { right: [1,0,0], up: [0,1,0], forward: [0,0,1] }, verticalFovDeg: 8 };
    const canvas = { marker: 'canvas' };
    for (const [key, value] of Object.entries({ frame, report, view, canvas })) run.weak[key] = new WeakRef(value);
    runtime.exports.useSkyOpticalHips(report, 'synthetic-time', view, 390, 844, canvas, 1, true, false);
  })();
}
const collect = async () => { await new Promise(setImmediate); global.gc(); await new Promise(setImmediate); global.gc(); };
const live = () => Object.fromEntries(Object.entries(run.weak).map(([k, w]) => [k, Boolean(w.deref())]));
async function disposeObservers() {
  run.unsubscribers.forEach(fn => fn()); run.unsubscribers.length = 0;
  run.observers.forEach(observer => observer.destroy()); run.observers.length = 0;
}
(async () => {
  prepare(); await disposeObservers(); await collect();
  const retainedByCache = live();
  for (const name of ['frame', 'view', 'report', 'canvas', 'image'])
    assert.equal(retainedByCache[name] ?? false, false, 'cached index fetch must not hold ' + name);
  if (fixture) for (const name of ['publication', 'candidates', 'reference'])
    assert.equal(retainedByCache[name], true, 'fetch still owns exact request ' + name);
  const cacheState = run.client.getQueryCache().getAll().map(q => ({ key: q.queryKey[0], observers: q.getObserversCount(), status: q.state.status }));
  assert.equal(cacheState.length, 2); assert(cacheState.every(q => q.observers === 0));
  if (!fixture) assert(run.eligibility.every(q => !q.enabled));
  const response = await run.client.getQueryCache().getAll().find(q => q.queryKey[0] === 'optical-hips-index').options.queryFn({ signal: run.signal });
  assert.equal(response.data.length, fixture ? 1 : 0);
  assert.equal(response.failed, false);
  assert.deepEqual(run.serviceCalls, fixture ? [{ publicationMatches: true, sourceId: 'ps1', order: 3, dir: 0, sameSignal: true }] : []);
  run.client.clear(); await collect();
  const afterCacheClear = live();
  assert(Object.values(afterCacheClear).every(alive => !alive), 'the harness must release every witness after cache clear');
})().catch(error => { run?.client.clear(); console.error(error); process.exitCode = 1; });
`;

for (const fixture of [false, true]) {
  test(`optical index Query releases render objects after unmount (fixture=${fixture})`, () => {
    const result = spawnSync(process.execPath, ["--expose-gc", "-e", probe,
      fileURLToPath(new URL(".", import.meta.url)), String(fixture)],
    { encoding: "utf8", timeout: 20_000, windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
