/** One task-only build. Re-entry refuses an existing build intent/output. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { fingerprintBundle, inspectReleaseBundleBudget, verifyCompiledOrigin } from '../../../../tools/miniapp/release-bundle-artifact.mjs';
import { inspectCandidate } from '../../../../tools/miniapp/inspect-production.mjs';
import { assertPhysicalDeviceBundleSafe } from '../../../../tools/miniapp/device-feedback-snapshot.mjs';
import { injectF04NativeRecovery } from './inject-f04-native-recovery.mjs';

const root = await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..'));
const attempt = process.argv[2] ?? 'initial';
if (!['initial', 'cache-observation', 'canonical-path', 'resource-retirement', 'resource-retirement-slot', 'resource-retirement-fix'].includes(attempt)) throw Error('f04_unknown_attempt');
const resourceObservation = attempt.startsWith('resource-retirement');
const resourceRepair = attempt === 'resource-retirement-fix';
const stage = path.resolve(root, '.codex/work-items/sky-map-performance-2026-10-18/tmp',
  resourceRepair ? 'f04-resource-retirement-fix-20261030' : resourceObservation ? 'f04-resource-retirement-20261030' : 'f04-native-recovery-20261030');
const source = path.join(stage, 'source');
const privateRoot = `E:/Dev/Starward-data/development/d1-d2-targeted-20261030/${resourceRepair ? 'f04-resource-retirement-fix' : resourceObservation ? 'f04-resource-retirement' : 'f04-preparation'}`;
const project = path.join(privateRoot, 'source-project');
const slot = resourceRepair ? 'f04-resource-fix-20261030' : resourceObservation ? 'f04-resource-20261030' : attempt === 'initial' ? 'f04-native-recovery-20261030'
  : attempt === 'cache-observation' ? 'f04-recovery-20261030-cache' : 'f04-recovery-20261030-path';
const app = path.join(source, 'apps/wechat-miniapp');
const bundle = path.join(app, `dist/weapp-check-${slot}`);
const operationPath = path.join(stage, 'operation.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (attempt === 'resource-retirement' || resourceRepair) {
  // New task-only observation, not a rebuild or mutation of frozen fd17/effa.
  // Reuse the complete current ordinary build's declared input ownership.
  const baselinePath = 'E:/Dev/Starward-data/development/d1-d2-targeted-20261030/sky-time-compact/operation.json';
  const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  try { await fs.lstat(stage); throw Error('f04_resource_stage_already_exists_inspect_before_retry'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await fs.lstat(privateRoot); throw Error('f04_resource_private_root_already_exists_inspect_before_retry'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const inputFiles = Object.keys(baseline.sourceBindings).sort();
  if (inputFiles.length !== 1679) throw Error('f04_resource_input_membership_changed');
  const sourceBindings = {};
  for (const file of inputFiles) {
    if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('f04_resource_input_path_invalid');
    sourceBindings[file] = sha(await fs.readFile(path.join(root, file)));
    if (!resourceRepair && sourceBindings[file] !== baseline.sourceBindings[file]) throw Error(`f04_resource_ordinary_source_drift:${file}`);
  }
  const ordinaryCandidate = await fingerprintBundle(baseline.bundle);
  if (ordinaryCandidate.sha256 !== 'effa83c72d72d83270bb4454756193b8c6aed641912d7b3740c73db7b5e7bf0e')
    throw Error('f04_resource_ordinary_bundle_drift');
  const frozen = await fingerprintBundle('E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-preparation/source-project/weapp');
  if (frozen.sha256 !== 'fd17ed2b27a2e160d354126238b1058db65a8f05078e9262005d190cc90a4205') throw Error('f04_frozen_bundle_drift');
  const protectedCandidates = [
    { bundle: baseline.bundle, sha256: ordinaryCandidate.sha256 },
    { bundle: 'E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-preparation/source-project/weapp', sha256: frozen.sha256 },
  ];
  if (resourceRepair) {
    const previous = JSON.parse(await fs.readFile('E:/Dev/Starward-data/development/d1-d2-targeted-20261030/f04-resource-retirement/f04-candidate.json', 'utf8'));
    protectedCandidates.push({ bundle: previous.bundle, sha256: previous.bundleSha256 },
      { bundle: path.join(previous.project, 'weapp'), sha256: previous.preparedProject?.sha256 ?? previous.bundleSha256 });
    for (const candidate of protectedCandidates)
      if ((await fingerprintBundle(candidate.bundle)).sha256 !== candidate.sha256) throw Error('f04_protected_candidate_changed');
  }
  await fs.mkdir(stage, { recursive: true }); await fs.mkdir(privateRoot);
  const preparation = { scope: resourceRepair ? 'TASK_ONLY_F04_RESOURCE_RETIREMENT_REPAIR_USER_OPERATED' : 'TASK_ONLY_F04_RESOURCE_RETIREMENT_USER_OPERATED', createdAt: new Date().toISOString(),
    status: 'PREPARING_SOURCE', sourceSha256: sha(JSON.stringify(sourceBindings)), sourceBindings, apiOrigin: baseline.apiOrigin,
    ordinaryCandidate: { bundle: baseline.bundle, sha256: ordinaryCandidate.sha256 }, frozenCandidateSha256: frozen.sha256,
    protectedCandidates, changedFromOrdinary: inputFiles.filter(file => sourceBindings[file] !== baseline.sourceBindings[file]),
    rootInputSent: false, userOperation: 'PENDING', sourceInputMembership: baselinePath };
  await fs.writeFile(operationPath, JSON.stringify(preparation, null, 2) + '\n', { flag: 'wx' });
  for (const file of inputFiles) {
    await fs.mkdir(path.dirname(path.join(source, file)), { recursive: true });
    await fs.copyFile(path.join(root, file), path.join(source, file), fs.constants.COPYFILE_EXCL);
  }
  for (const relative of ['node_modules', 'apps/wechat-miniapp/node_modules'])
    await fs.symlink(await fs.realpath(path.join(root, relative)), path.join(source, relative), 'junction');
  await injectF04NativeRecovery(source, { sourceSha256: preparation.sourceSha256, resourceObservation: true, write: true });
  preparation.status = 'SOURCE_PREPARED';
  await fs.writeFile(operationPath, JSON.stringify(preparation, null, 2) + '\n');
}
const operation = JSON.parse(await fs.readFile(operationPath, 'utf8'));
if (attempt === 'resource-retirement-slot') {
  const failedLog = await fs.readFile(path.join(stage, 'build-resource-retirement.log'), 'utf8');
  if (operation.status !== 'BUILD_OR_PREPARATION_FAILED' || operation.error !== 'f04_build_failed'
    || operation.activeCommand?.terminal !== true || operation.activeCommand.exitCode === 0
    || !failedLog.includes('miniapp_isolated_check_slot_invalid')) throw Error('f04_resource_slot_recovery_not_qualified');
}
const injected = JSON.parse(await fs.readFile(path.join(source, 'f04-native-recovery-source.json'), 'utf8'));
if (injected.sourceSha256 !== operation.sourceSha256) throw Error('f04_source_binding_mismatch');
const stagedHashes = { ...operation.sourceBindings };
for (const entry of injected.files) stagedHashes[entry.file] = entry.afterSha256;
const save = async () => fs.writeFile(operationPath, `${JSON.stringify(operation, null, 2)}\n`);
const verifySources = async () => {
  for (const [file, expected] of Object.entries(operation.sourceBindings))
    if (sha(await fs.readFile(path.join(root, file))) !== expected) throw Error(`f04_current_source_changed:${file}`);
  for (const [file, expected] of Object.entries(stagedHashes))
    if (sha(await fs.readFile(path.join(source, file))) !== expected) throw Error(`f04_staged_source_changed:${file}`);
  for (const candidate of operation.protectedCandidates ?? [])
    if ((await fingerprintBundle(candidate.bundle)).sha256 !== candidate.sha256) throw Error('f04_protected_candidate_changed');
};
const absent = async value => {
  try { await fs.lstat(value); throw Error(`f04_output_exists:${value}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
};
await verifySources();
await absent(bundle); await absent(project);
const ordinaryRoot = operation.ordinaryCandidate.bundle ?? path.join(root, 'apps/wechat-miniapp/dist/weapp-check-d2-frame-owner-20261030');
const ordinary = await fingerprintBundle(ordinaryRoot);
if (ordinary.sha256 !== operation.ordinaryCandidate.sha256) throw Error('f04_ordinary_candidate_changed');
await fs.writeFile(path.join(stage, `build-intent-${attempt}.json`), JSON.stringify({
  scope: operation.scope, startedAt: new Date().toISOString(), launcherPid: process.pid,
  sourceSha256: operation.sourceSha256, slot, bundle, project, injected,
}, null, 2) + '\n', { flag: 'wx' });
operation.status = 'TASK_TRANSFORM_VERIFIED_BUILD_STARTING';
operation.repositorySourceUnmodified = true;
operation.stagedSourceTransformed = true;
operation.injectedManifest = path.join(source, 'f04-native-recovery-source.json');
await save();
const env = { ...process.env, MINIAPP_ISOLATED_CHECK_BUILD: '1', MINIAPP_ISOLATED_CHECK_BUILD_SLOT: slot,
  MINIAPP_API_BASE: operation.apiOrigin, MINIAPP_SKY_RESOURCE_BASE: operation.apiOrigin };
for (const key of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE', 'MINIAPP_ISOLATED_FIXTURE_BUILD', 'MINIAPP_ACCEPTANCE_DIAGNOSTICS',
  'MINIAPP_DEVICE_REQUEST_DIAGNOSTICS', 'MINIAPP_OPERATOR_PREVIEW_TOKEN', 'MINIAPP_RELEASE_BUNDLE_ID', 'MINIAPP_SKY_FEEDBACK_ID']) delete env[key];
if (attempt === 'cache-observation') {
  if (env.NODE_OPTIONS) throw Error('f04_unexpected_existing_node_options');
  env.NODE_OPTIONS = `--require=${path.join(stage, 'observe-loader.cjs')}`;
}
async function run(label, args) {
  operation.status = label.toUpperCase();
  operation.activeCommand = { label, startedAt: new Date().toISOString() };
  await save();
  let child;
  const completion = new Promise((resolve, reject) => {
    child = execFile(process.execPath, args, { cwd: app, env, windowsHide: true, maxBuffer: 30 * 1024 * 1024 },
      async (error, stdout, stderr) => {
        try {
          await fs.writeFile(path.join(stage, `${label}-${attempt}.log`), stdout + '\n' + stderr);
          operation.activeCommand = { ...operation.activeCommand, terminal: true, endedAt: new Date().toISOString(), exitCode: error?.code ?? 0 };
          await save();
          if (error) reject(Error(`f04_${label}_failed`)); else resolve();
        } catch (failure) { reject(failure); }
      });
  });
  operation.activeCommand.pid = child.pid; await save();
  await completion;
  console.log(JSON.stringify({ phase: label, terminal: true, exitCode: 0 }));
}
try {
  if (attempt === 'initial' || attempt === 'resource-retirement' || resourceRepair) await run('typecheck', [path.join(root, 'tools/run-node.cjs'), path.join(app, 'node_modules/typescript/lib/tsc.js'), '--noEmit', '-p', path.join(app, 'tsconfig.json')]);
  await run('build', [path.join(root, 'tools/run-node.cjs'), '--bin', '@tarojs/cli', 'taro', 'build', '--type', 'weapp']);
  await verifySources();
  await assertPhysicalDeviceBundleSafe(bundle);
  const fingerprint = await fingerprintBundle(bundle);
  const budget = await inspectReleaseBundleBudget(fingerprint, bundle);
  const inspection = await inspectCandidate({ bundleDirectory: path.relative(root, bundle).replaceAll('\\', '/') });
  if (Object.values(inspection.checks).some(value => value !== true)) throw Error('f04_static_checks_failed');
  const config = JSON.parse(await fs.readFile(path.join(app, 'project.config.json'), 'utf8'));
  const origin = await verifyCompiledOrigin({ lane: 'development', apiOrigin: operation.apiOrigin,
    skyResourceOrigin: operation.apiOrigin, appId: config.appid }, fingerprint, bundle);
  if ((await fingerprintBundle(ordinaryRoot)).sha256 !== ordinary.sha256) throw Error('f04_ordinary_output_changed');
  await fs.mkdir(project);
  config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot;
  config.projectname = resourceRepair ? 'starward-f04-resource-fix-20261030' : resourceObservation ? 'starward-f04-resource-retirement-20261030' : 'starward-f04-native-recovery-20261030';
  if (config.setting) delete config.setting.useCompilerPlugins;
  await fs.writeFile(path.join(project, 'project.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
  await fs.cp(bundle, path.join(project, 'weapp'), { recursive: true, errorOnExist: true, force: false });
  if ((await fingerprintBundle(path.join(project, 'weapp'))).sha256 !== fingerprint.sha256) throw Error('f04_project_copy_changed');
  const result = { scope: 'TASK_ONLY_NOT_FORMAL_ACCEPTANCE', createdAt: new Date().toISOString(),
    sourceSha256: operation.sourceSha256, sourceCount: Object.keys(operation.sourceBindings).length,
    injected, bundle, project, bundleSha256: fingerprint.sha256, files: fingerprint.fileCount,
    totalBytes: fingerprint.totalBytes, budget, staticChecks: inspection.checks, origin,
    ordinaryCandidateUnchanged: ordinary.sha256, resourceObservation, rootInputSent: false, deviceVerification: 'PENDING_USER',
  };
  await fs.writeFile(path.join(privateRoot, 'f04-candidate.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  operation.status = 'CANDIDATE_PREPARED_PENDING_USER_CONNECTION';
  operation.result = result; operation.completedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ status: operation.status, project, bundleSha256: result.bundleSha256,
    files: result.files, totalBytes: result.totalBytes, packages: budget.packages, checksPassed: Object.keys(inspection.checks).length }));
} catch (error) {
  operation.status = 'BUILD_OR_PREPARATION_FAILED'; operation.error = String(error?.message ?? error); await save();
  throw error;
}
