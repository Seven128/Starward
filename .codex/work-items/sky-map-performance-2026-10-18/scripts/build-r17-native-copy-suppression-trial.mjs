// One task-only frozen-image diagnosis from the ORIGINAL paired candidate.
// Real GL/captions/React publication continue; native full-frame copies stop
// after each surface's first successful copy. Never product acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..'), work = path.resolve(here, '..');
const pairRoot = path.join(work, 'tmp/r17-phone-probe');
const trialRoot = path.join(work, 'tmp/r17-native-copy-suppression-trial');
const sourceRoot = path.join(trialRoot, 'source');
const projectRoot = path.join(trialRoot, 'project');
const feature = 'apps/wechat-miniapp/src/features/sky/';
const surfacePath = feature + 'sky-canvas-surface.ts';
const controlsPath = feature + 'r17-phone-probe-controls.tsx';
const runtimePath = feature + 'r17-phone-probe-runtime.ts';
const pagePath = feature + 'spot-sky-page.tsx';
const slot = 'r17-copy-suppression';
const bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot);
const manifestPath = path.join(trialRoot, 'manifest.json');
const evidencePath = path.join(work, 'R17-NATIVE-COPY-SUPPRESSION-TRIAL.json');
const mode = process.argv[2] ?? 'prepare';
const run = promisify(execFile), require = createRequire(import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(root, value).replaceAll('\\', '/');
const read = file => fs.readFile(path.join(root, file));
const json = file => fs.readFile(file, 'utf8').then(JSON.parse);
const scope = 'TASK_ONLY_NATIVE_COPY_SUPPRESSION_SYNTHETIC_NOT_PRODUCT_ACCEPTANCE';
const scriptPath = fileURLToPath(import.meta.url);
const diagnosticControlsPath = path.join(here, 'r17-native-copy-suppression-controls.tsx');
const diagnosticControls = await fs.readFile(diagnosticControlsPath, 'utf8');
const absent = async target => {
  try { await fs.lstat(target); throw Error('trial_output_already_exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
};
if (!['prepare', 'build', 'inspect'].includes(mode)) throw Error('use_prepare_build_or_inspect');
if (trialRoot !== path.join(work, 'tmp', 'r17-native-copy-suppression-trial')) throw Error('trial_scope_required');
if ((await fs.realpath(path.dirname(trialRoot))).toLowerCase() !== path.join(await fs.realpath(work), 'tmp').toLowerCase())
  throw Error('trial_parent_scope_mismatch');

const { fingerprintBundle, inspectReleaseBundleBudget } = await import(pathToFileURL(path.join(root, 'tools/miniapp/release-bundle-artifact.mjs')));
const { inspectCandidate } = await import(pathToFileURL(path.join(root, 'tools/miniapp/inspect-production.mjs')));
const { assertPhysicalDeviceBundleSafe } = await import(pathToFileURL(path.join(root, 'tools/miniapp/device-feedback-snapshot.mjs')));
const ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));

function replaceOne(source, from, to, label) {
  if (source.split(from).length !== 2) throw Error('trial_source_boundary_changed:' + label);
  return source.replace(from, to);
}
function trialSurface(source) {
  source = replaceOne(source, 'export interface SkyWebGLCanvas', `// Task-only scalar counters; no native identifiers, retained frame arrays or render loop.
let r17Surfaces = 0, r17ActualCopies = 0, r17SuppressedCopies = 0;
export function r17NativeCopySuppressionStats() {
  return { surfaces: r17Surfaces, actualCopies: r17ActualCopies, suppressedCopies: r17SuppressedCopies };
}

export interface SkyWebGLCanvas`, 'scalar_diagnostic_owner');
  source = replaceOne(source, '    const ownedNode = node, ownedGl = gl;',
    '    const ownedNode = node, ownedGl = gl;\n    let r17InitialCopyComplete = false;', 'first_copy_state');
  source = replaceOne(source, '    return {\n      node: ownedNode, gl: ownedGl,',
    '    if (r17Surfaces < Number.MAX_SAFE_INTEGER) r17Surfaces++;\n    return {\n      node: ownedNode, gl: ownedGl,', 'surface_counter');
  return replaceOne(source, '        context.drawImage(ownedNode, 0, 0, width, height);',
    `        // Synthetic diagnosis: the first successful full frame stays visible.
        // All GL work, flush, captions, reticles and caller publication continue.
        if (!r17InitialCopyComplete) {
          context.drawImage(ownedNode, 0, 0, width, height);
          r17InitialCopyComplete = true;
          if (r17ActualCopies < Number.MAX_SAFE_INTEGER) r17ActualCopies++;
        } else if (r17SuppressedCopies < Number.MAX_SAFE_INTEGER) r17SuppressedCopies++;`, 'completed_frame_copy');
}
const trialControls = () => diagnosticControls;
function trialPage(source) {
  source = replaceOne(source, 'import { R17PhoneProbeControls } from "./r17-phone-probe-controls";',
    'import { R17PhoneProbeControls, useR17NativeSuppressionLifecycle } from "./r17-phone-probe-controls";', 'page_lifecycle_import');
  source = replaceOne(source, 'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {',
    'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {\n  useR17NativeSuppressionLifecycle();', 'page_lifecycle_hook');
  return replaceOne(source, '      r17Probe.accepted(frame,paintedSkyObjectsRef.current);',
    '      // SYNTHETIC frozen-image diagnosis: real attempt.publish above is retained,\n      // but no accepted-copy/time probe claim is made for a suppressed native copy.', 'suppress_accepted_probe');
}

// Bounded real staged-owner JS fixtures; native memory remains unverified.
async function verifyCopyScope() {
  const transpile = source => ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const load = (source, require, extra = {}, suffix = '') => {
    const module = { exports: {} };
    vm.runInNewContext('(function(exports,require,module){' + transpile(source) + '\n' + suffix + '\n})', { console, ...extra })(module.exports, require, module);
    return module.exports;
  };
  const surfaceSource = await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8');
  const events = [], stack = [];
  let failCopy = false, lost = false, widthWrites = 0, allocations = 0;
  const context = {
    globalAlpha: 1,
    save() { stack.push(this.globalAlpha); events.push('save'); },
    restore() { this.globalAlpha = stack.pop(); events.push('restore'); },
    drawImage(_source, x, y, width, height) {
      assert.deepEqual([x, y, width, height], [0, 0, 780, 1688]); events.push('native-copy');
      if (failCopy) throw Error('trial_copy_failed');
    },
    scale() {}, measureText() { return { width: 12 }; },
    fillText() { events.push('caption'); },
  };
  const surfaceApi = load(surfaceSource, name => {
    if (name === './sky-selection-reticle') return {
      createSkySelectionLayer() { throw Error('unexpected_selection_layer'); },
      paintSkySelectionReticle(value) { assert.strictEqual(value, context); events.push('reticle'); },
    };
    if (name === '../../services/runtime-error') return { reportRuntimeError() { throw Error('unexpected_runtime_error'); } };
    throw Error('unexpected_fixture_import:' + name);
  });
  const makeSurface = () => {
    let nodeWidth = 0, nodeHeight = 0;
    const gl = { isContextLost: () => lost, flush: () => events.push('flush'), getExtension: () => null };
    const node = { get width() { return nodeWidth; }, set width(value) { nodeWidth = value; widthWrites++; },
      get height() { return nodeHeight; }, set height(value) { nodeHeight = value; widthWrites++; },
      getContext: () => gl, createImage() { throw Error('unexpected_frame_image_allocation'); } };
    const display = { width: 0, height: 0, getContext: () => context };
    return surfaceApi.createSkyCanvasSurface(display, { width: 390, height: 844 }, 2, () => { allocations++; return node; });
  };
  const reticle = { x: 10, y: 20, radiusPx: 12, shape: 'cross', color: '#fff' };
  const captions = [{ text: 'Name', x: 30, y: 40, opacity: 1, letterSpacing: 0 }];
  const surface = makeSurface(), firstWrites = widthWrites;
  surface.present(reticle, captions);
  assert.deepEqual(events, ['flush', 'native-copy', 'save', 'caption', 'restore', 'reticle']);
  events.length = 0;
  for (let frame = 0; frame < 20; frame++) surface.present(reticle, captions);
  assert.equal(events.filter(value => value === 'flush').length, 20);
  assert.equal(events.filter(value => value === 'native-copy').length, 0);
  assert.equal(events.filter(value => value === 'caption').length, 20);
  assert.equal(events.filter(value => value === 'reticle').length, 20);
  assert.equal(widthWrites, firstWrites); assert.equal(allocations, 1); assert.equal(stack.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(surfaceApi.r17NativeCopySuppressionStats())), { surfaces: 1, actualCopies: 1, suppressedCopies: 20 });
  const retrySurface = makeSurface(), retryWrites = widthWrites;
  failCopy = true; events.length = 0;
  assert.throws(() => retrySurface.present(reticle, captions), /trial_copy_failed/u);
  assert.deepEqual(events, ['flush', 'native-copy']);
  assert.equal(surfaceApi.r17NativeCopySuppressionStats().actualCopies, 1);
  failCopy = false; retrySurface.present(reticle, captions); retrySurface.present(reticle, captions);
  assert.equal(surfaceApi.r17NativeCopySuppressionStats().actualCopies, 2);
  assert.equal(surfaceApi.r17NativeCopySuppressionStats().suppressedCopies, 21);
  assert.equal(widthWrites, retryWrites); assert.equal(allocations, 2);
  lost = true; events.length = 0;
  assert.throws(() => retrySurface.present(reticle, captions), /sky_canvas_surface_invalidated/u);
  assert.deepEqual(events, []); lost = false;

  let clock = 0, nextTimer = 0, hide, unmount, published = 0;
  const timers = new Map(), requests = [];
  const schedule = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: clock + delay }); return id; };
  const advance = to => { while (true) {
    const due = [...timers].filter(([, value]) => value.at <= to).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break; timers.delete(due[0]); clock = due[1].at; due[1].callback();
  } clock = to; };
  const timerEnvironment = { setTimeout: schedule, clearTimeout: id => timers.delete(id), performance: { now: () => clock } };
  const probe = load(await fs.readFile(path.join(sourceRoot, runtimePath), 'utf8'), name => { throw Error(name); }, timerEnvironment).r17Probe;
  const controls = load(await fs.readFile(path.join(sourceRoot, controlsPath), 'utf8'), name => {
    if (name === './r17-phone-probe-runtime') return { r17Probe: probe };
    if (name === './sky-canvas-surface') return surfaceApi;
    if (name === 'react') return { useEffect: effect => { unmount = effect(); }, useState: value => [value, () => {}] };
    if (name === '@tarojs/taro') return { __esModule: true, useDidHide: callback => { hide = callback; }, default: { request(options) {
      return new Promise(resolve => requests.push({ options, resolve }));
    } } };
    if (name === '@tarojs/components' || name === 'react/jsx-runtime') return {};
    throw Error('unexpected_controls_import:' + name);
  }, { ...timerEnvironment, __MINIAPP_API_BASE__: 'http://diagnostic.invalid' },
  'exports.fixture = { startDiagnostic, exportDiagnostic, cancelDiagnostic, getStatus: () => status };');
  controls.useR17NativeSuppressionLifecycle();
  assert.equal(typeof hide, 'function'); assert.equal(typeof unmount, 'function');
  assert.equal(controls.fixture.startDiagnostic('narrow-play'), true);
  assert.equal(timers.size, 2); advance(1000);
  // Execute the staged completion statements exactly through the original real
  // attempt.publish call, using the actual measurement runtime.
  const pageSource = await fs.readFile(path.join(sourceRoot, pagePath), 'utf8');
  assert.equal(pageSource.includes('r17Probe.accepted('), false);
  assert.equal(pageSource.split('useR17NativeSuppressionLifecycle();').length, 2);
  const first = pageSource.indexOf('      r17Probe.measure("displayCopy"');
  const last = pageSource.indexOf('      setCanvasSize(', first);
  assert(first > 0 && last > first);
  const completion = pageSource.slice(first, last);
  assert.equal(completion.split('attempt.publish!').length, 2);
  const executeCompletion = vm.runInNewContext('(function(r17Probe,surface,attempt,selectionCurrent,excludedNameKeys){' + transpile(completion) + '})');
  for (let frame = 0; frame < 10; frame++) executeCompletion(probe, surface, { reticle, captions, publish() { published++; } }, true, []);
  assert.equal(published, 10);
  assert.equal(surfaceApi.r17NativeCopySuppressionStats().actualCopies, 2);
  assert.equal(surfaceApi.r17NativeCopySuppressionStats().suppressedCopies, 31);
  advance(15000); assert.equal(requests.length, 1); assert.equal(timers.size, 0);
  const receipt = JSON.parse(requests[0].options.data);
  assert.equal(receipt.schemaVersion, 'starward-r17-phone-probe-v1'); assert.equal(receipt.variant, 'candidate');
  assert.equal(receipt.window.durationLimitMs, 45000); assert.equal(receipt.window.reason, 'manual'); assert.equal(receipt.window.elapsedMs, 14000);
  assert.equal(receipt.counters.acceptedCopies, 0); assert.equal(receipt.time.accepted.events, 0);
  assert.equal(receipt.cpu.publishAccepted.calls, 10); assert.equal(receipt.cpu.displayCopy.calls, 10);
  assert.equal(receipt.counters.failedFrames, 0); assert(requests[0].options.data.length <= 32768);
  await controls.fixture.exportDiagnostic(); assert.equal(requests.length, 1);
  assert.equal(controls.fixture.startDiagnostic('wide-play'), false);
  requests[0].resolve({ statusCode: 200, data: { stored: true } });
  await Promise.resolve(); await Promise.resolve();
  assert.match(controls.fixture.getStatus(), /synthetic S2 C2 X31 已导出 .*14000ms\/manual/u);
  const retry = controls.fixture.exportDiagnostic(); assert.equal(requests.length, 2);
  assert.equal(requests[1].options.data, requests[0].options.data);
  requests[1].resolve({ statusCode: 200, data: { stored: true } }); await retry;
  controls.fixture.startDiagnostic('wide-play'); controls.fixture.startDiagnostic('narrow-play');
  assert.equal(timers.size, 2); hide(); assert.equal(timers.size, 0);
  advance(60000); assert.equal(requests.length, 2);
  controls.fixture.startDiagnostic('narrow-play'); assert.equal(timers.size, 2); unmount(); assert.equal(timers.size, 0);
  surface.dispose(); retrySurface.dispose();
  return { firstSuccessfulCopyPerSurface: true, failedFirstCopyRetries: true, subsequentCopiesSuppressed: true,
    glFlushCaptionsAndReticleRetained: true, realAttemptPublishRetained: true, acceptedProbeNotCalled: true,
    acceptedCopyAndAcceptedTimeCountersZero: true, noPerPresentCanvasAllocationOrResize: true,
    boundedScalarCountersOnly: true, autoExportOnceAt15SecondsManual: true, original45SecondDurationUnchanged: true,
    idempotentPayloadRetry: true, concurrentExportAndStartGuarded: true, pageHideAndUnmountCancelTimer: true,
    fixtureOnlyNotNativePixelsOrMemory: true };
}

