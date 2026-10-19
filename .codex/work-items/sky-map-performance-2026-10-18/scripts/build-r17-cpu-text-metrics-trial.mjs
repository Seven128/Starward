// Task-only successor to the exact completed CPU/page-only diagnostic. Never patch generated JS.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const here = path.dirname(fileURLToPath(import.meta.url)), work = path.resolve(here, '..'), root = path.resolve(work, '../../..');
const parentRoot = path.join(work, 'tmp/r17-cpu-page-only-trial'), trialRoot = path.join(work, 'tmp/r17-cpu-text-metrics-trial');
const sourceRoot = path.join(trialRoot, 'source'), projectRoot = path.join(trialRoot, 'project');
const feature = 'apps/wechat-miniapp/src/features/sky/', surfacePath = feature + 'sky-canvas-surface.ts';
const controlsPath = feature + 'r17-phone-probe-controls.tsx', cachePath = feature + 'r17-cpu-text-metrics.ts';
const slot = 'r17-cpu-text-metrics', bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot);
const manifestPath = path.join(trialRoot, 'manifest.json'), evidencePath = path.join(work, 'R17-CPU-TEXT-METRICS-TRIAL.json');
const scope = 'TASK_ONLY_CPU_TEXT_METRICS_FROZEN_SYNTHETIC_NOT_PRODUCT_ACCEPTANCE';
const mode = process.argv[2] ?? 'prepare', scriptPath = fileURLToPath(import.meta.url), run = promisify(execFile);
const sha = value => createHash('sha256').update(value).digest('hex'), relative = value => path.relative(root, value).replaceAll('\\', '/');
const json = file => fs.readFile(file, 'utf8').then(JSON.parse);
const require = createRequire(import.meta.url), ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));
const templates = {};
for (const file of ['r17-cpu-text-metrics.ts', 'r17-cpu-text-metrics-controls.tsx', 'r17-cpu-text-metrics-fixture.mjs'])
  templates[file] = await fs.readFile(path.join(here, file), 'utf8');
const { verifyCpuTextMetricsFixture } = await import(pathToFileURL(path.join(here, 'r17-cpu-text-metrics-fixture.mjs')));
const { verifyCpuPageOnlyFixture } = await import(pathToFileURL(path.join(here, 'r17-cpu-page-only-fixture.mjs')));
const { fingerprintBundle, inspectReleaseBundleBudget } = await import(pathToFileURL(path.join(root, 'tools/miniapp/release-bundle-artifact.mjs')));
const { inspectCandidate } = await import(pathToFileURL(path.join(root, 'tools/miniapp/inspect-production.mjs')));
const { assertPhysicalDeviceBundleSafe } = await import(pathToFileURL(path.join(root, 'tools/miniapp/device-feedback-snapshot.mjs')));
if (!['prepare', 'build', 'inspect'].includes(mode)) throw Error('use_prepare_build_or_inspect');
if (trialRoot !== path.join(work, 'tmp', 'r17-cpu-text-metrics-trial') ||
  (await fs.realpath(path.dirname(trialRoot))).toLowerCase() !== path.join(await fs.realpath(work), 'tmp').toLowerCase()) throw Error('trial_scope_mismatch');
