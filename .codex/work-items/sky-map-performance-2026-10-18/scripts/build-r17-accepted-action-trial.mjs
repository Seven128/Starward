// Task-only finite accepted-action comparison, using only the admitted gen22 parent.
// Complete source builds; no generated-JS patching, service or device operations.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url)), work = path.resolve(here, '..'), root = path.resolve(work, '../../..');
const parentRoot = path.join(work, 'tmp/r17-cpu-text-metrics-trial'), trialRoot = path.join(work, 'tmp/r17-accepted-action-trial');
const feature = 'apps/wechat-miniapp/src/features/sky/', pagePath = feature + 'spot-sky-page.tsx';
const controlsPath = feature + 'r17-phone-probe-controls.tsx', runtimePath = feature + 'r17-phone-probe-runtime.ts';
const helperPath = feature + 'r17-accepted-action.ts';
const scope = 'TASK_ONLY_ACCEPTED_ACTION_FROZEN_SYNTHETIC_NOT_PRODUCT_ACCEPTANCE';
const modes = ['accepted-action-direct', 'accepted-action-closure'];
const parentExpected = {
  manifestSha256: '8c0a1a0fb006da9bb9b953d83c9e4eaf6d40efaed544f6cea6817e0f0c5fd639',
  sourceSnapshotSha256: '4b700a7a83e0b49154cc56f59680718e013d819e500196eab496c506688b28c4',
  bundleSha256: 'da4eedbb6cf06bd895c53bd06b6f414c021e1ab4f8df4840533927cebc48b842',
};
const sha = value => createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(root, value).replaceAll('\\', '/');
const json = file => fs.readFile(file, 'utf8').then(JSON.parse), run = promisify(execFile);
const scriptPath = fileURLToPath(import.meta.url), require = createRequire(import.meta.url);
const ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));
const { fingerprintBundle, inspectReleaseBundleBudget } = await import(pathToFileURL(path.join(root, 'tools/miniapp/release-bundle-artifact.mjs')));
const { inspectCandidate } = await import(pathToFileURL(path.join(root, 'tools/miniapp/inspect-production.mjs')));
const { assertPhysicalDeviceBundleSafe } = await import(pathToFileURL(path.join(root, 'tools/miniapp/device-feedback-snapshot.mjs')));