async function originalBindings() {
  const manifestBytes = await fs.readFile(path.join(pairRoot, 'manifest.json'));
  const proofBytes = await fs.readFile(path.join(work, 'R17-PHONE-PROBE-BUILD.json'));
  const manifest = JSON.parse(manifestBytes), proof = JSON.parse(proofBytes);
  if (manifest.scope !== 'TASK_ONLY_DIAGNOSTIC_NOT_FORMAL_ACCEPTANCE' ||
    Object.keys(manifest.variants).sort().join(',') !== 'baseline,candidate' || proof.measurementWindow.durationLimitMs !== 45000)
    throw Error('admitted_45_second_pair_required');
  const sourceHashes = {}, bundleHashes = {};
  const runtimeTemplate = await fs.readFile(path.join(here, 'r17-phone-probe-runtime.ts'), 'utf8');
  const controlsTemplate = await fs.readFile(path.join(here, 'r17-phone-probe-controls.tsx'), 'utf8');
  if (sha(runtimeTemplate) !== manifest.probeTemplateSha256 || sha(controlsTemplate) !== manifest.controlsTemplateSha256)
    throw Error('original_pair_templates_changed');
  for (const variant of ['baseline', 'candidate']) {
    const item = manifest.variants[variant];
    const directory = path.join(root, item.directory);
    if (directory !== path.join(pairRoot, variant)) throw Error('original_pair_source_scope_mismatch');
    const hashes = {};
    for (const [file, originalHash] of Object.entries(manifest.sourceSnapshot)) {
      if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('original_source_path_invalid');
      const edit = file.startsWith(feature) ? item.instrumentation[file.slice(feature.length)] : null;
      const preserved = manifest.baselineSources.find(row => row.path === file);
      const expected = edit?.afterSha256 ?? (variant === 'baseline' && preserved ? preserved.sha256 : originalHash);
      const actual = sha(await fs.readFile(path.join(directory, file)));
      if (actual !== expected) throw Error('original_pair_source_changed:' + variant + ':' + file);
      hashes[file] = actual;
    }
    for (const [file, template] of [[runtimePath, runtimeTemplate], [controlsPath, controlsTemplate]]) {
      const expected = sha(template.replaceAll('__VARIANT__', variant));
      if (sha(await fs.readFile(path.join(directory, file))) !== expected) throw Error('original_pair_diagnostic_source_changed');
      hashes[file] = expected;
    }
    sourceHashes[variant] = hashes;
    if (item.result.bundleSha256 !== proof.variants[variant].bundleSha256) throw Error('original_pair_evidence_mismatch');
    for (const folder of [item.result.bundleDirectory, item.result.projectDirectory + '/weapp']) {
      if (!path.resolve(root, folder).startsWith(pairRoot + path.sep)) throw Error('original_bundle_scope_mismatch');
      if ((await fingerprintBundle(path.join(root, folder))).sha256 !== item.result.bundleSha256) throw Error('original_pair_bundle_changed');
    }
    bundleHashes[variant] = item.result.bundleSha256;
  }
  const allowed = new Set([...manifest.baselineSources.map(row => row.path), runtimePath, controlsPath]);
  const differences = Object.keys(sourceHashes.candidate).filter(file => sourceHashes.candidate[file] !== sourceHashes.baseline[file]);
  if (differences.length !== 7 || differences.some(file => !allowed.has(file))) throw Error('original_pair_parity_changed');
  return { sourceHashes, bundleHashes, sourceManifestSha256: sha(manifestBytes), buildEvidenceSha256: sha(proofBytes),
    normalFiles: Object.keys(manifest.sourceSnapshot), candidateDirectory: path.join(pairRoot, 'candidate') };
}

