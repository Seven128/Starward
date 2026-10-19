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
