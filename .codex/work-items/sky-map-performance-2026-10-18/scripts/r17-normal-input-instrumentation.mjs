// Finite r6 extension of the existing normal observation owner. No build or I/O.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('normal_input_boundary_changed:' + label);
  return source.replace(before, after);
}
export function addR17NormalInput({ runtime, controls, page }) {
  runtime = one(runtime, 'type CaseKey = "wide-camera"', 'type CaseKey = "manual-input" | "wide-camera"', 'finite_case');
  runtime = one(runtime, 'let active = false, armed = false, sealed = false, terminalSealed = false;',
    'let manualInputTrigger: 1 | 2 | null = null;\nlet active = false, armed = false, sealed = false, terminalSealed = false;', 'trigger_scalar');
  runtime = one(runtime, '  start(selected: CaseKey) {\n    stop();',
    '  start(selected: CaseKey, trigger?: 1 | 2) {\n    if (selected === "manual-input" && trigger !== 1 && trigger !== 2) return false;\n' +
    '    manualInputTrigger = selected === "manual-input" ? trigger! : null;\n    stop();', 'same_start_owner');
  runtime = one(runtime, '    armed = true;\n    arm = setTimeout(() => { arm = undefined; armed = false; active = true; startAt = now(); recordingStartRelativeMs = relative(startAt);\n      deadline = setTimeout(() => stop("limit"), 45000); }, 1000);',
    '    if (selected === "manual-input") {\n' +
    '      active = true; startAt = armedAt; recordingStartRelativeMs = relative(startAt);\n' +
    '      deadline = setTimeout(() => stop("limit"), 45000);\n' +
    '    } else {\n      armed = true;\n      arm = setTimeout(() => { arm = undefined; armed = false; active = true; startAt = now(); recordingStartRelativeMs = relative(startAt);\n' +
    '        deadline = setTimeout(() => stop("limit"), 45000); }, 1000);\n    }', 'manual_immediate_original_legacy_delay');
  runtime = one(runtime, 'schemaVersion: "starward-r17-phone-probe-v3", variant, runId, caseKey, clock: { ...metricsClock! },',
    'schemaVersion: caseKey === "manual-input" ? "starward-r17-phone-probe-v3-manual-input" : "starward-r17-phone-probe-v3", variant, runId, caseKey, clock: { ...metricsClock! },', 'explicit_schema');
  runtime = one(runtime, 'window: { startDelayMs: 1000, durationLimitMs: 45000, elapsedMs: windowElapsed.elapsedMs, elapsedStatus: windowElapsed.status, reason }, sampleLimit: SAMPLE_LIMIT,',
    'window: { startDelayMs: caseKey === "manual-input" ? 0 : 1000, durationLimitMs: 45000, elapsedMs: windowElapsed.elapsedMs, elapsedStatus: windowElapsed.status, reason }, sampleLimit: SAMPLE_LIMIT,\n' +
    '      ...(caseKey === "manual-input" ? { manualInput: { schemaVersion: "starward-r17-manual-input-v1", trigger: manualInputTrigger,\n' +
    '        boundary: "legal-onPreview-before-preview-intent" } } : {}),', 'manual_contract');
  runtime = one(runtime, '  terminalSnapshot() {\n    if (!sealed || !runId) return null;',
    '  terminalSnapshot() {\n    if (caseKey === "manual-input" || !sealed || !runId) return null;', 'manual_has_no_play_terminal');

  controls = one(controls, 'import { useEffect, useRef, useState } from "react";',
    'import { useEffect, useMemo, useRef, useState } from "react";', 'scalar_scope_lifetime');
  controls = one(controls, 'import { r17RulerEntry } from "./r17-ruler-entry-runtime";',
    'import { r17RulerEntry, r17ProbePayloadBytes } from "./r17-ruler-entry-runtime";', 'same_utf8_writer_budget');
  if (controls.split('serialized.length > 32768').length !== 3) throw Error('normal_input_boundary_changed:utf8_writer_guards');
  controls = controls.replaceAll('serialized.length > 32768', 'r17ProbePayloadBytes(serialized) > 32768');
  controls = one(controls, 'const cases = ["wide-camera", "wide-time", "wide-play", "narrow-camera", "narrow-time", "narrow-play"] as const;',
    'const cases = ["manual-input", "wide-camera", "wide-time", "wide-play", "narrow-camera", "narrow-time", "narrow-play"] as const;', 'one_manual_arm');
  controls = one(controls, 'let armedPlay: CaseKey | null = null, status =',
    'let armedManualOwner: number | null = null, manualMeasurement = false, inputOwnerSequence = 0, currentInputOwner = 0;\nlet armedPlay: CaseKey | null = null, status =', 'manual_scalar_state');
  controls = one(controls, 'generation++; clearAutoExport(); armedPlay = null; measurementStarted = false;',
    'generation++; clearAutoExport(); armedPlay = null; armedManualOwner = null; manualMeasurement = false; measurementStarted = false;', 'all_retirement_same_owner');
  controls = one(controls, 'async function exportDiagnostic() {\n  if (exporting) return;',
    'async function exportDiagnostic() {\n  if (exporting) return;\n' +
    '  if (armedManualOwner !== null) { publishStatus(`${label}，等待实际时间输入`); return; }', 'armed_not_started_export');
  controls = one(controls, 'function beginMeasurement(caseKey: CaseKey) {',
    'function beginMeasurement(caseKey: CaseKey, trigger?: 1 | 2) {', 'same_measurement');
  controls = one(controls, '  r17Probe.start(caseKey);', '  r17Probe.start(caseKey, trigger);', 'pass_finite_trigger');
  controls = one(controls, '  if (caseKey.endsWith("-play")) { armedPlay = caseKey;',
    '  if (caseKey === "manual-input") {\n' +
    '    if (!currentInputOwner) { publishStatus(`${label}，时间输入尚未就绪`); return false; }\n' +
    '    armedManualOwner = currentInputOwner; publishStatus(`${label}，等待实际时间输入`);\n' +
    '  } else if (caseKey.endsWith("-play")) { armedPlay = caseKey;', 'arm_no_timer');
  controls = one(controls, '// Only the original guarded normal Play start calls this; never autoplay.',
    '// Scope changes retire only the manual observation. No product state or scheduler is written.\n' +
    'function retireManualInput() { if (armedManualOwner !== null || manualMeasurement) cancelDiagnostic(); }\n' +
    'export function useR17NormalInputScope(contextOwner: object, binding: string, committedAt: string, revision: number) {\n' +
    '  const owner = useMemo(() => inputOwnerSequence < 1e12 ? ++inputOwnerSequence : 0, [contextOwner, binding, committedAt, revision]);\n' +
    '  if (currentInputOwner !== owner) { retireManualInput(); currentInputOwner = owner; }\n' +
    '  useEffect(() => () => { if (currentInputOwner === owner) { retireManualInput(); currentInputOwner = 0; } }, [owner]);\n' +
    '}\n' +
    '// Called only after the real six-field/ruler onPreview guards, before its original intent publication.\n' +
    'export function r17NormalManualInputStarted(trigger: 1 | 2) {\n' +
    '  if (armedManualOwner === null || armedManualOwner !== currentInputOwner || exporting || (trigger !== 1 && trigger !== 2)) return false;\n' +
    '  armedManualOwner = null; manualMeasurement = true; beginMeasurement("manual-input", trigger); return true;\n' +
    '}\n// Only the original guarded normal Play start calls this; never autoplay.', 'scope_and_legal_input_start');
  controls = one(controls, '完整正常Sky；按正常Play开始计量，15秒导出，20秒同次正常暂停',
    '完整正常Sky；manual-input等实际时间输入，15秒导出；正常Play仍20秒同次暂停', 'task_copy');
  controls = one(controls, 'caseKey.endsWith("-play") ? "待命" : "开始"',
    'caseKey === "manual-input" || caseKey.endsWith("-play") ? "待命" : "开始"', 'manual_arm_label');

  page = one(page, 'useR17NormalStop, r17NormalProductPlayStarted } from "./r17-phone-probe-controls";',
    'useR17NormalStop, r17NormalProductPlayStarted, useR17NormalInputScope, r17NormalManualInputStarted } from "./r17-phone-probe-controls";', 'same_owner_import');
  page = one(page, '  const timeBinding = activeContext ? `${activeContext.contextId}:${activeContext.revision}:${activeContext.contextFingerprint}` : "";',
    '  const timeBinding = activeContext ? `${activeContext.contextId}:${activeContext.revision}:${activeContext.contextFingerprint}` : "";\n' +
    '  useR17NormalInputScope(contextSession, timeBinding, committedAt, skyInteractionRevision);', 'context_replacement_retirement');
  page = one(page, '    if (!at) return;\n    cancelSkyCalibration();\n    setTimeIntent(observationTime.preview(at));',
    '    if (!at) return;\n    r17NormalManualInputStarted(2);\n    cancelSkyCalibration();\n    setTimeIntent(observationTime.preview(at));', 'legal_ruler_onPreview');
  page = one(page, '              if (!skyTimeIntentCurrent() || !skyTimeInputAllowed(at, Date.now())) return false;\n              cancelSkyCalibration(); setTimeIntent(observationTime.preview(at)); return true;',
    '              if (!skyTimeIntentCurrent() || !skyTimeInputAllowed(at, Date.now())) return false;\n' +
    '              r17NormalManualInputStarted(1);\n              cancelSkyCalibration(); setTimeIntent(observationTime.preview(at)); return true;', 'legal_six_field_onPreview');
  return { runtime, controls, page };
}