async function readNormalBindings(files) {
  const hashes = {};
  for (const file of files) hashes[file] = sha(await read(file));
  return hashes;
}
async function verifyBindings(manifest) {
  if (manifest.scope !== scope || manifest.builderSha256 !== sha(await fs.readFile(scriptPath)) ||
    manifest.diagnosticControlsSha256 !== sha(diagnosticControls)) throw Error('trial_owner_or_builder_changed');
  const original = await originalBindings();
  if (original.sourceManifestSha256 !== manifest.original.sourceManifestSha256 ||
    original.buildEvidenceSha256 !== manifest.original.buildEvidenceSha256 ||
    JSON.stringify(original.bundleHashes) !== JSON.stringify(manifest.original.bundleHashes) ||
    sha(JSON.stringify(original.sourceHashes)) !== manifest.original.allSourceBindingsSha256)
    throw Error('original_pair_changed_after_trial_preparation');
  if (JSON.stringify(await readNormalBindings(Object.keys(manifest.normalSourceBindings))) !== JSON.stringify(manifest.normalSourceBindings))
    throw Error('normal_source_changed_after_trial_preparation');
  for (const [file, expected] of Object.entries(manifest.trialSourceBindings))
    if (sha(await fs.readFile(path.join(sourceRoot, file))) !== expected) throw Error('trial_source_readback_mismatch:' + file);
  const differences = Object.keys(original.sourceHashes.candidate).filter(file => original.sourceHashes.candidate[file] !== manifest.trialSourceBindings[file]);
  if (differences.length !== 3 || ![surfacePath, controlsPath, pagePath].every(file => differences.includes(file))) throw Error('trial_source_parity_mismatch');
  if (await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8') !== trialSurface(await fs.readFile(path.join(original.candidateDirectory, surfacePath), 'utf8')) ||
    await fs.readFile(path.join(sourceRoot, controlsPath), 'utf8') !== trialControls() ||
    await fs.readFile(path.join(sourceRoot, pagePath), 'utf8') !== trialPage(await fs.readFile(path.join(original.candidateDirectory, pagePath), 'utf8')))
    throw Error('trial_single_variable_patch_mismatch');
  for (const relativePath of ['node_modules', 'apps/wechat-miniapp/node_modules']) {
    const link = path.join(sourceRoot, relativePath);
    if (!(await fs.lstat(link)).isSymbolicLink() || (await fs.realpath(link)).toLowerCase() !== (await fs.realpath(path.join(original.candidateDirectory, relativePath))).toLowerCase())
      throw Error('trial_dependency_junction_changed');
  }
  return verifyCopyScope();
}

