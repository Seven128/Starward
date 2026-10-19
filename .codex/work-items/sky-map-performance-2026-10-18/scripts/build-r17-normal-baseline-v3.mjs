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
import { addR17RulerEntry } from './r17-ruler-entry-instrumentation.mjs';
import { addR17RulerEntryV2 } from './r17-ruler-entry-v2-instrumentation.mjs';
import { addR17NormalInput } from './r17-normal-input-instrumentation.mjs';
import { terrainWaitSourceFiles, transformTerrainWaitSources } from './inject-terrain-wait-observer.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), work = path.resolve(here, '..'), root = path.resolve(here, '../../../..');
const revisionArgs = process.argv.slice(3), observationA1 = revisionArgs.includes('--observe-a1');
const reviewRevision = revisionArgs.includes('--review-r10') ? 10 : revisionArgs.includes('--review-r9') ? 9 : revisionArgs.includes('--review-r8') ? 8 : revisionArgs.includes('--review-r7') ? 7 : revisionArgs.includes('--review-r6') ? 6 : revisionArgs.includes('--review-r5') ? 5 : revisionArgs.includes('--review-r4') ? 4 : revisionArgs.includes('--review-r3') ? 3 : revisionArgs.includes('--review-r2') ? 2 : 1;
const rulerEntry = reviewRevision >= 5, nativeAdmission = reviewRevision >= 6, retirementReceipt = reviewRevision >= 9;
if (revisionArgs.some(value => !['--review-r2', '--review-r3', '--review-r4', '--review-r5', '--review-r6', '--review-r7', '--review-r8', '--review-r9', '--review-r10', '--observe-a1'].includes(value)) || new Set(revisionArgs).size !== revisionArgs.length ||
    revisionArgs.filter(value => ['--review-r2', '--review-r3', '--review-r4', '--review-r5', '--review-r6', '--review-r7', '--review-r8', '--review-r9', '--review-r10'].includes(value)).length > 1 || reviewRevision >= 3 && !observationA1)
  throw Error('finite_normal_revision_required');
const reviewSuffix = reviewRevision > 1 ? '-review-r' + reviewRevision : '';
const trialName = (observationA1 ? 'r17-normal-a1' : 'r17-normal-baseline-v3') + reviewSuffix;
const trial = path.join(work, 'tmp/' + trialName), sourceRoot = path.join(trial, 'source'), projectRoot = path.join(trial, 'project');
const feature = 'apps/wechat-miniapp/src/features/sky/', pagePath = feature + 'spot-sky-page.tsx';
const slot = observationA1 ? trialName : reviewRevision === 2 ? 'r17-normal-v3-r2' : trialName;
const buildGeneration = observationA1 ? 27 : 25, bridgePort = 8798;
const normalLabel = observationA1 ? '正常Sky关联 A1' + (reviewRevision > 1 ? ' r' + reviewRevision : '') : '正常Sky基线 v3';
const protocolName = nativeAdmission ? 'r17-normal-input-protocol.mjs' : rulerEntry ? 'r17-ruler-entry-protocol.mjs' : observationA1 ? 'r17-a-correlation-protocol.mjs' : 'r17-phone-probe-v3-protocol.mjs';
const preparationName = observationA1 ? 'R17-NORMAL-A1-PREPARATION.json' : 'R17-NORMAL-BASELINE-V3-PREPARATION.json';
const bundleRoot = path.join(sourceRoot, 'apps/wechat-miniapp/dist/weapp-check-' + slot), manifestPath = path.join(trial, 'manifest.json');
const scope = observationA1 ? 'TASK_ONLY_NORMAL_SKY_A1_TERRAIN_WAIT_NOT_PRODUCT_ACCEPTANCE' : 'TASK_ONLY_NORMAL_SKY_BASELINE_V3_NOT_PRODUCT_ACCEPTANCE';
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
const templateNames = ['r17-phone-probe-v3-runtime.ts', 'r17-phone-probe-v3-protocol.mjs', 'r17-phone-probe-v3.test.mjs',
  'r17-phone-probe-v2-protocol.mjs', 'r17-phone-probe-protocol.mjs', 'r17-accepted-action-controls.tsx',
  'r17-page-bridge-observer.ts', 'r17-normal-observations.ts', 'r17-normal-baseline-v3-fixture.mjs'];
