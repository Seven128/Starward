// One route and strict byte budget; v1 receipts remain readable and immutable.
import { validateR17PhoneProbeMetrics as validateV1, R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES } from './r17-phone-probe-protocol.mjs';
export { R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES };
export const R17_PHONE_PROBE_V2_SCHEMA = 'starward-r17-phone-probe-v2';
export const R17_PHONE_PROBE_V2_TERMINAL_SCHEMA = 'starward-r17-phone-probe-v2-terminal';
const LIMIT = 1e12, CAPACITY = 2048, LINK_LIMIT = 32;
const modes = ['unknown','normal','cpu-page-only','cpu-text-metrics','accepted-action-direct','accepted-action-closure','scene-owned-memo'];
const controls = ['actualPlay','export','pauseAttempt','pauseSuccess','terminalExport'];
const tmCounts = ['hits','misses','evictions','nativeGlyphCalls','lifetimeHits','lifetimeMisses','lifetimeEvictions','lifetimeNativeGlyphCalls','entries','capacity','observationResets'];
const pageCounts = ['available','submitted','completed','failed','failedBeforeCallback','callbackMissing','pending','inheritedPending','maxPending','duplicateCallback','keyCountTotal','maxKeyCount','keyCountFailures','sampledCalls','sampledBytes','maxSampledBytes','serializationFailures','bufferDataCalls','totalTypedUploadBytes','maxTypedUploadBytes'];
const pageNumbers = ['latencyTotalMs','latencyMaxMs'];
const sceneCounts = ['nativeCopies','readyNativeCopies','syntheticBegins','syntheticFinishes','syntheticPublications','discs','segments','images','readiness'];
const memoCounts = ['ownedScenesCreated','ownRejected','ownedReads','ownedValueReads','ownedWrites','fallbackReads','fallbackValueReads','fallbackWrites','sameAtReuses','lifetimeOwnedScenesCreated','observationResets'];
const linkageCounts = ['intentsCreated','firstAcceptedIntents','duplicateIntentPresents','supersededBeforeFirstAccepted','firstAcceptedAfterSuperseded','expiredUnacceptedIntents','unknownIntentLookups','stateIdentityRotations','preparationsStarted','preparationsFinished','expiredUnconsumedPreparations','expiredIncompletePreparations','requests','requestsWithUnknownPreparation','requestsWithUnknownIntent','linkageMismatches','frameIdentityRotations','inheritedFrames','duplicateFramePresents','unknownAcceptedFrames','syntheticPublications','prepareFinishUnknown','prepareFinishDuplicate','latencyUnknownIntents','unacceptedIntents','supersededUnacceptedIntents','consumedPreparations','unconsumedPreparations','incompletePreparations','preparationsWithUnknownCpu','knownResourceRevisions','retainedIntents','retainedPreparations'];
const linkageNumbers = ['expiredUnconsumedCpuMs','consumedCpuMs','unconsumedCpuMs'];
const latencyNames = ['intentToFirstAcceptedMs','unsupersededIntentToFirstAcceptedMs','supersededIntentToFirstAcceptedMs'];
const object = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const number = (value, maximum=LIMIT) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum;
const count = value => number(value) && Number.isSafeInteger(value);
const optional = (value, validate) => value === null || validate(value);
const positiveId = value => count(value) && value > 0;
const relative = value => optional(value, item => number(item,60000));
const bool = value => typeof value === 'boolean';
const nullableBool = value => optional(value,bool);
const withinBudget = value => { try { return Buffer.byteLength(JSON.stringify(value),'utf8') <= R17_PHONE_PROBE_MAX_BYTES; } catch { return false; } };
const run = value => ['baseline','candidate'].includes(value.variant) && typeof value.runId === 'string' && /^r17-[1-9][0-9]{0,5}-[a-z0-9]{1,12}$/.test(value.runId);
function binding(value) {
  return object(value,['mode','buildGeneration','buildSourceSha256','windowId']) && modes.includes(value.mode) &&
    optional(value.buildGeneration,count) && optional(value.buildSourceSha256,item => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item)) && positiveId(value.windowId);
}
function samples(value) {
  return object(value,['calls','totalMs','minMs','maxMs','keptSamples','p50Ms','p95Ms','overflow']) &&
    count(value.calls) && count(value.keptSamples) && value.keptSamples <= CAPACITY && value.keptSamples <= value.calls &&
    ['totalMs','minMs','maxMs','p50Ms','p95Ms'].every(key => number(value[key])) && bool(value.overflow);
}
function controlEvents(value, monotonic, seal) {
  if (!object(value,controls)) return false;
  return controls.every(key => {
    const item = value[key];
    if (!object(item,['calls','firstRelativeMs','lastRelativeMs','lastResult']) || !count(item.calls) ||
      !relative(item.firstRelativeMs) || !relative(item.lastRelativeMs) || !nullableBool(item.lastResult)) return false;
    if (!item.calls && (item.firstRelativeMs !== null || item.lastRelativeMs !== null || item.lastResult !== null)) return false;
    if (!monotonic && (item.firstRelativeMs !== null || item.lastRelativeMs !== null)) return false;
    if (item.firstRelativeMs !== null && item.lastRelativeMs !== null && item.firstRelativeMs > item.lastRelativeMs) return false;
    return seal === null || item.lastRelativeMs === null || item.lastRelativeMs <= seal;
  });
}
function controlRecord(value, metrics) {
  const keys = metrics ? ['monotonicClock','recordingStartRelativeMs','sealRelativeMs','events'] : ['monotonicClock','sealRelativeMs','events'];
  return object(value,keys) && bool(value.monotonicClock) && relative(value.sealRelativeMs) &&
    (!metrics || relative(value.recordingStartRelativeMs)) &&
    (value.monotonicClock || value.sealRelativeMs === null && (!metrics || value.recordingStartRelativeMs === null)) &&
    controlEvents(value.events,value.monotonicClock,value.sealRelativeMs);
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
  const keys = ['prepareToken','intentSequence','scopeGeneration','kind','resourceRevision','startedRelativeMs','finishedRelativeMs','cpuMs','completed','requests','paintAttempts','firstConsumedRelativeMs','consumed','firstAcceptedRelativeMs','firstAcceptedObserved','syntheticPublications','duplicatePresents','intentRelativeMs','intentFirstAcceptedRelativeMs','intentFirstAcceptedObserved','intentSuperseded'];
  return object(value,keys) && positiveId(value.prepareToken) && optional(value.intentSequence,positiveId) && positiveId(value.scopeGeneration) &&
    value.kind === 'presentation' && optional(value.resourceRevision,count) && optional(value.cpuMs,number) && nullableBool(value.completed) &&
    ['requests','paintAttempts','syntheticPublications','duplicatePresents'].every(key => count(value[key])) &&
    ['startedRelativeMs','finishedRelativeMs','firstConsumedRelativeMs','firstAcceptedRelativeMs','intentRelativeMs','intentFirstAcceptedRelativeMs'].every(key => relative(value[key])) &&
    bool(value.consumed) && bool(value.firstAcceptedObserved) && nullableBool(value.intentFirstAcceptedObserved) && nullableBool(value.intentSuperseded);
}
function linkage(value) {
  const keys = ['capacity','identityMapCapacity','linkLimit',...linkageCounts,...linkageNumbers,'linkSampleTruncated','latency','links'];
  return object(value,keys) && value.capacity === CAPACITY && value.identityMapCapacity === 256 && value.linkLimit === LINK_LIMIT &&
    linkageCounts.every(key => count(value[key])) && linkageNumbers.every(key => number(value[key])) &&
    value.retainedIntents <= CAPACITY && value.retainedPreparations <= CAPACITY &&
    value.consumedPreparations + value.unconsumedPreparations === value.retainedPreparations &&
    bool(value.linkSampleTruncated) && object(value.latency,latencyNames) && latencyNames.every(key => samples(value.latency[key])) &&
    Array.isArray(value.links) && value.links.length <= LINK_LIMIT && value.links.every(link) &&
    new Set(value.links.map(item => item.prepareToken)).size === value.links.length;
}
export function validateR17PhoneProbeV2Metrics(value) {
  if (!withinBudget(value) || !object(value,['schemaVersion','variant','runId','caseKey','clock','window','sampleLimit','counters','cpu','timing','time','scene','viewport','binding','controls','observations','linkage']) || value.schemaVersion !== R17_PHONE_PROBE_V2_SCHEMA) return false;
  const { binding: b, controls: c, observations: o, linkage: l, ...legacy } = value;
  // The unchanged v1 CPU/time/Scene shapes and field meanings are validated by
  // the original owner, rather than maintained as a second approximate copy.
  legacy.schemaVersion = 'starward-r17-phone-probe-v1';
  const owners = object(o,['tm','page','scene']) ? ['tm','page','scene'] :
    object(o,['tm','page','scene','memo']) ? ['tm','page','scene','memo'] : null;
  return validateV1(legacy) && binding(b) && controlRecord(c,true) && owners !== null &&
    (b.mode !== 'scene-owned-memo' || Object.hasOwn(o,'memo')) &&
    owners.every(key => scalarFacts(o[key],key)) && linkage(l);
}
export function validateR17PhoneProbeTerminal(value) {
  if (!withinBudget(value) || !object(value,['schemaVersion','variant','runId','binding','metricsSeal','controls']) ||
    value.schemaVersion !== R17_PHONE_PROBE_V2_TERMINAL_SCHEMA || !run(value) || !binding(value.binding) || !controlRecord(value.controls,false)) return false;
  const seal = value.metricsSeal;
  return object(seal,['relativeMs','recordingStartRelativeMs','startDelayMs','durationLimitMs','elapsedMs','reason']) &&
    relative(seal.relativeMs) && relative(seal.recordingStartRelativeMs) && seal.startDelayMs === 1000 && seal.durationLimitMs === 45000 &&
    number(seal.elapsedMs,60000) && ['manual','limit'].includes(seal.reason) &&
    (value.controls.monotonicClock || seal.relativeMs === null && seal.recordingStartRelativeMs === null) &&
    (seal.relativeMs === null || value.controls.sealRelativeMs === null || seal.relativeMs <= value.controls.sealRelativeMs);
}
// Check BEFORE writing a terminal sidecar. The caller must first read the
// already-stored metrics receipt; a missing receipt is NOT success.
export function matchR17PhoneProbeTerminal(metrics, terminal) {
  if (!validateR17PhoneProbeV2Metrics(metrics) || !validateR17PhoneProbeTerminal(terminal)) return false;
  if (metrics.variant !== terminal.variant || metrics.runId !== terminal.runId ||
    ['mode','buildGeneration','buildSourceSha256','windowId'].some(key => metrics.binding[key] !== terminal.binding[key])) return false;
  const seal = terminal.metricsSeal;
  if (seal.relativeMs !== metrics.controls.sealRelativeMs || seal.recordingStartRelativeMs !== metrics.controls.recordingStartRelativeMs ||
    ['startDelayMs','durationLimitMs','elapsedMs','reason'].some(key => seal[key] !== metrics.window[key]) ||
    terminal.controls.monotonicClock !== metrics.controls.monotonicClock) return false;
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
  if (value?.schemaVersion === R17_PHONE_PROBE_V2_SCHEMA) return validateR17PhoneProbeV2Metrics(value);
  if (value?.schemaVersion === R17_PHONE_PROBE_V2_TERMINAL_SCHEMA) return validateR17PhoneProbeTerminal(value);
  return validateV1(value);
}