// r17 adds only the unresolved geometry boundary to the existing manual run.
// No product source is edited. Observe the client's validated Promise while
// preserving the production live-demand guard and its original Promise chain.
export function addR17GeometryStages({ runtime, page, geometry }) {
  runtime = 'import { createR17GeometryStages } from "./r17-geometry-stage-runtime";\n' + runtime;
  runtime = one(runtime, 'export const r17Probe = {',
    'const r17Geometry = createR17GeometryStages(now);\nexport const r17Probe = {\n' +
    '  geometryRequest(at: string, windowAt: string, intent: number | null, signal?: AbortSignal) {\n' +
    '    return r17Geometry.request(at, windowAt, getIntent(intent)?.scope === scopeGeneration ? intent : null, signal);\n  },\n' +
    '  geometryWatch: r17Geometry.watch, geometryRejected: r17Geometry.rejected,\n' +
    '  geometryAdmitted(response: object, at: string, windowAt: string, intent: number | null) {\n' +
    '    r17Geometry.admitted(response, at, windowAt, getIntent(intent)?.scope === scopeGeneration ? intent : null);\n  },', 'geometry_probe_owner');
  runtime = one(runtime, '  active = armed = false; if (wasRunning) reason = nextReason;',
    '  r17Geometry.stop();\n  active = armed = false; if (wasRunning) reason = nextReason;', 'geometry_stop_listener_retirement');
  runtime = one(runtime, '    binding = { ...configuration, windowId: sequence }; armedAt = now(); sealed = terminalSealed = false;',
    '    binding = { ...configuration, windowId: sequence }; armedAt = now(); sealed = terminalSealed = false;\n' +
    '    r17Geometry.start(selected === "manual-input" && configuration.mode === "normal" ? armedAt : null);', 'geometry_manual_window');
  runtime = one(runtime, '    latestIntentSequence = next; rememberState(state, next); links.intentsCreated = add(links.intentsCreated); return next;',
    '    r17Geometry.intent(next, state.at, stamp);\n' +
    '    latestIntentSequence = next; rememberState(state, next); links.intentsCreated = add(links.intentsCreated); return next;', 'geometry_existing_intent_identity');
  runtime = one(runtime, 'caseKey === "manual-input" ? "starward-r17-phone-probe-v3-manual-input" : "starward-r17-phone-probe-v3"',
    'caseKey === "manual-input" ? "starward-r17-phone-probe-v3-manual-geometry-v1" : "starward-r17-phone-probe-v3"', 'geometry_explicit_receipt');
  runtime = one(runtime, '    return r17RulerEntry.attach({ schemaVersion:',
    '    return r17Geometry.attach(r17RulerEntry.attach({ schemaVersion:', 'geometry_scalar_snapshot_start');
  runtime = one(runtime, 'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) });',
    'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) }));', 'geometry_scalar_snapshot_end');
  page = one(page, '      return { at: time.at, fullWindow: time.mode === "PLAYING" || time.playRequested };\n    });\n  const timeModel = carriedReport',
    '      return { at: time.at, fullWindow: time.mode === "PLAYING" || time.playRequested };\n    },\n' +
    '    timeIntent.binding === timeBinding && timeIntent.committedAt === committedAt ? r17Probe.intentSequence(timeIntent) : null);\n  const timeModel = carriedReport', 'geometry_actual_intent');
  geometry = 'import { r17Probe } from "./r17-phone-probe-runtime";\n' + geometry;
  geometry = one(geometry, '  readDemand: () => { at: string; fullWindow: boolean } | null) {',
    '  readDemand: () => { at: string; fullWindow: boolean } | null, r17Intent: number | null = null) {', 'geometry_task_parameter');
  geometry = one(geometry, '      if (!demandCurrent()) return Promise.reject(new MiniappRequestCancelled("superseded"));\n' +
    '      return getSkyGeometryWindow(binding!, signal).then(response => {',
    '      if (!demandCurrent()) return Promise.reject(new MiniappRequestCancelled("superseded"));\n' +
    '      const token = r17Probe.geometryRequest(binding!.at, queryKey[6], r17Intent, signal);\n' +
    '      let result: ReturnType<typeof getSkyGeometryWindow>;\n' +
    '      try { result = getSkyGeometryWindow(binding!, signal); }\n' +
    '      catch (error) { r17Probe.geometryRejected(token, true); throw error; }\n' +
    '      r17Probe.geometryWatch(token, result);\n' +
    '      return result.then(response => {', 'geometry_validated_client_before_original_guard');
  geometry = one(geometry, '  if (binding && query.data && demandCurrent()) retained.current = { scope, model: query.data.data.model, sources: query.data.sources,\n' +
    '    windowMode: binding.windowMode ?? "NIGHT" };',
    '  if (binding && query.data && demandCurrent()) {\n' +
    '    retained.current = { scope, model: query.data.data.model, sources: query.data.sources,\n' +
    '      windowMode: binding.windowMode ?? "NIGHT" };\n' +
    '    r17Probe.geometryAdmitted(query.data, at, query.data.data.model.startAt, r17Intent);\n  }', 'geometry_actual_hook_admission');
  return { runtime, page, geometry };
}