if (mode === 'prepare') {
  await absent(trialRoot); await absent(evidencePath);
  const original = await originalBindings();
  const normalSourceBindings = await readNormalBindings(original.normalFiles);
  const { stdout: head } = await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true });
  await fs.mkdir(trialRoot);
  const manifest = { scope, createdAt: new Date().toISOString(), head: head.trim(), builderSha256: sha(await fs.readFile(scriptPath)),
    diagnosticControlsSha256: sha(diagnosticControls),
    sourceDirectory: relative(sourceRoot), original: { sourceManifestSha256: original.sourceManifestSha256,
      buildEvidenceSha256: original.buildEvidenceSha256, bundleHashes: original.bundleHashes,
      allSourceBindingsSha256: sha(JSON.stringify(original.sourceHashes)), candidateSourceBindings: original.sourceHashes.candidate },
    normalSourceBindings, trialSourceBindings: {}, exactDifferences: [surfacePath, controlsPath, pagePath], result: null };
  // Persist provenance before copying or changing any generated source.
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  for (const file of Object.keys(original.sourceHashes.candidate)) {
    const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true });
    const bytes = await fs.readFile(path.join(original.candidateDirectory, file));
    const copied = file === surfacePath ? trialSurface(bytes.toString('utf8')) : file === controlsPath ? trialControls() : file === pagePath ? trialPage(bytes.toString('utf8')) : bytes;
    await fs.writeFile(destination, copied, { flag: 'wx' }); manifest.trialSourceBindings[file] = sha(copied);
  }
  for (const relativePath of ['node_modules', 'apps/wechat-miniapp/node_modules'])
    await fs.symlink(await fs.realpath(path.join(original.candidateDirectory, relativePath)), path.join(sourceRoot, relativePath), 'junction');
  manifest.scopeBehaviorChecks = await verifyBindings(manifest);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ prepared: true, sourceFiles: Object.keys(manifest.trialSourceBindings).length,
    sourceManifest: relative(manifestPath), exactDifferences: manifest.exactDifferences, scopeBehaviorChecks: manifest.scopeBehaviorChecks }));
} else {
  const manifest = await json(manifestPath);
  const behavior = await verifyBindings(manifest);
  if (mode === 'build') {
    await absent(bundleRoot); await absent(projectRoot);
    if (manifest.result) throw Error('trial_already_built');
    // Use the already authorized account service's physical listener only to
    // derive the bridge origin in memory; never print/store a concrete address.
    const { stdout } = await run('pwsh', ['-NoProfile', '-Command', '(Get-NetTCPConnection -State Listen -LocalPort 8791 | Select-Object -First 1).LocalAddress'], { windowsHide: true });
    const address = stdout.trim();
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(address) || address.startsWith('127.') || address === '0.0.0.0') throw Error('authorized_physical_listener_required');
    const origin = `http://${address}:8795`;
    const env = { ...process.env, MINIAPP_ISOLATED_CHECK_BUILD: '1', MINIAPP_ISOLATED_CHECK_BUILD_SLOT: slot,
      MINIAPP_API_BASE: origin, MINIAPP_SKY_RESOURCE_BASE: origin };
    for (const key of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE', 'MINIAPP_ISOLATED_FIXTURE_BUILD', 'MINIAPP_ACCEPTANCE_DIAGNOSTICS',
      'MINIAPP_DEVICE_REQUEST_DIAGNOSTICS', 'MINIAPP_OPERATOR_PREVIEW_TOKEN', 'MINIAPP_RELEASE_BUNDLE_ID', 'MINIAPP_SKY_FEEDBACK_ID']) delete env[key];
    const redact = text => String(text ?? '').replaceAll(origin, '[physical-LAN-bridge-8795]').replaceAll(address, '[physical-LAN-listener]');
    try {
      const build = await run(process.execPath, [path.join(root, 'tools/run-node.cjs'), '--bin', '@tarojs/cli', 'taro', 'build', '--type', 'weapp'],
        { cwd: path.join(sourceRoot, 'apps/wechat-miniapp'), env, windowsHide: true, maxBuffer: 30 * 1024 * 1024 });
      await fs.writeFile(path.join(trialRoot, 'build-redacted.log'), redact(build.stdout) + '\n' + redact(build.stderr));
    } catch (error) {
      await fs.writeFile(path.join(trialRoot, 'build-redacted.log'), redact(error.stdout) + '\n' + redact(error.stderr));
      throw Error('trial_complete_build_failed_see_redacted_log');
    }
    await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('trial_static_candidate_checks_failed');
    await fs.mkdir(projectRoot);
    const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'apps/wechat-miniapp/project.config.json'), 'utf8'));
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot; config.projectname = 'starward-r17-native-copy-suppression-trial';
    if (config.setting) delete config.setting.useCompilerPlugins;
    await fs.writeFile(path.join(projectRoot, 'project.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
    await fs.cp(bundleRoot, path.join(projectRoot, 'weapp'), { recursive: true, errorOnExist: true, force: false });
    if ((await fingerprintBundle(path.join(projectRoot, 'weapp'))).sha256 !== fingerprint.sha256) throw Error('trial_project_copy_mismatch');
    manifest.result = { bundleDirectory: relative(bundleRoot), projectDirectory: relative(projectRoot), bundleSha256: fingerprint.sha256,
      fileCount: fingerprint.fileCount, totalBytes: fingerprint.totalBytes, packages: budget.packages,
      mainHeadroomBytes: budget.limits.perPackageBytes - budget.packages.main.bytes, staticChecks: inspection.checks };
    manifest.scopeBehaviorChecks = await verifyBindings(manifest);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, ...manifest.result }));
  } else {
    if (!manifest.result) throw Error('complete_trial_build_required');
    await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), project = await fingerprintBundle(path.join(projectRoot, 'weapp'));
    if (fingerprint.sha256 !== manifest.result.bundleSha256 || project.sha256 !== fingerprint.sha256) throw Error('trial_bundle_readback_mismatch');
    const budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('trial_static_candidate_checks_failed');
    const evidence = { scope, status: 'BUILD_READY_SYNTHETIC_DIAGNOSTIC_NATIVE_MEMORY_UNVERIFIED', head: manifest.head,
      builderSha256: manifest.builderSha256, diagnosticControlsSha256: manifest.diagnosticControlsSha256,
      originalCandidateSha256: manifest.original.bundleHashes.candidate,
      originalBaselineSha256: manifest.original.bundleHashes.baseline, originalSourceManifestSha256: manifest.original.sourceManifestSha256,
      originalBuildEvidenceSha256: manifest.original.buildEvidenceSha256, sourceFiles: Object.keys(manifest.trialSourceBindings).length,
      candidateSourceSnapshotSha256: sha(JSON.stringify(manifest.original.candidateSourceBindings)),
      trialSourceSnapshotSha256: sha(JSON.stringify(manifest.trialSourceBindings)), sourceManifest: relative(manifestPath),
      sourceManifestSha256: sha(await fs.readFile(manifestPath)), exactSourceDifferences: manifest.exactDifferences.map(file => ({ file,
        candidateSha256: manifest.original.candidateSourceBindings[file], trialSha256: manifest.trialSourceBindings[file] })),
      normalSourceUnchanged: true, originalPairSourceAndBundlesUnchanged: true, fullSourceBuildNotGeneratedPatch: true,
      postBuildSourceAndBundleReadback: true, diagnosticLabel: '冻结画面诊断 / synthetic', protocolVariant: 'candidate',
      measurementWindow: { startDelayMs: 1000, durationLimitMs: 45000, sampleLimit: 2048 }, productPlaybackUnchanged: true,
      diagnosticAutoExport: { wallDelayFromStartMs: 15000, snapshotReason: 'manual', expectedActiveMsWithoutSchedulingDelay: 14000,
        stopsProductPlayback: false, retriesReuseExactPayload: true },
      nativeCopyPolicy: 'first-successful-copy-per-surface-then-suppress-only-full-frame-drawImage',
      publicationPolicy: 'synthetic-real-attempt-publish-retained-r17Probe-accepted-omitted',
      scalarStatusCounters: { S: 'successfully-created-surfaces', C: 'successful-actual-full-frame-native-copies', X: 'suppressed-full-frame-native-copies' },
      originClass: 'authorized-physical-LAN-development-bridge-8795', scopeBehaviorChecks: behavior,
      result: { ...manifest.result, packages: budget.packages, staticChecks: inspection.checks },
      limitations: ['Synthetic frozen-image diagnosis is invalid for product correctness, CPU comparison, current accepted-time or successful-frame acceptance.',
        'Only each surface\'s first successful full-frame drawImage is performed. Real GL rendering/flush, captions, reticles and attempt.publish continue unchanged.',
        'The accepted probe call is omitted entirely; acceptedCopies and accepted-time events must remain zero, including the initial real native copy.',
        'The 15-second wall timer exports an early manual snapshot, nominally 14 active seconds after the one-second arm. The 45000ms limit is unchanged.',
        'Auto export stops measurement only and does not pause product playback; the parent must promptly pause through actual UI.',
        'S/C/X are bounded cumulative scalar counters displayed at export status; they are not extra collector schema fields or per-frame React updates.',
        'No phone, feedback entry, DevTools, service, database, production source or original paired staging was changed by this builder.',
        'Probe receipts retain variant=candidate; bind each receipt to this exact trial bundle and its device generation externally.'] };
    await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, postBuildSourceAndBundleReadback: true, sourceFiles: evidence.sourceFiles,
      exactSourceDifferences: evidence.exactSourceDifferences, scopeBehaviorChecks: behavior, ...evidence.result }));
  }
}
