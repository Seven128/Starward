// v3 wall-elapsed contract. Old receipt validators are unchanged.
import { validateR17PhoneProbeMetrics as validateV1 } from './r17-phone-probe-protocol.mjs';
import { validateR17PhoneProbeMetrics as validateLegacy, validateR17PhoneProbeTerminal as validateLegacyTerminal,
  matchR17PhoneProbeTerminal as matchLegacyTerminal, R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES } from './r17-phone-probe-v2-protocol.mjs';
export { R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES };
export const R17_PHONE_PROBE_V3_SCHEMA = 'starward-r17-phone-probe-v3';
export const R17_PHONE_PROBE_V3_TERMINAL_SCHEMA = 'starward-r17-phone-probe-v3-terminal';
const LIMIT = 1e12, CAPACITY = 2048, LINK_LIMIT = 32;
const stages = ['presentation','base','selection','supplement','constellations','draw','nativePaintOwner','displayCopy','publishAccepted'];
const unknownReasons = ['belowResolution','clockUnavailable','clockDiscontinuity','outOfRange','notObserved'];
const modes = ['unknown','normal','cpu-page-only','cpu-text-metrics','accepted-action-direct','accepted-action-closure','scene-owned-memo'];
const controls = ['actualPlay','export','pauseAttempt','pauseSuccess','terminalExport'];
const tmCounts = ['hits','misses','evictions','nativeGlyphCalls','lifetimeHits','lifetimeMisses','lifetimeEvictions','lifetimeNativeGlyphCalls','entries','capacity','observationResets'];
const pageCounts = ['available','submitted','completed','failed','failedBeforeCallback','callbackMissing','pending','inheritedPending','maxPending','duplicateCallback','keyCountTotal','maxKeyCount','keyCountFailures','sampledCalls','sampledBytes','maxSampledBytes','serializationFailures','bufferDataCalls','totalTypedUploadBytes','maxTypedUploadBytes'];
const pageNumbers = ['latencyTotalMs','latencyMaxMs'];
const sceneCounts = ['nativeCopies','readyNativeCopies','syntheticBegins','syntheticFinishes','syntheticPublications','discs','segments','images','readiness'];
const memoCounts = ['ownedScenesCreated','ownRejected','ownedReads','ownedValueReads','ownedWrites','fallbackReads','fallbackValueReads','fallbackWrites','sameAtReuses','lifetimeOwnedScenesCreated','observationResets'];
const linkageCounts = ['intentsCreated','firstAcceptedIntents','duplicateIntentPresents','supersededBeforeFirstAccepted','firstAcceptedAfterSuperseded','expiredUnacceptedIntents','unknownIntentLookups','stateIdentityRotations','preparationsStarted','preparationsFinished','expiredUnconsumedPreparations','expiredIncompletePreparations','requests','requestsWithUnknownPreparation','requestsWithUnknownIntent','linkageMismatches','frameIdentityRotations','inheritedFrames','duplicateFramePresents','unknownAcceptedFrames','syntheticPublications','prepareFinishUnknown','prepareFinishDuplicate','latencyUnknownIntents','unacceptedIntents','supersededUnacceptedIntents','consumedPreparations','unconsumedPreparations','incompletePreparations','knownResourceRevisions','retainedIntents','retainedPreparations'];
const latencyNames = ['intentToFirstAcceptedMs','unsupersededIntentToFirstAcceptedMs','supersededIntentToFirstAcceptedMs'];
const object = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const number = (value, maximum=LIMIT) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum;
const count = value => number(value) && Number.isSafeInteger(value);
const optional = (value, validate) => value === null || validate(value);
const positiveId = value => count(value) && value > 0;
const relative = value => optional(value, item => number(item,60000) && Number.isSafeInteger(item));
const bool = value => typeof value === 'boolean';
const nullableBool = value => optional(value,bool);
const withinBudget = value => { try { return Buffer.byteLength(JSON.stringify(value),'utf8') <= R17_PHONE_PROBE_MAX_BYTES; } catch { return false; } };
const run = value => ['baseline','candidate'].includes(value.variant) && typeof value.runId === 'string' && /^r17-[1-9][0-9]{0,5}-[a-z0-9]{1,12}$/.test(value.runId);
function binding(value) {
  return object(value,['mode','buildGeneration','buildSourceSha256','windowId']) && modes.includes(value.mode) &&
    optional(value.buildGeneration,count) && optional(value.buildSourceSha256,item => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item)) && positiveId(value.windowId);
}
function samples(value) {
  return object(value,['observedCalls','validCalls','unknownCalls','unknown','knownSubtotalMs','minMs','maxMs','keptSamples','p50Ms','p95Ms','overflow']) &&
    ['observedCalls','validCalls','unknownCalls','keptSamples'].every(key => count(value[key])) &&
    value.observedCalls === Math.min(LIMIT,value.validCalls + value.unknownCalls) &&
    unknowns(value.unknown,value.unknownCalls) && count(value.knownSubtotalMs) &&
    value.keptSamples === Math.min(CAPACITY,value.validCalls) && value.overflow === (value.validCalls > CAPACITY) &&
    (value.validCalls === 0 ? value.knownSubtotalMs === 0 && ['minMs','maxMs','p50Ms','p95Ms'].every(key => value[key] === null) :
      ['minMs','maxMs','p50Ms','p95Ms'].every(key => positiveDuration(value[key])) && value.minMs <= value.maxMs &&
      value.p50Ms >= value.minMs && value.p95Ms >= value.p50Ms && value.p95Ms <= value.maxMs &&
      value.knownSubtotalMs >= value.maxMs);
}
function unknowns(value,total) {
  return object(value,unknownReasons) && unknownReasons.every(key => count(value[key])) &&
    Math.min(LIMIT,Object.values(value).reduce((sum,item) => sum+item,0)) === total;
}
const positiveDuration = value => number(value,60000) && value >= 1 && Number.isSafeInteger(value);
const validInterval = (elapsed,status) => status === 'valid' ? positiveDuration(elapsed) : unknownReasons.includes(status) && elapsed === null;
function clock(value) {
  return object(value,['source','unit','kind','monotonic','availability','nominalResolutionMs','effectiveResolutionMs','reads','invalidReads','backwardReads']) &&
    value.source === 'Date.now' && value.unit === 'ms' && value.kind === 'wall-elapsed' && value.monotonic === false &&
    value.nominalResolutionMs === 1 && value.effectiveResolutionMs === null &&
    ['reads','invalidReads','backwardReads'].every(key => count(value[key])) && value.reads > 0 &&
    value.invalidReads + value.backwardReads <= value.reads &&
    value.availability === (value.reads === value.invalidReads ? 'unavailable' : value.invalidReads ? 'partial' : 'available');
}
function cost(value,total) {
  return object(value,['knownSubtotalMs','validCalls','unknownCalls','unknown']) && count(value.knownSubtotalMs) &&
    count(value.validCalls) && count(value.unknownCalls) && Math.min(LIMIT,value.validCalls+value.unknownCalls) === total &&
    unknowns(value.unknown,value.unknownCalls) && (value.validCalls ? value.knownSubtotalMs >= value.validCalls : value.knownSubtotalMs === 0);
}
function controlEvents(value, seal) {
  if (!object(value,controls)) return false;
  return controls.every(key => {
    const item = value[key];
    if (!object(item,['calls','firstRelativeMs','lastRelativeMs','lastResult']) || !count(item.calls) ||
      !relative(item.firstRelativeMs) || !relative(item.lastRelativeMs) || !nullableBool(item.lastResult)) return false;
    if (!item.calls && (item.firstRelativeMs !== null || item.lastRelativeMs !== null || item.lastResult !== null)) return false;
    if (item.firstRelativeMs !== null && item.lastRelativeMs !== null && item.firstRelativeMs > item.lastRelativeMs) return false;
    return seal === null || item.lastRelativeMs === null || item.lastRelativeMs <= seal;
  });
}
function controlRecord(value, metrics) {
  const keys = metrics ? ['recordingStartRelativeMs','sealRelativeMs','events'] : ['sealRelativeMs','events'];
  return object(value,keys) && relative(value.sealRelativeMs) &&
    (!metrics || relative(value.recordingStartRelativeMs)) &&
    controlEvents(value.events,value.sealRelativeMs);
}
function scalarValues(value, owner) {
  const counts = owner === 'tm' ? tmCounts : owner === 'page' ? pageCounts : owner === 'memo' ? memoCounts : sceneCounts;
  const numbers = owner === 'page' ? pageNumbers : [];
  const booleans = owner === 'tm' ? ['retired','available'] : owner === 'page' ? ['enableDebug'] : owner === 'memo' ? [] : ['frozen','retired'];
  return object(value,[...counts,...numbers,...booleans]) && counts.every(key => optional(value[key],count)) &&
    numbers.every(key => optional(value[key],number)) && booleans.every(key => nullableBool(value[key]));
}
function scalarFacts(value, owner) {
  const capture = item => object(item,['relativeMs','values']) && relative(item.relativeMs) && scalarValues(item.values,owner);
  return object(value,['captures','first','last']) && count(value.captures) &&
    (value.captures === 0 ? value.first === null && value.last === null : capture(value.first) && capture(value.last));
}
function link(value) {
  const keys = ['prepareToken','intentSequence','scopeGeneration','kind','resourceRevision','startedRelativeMs','finishedRelativeMs','elapsedMs','elapsedStatus','completed','requests','paintAttempts','firstConsumedRelativeMs','consumed','firstAcceptedRelativeMs','firstAcceptedObserved','syntheticPublications','duplicatePresents','intentRelativeMs','intentFirstAcceptedRelativeMs','intentFirstAcceptedObserved','intentSuperseded'];
  return object(value,keys) && positiveId(value.prepareToken) && optional(value.intentSequence,positiveId) && positiveId(value.scopeGeneration) &&
    value.kind === 'presentation' && optional(value.resourceRevision,count) && validInterval(value.elapsedMs,value.elapsedStatus) && nullableBool(value.completed) &&
    (value.completed !== null || value.elapsedStatus === 'notObserved') &&
    ['requests','paintAttempts','syntheticPublications','duplicatePresents'].every(key => count(value[key])) &&
    ['startedRelativeMs','finishedRelativeMs','firstConsumedRelativeMs','firstAcceptedRelativeMs','intentRelativeMs','intentFirstAcceptedRelativeMs'].every(key => relative(value[key])) &&
    bool(value.consumed) && bool(value.firstAcceptedObserved) && nullableBool(value.intentFirstAcceptedObserved) && nullableBool(value.intentSuperseded);
}
function linkage(value) {
  const keys = ['capacity','identityMapCapacity','linkLimit',...linkageCounts,'costs','linkSampleTruncated','latency','links'];
  return object(value,keys) && value.capacity === CAPACITY && value.identityMapCapacity === 256 && value.linkLimit === LINK_LIMIT &&
    linkageCounts.every(key => count(value[key])) && object(value.costs,['consumed','unconsumed','expiredUnconsumed']) &&
    cost(value.costs.consumed,value.consumedPreparations) && cost(value.costs.unconsumed,value.unconsumedPreparations) &&
    cost(value.costs.expiredUnconsumed,value.expiredUnconsumedPreparations) &&
    value.retainedIntents <= CAPACITY && value.retainedPreparations <= CAPACITY &&
    value.consumedPreparations + value.unconsumedPreparations === value.retainedPreparations &&
    bool(value.linkSampleTruncated) && object(value.latency,latencyNames) && latencyNames.every(key => samples(value.latency[key])) &&
    value.latency.intentToFirstAcceptedMs.observedCalls === value.firstAcceptedIntents &&
    value.latency.intentToFirstAcceptedMs.unknownCalls === value.latencyUnknownIntents &&
    Array.isArray(value.links) && value.links.length <= LINK_LIMIT && value.links.every(link) &&
    new Set(value.links.map(item => item.prepareToken)).size === value.links.length;
}
export function validateR17PhoneProbeV3Metrics(value) {
  if (!withinBudget(value) || !object(value,['schemaVersion','variant','runId','caseKey','clock','window','sampleLimit','counters','stageElapsed','timing','time','scene','viewport','binding','controls','observations','linkage']) || value.schemaVersion !== R17_PHONE_PROBE_V3_SCHEMA) return false;
  const { binding: b, controls: c, observations: o, linkage: l, window: w } = value;
  if (!clock(value.clock) || !object(w,['startDelayMs','durationLimitMs','elapsedMs','elapsedStatus','reason']) ||
    w.startDelayMs !== 1000 || w.durationLimitMs !== 45000 || !['manual','limit'].includes(w.reason) || !validInterval(w.elapsedMs,w.elapsedStatus) ||
    !object(value.stageElapsed,stages) || !stages.every(key => samples(value.stageElapsed[key])) ||
    !object(value.timing,['nativeCallbackMs','acceptedGapMs','intentToAcceptedWallMs']) || !Object.values(value.timing).every(samples)) return false;
  // Reuse only unchanged v1 counts/Scene/time/viewport validation. Synthetic
  // empty duration fields are local validation placeholders, never exported
  // and never conversion of a v3 observation into a legacy receipt.
  const empty = {calls:0,totalMs:0,minMs:0,maxMs:0,keptSamples:0,p50Ms:0,p95Ms:0,overflow:false};
  const legacy = {schemaVersion:'starward-r17-phone-probe-v1',variant:value.variant,runId:value.runId,caseKey:value.caseKey,
    clock:'Date.now',window:{startDelayMs:w.startDelayMs,durationLimitMs:w.durationLimitMs,elapsedMs:0,reason:w.reason},
    sampleLimit:value.sampleLimit,counters:value.counters,cpu:Object.fromEntries(stages.map(key => [key,empty])),
    timing:Object.fromEntries(Object.keys(value.timing).map(key => [key,empty])),time:value.time,scene:value.scene,viewport:value.viewport};
  const owners = object(o,['tm','page','scene']) ? ['tm','page','scene'] :
    object(o,['tm','page','scene','memo']) ? ['tm','page','scene','memo'] : null;
  return validateV1(legacy) && binding(b) && controlRecord(c,true) && owners !== null &&
    (b.mode !== 'scene-owned-memo' || Object.hasOwn(o,'memo')) &&
    owners.every(key => scalarFacts(o[key],key)) && linkage(l);
}
export function validateR17PhoneProbeV3Terminal(value) {
  if (!withinBudget(value) || !object(value,['schemaVersion','variant','runId','binding','clock','metricsSeal','controls']) ||
    value.schemaVersion !== R17_PHONE_PROBE_V3_TERMINAL_SCHEMA || !run(value) || !binding(value.binding) || !clock(value.clock) || !controlRecord(value.controls,false)) return false;
  const seal = value.metricsSeal;
  return object(seal,['relativeMs','recordingStartRelativeMs','startDelayMs','durationLimitMs','elapsedMs','elapsedStatus','reason']) &&
    relative(seal.relativeMs) && relative(seal.recordingStartRelativeMs) && seal.startDelayMs === 1000 && seal.durationLimitMs === 45000 &&
    validInterval(seal.elapsedMs,seal.elapsedStatus) && ['manual','limit'].includes(seal.reason) &&
    (seal.relativeMs === null || value.controls.sealRelativeMs === null || seal.relativeMs <= value.controls.sealRelativeMs);
}
// Check BEFORE writing a terminal sidecar. The caller must first read the
// already-stored metrics receipt; a missing receipt is NOT success.
export function matchR17PhoneProbeV3Terminal(metrics, terminal) {
  if (!validateR17PhoneProbeV3Metrics(metrics) || !validateR17PhoneProbeV3Terminal(terminal)) return false;
  if (metrics.variant !== terminal.variant || metrics.runId !== terminal.runId ||
    ['mode','buildGeneration','buildSourceSha256','windowId'].some(key => metrics.binding[key] !== terminal.binding[key])) return false;
  const seal = terminal.metricsSeal;
  if (seal.relativeMs !== metrics.controls.sealRelativeMs || seal.recordingStartRelativeMs !== metrics.controls.recordingStartRelativeMs ||
    ['startDelayMs','durationLimitMs','elapsedMs','elapsedStatus','reason'].some(key => seal[key] !== metrics.window[key]) ||
    ['reads','invalidReads','backwardReads'].some(key => terminal.clock[key] < metrics.clock[key])) return false;
  // Existing actual Play/export events cannot be rewritten by the terminal.
  // Pause attempts after the metrics seal may append to their own counts.
  for (const key of controls) {
    const before = metrics.controls.events[key], after = terminal.controls.events[key];
    if (after.calls < before.calls || before.calls && after.firstRelativeMs !== before.firstRelativeMs) return false;
    if (after.calls === before.calls && (after.lastRelativeMs !== before.lastRelativeMs ||
      after.lastResult !== before.lastResult && !(key === 'pauseAttempt' && before.lastResult === null))) return false;
    if (before.lastRelativeMs !== null && after.lastRelativeMs !== null && after.lastRelativeMs < before.lastRelativeMs) return false;
  }
  return true;
}
export function validateR17PhoneProbeMetrics(value) {
  if (!value || typeof value !== 'object' || !withinBudget(value)) return false;
  if (value.schemaVersion === R17_PHONE_PROBE_V3_SCHEMA) return validateR17PhoneProbeV3Metrics(value);
  if (value.schemaVersion === R17_PHONE_PROBE_V3_TERMINAL_SCHEMA) return validateR17PhoneProbeV3Terminal(value);
  return validateLegacy(value);
}
export function validateR17PhoneProbeTerminal(value) {
  if (!value || typeof value !== 'object' || !withinBudget(value)) return false;
  return value.schemaVersion === R17_PHONE_PROBE_V3_TERMINAL_SCHEMA ? validateR17PhoneProbeV3Terminal(value) : validateLegacyTerminal(value);
}
export function matchR17PhoneProbeTerminal(metrics, terminal) {
  return terminal?.schemaVersion === R17_PHONE_PROBE_V3_TERMINAL_SCHEMA ? matchR17PhoneProbeV3Terminal(metrics,terminal) : matchLegacyTerminal(metrics,terminal);
}