if (observationA1) templateNames.push('r17-a-correlation-runtime.ts', 'r17-a-correlation-instrumentation.mjs',
  'r17-a-correlation-protocol.mjs', 'r17-a-correlation.test.mjs', 'inject-terrain-wait-observer.mjs',
  'terrain-wait-observer.ts', 'terrain-wait-marker.tsx', 'terrain-wait-observer.test.mjs');
if (rulerEntry) templateNames.push('r17-ruler-entry-runtime.ts', 'r17-ruler-entry-instrumentation.mjs',
  'r17-ruler-entry-protocol.mjs', 'r17-ruler-entry.test.mjs');
if (nativeAdmission) templateNames.push('r17-ruler-entry-v2-instrumentation.mjs', 'r17-normal-input-instrumentation.mjs',
  'r17-normal-input-protocol.mjs', 'r17-normal-input.test.mjs');
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
    source = one(source, '    r17NormalSurfaceRetired();\n    retireSelection();\n' +
      '    // Each retirement step is independent; losing a native context must not\n' +
      '    // leave the other backing store or a retained Sources surface alive.\n' +
      '    try { gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* already unavailable */ }\n' +
      '    try { if (node) node.width = 0; } catch { /* native node retired */ }\n' +
      '    try { if (node) node.height = 0; } catch { /* native node retired */ }\n' +
      '    try { display.width = 0; } catch { /* native node retired */ }\n' +
      '    try { display.height = 0; } catch { /* native node retired */ }',
      '    r17NormalSurfaceRetired();\n' +
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
  source = one(source, '      surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions);\n      attempt.publish(excludedNameKeys);',
    '      r17Probe.measure("displayCopy",()=>surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions));\n' +
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
  source = one(source, '    setTimeIntent(observationTime.play(Date.now()));',
    '    setTimeIntent(observationTime.play(Date.now()));\n    r17NormalProductPlayStarted(observationTime.snapshot().runStartAt);', 'normal_guarded_product_play');
  return one(source, '  </SkyNavigationMenu>;', '    <R17PhoneProbeControls onPrepareFov={fov => { if (!skyDisplayCurrent()) return; stopBrowsingAnimation(); setVerticalFovDeg(fov); setSkyControlPanel(null); }} onStart={key => setSkyControlPanel(key.endsWith("-camera") ? null : "time")} />\n  </SkyNavigationMenu>;', 'task_only_menu');
}
export async function preparedSources(normal, template, binding) {
  const output = {}, instrumentation = {};
  for (const file of Object.keys(normal)) output[file] = await fs.readFile(path.join(root, file));
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
  edit('sky-canvas-lifecycle.ts', source => {
    source = one(source, '      latest = frame;\n      revision++;', '      r17Probe.prepared(frame);\n      latest = frame;\n      revision++;', 'normal_request');
    source = one(source, '    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;',
      '    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;\n    r17Probe.paintStarted(frame);', 'normal_paint');
    source = one(source, '        finished = true;', '        finished = true;\n        r17Probe.callback(frame);', 'normal_callback');
    return probeImport(wrapCalls(source, value => value === 'port.paint', call => 'r17Probe.measure("nativePaintOwner",()=>'+call.replace('port.paint(context,', 'port.paint(context!,')+')', 'normal_paint_span').source);
  });
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
      nativeObjectsRetained: false, perFrameSerialization: false, normalPlayTrialMs: 60000, metricsExportMs: 15000,
      afterPauseDrainMinimumMs: 30000, drainOwner: 'root-existing-device-and-process-observation' };
    return observed.source;
  });
  edit('spot-sky-page.tsx', source => normalPage(source, reviewRevision >= 10));
  // Hidden maps preserve exact emitted positions without shipping map payloads
  // or adding sourceMappingURL loads to the phone bundle.
  const configPath = 'apps/wechat-miniapp/config/index.ts';
  const configBefore = output[configPath];
  let config = configBefore.toString('utf8').replaceAll('\r\n', '\n');
  config = one(config, '        resolve: { symlinks(value: boolean): void };', '        resolve: { symlinks(value: boolean): void };\n        devtool(value: string): void;', 'hidden_maps_type');
  config = one(config, '        chain.resolve.symlinks(false);', '        chain.resolve.symlinks(false);\n        chain.devtool("hidden-source-map");', 'hidden_maps');
  output[configPath] = config; instrumentation[configPath] = { beforeSha256: sha(configBefore), afterSha256: sha(config) };
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
  const runtime = await readJson('C:/Users/777/AppData/Local/Temp/starward-sky-phone-runtime-SWXIAP/runtime.json');
  const selected = new URL(runtime.apiOrigin);
  if (selected.protocol !== 'http:' || !['8797', '8798'].includes(selected.port) || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(selected.hostname) || selected.hostname.startsWith('127.') || selected.hostname === '0.0.0.0' || selected.username || selected.password || selected.search || selected.hash || selected.pathname !== '/') throw Error('physical_runtime_origin_boundary_changed');
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
  const { verifyNormalBaselineV3Fixture } = await import(pathToFileURL(path.join(here, 'r17-normal-baseline-v3-fixture.mjs')));
  return verifyNormalBaselineV3Fixture({ sourceRoot, productionRoot: root, feature, ts, buildGeneration,
    protocolPath: path.join(here, protocolName), allowACorrelation: observationA1, allowRulerEntry: rulerEntry,
    retirementObservation: retirementReceipt, requestedPreparation: reviewRevision >= 10 });
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
      const archive = path.join(trial, 'preparation-attempt-1'); await fs.mkdir(archive);
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
    const bindingInput = { meaning: 'pre-build-current-production-source-and-task-template-binding-not-bundle-bytes', mode: 'normal', variant: 'baseline', buildGeneration, probeVersion: 3,
      productionHead: stdout.trim(), productionSourceSha256: sha(JSON.stringify(productionSourceBindings)), builderSha256, templateBindings,
      bridgePort, compiledBridgeOriginSha256: selectedOrigin.sha256,
      ...(observationA1 ? { observationRevision: 'observe-a1', terrainWaitAction: 'gesture', ...(rulerEntry ? { rulerEntry: nativeAdmission ? 'immediate-wide-time-v2' : 'immediate-wide-time-v1' } : {}),
        ...(nativeAdmission ? { manualInput: 'legal-onPreview-start-delay-0-v1' } : {}),
        ...(retirementReceipt ? { surfaceRetirement: 'single-source-bound-ready-retire-v1', normalPlayTrialMs: 60000 } : {}),
        ...(reviewRevision > 1 ? { reviewRevision } : {}) } : {}) };
    const buildSourceSha256 = sha(JSON.stringify(bindingInput)), prepared = await preparedSources(productionSourceBindings, template, buildSourceSha256);
    const manifest = { scope, createdAt: new Date().toISOString(), mode: 'normal', variant: 'baseline', buildGeneration, probeVersion: 3, bridgePort,
      trialDirectory: relative(trial), sourceDirectory: relative(sourceRoot), builderSha256, templateBindings, bindingInput, buildSourceSha256,
      productionSourceBindings, sourceBindings: {}, instrumentation: prepared.instrumentation, result: null };
    await fs.mkdir(trial, { recursive: true });
    for (const [file, bytes] of Object.entries(prepared.output)) { const destination = path.join(sourceRoot, file); await fs.mkdir(path.dirname(destination), { recursive: true }); await fs.writeFile(destination, bytes, { flag: refreshing ? 'w' : 'wx' }); manifest.sourceBindings[file] = sha(bytes); }
    if (!refreshing) for (const link of ['node_modules', 'apps/wechat-miniapp/node_modules']) await fs.symlink(await fs.realpath(path.join(root, link)), path.join(sourceRoot, link), 'junction');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: refreshing ? 'w' : 'wx' });
    manifest.checks = await verifyCurrent(manifest, template); await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ prepared: true, buildGeneration, probeVersion: 3, files: Object.keys(manifest.sourceBindings).length, buildSourceSha256, checks: manifest.checks })); return;
  }
  const manifest = await readJson(manifestPath), checks = await verifyCurrent(manifest, template);
  if (operation === 'typecheck') { console.log(JSON.stringify(await deltaTypecheck())); return; }
  if (operation === 'build') {
    await absent(bundleRoot); await absent(projectRoot); if (manifest.result) throw Error('already_built');
    manifest.deltaTypecheck = await deltaTypecheck();
    const selectedOrigin = await origin(); if (selectedOrigin.sha256 !== manifest.bindingInput.compiledBridgeOriginSha256) throw Error('origin_binding_changed');
    const env = { ...process.env, MINIAPP_ISOLATED_CHECK_BUILD: '1', MINIAPP_ISOLATED_CHECK_BUILD_SLOT: slot, MINIAPP_API_BASE: selectedOrigin.value, MINIAPP_SKY_RESOURCE_BASE: selectedOrigin.value };
    for (const key of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE', 'MINIAPP_ISOLATED_FIXTURE_BUILD', 'MINIAPP_ACCEPTANCE_DIAGNOSTICS', 'MINIAPP_DEVICE_REQUEST_DIAGNOSTICS', 'MINIAPP_OPERATOR_PREVIEW_TOKEN', 'MINIAPP_RELEASE_BUNDLE_ID', 'MINIAPP_SKY_FEEDBACK_ID']) delete env[key];
    const redact = value => String(value ?? '').replaceAll(selectedOrigin.value, '[physical-local-bridge-8798]').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip-redacted]').replace(/\bwx[a-f0-9]{16}\b/gi, '[appid-redacted]');
    try { const result = await run(process.execPath, [path.join(root, 'tools/run-node.cjs'), '--bin', '@tarojs/cli', 'taro', 'build', '--type', 'weapp'], { cwd: path.join(sourceRoot, 'apps/wechat-miniapp'), env, windowsHide: true, maxBuffer: 40 * 1024 * 1024 }); await fs.writeFile(path.join(trial, 'build-redacted.log'), redact(result.stdout) + '\n' + redact(result.stderr)); }
    catch (error) { await fs.writeFile(path.join(trial, 'build-redacted.log'), redact(error.stdout) + '\n' + redact(error.stderr)); throw Error('complete_source_build_failed_see_task_log'); }
    const sourceMaps = await separateMaps(); await assertPhysicalDeviceBundleSafe(bundleRoot);
    const fingerprint = await fingerprintBundle(bundleRoot), budget = await inspectReleaseBundleBudget(fingerprint, bundleRoot);
    const originReadback = await compiledOriginReadback(bundleRoot, selectedOrigin), inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) });
    if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
    await fs.mkdir(projectRoot); const config = await readJson(path.join(sourceRoot, 'apps/wechat-miniapp/project.config.json'));
    config.miniprogramRoot = 'weapp/'; delete config.srcMiniprogramRoot;
    config.projectname = observationA1 ? 'starward-r17-normal-a1' + reviewSuffix + '-gen27' : 'starward-r17-normal-baseline-v3-gen25';
    if (config.setting) delete config.setting.useCompilerPlugins;
    await fs.writeFile(path.join(projectRoot, 'project.config.json'), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
    await fs.cp(bundleRoot, path.join(projectRoot, 'weapp'), { recursive: true, errorOnExist: true, force: false });
    const copy = await fingerprintBundle(path.join(projectRoot, 'weapp')); if (copy.sha256 !== fingerprint.sha256) throw Error('bundle_copy_mismatch');
    manifest.result = { bundleDirectory: relative(bundleRoot), projectDirectory: relative(projectRoot), bundleSha256: fingerprint.sha256, fileCount: fingerprint.fileCount, totalBytes: fingerprint.totalBytes,
      packages: budget.packages, mainHeadroomBytes: budget.limits.perPackageBytes - budget.packages.main.bytes, staticChecks: inspection.checks,
      compiledBridgeOriginSha256: selectedOrigin.sha256, inheritedOriginSha256: selectedOrigin.inheritedSha256, bridgePort, originReadback, sourceMaps };
    manifest.checks = checks; await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ buildReady: true, buildGeneration, probeVersion: 3, ...manifest.result, sourceMaps: { count: sourceMaps.count, bytes: sourceMaps.bytes, directory: sourceMaps.directory } })); return;
  }
  if (!manifest.result) throw Error('full_source_build_required');
  await assertPhysicalDeviceBundleSafe(bundleRoot); const bothBundleCopiesReadback = {};
  for (const directory of [bundleRoot, path.join(projectRoot, 'weapp')]) { const value = await fingerprintBundle(directory); if (value.sha256 !== manifest.result.bundleSha256) throw Error('bundle_readback_mismatch'); bothBundleCopiesReadback[relative(directory)] = value.sha256; }
  const inspection = await inspectCandidate({ bundleDirectory: relative(bundleRoot) }); if (Object.values(inspection.checks).some(value => value !== true)) throw Error('static_inspection_failed');
  for (const row of manifest.result.sourceMaps.records) if (sha(await fs.readFile(path.join(trial, 'source-maps', row.file))) !== row.sha256) throw Error('external_source_map_changed');
  const sourceDeltas = Object.keys(manifest.sourceBindings).filter(file => manifest.sourceBindings[file] !== manifest.productionSourceBindings[file]).map(file => ({ file, productionSha256: manifest.productionSourceBindings[file] ?? null, diagnosticSha256: manifest.sourceBindings[file] }));
  const evidence = { scope, status: observationA1 ? 'BUILD_READY_NORMAL_A1_UNACTIVATED_PHONE_UNVERIFIED' : 'BUILD_READY_NORMAL_BASELINE_V3_UNACTIVATED_PHONE_UNVERIFIED',
    ...(observationA1 ? { observationRevision: 'observe-a1', diagnosticLabel: normalLabel, terrainWaitAction: 'gesture', protocol: protocolName,
      ...(reviewRevision > 1 ? { reviewRevision,
        historicalA1OwnerArchive: historicalOwnerArchive,
        historicalA1Manifest: relative(path.join(work, reviewRevision >= 3 ? `tmp/r17-normal-a1-review-r${reviewRevision - 1}/manifest.json` : 'tmp/r17-normal-a1/manifest.json')) } : {}),
      historicalGen25OwnerArchive: relative(path.join(work, 'tmp/r17-normal-gen25-owner-before-a1-20261019/archive-bindings.json')) } : {}),
    preparedAt: new Date().toISOString(), mode: 'normal', variant: 'baseline', buildGeneration, probeVersion: 3,
    selection: 'UNACTIVATED_PREPARATION', sourceManifest: relative(manifestPath), sourceManifestSha256: sha(await fs.readFile(manifestPath)), sourceDirectory: relative(sourceRoot),
    sourceFiles: Object.keys(manifest.sourceBindings).length, sourceSnapshotSha256: sha(JSON.stringify(manifest.sourceBindings)), buildSourceSha256: manifest.buildSourceSha256,
    bindingInput: manifest.bindingInput, sourceDeltas, templateBindings: manifest.templateBindings, productionSourceReadback: { files: Object.keys(manifest.productionSourceBindings).length, bindingsSha256: sha(JSON.stringify(manifest.productionSourceBindings)), unchanged: true },
    completeSourceBuildNotGeneratedPatch: true, currentSourceReadback: true, bothBundleCopiesReadback, checks, deltaTypecheck: manifest.deltaTypecheck, result: manifest.result,
    limitations: ['No phone, DevTools, feedback, service, account, database, private configuration or active candidate was changed.',
      'Normal product math, memo, full accepted setter/state, GPU/copy/caption/resource demand and retirement remain; observation adds bounded counts/spans, preparation identities and a task menu.',
      'v3 Date.now intervals are approximate wall elapsed, not thread CPU or physical presentation; unknown and sub-resolution coverage stay null.',
      'Page observer latency retains its legacy producer clock semantics and is not calibrated by probe v3; key count is not payload bytes; 16 bounded serialization samples add observer cost.',
      'Native measureText and returned-copy counters add numeric call-site overhead, no native method replacement/cache/history/context retention; unobserved scalar fields stay null.',
      retirementReceipt ? '15s metrics retain their historical window; r9 and r10 use a 60s guarded same-run Pause. Pause relative timestamps beyond the existing 60s clock range stay null. Root owns at least 30s paused drain and source-bound own-key readback; no full-B or GPU-retention claim follows from this receipt.' : '15s metrics and 20s guarded same-run Pause/terminal remain separate windows; profiling/memory windows must be aligned by root.',
      'Hidden source maps are external diagnostic artifacts, absent from both phone bundle copies.',
      'Static budget/inspection and portable fixtures do not establish official upload size, current bridge admission, real nonempty Sky, target clock coverage, sustainable playback or R17 A/B acceptance.'] };
  await fs.writeFile(path.join(work, preparationName), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ inspected: true, status: evidence.status, sourceManifestSha256: evidence.sourceManifestSha256, sourceSnapshotSha256: evidence.sourceSnapshotSha256, buildSourceSha256: evidence.buildSourceSha256, bundleSha256: evidence.result.bundleSha256, totalBytes: evidence.result.totalBytes, checks }));
}
if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) await main();
