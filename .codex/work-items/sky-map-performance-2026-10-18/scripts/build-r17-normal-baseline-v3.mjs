// TASK ONLY: current production source -> complete normal Sky v3 build.
// No historical candidate chain, service, port operation, DevTools or device.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { addR17ACorrelation } from './r17-a-correlation-instrumentation.mjs';
import { addR25MemoryLifetime } from './r25-memory-lifetime-instrumentation.mjs';
import { addR25StellarOwnerObservation } from './r25-stellar-owner-instrumentation.mjs';
import { addR26AggregateUse } from './r26-aggregate-use-instrumentation.mjs';
import { addR26MemoryOwnerLinks } from './r26-memory-owner-instrumentation.mjs';
import { addR27QueryCallbackSources, addR27QueryCallbackAdapter } from './r27-query-callback-instrumentation.mjs';
import { addR17RulerEntry } from './r17-ruler-entry-instrumentation.mjs';
import { addR17RulerEntryV2 } from './r17-ruler-entry-v2-instrumentation.mjs';
import { addR17NormalInput, addR17GeometryStages, addR19DrawReasons, addR20DrawCosts } from './r17-normal-input-instrumentation.mjs';
import { addR28FirstAcceptedCosts } from './r28-first-accepted-instrumentation.mjs';
import { addD2DecodeCheckpoint } from './d2-decode-checkpoint-instrumentation.mjs';
import { terrainWaitSourceFiles, transformTerrainWaitSources } from './inject-terrain-wait-observer.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), work = path.resolve(here, '..'), root = path.resolve(here, '../../../..');
const revisionArgs = process.argv.slice(3), d2GpuResources = revisionArgs.includes('--d2-gpu-resources');
const d2TimeObservation = revisionArgs.includes('--d2-time-observation');
const d1TerrainWait = revisionArgs.includes('--d1-terrain-wait');
const d2Current = d2GpuResources || revisionArgs.includes('--d2-current');
const observationA1 = !d2Current && !d2TimeObservation && !d1TerrainWait && revisionArgs.includes('--observe-a1');
const usbReverse = revisionArgs.includes('--usb-reverse');
const currentUi = d2Current || d2TimeObservation || d1TerrainWait || revisionArgs.includes('--current-ui');
const skyPackage = revisionArgs.includes('--r27-sky-package');
const firstAcceptedCosts = revisionArgs.includes('--first-accepted-costs');
const skyOnly = skyPackage || firstAcceptedCosts || d2Current || d2TimeObservation;
const reviewFlags = Array.from({ length: 26 }, (_, index) => `--review-r${index + 2}`);
const selectedReviews = revisionArgs.filter(value => reviewFlags.includes(value));
const reviewRevision = d2Current ? 25 : selectedReviews.length ? Number(selectedReviews[0].slice('--review-r'.length)) : 1;
const rulerEntry = !d2Current && reviewRevision >= 5, nativeAdmission = !d2Current && reviewRevision >= 6, retirementReceipt = d2Current || reviewRevision >= 9;
const geometryStages = d2TimeObservation || !d2Current && reviewRevision >= 17, nativeRegion = reviewRevision >= 14 && !skyOnly;
const terrainWait = d1TerrainWait || observationA1 && !skyOnly;
const drawReasons = !d2Current && reviewRevision >= 19;
const drawCosts = !d2Current && reviewRevision >= 20;
const memoryLifetime = reviewRevision >= 24 && !firstAcceptedCosts;
const memoryCheckpoints = reviewRevision >= 25 && !firstAcceptedCosts;
const memoryOwnerLinks = reviewRevision >= 26 && !firstAcceptedCosts;
const queryCallbackLinks = reviewRevision >= 27 && !firstAcceptedCosts;
const normalPlayTrialMs = d2Current || d2TimeObservation || d1TerrainWait ? null : memoryCheckpoints ? 20000 : retirementReceipt ? 60000 : 20000;
const probeVersion = d1TerrainWait ? 'terrain-wait-v3' : d2TimeObservation ? 'd2-time-observation-v1' : d2GpuResources ? 'd2-gpu-resources-v1' : d2Current ? 'd2-decode-v1' : 3;
if (d2Current || d2TimeObservation || d1TerrainWait ? revisionArgs.length !== 1 : revisionArgs.some(value => ![...reviewFlags, '--observe-a1', '--usb-reverse', '--current-ui', '--r27-sky-package', '--first-accepted-costs'].includes(value)) || new Set(revisionArgs).size !== revisionArgs.length ||
    selectedReviews.length > 1 || reviewRevision >= 3 && !observationA1 || reviewRevision >= 14 && !usbReverse ||
    currentUi && (reviewRevision !== 27 || !observationA1 || !usbReverse) ||
    skyPackage && (!currentUi || reviewRevision !== 27 || !observationA1 || !usbReverse) ||
    firstAcceptedCosts && (!currentUi || reviewRevision !== 27 || !observationA1 || !usbReverse || skyPackage))
  throw Error('finite_normal_revision_required');
const reviewSuffix = reviewRevision > 1 ? '-review-r' + reviewRevision : '';
const trialName = d1TerrainWait ? 'r17-d1-terrain-wait-20261029' : d2TimeObservation ? 'r17-d2-time-observation-20261029' : d2GpuResources ? 'r17-d2-gpu-resources-20261029' : d2Current ? 'r17-d2-current' : (observationA1 ? 'r17-normal-a1' : 'r17-normal-baseline-v3') + reviewSuffix + (usbReverse ? '-usb' : '') + (firstAcceptedCosts ? '-first-accepted-costs' : skyPackage ? '-sky-package' : currentUi ? '-current-ui' : '');
const trial = path.join(work, 'tmp/' + trialName), sourceRoot = path.join(trial, 'source'), projectRoot = path.join(trial, 'project');
const feature = 'apps/wechat-miniapp/src/features/sky/', pagePath = feature + 'spot-sky-page.tsx';
const slot = d1TerrainWait ? 'd1-terrain-wait-20261029' : d2TimeObservation ? 'd2-time-observation-20261029' : d2GpuResources ? 'd2-gpu-resources-20261029' : d2Current ? 'd2-current-20261028' : firstAcceptedCosts ? 'r17-a1-first-accepted-usb' : skyPackage ? 'r17-a1-r27-sky-usb' : currentUi ? 'r17-a1-r27-ui-usb' : observationA1 ? trialName : reviewRevision === 2 ? 'r17-normal-v3-r2' : trialName;
const buildGeneration = d1TerrainWait ? 38 : d2TimeObservation ? 37 : d2GpuResources ? 36 : d2Current ? 35 : firstAcceptedCosts ? 34 : skyPackage ? 33 : currentUi ? 32 : observationA1 ? (queryCallbackLinks ? 31 : memoryOwnerLinks ? 30 : memoryCheckpoints ? 29 : memoryLifetime ? 28 : 27) : 25;
const explicitBridgePort = d1TerrainWait ? process.env.STARWARD_D1_TERRAIN_BRIDGE_PORT : process.env.STARWARD_D2_TIME_BRIDGE_PORT;
const bridgePort = d1TerrainWait || d2TimeObservation ? (explicitBridgePort ? Number(explicitBridgePort) : null) : 8798;
const normalLabel = d1TerrainWait ? '当前地形输入与覆盖' : d2TimeObservation ? '当前Sky 时间输入与呈现' : d2GpuResources ? '当前Sky GPU资源逻辑账' : d2Current ? '当前Sky 解码逻辑账' : (observationA1 ? '正常Sky关联 A1' + (firstAcceptedCosts ? ' 首响应成本' : reviewRevision > 1 ? ' r' + reviewRevision : '') : '正常Sky基线 v3') + (usbReverse ? ' USB' : '') + (currentUi ? ' 当前UI' : '');
const protocolName = d1TerrainWait ? 'terrain-wait-protocol.mjs' : d2TimeObservation ? 'd2-time-observation-protocol.mjs' : nativeAdmission ? 'r17-normal-input-protocol.mjs' : rulerEntry ? 'r17-ruler-entry-protocol.mjs' : observationA1 ? 'r17-a-correlation-protocol.mjs' : 'r17-phone-probe-v3-protocol.mjs';
const preparationName = d1TerrainWait ? 'TERRAIN-WAIT-PREPARATION-20261029.json' : d2TimeObservation ? 'D2-TIME-OBSERVATION-PREPARATION.json' : d2GpuResources ? 'D2-GPU-RESOURCE-PREPARATION.json' : d2Current ? 'D2-CURRENT-RESOURCES-PREPARATION.json' : observationA1 ? 'R17-NORMAL-A1-PREPARATION.json' : 'R17-NORMAL-BASELINE-V3-PREPARATION.json';
const bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot), manifestPath = path.join(trial, 'manifest.json');
const scope = d1TerrainWait ? 'TASK_ONLY_D1_CURRENT_TERRAIN_WAIT_NOT_PRODUCT_ACCEPTANCE' : d2TimeObservation ? 'TASK_ONLY_D2_CURRENT_TIME_CHAIN_NOT_PRODUCT_ACCEPTANCE' : d2GpuResources ? 'TASK_ONLY_D2_CURRENT_GPU_RESOURCE_RECEIPT_NOT_PRODUCT_ACCEPTANCE' : d2Current ? 'TASK_ONLY_D2_CURRENT_DECODE_CHECKPOINTS_NOT_PRODUCT_ACCEPTANCE' : firstAcceptedCosts ? 'TASK_ONLY_NORMAL_SKY_A1_FIRST_ACCEPTED_COSTS_NOT_PRODUCT_ACCEPTANCE' : skyPackage ? 'TASK_ONLY_NORMAL_SKY_A1_R27_SKY_PACKAGE_NOT_PRODUCT_ACCEPTANCE' : observationA1 ? 'TASK_ONLY_NORMAL_SKY_A1_TERRAIN_WAIT_NOT_PRODUCT_ACCEPTANCE' : 'TASK_ONLY_NORMAL_SKY_BASELINE_V3_NOT_PRODUCT_ACCEPTANCE';
export function describeNormalPreparationProfile() {
  return { d2Current, d2GpuResources, d2TimeObservation, d1TerrainWait, trialName, slot, buildGeneration, scope, observationA1, currentUi, usbReverse,
    terrainWait, nativeRegion, memoryLifetime, memoryCheckpoints, memoryOwnerLinks, queryCallbackLinks,
    firstAcceptedCosts, geometryStages, normalPlayTrialMs };
}
const sha = value => createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(root, value).replaceAll('\\', '/');
const historicalOwnerArchive = reviewRevision === 10
  ? 'E:/Dev/Starward-data/verification/sky-map-20261018/normal-existing-resume-20261019/r9-before-r10-20261019/owner-manifest.private.json'
  : relative(path.join(work, `tmp/r17-normal-a1-owner-before-review-r${reviewRevision}-20261019/archive-bindings.json`));
const readJson = file => fs.readFile(file, 'utf8').then(JSON.parse), run = promisify(execFile);
const require = createRequire(import.meta.url), ts = require(path.join(root, 'apps/wechat-miniapp/node_modules/typescript'));
const { fingerprintBundle, inspectReleaseBundleBudget } = await import(pathToFileURL(path.join(root, 'tools/miniapp/release-bundle-artifact.mjs')));
const { inspectCandidate } = await import(pathToFileURL(path.join(root, 'tools/miniapp/inspect-production.mjs')));
const { assertPhysicalDeviceBundleSafe } = await import(pathToFileURL(path.join(root, 'tools/miniapp/device-feedback-snapshot.mjs')));
const sourceLocations = ['apps/wechat-miniapp/src', 'apps/wechat-miniapp/config', 'apps/wechat-miniapp/runtime-assets',
  'apps/wechat-miniapp/THIRD_PARTY_NOTICES', 'packages/miniapp-contracts/src', 'packages/coordinate-system/src', 'packages/astronomy-core/src'];
const sourceFiles = ['package.json', 'package-lock.json', 'apps/wechat-miniapp/package.json', 'apps/wechat-miniapp/babel.config.cjs',
  'apps/wechat-miniapp/tsconfig.json', 'apps/wechat-miniapp/project.config.json', 'apps/wechat-miniapp/sitemap.json',
  'packages/miniapp-contracts/package.json', 'packages/coordinate-system/package.json', 'packages/astronomy-core/package.json',
  'tools/miniapp/release-bundle-location.cjs', 'tools/miniapp/release-bundle-location.d.cts',
  'workers/miniapp-api/src/sao-catalog-source.ts', 'workers/miniapp-api/src/terrain-request.ts', 'workers/miniapp-api/src/terrain-publication.ts',
  ...['synthetic-optical-png.ts', 'sdss-science-publication.ts', 'sdss-display-publication.ts', 'prepared-optical-publication.ts'].map(name => 'workers/miniapp-api/src/test-fixtures/' + name)];
