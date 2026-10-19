// One task-only Canvas compositing trial, copied from the admitted 45-second
// candidate. Never changes normal source, the original pair or a phone wrapper.
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
const trialRoot = path.join(work, 'tmp/r17-canvas-copy-trial');
const sourceRoot = path.join(trialRoot, 'source');
const projectRoot = path.join(trialRoot, 'project');
const feature = 'apps/wechat-miniapp/src/features/sky/';
const surfacePath = feature + 'sky-canvas-surface.ts';
const controlsPath = feature + 'r17-phone-probe-controls.tsx';
const runtimePath = feature + 'r17-phone-probe-runtime.ts';
const slot = 'r17-canvas-copy-trial';
const bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot);
const manifestPath = path.join(trialRoot, 'manifest.json');
const evidencePath = path.join(work, 'R17-CANVAS-COPY-TRIAL.json');
const mode = process.argv[2] ?? 'prepare';
const run = promisify(execFile), require = createRequire(import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(root, value).replaceAll('\\', '/');
const read = file => fs.readFile(path.join(root, file));
const json = file => fs.readFile(file, 'utf8').then(JSON.parse);
const scope = 'TASK_ONLY_CANVAS_COPY_BUILD_READY_NOT_TARGET_ACCEPTANCE';
const scriptPath = fileURLToPath(import.meta.url);
const absent = async target => {
  try { await fs.lstat(target); throw Error('trial_output_already_exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
};
if (!['prepare', 'build', 'inspect'].includes(mode)) throw Error('use_prepare_build_or_inspect');
if (trialRoot !== path.join(work, 'tmp', 'r17-canvas-copy-trial')) throw Error('trial_scope_required');
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
  source = replaceOne(source, '    globalAlpha: number;', '    globalAlpha: number;\n    globalCompositeOperation: string;', 'display_port');
  return replaceOne(source, '        context.drawImage(ownedNode, 0, 0, width, height);',
    '        context.save();\n        try {\n          context.globalCompositeOperation = "copy";\n          context.drawImage(ownedNode, 0, 0, width, height);\n        } finally { context.restore(); }', 'completed_frame_copy');
}
const trialControls = source => replaceOne(source, 'R17 candidate ·', 'R17 candidate/canvas-copy ·', 'diagnostic_label');

// Bounded owner fixture: scope/restoration and failure ordering only. It proves
// neither native pixel equivalence nor a retained-memory improvement.
async function verifyCopyScope() {
  const source = await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const events = [], stack = [];
  let failCopy = false, widthWrites = 0, allocations = 0, nodeWidth = 0, nodeHeight = 0;
  const context = {
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    save() { stack.push([this.globalCompositeOperation, this.globalAlpha]); events.push('save'); },
    restore() { [this.globalCompositeOperation, this.globalAlpha] = stack.pop(); events.push('restore:' + this.globalCompositeOperation); },
    drawImage(source, x, y, width, height) {
      assert.equal(this.globalCompositeOperation, 'copy'); assert.strictEqual(source, node);
      assert.deepEqual([x, y, width, height], [0, 0, 780, 1688]); events.push('copy:copy');
      if (failCopy) throw Error('trial_copy_failed');
    },
    scale() {}, measureText() { return { width: 12 }; },
    fillText() { assert.equal(this.globalCompositeOperation, 'source-over'); events.push('caption:source-over'); },
  };
  const fakeRequire = name => {
    if (name === './sky-selection-reticle') return {
      createSkySelectionLayer() { throw Error('unexpected_selection_layer'); },
      paintSkySelectionReticle(value) { assert.strictEqual(value, context); assert.equal(value.globalCompositeOperation, 'source-over'); events.push('reticle:source-over'); },
    };
    if (name === '../../services/runtime-error') return { reportRuntimeError() { throw Error('unexpected_runtime_error'); } };
    throw Error('unexpected_fixture_import');
  };
  vm.runInNewContext('(function(exports,require,module){' + compiled + '\n})', { console })(module.exports, fakeRequire, module);
  const gl = { isContextLost: () => false, flush: () => events.push('flush'), getExtension: () => null };
  const node = { get width() { return nodeWidth; }, set width(value) { nodeWidth = value; widthWrites++; },
    get height() { return nodeHeight; }, set height(value) { nodeHeight = value; widthWrites++; },
    getContext: () => gl, createImage() { throw Error('unexpected_frame_image_allocation'); } };
  const display = { width: 0, height: 0, getContext: () => context };
  const surface = module.exports.createSkyCanvasSurface(display, { width: 390, height: 844 }, 2,
    () => { allocations++; return node; });
  const initialWrites = widthWrites;
  surface.present({ x: 10, y: 20, radiusPx: 12, shape: 'cross', color: '#fff' },
    [{ text: 'Name', x: 30, y: 40, opacity: 1, letterSpacing: 0 }]);
  assert.deepEqual(events, ['flush', 'save', 'copy:copy', 'restore:source-over', 'save', 'caption:source-over', 'restore:source-over', 'reticle:source-over']);
  for (let frame = 0; frame < 20; frame++) surface.present();
  assert.equal(widthWrites, initialWrites); assert.equal(allocations, 1); assert.equal(stack.length, 0);
  failCopy = true; events.length = 0;
  assert.throws(() => surface.present({ x: 10, y: 20 }, [{ text: 'Name' }]), /trial_copy_failed/u);
  assert.deepEqual(events, ['flush', 'save', 'copy:copy', 'restore:source-over']);
  assert.equal(context.globalCompositeOperation, 'source-over'); assert.equal(stack.length, 0);
  surface.dispose();
  return { scopedCopy: true, captionAndReticleSourceOver: true, nativeFailureRestores: true,
    noPerPresentCanvasAllocationOrResize: true, fixtureOnlyNotNativePixelsOrMemory: true };
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
  if (manifest.scope !== scope || manifest.builderSha256 !== sha(await fs.readFile(scriptPath))) throw Error('trial_owner_or_builder_changed');
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
  if (differences.length !== 2 || !differences.includes(surfacePath) || !differences.includes(controlsPath)) throw Error('trial_source_parity_mismatch');
  if (await fs.readFile(path.join(sourceRoot, surfacePath), 'utf8') !== trialSurface(await fs.readFile(path.join(original.candidateDirectory, surfacePath), 'utf8')) ||
    await fs.readFile(path.join(sourceRoot, controlsPath), 'utf8') !== trialControls(await fs.readFile(path.join(original.candidateDirectory, controlsPath), 'utf8')))
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
    sourceDirectory: relative(sourceRoot), original: { sourceManifestSha256: original.sourceManifestSha256,
      buildEvidenceSha256: original.buildEvidenceSha256, bundleHashes: original.bundleHashes,
      allSourceBindingsSha256: sha(JSON.stringify(original.sourceHashes)), candidateSourceBindings: original.sourceHashes.candidate },
    normalSourceBindings, trialSourceBindings: {}, exactDifferences: [surfacePath, controlsPath], result: null };
  // Persist provenance before copying or changing any generated source.
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  for (const file of Object.keys(original.sourceHashes.candidate)) {
    const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true });
    const bytes = await fs.readFile(path.join(original.candidateDirectory, file));
    const copied = file === surfacePath ? trialSurface(bytes.toString('utf8')) : file === controlsPath ? trialControls(bytes.toString('utf8')) : bytes;
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
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot; config.projectname = 'starward-r17-canvas-copy-trial';
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
    const evidence = { scope, status: 'BUILD_READY_TARGET_NATIVE_PIXELS_AND_MEMORY_UNVERIFIED', head: manifest.head,
      builderSha256: manifest.builderSha256, originalCandidateSha256: manifest.original.bundleHashes.candidate,
      originalBaselineSha256: manifest.original.bundleHashes.baseline, originalSourceManifestSha256: manifest.original.sourceManifestSha256,
      originalBuildEvidenceSha256: manifest.original.buildEvidenceSha256, sourceFiles: Object.keys(manifest.trialSourceBindings).length,
      candidateSourceSnapshotSha256: sha(JSON.stringify(manifest.original.candidateSourceBindings)),
      trialSourceSnapshotSha256: sha(JSON.stringify(manifest.trialSourceBindings)), sourceManifest: relative(manifestPath),
      sourceManifestSha256: sha(await fs.readFile(manifestPath)), exactSourceDifferences: manifest.exactDifferences.map(file => ({ file,
        candidateSha256: manifest.original.candidateSourceBindings[file], trialSha256: manifest.trialSourceBindings[file] })),
      normalSourceUnchanged: true, originalPairSourceAndBundlesUnchanged: true, fullSourceBuildNotGeneratedPatch: true,
      postBuildSourceAndBundleReadback: true, diagnosticLabel: 'candidate/canvas-copy', protocolVariant: 'candidate',
      measurementWindow: { startDelayMs: 1000, durationLimitMs: 45000, sampleLimit: 2048 }, productPlaybackUnchanged: true,
      originClass: 'authorized-physical-LAN-development-bridge-8795', scopeBehaviorChecks: behavior,
      result: { ...manifest.result, packages: budget.packages, staticChecks: inspection.checks },
      mechanismReferences: ['https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.canvas.d.ts', 'https://www.w3.org/2015/06/2dcontext.html'],
      limitations: ['Canvas copy support and standard replacement semantics do not prove current WeChat native pixels, retained-memory behavior or runtime correctness.',
        'Only the full-frame drawImage is wrapped in save/copy/finally-restore. Caption/reticle operations follow in the original source-over state.',
        'No phone, feedback entry, DevTools, service, database, production source or original paired staging was changed by this builder.',
        'The 45-second probe stops measurement only; target playback must continue for the parent-owned 120-second observation.',
        'Probe receipts retain variant=candidate; bind each receipt to this exact trial bundle and its device generation externally.'] };
    await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, postBuildSourceAndBundleReadback: true, sourceFiles: evidence.sourceFiles,
      exactSourceDifferences: evidence.exactSourceDifferences, scopeBehaviorChecks: behavior, ...evidence.result }));
  }
}
