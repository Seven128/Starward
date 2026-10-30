// Task-only CPU/page-only frozen synthetic diagnostic from the exact original paired candidate.
// Original Scene and real page publication remain; recurring native rendering is removed after first ready full copy.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..'), work = path.resolve(here, '..');
const pairRoot = path.join(work, 'tmp/r17-phone-probe');
const trialRoot = path.join(work, 'tmp/r17-cpu-page-only-trial');
const sourceRoot = path.join(trialRoot, 'source');
const projectRoot = path.join(trialRoot, 'project');
const feature = 'apps/wechat-miniapp/src/features/sky/';
const surfacePath = feature + 'sky-canvas-surface.ts';
const gpuPath = feature + 'sky-gpu-renderer.ts';
const observerPath = feature + 'r17-page-bridge-observer.ts';
const facadePath = feature + 'r17-cpu-page-only.ts';
const controlsPath = feature + 'r17-phone-probe-controls.tsx';
const runtimePath = feature + 'r17-phone-probe-runtime.ts';
const pagePath = feature + 'spot-sky-page.tsx';
const slot = 'r17-cpu-page-only';
const bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot);
const manifestPath = path.join(trialRoot, 'manifest.json');
const evidencePath = path.join(work, 'R17-CPU-PAGE-ONLY-TRIAL.json');
const mode = process.argv[2] ?? 'prepare';
const run = promisify(execFile), require = createRequire(import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(root, value).replaceAll('\\', '/');
const read = file => fs.readFile(path.join(root, file));
const json = file => fs.readFile(file, 'utf8').then(JSON.parse);
const scope = 'TASK_ONLY_CPU_PAGE_ONLY_FROZEN_SYNTHETIC_NOT_PRODUCT_ACCEPTANCE';
const scriptPath = fileURLToPath(import.meta.url);
const diagnosticControlsPath = path.join(here, 'r17-cpu-page-only-controls.tsx');
const diagnosticControls = await fs.readFile(diagnosticControlsPath, 'utf8');
const observerTemplatePath = path.join(here, 'r17-page-bridge-observer.ts');
const observerTemplate = await fs.readFile(observerTemplatePath, 'utf8');
const facadeTemplatePath = path.join(here, 'r17-cpu-page-only.ts');
const facadeTemplate = await fs.readFile(facadeTemplatePath, 'utf8');
const fixturePath = path.join(here, 'r17-cpu-page-only-fixture.mjs');
const fixtureSha256 = sha(await fs.readFile(fixturePath));
const { verifyCpuPageOnlyFixture } = await import(pathToFileURL(fixturePath));
const absent = async target => {
  try { await fs.lstat(target); throw Error('trial_output_already_exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
};
if (!['prepare', 'build', 'inspect'].includes(mode)) throw Error('use_prepare_build_or_inspect');
if (trialRoot !== path.join(work, 'tmp', 'r17-cpu-page-only-trial')) throw Error('trial_scope_required');
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
function trialGpu(source) {
  source = replaceOne(source, 'import { r17Probe } from "./r17-phone-probe-runtime";',
    'import { r17Probe } from "./r17-phone-probe-runtime";\nimport { r17RecordTypedGpuUpload } from "./r17-page-bridge-observer";', 'upload_observer_import');
  return replaceOne(source, '          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);',
    '          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);\n          r17RecordTypedGpuUpload(data.length);', 'returned_typed_upload_counter');
}
const trialControls = () => diagnosticControls;
function trialPage(source) {
  source = replaceOne(source, 'import { R17PhoneProbeControls } from "./r17-phone-probe-controls";',
    'import { R17PhoneProbeControls, useR17CpuPageOnlyLifecycle, useR17CpuPageOnlyStop, r17CpuPageOnlyProductPlayStarted } from "./r17-phone-probe-controls";\n' +
    'import { r17CpuPageOnlyAttach, r17CpuPageOnlyScene, r17CpuPageOnlyCurrent, r17CpuPageOnlyNativeCopyReturned, r17CpuPageOnlyPublished, r17CpuPageOnlyRetire } from "./r17-cpu-page-only";', 'page_diagnostic_import');
  source = replaceOne(source, 'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {',
    'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {\n  useR17CpuPageOnlyLifecycle();', 'page_lifecycle_hook');
  source = replaceOne(source, 'canvasSurfaceRef.current?.isCurrent(node, size, ratio, canvasMeasurement(measurement, 1)?.node)',
    'canvasSurfaceRef.current && r17CpuPageOnlyCurrent(canvasSurfaceRef.current, node, size, ratio, canvasMeasurement(measurement, 1)?.node)', 'no_recurring_gl_read_after_freeze');
  source = replaceOne(source, '      canvasSurfaceRef.current = surface;',
    '      r17CpuPageOnlyAttach(context, surface, display, size, pixelRatio, selectionDisplay);\n      canvasSurfaceRef.current = surface;', 'attach_surface_lifetime');
  source = replaceOne(source, '      try { context.dispose(); } finally { surface?.dispose(); }',
    '      r17CpuPageOnlyRetire(context);\n      try { context.dispose(); } finally { surface?.dispose(); }', 'retire_original_resources');
  source = replaceOne(source, '      const paintAttempt = { frame, generation: canvasGenerationRef.current, publish:',
    '      const sceneContext = r17CpuPageOnlyScene(context);\n      const paintAttempt = { frame, synthetic: sceneContext !== context, generation: canvasGenerationRef.current, publish:', 'select_scene_surface_once');
  source = replaceOne(source, 'useRef<{ frame: SkyCanvasFrame; generation: number; publish:',
    'useRef<{ frame: SkyCanvasFrame; synthetic: boolean; generation: number; publish:', 'synthetic_attempt_type');
  source = replaceOne(source, '      drawSkyScene(context, frame.data, frame.frameAt, frame.heading, frame.pose,',
    '      drawSkyScene(sceneContext, frame.data, frame.frameAt, frame.heading, frame.pose,', 'same_full_scene_inputs');
  source = replaceOne(source, 'setArtworkContributionUnavailable(context.artworkContributionsFailed?.() === true);',
    'setArtworkContributionUnavailable(sceneContext.artworkContributionsFailed?.() === true);', 'same_synthetic_success_publication');
  if (source.split('surface: context,').length !== 4) throw Error('three_optical_prepared_scene_ports_required');
  source = source.replaceAll('surface: context,', 'surface: sceneContext,');
  source = replaceOne(source,
    '      r17Probe.measure("displayCopy",()=>surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive));\n' +
    '      r17Probe.measure("publishAccepted",()=>attempt.publish!(excludedNameKeys));\n' +
    '      r17Probe.accepted(frame,paintedSkyObjectsRef.current);',
    '      if (!attempt.synthetic) {\n' +
    '        r17Probe.measure("displayCopy",()=>surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive));\n' +
    '        r17CpuPageOnlyNativeCopyReturned(surface);\n' +
    '      }\n' +
    '      r17Probe.measure("publishAccepted",()=>attempt.publish!(excludedNameKeys));\n' +
    '      if (!attempt.synthetic) r17Probe.accepted(frame,paintedSkyObjectsRef.current);\n' +
    '      r17CpuPageOnlyPublished(surface, attempt.synthetic, Boolean(frame.sceneReady && frame.data && attempt.camera?.view));', 'synthetic_publish_without_native_copy_or_acceptance');
  source = replaceOne(source, '  const toggleSkyTimePlayback = () => {',
    '  useR17CpuPageOnlyStop(runStartAt => {\n' +
    '    const time = observationTime.snapshot();\n' +
    '    if (!skyTimeIntentCurrent() || datePickerOpenRef.current || time.mode !== "PLAYING" || time.runStartAt !== runStartAt) return false;\n' +
    '    pauseSkyTime(); return true;\n' +
    '  });\n  const toggleSkyTimePlayback = () => {', 'latest_normal_guarded_pause_callback');
  return replaceOne(source, '    setTimeIntent(observationTime.play(Date.now()));',
    '    setTimeIntent(observationTime.play(Date.now()));\n    r17CpuPageOnlyProductPlayStarted(observationTime.snapshot().runStartAt);', 'real_product_play_hook');
}

async function verifyObservationScope() { return verifyCpuPageOnlyFixture({ sourceRoot, feature, ts }); }

async function originalBindings() {
  const manifestBytes = await fs.readFile(path.join(pairRoot, 'manifest.json'));
  const proofBytes = await fs.readFile(path.join(work, 'R17-PHONE-PROBE-BUILD.json'));
  const manifest = JSON.parse(manifestBytes), proof = JSON.parse(proofBytes);
  if (manifest.scope !== 'TASK_ONLY_DIAGNOSTIC_NOT_FORMAL_ACCEPTANCE' ||
    Object.keys(manifest.variants).sort().join(',') !== 'baseline,candidate' || proof.measurementWindow.durationLimitMs !== 45000)
    throw Error('admitted_45_second_pair_required');
  if (proof.variants.candidate.bundleSha256 !== 'a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf' ||
    proof.variants.baseline.bundleSha256 !== '61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5')
    throw Error('exact_original_pair_required');
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
async function priorTrialBindings() {
  const bindings = {};
  for (const name of ['r17-canvas-copy-trial', 'r17-native-copy-suppression-trial', 'r17-gpu-finish-trial', 'r17-page-bridge-observation']) {
    const directory = path.join(work, 'tmp', name), manifestBytes = await fs.readFile(path.join(directory, 'manifest.json'));
    const prior = JSON.parse(manifestBytes);
    if (path.resolve(root, prior.sourceDirectory) !== path.join(directory, 'source') || !prior.result)
      throw Error('prior_trial_source_scope_changed');
    for (const [file, expected] of Object.entries(prior.trialSourceBindings)) {
      if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('prior_source_path_invalid');
      if (sha(await fs.readFile(path.join(root, prior.sourceDirectory, file))) !== expected)
        throw Error('prior_trial_source_changed:' + name + ':' + file);
    }
    for (const folder of [prior.result.bundleDirectory, prior.result.projectDirectory + '/weapp']) {
      if (!path.resolve(root, folder).startsWith(directory + path.sep)) throw Error('prior_trial_bundle_scope_changed');
      if ((await fingerprintBundle(path.join(root, folder))).sha256 !== prior.result.bundleSha256)
        throw Error('prior_trial_bundle_changed:' + name);
    }
    bindings[name] = { manifestSha256: sha(manifestBytes), sourceFiles: Object.keys(prior.trialSourceBindings).length,
      sourceBindingsSha256: sha(JSON.stringify(prior.trialSourceBindings)), bundleSha256: prior.result.bundleSha256 };
  }
  return bindings;
}
async function verifyBindings(manifest) {
  if (manifest.scope !== scope || manifest.builderSha256 !== sha(await fs.readFile(scriptPath)) ||
    manifest.diagnosticControlsSha256 !== sha(diagnosticControls) || manifest.observerTemplateSha256 !== sha(observerTemplate) ||
    manifest.facadeTemplateSha256 !== sha(facadeTemplate) ||
    manifest.fixtureSha256 !== fixtureSha256) throw Error('trial_owner_or_builder_changed');
  const original = await originalBindings();
  if (original.sourceManifestSha256 !== manifest.original.sourceManifestSha256 ||
    original.buildEvidenceSha256 !== manifest.original.buildEvidenceSha256 ||
    JSON.stringify(original.bundleHashes) !== JSON.stringify(manifest.original.bundleHashes) ||
    sha(JSON.stringify(original.sourceHashes)) !== manifest.original.allSourceBindingsSha256)
    throw Error('original_pair_changed_after_trial_preparation');
  if (JSON.stringify(await readNormalBindings(Object.keys(manifest.normalSourceBindings))) !== JSON.stringify(manifest.normalSourceBindings))
    throw Error('normal_source_changed_after_trial_preparation');
  if (JSON.stringify(await priorTrialBindings()) !== JSON.stringify(manifest.priorTrialBindings))
    throw Error('preceding_trials_changed_after_trial_preparation');
  for (const [file, expected] of Object.entries(manifest.trialSourceBindings))
    if (sha(await fs.readFile(path.join(sourceRoot, file))) !== expected) throw Error('trial_source_readback_mismatch:' + file);
  const differences = Object.keys(original.sourceHashes.candidate).filter(file => original.sourceHashes.candidate[file] !== manifest.trialSourceBindings[file]);
  if (differences.length !== 3 || ![gpuPath, controlsPath, pagePath].every(file => differences.includes(file)) ||
    Object.keys(manifest.trialSourceBindings).length !== Object.keys(original.sourceHashes.candidate).length + 2) throw Error('trial_source_parity_mismatch');
  if (await fs.readFile(path.join(sourceRoot, gpuPath), 'utf8') !== trialGpu(await fs.readFile(path.join(original.candidateDirectory, gpuPath), 'utf8')) ||
    await fs.readFile(path.join(sourceRoot, observerPath), 'utf8') !== observerTemplate ||
    await fs.readFile(path.join(sourceRoot, facadePath), 'utf8') !== facadeTemplate ||
    await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8') !== await fs.readFile(path.join(original.candidateDirectory, surfacePath), 'utf8') ||
    await fs.readFile(path.join(sourceRoot, controlsPath), 'utf8') !== trialControls() ||
    await fs.readFile(path.join(sourceRoot, pagePath), 'utf8') !== trialPage(await fs.readFile(path.join(original.candidateDirectory, pagePath), 'utf8')))
    throw Error('trial_single_variable_patch_mismatch');
  for (const relativePath of ['node_modules', 'apps/wechat-miniapp/node_modules']) {
    const link = path.join(sourceRoot, relativePath);
    if (!(await fs.lstat(link)).isSymbolicLink() || (await fs.realpath(link)).toLowerCase() !== (await fs.realpath(path.join(original.candidateDirectory, relativePath))).toLowerCase())
      throw Error('trial_dependency_junction_changed');
  }
  return verifyObservationScope();
}

if (mode === 'prepare') {
  await absent(trialRoot); await absent(evidencePath);
  const original = await originalBindings();
  const normalSourceBindings = await readNormalBindings(original.normalFiles);
  const { stdout: head } = await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true });
  await fs.mkdir(trialRoot);
  const manifest = { scope, createdAt: new Date().toISOString(), head: head.trim(), builderSha256: sha(await fs.readFile(scriptPath)),
    diagnosticControlsSha256: sha(diagnosticControls), observerTemplateSha256: sha(observerTemplate), facadeTemplateSha256: sha(facadeTemplate), fixtureSha256,
    sourceDirectory: relative(sourceRoot), original: { sourceManifestSha256: original.sourceManifestSha256,
      buildEvidenceSha256: original.buildEvidenceSha256, bundleHashes: original.bundleHashes,
      allSourceBindingsSha256: sha(JSON.stringify(original.sourceHashes)), candidateSourceBindings: original.sourceHashes.candidate },
    normalSourceBindings, priorTrialBindings: await priorTrialBindings(), trialSourceBindings: {}, exactDifferences: [gpuPath, controlsPath, pagePath, observerPath, facadePath], result: null };
  // Persist provenance before copying or changing any generated source.
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  for (const file of Object.keys(original.sourceHashes.candidate)) {
    const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true });
    const bytes = await fs.readFile(path.join(original.candidateDirectory, file));
    const copied = file === gpuPath ? trialGpu(bytes.toString('utf8')) : file === controlsPath ? trialControls() : file === pagePath ? trialPage(bytes.toString('utf8')) : bytes;
    await fs.writeFile(destination, copied, { flag: 'wx' }); manifest.trialSourceBindings[file] = sha(copied);
  }
  await fs.writeFile(path.join(sourceRoot, observerPath), observerTemplate, { flag: 'wx' });
  manifest.trialSourceBindings[observerPath] = sha(observerTemplate);
  await fs.writeFile(path.join(sourceRoot, facadePath), facadeTemplate, { flag: 'wx' });
  manifest.trialSourceBindings[facadePath] = sha(facadeTemplate);
  for (const relativePath of ['node_modules', 'apps/wechat-miniapp/node_modules'])
    await fs.symlink(await fs.realpath(path.join(original.candidateDirectory, relativePath)), path.join(sourceRoot, relativePath), 'junction');
  // Keep the complete unbuilt source binding if a diagnostic fixture fails.
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
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
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot; config.projectname = 'starward-r17-cpu-page-only-frozen-synthetic';
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
    const evidence = { scope, status: 'BUILD_READY_CPU_PAGE_ONLY_FROZEN_SYNTHETIC_TARGET_EFFECT_UNVERIFIED', head: manifest.head,
      builderSha256: manifest.builderSha256, diagnosticControlsSha256: manifest.diagnosticControlsSha256,
      observerTemplateSha256: manifest.observerTemplateSha256, facadeTemplateSha256: manifest.facadeTemplateSha256, fixtureSha256: manifest.fixtureSha256,
      originalCandidateSha256: manifest.original.bundleHashes.candidate,
      originalBaselineSha256: manifest.original.bundleHashes.baseline, originalSourceManifestSha256: manifest.original.sourceManifestSha256,
      originalBuildEvidenceSha256: manifest.original.buildEvidenceSha256, sourceFiles: Object.keys(manifest.trialSourceBindings).length,
      candidateSourceSnapshotSha256: sha(JSON.stringify(manifest.original.candidateSourceBindings)),
      trialSourceSnapshotSha256: sha(JSON.stringify(manifest.trialSourceBindings)), sourceManifest: relative(manifestPath),
      sourceManifestSha256: sha(await fs.readFile(manifestPath)), exactSourceDifferences: manifest.exactDifferences.map(file => ({ file,
        candidateSha256: manifest.original.candidateSourceBindings[file] ?? null, trialSha256: manifest.trialSourceBindings[file] })),
      normalSourceUnchanged: true, originalPairSourceAndBundlesUnchanged: true, fullSourceBuildNotGeneratedPatch: true,
      postBuildSourceAndBundleReadback: true, precedingTrialSourceAndBundlesUnchanged: manifest.priorTrialBindings,
      diagnosticLabel: 'CPU/page-only · frozen · synthetic', protocolVariant: 'candidate',
      measurementWindow: { startDelayMs: 1000, durationLimitMs: 45000, sampleLimit: 2048 }, productCadenceUnchanged: true,
      diagnosticAutoExport: { playCaseSelection: 'arm-next-accepted-actual-product-Play-without-timer-or-autoplay',
        wallDelayFromActualProductPlayMs: 15000, snapshotReason: 'manual', expectedActiveMsWithoutSchedulingDelay: 14000,
        stopsProductPlayback: false, retriesReuseExactPayload: true },
      diagnosticTermination: { wallDelayFromActualProductPlayMs: 20000, callback: 'latest-ref-original-pauseSkyTime',
        guard: 'current-owner-no-date-picker-still-playing-same-runStartAt', canceledOnHideUnmountNewCase: true,
        classification: 'bounded-test-termination-not-product-cadence-policy' },
      gpuCommandPolicy: 'original-until-first-ready-full-copy-then-scene-facade-without-GL-commands-or-validation-read',
      nativeCopyPolicy: 'first-successfully-published-ready-full-copy-freezes-recurring-copy-captions-and-reticle',
      publicationPolicy: 'real-attempt.publish-every-completed-frame-no-r17Probe.accepted-for-synthetic-frames',
      remainingNativeBoundaries: ['original-2D-canvas-native-RAF-clock', 'real-caption-measureText-and-associated-2D-save-font-restore',
        'original-image-loader-asynchronous-lifetimes', 'initial-native-Scene-and-renderer-disposal'],
      confounds: ['facade-removes-GPU-renderer-CPU-staging-arrays-and-texture-bookkeeping-with-GL',
        'synthetic-image-readiness-and-positive-contribution-values-run-success-paths-but-do-not-establish-pixels-or-source-credit',
        'frozen-context-health-does-not-detect-native-context-loss-through-gl.isContextLost'],
      observationPolicy: { pageOwner: 'captured-Taro-Current.page-raw-instance-only-no-custom-wrapper-or-other-page',
        reset: 'accepted-normal-Play-start-preserves-inherited-pending-and-late-callbacks',
        payload: 'own-key-count-every-call-UTF8-JSON-size-only-first16-no-payload-retention',
        upload: 'actual-submit-after-original-bufferData-return-data.length-times4-no-additional-arrays',
        debug: 'getAppBaseInfo-enableDebug-boolean-or-UNKNOWN-only-no-setting-change',
        display: 'header-snapshot-on-open-export-status-pins-15second-scalars-no-per-frame-React' },
      originClass: 'authorized-physical-LAN-development-bridge-8795', scopeBehaviorChecks: behavior,
      result: { ...manifest.result, packages: budget.packages, staticChecks: inspection.checks },
      limitations: ['Frozen synthetic CPU/page isolation diagnostic only, not an adopted repair or target acceptance.',
        'Only the captured raw native Page setData is observed; custom-wrapper updates and native presentation are outside this scope.',
        'Original Scene source, full star inputs, astronomy, constellations, name projection/measurements, real React/Taro publication and native RAF remain.',
        'After first ready full copy no recurring GPU rendering, display copy, captions or reticle painting; renderer staging arrays are also removed.',
        'Synthetic frames intentionally omit r17Probe.accepted; zero accepted copies/times does not mean no CPU Scene or publication.',
        'Do not Apply, pick, inspect Sources, or use the frozen build for product behavior or performance acceptance.',
        'Actual accepted Play starts measurement; 15 wall seconds gives nominally14 active seconds/manual with original45000ms limit.',
        'Export stops measurement only; a separate20-second bounded termination invokes latest guarded original normal Pause for the same run.',
        'Callback latency is submission-to-callback wall time, not calibrated native render or physical presentation duration.',
        'failed counts original invocation throws; failedBeforeCallback releases pending when it throws before callback. Synchronous callback throw counts completed and failed.',
        'pending tracks callback-bearing calls; callbackMissing preserves original missing-callback arguments and acknowledgement remains unobserved.',
        'First16 JSON samples add bounded diagnostic work. Raw strings never leave memory. UTF8 sampled traffic is not retained heap.',
        'Returned bufferData counters do not prove GL success, GPU completion, all texture/TWGL traffic or physical memory.',
        'Fixture and static checks are not target bridge, memory, workload, pixel or R17 acceptance evidence.',
        'No phone, feedback entry, DevTools, service, DB, remote object, production source or previous trial was changed.',
        'Receipts retain candidate variant; bind exact bundle and device generation externally.'] };
    await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, postBuildSourceAndBundleReadback: true, sourceFiles: evidence.sourceFiles,
      exactSourceDifferences: evidence.exactSourceDifferences, scopeBehaviorChecks: behavior, ...evidence.result }));
  }
}