// r19 adds only request causes to the same normal recorder and native writer.
// Apply after the existing manual/geometry transforms. No scheduler is added.
export function addR19DrawReasons({ runtime, page, lifecycle }) {
  runtime = 'import { createR19DrawReasons } from "./r17-normal-observations";\n' + runtime;
  runtime = one(runtime, 'const r17Geometry = createR17GeometryStages(now);',
    'const r17Geometry = createR17GeometryStages(now);\nconst r19DrawReasons = createR19DrawReasons();', 'draw_reason_owner');
  runtime = one(runtime, '  r17Geometry.stop();',
    '  r17Geometry.stop();\n  r19DrawReasons.stop();', 'draw_reason_stop');
  runtime = one(runtime, '    r17ACorrelation.start(configuration.mode === "normal");',
    '    r17ACorrelation.start(configuration.mode === "normal");\n    r19DrawReasons.start(configuration.mode === "normal");', 'draw_reason_run');
  runtime = one(runtime, '  request(frame: unknown, token: number | null, sequence: number | null) {',
    '  request(frame: unknown, token: number | null, sequence: number | null, reason = 2) {', 'draw_request_reason');
  runtime = one(runtime, '    links.requests = add(links.requests);',
    '    r19DrawReasons.request(frame, reason);\n    links.requests = add(links.requests);', 'draw_request_observation');
  runtime = one(runtime, '  inheritFrame(resolved: unknown, original: unknown) {',
    '  drawReasonMerged(frame: unknown, pending: unknown) { if (active) r19DrawReasons.merge(frame, pending); },\n' +
    '  drawReasonReplay(frame: unknown) { if (active) r19DrawReasons.replay(frame); },\n' +
    '  inheritFrame(resolved: unknown, original: unknown) {', 'draw_lifecycle_observers');
  runtime = one(runtime, '    const value = frames.get(original); if (!value) return false;',
    '    r19DrawReasons.inherit(resolved, original);\n    const value = frames.get(original); if (!value) return false;', 'draw_resolved_frame_identity');
  runtime = one(runtime, '    if (!object(frame)) return;\n    const facts = frames.get(frame)',
    '    if (!object(frame)) { r19DrawReasons.paint(frame, null, null); return; }\n    const facts = frames.get(frame)', 'draw_unknown_frame');
  runtime = one(runtime, '    facts.attempt = now(); rememberFrame(frame, facts);',
    '    r19DrawReasons.paint(frame, facts.intent, facts.token);\n    facts.attempt = now(); rememberFrame(frame, facts);', 'draw_actual_paint');
  // Attach before the existing bounded ruler/geometry extensions so their
  // export-only trimming still budgets the complete receipt at 32 KiB.
  runtime = one(runtime, '    return r17Geometry.attach(r17RulerEntry.attach({ schemaVersion:',
    '    return r17Geometry.attach(r17RulerEntry.attach(r19DrawReasons.attach({ schemaVersion:', 'draw_versioned_receipt_start');
  runtime = one(runtime, 'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) }));',
    'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) })));', 'draw_versioned_receipt_end');

  page = one(page, '  const browsingDrawRef = useRef((_continuation = false) => {});',
    '  const browsingDrawRef = useRef((_continuation = false, _r19Reason = 2) => {});', 'draw_reason_ref_argument');
  page = one(page, '  const draw = useCallback((continuation = false) => {',
    '  const draw = useCallback((continuation = false, r19Reason = 2) => {', 'draw_reason_argument');
  page = one(page, '              browsingDrawRef.current(true);',
    '              browsingDrawRef.current(true, (camera.animating ? 4 : 0) | (starTransitionFrame.animating ? 8 : 0) |\n' +
    '                (nameLayout.animating ? 16 : 0) | (readyImageFrame.animating ? 32 : 0));', 'draw_original_continuation_reasons');
  page = one(page, '    draw();\n  }, [activeIndex, activeContext, contextComplete, nativeCanvasMounted, canvasLifecycle, draw, reportData]);',
    '    draw(false, 1);\n  }, [activeIndex, activeContext, contextComplete, nativeCanvasMounted, canvasLifecycle, draw, reportData]);', 'draw_actual_input_resource_effect');
  page = one(page, '      r17UsesRequestedPreparation ? r17RequestPreparation.intentSequence : null);',
    '      r17UsesRequestedPreparation ? r17RequestPreparation.intentSequence : null, r19Reason);', 'draw_reason_request_identity');
  lifecycle = one(lifecycle, '      r17Probe.prepared(frame);\n      latest = frame;',
    '      r17Probe.prepared(frame);\n      if (dirty) r17Probe.drawReasonMerged(frame, latest);\n      latest = frame;', 'draw_existing_pending_coalescing');
  lifecycle = one(lifecycle, '  function reset() {\n    epoch++;',
    '  function reset() {\n    r17Probe.drawReasonReplay(latest);\n    epoch++;', 'draw_reset_replay_unknown');
  lifecycle = one(lifecycle, '    retry() { if (!disposed) { failed = false; dirty = latest !== undefined; schedule(); } },',
    '    retry() { if (!disposed) { r17Probe.drawReasonReplay(latest); failed = false; dirty = latest !== undefined; schedule(); } },', 'draw_retry_replay_unknown');
  return { runtime, page, lifecycle };
}