function replaceOne(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('source_boundary_changed:' + label);
  return source.replace(before, after);
}
export function acceptedHelper(source, mode) {
  if (!modes.includes(mode)) throw Error('finite_mode_required');
  return source.replaceAll('__ACCEPTED_ACTION_MODE__', mode)
    .replaceAll('__ACCEPTED_ACTION_VALUE__', mode === 'accepted-action-direct' ? 'next' : '() => next');
}
export function acceptedPage(source) {
  source = replaceOne(source, 'import { r17Probe } from "./r17-phone-probe-runtime";',
    'import { r17Probe } from "./r17-phone-probe-runtime";\nimport { r17AcceptedActionSetter } from "./r17-accepted-action";', 'accepted_import');
  source = replaceOne(source, '  const setPresentedSkyFrame = skyCommandStateSetter(presentedSkyFrameRef, setPresentedSkyFrameState);',
    '  const setPresentedSkyFrame = r17AcceptedActionSetter(presentedSkyFrameRef, setPresentedSkyFrameState);', 'accepted_adapter_only');
  source = replaceOne(source, '      return hipsTiles===frame.hipsTiles?frame:{...frame,hipsTiles};',
    '      if (hipsTiles===frame.hipsTiles) return frame;\n      const resolved = {...frame,hipsTiles};\n      r17Probe.inheritFrame(resolved, frame);\n      return resolved;', 'explicit_resolved_frame_identity');
  const before = '  const timePresentation = useMemo(() => presentSkyTime(rawReportData, requestedAt, timeModel, timeGeometrySources) ??\n' +
    '    presentSkyTime(rawReportData, committedAt), [rawReportData, requestedAt, committedAt, timeModel, timeGeometrySources]);';
  const after = '  const r17TimePreparation = useMemo(() => {\n' +
    '    const intentSequence = timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt\n' +
    '      ? r17Probe.intentSequence(timeIntent) : null;\n' +
    '    const token = r17Probe.prepareStarted(intentSequence, "presentation");\n' +
    '    let completed = false;\n' +
    '    try {\n' +
    '      const presentation = presentSkyTime(rawReportData, requestedAt, timeModel, timeGeometrySources) ??\n' +
    '        presentSkyTime(rawReportData, committedAt);\n' +
    '      const requested = presentation?.row.at === requestedAt;\n' +
    '      completed = true;\n' +
    '      return { presentation, token: requested ? token : null, intentSequence: requested ? intentSequence : null };\n' +
    '    } finally { r17Probe.prepareFinished(token, completed); }\n' +
    '  }, [rawReportData, requestedAt, committedAt, timeModel, timeGeometrySources]);\n' +
    '  const timePresentation = r17TimePreparation.presentation;';
  source = replaceOne(source, before, after, 'presentation_memo_same_dependencies_and_result');
  source = replaceOne(source, '    canvasLifecycle.request({ nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,',
    '    const r17PreparedRequest: SkyCanvasFrame = { nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,', 'complete_frame_identity');
  source = replaceOne(source, '      sceneReady, owner, inspection: canvasFrameInfo.inspection },\n' +
    '      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode, continuation);',
    '      sceneReady, owner, inspection: canvasFrameInfo.inspection };\n' +
    '    r17Probe.request(r17PreparedRequest, r17TimePreparation.token, r17TimePreparation.intentSequence);\n' +
    '    canvasLifecycle.request(r17PreparedRequest,\n' +
    '      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode, continuation);', 'explicit_preparation_request_identity');
  return replaceOne(source, '      if (!attempt.synthetic) r17Probe.accepted(frame,paintedSkyObjectsRef.current);',
    '      if (!attempt.synthetic) r17Probe.accepted(frame,paintedSkyObjectsRef.current);\n      else r17Probe.syntheticAccepted(frame);', 'synthetic_not_real_accepted');
}
async function absent(file) {
  try { await fs.lstat(file); throw Error('output_already_exists:' + relative(file)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
async function assertScope() {
  const expected = path.join(await fs.realpath(work), 'tmp');
  if ((await fs.realpath(path.dirname(trialRoot))).toLowerCase() !== expected.toLowerCase()) throw Error('trial_scope_mismatch');
}
async function verifyBindings(directory, bindings) {
  for (const [file, expected] of Object.entries(bindings)) {
    if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('source_path_invalid');
    if (sha(await fs.readFile(path.join(directory, file))) !== expected) throw Error('source_readback_mismatch:' + file);
  }
}
async function admitParent() {
  const bytes = await fs.readFile(path.join(parentRoot, 'manifest.json')), parent = JSON.parse(bytes);
  const proofBytes = await fs.readFile(path.join(work, 'R17-CPU-TEXT-METRICS-TRIAL.json')), proof = JSON.parse(proofBytes);
  if (sha(bytes) !== parentExpected.manifestSha256 || sha(JSON.stringify(parent.trialSourceBindings)) !== parentExpected.sourceSnapshotSha256 ||
      parent.result?.bundleSha256 !== parentExpected.bundleSha256 || proof.sourceManifestSha256 !== sha(bytes) ||
      proof.result?.bundleSha256 !== parentExpected.bundleSha256 || proof.status !== 'BUILD_READY_CPU_TEXT_METRICS_FROZEN_SYNTHETIC_PHONE_UNVERIFIED') throw Error('gen22_parent_not_admitted');
  if (path.resolve(root, parent.sourceDirectory) !== path.join(parentRoot, 'source')) throw Error('parent_source_scope_mismatch');
  await verifyBindings(path.join(parentRoot, 'source'), parent.trialSourceBindings);
  const normalSourceBindings = {};
  for (const file of Object.keys(parent.trialSourceBindings)) {
    try { normalSourceBindings[file] = sha(await fs.readFile(path.join(root, file))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const bundleReadback = {};
  for (const folder of [parent.result.bundleDirectory, parent.result.projectDirectory + '/weapp']) {
    const absolute = path.resolve(root, folder);
    if (!absolute.startsWith(parentRoot + path.sep)) throw Error('parent_bundle_scope_mismatch');
    const fingerprint = await fingerprintBundle(absolute);
    if (fingerprint.sha256 !== parentExpected.bundleSha256) throw Error('gen22_parent_bundle_changed');
    bundleReadback[folder] = fingerprint.sha256;
  }
  return { admittedAt: new Date().toISOString(), manifestSha256: sha(bytes), evidenceSha256: sha(proofBytes),
    sourceSnapshotSha256: sha(JSON.stringify(parent.trialSourceBindings)), sourceFiles: Object.keys(parent.trialSourceBindings).length,
    bundleSha256: parent.result.bundleSha256, bundleReadback, sourceDirectory: parent.sourceDirectory,
    sourceBindings: parent.trialSourceBindings, normalSourceBindings,
    inheritedValidChecks: proof.checks, inheritedHistoryEvidence: proof.precedingTrialSourceAndBothBundleCopiesUnchanged };
}
async function templates() {
  const files = ['r17-accepted-action.ts', 'r17-accepted-action-controls.tsx', 'r17-accepted-action-fixture.mjs',
    'r17-phone-probe-v2-runtime.ts', 'r17-phone-probe-v2-protocol.mjs', 'r17-phone-probe-v2.test.mjs', 'r17-phone-probe-protocol.mjs'];
  return Object.fromEntries(await Promise.all(files.map(async name => [name, await fs.readFile(path.join(here, name), 'utf8')])));
}
function materialize(template, mode, buildGeneration, buildSourceSha256) {
  return template.replaceAll('__R17_BUILD_GENERATION__', String(buildGeneration)).replaceAll('__R17_BUILD_SOURCE_BINDING__', buildSourceSha256);
}
async function preparedSources(parent, templates, mode, buildGeneration, buildSourceSha256) {
  const output = {};
  for (const file of Object.keys(parent.sourceBindings)) {
    const original = await fs.readFile(path.join(root, parent.sourceDirectory, file));
    output[file] = file === pagePath ? acceptedPage(original.toString('utf8')) :
      file === controlsPath ? materialize(templates['r17-accepted-action-controls.tsx'], mode, buildGeneration, buildSourceSha256) :
      file === runtimePath ? templates['r17-phone-probe-v2-runtime.ts'].replaceAll('__VARIANT__', 'candidate') : original;
  }
  output[helperPath] = acceptedHelper(templates['r17-accepted-action.ts'], mode);
  return output;
}
async function verifyCurrent(manifest, template) {
  if (manifest.scope !== scope || manifest.builderSha256 !== sha(await fs.readFile(scriptPath)) ||
      JSON.stringify(manifest.templateBindings) !== JSON.stringify(Object.fromEntries(Object.entries(template).map(([key, value]) => [key, sha(value)])))) throw Error('builder_or_templates_changed');
  const sourceRoot = path.join(root, manifest.sourceDirectory);
  await verifyBindings(sourceRoot, manifest.sourceBindings);
  // Parent admission is reused; only its current manifest bytes are checked here.
  if (sha(await fs.readFile(path.join(parentRoot, 'manifest.json'))) !== manifest.parent.manifestSha256) throw Error('parent_manifest_changed_after_admission');
  const expected = {
    [pagePath]: acceptedPage(await fs.readFile(path.join(root, manifest.parent.sourceDirectory, pagePath), 'utf8')),
    [controlsPath]: materialize(template['r17-accepted-action-controls.tsx'], manifest.mode, manifest.buildGeneration, manifest.buildSourceSha256),
    [runtimePath]: template['r17-phone-probe-v2-runtime.ts'].replaceAll('__VARIANT__', 'candidate'),
    [helperPath]: acceptedHelper(template['r17-accepted-action.ts'], manifest.mode),
  };
  const differences = Object.keys(manifest.sourceBindings).filter(file => manifest.sourceBindings[file] !== manifest.parent.sourceBindings[file]);
  if (differences.sort().join('|') !== [pagePath, controlsPath, runtimePath, helperPath].sort().join('|') ||
      Object.keys(manifest.sourceBindings).length !== manifest.parent.sourceFiles + 1) throw Error('unexpected_source_delta');
  for (const [file, bytes] of Object.entries(expected)) if (sha(bytes) !== manifest.sourceBindings[file]) throw Error('current_source_patch_mismatch:' + file);
  for (const link of ['node_modules', 'apps/wechat-miniapp/node_modules']) {
    if (!(await fs.lstat(path.join(sourceRoot, link))).isSymbolicLink() ||
        (await fs.realpath(path.join(sourceRoot, link))).toLowerCase() !== (await fs.realpath(path.join(parentRoot, 'source', link))).toLowerCase()) throw Error('dependency_link_changed');
  }
  // An unchanged current source/template binding reuses its focused fixture
  // result rather than executing it again for each build/readback operation.
  if (manifest.checks) return manifest.checks;
  const { verifyAcceptedActionFixture } = await import(pathToFileURL(path.join(here, 'r17-accepted-action-fixture.mjs')));
  return verifyAcceptedActionFixture({ sourceRoot, feature, ts, mode: manifest.mode, buildGeneration: manifest.buildGeneration,
    parentSourceRoot: path.join(root, manifest.parent.sourceDirectory), helperTemplate: template['r17-accepted-action.ts'], acceptedHelper });
}
async function reuseOrigin(parent) {
  const parentManifest = await json(path.join(parentRoot, 'manifest.json'));
  if (parentManifest.result.bundleSha256 !== parent.bundleSha256) throw Error('parent_bundle_owner_changed');
  const folder = path.join(root, parentManifest.result.bundleDirectory), found = new Set();
  async function walk(directory) {
    for (const row of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, row.name);
      if (row.isDirectory()) await walk(file);
      else if (row.isFile() && row.name.endsWith('.js')) {
        for (const value of (await fs.readFile(file, 'utf8')).matchAll(/http:\/\/(?:\d{1,3}\.){3}\d{1,3}:8795\b/g)) found.add(value[0]);
      }
    }
  }
  await walk(folder);
  if (found.size !== 1) throw Error('single_parent_compiled_bridge_origin_required');
  return [...found][0];
}
async function compiledOriginReadback(directory, expected) {
  let literalUses = 0, filesWithOrigin = 0;
  const found = new Set();
  async function walk(folder) {
    for (const row of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, row.name);
      if (row.isDirectory()) await walk(file);
      else if (row.isFile() && row.name.endsWith('.js')) {
        let uses = 0;
        for (const value of (await fs.readFile(file, 'utf8')).matchAll(/http:\/\/(?:\d{1,3}\.){3}\d{1,3}:(?:8795|8797)\b/g)) {
          found.add(value[0]); literalUses++; uses++;
        }
        if (uses) filesWithOrigin++;
      }
    }
  }
  await walk(directory);
  if (found.size !== 1 || !found.has(expected)) throw Error('compiled_origin_not_exact_selected_local_bridge');
  return { originSha256: sha(expected), literalUses, filesWithOrigin, otherTrialBridgeOrigins: 0 };
}
async function deltaTypecheck(manifest) {
  const diagnostics = directory => {
    const configPath = path.join(directory, 'apps/wechat-miniapp/tsconfig.json');
    const source = ts.readConfigFile(configPath, ts.sys.readFile);
    if (source.error) throw Error('typecheck_config_unreadable');
    const parsed = ts.parseJsonConfigFileContent(source.config, ts.sys, path.dirname(configPath));
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    return ts.getPreEmitDiagnostics(program).map(value => ({ code: value.code,
      file: value.file ? path.relative(directory, value.file.fileName).replaceAll('\\', '/') : null,
      message: ts.flattenDiagnosticMessageText(value.messageText, '\n').replaceAll(directory, '<source>')
        .replaceAll(directory.replaceAll('\\', '/'), '<source>') }));
  };
  const parent = diagnostics(path.join(root, manifest.parent.sourceDirectory)), current = diagnostics(path.join(root, manifest.sourceDirectory));
  const available = new Map();
  for (const value of parent) { const key = JSON.stringify(value); available.set(key, (available.get(key) ?? 0) + 1); }
  const added = [];
  for (const value of current) { const key = JSON.stringify(value), left = available.get(key) ?? 0; if (left) available.set(key, left - 1); else added.push(value); }
  const result = { parentDiagnostics: parent.length, currentDiagnostics: current.length, addedDiagnostics: added, noAddedDiagnostics: added.length === 0,
    comparison: 'same-relative-file-code-message-multiset-line-independent-source-root-normalized' };
  await fs.writeFile(path.join(root, manifest.trialDirectory, 'delta-typecheck.json'), JSON.stringify(result, null, 2) + '\n');
  if (added.length) throw Error('delta_typecheck_failed_see_task_json');
  return result;
}
async function main() {
  const operation = process.argv[2] ?? 'prepare', mode = process.argv[3] ?? 'accepted-action-direct';
  if (!['prepare', 'build', 'inspect', 'typecheck'].includes(operation) || !modes.includes(mode)) throw Error('use_prepare_build_inspect_typecheck_and_finite_mode');
  const buildGeneration = Number(process.argv[4] ?? 23);
  if (!Number.isSafeInteger(buildGeneration) || buildGeneration < 23 || buildGeneration > 9999) throw Error('generation_invalid');
  const bridgePort = Number(process.argv[5] ?? 8795);
  if (![8795, 8797].includes(bridgePort)) throw Error('finite_local_recovery_bridge_port_required');
  await assertScope();
  const selectedRoot = path.join(trialRoot, mode + (bridgePort === 8797 ? '-origin-8797' : ''));
  const sourceRoot = path.join(selectedRoot, 'source'), projectRoot = path.join(selectedRoot, 'project');
  const manifestPath = path.join(selectedRoot, 'manifest.json'), template = await templates();
  const slot = (mode === 'accepted-action-direct' ? 'r17-accepted-direct' : 'r17-accepted-closure') + (bridgePort === 8797 ? '-8797' : '');
  const bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot);
  if (operation === 'prepare') {
    await absent(selectedRoot);
    let parent;
    const admissionPath = path.join(trialRoot, 'parent-admission.json');
    try { parent = await json(admissionPath); if (parent.manifestSha256 !== parentExpected.manifestSha256) throw Error('admission_identity_changed'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; parent = await admitParent(); }
    const builderSha256 = sha(await fs.readFile(scriptPath)), templateBindings = Object.fromEntries(Object.entries(template).map(([name, value]) => [name, sha(value)]));
    const bindingInput = { meaning: 'pre-build-parent-and-delta-template-binding-not-bundle-bytes', parent: {
      manifestSha256: parent.manifestSha256, sourceSnapshotSha256: parent.sourceSnapshotSha256, bundleSha256: parent.bundleSha256 },
      mode, buildGeneration, bridgePort, builderSha256, templateBindings };
    const buildSourceSha256 = sha(JSON.stringify(bindingInput));
    const contents = await preparedSources(parent, template, mode, buildGeneration, buildSourceSha256);
    await fs.mkdir(selectedRoot, { recursive: true });
    try { await fs.writeFile(admissionPath, JSON.stringify(parent, null, 2) + '\n', { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const manifest = { scope, createdAt: new Date().toISOString(), mode, buildGeneration, bridgePort, trialDirectory: relative(selectedRoot),
      sourceDirectory: relative(sourceRoot), builderSha256, templateBindings, bindingInput, buildSourceSha256, parent, sourceBindings: {}, result: null };
    for (const [file, bytes] of Object.entries(contents)) {
      const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, bytes, { flag: 'wx' }); manifest.sourceBindings[file] = sha(bytes);
    }
    for (const link of ['node_modules', 'apps/wechat-miniapp/node_modules'])
      await fs.symlink(await fs.realpath(path.join(parentRoot, 'source', link)), path.join(sourceRoot, link), 'junction');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    manifest.checks = await verifyCurrent(manifest, template);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ prepared: true, mode, buildGeneration, bridgePort, sourceFiles: Object.keys(manifest.sourceBindings).length, checks: manifest.checks }));
    return;
  }
  const manifest = await json(manifestPath);
  if (manifest.mode !== mode || manifest.buildGeneration !== buildGeneration || manifest.bridgePort !== bridgePort) throw Error('run_locked_binding_mismatch');
  const checks = await verifyCurrent(manifest, template);
  if (operation === 'typecheck') { console.log(JSON.stringify(await deltaTypecheck(manifest))); return; }
  if (operation === 'build') {
    await absent(bundleRoot); await absent(projectRoot); if (manifest.result) throw Error('trial_already_built');
    manifest.deltaTypecheck = await deltaTypecheck(manifest);
    const inheritedOrigin = await reuseOrigin(manifest.parent), origin = inheritedOrigin.replace(/:8795$/, ':' + bridgePort);
    const env = { ...process.env, MINIAPP_ISOLATED_CHECK_BUILD: '1', MINIAPP_ISOLATED_CHECK_BUILD_SLOT: slot,
      MINIAPP_API_BASE: origin, MINIAPP_SKY_RESOURCE_BASE: origin };
    for (const name of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE', 'MINIAPP_ISOLATED_FIXTURE_BUILD', 'MINIAPP_ACCEPTANCE_DIAGNOSTICS', 'MINIAPP_DEVICE_REQUEST_DIAGNOSTICS',
      'MINIAPP_OPERATOR_PREVIEW_TOKEN', 'MINIAPP_RELEASE_BUNDLE_ID', 'MINIAPP_SKY_FEEDBACK_ID']) delete env[name];
    const redact = value => String(value ?? '').replaceAll(origin, '[same-physical-local-bridge-' + bridgePort + ']');
    try {
      const build = await run(process.execPath, [path.join(root, 'tools/run-node.cjs'), '--bin', '@tarojs/cli', 'taro', 'build', '--type', 'weapp'],
        { cwd: path.join(sourceRoot, 'apps/wechat-miniapp'), env, windowsHide: true, maxBuffer: 30 * 1024 * 1024 });
      await fs.writeFile(path.join(selectedRoot, 'build-redacted.log'), redact(build.stdout) + '\n' + redact(build.stderr));
    } catch (error) { await fs.writeFile(path.join(selectedRoot, 'build-redacted.log'), redact(error.stdout) + '\n' + redact(error.stderr)); throw Error('full_source_build_failed_see_task_log'); }
    await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const originReadback = await compiledOriginReadback(bundleRoot, origin);
    const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
    await fs.mkdir(projectRoot);
    const config = await json(path.join(sourceRoot, 'apps/wechat-miniapp/project.config.json'));
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot; config.projectname = 'starward-r17-' + mode + '-frozen-synthetic-' + bridgePort;
    if (config.setting) delete config.setting.useCompilerPlugins;
    await fs.writeFile(path.join(projectRoot, 'project.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
    await fs.cp(bundleRoot, path.join(projectRoot, 'weapp'), { recursive: true, errorOnExist: true, force: false });
    if ((await fingerprintBundle(path.join(projectRoot, 'weapp'))).sha256 !== fingerprint.sha256) throw Error('project_bundle_copy_mismatch');
    manifest.result = { bundleDirectory: relative(bundleRoot), projectDirectory: relative(projectRoot), bundleSha256: fingerprint.sha256,
      fileCount: fingerprint.fileCount, totalBytes: fingerprint.totalBytes, packages: budget.packages,
      mainHeadroomBytes: budget.limits.perPackageBytes - budget.packages.main.bytes, staticChecks: inspection.checks,
      compiledBridgeOriginSha256: sha(origin), inheritedAddressOriginSha256: sha(inheritedOrigin), bridgePort, originReadback };
    manifest.checks = checks;
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, mode, buildGeneration, bridgePort, ...manifest.result }));
    return;
  }
  if (!manifest.result) throw Error('full_source_build_required');
  await assertPhysicalDeviceBundleSafe(bundleRoot);
  const readback = {};
  for (const folder of [bundleRoot, path.join(projectRoot, 'weapp')]) {
    const fingerprint = await fingerprintBundle(folder);
    if (fingerprint.sha256 !== manifest.result.bundleSha256) throw Error('bundle_readback_mismatch');
    readback[relative(folder)] = fingerprint.sha256;
  }
  const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
  if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
  if (manifest.parent.normalSourceBindings) await verifyBindings(root, manifest.parent.normalSourceBindings);
  const inheritedPreparation = bridgePort === 8797 ? await json(path.join(trialRoot, 'inherited-8795-preparation-evidence.json')) : null;
  const evidence = { scope, status: 'BUILD_READY_ACCEPTED_ACTION_PHONE_UNVERIFIED', mode, buildGeneration, bridgePort,
    selection: { state: bridgePort === 8797 ? 'READY_FOR_ROOT_SELECTION' : 'UNSELECTED_PREPARATION', bridgePort },
    previousPrepared: inheritedPreparation ? { role: 'UNSELECTED_PREPARATION', bridgePort: 8795,
      evidence: relative(path.join(trialRoot, 'inherited-8795-preparation-evidence.json')),
      sourceManifest: inheritedPreparation.sourceManifest, sourceManifestSha256: inheritedPreparation.sourceManifestSha256,
      sourceSnapshotSha256: inheritedPreparation.sourceSnapshotSha256, result: inheritedPreparation.result,
      archivedBuilder: relative(path.join(trialRoot, 'inherited-8795-builder.mjs.snapshot')) } : null,
    builderSha256: manifest.builderSha256,
    templateBindings: manifest.templateBindings, sourceManifest: relative(manifestPath), sourceManifestSha256: sha(await fs.readFile(manifestPath)),
    sourceFiles: Object.keys(manifest.sourceBindings).length, sourceSnapshotSha256: sha(JSON.stringify(manifest.sourceBindings)),
    buildSourceSha256: manifest.buildSourceSha256, buildSourceBindingMeaning: manifest.bindingInput.meaning,
    parent: { manifestSha256: manifest.parent.manifestSha256, evidenceSha256: manifest.parent.evidenceSha256,
      sourceSnapshotSha256: manifest.parent.sourceSnapshotSha256, bundleSha256: manifest.parent.bundleSha256,
      admittedAt: manifest.parent.admittedAt, currentSourceAndBothBundleCopiesReadOnce: true,
      inheritedChecks: manifest.parent.inheritedValidChecks, historyEvidenceReusedWithoutSiblingTraversal: true },
    exactSourceDifferencesFromParent: [pagePath, controlsPath, runtimePath, helperPath].map(file => ({ file,
      parentSha256: manifest.parent.sourceBindings[file] ?? null, currentSha256: manifest.sourceBindings[file] })),
    completeSourceBuildNotGeneratedPatch: true, currentSourceReadback: true, bothBundleCopiesReadback: readback,
    productionSourceReadback: { files: Object.keys(manifest.parent.normalSourceBindings).length,
      bindingsSha256: sha(JSON.stringify(manifest.parent.normalSourceBindings)), unchanged: true }, checks,
    deltaTypecheck: manifest.deltaTypecheck, result: { ...manifest.result, staticChecks: inspection.checks },
    limitations: ['Task-only finite action-shape comparison; no product repair, phone result or R17 acceptance.',
      'The complete accepted record remains in React state/queue. Only direct object|null versus closure-returning-the-same-value changes.',
      'Frozen CPU/text-cache/synthetic background remains. Synthetic publication is not a native accepted copy.',
      'Preparation association spans only actual timePresentation memo execution, with original dependencies and exact public-state identity; other CPU stages remain separate.',
      'The15s metrics receipt and20s guarded Pause terminal sidecar are separate same-run observations.',
      'No phone, DevTools, feedback, service, production source, prior trial, PLAN, HANDOFF, INDEX or commit is changed by this builder.'] };
  await fs.writeFile(path.join(work, 'R17-ACCEPTED-ACTION-TRIAL.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ inspected: true, mode, buildGeneration, bridgePort, sourceSnapshotSha256: evidence.sourceSnapshotSha256,
    sourceManifestSha256: evidence.sourceManifestSha256, checks, deltaTypecheck: evidence.deltaTypecheck, ...evidence.result }));
}
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === scriptPath.toLowerCase()) await main();
