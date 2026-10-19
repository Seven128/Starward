// Focused behavior checks for the new cache boundary; the completed parent owns its15 CPU checks.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
export async function verifyCpuTextMetricsFixture({ sourceRoot, feature, ts }) {
  const read = name => fs.readFile(path.join(sourceRoot, feature, name), 'utf8');
  const cacheSource = await read('r17-cpu-text-metrics.ts'), surfaceSource = await read('sky-canvas-surface.ts');
  const load = (source, require = name => { throw Error(name); }, environment = {}, suffix = '') => {
    const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
    assert.equal(result.diagnostics.filter(value => value.category === ts.DiagnosticCategory.Error).length, 0);
    const module = { exports: {} };
    vm.runInNewContext('(function(exports,require,module){' + result.outputText + '\n' + suffix + '\n})', environment)(module.exports, require, module);
    return module.exports;
  };
  function createRuntime(helperSource = cacheSource, source = surfaceSource) {
    const metrics = load(helperSource), frozen = new WeakSet();
    const canvas = load(source, name => {
      if (name === './r17-cpu-text-metrics') return metrics;
      if (name === './r17-cpu-page-only') return { r17CpuPageOnlyFrozen: value => frozen.has(value) };
      if (name === './sky-selection-reticle') return { createSkySelectionLayer() { throw Error('unexpected_selection'); }, paintSkySelectionReticle() {} };
      if (name === '../../services/runtime-error') return { reportRuntimeError() {} };
      throw Error(name);
    });
    function make() {
      const counts = { save: 0, restore: 0, font: 0, native: 0 };
      let font = '10px sans-serif', invalid = false, throwing = false;
      const stack = [], calls = [];
      const context = { save() { counts.save++; stack.push(font); }, restore() { counts.restore++; font = stack.pop(); },
        set font(value) { counts.font++; if (/^(?:600 )?\d+px (sans-serif|serif)$/.test(value)) font = value; },
        get font() { return font; }, textAlign: 'left', textBaseline: 'middle',
        measureText(text) {
          counts.native++; calls.push(text);
          if (throwing) throw Error('fixture_native_measurement_failed');
          const width = invalid ? NaN : Array.from(text).length * (font.startsWith('600') ? 9 : 7);
          // Native instances expose extra data that must never enter the cache.
          return { width, actualBoundingBoxLeft: 1, actualBoundingBoxRight: width + 2,
            actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 3, nativeSentinel: {} };
        }, drawImage() {}, clearRect() {}, scale() {}, beginPath() {}, arc() {}, moveTo() {}, lineTo() {}, stroke() {} };
      const gl = { isContextLost: () => false, getExtension: () => null, flush() {} };
      const display = { width: 0, height: 0, getContext: () => context };
      const node = { width: 0, height: 0, getContext: () => gl, createImage: () => ({}) };
      const surface = canvas.createSkyCanvasSurface(display, { width: 390, height: 844 }, 2, () => node);
      return { surface, display, node, counts, calls, context, invalidate: value => { invalid = value; }, fail: value => { throwing = value; } };
    }
    return { metrics, frozen, make };
  }
  function hitProbe(helperSource = cacheSource, source = surfaceSource) {
    const runtime = createRuntime(helperSource, source), target = runtime.make(); runtime.frozen.add(target.surface);
    const first = target.surface.measureText('Vega', '12px sans-serif', 12, 0);
    const second = target.surface.measureText('Vega', '12px sans-serif', 12, 0);
    assert.equal(target.counts.native, 1, 'cache hit repeated a native measurement');
    assert.equal(target.counts.save, 1, 'cache hit saved native context');
    assert.equal(target.counts.font, 1, 'cache hit assigned native font');
    assert.equal(target.counts.restore, 1, 'cache hit restored native context');
    assert.equal(second.width, first.width); assert.notStrictEqual(second, first);
    return runtime;
  }
  hitProbe();
  // Demonstrate the same focused behavior assertion rejects both ineffectual cache variants.
  const noCache = cacheSource.replace('const value = entryKey === undefined ? undefined : entries.get(entryKey);', 'const value = undefined;');
  assert.notEqual(noCache, cacheSource); assert.throws(() => hitProbe(noCache), /cache hit repeated a native measurement/);
  const lateHit = surfaceSource.replace('if (cached) return cached;', 'if (cached) { /* countercheck: accidentally continue into native measurement */ }');
  assert.notEqual(lateHit, surfaceSource); assert.throws(() => hitProbe(cacheSource, lateHit), /cache hit repeated a native measurement/);

  const runtime = createRuntime(), target = runtime.make(), { surface } = target;
  const measure = (text = 'Vega', font = '12px sans-serif', height = 12, spacing = 0) => surface.measureText(text, font, height, spacing);
  measure(); measure(); assert.equal(target.counts.native, 2); // Initial unfrozen path is unchanged.
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().entries, 0);
  runtime.frozen.add(surface);
  const original = measure(); assert.equal(target.counts.native, 3); original.width = 999999;
  const hit = measure(); assert.equal(hit.width, 28); hit.width = 888888;
  assert.equal(measure().width, 28); assert.equal(target.counts.native, 3);
  assert.deepEqual(Object.keys(hit).sort(), ['ascent', 'descent', 'left', 'right', 'width']);
  measure('Vega', '600 14px sans-serif'); assert.equal(target.counts.native, 4);
  measure('Vega', '600 14px sans-serif'); assert.equal(target.counts.native, 4);
  measure('Altair'); assert.equal(target.counts.native, 5);
  measure('Vega', '12px sans-serif', 14); assert.equal(target.counts.native, 6);
  measure('Vega', '12px sans-serif', 12, 0.5); assert.equal(target.counts.native, 10);
  const spaced = measure('Vega', '12px sans-serif', 12, 0.5);
  assert.equal(spaced.width, 29.5); assert.equal(target.counts.native, 10);
  // Valid but unadmitted syntax, and invalid font assignments, both go through the original native path.
  measure('Vega', '16px serif'); measure('Vega', '16px serif');
  measure('Vega', 'invalid-font'); measure('Vega', 'invalid-font'); assert.equal(target.counts.native, 14);
  const entriesBeforeInvalid = runtime.metrics.r17CpuTextMetricsStats().entries;
  assert.throws(() => measure('invalid-height', '12px sans-serif', NaN), /caption_invalid/);
  assert.throws(() => measure('invalid-height', '12px sans-serif', NaN), /caption_invalid/);
  assert.throws(() => measure('invalid-spacing', '12px sans-serif', 12, -1), /caption_invalid/);
  target.invalidate(true); assert.throws(() => measure('bad-native'), /caption_invalid/);
  assert.throws(() => measure('bad-native'), /caption_invalid/);
  target.invalidate(false); target.fail(true); assert.throws(() => measure('throws'), /native_measurement_failed/);
  assert.throws(() => measure('throws'), /native_measurement_failed/); target.fail(false);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().entries, entriesBeforeInvalid);
  assert.equal(target.counts.save, target.counts.restore);
  const nativeBeforeRetry = target.counts.native; measure('bad-native'); measure('bad-native');
  assert.equal(target.counts.native, nativeBeforeRetry + 1);

  const bounded = runtime.make(); runtime.frozen.add(bounded.surface);
  for (let index = 0; index < 256; index++) bounded.surface.measureText('s' + index, '12px sans-serif', 12, 0);
  bounded.surface.measureText('s0', '12px sans-serif', 12, 0); // Retain recently used first key.
  bounded.surface.measureText('overflow', '12px sans-serif', 12, 0);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().entries, 256);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().evictions, 1);
  const beforeEvicted = bounded.counts.native;
  bounded.surface.measureText('s0', '12px sans-serif', 12, 0); assert.equal(bounded.counts.native, beforeEvicted);
  bounded.surface.measureText('s1', '12px sans-serif', 12, 0); assert.equal(bounded.counts.native, beforeEvicted + 1);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().evictions, 2);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().nativeGlyphCalls, bounded.counts.native);

  const controlsSource = await read('r17-phone-probe-controls.tsx');
  const controlTimers = [];
  const controls = load(controlsSource, name => {
    if (name === './r17-cpu-text-metrics') return runtime.metrics;
    if (name === './r17-cpu-page-only') return { r17CpuPageOnlyStats: () => ({}) };
    if (name === './r17-page-bridge-observer') return { r17ReadEnableDebug: () => false, r17ResetPageBridgeObservation() {},
      r17PageBridgeObservationStats: () => ({}) };
    if (name === './r17-phone-probe-runtime') return { r17Probe: { start() {} } };
    if (name === '@tarojs/taro') return { __esModule: true, default: {} };
    if (name === '@tarojs/components' || name === 'react' || name === 'react/jsx-runtime') return {};
    throw Error(name);
  }, { setTimeout: (callback, delay) => { controlTimers.push({ callback, delay }); return controlTimers.length; } },
  'exports.fixture = { beginMeasurement, countText };');
  const beforeReset = runtime.metrics.r17CpuTextMetricsStats();
  controls.fixture.beginMeasurement('narrow-play');
  const afterReset = runtime.metrics.r17CpuTextMetricsStats();
  assert.equal(afterReset.entries, beforeReset.entries); assert.equal(afterReset.lifetimeHits, beforeReset.lifetimeHits);
  assert.equal(afterReset.lifetimeMisses, beforeReset.lifetimeMisses); assert.equal(afterReset.lifetimeNativeGlyphCalls, beforeReset.lifetimeNativeGlyphCalls);
  assert.equal(afterReset.hits, 0); assert.equal(afterReset.misses, 0); assert.equal(afterReset.evictions, 0); assert.equal(afterReset.nativeGlyphCalls, 0);
  assert.equal(afterReset.observationResets, 1); assert.equal(controlTimers.length, 1); assert.equal(controlTimers[0].delay, 15000);
  assert.match(controls.fixture.countText(), /TM H0\/\d+ U0\/\d+ E256\/256 O0\/\d+ Y0\/\d+ R1 /);
  const nativeBeforeWarmHit = bounded.counts.native;
  bounded.surface.measureText('s0', '12px sans-serif', 12, 0); assert.equal(bounded.counts.native, nativeBeforeWarmHit);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().hits, 1);
  assert.equal(bounded.surface.isCurrent(bounded.display, { width: 400, height: 844 }, 2), false);
  bounded.surface.dispose();
  const disposedNative = bounded.counts.native; assert.throws(() => bounded.surface.measureText('s0', '12px sans-serif', 12, 0), /context_unavailable/);
  assert.equal(bounded.counts.native, disposedNative); assert.equal(runtime.metrics.r17CpuTextMetricsStats().entries, 0);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().retired, true);
  const next = runtime.make(); runtime.frozen.add(next.surface);
  next.surface.measureText('s0', '12px sans-serif', 12, 0); assert.equal(next.counts.native, 1);
  assert.equal(runtime.metrics.r17CpuTextMetricsStats().lifetimeNativeGlyphCalls, 1);
  const directCache = runtime.metrics.createR17CpuTextMetricsCache(); directCache.dispose();
  assert.throws(() => directCache.read('s0', '12px sans-serif', 12, 0), /retired/);
  assert.throws(() => directCache.remember('s0', '12px sans-serif', 12, 0, { width: 1, left: 0, right: 1, ascent: 1, descent: 1 }), /retired/);
  const capability = runtime.make(); runtime.frozen.add(capability.surface);
  capability.surface.measureText('Vega', '12px sans-serif', 12, 0); capability.context.measureText = undefined;
  assert.throws(() => capability.surface.measureText('Vega', '12px sans-serif', 12, 0), /context_unavailable/);
  return { actualSurfaceHitBeforeNativeSaveFontMeasureRestore: true, countercheckCacheRemovedFails: true,
    countercheckHitContinuesNativeFails: true, initialUnfrozenMeasurementsUnchanged: true,
    fontTextLineHeightLetterSpacingDistinct: true, onlyTwoCurrentValidFontDeclarationsCacheable: true,
    parsedFiveNumberCopiesPreventConsumerMutationAndNativeRetention: true,
    invalidInputsResultsAndNativeThrowsNotStoredWithOriginalRestore: true,
    bounded256LruEvictionContinuesNativeMisses: true, actualNativeGlyphInvocationCounterMatches: true,
    currentControlsResetCountersButPreserveCacheAndLifetime: true, fixedMenuExportScalarsAnd15secondTimer: true,
    disposedAndMissingMeasurementCapabilityRejectBeforeCacheHit: true,
    resizedOwnerInvalidNewSurfaceIndependent: true, fixtureNotPhoneEvidence: true };
}