const templateNames = d1TerrainWait ? ['inject-terrain-wait-observer.mjs', 'terrain-wait-observer.ts',
  'terrain-wait-marker.tsx', 'terrain-wait-observer.test.mjs', 'terrain-wait-protocol.mjs', 'terrain-wait-collector.mjs'] : d2TimeObservation ? ['d2-time-observation.ts', 'd2-time-observation-controls.tsx',
  'd2-time-observation-instrumentation.mjs', 'd2-time-observation-protocol.mjs', 'd2-time-observation.test.mjs',
  'r17-phone-probe-v3-runtime.ts', 'r17-geometry-stage-runtime.ts', 'r17-ruler-entry-runtime.ts',
  'r17-phone-probe-v3-protocol.mjs', 'r17-phone-probe-v2-protocol.mjs', 'r17-phone-probe-protocol.mjs',
  'r17-normal-input-protocol.mjs', 'r17-ruler-entry-protocol.mjs', 'r17-a-correlation-protocol.mjs', 'r28-first-accepted-protocol.mjs',
  'r17-phone-probe-collector.mjs', 'r17-phone-probe-http.mjs',
  'r25-memory-lifetime-protocol.mjs', 'r25-memory-checkpoint-protocol.mjs', 'd2-decode-checkpoint-protocol.mjs',
  'r26-memory-checkpoint-protocol.mjs', 'r27-memory-checkpoint-protocol.mjs'] : d2Current ? ['d2-decode-observation.ts', 'd2-decode-checkpoint-instrumentation.mjs',
  'd2-decode-checkpoint-protocol.mjs', 'd2-decode-checkpoint.test.mjs', 'd2-current-preparation.test.mjs',
  'd2-normal-lifecycle-controls.tsx', 'd2-normal-lifecycle.ts', 'd2-normal-lifecycle-instrumentation.mjs', 'd2-normal-lifecycle.test.mjs',
  'r17-normal-observations.ts', 'r25-memory-lifetime-observer.ts', 'r25-memory-lifetime-adapter.ts',
  'r17-ruler-entry-runtime.ts',
  'r25-stellar-owner-observer.ts', 'r25-memory-lifetime-protocol.mjs', 'r25-memory-checkpoint-protocol.mjs',
  'r17-phone-probe-collector.mjs', 'r26-memory-checkpoint-protocol.mjs', 'r27-memory-checkpoint-protocol.mjs',
  'r17-normal-input-protocol.mjs', 'r17-ruler-entry-protocol.mjs', 'r17-a-correlation-protocol.mjs',
  'r17-phone-probe-v3-protocol.mjs', 'r17-phone-probe-v2-protocol.mjs', 'r17-phone-probe-protocol.mjs',
  'r28-first-accepted-protocol.mjs', 'memory-checkpoint-test-support.mjs'] : ['r17-phone-probe-v3-runtime.ts', 'r17-phone-probe-v3-protocol.mjs', 'r17-phone-probe-v3.test.mjs',
  'r17-phone-probe-v2-protocol.mjs', 'r17-phone-probe-protocol.mjs', 'r17-accepted-action-controls.tsx',
  'r17-page-bridge-observer.ts', 'r17-normal-observations.ts', 'r17-normal-baseline-v3-fixture.mjs'];
if (observationA1) templateNames.push('r17-a-correlation-runtime.ts', 'r17-a-correlation-instrumentation.mjs',
  'r17-a-correlation-protocol.mjs', 'r17-a-correlation.test.mjs');
if (d2GpuResources) templateNames.push('d2-gpu-resource-instrumentation.mjs', 'd2-gpu-resource-instrumentation.test.mjs',
  'd2-gpu-resource-receipt.ts', 'd2-gpu-lifecycle-instrumentation.mjs', 'd2-gpu-lifecycle.test.mjs');
if (terrainWait && !d1TerrainWait) templateNames.push('inject-terrain-wait-observer.mjs',
  'terrain-wait-observer.ts', 'terrain-wait-marker.tsx', 'terrain-wait-observer.test.mjs');
if (rulerEntry) templateNames.push('r17-ruler-entry-runtime.ts', 'r17-ruler-entry-instrumentation.mjs',
  'r17-ruler-entry-protocol.mjs', 'r17-ruler-entry.test.mjs');
if (nativeAdmission) templateNames.push('r17-ruler-entry-v2-instrumentation.mjs', 'r17-normal-input-instrumentation.mjs',
  'r17-normal-input-protocol.mjs', 'r17-normal-input.test.mjs');
if (geometryStages && !d2TimeObservation) templateNames.push('r17-geometry-stage-runtime.ts');
if (memoryLifetime && !d2Current) templateNames.push('r25-memory-lifetime-observer.ts', 'r25-memory-lifetime-adapter.ts',
  'r25-memory-lifetime-protocol.mjs', 'r25-memory-lifetime-instrumentation.mjs', 'r25-memory-lifetime.test.mjs',
  'r25-memory-lifetime-adapter.test.mjs');
if (memoryCheckpoints && !d2Current) templateNames.push('r25-stellar-owner-observer.ts', 'r25-stellar-owner-instrumentation.mjs',
  'r25-stellar-owner.test.mjs', 'r25-memory-checkpoint-protocol.mjs', 'r25-memory-checkpoint.test.mjs');
if (memoryOwnerLinks) templateNames.push('r26-fiber-owner-observer.ts', 'r26-fiber-owner.test.mjs',
  'r26-aggregate-use-observer.ts', 'r26-aggregate-use-instrumentation.mjs', 'r26-aggregate-use.test.mjs',
  'r26-memory-owner-links.ts', 'r26-memory-owner-instrumentation.mjs', 'r26-memory-checkpoint-protocol.mjs',
  'r26-memory-checkpoint.test.mjs', 'memory-checkpoint-test-support.mjs');
if (queryCallbackLinks) templateNames.push('r27-query-callback-observer.ts', 'r27-query-callback-observer.test.mjs',
  'r27-query-callback-links.ts', 'r27-query-callback-instrumentation.mjs', 'r27-memory-checkpoint-protocol.mjs', 'r27-memory-checkpoint.test.mjs');
if (skyPackage) templateNames.push('r27-query-callback-ports.ts');
if (firstAcceptedCosts) templateNames.push('r28-first-accepted-costs.ts', 'r28-first-accepted-costs.test.mjs',
  'r28-first-accepted-instrumentation.mjs', 'r28-first-accepted-protocol.mjs', 'r28-first-accepted-protocol.test.mjs',
  'r28-first-accepted-integration.test.mjs');
if (nativeRegion) templateNames.push('../tmp/r17-native-region-probe.ts',
  '../tmp/r17-native-region-probe-adapter.ts', '../tmp/r17-native-region-probe-instrumentation.mjs',
  '../tmp/r17-native-region-probe-protocol.mjs', '../tmp/r17-native-region-probe.test.mjs',
  'r17-phone-probe-collector.mjs');
