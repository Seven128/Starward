// Finite r6 dispatcher. Historical v1/v2/v3/A1/r5 receipts keep their bytes.
import { validateR17PhoneProbeMetrics as priorMetrics, validateR17PhoneProbeTerminal as priorTerminal,
  matchR17PhoneProbeTerminal as priorMatch, validateR17RulerEntryExtension, R17_RULER_ENTRY_EVENTS,
  R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES } from './r17-ruler-entry-protocol.mjs';
import { validateR17PhoneProbeMetrics as a1Metrics } from './r17-a-correlation-protocol.mjs';
import { R28_FIRST_ACCEPTED_COSTS_SCHEMA, validateR28FirstAcceptedCosts,
  withoutR28FirstAcceptedCosts } from './r28-first-accepted-protocol.mjs';
export { R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES };
export const R17_MANUAL_INPUT_SCHEMA = 'starward-r17-phone-probe-v3-manual-input';
export const R17_GEOMETRY_INPUT_SCHEMA = 'starward-r17-phone-probe-v3-manual-geometry-v1';
export const R19_DRAW_REASONS_SCHEMA = 'starward-r19-phone-probe-draw-reasons-v1';
export const R20_DRAW_COSTS_SCHEMA = 'starward-r20-phone-probe-draw-costs-v1';
// Histogram index is a union of direct call-site facts, never a cause inferred
// from equal frame times. Continuation occupies four independent high bits.
export const R19_DRAW_REASON_BITS = { inputResourceEffect: 1, unknown: 2, camera: 4, stars: 8, names: 16, images: 32 };
// row: order, event, relativeWallMs|null, clockEpoch, requestId|null,
// windowId|null, targetMsFromFirstObservedTarget|null, actualIntentId|null, detail.
// call detail: 0 no signal, 1 live, 2 already aborted; abort: 0 event, 1 pre-aborted;
// rejection: 0 Promise rejection, 1 synchronous throw; admission: 0 associated,
// 1 inherited/cache/unobserved request, 2 reused response identity is ambiguous.
export const R17_GEOMETRY_EVENTS = {
  1: 'intent', 2: 'logicalClientCall', 3: 'signalAbortObserved',
  4: 'validatedClientPromiseFulfilled', 5: 'clientRejected', 6: 'currentHookAssignment',
};
export const R17_RULER_ENTRY_V2_EVENTS = {
  ...Object.fromEntries(Object.entries(R17_RULER_ENTRY_EVENTS).filter(([code]) => ![2,3,4,12,22].includes(Number(code)))),
  15: ['nativeMoveRequested','owner','revision','left','animated'],
  24: ['props','owner','rowsVersion','rowCount','activeIndex','committedIndex','selectionReady','layoutReady','preparing','alignedRowsCurrent','alignmentRequired','ticksVisible','positionFailed','reducedMotion','firstRowAt','lastRowAt'],
  25: ['positionTarget','owner','rowsVersion','revision','index','left','verify','measured','nativeRowsCurrent'],
  26: ['positionObservedBeforeGuard','owner','rowsVersion','revision','pendingRevision','pendingIndex','rowsCurrent','nativeRowsCurrent','visible','selectionReady','interactionAllowed','dragging','left','finished'],
  27: ['alignmentAdmitted','owner','rowsVersion','revision','index','left'],
  28: ['alignmentUnavailable','owner','rowsVersion','revision','index','left','finished'],
  29: ['pendingReadRequested','owner','rowsVersion','revision','index','finished'],
  30: ['pendingReadReturned','owner','rowsVersion','revision','current','left'],
  31: ['nativeOffsetReadRequested','owner','expectedRevision','revision','retry'],
  32: ['nativeOffsetReadReturned','owner','expectedRevision','revision','current','left'],
};
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v,key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= 1e12;
const budget = v => { try { return Buffer.byteLength(JSON.stringify(v),'utf8') <= R17_PHONE_PROBE_MAX_BYTES; } catch { return false; } };
const withoutEntry = value => { const { rulerEntry, ...base } = value; return base; };
function rulerV2(value) {
  if (!validateR17RulerEntryExtension(value, { schemaVersion: 'starward-r17-ruler-entry-v2', events: R17_RULER_ENTRY_V2_EVENTS, phases: [1,2,3,4,5] })) return false;
  const booleans = ['preparing','alignedRowsCurrent','alignmentRequired','ticksVisible','positionFailed','verify','measured','nativeRowsCurrent','interactionAllowed','finished','retry'];
  return value.rulerEntry.entries.every(row => R17_RULER_ENTRY_V2_EVENTS[row[1]].slice(1).every((name,index) => {
    const item = row[index+6];
    if (booleans.includes(name)) return item === 0 || item === 1;
    if (name === 'pendingRevision') return item === null || count(item);
    return true;
  }));
}
function manual(value) {
  if (value.schemaVersion !== R17_MANUAL_INPUT_SCHEMA || value.caseKey !== 'manual-input' || value.binding?.mode !== 'normal' ||
    value.window?.startDelayMs !== 0 || ![null,0].includes(value.controls?.recordingStartRelativeMs) ||
    Object.hasOwn(value,'rulerEntry') || !Object.hasOwn(value,'aCorrelation') ||
    !object(value.manualInput,['schemaVersion','trigger','boundary']) ||
    value.manualInput.schemaVersion !== 'starward-r17-manual-input-v1' || ![1,2].includes(value.manualInput.trigger) ||
    value.manualInput.boundary !== 'legal-onPreview-before-preview-intent' ||
    !['actualPlay','pauseAttempt','pauseSuccess','terminalExport'].every(key => value.controls?.events?.[key]?.calls === 0)) return false;
  // Validation-only reuse of unchanged scalar/Scene/linkage rules. This copy
  // is never emitted, persisted or interpreted as a delayed historical run.
  const { manualInput: _input, ...base } = value;
  return a1Metrics({ ...base, schemaVersion: 'starward-r17-phone-probe-v3', caseKey: 'wide-time',
    window: { ...base.window, startDelayMs: 1000 } });
}
function geometryStages(v) {
  if (!object(v, ['schemaVersion','meaning','capacity','requestLimit','windowLimit','responseLimit',
    'observed','dropped','overflow','exportOmitted','invalid','requests','omittedRequests','unmatchedAdmissions','pendingAtStop',
    'responseRotations','windowMisses','ambiguousResponses','windows','entries']) ||
    v.schemaVersion !== 'starward-r17-geometry-stages-v1' ||
    v.meaning !== 'logical-client-call-validated-promise-current-hook-assignment-not-network-or-presentation' ||
    v.capacity !== 128 || v.requestLimit !== 64 || v.windowLimit !== 64 || v.responseLimit !== 128 ||
    !['observed','dropped','exportOmitted','invalid','requests','omittedRequests','unmatchedAdmissions','pendingAtStop','responseRotations','windowMisses','ambiguousResponses'].every(k=>count(v[k])) ||
    v.omittedRequests > v.requests || v.pendingAtStop > Math.min(64, v.requests - v.omittedRequests) ||
    !Array.isArray(v.entries) || v.entries.length + v.exportOmitted !== Math.min(v.observed, 128) ||
    v.dropped !== Math.max(0, v.observed - 128) || v.overflow !== (v.observed > 128) ||
    !Array.isArray(v.windows) || v.windows.length > 64) return false;
  const signed = x => Number.isSafeInteger(x) && Math.abs(x) <= 1.728e16;
  const id = x => count(x) && x > 0, optionalId = x => x === null || id(x);
  if (!v.windows.every((row, i)=> Array.isArray(row) && row.length === 2 && row[0] === i+1 &&
    (row[1] === null || signed(row[1])))) return false;
  const requests = new Map(), intents = new Set();
  return v.entries.every((row, i)=>{
    if (!Array.isArray(row) || row.length !== 9 || row[0] !== i+1 || !Object.hasOwn(R17_GEOMETRY_EVENTS,row[1]) ||
      !(row[2] === null || count(row[2]) && row[2] <= 60000) || !count(row[3]) ||
      !optionalId(row[4]) || row[4] > v.requests ||
      !(row[5] === null || id(row[5]) && row[5] <= v.windows.length) ||
      !(row[6] === null || signed(row[6])) || !optionalId(row[7])) return false;
    const [,code,,,request,window,time,intent,detail] = row;
    if (code === 1) {
      if (request !== null || window !== null || !id(intent) || detail !== 0 || intents.has(intent)) return false;
      intents.add(intent); return true;
    }
    if (code === 2) {
      if (!id(request) || requests.has(request) || ![0,1,2].includes(detail) || intent !== null && !intents.has(intent)) return false;
      requests.set(request, { aborted: false, ended: false }); return true;
    }
    if (code === 6) return [0,1,2].includes(detail) && (intent === null || intents.has(intent)) &&
      (detail === 0 ? request !== null && requests.get(request)?.validated === true : request === null);
    const prior = requests.get(request);
    if (!prior || prior.ended || window !== null || time !== null || intent !== null) return false;
    if (code === 3) {
      if (prior.aborted || ![0,1].includes(detail)) return false;
      prior.aborted = true; return true;
    }
    if (code === 4 && detail !== 0 || code === 5 && ![0,1].includes(detail)) return false;
    prior.ended = true; prior.validated = code === 4; return true;
  });
}
function drawReasons(value) {
  const v = value.drawReasons;
  if (!object(v, ['schemaVersion','metricsSchema','meaning','identityLimit','ringCapacity','requests','paints',
    'mergedRequests','inheritedFrames','identityRotations','invalidReasons','unknownFramePaints','requestMasks','paintMasks','dropped','entries']) ||
    v.schemaVersion !== 'starward-r19-draw-reasons-v1' ||
    !['starward-r17-phone-probe-v3', R17_GEOMETRY_INPUT_SCHEMA].includes(v.metricsSchema) ||
    v.meaning !== 'request-causes-unioned-at-existing-pending-frame-paint-admission-not-pixels-or-wasted-work' ||
    v.identityLimit !== 256 || v.ringCapacity !== 32 || value.binding?.mode !== 'normal' ||
    !['requests','paints','mergedRequests','inheritedFrames','identityRotations','invalidReasons','unknownFramePaints','dropped'].every(k => count(v[k])) ||
    v.requests !== value.linkage?.requests || v.paints !== value.counters?.paintAttempts ||
    v.mergedRequests > value.counters?.preparedRequests || v.invalidReasons > v.requests || v.unknownFramePaints > v.paints ||
    ![v.requestMasks, v.paintMasks].every(values => Array.isArray(values) && values.length === 64 && values.every(count) && values[0] === 0) ||
    v.requestMasks.reduce((sum, n) => sum + n, 0) !== v.requests || v.paintMasks.reduce((sum, n) => sum + n, 0) !== v.paints ||
    v.requestMasks.some((n, mask) => n && !(mask === 1 || mask === 2 || mask % 4 === 0)) ||
    v.paintMasks.reduce((sum, n, mask) => sum + (mask & 2 ? n : 0), 0) < v.unknownFramePaints ||
    v.dropped !== Math.max(0, v.paints - 32) || !Array.isArray(v.entries) || v.entries.length !== Math.min(32, v.paints)) return false;
  const optionalId = n => n === null || count(n) && n > 0, keptMasks = new Array(64).fill(0);
  return v.entries.every((row, i) => {
    if (!Array.isArray(row) || row.length !== 4 || row[0] !== v.dropped + i + 1 ||
      !Number.isInteger(row[1]) || row[1] < 1 || row[1] > 63 || !optionalId(row[2]) || !optionalId(row[3])) return false;
    keptMasks[row[1]]++;
    return keptMasks[row[1]] <= v.paintMasks[row[1]];
  });
}
const withoutDrawReasons = value => { const { drawReasons, ...base } = value; return { ...base, schemaVersion: drawReasons.metricsSchema }; };
function drawCosts(value) {
  const v = value.drawCosts, stages = ['draw','starTraversal','rendererSubmit'];
  const reasons = ['belowResolution','clockUnavailable','clockDiscontinuity','outOfRange','notObserved'];
  const validCost = cost => object(cost, ['observedCalls','validCalls','unknownCalls','knownSubtotalMs','maxMs','threwCalls','unknown']) &&
    ['observedCalls','validCalls','unknownCalls','knownSubtotalMs','threwCalls'].every(key => count(cost[key])) &&
    object(cost.unknown,reasons) && reasons.every(key => count(cost.unknown[key])) &&
    cost.observedCalls === cost.validCalls + cost.unknownCalls && cost.threwCalls <= cost.observedCalls &&
    cost.unknownCalls === reasons.reduce((sum,key) => sum + cost.unknown[key],0) &&
    (cost.validCalls ? Number.isInteger(cost.maxMs) && cost.maxMs >= 1 && cost.maxMs <= 60000 &&
      cost.knownSubtotalMs >= cost.maxMs && cost.knownSubtotalMs >= cost.validCalls &&
      cost.knownSubtotalMs <= cost.maxMs * cost.validCalls : cost.maxMs === null && cost.knownSubtotalMs === 0);
  const validStages = values => object(values,stages) && stages.every(stage => validCost(values[stage]));
  if (!object(v, ['schemaVersion','metricsSchema','meaning','nesting','classification','scopedPaints','missingAdmissionPaints',
    'nestedPaints','scopeChangedSpans','groups','unbound']) || v.schemaVersion !== 'starward-r20-draw-costs-v1' ||
    v.metricsSchema !== R19_DRAW_REASONS_SCHEMA ||
    v.meaning !== 'inclusive-wall-elapsed-synchronous-actual-paint-scope-not-CPU-GPU-or-pixels' ||
    v.nesting !== 'submit-may-overlap-starTraversal-both-inside-draw-do-not-add' ||
    v.classification !== 'unknown-bit-or-missing-first-then-effect-bit-else-continuation' ||
    !['scopedPaints','missingAdmissionPaints','nestedPaints','scopeChangedSpans'].every(key => count(v[key])) ||
    v.missingAdmissionPaints > v.scopedPaints || v.nestedPaints > v.scopedPaints ||
    !Array.isArray(v.groups) || v.groups.length !== 3 || !validStages(v.unbound)) return false;
  const kinds = ['inputResourceEffect','continuationOnly','unknown'];
  if (!v.groups.every((group,index) => object(group,['kind','paints','stages']) && group.kind === kinds[index] &&
    count(group.paints) && validStages(group.stages)) ||
    v.groups.reduce((sum,group) => sum + group.paints,0) !== v.scopedPaints ||
    v.groups[2].paints < v.missingAdmissionPaints || v.groups[2].paints < v.nestedPaints) return false;
  const masks = value.drawReasons?.paintMasks;
  if (!Array.isArray(masks) || masks.length !== 64 || !masks.every(count)) return false;
  const admitted = [0,0,0];
  masks.forEach((n,mask) => { admitted[mask & 2 ? 2 : mask & 1 ? 0 : 1] += n; });
  return v.scopedPaints <= value.drawReasons.paints + v.missingAdmissionPaints &&
    v.groups[0].paints <= admitted[0] && v.groups[1].paints <= admitted[1] &&
    v.groups[2].paints <= admitted[2] + v.missingAdmissionPaints + v.nestedPaints;
}
const withoutDrawCosts = value => { const { drawCosts, ...base } = value; return { ...base, schemaVersion: drawCosts.metricsSchema }; };
export function validateR17PhoneProbeMetrics(value) {
  if (!value || typeof value !== 'object' || !budget(value)) return false;
  if (value.schemaVersion === R28_FIRST_ACCEPTED_COSTS_SCHEMA)
    return validateR28FirstAcceptedCosts(value) && validateR17PhoneProbeMetrics(withoutR28FirstAcceptedCosts(value));
  if (value.schemaVersion === R20_DRAW_COSTS_SCHEMA)
    return drawCosts(value) && validateR17PhoneProbeMetrics(withoutDrawCosts(value));
  if (value.schemaVersion === R19_DRAW_REASONS_SCHEMA)
    return drawReasons(value) && validateR17PhoneProbeMetrics(withoutDrawReasons(value));
  if (value.schemaVersion === R17_GEOMETRY_INPUT_SCHEMA) {
    const { geometryStages: stages, ...base } = value;
    return geometryStages(stages) && manual({ ...base, schemaVersion: R17_MANUAL_INPUT_SCHEMA });
  }
  if (value.schemaVersion === R17_MANUAL_INPUT_SCHEMA) return manual(value);
  if (value.rulerEntry?.schemaVersion === 'starward-r17-ruler-entry-v2') return rulerV2(value) && a1Metrics(withoutEntry(value));
  return priorMetrics(value);
}
export function validateR17PhoneProbeTerminal(value) { return priorTerminal(value); }
export function matchR17PhoneProbeTerminal(metrics, terminal) {
  if (!validateR17PhoneProbeMetrics(metrics) || [R17_MANUAL_INPUT_SCHEMA,R17_GEOMETRY_INPUT_SCHEMA].includes(metrics.schemaVersion)) return false;
  if (metrics.schemaVersion === R28_FIRST_ACCEPTED_COSTS_SCHEMA)
    return matchR17PhoneProbeTerminal(withoutR28FirstAcceptedCosts(metrics), terminal);
  if (metrics.schemaVersion === R20_DRAW_COSTS_SCHEMA) return matchR17PhoneProbeTerminal(withoutDrawCosts(metrics), terminal);
  if (metrics.schemaVersion === R19_DRAW_REASONS_SCHEMA) return matchR17PhoneProbeTerminal(withoutDrawReasons(metrics), terminal);
  return priorMatch(metrics.rulerEntry?.schemaVersion === 'starward-r17-ruler-entry-v2' ? withoutEntry(metrics) : metrics,terminal);
}