const absent = async file => { try { await fs.lstat(file); throw Error('trial_output_already_exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; } };
function replaceOne(source, before, after, name) {
  if (source.split(before).length !== 2) throw Error('source_boundary_changed:' + name);
  return source.replace(before, after);
}
export function surfaceTrial(source) {
  source = replaceOne(source, 'import { reportRuntimeError } from "../../services/runtime-error";',
    'import { reportRuntimeError } from "../../services/runtime-error";\nimport { r17CpuPageOnlyFrozen } from "./r17-cpu-page-only";\nimport { createR17CpuTextMetricsCache } from "./r17-cpu-text-metrics";', 'imports');
  source = replaceOne(source, '  let selectionLayer: ReturnType<typeof createSkySelectionLayer> | null = null;',
    '  const r17TextMetricsCache = createR17CpuTextMetricsCache();\n  let selectionLayer: ReturnType<typeof createSkySelectionLayer> | null = null;', 'surface_owned_cache');
  source = replaceOne(source, '    disposed = true;\n    retireSelection();', '    disposed = true;\n    r17TextMetricsCache.dispose();\n    retireSelection();', 'cache_retire');
  source = replaceOne(source, '    return {\n      node: ownedNode, gl: ownedGl,', '    const surface: SkyCanvasSurface<Image> = {\n      node: ownedNode, gl: ownedGl,', 'same_surface_reference');
  const start = source.indexOf('      measureText(text, font, lineHeight, letterSpacing=0) {');
  const end = source.indexOf('      present(reticle, captions = []) {', start);
  if (start < 0 || end < start) throw Error('measure_boundary_changed');
  const original = source.slice(start, end), firstLine = original.indexOf('\n'), endBody = original.lastIndexOf('      },');
  let body = original.slice(firstLine + 1, endBody);
  body = replaceOne(body, 'glyphs.map(glyph=>context.measureText!(glyph))',
    'glyphs.map(glyph=>{r17TextMetricsCache.nativeGlyphCall();return context.measureText!(glyph);})', 'native_glyph_counter');
  body = replaceOne(body, '          const metrics = context.measureText(text);',
    '          r17TextMetricsCache.nativeGlyphCall();\n          const metrics = context.measureText(text);', 'native_whole_text_counter');
  const wrapper = '      measureText(text, font, lineHeight, letterSpacing=0) {\n' +
    '        if (disposed || !context.measureText) throw new Error("sky_canvas_text_context_unavailable");\n' +
    '        const frozen = r17CpuPageOnlyFrozen(surface);\n' +
    '        const cached = frozen ? r17TextMetricsCache.read(text, font, lineHeight, letterSpacing) : undefined;\n' +
    '        if (cached) return cached;\n' +
    '        const measureOriginal = (): SkyCanvasTextMetrics => {\n' + body + '        };\n' +
    '        const value = measureOriginal();\n' +
    '        return frozen ? r17TextMetricsCache.remember(text, font, lineHeight, letterSpacing, value) : value;\n' +
    '      },\n';
  source = source.slice(0, start) + wrapper + source.slice(end);
  return replaceOne(source, '      dispose: retire,\n    };', '      dispose: retire,\n    };\n    return surface;', 'return_same_surface');
}
function controlsTrial(source) {
  source = source.replaceAll('CPU/page-only · frozen · synthetic', 'CPU/text-metrics cache · frozen · synthetic');
  source = replaceOne(source, 'import { r17CpuPageOnlyStats } from "./r17-cpu-page-only";',
    'import { r17CpuPageOnlyStats } from "./r17-cpu-page-only";\nimport { r17CpuTextMetricsStats, r17ResetCpuTextMetricsObservation } from "./r17-cpu-text-metrics";', 'controls_import');
  source = replaceOne(source, '  const c = r17CpuPageOnlyStats();', '  const c = r17CpuPageOnlyStats();\n  const t = r17CpuTextMetricsStats();', 'scalar_read');
  source = replaceOne(source, 'return `Z${', 'return `TM H${t.hits}/${t.lifetimeHits} U${t.misses}/${t.lifetimeMisses} E${t.entries}/${t.capacity} O${t.evictions}/${t.lifetimeEvictions} Y${t.nativeGlyphCalls}/${t.lifetimeNativeGlyphCalls} R${t.observationResets} Z${', 'fixed_scalar_text');
  return replaceOne(source, '  r17ResetPageBridgeObservation(readDebug());', '  r17ResetCpuTextMetricsObservation();\n  r17ResetPageBridgeObservation(readDebug());', 'counter_reset_only');
}
async function snapshotSources(directory, bindings) {
  for (const [file, expected] of Object.entries(bindings)) {
    if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('source_path_invalid');
    if (sha(await fs.readFile(path.join(directory, file))) !== expected) throw Error('source_readback_mismatch:' + relative(directory) + ':' + file);
  }
}
async function priorBindings() {
  const bindings = {};
  for (const name of ['r17-canvas-copy-trial', 'r17-native-copy-suppression-trial', 'r17-gpu-finish-trial', 'r17-page-bridge-observation', 'r17-cpu-page-only-trial']) {
    const directory = path.join(work, 'tmp', name), bytes = await fs.readFile(path.join(directory, 'manifest.json')), item = JSON.parse(bytes);
    if (path.resolve(root, item.sourceDirectory) !== path.join(directory, 'source') || !item.result) throw Error('prior_trial_not_ready');
    await snapshotSources(path.join(directory, 'source'), item.trialSourceBindings);
    for (const folder of [item.result.bundleDirectory, item.result.projectDirectory + '/weapp']) {
      if (!path.resolve(root, folder).startsWith(directory + path.sep) ||
        (await fingerprintBundle(path.join(root, folder))).sha256 !== item.result.bundleSha256) throw Error('prior_trial_bundle_changed');
    }
    bindings[name] = { manifestSha256: sha(bytes), sourceFiles: Object.keys(item.trialSourceBindings).length,
      sourceBindingsSha256: sha(JSON.stringify(item.trialSourceBindings)), bundleSha256: item.result.bundleSha256 };
  }
  return bindings;
}
async function originalBindings(parent) {
  const pairRoot = path.join(work, 'tmp/r17-phone-probe'), bytes = await fs.readFile(path.join(pairRoot, 'manifest.json'));
  const pair = JSON.parse(bytes), proofBytes = await fs.readFile(path.join(work, 'R17-PHONE-PROBE-BUILD.json'));
  if (sha(bytes) !== parent.original.sourceManifestSha256 || sha(proofBytes) !== parent.original.buildEvidenceSha256) throw Error('original_pair_owner_changed');
  const allSources = {}, bundles = {};
  for (const variant of ['baseline', 'candidate']) {
    const item = pair.variants[variant], directory = path.join(pairRoot, variant), hashes = {};
    if (path.resolve(root, item.directory) !== directory) throw Error('original_pair_scope_mismatch');
    for (const [file, originalHash] of Object.entries(pair.sourceSnapshot)) {
      const edit = file.startsWith(feature) ? item.instrumentation[file.slice(feature.length)] : null;
      const preserved = pair.baselineSources.find(row => row.path === file);
      const expected = edit?.afterSha256 ?? (variant === 'baseline' && preserved ? preserved.sha256 : originalHash);
      if (sha(await fs.readFile(path.join(directory, file))) !== expected) throw Error('original_pair_source_changed');
      hashes[file] = expected;
    }
    for (const name of ['r17-phone-probe-runtime.ts', 'r17-phone-probe-controls.tsx']) {
      const expected = sha((await fs.readFile(path.join(here, name), 'utf8')).replaceAll('__VARIANT__', variant));
      if (sha(await fs.readFile(path.join(directory, feature, name))) !== expected) throw Error('original_pair_template_changed');
      hashes[feature + name] = expected;
    }
    for (const folder of [item.result.bundleDirectory, item.result.projectDirectory + '/weapp'])
      if (!path.resolve(root, folder).startsWith(pairRoot + path.sep) ||
        (await fingerprintBundle(path.join(root, folder))).sha256 !== parent.original.bundleHashes[variant]) throw Error('original_pair_bundle_changed');
    allSources[variant] = hashes; bundles[variant] = item.result.bundleSha256;
  }
  if (sha(JSON.stringify(allSources)) !== parent.original.allSourceBindingsSha256 ||
    bundles.candidate !== 'a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf' ||
    bundles.baseline !== '61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5') throw Error('original_pair_binding_changed');
  await snapshotSources(root, parent.normalSourceBindings);
  return { sourceManifestSha256: sha(bytes), buildEvidenceSha256: sha(proofBytes), bundleHashes: bundles,
    allSourceBindingsSha256: sha(JSON.stringify(allSources)) };
}
async function verification(manifest) {
  const parentBytes = await fs.readFile(path.join(parentRoot, 'manifest.json')), parent = JSON.parse(parentBytes);
  const parentEvidenceBytes = await fs.readFile(path.join(work, 'R17-CPU-PAGE-ONLY-TRIAL.json'));
  if (sha(parentBytes) !== manifest.parent.manifestSha256 || sha(parentEvidenceBytes) !== manifest.parent.evidenceSha256 ||
    parent.result.bundleSha256 !== 'cc40d6e5a80563bcb52d20c3cacef4b8781e5e09410b48c04e375d26467a78b5') throw Error('cpu_parent_identity_changed');
  if (manifest.scope !== scope || manifest.builderSha256 !== sha(await fs.readFile(scriptPath)) ||
    JSON.stringify(manifest.templateBindings) !== JSON.stringify(Object.fromEntries(Object.entries(templates).map(([name, value]) => [name, sha(value)])))) throw Error('trial_templates_changed');
  if (JSON.stringify(await priorBindings()) !== JSON.stringify(manifest.priorTrialBindings) ||
    JSON.stringify(await originalBindings(parent)) !== JSON.stringify(manifest.original)) throw Error('prior_or_original_changed');
  await snapshotSources(sourceRoot, manifest.trialSourceBindings);
  const parentSource = path.join(parentRoot, 'source');
  const exact = Object.keys(parent.trialSourceBindings).filter(file => manifest.trialSourceBindings[file] !== parent.trialSourceBindings[file]);
  if (exact.length !== 2 || !exact.includes(surfacePath) || !exact.includes(controlsPath) ||
    Object.keys(manifest.trialSourceBindings).length !== Object.keys(parent.trialSourceBindings).length + 1) throw Error('trial_delta_changed');
  if (await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8') !== surfaceTrial(await fs.readFile(path.join(parentSource, surfacePath), 'utf8')) ||
    templates['r17-cpu-text-metrics-controls.tsx'] !== controlsTrial(await fs.readFile(path.join(parentSource, controlsPath), 'utf8')) ||
    await fs.readFile(path.join(sourceRoot, controlsPath), 'utf8') !== templates['r17-cpu-text-metrics-controls.tsx'] ||
    await fs.readFile(path.join(sourceRoot, cachePath), 'utf8') !== templates['r17-cpu-text-metrics.ts']) throw Error('single_variable_patch_changed');
  for (const link of ['node_modules', 'apps/wechat-miniapp/node_modules'])
    if (!(await fs.lstat(path.join(sourceRoot, link))).isSymbolicLink() ||
      (await fs.realpath(path.join(sourceRoot, link))).toLowerCase() !== (await fs.realpath(path.join(parentSource, link))).toLowerCase()) throw Error('dependency_junction_changed');
  const inherited = await verifyCpuPageOnlyFixture({ sourceRoot: parentSource, feature, ts });
  const cache = await verifyCpuTextMetricsFixture({ sourceRoot, feature, ts });
  return { inheritedParentCpuChecks: inherited, exactCommonSourceBinding: true, textMetricsChecks: cache };
}
if (mode === 'prepare') {
  await absent(trialRoot); await absent(evidencePath);
  const parentBytes = await fs.readFile(path.join(parentRoot, 'manifest.json')), parent = JSON.parse(parentBytes);
  const parentEvidenceBytes = await fs.readFile(path.join(work, 'R17-CPU-PAGE-ONLY-TRIAL.json'));
  const { stdout: head } = await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true });
  const manifest = { scope, createdAt: new Date().toISOString(), head: head.trim(), builderSha256: sha(await fs.readFile(scriptPath)),
    templateBindings: Object.fromEntries(Object.entries(templates).map(([name, value]) => [name, sha(value)])),
    sourceDirectory: relative(sourceRoot), parent: { manifestSha256: sha(parentBytes), evidenceSha256: sha(parentEvidenceBytes),
      sourceDirectory: parent.sourceDirectory, bundleSha256: parent.result.bundleSha256, sourceBindings: parent.trialSourceBindings },
    original: await originalBindings(parent), priorTrialBindings: await priorBindings(),
    trialSourceBindings: {}, exactDifferencesFromParent: [surfacePath, controlsPath, cachePath], result: null };
  await fs.mkdir(trialRoot); await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  for (const file of Object.keys(parent.trialSourceBindings)) {
    const source = await fs.readFile(path.join(parentRoot, 'source', file));
    const bytes = file === surfacePath ? surfaceTrial(source.toString('utf8')) : file === controlsPath ? templates['r17-cpu-text-metrics-controls.tsx'] : source;
    const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes, { flag: 'wx' }); manifest.trialSourceBindings[file] = sha(bytes);
  }
  await fs.writeFile(path.join(sourceRoot, cachePath), templates['r17-cpu-text-metrics.ts'], { flag: 'wx' });
  manifest.trialSourceBindings[cachePath] = sha(templates['r17-cpu-text-metrics.ts']);
  for (const link of ['node_modules', 'apps/wechat-miniapp/node_modules'])
    await fs.symlink(await fs.realpath(path.join(parentRoot, 'source', link)), path.join(sourceRoot, link), 'junction');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  manifest.scopeBehaviorChecks = await verification(manifest);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ prepared: true, sourceFiles: Object.keys(manifest.trialSourceBindings).length, checks: manifest.scopeBehaviorChecks }));
} else {
  const manifest = await json(manifestPath), checks = await verification(manifest);
  if (mode === 'build') {
    await absent(bundleRoot); await absent(projectRoot); if (manifest.result) throw Error('trial_already_built');
    const { stdout } = await run('pwsh', ['-NoProfile', '-Command', '(Get-NetTCPConnection -State Listen -LocalPort 8791 | Select-Object -First 1).LocalAddress'], { windowsHide: true });
    const address = stdout.trim();
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(address) || address.startsWith('127.') || address === '0.0.0.0') throw Error('authorized_physical_listener_required');
    const origin = `http://${address}:8795`, env = { ...process.env, MINIAPP_ISOLATED_CHECK_BUILD: '1', MINIAPP_ISOLATED_CHECK_BUILD_SLOT: slot,
      MINIAPP_API_BASE: origin, MINIAPP_SKY_RESOURCE_BASE: origin };
    for (const name of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE', 'MINIAPP_ISOLATED_FIXTURE_BUILD', 'MINIAPP_ACCEPTANCE_DIAGNOSTICS', 'MINIAPP_DEVICE_REQUEST_DIAGNOSTICS',
      'MINIAPP_OPERATOR_PREVIEW_TOKEN', 'MINIAPP_RELEASE_BUNDLE_ID', 'MINIAPP_SKY_FEEDBACK_ID']) delete env[name];
    const redact = value => String(value ?? '').replaceAll(origin, '[physical-LAN-bridge-8795]').replaceAll(address, '[physical-LAN-listener]');
    try {
      const build = await run(process.execPath, [path.join(root, 'tools/run-node.cjs'), '--bin', '@tarojs/cli', 'taro', 'build', '--type', 'weapp'],
        { cwd: path.join(sourceRoot, 'apps/wechat-miniapp'), env, windowsHide: true, maxBuffer: 30 * 1024 * 1024 });
      await fs.writeFile(path.join(trialRoot, 'build-redacted.log'), redact(build.stdout) + '\n' + redact(build.stderr));
    } catch (error) { await fs.writeFile(path.join(trialRoot, 'build-redacted.log'), redact(error.stdout) + '\n' + redact(error.stderr)); throw Error('complete_build_failed_see_redacted_log'); }
    await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
    await fs.mkdir(projectRoot);
    const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'apps/wechat-miniapp/project.config.json'), 'utf8'));
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot; config.projectname = 'starward-r17-cpu-text-metrics-frozen-synthetic';
    if (config.setting) delete config.setting.useCompilerPlugins;
    await fs.writeFile(path.join(projectRoot, 'project.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
    await fs.cp(bundleRoot, path.join(projectRoot, 'weapp'), { recursive: true, errorOnExist: true, force: false });
    if ((await fingerprintBundle(path.join(projectRoot, 'weapp'))).sha256 !== fingerprint.sha256) throw Error('project_copy_mismatch');
    manifest.result = { bundleDirectory: relative(bundleRoot), projectDirectory: relative(projectRoot), bundleSha256: fingerprint.sha256,
      fileCount: fingerprint.fileCount, totalBytes: fingerprint.totalBytes, packages: budget.packages,
      mainHeadroomBytes: budget.limits.perPackageBytes - budget.packages.main.bytes, staticChecks: inspection.checks };
    manifest.scopeBehaviorChecks = await verification(manifest);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n'); console.log(JSON.stringify({ buildReady: true, ...manifest.result }));
  } else {
    if (!manifest.result) throw Error('complete_build_required');
    await assertPhysicalDeviceBundleSafe(bundleRoot);
    if ((await fingerprintBundle(bundleRoot)).sha256 !== manifest.result.bundleSha256 ||
      (await fingerprintBundle(path.join(projectRoot, 'weapp'))).sha256 !== manifest.result.bundleSha256) throw Error('bundle_readback_mismatch');
    const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
    const evidence = { scope, status: 'BUILD_READY_CPU_TEXT_METRICS_FROZEN_SYNTHETIC_PHONE_UNVERIFIED', head: manifest.head,
      builderSha256: manifest.builderSha256, templateBindings: manifest.templateBindings, sourceManifest: relative(manifestPath),
      sourceManifestSha256: sha(await fs.readFile(manifestPath)), sourceFiles: Object.keys(manifest.trialSourceBindings).length,
      sourceSnapshotSha256: sha(JSON.stringify(manifest.trialSourceBindings)), parent: { manifestSha256: manifest.parent.manifestSha256,
        evidenceSha256: manifest.parent.evidenceSha256, bundleSha256: manifest.parent.bundleSha256,
        sourceSnapshotSha256: sha(JSON.stringify(manifest.parent.sourceBindings)) }, original: manifest.original,
      exactSourceDifferencesFromParent: manifest.exactDifferencesFromParent.map(file => ({ file, parentSha256: manifest.parent.sourceBindings[file] ?? null,
        trialSha256: manifest.trialSourceBindings[file] })), originalPairSourceAndBothBundleCopiesUnchanged: true,
      normalSourceUnchanged: true, precedingTrialSourceAndBothBundleCopiesUnchanged: manifest.priorTrialBindings,
      fullSourceBuildNotGeneratedPatch: true, postBuildSourceAndBothBundleCopiesReadback: true,
      diagnosticLabel: 'CPU/text-metrics cache · frozen · synthetic', protocolVariant: 'candidate',
      cachePolicy: { owner: 'per-native-surface', active: 'only-after-original-ready-copy-and-real-publication-freeze',
        key: ['exact-font', 'exact-text', 'lineHeight', 'letterSpacing'], capacity: 256, boundClassification: 'temporary-experiment-not-product-budget',
        eviction: 'least-recently-used-then-original-native-miss', value: 'five-parsed-finite-nonnegative-numbers-no-native-TextMetrics',
        mutation: 'frozen-private-copy-on-store-and-fresh-five-number-copy-on-hit', error: 'invalid-input-result-or-native-throw-not-stored',
        lifetime: 'new-surface-independent-clear-on-dispose-resize-invalidates-owner', reset: 'actual-Play-counters-only-no-entry-or-lifetime-reset',
        nativeGlyphCalls: 'actual-native-measureText-invocation-attempts-including-initial-unfrozen-and-throwing-calls' },
      unchangedCpuPolicy: { facadeObserverPageGpuRuntime: 'byte-identical-to-completed-CPU-page-only-parent',
        fullSceneAndRealReactPublication: true, initialNativeReadyCopy: true, syntheticR17AcceptedOmitted: true,
        nativeRaf: true, asynchronousImageLoaders: true, exportWallMs: 15000, guardedOriginalPauseWallMs: 20000 },
      observation: 'menu-open-and-export-fixed-scalars-no-per-frame-React-or-raw-text-export', checks,
      result: { ...manifest.result, staticChecks: inspection.checks },
      limitations: ['Diagnostic only; no adopted repair, current pixels, source contribution, accepted time, phone memory result or R17 acceptance.',
        'Same full CPU Scene/publication and native RAF/image-loader boundaries remain; native rendering and renderer staging remain synthetic after freeze.',
        'Only surface.measureText is cached. Initial native present caption measurement is intentionally unchanged.',
        'Native measurement glyph calls count attempts, not successful TextMetrics returns or native allocator bytes.',
        'The256-entry cache bound is a temporary trial parameter, not a selected production cache budget.',
        'Inherited15CPU fixtures run on the exact unchanged parent and byte-identical common source; new focused fixtures exercise the current cache/surface and controls integration.',
        'Do not Apply, pick objects or inspect Sources. Existing15s export and20s guarded original Pause are diagnostic controls.',
        'No phone, feedback, DevTools, service, DB, remote resource, production source, prior trial, PLAN, HANDOFF, INDEX or commit was changed.'] };
    await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, sourceFiles: evidence.sourceFiles, checks, ...evidence.result }));
  }
}