// r20 only fills the measured-cost gap left by r19. Two actual star traversal
// blocks (including their pick/transition/vertex work and same-time exits) and
// the nonempty renderer submit are inclusive spans, not independent phases.
// r21 keeps that boundary around the complete preparation lookup/build/replay,
// so a cache hit still includes every actual transition and paint operation.
export function addR20DrawCosts({ runtime, scene, renderer }) {
  runtime = one(runtime, 'import { r17RulerEntry } from "./r17-ruler-entry-runtime";',
    'import { r17RulerEntry, r17ProbeBoundedReceipt } from "./r17-ruler-entry-runtime";', 'final_complete_receipt_budget');
  runtime = one(runtime, 'import { createR19DrawReasons } from "./r17-normal-observations";',
    'import { createR19DrawReasons, createR20DrawCosts } from "./r17-normal-observations";', 'draw_cost_import');
  runtime = one(runtime, 'const r19DrawReasons = createR19DrawReasons();',
    'const r19DrawReasons = createR19DrawReasons();\nconst r20DrawCosts = createR20DrawCosts(now, interval);', 'draw_cost_owner');
  runtime = one(runtime, '  r19DrawReasons.stop();', '  r19DrawReasons.stop();\n  r20DrawCosts.stop();', 'draw_cost_stop');
  runtime = one(runtime, '    r19DrawReasons.start(configuration.mode === "normal");',
    '    r19DrawReasons.start(configuration.mode === "normal");\n    r20DrawCosts.start(configuration.mode === "normal");', 'draw_cost_run');
  runtime = one(runtime, '  measure<T>(stage: Stage, work: () => T, after?: (result: T) => void): T {\n' +
    '    if (!active) return work();\n    const started = now(); try { const result = work(); after?.(result); return result; } finally { if (active) record(stageElapsed[stage], interval(started, now())); }\n  },',
    '  actualDrawCost<T>(stage: "starTraversal" | "rendererSubmit", work: () => T): T {\n' +
    '    return active ? r20DrawCosts.measure(stage, work) : work();\n  },\n' +
    '  measure<T>(stage: Stage, work: () => T, after?: (result: T) => void): T {\n' +
    '    if (!active) return work();\n' +
    '    const invoke = stage === "nativePaintOwner" ? () => r20DrawCosts.paint(r19DrawReasons.paintFacts(), work)\n' +
    '      : stage === "draw" ? () => r20DrawCosts.measure("draw", work) : work;\n' +
    '    const started = now(); try { const result = invoke(); after?.(result); return result; } finally { if (active) record(stageElapsed[stage], interval(started, now())); }\n  },', 'draw_cost_existing_paint_scope');
  runtime = one(runtime, 'return r17Geometry.attach(r17RulerEntry.attach(r19DrawReasons.attach({ schemaVersion:',
    'return r17ProbeBoundedReceipt(r17Geometry.attach(r17RulerEntry.attach(r20DrawCosts.attach(r19DrawReasons.attach({ schemaVersion:', 'draw_cost_budget_before_trimming');
  runtime = one(runtime, 'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) })));',
    'aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) })))));', 'draw_cost_receipt_end');

  scene = one(scene, '  const buildCatalogStars = ',
    '  r17Probe.actualDrawCost("starTraversal", () => {\n  const buildCatalogStars = ', 'draw_cost_actual_bsc_start');
  scene = one(scene, '  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);',
    '  });\n\n  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);', 'draw_cost_actual_bsc_end');
  scene = one(scene, '  const buildSupplementStars = ',
    '  r17Probe.actualDrawCost("starTraversal", () => {\n  const buildSupplementStars = ', 'draw_cost_actual_sao_start');
  scene = one(scene, '  const solarDisc=skySunDiscAt(data.hourly,frameAt,basis,width,height,verticalFovDeg,center);',
    '  });\n\n  const solarDisc=skySunDiscAt(data.hourly,frameAt,basis,width,height,verticalFovDeg,center);', 'draw_cost_actual_sao_and_exit_end');
  renderer = one(renderer, '      if (!data.length) return;\n      try {',
    '      if (!data.length) return;\n      return r17Probe.actualDrawCost("rendererSubmit", () => {\n      try {', 'draw_cost_actual_nonempty_submit_start');
  renderer = one(renderer, '    };\n    const flush = () => {',
    '      });\n    };\n    const flush = () => {', 'draw_cost_actual_submit_end');
  return { runtime, scene, renderer };
}
