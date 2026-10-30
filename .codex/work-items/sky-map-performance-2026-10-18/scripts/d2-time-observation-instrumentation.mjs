// TASK ONLY. Current owners, without the historical R17 cost/Map/GPU chain.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('d2_time_boundary_changed:' + label);
  return source.replace(before, after);
}
export function addD2TimeObservation({ page, time, geometry, lifecycle, runtime }) {
  runtime = one(runtime, 'let active = false, armed = false, sealed = false, terminalSealed = false;',
    'let stopObserver: (() => void) | null = null;\nlet active = false, armed = false, sealed = false, terminalSealed = false;', 'stop_owner');
  runtime = one(runtime, '  arm = deadline = undefined;\n}',
    '  arm = deadline = undefined;\n  try { stopObserver?.(); } catch { /* optional task observation */ }\n}', 'stop_notification');
  runtime = one(runtime, 'export const r17Probe = {\n  now,',
    'export const r17Probe = {\n  now,\n  recordingStart: () => ({ ...armedAt }),\n  observeStop(observer: () => void) { stopObserver = observer; },', 'same_clock');
  runtime = one(runtime, '    armed = true;\n    arm = setTimeout(() => { arm = undefined; armed = false; active = true; startAt = now(); recordingStartRelativeMs = relative(startAt);\n      deadline = setTimeout(() => stop("limit"), 45000); }, 1000);',
    '    active = true; startAt = armedAt; recordingStartRelativeMs = relative(startAt);\n    deadline = setTimeout(() => stop("limit"), 45000);', 'immediate_input_window');
  runtime = one(runtime, 'window: { startDelayMs: 1000, durationLimitMs: 45000, elapsedMs: windowElapsed.elapsedMs, elapsedStatus: windowElapsed.status, reason }, sampleLimit: SAMPLE_LIMIT,',
    'window: { startDelayMs: 0, durationLimitMs: 45000, elapsedMs: windowElapsed.elapsedMs, elapsedStatus: windowElapsed.status, reason }, sampleLimit: SAMPLE_LIMIT,', 'immediate_receipt');
  runtime = runtime.replaceAll('__VARIANT__', 'baseline');
  const observationImport = 'import { d2Time } from "./d2-time-observation";\n';
  time = observationImport + one(time, 'state = { ...state, ...change }; return state;',
    'const prior = state; state = { ...state, ...change }; d2Time.state(state, prior); return state;', 'original_time_publication');
  page = observationImport + 'import { D2TimeControls, useD2TimeObservation } from "./d2-time-observation-controls";\n' + page;
  page = one(page, '    skyInteractionRevision, pageVisible, skyResourcesActive, canvasError]);',
    '    skyInteractionRevision, pageVisible, skyResourcesActive, canvasError]);\n  useD2TimeObservation(timePresentationScope, pageVisible && skyResourcesActive);', 'actual_presentation_scope');
  page = one(page, '    setTimeIntent(observationTime.preview(at, accepted ? { fromAt: accepted.row.at, elapsedAt, reducedMotion: reducedMotionRef.current } : undefined));',
    '    setTimeIntent(d2Time.input(timePresentationScope, at, () => observationTime.preview(at, accepted ? { fromAt: accepted.row.at, elapsedAt, reducedMotion: reducedMotionRef.current } : undefined)));', 'legal_preview_after_bind');
  page = one(page, '  const requestedTimePresentation = useMemo(() => presentSkyTime(rawReportData, presentationAt, presentationModel, presentationSources),',
    '  const requestedTimePresentation = useMemo(() => d2Time.prepare(() => presentSkyTime(rawReportData, presentationAt, presentationModel, presentationSources),\n    timeIntent, requestedAt, presentationAt, timePresentationScope),', 'current_time_preparation');
  page = one(page, '      return viewportActiveRef.current ? resolveSkyCanvasResources(frame, canvasGenerationRef.current) : frame;',
    '      const resolved = viewportActiveRef.current ? resolveSkyCanvasResources(frame, canvasGenerationRef.current) : frame;\n      d2Time.inherit(resolved, frame);\n      return resolved;', 'resource_clone_identity');
  page = one(page, '    canvasLifecycle.request({ nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,',
    '    const d2RequestedFrame: SkyCanvasFrame = { nativeImageGeneration: canvasNodeRevision, orientationRevision: orientation.snapshot.presentationRevision,', 'frame_request_start');
  page = one(page, '      sceneReady, owner, inspection: canvasFrameInfo.inspection },\n      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode, continuation);',
    '      sceneReady, owner, inspection: canvasFrameInfo.inspection };\n    d2Time.request(d2RequestedFrame, canvasData ? timePresentation : null);\n    canvasLifecycle.request(d2RequestedFrame,\n      !canvasData || (!selectedManualBasis && pose === null) || previousCanvasModeRef.current !== mode, continuation);', 'uncloned_presentation_identity');
  page = one(page, '      surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive);\n      attempt.publish(excludedNameKeys);',
    '      surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive);\n      attempt.publish(excludedNameKeys);\n      d2Time.accepted(frame, currentTime, canvasGenerationRef.current);', 'after_successful_copy_and_publish');
  page = one(page, '      if (!Number.isSafeInteger(frame.timeGeneration) || frame.timeGeneration !== currentTime.presentationGeneration) return;',
    '      if (!Number.isSafeInteger(frame.timeGeneration) || frame.timeGeneration !== currentTime.presentationGeneration) { d2Time.rejected(1, frame, currentTime, canvasGenerationRef.current); return; }', 'actual_stale_time_rejection');
  page = one(page, '        attempt.identity.canvas.generation !== canvasGenerationRef.current || !attempt.publish) return;',
    '        attempt.identity.canvas.generation !== canvasGenerationRef.current || !attempt.publish) { d2Time.rejected(2, frame, currentTime, canvasGenerationRef.current); return; }', 'actual_attempt_rejection');
  page = one(page, '        if (previous.frameAt === currentTime.at && frame.frameAt !== currentTime.at) return;',
    '        if (previous.frameAt === currentTime.at && frame.frameAt !== currentTime.at) { d2Time.rejected(3, frame, currentTime, canvasGenerationRef.current); return; }', 'actual_final_rejection');
  page = one(page, '        if (currentTime.previewFromAt && !skyObservationFrameCurrent(currentTime, frame.frameAt, frame.timeGeneration, previous.frameAt)) return;',
    '        if (currentTime.previewFromAt && !skyObservationFrameCurrent(currentTime, frame.frameAt, frame.timeGeneration, previous.frameAt)) { d2Time.rejected(4, frame, currentTime, canvasGenerationRef.current); return; }', 'actual_motion_rejection');
  page = one(page, '  </SkyNavigationMenu>;',
    '    <D2TimeControls scope={timePresentationScope} />\n  </SkyNavigationMenu>;', 'task_menu');
  lifecycle = observationImport + one(lifecycle, '      latest = frame;\n      revision++;',
    '      d2Time.prepared(frame);\n      latest = frame;\n      revision++;', 'actual_lifecycle_request');
  lifecycle = one(lifecycle, '    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;',
    '    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;\n    d2Time.paintStarted(frame);', 'actual_paint');
  lifecycle = one(lifecycle, '        finished = true;', '        finished = true;\n        d2Time.callback(frame);', 'actual_callback');
  geometry = observationImport + one(geometry, '      request!.phase = "fetching";\n      return getSkyGeometryWindow(binding!, signal).then(response => {',
    '      request!.phase = "fetching";\n      const d2Request = d2Time.geometryRequest(binding!.at, request!.key[6], request!.serial, request!.phase, request!.epoch, signal);\n      let d2Response: ReturnType<typeof getSkyGeometryWindow>;\n      try { d2Response = getSkyGeometryWindow(binding!, signal); }\n      catch (error) { d2Time.geometryRejected(d2Request, true); throw error; }\n      d2Time.geometryWatch(d2Request, d2Response);\n      return d2Response.then(response => {', 'actual_geometry_dispatch');
  geometry = one(geometry, '        ? { at: sampleAt, hold: request.hold, epoch: request.epoch, serial: request.serial } : null };',
    '        ? { at: sampleAt, hold: request.hold, epoch: request.epoch, serial: request.serial } : null };\n    d2Time.geometryAdmitted(response, sampleAt, response.data.model.startAt, request.serial, request.phase, request.epoch);', 'actual_geometry_admission');
  return { page, time, geometry, lifecycle, runtime };
}