async function list(directory) {
  const files = [];
  for (const row of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, row.name);
    if (row.isDirectory()) files.push(...await list(file));
    else if (row.isFile()) files.push(file);
    else throw Error('unexpected_source_link');
  }
  return files.sort();
}
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('source_boundary_changed:' + label);
  return source.replace(before, after);
}
function wrapNamed(source, name, stage, after = '') {
  const ast = ts.createSourceFile('probe.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const nodes = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name && node.body);
  if (nodes.length !== 1) throw Error('function_boundary_changed:' + name);
  const start = nodes[0].body.getStart(ast), end = nodes[0].body.getEnd();
  return source.slice(0, start + 1) + '\n return r17Probe.measure("' + stage + '",()=>{' + source.slice(start + 1, end - 1) + '\n }' + after + ');\n' + source.slice(end - 1);
}
function wrapCalls(source, predicate, format, label) {
  const ast = ts.createSourceFile('probe.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), edits = [];
  const visit = node => { if (ts.isCallExpression(node) && predicate(node.expression.getText(ast))) edits.push({ start: node.getStart(ast), end: node.getEnd() }); ts.forEachChild(node, visit); }; visit(ast);
  if (!edits.length) throw Error('call_boundary_changed:' + label);
  for (const item of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, item.start) + format(source.slice(item.start, item.end)) + source.slice(item.end);
  return { source, count: edits.length };
}
async function templates() { return Object.fromEntries(await Promise.all(templateNames.map(async name => [name, await fs.readFile(path.join(here, name), 'utf8')]))); }
export function controls(source, binding, observeRetirement = retirementReceipt) {
  source = one(source, 'import { r17CpuPageOnlyStats } from "./r17-cpu-page-only";\nimport { r17CpuTextMetricsStats, r17ResetCpuTextMetricsObservation } from "./r17-cpu-text-metrics";\nimport { R17_ACCEPTED_ACTION_LABEL as label, R17_ACCEPTED_ACTION_MODE } from "./r17-accepted-action";',
    'import { r17NormalTextStats, r17NormalSceneStats, r17ResetNormalObservation } from "./r17-normal-observations";\nconst label = "' + normalLabel + '";\nconst R17_NORMAL_MODE = "normal";', 'normal_only_imports');
  source = source.replaceAll('R17_ACCEPTED_ACTION_MODE', 'R17_NORMAL_MODE').replaceAll('r17CpuTextMetricsStats', 'r17NormalTextStats')
    .replaceAll('r17CpuPageOnlyStats', 'r17NormalSceneStats').replaceAll('r17ResetCpuTextMetricsObservation', 'r17ResetNormalObservation')
    .replaceAll('useR17CpuPageOnly', 'useR17Normal').replaceAll('r17CpuPageOnlyProductPlayStarted', 'r17NormalProductPlayStarted');
  const start = source.indexOf('const countText = () => {'), end = source.indexOf('const publishStatus', start);
  if (start < 0 || end < start) throw Error('controls_counts_boundary_changed');
  source = source.slice(0, start) + 'const countText = () => {\n  const v = r17PageBridgeObservationStats(), c = r17NormalSceneStats(), t = r17NormalTextStats();\n' +
    '  return `Y${t.nativeGlyphCalls}/${t.lifetimeNativeGlyphCalls} R${t.observationResets} N${c.nativeCopies}/${c.readyNativeCopies} A${v.available} I${v.inheritedPending} S${v.submitted} C${v.completed} F${v.failed}/${v.failedBeforeCallback} P${v.pending} M${v.maxPending} L${number(v.latencyTotalMs)}/${number(v.latencyMaxMs)} B${v.sampledCalls}:${v.sampledBytes}/${v.maxSampledBytes} G${v.bufferDataCalls}:${v.totalTypedUploadBytes}/${v.maxTypedUploadBytes}`;\n};\n' + source.slice(end);
  source = one(source, '${Math.round(current.payload.window.elapsedMs)}ms/manual', '${current.payload.window.elapsedMs === null ? "elapsed未知" : Math.round(current.payload.window.elapsedMs) + "ms"}/${current.payload.window.reason}', 'null_elapsed_and_actual_reason');
  source = one(source, '冻结画面，合成发布；禁止应用/选取/来源。正常Play计量，15秒导出，20秒正常暂停', '完整正常Sky；按正常Play开始计量，15秒导出，20秒同次正常暂停', 'normal_diagnostic_copy');
  source = one(source, 'let generation = 0, exporting = false, measurementStarted = false;',
    'let productPlayGeneration = 0;\nlet generation = 0, exporting = false, measurementStarted = false;', 'product_play_epoch_owner');
  source = one(source, '  if (!armedPlay || exporting || !runStartAt) return false;',
    '  const playGeneration = ++productPlayGeneration;\n  if (!armedPlay || exporting || !runStartAt) return false;', 'observe_every_actual_play');
  source = one(source, '    const paused = pauseCurrentRun?.(runStartAt);',
    '    const paused = productPlayGeneration === playGeneration ? pauseCurrentRun?.(runStartAt) : false;', 'same_product_play_only');
  if (observeRetirement) {
    source = one(source, '// TASK ONLY. The normal guarded Play/Pause and original 15s/20s boundaries remain.',
      '// TASK ONLY r9. Original 15s metrics; this finite trial uses the guarded 60s Pause.', 'finite_r9_trial_comment');
    source = 'import { r17ConfigureNormalRetirementObservation, r17NormalPlayStartedReceipt, r17NormalPauseResultReceipt } from "./r17-normal-observations";\n' + source;
    source = one(source, 'const cases = [',
      'r17ConfigureNormalRetirementObservation({ buildGeneration: __R17_BUILD_GENERATION__, buildSourceSha256: "__R17_BUILD_SOURCE_BINDING__" },\n' +
      '  (key, value) => Taro.setStorageSync(key, value));\nconst cases = [', 'one_source_bound_retirement_key');
    source = one(source, '  r17Probe.control("actualPlay", true);',
      '  r17Probe.control("actualPlay", true);\n  r17NormalPlayStartedReceipt(playGeneration);', 'single_normal_play_scalar_receipt');
    source = one(source, '    r17Probe.controlResult("pauseAttempt", typeof paused === "boolean" ? paused : null);',
      '    r17Probe.controlResult("pauseAttempt", typeof paused === "boolean" ? paused : null);\n    r17NormalPauseResultReceipt(playGeneration, paused);', 'single_guarded_pause_scalar_receipt');
    source = one(source, '  }, 20000);', '  }, 60000);', 'finite_r9_same_run_sixty_second_trial');
  }
  if (reviewRevision >= 18) {
    source = one(source, '{[45, 10.8].map(fov =>', '{[360, 10.8].map(fov =>', 'full_sky_existing_prepare');
    source = one(source, '>准备 {fov}°</Button>', '>{fov === 360 ? "准备全天空" : `准备 ${fov}°`}</Button>', 'full_sky_prepare_label');
  }
  return source.replaceAll('__R17_BUILD_GENERATION__', String(buildGeneration)).replaceAll('__R17_BUILD_SOURCE_BINDING__', binding);
}
export function normalSurface(source, observeRetirement = retirementReceipt) {
  source = 'import { r17NormalMeasuredText, r17NormalSurfaceReady, r17NormalSurfaceRetired } from "./r17-normal-observations";\n' + source;
  const wrapped = wrapCalls(source, value => value === 'context.measureText' || value === 'context.measureText!', call => 'r17NormalMeasuredText('+call+')', 'actual_native_measure_text');
  source = one(wrapped.source, '    disposed = true;', '    disposed = true;\n    r17NormalSurfaceRetired();', 'surface_retirement_observation');
  source = one(source, '    return {\n      node: ownedNode, gl: ownedGl,', '    r17NormalSurfaceReady();\n    return {\n      node: ownedNode, gl: ownedGl,', 'surface_ready_observation');
  if (observeRetirement) {
    source = 'import { r17NormalSurfaceCreatedReceipt, r17NormalSurfaceReadyReceipt, r17NormalSurfaceRetirementStartedReceipt, r17NormalSurfaceRetirementFinishedReceipt } from "./r17-normal-observations";\n' + source;
    source = one(source, '  const retire = () => {',
      '  const r17SurfaceReceiptId = r17NormalSurfaceCreatedReceipt();\n' +
      '  const r17ReadSurfaceFacts = () => {\n' +
      '    const dimension = (read: () => unknown): number | null => { try { const value = read(); return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e12 ? value : null; } catch { return null; } };\n' +
      '    let contextLost: boolean | null = null;\n' +
      '    try { const value = gl?.isContextLost(); if (typeof value === "boolean") contextLost = value; } catch {}\n' +
      '    return { nodePresent: Boolean(node), displayPresent: Boolean(display), selectionDisplayPresent: Boolean(selectionDisplay),\n' +
      '      nodeWidth: dimension(() => node?.width), nodeHeight: dimension(() => node?.height),\n' +
      '      displayWidth: dimension(() => display.width), displayHeight: dimension(() => display.height),\n' +
      '      selectionWidth: dimension(() => selectionDisplay?.width), selectionHeight: dimension(() => selectionDisplay?.height),\n' +
      '      selectionLayerPresent: selectionLayer !== null, contextPresent: gl !== null, contextLost };\n' +
      '  };\n  const retire = () => {', 'synchronous_boundary_reads_no_retained_native_probe');
    source = one(source, '    retireSelection();\n' +
      '    // Each retirement step is independent; losing a native context must not\n' +
      '    // leave the other backing store or a retained Sources surface alive.\n' +
      '    try { gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* already unavailable */ }\n' +
      '    try { if (node) node.width = 0; } catch { /* native node retired */ }\n' +
      '    try { if (node) node.height = 0; } catch { /* native node retired */ }\n' +
      '    try { display.width = 0; } catch { /* native node retired */ }\n' +
      '    try { display.height = 0; } catch { /* native node retired */ }',
      '    const observedSteps: Record<"selection" | "contextExtension" | "contextLoss" | "nodeWidth" | "nodeHeight" | "displayWidth" | "displayHeight",\n' +
      '      "not-attempted" | "attempted" | "absent" | "unavailable" | "returned" | "threw"> = { selection: "not-attempted", contextExtension: "not-attempted", contextLoss: "not-attempted",\n' +
      '      nodeWidth: "not-attempted", nodeHeight: "not-attempted", displayWidth: "not-attempted", displayHeight: "not-attempted" };\n' +
      '    let returned = false;\n    r17NormalSurfaceRetirementStartedReceipt(r17SurfaceReceiptId);\n    try {\n' +
      '      observedSteps.selection = "attempted";\n' +
      '      try { retireSelection(); observedSteps.selection = "returned"; } catch (error) { observedSteps.selection = "threw"; throw error; }\n' +
      '      // Same independent original calls, with explicit attempt/return facts.\n' +
      '      try {\n        if (!gl) { observedSteps.contextExtension = observedSteps.contextLoss = "absent"; }\n' +
      '        else {\n          observedSteps.contextExtension = "attempted";\n          let extension: WEBGL_lose_context | null;\n' +
      '          try { extension = gl.getExtension("WEBGL_lose_context"); observedSteps.contextExtension = extension ? "returned" : "unavailable"; }\n' +
      '          catch (error) { observedSteps.contextExtension = "threw"; throw error; }\n' +
      '          if (extension) { observedSteps.contextLoss = "attempted"; try { extension.loseContext(); observedSteps.contextLoss = "returned"; } catch (error) { observedSteps.contextLoss = "threw"; throw error; } }\n' +
      '          else observedSteps.contextLoss = "unavailable";\n        }\n      } catch { /* original independent failure policy */ }\n' +
      '      try { if (node) { observedSteps.nodeWidth = "attempted"; node.width = 0; observedSteps.nodeWidth = "returned"; } else observedSteps.nodeWidth = "absent"; } catch { observedSteps.nodeWidth = "threw"; }\n' +
      '      try { if (node) { observedSteps.nodeHeight = "attempted"; node.height = 0; observedSteps.nodeHeight = "returned"; } else observedSteps.nodeHeight = "absent"; } catch { observedSteps.nodeHeight = "threw"; }\n' +
      '      try { observedSteps.displayWidth = "attempted"; display.width = 0; observedSteps.displayWidth = "returned"; } catch { observedSteps.displayWidth = "threw"; }\n' +
      '      try { observedSteps.displayHeight = "attempted"; display.height = 0; observedSteps.displayHeight = "returned"; } catch { observedSteps.displayHeight = "threw"; }\n' +
      '      returned = true;\n' +
      '    } finally { r17NormalSurfaceRetirementFinishedReceipt(r17SurfaceReceiptId, r17ReadSurfaceFacts(), observedSteps, returned); }',
      'post_teardown_dimensions_and_context_result');
    source = one(source, '    r17NormalSurfaceReady();',
      '    r17NormalSurfaceReady();\n    r17NormalSurfaceReadyReceipt(r17SurfaceReceiptId, r17ReadSurfaceFacts());', 'one_ready_fact_receipt');
  }
  return { source, measureTextCallSites: wrapped.count };
}
// Offline consumers may omit the finite shape; the build path always passes its explicit revision below.
export function normalPage(source, requestedPreparation = source.includes('  const requestedTimePresentation = useMemo(() => presentSkyTime(')) {
  source = 'import { r17Probe } from "./r17-phone-probe-runtime";\n' +
    'import { R17PhoneProbeControls, useR17NormalLifecycle, useR17NormalStop, r17NormalProductPlayStarted } from "./r17-phone-probe-controls";\n' +
    'import { r17NormalCopyReturned } from "./r17-normal-observations";\n' + source;
  source = one(source, 'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {',
    'export function SpotSkyPage({ targetOpticalPublication,opticalHipsContributions }: SpotSkyPageProps = {}) {\n  useR17NormalLifecycle();', 'page_lifecycle_observation');
  source = one(source, '      surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive);\n      attempt.publish(excludedNameKeys);',
    '      r17Probe.measure("displayCopy",()=>surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive));\n' +
    '      r17NormalCopyReturned(frame.sceneReady);\n      r17Probe.measure("publishAccepted",()=>attempt.publish!(excludedNameKeys));\n' +
    '      r17Probe.accepted(frame,paintedSkyObjectsRef.current);', 'normal_real_copy_and_complete_publication');
  source = one(source, '    invalidated: () => {', '    invalidated: () => {\n      r17Probe.count("invalidations");', 'invalidations');
  source = one(source, '    failed: (error, frame) => {', '    failed: (error, frame) => {\n      r17Probe.count("failedFrames");', 'failures');
  source = one(source, '      return hipsTiles===frame.hipsTiles?frame:{...frame,hipsTiles};',
    '      if (hipsTiles===frame.hipsTiles) return frame;\n      const resolved = {...frame,hipsTiles};\n      r17Probe.inheritFrame(resolved, frame);\n      return resolved;', 'clone_identity');
  if (requestedPreparation) {
    source = one(source, '  const requestedTimePresentation = useMemo(() => presentSkyTime(rawReportData, requestedAt, timeModel, timeGeometrySources),\n' +
      '    [rawReportData, requestedAt, timeModel, timeGeometrySources]);',
      '  const r17TimePreparation = useMemo(() => {\n' +
      '    const intentSequence = timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt\n' +
      '      ? r17Probe.intentSequence(timeIntent) : null;\n    const token = r17Probe.prepareStarted(intentSequence, "presentation");\n' +
      '    let completed = false;\n    try {\n' +
      '      const presentation = presentSkyTime(rawReportData, requestedAt, timeModel, timeGeometrySources);\n' +
      '      const requested = presentation?.row.at === requestedAt;\n      completed = true;\n' +
      '      return { presentation, token: requested ? token : null, intentSequence: requested ? intentSequence : null };\n' +
      '    } finally { r17Probe.prepareFinished(token, completed); }\n' +
      '  }, [rawReportData, requestedAt, timeModel, timeGeometrySources]);\n' +
      '  const requestedTimePresentation = r17TimePreparation.presentation;\n' +
      '  // Read the current preparation even when the product retains its existing draw callback.\n' +
      '  const r17TimePreparationRef = useRef(r17TimePreparation);\n' +
      '  r17TimePreparationRef.current = r17TimePreparation;', 'requested_time_memo_r10');
  } else source = one(source, '  const timePresentation = useMemo(() => presentSkyTime(rawReportData, requestedAt, timeModel, timeGeometrySources) ??\n' +
    '    presentSkyTime(rawReportData, committedAt), [rawReportData, requestedAt, committedAt, timeModel, timeGeometrySources]);',
    '  const r17TimePreparation = useMemo(() => {\n' +
    '    const intentSequence = timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt\n' +
    '      ? r17Probe.intentSequence(timeIntent) : null;\n    const token = r17Probe.prepareStarted(intentSequence, "presentation");\n' +
    '    let completed = false;\n    try {\n      const presentation = presentSkyTime(rawReportData, requestedAt, timeModel, timeGeometrySources) ??\n' +
    '        presentSkyTime(rawReportData, committedAt);\n      const requested = presentation?.row.at === requestedAt;\n      completed = true;\n' +
    '      return { presentation, token: requested ? token : null, intentSequence: requested ? intentSequence : null };\n' +
    '    } finally { r17Probe.prepareFinished(token, completed); }\n' +
    '  }, [rawReportData, requestedAt, committedAt, timeModel, timeGeometrySources]);\n  const timePresentation = r17TimePreparation.presentation;', 'same_time_memo');
  source = one(source, '    canvasLifecycle.request({ nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,',
    (requestedPreparation ? '    const r17RequestPreparation = r17TimePreparationRef.current;\n' +
      '    const r17UsesRequestedPreparation = Boolean(canvasData && timePresentation === r17RequestPreparation.presentation);\n' : '') +
    '    const r17PreparedRequest: SkyCanvasFrame = { nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,', 'request_identity_start');
  source = one(source, '      sceneReady, owner, inspection: canvasFrameInfo.inspection },\n      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode, continuation);',
    '      sceneReady, owner, inspection: canvasFrameInfo.inspection };\n' +
    (requestedPreparation ? '    r17Probe.request(r17PreparedRequest, r17UsesRequestedPreparation ? r17RequestPreparation.token : null,\n' +
      '      r17UsesRequestedPreparation ? r17RequestPreparation.intentSequence : null);\n' :
      '    r17Probe.request(r17PreparedRequest, r17TimePreparation.token, r17TimePreparation.intentSequence);\n') +
    '    canvasLifecycle.request(r17PreparedRequest,\n' +
    '      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode, continuation);', 'request_identity_end');
  source = one(source, '  const toggleSkyTimePlayback = () => {', '  useR17NormalStop(runStartAt => {\n' +
    '    const time = observationTime.snapshot();\n    if (!skyTimeIntentCurrent() || datePickerOpenRef.current || time.mode !== "PLAYING" || time.runStartAt !== runStartAt) return false;\n' +
    '    pauseSkyTime(); return true;\n  });\n  const toggleSkyTimePlayback = () => {', 'same_run_guarded_pause');
  source = one(source, '    if (previewGeometry.playbackReady && skyTimeIntentCurrent() && !datePickerOpenRef.current)\n' +
    '      setTimeIntent(observationTime.play(Date.now()));',
    '    if (previewGeometry.playbackReady && skyTimeIntentCurrent() && !datePickerOpenRef.current) {\n' +
    '      setTimeIntent(observationTime.play(Date.now()));\n' +
    '      if (observationTime.snapshot().mode === "PLAYING") r17NormalProductPlayStarted(observationTime.snapshot().runStartAt);\n' +
    '    }', 'normal_ready_product_play');
  source = one(source, '    setTimeIntent(previewGeometry.playbackReady && time.at === requestedAt\n' +
    '      ? observationTime.play(Date.now()) : observationTime.requestPlay());',
    '    setTimeIntent(previewGeometry.playbackReady && time.at === requestedAt\n' +
    '      ? observationTime.play(Date.now()) : observationTime.requestPlay());\n' +
    '    if (observationTime.snapshot().mode === "PLAYING") r17NormalProductPlayStarted(observationTime.snapshot().runStartAt);',
    'normal_immediate_product_play');
  const preparedFov = reviewRevision >= 18 ? 'clampSkyFieldOfView(fov, canvasSize.width, canvasSize.height)' : 'fov';
  return one(source, '  </SkyNavigationMenu>;', '    <R17PhoneProbeControls onPrepareFov={fov => { if (!skyDisplayCurrent()) return; stopBrowsingAnimation(); setVerticalFovDeg(' + preparedFov + '); setSkyControlPanel(null); }} onStart={key => setSkyControlPanel(key.endsWith("-camera") ? null : "time")} />\n  </SkyNavigationMenu>;', 'task_only_menu');
}
export function normalLifecycle(source) {
  source = one(source, '      latest = frame;\n      revision++;', '      r17Probe.prepared(frame);\n      latest = frame;\n      revision++;', 'normal_request');
  source = one(source, '    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;',
    '    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;\n    r17Probe.paintStarted(frame);', 'normal_paint');
  source = one(source, '        finished = true;', '        finished = true;\n        r17Probe.callback(frame);', 'normal_callback');
  return 'import { r17Probe } from "./r17-phone-probe-runtime";\n' + wrapCalls(source, value => value === 'port.paint',
    call => 'r17Probe.measure("nativePaintOwner",()=>'+call.replace('port.paint(context,', 'port.paint(context!,')+')', 'normal_paint_span').source;
}
function hiddenSourceMaps(output, instrumentation) {
  const configPath = 'apps/wechat-miniapp/config/index.ts', configBefore = output[configPath];
  let config = configBefore.toString('utf8').replaceAll('\r\n', '\n');
  config = one(config, '        resolve: { symlinks(value: boolean): void };', '        resolve: { symlinks(value: boolean): void };\n        devtool(value: string): void;', 'hidden_maps_type');
  config = one(config, '        chain.resolve.symlinks(false);', '        chain.resolve.symlinks(false);\n        chain.devtool("hidden-source-map");', 'hidden_maps');
  output[configPath] = config;
  instrumentation[configPath] = { beforeSha256: sha(configBefore), afterSha256: sha(config) };
}
async function prepareD2TimeSources(output, template, binding) {
  const { addD2TimeObservation } = await import('./d2-time-observation-instrumentation.mjs');
  const instrumentation = {}, text = name => output[feature + name].toString('utf8').replaceAll('\r\n', '\n');
  const observed = addD2TimeObservation({ page: text('spot-sky-page.tsx'), time: text('sky-observation-time.ts'),
    geometry: text('use-sky-time-geometry.ts'), lifecycle: text('sky-canvas-lifecycle.ts'), runtime: template['r17-phone-probe-v3-runtime.ts'] });
  const additions = { 'spot-sky-page.tsx': observed.page, 'sky-observation-time.ts': observed.time,
    'use-sky-time-geometry.ts': observed.geometry, 'sky-canvas-lifecycle.ts': observed.lifecycle,
    'r17-phone-probe-runtime.ts': observed.runtime, 'd2-time-observation.ts': template['d2-time-observation.ts'],
    'r17-geometry-stage-runtime.ts': template['r17-geometry-stage-runtime.ts'], 'r17-ruler-entry-runtime.ts': template['r17-ruler-entry-runtime.ts'],
    'd2-time-observation-controls.tsx': template['d2-time-observation-controls.tsx']
      .replaceAll('__D2_TIME_GENERATION__', String(buildGeneration)).replaceAll('__D2_TIME_SOURCE_HASH__', binding) };
  for (const [name, bytes] of Object.entries(additions)) {
    const file = feature + name;
    instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
    output[file] = bytes;
  }
  hiddenSourceMaps(output, instrumentation);
  instrumentation.timeObservation = { schemaVersion: 'starward-d2-time-observation-v1',
    boundaries: ['legal-preview-after-bind', 'current-presentation-memo', 'actual-request', 'successful-copy-and-publish', 'geometry-dispatch-and-admit'],
    diagnosticDeadlineMs: 45000, chainCapacity: 256, identityCapacity: 256, packetBudgetBytes: 32768,
    automaticProductPause: false, productStateWrites: false, strongProductReferences: false,
    pageGpuMemoryScenePopulationObservation: false, physicalPresentation: 'UNVERIFIED' };
  return { output, instrumentation };
}
function prepareD1TerrainSources(output, template, binding) {
  const instrumentation = {};
  const input = new Map(terrainWaitSourceFiles.map(file => [file, output[file].toString('utf8')]));
  const additions = transformTerrainWaitSources(input);
  additions.set('apps/wechat-miniapp/src/services/terrain-wait-observer.ts', template['terrain-wait-observer.ts']
    .replaceAll('__TERRAIN_WAIT_ACTION__', 'gesture').replaceAll('__TERRAIN_WAIT_SOURCE_SHA256__', binding));
  additions.set('apps/wechat-miniapp/src/pages/map/terrain-wait-marker.tsx', template['terrain-wait-marker.tsx']);
  for (const [file, bytes] of additions) {
    instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
    output[file] = bytes;
  }
  hiddenSourceMaps(output, instrumentation);
  instrumentation.terrainWait = { schemaVersion: 'starward-terrain-wait-v3', action: 'gesture',
    eventLimit: 80, identityLimit: 64, diagnosticDeadlineMs: 15000,
    skyObservation: false, productStateWrites: false, sourceSha256: binding,
    nativeAcknowledgmentIsPhysicalPresentation: false, physicalResourceRelease: 'UNVERIFIED' };
  return { output, instrumentation };
}
async function prepareD2CurrentSources(output, template, binding) {
  const { addD2NormalLifecycle } = await import('./d2-normal-lifecycle-instrumentation.mjs');
  const instrumentation = {}, text = name => output[feature + name].toString('utf8').replaceAll('\r\n', '\n');
  const lifecycle = addD2NormalLifecycle({ page: text('spot-sky-page.tsx'), time: text('sky-observation-time.ts'),
    observation: template['r17-normal-observations.ts'] });
  const adapter = template['r25-memory-lifetime-adapter.ts'].replace('__R25_BUILD_GENERATION__', String(buildGeneration))
    .replace('__R25_BUILD_SOURCE_HASH__', binding);
  const decoded = addD2DecodeCheckpoint({ request: text('sky-artwork-request.ts'), adapter });
  const additions = { 'spot-sky-page.tsx': lifecycle.page, 'sky-observation-time.ts': lifecycle.time,
    'r17-normal-observations.ts': lifecycle.observation, 'sky-artwork-request.ts': decoded.request,
    'r25-memory-lifetime-adapter.ts': decoded.adapter, 'sky-canvas-surface.ts': normalSurface(text('sky-canvas-surface.ts'), true).source,
    'd2-normal-lifecycle-controls.tsx': template['d2-normal-lifecycle-controls.tsx']
      .replaceAll('__D2_BUILD_GENERATION__', String(buildGeneration)).replaceAll('__D2_BUILD_SOURCE_HASH__', binding) };
  for (const name of ['d2-decode-observation.ts', 'd2-normal-lifecycle.ts', 'r25-memory-lifetime-observer.ts', 'r25-stellar-owner-observer.ts',
    'r17-ruler-entry-runtime.ts']) additions[name] = template[name];
  if (d2GpuResources) {
    const { addD2GpuResourceOwners } = await import('./d2-gpu-resource-instrumentation.mjs');
    const { addD2GpuResourceLifecycle } = await import('./d2-gpu-lifecycle-instrumentation.mjs');
    const owners = addD2GpuResourceOwners({ textures: text('sky-gpu-textures.ts'),
      contributions: text('sky-gpu-artwork-contributions.ts'), renderer: text('sky-gpu-renderer.ts') });
    additions['sky-gpu-textures.ts'] = owners.textures;
    additions['sky-gpu-artwork-contributions.ts'] = owners.contributions;
    additions['sky-gpu-renderer.ts'] = owners.renderer;
    const observed = addD2GpuResourceLifecycle({ page: additions['spot-sky-page.tsx'],
      observation: additions['r17-normal-observations.ts'], lifecycle: additions['d2-normal-lifecycle.ts'],
      controls: additions['d2-normal-lifecycle-controls.tsx'], receipt: template['d2-gpu-resource-receipt.ts'] });
    additions['spot-sky-page.tsx'] = observed.page;
    additions['r17-normal-observations.ts'] = observed.observation;
    additions['d2-normal-lifecycle.ts'] = observed.lifecycle;
    additions['d2-normal-lifecycle-controls.tsx'] = observed.controls;
    instrumentation.gpuResources = { schemaVersion: 'starward-r17-normal-surface-retirement-v2',
      source: 'existing-texture-contribution-renderer-owners', storage: 'same-receipt-owner-new-exact-key',
      phaseSlots: ['ready', 'play-start', 'active-30', 'paused', 'before-retire', 'after-retire'],
      packetBudgetBytes: 32768, globalProductReferences: false, nativeMethodReplacement: false,
      physicalReleaseOrGpuCompletion: false };
  }
  for (const [name, bytes] of Object.entries(additions)) {
    const file = feature + name;
    instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
    output[file] = bytes;
  }
  hiddenSourceMaps(output, instrumentation);
  instrumentation.decodeObservation = { schemaVersion: 'starward-d2-decode-logical-v1', checkpointSchema: 'starward-r25-memory-checkpoint-v2',
    coverage: 'instrumented-artwork-request-since-module-load', resetOnPlay: false,
    nativeInFlightOrPhysicalBytes: false, strongProductReferences: false, productStateWrites: false,
    automaticProductPause: false, diagnosticDeadlineMs: 90000, checkpointLimit: 10,
    sampledStellarUploadSites: 'not-instrumented-in-decode-only-scope-zero-calls-not-a-population-count',
    timeOrSceneCostMetrics: 'not-instrumented-in-this-scope', collectorRouteUnchanged: true,
    optionalNativeRegionInput: 'not-selected-missing-original-input-remains-unverified' };
  instrumentation.surfaceRetirement = { schemaVersion: d2GpuResources ? 'starward-r17-normal-surface-retirement-v2' : 'starward-r17-normal-surface-retirement-v1',
    ownKey: `starward.r17.normal-surface-retirement.v${d2GpuResources ? 2 : 1}.${binding}`, lastSurfaceOnly: true,
    nativeObjectsRetained: false, perFrameSerialization: false, physicalRelease: 'UNVERIFIED' };
  return { output, instrumentation };
}
export async function preparedSources(normal, template, binding) {
  // Keep manifest hashes on the exact checked-out template bytes; normalize only
  // the transformation input so Windows CRLF checkouts use the same boundaries.
  template = Object.fromEntries(Object.entries(template).map(([name, value]) => [name, value.replaceAll('\r\n', '\n')]));
  const output = {}, instrumentation = {};
  for (const file of Object.keys(normal)) output[file] = await fs.readFile(path.join(root, file));
  if (d1TerrainWait) return prepareD1TerrainSources(output, template, binding);
  if (d2TimeObservation) return prepareD2TimeSources(output, template, binding);
  if (d2Current) return prepareD2CurrentSources(output, template, binding);
  const edit = (name, transform) => { const file = feature + name, original = output[file]; const result = transform(original.toString('utf8').replaceAll('\r\n', '\n')); output[file] = result; instrumentation[file] = { beforeSha256: sha(original), afterSha256: sha(result) }; };
  const probeImport = source => 'import { r17Probe } from "./r17-phone-probe-runtime";\n' + source;
  for (const [name, fn, stage] of [['sky-time-presentation.ts', 'presentSkyTime', 'presentation'], ['sky-stellar-scene.ts', 'resolveSkySceneFrame', 'base'],
    ['sky-stellar-supplement-scene.ts', 'resolveSkyStellarSupplement', 'supplement'], ['sky-constellation-scene.ts', 'resolveConstellationFrame', 'constellations']])
    edit(name, source => probeImport(wrapNamed(source, fn, stage)));
  edit('sky-stellar-tile-selection.ts', source => probeImport(wrapNamed(source, 'selectSkyStellarTiles', 'selection', ',result=>r17Probe.tiles(result.length)')));
  edit('sky-observation-time.ts', source => probeImport(one(source, 'state = { ...state, ...change }; return state;', 'state = { ...state, ...change }; r17Probe.intent(state); return state;', 'intent_owner')));
  edit('sky-scene-render.ts', source => {
    source = one(source, 'if (star.opacity <= 0) return;', 'if (star.opacity <= 0) return;\n    if(star.reference.startsWith("HR:"))__r17Bsc++; if(star.reference.startsWith("SAO:"))__r17Sao++;', 'actual_bsc_sao_submissions');
    source = one(source, '  context.finish();\n  const contributingHipsGroups', '  context.finish();\n  r17Probe.sceneFinished(data,frameAt,frame,currentSupplement,width,height,verticalFovDeg,mode,__r17Bsc,__r17Sao);\n  const contributingHipsGroups', 'full_scene_finish');
    return probeImport(one(wrapNamed(source, 'drawSkyScene', 'draw'), 'return r17Probe.measure("draw",()=>{', 'return r17Probe.measure("draw",()=>{\n let __r17Bsc=0,__r17Sao=0;', 'scene_count_scope'));
  });
  edit('sky-canvas-lifecycle.ts', normalLifecycle);
  for (const name of ['sky-gpu-renderer.ts', 'sky-gpu-artwork-contributions.ts']) edit(name, source => {
    const result = wrapCalls(source, value => ['drawBufferInfo', 'gl.drawArrays', 'gl.drawElements'].includes(value), call => '('+call+',r17Probe.count("glDrawSubmissions"))', name);
    instrumentation[name + ':drawCallSites'] = result.count; source = probeImport(result.source);
    if (name === 'sky-gpu-renderer.ts') {
      source = 'import { r17RecordTypedGpuUpload } from "./r17-page-bridge-observer";\n' + source;
      source = one(source, '          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);',
        '          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);\n          r17RecordTypedGpuUpload(data.length);', 'existing_typed_upload_observer');
    }
    return source;
  });
  edit('sky-canvas-surface.ts', source => {
    const observed = normalSurface(source);
    instrumentation['sky-canvas-surface.ts:measureTextCallSites'] = observed.measureTextCallSites;
    if (retirementReceipt) instrumentation.surfaceRetirement = { schemaVersion: 'starward-r17-normal-surface-retirement-v1',
      ownKey: `starward.r17.normal-surface-retirement.v1.${binding}`, lastSurfaceOnly: true,
      nativeObjectsRetained: false, perFrameSerialization: false, normalPlayTrialMs, metricsExportMs: 15000,
      afterPauseDrainMinimumMs: 30000, drainOwner: 'root-existing-device-and-process-observation' };
    return observed.source;
  });
  edit('spot-sky-page.tsx', source => normalPage(source, reviewRevision >= 10));
  // Hidden maps preserve exact emitted positions without shipping map payloads
  // or adding sourceMappingURL loads to the phone bundle.
  hiddenSourceMaps(output, instrumentation);
  output[feature + 'r17-phone-probe-runtime.ts'] = template['r17-phone-probe-v3-runtime.ts'].replaceAll('__VARIANT__', 'baseline');
  output[feature + 'r17-phone-probe-controls.tsx'] = controls(template['r17-accepted-action-controls.tsx'], binding);
  output[feature + 'r17-page-bridge-observer.ts'] = template['r17-page-bridge-observer.ts'];
  output[feature + 'r17-normal-observations.ts'] = template['r17-normal-observations.ts'];
  if (observationA1) {
    const correlated = addR17ACorrelation({ runtime: output[feature + 'r17-phone-probe-runtime.ts'],
      pageObserver: output[feature + 'r17-page-bridge-observer.ts'] });
    output[feature + 'r17-phone-probe-runtime.ts'] = correlated.runtime;
    output[feature + 'r17-page-bridge-observer.ts'] = correlated.pageObserver;
    output[feature + 'r17-a-correlation-runtime.ts'] = template['r17-a-correlation-runtime.ts'];
  }
  if (terrainWait) {
    const terrainInput = new Map(terrainWaitSourceFiles.map(file => [file, output[file].toString('utf8')]));
    const terrainEdits = transformTerrainWaitSources(terrainInput);
    terrainEdits.set('apps/wechat-miniapp/src/services/terrain-wait-observer.ts', template['terrain-wait-observer.ts']
      .replace('__TERRAIN_WAIT_ACTION__', 'gesture').replace('__TERRAIN_WAIT_SOURCE_SHA256__', binding));
    terrainEdits.set('apps/wechat-miniapp/src/pages/map/terrain-wait-marker.tsx', template['terrain-wait-marker.tsx']);
    const terrainBinding = { schema: 'starward-terrain-wait-source-v1', scope: 'TASK_ONLY_NOT_ACCEPTANCE', action: 'gesture', sourceSha256: binding,
      files: [...terrainEdits].map(([file, after]) => ({ file, beforeSha256: terrainInput.has(file) ? sha(terrainInput.get(file)) : null, afterSha256: sha(after) })) };
    for (const [file, bytes] of terrainEdits) {
      instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
      output[file] = bytes;
    }
    output['terrain-wait-source.json'] = JSON.stringify(terrainBinding, null, 2) + '\n';
    instrumentation.terrainWait = terrainBinding;
  }
  if (rulerEntry) {
    let observed = (nativeAdmission ? addR17RulerEntryV2 : addR17RulerEntry)({ runtime: output[feature + 'r17-phone-probe-runtime.ts'],
      controls: output[feature + 'r17-phone-probe-controls.tsx'], page: output[pagePath],
      layout: output[feature + 'orientation-ruler-layout.ts'].toString('utf8').replaceAll('\r\n', '\n'),
      nativePosition: output['apps/wechat-miniapp/src/components/ruler-scroll-position.ts'].toString('utf8').replaceAll('\r\n', '\n') });
    if (nativeAdmission) observed = { ...observed, ...addR17NormalInput(observed) };
    if (retirementReceipt) observed.controls = one(observed.controls,
      '完整正常Sky；manual-input等实际时间输入，15秒导出；正常Play仍20秒同次暂停',
      '完整正常Sky；manual-input等实际时间输入，15秒导出；正常Play按本次60秒同次暂停', 'finite_r9_trial_copy');
    const files = { 'r17-phone-probe-runtime.ts': observed.runtime, 'r17-phone-probe-controls.tsx': observed.controls,
      'spot-sky-page.tsx': observed.page, 'orientation-ruler-layout.ts': observed.layout,
      'r17-ruler-scroll-position.ts': observed.nativePosition, 'r17-ruler-entry-runtime.ts': nativeAdmission
        ? template['r17-ruler-entry-runtime.ts'].replace('starward-r17-ruler-entry-v1', 'starward-r17-ruler-entry-v2') : template['r17-ruler-entry-runtime.ts'] };
    for (const [name, after] of Object.entries(files)) {
      const file = feature + name;
      instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(after) };
      output[file] = after;
    }
    instrumentation.rulerEntry = { schemaVersion: nativeAdmission ? 'starward-r17-ruler-entry-v2' : 'starward-r17-ruler-entry-v1', caseKey: 'wide-time',
      immediate: true, capacity: 128, meaning: 'requests-offsets-not-presentation', sharedNativeOwnerUnchanged: true };
    if (nativeAdmission) instrumentation.manualInput = { schemaVersion: 'starward-r17-phone-probe-v3-manual-input',
      caseKey: 'manual-input', startDelayMs: 0, boundary: 'legal-onPreview-before-preview-intent', triggers: { sixField: 1, ruler: 2 },
      sameRecorderAndCollector: true, scalarOnly: true };
  }
  if (geometryStages) {
    const geometryFile = feature + 'use-sky-time-geometry.ts';
    const changed = addR17GeometryStages({ runtime: output[feature + 'r17-phone-probe-runtime.ts'], page: output[pagePath],
      geometry: output[geometryFile].toString('utf8').replaceAll('\r\n','\n') });
    const additions = { [feature + 'r17-phone-probe-runtime.ts']: changed.runtime, [pagePath]: changed.page,
      [geometryFile]: changed.geometry, [feature + 'r17-geometry-stage-runtime.ts']: template['r17-geometry-stage-runtime.ts'] };
    for (const [file, bytes] of Object.entries(additions)) {
      instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
      output[file] = bytes;
    }
    instrumentation.geometryStages = { schemaVersion: 'starward-r17-geometry-stages-v1', caseKey: 'manual-input',
      capacity: 128, pendingRequestLimit: 64, windowLimit: 64, weakResponseLimit: 128,
      originalPromiseReturned: true, productStateWrites: false, inputOrRenderingThrottled: false,
      networkCacheSource: 'not-observed', repeatedHookAssignment: 'distinct-response-window-target-intent-only' };
  }
  if (drawReasons) {
    const observed = addR19DrawReasons({ runtime: output[feature + 'r17-phone-probe-runtime.ts'], page: output[pagePath],
      lifecycle: output[feature + 'sky-canvas-lifecycle.ts'] });
    for (const [name, bytes] of Object.entries({ 'r17-phone-probe-runtime.ts': observed.runtime,
      'spot-sky-page.tsx': observed.page, 'sky-canvas-lifecycle.ts': observed.lifecycle })) {
      const file = feature + name;
      instrumentation[file] = { beforeSha256: sha(output[file]), afterSha256: sha(bytes) }; output[file] = bytes;
    }
    instrumentation.drawReasons = { schemaVersion: 'starward-r19-draw-reasons-v1', identityLimit: 256, ringCapacity: 32,
      bits: { inputResourceEffect: 1, unknown: 2, camera: 4, stars: 8, names: 16, images: 32 },
      frameMerging: 'existing-dirty-latest-only', paintBoundary: 'existing-paintStarted-before-port.paint',
      requestOrPaintTimeInference: false, productStateWrites: false, additionalScheduling: false };
  }
  if (drawCosts) {
    const observed = addR20DrawCosts({ runtime: output[feature + 'r17-phone-probe-runtime.ts'],
      scene: output[feature + 'sky-scene-render.ts'], renderer: output[feature + 'sky-gpu-renderer.ts'] });
    for (const [name, bytes] of Object.entries({ 'r17-phone-probe-runtime.ts': observed.runtime,
      'sky-scene-render.ts': observed.scene, 'sky-gpu-renderer.ts': observed.renderer })) {
      const file = feature + name;
      instrumentation[file] = { beforeSha256: sha(output[file]), afterSha256: sha(bytes) }; output[file] = bytes;
    }
    instrumentation.drawCosts = { schemaVersion: 'starward-r20-draw-costs-v1',
      stages: ['draw', 'starTraversal', 'rendererSubmit'],
      grouping: 'same-actual-synchronous-port.paint-admission-effect-continuation-unknown',
      nesting: 'submit-may-overlap-starTraversal-both-inside-draw-do-not-add',
      fixedAggregateCount: 12, additionalIdentityOrFrameRetention: false, perStarTiming: false,
      productStateWrites: false, additionalScheduling: false };
  }
  if (firstAcceptedCosts) {
    const names = { runtime: 'r17-phone-probe-runtime.ts', observation: 'r17-normal-observations.ts',
      lifecycle: 'sky-canvas-lifecycle.ts', page: 'spot-sky-page.tsx', scene: 'sky-scene-render.ts',
      starPreparation: 'sky-star-draw-preparation.ts' };
    const observed = addR28FirstAcceptedCosts(Object.fromEntries(Object.entries(names).map(([key, name]) =>
      [key, output[feature + name].toString('utf8').replaceAll('\r\n', '\n')])));
    for (const [key, name] of Object.entries(names)) {
      const file = feature + name, bytes = observed[key];
      instrumentation[file] = { beforeSha256: sha(output[file]), afterSha256: sha(bytes) }; output[file] = bytes;
    }
    output[feature + 'r28-first-accepted-costs.ts'] = template['r28-first-accepted-costs.ts'];
    instrumentation.firstAcceptedCosts = { schemaVersion: 'starward-r28-first-accepted-costs-v1',
      capacity: 8, identityLimit: 256, firstAcceptedGate: 'existing-acceptedIdentity-real-first-intent',
      canvasIdentity: 'lifecycle-owner-sequence-and-original-epoch',
      clocks: 'same-existing-interval-values-no-extra-clock',
      productObjectsRetained: false, productStateWrites: false, additionalScheduling: false,
      unrelatedMemoryAndTerrainObservers: false };
  }
  if (memoryLifetime) {
    const names = { controls: 'r17-phone-probe-controls.tsx', observation: 'r17-normal-observations.ts',
      time: 'sky-observation-time.ts', transform: 'sky-stellar-transform.ts', renderer: 'sky-gpu-renderer.ts' };
    const observed = addR25MemoryLifetime({ ...Object.fromEntries(Object.entries(names).map(([key, name]) =>
      [key, output[feature + name].toString('utf8').replaceAll('\r\n', '\n')])), playTrialMs: normalPlayTrialMs });
    const additions = Object.fromEntries(Object.entries(names).map(([key, name]) => [feature + name, observed[key]]));
    additions[feature + 'r25-memory-lifetime-observer.ts'] = template['r25-memory-lifetime-observer.ts'];
    additions[feature + 'r25-memory-lifetime-adapter.ts'] = template['r25-memory-lifetime-adapter.ts']
      .replace('__R25_BUILD_GENERATION__', String(buildGeneration)).replace('__R25_BUILD_SOURCE_HASH__', binding);
    for (const [file, bytes] of Object.entries(additions)) {
      instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
      output[file] = bytes;
    }
    instrumentation.memoryLifetime = { schemaVersion: 'starward-r25-memory-lifetime-v1',
      owner: 'actual-stellar-transform-arrays-and-typed-GPU-upload-view-backing',
      firstWitnessesPerSite: 32, recentWitnessesPerSite: 32, strideAfterFirst: 16,
      checkpointLimit: 10, eventLimit: 8, exportDeadlineMs: 90000,
      strongProductReferences: false, forceGc: false, wholeHeapOrRetainerClaim: false,
      productStateWrites: false, serializedOnlyAtSeal: !memoryCheckpoints };
    if (memoryCheckpoints) {
      const file = feature + 'sky-stellar-supplement-scene.ts';
      const bytes = addR25StellarOwnerObservation(output[file].toString('utf8').replaceAll('\r\n', '\n'));
      instrumentation[file] = { beforeSha256: sha(output[file]), afterSha256: sha(bytes) }; output[file] = bytes;
      const ownerFile = feature + 'r25-stellar-owner-observer.ts';
      output[ownerFile] = template['r25-stellar-owner-observer.ts'];
      instrumentation[ownerFile] = { beforeSha256: null, afterSha256: sha(output[ownerFile]) };
      instrumentation.memoryCheckpoints = { schemaVersion: 'starward-r25-memory-checkpoint-v1',
        checkpointLimit: 10, packetBudgetBytes: 32768, singleFlight: true, automaticAttemptsPerPacket: 2,
        ownerTileLimit: 8, ownerAggregateLimit: 8, strongProductReferences: false, normalPlayTrialMs };
    }
  }
  if (memoryOwnerLinks) {
    const names = { lifecycle: 'sky-canvas-lifecycle.ts', drawPreparation: 'sky-star-draw-preparation.ts', page: 'spot-sky-page.tsx' };
    const observed = addR26AggregateUse(Object.fromEntries(Object.entries(names).map(([key, name]) =>
      [key, output[feature + name].toString('utf8').replaceAll('\r\n', '\n')])));
    const additions = Object.fromEntries(Object.entries(names).map(([key, name]) => [feature + name, observed[key]]));
    additions[feature + 'r25-memory-lifetime-adapter.ts'] = addR26MemoryOwnerLinks(output[feature + 'r25-memory-lifetime-adapter.ts']);
    for (const name of ['r26-fiber-owner-observer.ts', 'r26-aggregate-use-observer.ts', 'r26-memory-owner-links.ts'])
      additions[feature + name] = template[name];
    for (const [file, bytes] of Object.entries(additions)) {
      instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
      output[file] = bytes;
    }
    instrumentation.memoryOwnerLinks = { schemaVersion: 'starward-r26-memory-checkpoint-v1', aggregateSamples: 8,
      exactSlots: ['lifecycle-latest', 'draw-preparation', 'accepted-command'],
      frameworkScanPhases: ['active-5', 'first-drain-10'], knownCanvasEntrances: 2,
      frameworkContract: 'taro-4.2.1-react-18.3.1-known-hook-fields-v1',
      strongProductReferencesRetained: false, currentCommittedTreeClaim: false, wholeHeapClaim: false };
  }
  if (queryCallbackLinks) {
    const queryPath = 'apps/wechat-miniapp/src/hooks/use-resource-query.ts';
    const changed = addR27QueryCallbackSources({ page: output[pagePath].toString('utf8').replaceAll('\r\n', '\n'),
      resourceQuery: output[queryPath].toString('utf8').replaceAll('\r\n', '\n') }, { sharedQueryPorts: skyPackage });
    const additions = { [pagePath]: changed.page, [queryPath]: changed.resourceQuery,
      [feature + 'r25-memory-lifetime-adapter.ts']: addR27QueryCallbackAdapter(output[feature + 'r25-memory-lifetime-adapter.ts'], { sharedQueryPorts: skyPackage }) };
    if (skyPackage) additions['apps/wechat-miniapp/src/hooks/r27-query-callback-ports.ts'] = template['r27-query-callback-ports.ts'];
    for (const name of ['r27-query-callback-observer.ts', 'r27-query-callback-links.ts']) additions[feature + name] = template[name];
    for (const [file, bytes] of Object.entries(additions)) {
      instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
      output[file] = bytes;
    }
    instrumentation.queryCallbackLinks = { schemaVersion: 'starward-r27-memory-checkpoint-v1', aggregateSamples: 8,
      callbackSite: 'fine-target-queryFn', observationPhases: ['active-5', 'first-drain-10'],
      sourceReturns: ['loading', 'recovery', 'normal'], currentRenderSlots: 1, strongProductReferencesRetained: false,
      originalFunctionsAndRenderValuesReturned: true, additionalScheduling: false, closureEdgeClaim: false,
      ...(skyPackage ? { sharedQueryPorts: 'two-fixed-methods-registered-at-sky-adapter-module-load',
        sharedRuntimeImports: 0, trackingAndReleaseOwnerUnchanged: true } : {}) };
  }
  if (nativeRegion) {
    // This historical optional input is not part of a Sky-only preparation.
    // Do not fabricate it or make unrelated current D2 templates unimportable.
    const { instrumentNativeRegionProbe } = await import('../tmp/r17-native-region-probe-instrumentation.mjs');
    const mapPage = 'apps/wechat-miniapp/src/pages/map/index.tsx';
    const markerPath = 'apps/wechat-miniapp/src/pages/map/terrain-wait-marker.tsx';
    const observeNativeUpdates = reviewRevision >= 15;
    const observed = instrumentNativeRegionProbe({ page: output[mapPage], marker: output[markerPath], observeNativeUpdates });
    const additions = {
      [mapPage]: observed.page, [markerPath]: observed.marker,
      'apps/wechat-miniapp/src/services/r17-native-region-probe.ts': template['../tmp/r17-native-region-probe.ts'],
      'apps/wechat-miniapp/src/services/r17-native-region-probe-adapter.ts': one(
        template['../tmp/r17-native-region-probe-adapter.ts'], 'const observeNativeUpdates = false;',
        `const observeNativeUpdates = ${observeNativeUpdates};`, 'native_region_updates_mode')
        .replace('__R17_REGION_SOURCE_SHA256__', binding).replace('__R17_REGION_BUILD_GENERATION__', String(buildGeneration)),
    };
    for (const [file, bytes] of Object.entries(additions)) {
      instrumentation[file] = { beforeSha256: output[file] === undefined ? null : sha(output[file]), afterSha256: sha(bytes) };
      output[file] = bytes;
    }
    const terrainBinding = JSON.parse(output['terrain-wait-source.json']);
    for (const row of terrainBinding.files) if (additions[row.file] !== undefined) row.afterSha256 = sha(output[row.file]);
    output['terrain-wait-source.json'] = JSON.stringify(terrainBinding, null, 2) + '\n';
    instrumentation.terrainWait = terrainBinding;
    instrumentation.nativeRegionProbe = { schemaVersion: observeNativeUpdates ? 'starward-r17-native-region-v2' : 'starward-r17-native-region-v1',
      gestureCount: 1, maximumGetRegionReads: 3, midpointDelayMs: 500, deadlineMs: 5000,
      ...(observeNativeUpdates ? { nativeUpdates: 'existing-handler-count-first-last-only' } : {}),
      productStateWrites: false, terrainSourceReads: false, privateUsbCollectorOnly: true };
  }
  return { output, instrumentation };
}
async function verifyBindings(directory, bindings) {
  for (const [file, expected] of Object.entries(bindings)) {
    if (path.isAbsolute(file) || file.split('/').includes('..')) throw Error('unsafe_source_path');
    if (sha(await fs.readFile(path.join(directory, file))) !== expected) throw Error('source_readback_mismatch:' + file);
  }
}
async function absent(file) { try { await fs.lstat(file); throw Error('output_already_exists:' + relative(file)); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
async function origin() {
  // Only the existing apiOrigin is read, in memory. No runtime JSON is copied.
  const runtimeFile = process.env.STARWARD_R17_RUNTIME_CONFIG;
  if (!runtimeFile || !path.isAbsolute(runtimeFile)) throw Error('absolute_private_runtime_config_required');
  const runtime = await readJson(runtimeFile);
  const selected = new URL(runtime.apiOrigin);
  if ((d2TimeObservation || d1TerrainWait) && (!Number.isSafeInteger(bridgePort) || bridgePort < 1024 || bridgePort > 65535 || [8787,8798].includes(bridgePort)))
    throw Error(d1TerrainWait ? 'd1_terrain_distinct_bridge_port_required' : 'd2_time_distinct_bridge_port_required');
  const hostAllowed = usbReverse
    ? runtime.transport === 'usb-reverse' && selected.hostname === '127.0.0.1' && selected.port === '8798'
    : runtime.transport !== 'usb-reverse' && !selected.hostname.startsWith('127.') && selected.hostname !== '0.0.0.0';
  if (selected.protocol !== 'http:' || !(d2TimeObservation || d1TerrainWait ? selected.port === String(bridgePort) : ['8797', '8798'].includes(selected.port)) || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(selected.hostname) || !hostAllowed || selected.username || selected.password || selected.search || selected.hash || selected.pathname !== '/') throw Error('physical_runtime_origin_boundary_changed');
  const inherited = selected.origin; selected.port = String(bridgePort);
  return { value: selected.origin, inheritedSha256: sha(inherited), sha256: sha(selected.origin) };
}
async function verifyCurrent(manifest, template) {
  if (manifest.scope !== scope || manifest.buildGeneration !== buildGeneration || manifest.bridgePort !== bridgePort || manifest.builderSha256 !== sha(await fs.readFile(fileURLToPath(import.meta.url))) ||
      JSON.stringify(manifest.templateBindings) !== JSON.stringify(Object.fromEntries(Object.entries(template).map(([name, value]) => [name, sha(value)])))) throw Error('builder_or_template_binding_changed');
  await verifyBindings(root, manifest.productionSourceBindings); await verifyBindings(sourceRoot, manifest.sourceBindings);
  const rebuilt = await preparedSources(manifest.productionSourceBindings, template, manifest.buildSourceSha256);
  if (Object.keys(rebuilt.output).length !== Object.keys(manifest.sourceBindings).length) throw Error('source_set_changed');
  for (const [file, bytes] of Object.entries(rebuilt.output)) if (sha(bytes) !== manifest.sourceBindings[file]) throw Error('source_transform_changed:' + file);
  for (const link of ['node_modules', 'apps/wechat-miniapp/node_modules'])
    if (!(await fs.lstat(path.join(sourceRoot, link))).isSymbolicLink() || (await fs.realpath(path.join(sourceRoot, link))).toLowerCase() !== (await fs.realpath(path.join(root, link))).toLowerCase()) throw Error('dependency_link_changed');
  if (manifest.checks) return manifest.checks;
  if (d1TerrainWait) return { scope: 'CURRENT_TERRAIN_WAIT_SOURCE_BINDINGS_READ_BACK', sourceBindingsReadBack: true,
    skyObservation: 'NOT_INSTRUMENTED', nativePresentationAndPhysicalRelease: 'UNVERIFIED', targetRuntime: 'UNVERIFIED' };
  if (d2TimeObservation) return { scope: 'CURRENT_TIME_CHAIN_SOURCE_BINDINGS_READ_BACK', sourceBindingsReadBack: true,
    fullSceneCpuGpuMemoryObservation: 'NOT_INSTRUMENTED', targetRuntime: 'UNVERIFIED' };
  if (d2Current) return { scope: d2GpuResources ? 'GPU_RESOURCE_SOURCE_BINDINGS_READ_BACK' : 'DECODE_ONLY_SOURCE_BINDINGS_READ_BACK', sourceBindingsReadBack: true,
    fullTimeSceneCostMetrics: 'NOT_INSTRUMENTED', targetRuntime: 'UNVERIFIED' };
  const { verifyNormalBaselineV3Fixture } = await import(pathToFileURL(path.join(here, 'r17-normal-baseline-v3-fixture.mjs')));
  return verifyNormalBaselineV3Fixture({ sourceRoot, productionRoot: root, feature, ts, buildGeneration,
    protocolPath: path.join(here, protocolName), allowACorrelation: observationA1, allowRulerEntry: rulerEntry,
    retirementObservation: retirementReceipt, normalPlayTrialMs, requestedPreparation: reviewRevision >= 10 });
}
async function deltaTypecheck() {
  const diagnostics = directory => {
    const file = path.join(directory, 'apps/wechat-miniapp/tsconfig.json'), config = ts.readConfigFile(file, ts.sys.readFile);
    if (config.error) throw Error('typecheck_config_unreadable');
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(file)); parsed.options.noEmit = true;
    if (!parsed.options.strict || !parsed.options.noUncheckedIndexedAccess || !parsed.options.exactOptionalPropertyTypes) throw Error('strict_typecheck_options_required');
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    return ts.getPreEmitDiagnostics(program).map(value => ({ code: value.code, file: value.file ? path.relative(directory, value.file.fileName).replaceAll('\\', '/') : null,
      message: ts.flattenDiagnosticMessageText(value.messageText, '\n').replaceAll(directory, '<source>').replaceAll(directory.replaceAll('\\', '/'), '<source>') }));
  };
  const production = diagnostics(root), current = diagnostics(sourceRoot), available = new Map();
  for (const value of production) { const key = JSON.stringify(value); available.set(key, (available.get(key) ?? 0) + 1); }
  const added = [];
  for (const value of current) { const key = JSON.stringify(value), remaining = available.get(key) ?? 0; if (remaining) available.set(key, remaining - 1); else added.push(value); }
  const result = { productionDiagnostics: production.length, currentDiagnostics: current.length, addedDiagnostics: added, noAddedDiagnostics: !added.length,
    productionDiagnosticsByFile: production, comparison: 'relative-file-code-message-multiset-line-independent-source-root-normalized' };
  await fs.writeFile(path.join(trial, 'delta-typecheck.json'), JSON.stringify(result, null, 2) + '\n');
  if (added.length) throw Error('new_type_errors_see_delta_typecheck');
  return { ...result, productionDiagnosticsByFile: undefined };
}
async function compiledOriginReadback(directory, selected) {
  const found = new Set(); let literalUses = 0, filesWithOrigin = 0;
  for (const file of await list(directory)) if (file.endsWith('.js')) {
    let uses = 0;
    for (const value of (await fs.readFile(file, 'utf8')).matchAll(/http:\/\/(?:\d{1,3}\.){3}\d{1,3}:\d+\b/g)) { found.add(value[0]); literalUses++; uses++; }
    if (uses) filesWithOrigin++;
  }
  if (found.size !== 1 || !found.has(selected.value)) throw Error('compiled_origin_not_exact_selected_bridge');
  return { originSha256: selected.sha256, bridgePort, literalUses, filesWithOrigin, otherOrigins: 0 };
}
async function separateMaps() {
  const records = [];
  for (const file of await list(bundleRoot)) if (file.endsWith('.map')) {
    const name = path.relative(bundleRoot, file), destination = path.join(trial, 'source-maps', name), bytes = await fs.readFile(file), map = JSON.parse(bytes);
    if (map.version !== 3 || !Array.isArray(map.sources) || typeof map.mappings !== 'string') throw Error('source_map_invalid');
    await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.rename(file, destination);
    records.push({ file: name.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes), sourceCount: map.sources.length, mappings: map.mappings.length });
  }
  if (!records.length) throw Error('hidden_source_maps_missing');
  return { directory: relative(path.join(trial, 'source-maps')), count: records.length, bytes: records.reduce((sum, row) => sum + row.bytes, 0), records };
}
async function main() {
  const operation = process.argv[2] ?? 'prepare'; if (!['prepare', 'refresh-unbuilt', 'build', 'inspect', 'typecheck'].includes(operation)) throw Error('use_prepare_refresh-unbuilt_build_inspect_typecheck');
  if ((await fs.realpath(path.dirname(trial))).toLowerCase() !== path.join(await fs.realpath(work), 'tmp').toLowerCase()) throw Error('task_scope_mismatch');
  const template = await templates();
  if (operation === 'prepare' || operation === 'refresh-unbuilt') {
    const refreshing = operation === 'refresh-unbuilt';
    if (!refreshing) await absent(trial);
    else {
      const prior = await readJson(manifestPath);
      if (prior.scope !== scope || prior.result !== null || prior.buildGeneration !== buildGeneration || path.resolve(root, prior.sourceDirectory) !== sourceRoot) throw Error('only_own_unbuilt_preparation_can_refresh');
      await absent(bundleRoot); await absent(projectRoot);
      // Preserve each unbuilt preparation attempt; never reuse an archive or
      // rebuild a frozen candidate. A few integration repairs are still one
      // source candidate, not a chain of new phone generations.
      let archive;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const next = path.join(trial, 'preparation-attempt-' + attempt);
        try { await fs.mkdir(next); archive = next; break; }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
      if (!archive) throw Error('unbuilt_preparation_attempt_limit');
      for (const name of ['manifest.json', 'delta-typecheck.json', 'affected-contract-checks.log']) {
        let bytes;
        try { bytes = await fs.readFile(path.join(trial, name)); }
        catch (error) { if (name !== 'manifest.json' && error.code === 'ENOENT') continue; throw error; }
        await fs.writeFile(path.join(archive, name), bytes, { flag: 'wx' });
      }
    }
    const selectedFiles = [...sourceFiles]; for (const location of sourceLocations) for (const file of await list(path.join(root, location))) selectedFiles.push(relative(file));
    const productionSourceBindings = {}; for (const file of [...new Set(selectedFiles)].sort()) productionSourceBindings[file] = sha(await fs.readFile(path.join(root, file)));
    if (Object.keys(productionSourceBindings).some(file => /\/r17-/.test(file))) throw Error('production_source_contains_r17');
    const selectedOrigin = await origin(), builderSha256 = sha(await fs.readFile(fileURLToPath(import.meta.url)));
    const templateBindings = Object.fromEntries(Object.entries(template).map(([name, value]) => [name, sha(value)]));
    const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true });
    const bindingInput = { meaning: 'pre-build-current-production-source-and-task-template-binding-not-bundle-bytes', mode: 'normal', variant: d1TerrainWait ? 'terrain-wait' : 'baseline', buildGeneration, probeVersion,
      productionHead: stdout.trim(), productionSourceSha256: sha(JSON.stringify(productionSourceBindings)), builderSha256, templateBindings,
      bridgePort, transport: usbReverse ? 'usb-reverse' : 'lan', compiledBridgeOriginSha256: selectedOrigin.sha256,
      ...(currentUi ? { uiSource: 'current-production-source' } : {}),
      ...(skyPackage ? { r27SkyPackage: 'shared-query-ports-without-map-task-observers' } : {}),
      ...(firstAcceptedCosts ? { firstAcceptedCosts: 'same-accepted-identity-existing-spans-v1-without-memory-or-map-observers' } : {}),
      ...(d2Current ? { d2Decode: 'module-load-logical-claims-checkpoint-v2-no-r26-r27-or-map-observers' } : {}),
      ...(d2GpuResources ? { d2GpuResources: 'owner-scalars-fixed-phases-surface-retirement-v2' } : {}),
      ...(d2TimeObservation ? { d2TimeObservation: 'current-input-preparation-accepted-chain-with-geometry-v1' } : {}),
      ...(d1TerrainWait ? { terrainWait: 'current-gesture-file-native-boundaries-v3' } : {}),
      ...(observationA1 ? { observationRevision: 'observe-a1', ...(terrainWait ? { terrainWaitAction: 'gesture' } : {}), ...(rulerEntry ? { rulerEntry: nativeAdmission ? 'immediate-wide-time-v2' : 'immediate-wide-time-v1' } : {}),
        ...(nativeAdmission ? { manualInput: 'legal-onPreview-start-delay-0-v1' } : {}),
        ...(nativeRegion ? { nativeRegionProbe: reviewRevision >= 15
          ? 'one-gesture-begin-mid-end-and-native-updates-v2-local-usb-only' : 'one-gesture-begin-mid-end-v1-local-usb-only' } : {}),
        ...(geometryStages ? { geometryStages: 'logical-client-validated-current-hook-admission-v1' } : {}),
        ...(retirementReceipt ? { surfaceRetirement: 'single-source-bound-ready-retire-v1', normalPlayTrialMs } : {}),
        ...(reviewRevision > 1 ? { reviewRevision } : {}) } : {}) };
    const buildSourceSha256 = sha(JSON.stringify(bindingInput)), prepared = await preparedSources(productionSourceBindings, template, buildSourceSha256);
    const manifest = { scope, createdAt: new Date().toISOString(), mode: 'normal', variant: d1TerrainWait ? 'terrain-wait' : 'baseline', buildGeneration, probeVersion, bridgePort,
      trialDirectory: relative(trial), sourceDirectory: relative(sourceRoot), builderSha256, templateBindings, bindingInput, buildSourceSha256,
      productionSourceBindings, sourceBindings: {}, instrumentation: prepared.instrumentation, result: null };
    await fs.mkdir(trial, { recursive: true });
    for (const [file, bytes] of Object.entries(prepared.output)) { const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.writeFile(destination, bytes, { flag: refreshing ? 'w' : 'wx' }); manifest.sourceBindings[file] = sha(bytes); }
    if (!refreshing) for (const link of ['node_modules', 'apps/wechat-miniapp/node_modules']) await fs.symlink(await fs.realpath(path.join(root, link)), path.join(sourceRoot, link), 'junction');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: refreshing ? 'w' : 'wx' });
    manifest.checks = await verifyCurrent(manifest, template); await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ prepared: true, buildGeneration, probeVersion, files: Object.keys(manifest.sourceBindings).length, buildSourceSha256, checks: manifest.checks })); return;
  }
  const manifest = await readJson(manifestPath), checks = await verifyCurrent(manifest, template);
  if (operation === 'typecheck') { console.log(JSON.stringify(await deltaTypecheck())); return; }
  if (operation === 'build') {
    await absent(bundleRoot); await absent(projectRoot); if (manifest.result) throw Error('already_built');
    manifest.deltaTypecheck = await deltaTypecheck();
    const selectedOrigin = await origin(); if (selectedOrigin.sha256 !== manifest.bindingInput.compiledBridgeOriginSha256) throw Error('origin_binding_changed');
    const env = { ...process.env, MINIAPP_ISOLATED_CHECK_BUILD: '1', MINIAPP_ISOLATED_CHECK_BUILD_SLOT: slot, MINIAPP_API_BASE: selectedOrigin.value, MINIAPP_SKY_RESOURCE_BASE: selectedOrigin.value };
    for (const key of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE', 'MINIAPP_ISOLATED_FIXTURE_BUILD', 'MINIAPP_ACCEPTANCE_DIAGNOSTICS', 'MINIAPP_DEVICE_REQUEST_DIAGNOSTICS', 'MINIAPP_OPERATOR_PREVIEW_TOKEN', 'MINIAPP_RELEASE_BUNDLE_ID', 'MINIAPP_SKY_FEEDBACK_ID']) delete env[key];
    const redact = value => String(value ?? '').replaceAll(selectedOrigin.value, '[physical-local-bridge]').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip-redacted]').replace(/\bwx[a-f0-9]{16}\b/gi, '[appid-redacted]');
    try { const result = await run(process.execPath, [path.join(root, 'tools/run-node.cjs'), '--bin', '@tarojs/cli', 'taro', 'build', '--type', 'weapp'], { cwd: path.join(sourceRoot, 'apps/wechat-miniapp'), env, windowsHide: true, maxBuffer: 40 * 1024 * 1024 }); await fs.writeFile(path.join(trial, 'build-redacted.log'), redact(result.stdout) + '\n' + redact(result.stderr)); }
    catch (error) { await fs.writeFile(path.join(trial, 'build-redacted.log'), redact(error.stdout) + '\n' + redact(error.stderr)); throw Error('complete_source_build_failed_see_task_log'); }
    const sourceMaps = await separateMaps(); await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const originReadback = await compiledOriginReadback(bundleRoot, selectedOrigin), inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
    await fs.mkdir(projectRoot); const config = await readJson(path.join(sourceRoot, 'apps/wechat-miniapp/project.config.json'));
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot;
    config.projectname = d1TerrainWait ? 'starward-d1-terrain-wait-gen38' : d2TimeObservation ? 'starward-d2-time-observation-gen37' : d2GpuResources ? 'starward-d2-gpu-resources-gen36' : d2Current ? 'starward-d2-current-gen35' : observationA1 ? 'starward-r17-normal-a1' + reviewSuffix + '-gen' + buildGeneration : 'starward-r17-normal-baseline-v3-gen25';
    if (config.setting) delete config.setting.useCompilerPlugins;
    await fs.writeFile(path.join(projectRoot, 'project.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
    await fs.cp(bundleRoot, path.join(projectRoot, 'weapp'), { recursive: true, errorOnExist: true, force: false });
    const copy = await fingerprintBundle(path.join(projectRoot, 'weapp')); if (copy.sha256 !== fingerprint.sha256) throw Error('bundle_copy_mismatch');
    manifest.result = { bundleDirectory: relative(bundleRoot), projectDirectory: relative(projectRoot), bundleSha256: fingerprint.sha256, fileCount: fingerprint.fileCount, totalBytes: fingerprint.totalBytes,
      packages: budget.packages, mainHeadroomBytes: budget.limits.perPackageBytes - budget.packages.main.bytes, staticChecks: inspection.checks,
      compiledBridgeOriginSha256: selectedOrigin.sha256, inheritedOriginSha256: selectedOrigin.inheritedSha256, bridgePort, originReadback, sourceMaps };
    manifest.checks = checks; await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, buildGeneration, probeVersion, ...manifest.result, sourceMaps: { count: sourceMaps.count, bytes: sourceMaps.bytes, directory: sourceMaps.directory } })); return;
  }
  if (!manifest.result) throw Error('full_source_build_required');
  await assertPhysicalDeviceBundleSafe(bundleRoot); const bothBundleCopiesReadback = {};
  for (const directory of [bundleRoot, path.join(projectRoot, 'weapp')]) { const value = await fingerprintBundle(directory); if (value.sha256 !== manifest.result.bundleSha256) throw Error('bundle_readback_mismatch'); bothBundleCopiesReadback[relative(directory)] = value.sha256; }
  const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) }); if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
  for (const row of manifest.result.sourceMaps.records) if (sha(await fs.readFile(path.join(trial, 'source-maps', row.file))) !== row.sha256) throw Error('external_source_map_changed');
  const sourceDeltas = Object.keys(manifest.sourceBindings).filter(file => manifest.sourceBindings[file] !== manifest.productionSourceBindings[file]).map(file => ({ file, productionSha256: manifest.productionSourceBindings[file] ?? null, diagnosticSha256: manifest.sourceBindings[file] }));
  const evidence = { scope, status: d1TerrainWait ? 'BUILD_READY_D1_TERRAIN_WAIT_UNACTIVATED_PHONE_UNVERIFIED' : d2TimeObservation ? 'BUILD_READY_D2_TIME_OBSERVATION_UNACTIVATED_PHONE_UNVERIFIED' : d2GpuResources ? 'BUILD_READY_D2_GPU_RESOURCES_UNACTIVATED_PHONE_UNVERIFIED' : d2Current ? 'BUILD_READY_D2_DECODE_UNACTIVATED_PHONE_UNVERIFIED' : observationA1 ? 'BUILD_READY_NORMAL_A1_UNACTIVATED_PHONE_UNVERIFIED' : 'BUILD_READY_NORMAL_BASELINE_V3_UNACTIVATED_PHONE_UNVERIFIED',
    ...(observationA1 ? { observationRevision: 'observe-a1', diagnosticLabel: normalLabel, ...(terrainWait ? { terrainWaitAction: 'gesture' } : {}), protocol: protocolName,
      ...(reviewRevision > 1 && !d2Current ? { reviewRevision,
        historicalA1OwnerArchive: historicalOwnerArchive,
        historicalA1Manifest: relative(path.join(work, reviewRevision >= 3 ? `tmp/r17-normal-a1-review-r${reviewRevision - 1}/manifest.json` : 'tmp/r17-normal-a1/manifest.json')) } : {}),
      ...(!d2Current ? { historicalGen25OwnerArchive: relative(path.join(work, 'tmp/r17-normal-gen25-owner-before-a1-20261019/archive-bindings.json')) } : {}) } : {}),
    preparedAt: new Date().toISOString(), mode: 'normal', variant: d1TerrainWait ? 'terrain-wait' : 'baseline', buildGeneration, probeVersion,
    selection: 'UNACTIVATED_PREPARATION', sourceManifest: relative(manifestPath), sourceManifestSha256: sha(await fs.readFile(manifestPath)), sourceDirectory: relative(sourceRoot),
    sourceFiles: Object.keys(manifest.sourceBindings).length, sourceSnapshotSha256: sha(JSON.stringify(manifest.sourceBindings)), buildSourceSha256: manifest.buildSourceSha256,
    bindingInput: manifest.bindingInput, sourceDeltas, templateBindings: manifest.templateBindings, productionSourceReadback: { files: Object.keys(manifest.productionSourceBindings).length, bindingsSha256: sha(JSON.stringify(manifest.productionSourceBindings)), unchanged: true },
    completeSourceBuildNotGeneratedPatch: true, currentSourceReadback: true, bothBundleCopiesReadback, checks, deltaTypecheck: manifest.deltaTypecheck, result: manifest.result,
    limitations: d1TerrainWait ? [
      'Current-source task-only gesture/metadata/file/native-operation association, not physical presentation or product acceptance.',
      'Manual arm, bounded 15-second observation and sealed immutable export; no product camera/time/layer writes.',
      'Native callbacks and file-owner scalars cannot establish physical resource release; correct visible coverage requires the matching phone frames.',
      'No Sky/R17 timing, Page sampling, GPU or memory-lifetime probes are injected.',
      'A separately declared non-8787/non-8798 bridge is required. Existing API, GPU collector, old evidence and frozen generations remain untouched.'
    ] : d2TimeObservation ? [
      'Current-source task-only input/preparation/request/copy-and-publish chain, not physical presentation or product acceptance.',
      'R17 v3 wall clock, weak identities, 45-second diagnostic cutoff and 32-KiB immutable single-flight export are reused; diagnostics never start or pause product Play.',
      'Unobserved Page, GPU, memory, BSC/SAO population and image workload facts are omitted, not synthesized as zero.',
      'Explicit chain truncation, unknown links and clock intervals remain unverified. Geometry client validation is distinct from current hook admission.',
      'A separately declared non-8787/non-8798 bridge port is required; old GPU collector/evidence are not restarted or reused.',
      'No phone, service, database, account, firewall, active candidate or frozen generation is changed by preparation. Hidden source maps stay outside the phone package.'
    ] : d2Current ? [d2GpuResources ? 'This is an unactivated task-only GPU logical-owner observation using the existing decode/lifecycle branch, not product acceptance or a complete R17 timing/Scene probe.' : 'This is an unactivated task-only decode/lifecycle preparation, not product acceptance or a complete R17 timing/Scene probe.',
      'No phone, DevTools, feedback binding, service, account, database, firewall or active candidate was changed.',
      'Only current artwork-request callbacks and explicit image claims are counted from module load; cancellation without callback is cumulative unconfirmed work, not current native in-flight work.',
      'Weak image identity and logical pixels do not establish native/GPU bytes or physical release. Stellar/upload witness sites are not instrumented; zero calls are not a population count.',
      'The user arms the existing bounded checkpoints before normal product Play; diagnostics never start or pause product playback. Pause/drain/exit, ordinary sustained Play and OOM still need target evidence.',
      'The existing collector route, 32768-byte and 32-file limits remain. Historical NativeRegion validator input is missing locally and that packet family fails explicitly with 503 until the original input is restored.',
      'The future LAN origin and collector/HTTP readback remain unverified. Hidden source maps stay outside the phone bundle.' ] : ['No phone, DevTools, feedback, service, account, database, private configuration or active candidate was changed.',
      'Normal product math, memo, full accepted setter/state, GPU/copy/caption/resource demand and retirement remain; observation adds bounded counts/spans, preparation identities and a task menu.',
      'v3 Date.now intervals are approximate wall elapsed, not thread CPU or physical presentation; unknown and sub-resolution coverage stay null.',
      'Page observer latency retains its legacy producer clock semantics and is not calibrated by probe v3; key count is not payload bytes; 16 bounded serialization samples add observer cost.',
      'Native measureText and returned-copy counters add numeric call-site overhead, no native method replacement/cache/history/context retention; unobserved scalar fields stay null.',
      d2Current ? 'Current-source decode observation retains 15s metrics, the original 20s guarded same-run Pause and bounded drain/retirement checkpoints. Logical callbacks/claims do not establish native in-flight work, physical residency, sustained Play acceptance or an OOM cause; no Map/R26/R27 observer or USB reverse is selected.' : skyPackage ? 'R27 retains 15s metrics, the 20s guarded same-run product Pause and the 90s seal. Original active-5/first-drain-10 observations, eight aggregate IDs and bounded exports remain; no Map task observer is injected. This does not establish official package admission or a retaining root.' : retirementReceipt ? '15s metrics retain their historical window; r9 and r10 use a 60s guarded same-run Pause. Pause relative timestamps beyond the existing 60s clock range stay null. Root owns at least 30s paused drain and source-bound own-key readback; no full-B or GPU-retention claim follows from this receipt.' : '15s metrics and 20s guarded same-run Pause/terminal remain separate windows; profiling/memory windows must be aligned by root.',
      'Hidden source maps are external diagnostic artifacts, absent from both phone bundle copies.',
      'Static budget/inspection and portable fixtures do not establish official upload size, current bridge admission, real nonempty Sky, target clock coverage, sustainable playback or R17 A/B acceptance.'] };
  await fs.writeFile(path.join(work, preparationName), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ inspected: true, status: evidence.status, sourceManifestSha256: evidence.sourceManifestSha256, sourceSnapshotSha256: evidence.sourceSnapshotSha256, buildSourceSha256: evidence.buildSourceSha256, bundleSha256: evidence.result.bundleSha256, totalBytes: evidence.result.totalBytes, checks }));
}
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) await main();
