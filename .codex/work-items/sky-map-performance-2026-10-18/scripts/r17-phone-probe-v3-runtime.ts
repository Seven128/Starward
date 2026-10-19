// TASK ONLY v3. Copy into an isolated build as r17-phone-probe-runtime.ts.
// No product scheduler, reports, frames, payloads or user text are retained.
const variant = "__VARIANT__" as "baseline" | "candidate";
const SAMPLE_LIMIT = 2048, IDENTITY_LIMIT = 256, LINK_LIMIT = 32, COUNT_LIMIT = 1e12;
const STAGES = ["presentation", "base", "selection", "supplement", "constellations", "draw", "nativePaintOwner", "displayCopy", "publishAccepted"] as const;
const COUNTERS = ["timeIntentPublications", "preparedRequests", "paintAttempts", "nativeCallbacks", "acceptedCopies", "sceneFinishes", "glDrawSubmissions", "bscSubmittedStars", "saoSubmittedStars", "acceptedBscObjects", "acceptedSaoObjects", "failedFrames", "invalidations"] as const;
const MODES = ["unknown", "normal", "cpu-page-only", "cpu-text-metrics", "accepted-action-direct", "accepted-action-closure", "scene-owned-memo"] as const;
const CONTROL_NAMES = ["actualPlay", "export", "pauseAttempt", "pauseSuccess", "terminalExport"] as const;
const TM_COUNTS = ["hits", "misses", "evictions", "nativeGlyphCalls", "lifetimeHits", "lifetimeMisses", "lifetimeEvictions", "lifetimeNativeGlyphCalls", "entries", "capacity", "observationResets"] as const;
const PAGE_COUNTS = ["available", "submitted", "completed", "failed", "failedBeforeCallback", "callbackMissing", "pending", "inheritedPending", "maxPending", "duplicateCallback", "keyCountTotal", "maxKeyCount", "keyCountFailures", "sampledCalls", "sampledBytes", "maxSampledBytes", "serializationFailures", "bufferDataCalls", "totalTypedUploadBytes", "maxTypedUploadBytes"] as const;
const PAGE_NUMBERS = ["latencyTotalMs", "latencyMaxMs"] as const;
const SCENE_COUNTS = ["nativeCopies", "readyNativeCopies", "syntheticBegins", "syntheticFinishes", "syntheticPublications", "discs", "segments", "images", "readiness"] as const;
const MEMO_COUNTS = ["ownedScenesCreated", "ownRejected", "ownedReads", "ownedValueReads", "ownedWrites", "fallbackReads", "fallbackValueReads", "fallbackWrites", "sameAtReuses", "lifetimeOwnedScenesCreated", "observationResets"] as const;
type CaseKey = "wide-camera" | "wide-time" | "wide-play" | "narrow-camera" | "narrow-time" | "narrow-play";
type Stage = typeof STAGES[number];
type Counter = typeof COUNTERS[number];
type Mode = typeof MODES[number];
type Control = typeof CONTROL_NAMES[number];
type Binding = { mode: Mode; buildGeneration: number | null; buildSourceSha256: string | null };
const UNKNOWN_REASONS = ["belowResolution", "clockUnavailable", "clockDiscontinuity", "outOfRange", "notObserved"] as const;
type UnknownReason = typeof UNKNOWN_REASONS[number];
type IntervalStatus = "valid" | UnknownReason;
type Stamp = { value: number | null; epoch: number; windowId: number };
type Interval = { elapsedMs: number | null; status: IntervalStatus };
type Samples = { validCalls: number; knownSubtotalMs: number; minMs: number; maxMs: number; values: number[]; unknown: Record<UnknownReason, number> };
type CostCoverage = { knownSubtotalMs: number; validCalls: number; unknownCalls: number; unknown: Record<UnknownReason, number> };
type TimeFacts = { events: number; values: Set<number>; first: number | null; last: number | null; minimum: number | null; maximum: number | null; overflow: boolean };
type ControlFacts = { calls: number; firstRelativeMs: number | null; lastRelativeMs: number | null; lastResult: boolean | null };
type Intent = { id: number; scope: number; stamp: Stamp; wall: number | null; firstAccepted: number | null; acceptedOnce: boolean; superseded: boolean };
type Preparation = { id: number; scope: number; intent: number | null; kind: "presentation"; resourceRevision: number | null;
  stamp: Stamp; started: number | null; finished: number | null; cost: Interval; completed: boolean | null;
  requests: number; paints: number; consumed: number | null; used: boolean; accepted: number | null; acceptedOnce: boolean; synthetic: number; duplicates: number };
type FrameFacts = { token: number | null; intent: number | null; scope: number; attempt: Stamp | null; accepted: boolean };
type ScalarCapture = { relativeMs: number | null; values: Record<string, number | boolean | null> };
type ScalarFacts = { captures: number; first: ScalarCapture | null; last: ScalarCapture | null };
const add = (left: number, right = 1) => Math.min(COUNT_LIMIT, left + Math.max(0, right));
const unknownCounts = () => Object.fromEntries(UNKNOWN_REASONS.map(key => [key, 0])) as Record<UnknownReason, number>;
const sample = (): Samples => ({ validCalls: 0, knownSubtotalMs: 0, minMs: Infinity, maxMs: 0, values: [], unknown: unknownCounts() });
const coverage = (): CostCoverage => ({ knownSubtotalMs: 0, validCalls: 0, unknownCalls: 0, unknown: unknownCounts() });
const timeFacts = (): TimeFacts => ({ events: 0, values: new Set(), first: null, last: null, minimum: null, maximum: null, overflow: false });
const scalarFacts = (): ScalarFacts => ({ captures: 0, first: null, last: null });
const controlFacts = () => Object.fromEntries(CONTROL_NAMES.map(key => [key, { calls: 0, firstRelativeMs: null, lastRelativeMs: null, lastResult: null }])) as Record<Control, ControlFacts>;
// Fixed source for this protocol. A callable wx/global performance method is
// not a calibration. No fallback can mix clock domains within an interval.
let clockEpoch = 0, previousClock: number | null = null;
let clockReads = 0, invalidClockReads = 0, backwardClockReads = 0;
const missingStamp = (): Stamp => ({ value: null, epoch: clockEpoch, windowId: sequence });
function now(): Stamp {
  let value: number | null = null;
  try { const read = Date.now(); if (Number.isSafeInteger(read) && read >= 0) value = read; } catch {}
  clockReads = add(clockReads);
  if (value === null) { invalidClockReads = add(invalidClockReads); clockEpoch++; }
  else if (previousClock !== null && value < previousClock) { backwardClockReads = add(backwardClockReads); clockEpoch++; }
  previousClock = value;
  return { value, epoch: clockEpoch, windowId: sequence };
}
function interval(start: Stamp | null, end: Stamp): Interval {
  if (!start || !Number.isSafeInteger(start.windowId) || !Number.isSafeInteger(start.epoch) ||
    !(start.value === null || Number.isSafeInteger(start.value))) return { elapsedMs: null, status: "notObserved" };
  if (start.value === null || end.value === null) return { elapsedMs: null, status: "clockUnavailable" };
  if (start.windowId !== end.windowId || start.epoch !== end.epoch || end.value < start.value)
    return { elapsedMs: null, status: "clockDiscontinuity" };
  const elapsed = end.value - start.value;
  if (elapsed > 60000) return { elapsedMs: null, status: "outOfRange" };
  // Date.now has millisecond units. Equal readings do not establish free work.
  if (elapsed < 1) return { elapsedMs: null, status: "belowResolution" };
  return { elapsedMs: elapsed, status: "valid" };
}
function clockFacts() {
  return { source: "Date.now", unit: "ms", kind: "wall-elapsed", monotonic: false,
    availability: clockReads === invalidClockReads ? "unavailable" : invalidClockReads ? "partial" : "available",
    nominalResolutionMs: 1, effectiveResolutionMs: null, reads: clockReads, invalidReads: invalidClockReads, backwardReads: backwardClockReads };
}
let active = false, armed = false, sealed = false, terminalSealed = false;
let sequence = 0, runId = "", caseKey: CaseKey = "wide-camera";
let startAt: Stamp | null = null, armedAt = missingStamp(), windowElapsed: Interval = { elapsedMs: null, status: "notObserved" };
let reason: "limit" | "manual" = "manual", arm: ReturnType<typeof setTimeout> | undefined, deadline: ReturnType<typeof setTimeout> | undefined;
let configuration: Binding = { mode: "unknown", buildGeneration: null, buildSourceSha256: null };
let binding: Binding & { windowId: number } = { ...configuration, windowId: 0 };
let controls = controlFacts(), controlsAtSeal = controlFacts();
let metricsSealRelativeMs: number | null = null, terminalSealRelativeMs: number | null = null, recordingStartRelativeMs: number | null = null;
let metricsClock: ReturnType<typeof clockFacts> | null = null, terminalClock: ReturnType<typeof clockFacts> | null = null;
let observations = { tm: scalarFacts(), page: scalarFacts(), scene: scalarFacts(), memo: scalarFacts() };
let counters = Object.fromEntries(COUNTERS.map(key => [key, 0])) as Record<Counter, number>;
let stageElapsed = Object.fromEntries(STAGES.map(key => [key, sample()])) as Record<Stage, Samples>;
let timing = { nativeCallbackMs: sample(), acceptedGapMs: sample(), intentToAcceptedWallMs: sample() };
let times = { intent: timeFacts(), prepared: timeFacts(), painted: timeFacts(), accepted: timeFacts() };
let originInstant: number | null = null, latestIntent: { at: number; stamp: Stamp } | null = null, previousAcceptedWall: Stamp | null = null;
let lastRequestedMinusAcceptedMs: number | null = null, maximumRequestedMinusAcceptedMs: number | null = null;
let scene = freshScene(), viewport = freshViewport();
let scopeGeneration = 1, intentSequence = 0, prepareSequence = 0, latestIntentSequence: number | null = null;
let intentRing: (Intent | undefined)[] = new Array(SAMPLE_LIMIT), prepareRing: (Preparation | undefined)[] = new Array(SAMPLE_LIMIT);
let stateIds = new WeakMap<object, number>(), stateEntries = 0, frames = new WeakMap<object, FrameFacts>(), frameEntries = 0;
let links = freshLinks();
let expiredUnconsumedCost = coverage();
let latency = { intentToFirstAcceptedMs: sample(), unsupersededIntentToFirstAcceptedMs: sample(), supersededIntentToFirstAcceptedMs: sample() };
function freshScene() { return { baseRowsMin: Infinity, baseRowsMax: 0, saoRowsMin: Infinity, saoRowsMax: 0, selectedTilesMin: Infinity, selectedTilesMax: 0,
  catalogVersions: new Set<string>(), saoPublicationHashes: new Set<string>(), modelAlgorithms: new Set<string>(), modes: new Set<string>() }; }
function freshViewport() { return { widthMin: Infinity, widthMax: 0, heightMin: Infinity, heightMax: 0, fovMin: Infinity, fovMax: 0 }; }
function freshLinks() { return { intentsCreated: 0, firstAcceptedIntents: 0, duplicateIntentPresents: 0, supersededBeforeFirstAccepted: 0,
  firstAcceptedAfterSuperseded: 0, expiredUnacceptedIntents: 0, unknownIntentLookups: 0, stateIdentityRotations: 0,
  preparationsStarted: 0, preparationsFinished: 0, expiredUnconsumedPreparations: 0,
  expiredIncompletePreparations: 0, requests: 0, requestsWithUnknownPreparation: 0, requestsWithUnknownIntent: 0,
  linkageMismatches: 0, frameIdentityRotations: 0, inheritedFrames: 0, duplicateFramePresents: 0, unknownAcceptedFrames: 0,
  syntheticPublications: 0, prepareFinishUnknown: 0, prepareFinishDuplicate: 0, latencyUnknownIntents: 0 }; }
function relative(at = now()): number | null {
  if (!runId || at.value === null || armedAt.value === null || at.windowId !== armedAt.windowId || at.epoch !== armedAt.epoch) return null;
  const value = at.value - armedAt.value;
  return Number.isFinite(value) && value >= 0 && value <= 60000 ? value : null;
}
const id = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= COUNT_LIMIT;
const revision = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= COUNT_LIMIT;
const object = (value: unknown): value is object => value !== null && typeof value === "object";
function getIntent(value: number | null) { const item = value === null ? undefined : intentRing[(value - 1) % SAMPLE_LIMIT]; return item?.id === value ? item : undefined; }
function getPreparation(value: number | null) { const item = value === null ? undefined : prepareRing[(value - 1) % SAMPLE_LIMIT]; return item?.id === value ? item : undefined; }
function rememberState(state: object, value: number) {
  if (!stateIds.has(state)) { if (stateEntries >= IDENTITY_LIMIT) { stateIds = new WeakMap(); stateEntries = 0; links.stateIdentityRotations = add(links.stateIdentityRotations); } stateEntries++; }
  stateIds.set(state, value);
}
function rememberFrame(frame: object, value: FrameFacts) {
  if (!frames.has(frame)) { if (frameEntries >= IDENTITY_LIMIT) { frames = new WeakMap(); frameEntries = 0; links.frameIdentityRotations = add(links.frameIdentityRotations); } frameEntries++; }
  frames.set(frame, value);
}
function record(target: Samples, value: Interval) {
  if (value.status !== "valid" || value.elapsedMs === null) {
    const reason = value.status === "valid" ? "notObserved" : value.status;
    target.unknown[reason] = add(target.unknown[reason]); return;
  }
  target.validCalls = add(target.validCalls); target.knownSubtotalMs = add(target.knownSubtotalMs, value.elapsedMs);
  target.minMs = Math.min(target.minMs, value.elapsedMs); target.maxMs = Math.max(target.maxMs, value.elapsedMs);
  if (target.values.length < SAMPLE_LIMIT) target.values.push(value.elapsedMs);
}
function addCost(target: CostCoverage, value: Interval) {
  if (value.status === "valid" && value.elapsedMs !== null) { target.validCalls = add(target.validCalls); target.knownSubtotalMs = add(target.knownSubtotalMs, value.elapsedMs); }
  else { const reason = value.status === "valid" ? "notObserved" : value.status; target.unknownCalls = add(target.unknownCalls); target.unknown[reason] = add(target.unknown[reason]); }
}
function summarize(value: Samples) {
  const ordered = [...value.values].sort((a, b) => a - b);
  const unknownCalls = Object.values(value.unknown).reduce((sum, item) => add(sum, item), 0);
  return { observedCalls: add(value.validCalls, unknownCalls), validCalls: value.validCalls, unknownCalls,
    unknown: { ...value.unknown }, knownSubtotalMs: value.knownSubtotalMs, minMs: value.validCalls ? value.minMs : null, maxMs: value.validCalls ? value.maxMs : null,
    keptSamples: ordered.length, p50Ms: ordered.length ? ordered[Math.floor(ordered.length * .5)]! : null,
    p95Ms: ordered.length ? ordered[Math.floor(ordered.length * .95)]! : null, overflow: value.validCalls > SAMPLE_LIMIT };
}
function eventTime(target: TimeFacts, at: unknown) {
  if (typeof at !== "string") return;
  const instant = Date.parse(at); if (!Number.isFinite(instant)) return;
  originInstant ??= instant;
  target.events = add(target.events); target.first ??= instant; target.last = instant;
  target.minimum = target.minimum === null ? instant : Math.min(target.minimum, instant);
  target.maximum = target.maximum === null ? instant : Math.max(target.maximum, instant);
  if (target.values.size < SAMPLE_LIMIT) target.values.add(instant); else if (!target.values.has(instant)) target.overflow = true;
}
const summarizeTime = (value: TimeFacts) => ({ events: value.events, distinct: value.values.size,
  firstRelativeMs: value.first === null || originInstant === null ? null : value.first - originInstant,
  lastRelativeMs: value.last === null || originInstant === null ? null : value.last - originInstant,
  minRelativeMs: value.minimum === null || originInstant === null ? null : value.minimum - originInstant,
  maxRelativeMs: value.maximum === null || originInstant === null ? null : value.maximum - originInstant, overflow: value.overflow });
function publicIdentifier(target: Set<string>, value: unknown) {
  if (target.size < 8 && typeof value === "string" && /^[A-Za-z0-9_.:+/-]{1,160}$/.test(value)) target.add(value);
}
const finiteMinimum = (value: number) => Number.isFinite(value) ? value : 0;
const cloneControls = (value: Record<Control, ControlFacts>) => Object.fromEntries(CONTROL_NAMES.map(key => [key, { ...value[key] }]));
function stop(nextReason: "limit" | "manual" = "manual") {
  const wasRunning = active || armed;
  if (active) windowElapsed = interval(startAt, now());
  active = armed = false; if (wasRunning) reason = nextReason;
  if (arm !== undefined) clearTimeout(arm); if (deadline !== undefined) clearTimeout(deadline);
  arm = deadline = undefined;
}
function acceptedIdentity(frame: unknown, synthetic: boolean) {
  const facts = object(frame) ? frames.get(frame) : undefined;
  if (synthetic) links.syntheticPublications = add(links.syntheticPublications);
  if (!facts) { if (!synthetic) links.unknownAcceptedFrames = add(links.unknownAcceptedFrames); return; }
  const preparation = getPreparation(facts.token), intent = getIntent(facts.intent), stamp = now(), wall = relative(stamp);
  if (synthetic) { if (preparation) preparation.synthetic = add(preparation.synthetic); return; }
  if (facts.accepted) links.duplicateFramePresents = add(links.duplicateFramePresents);
  facts.accepted = true;
  if (preparation) {
    if (preparation.acceptedOnce) preparation.duplicates = add(preparation.duplicates);
    else { preparation.acceptedOnce = true; preparation.accepted = wall; }
  }
  if (!intent || intent.scope !== facts.scope) { links.unknownAcceptedFrames = add(links.unknownAcceptedFrames); return; }
  if (intent.acceptedOnce) { links.duplicateIntentPresents = add(links.duplicateIntentPresents); return; }
  intent.acceptedOnce = true; intent.firstAccepted = wall; links.firstAcceptedIntents = add(links.firstAcceptedIntents);
  if (intent.superseded) links.firstAcceptedAfterSuperseded = add(links.firstAcceptedAfterSuperseded);
  const duration = interval(intent.stamp, stamp);
  if (duration.status !== "valid") links.latencyUnknownIntents = add(links.latencyUnknownIntents);
  record(latency.intentToFirstAcceptedMs, duration);
  record(intent.superseded ? latency.supersededIntentToFirstAcceptedMs : latency.unsupersededIntentToFirstAcceptedMs, duration);
}
function summarizeLinks() {
  let unacceptedIntents = 0, supersededUnacceptedIntents = 0, consumedPreparations = 0, unconsumedPreparations = 0, incompletePreparations = 0;
  let knownResourceRevisions = 0;
  const consumedCost = coverage(), unconsumedCost = coverage();
  for (const value of intentRing) if (value && !value.acceptedOnce) { unacceptedIntents++; if (value.superseded) supersededUnacceptedIntents++; }
  const retained = prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id);
  for (const value of retained) {
    if (value.resourceRevision !== null) knownResourceRevisions++;
    if (value.completed === null) incompletePreparations++;
    if (!value.used) { unconsumedPreparations++; addCost(unconsumedCost, value.cost); }
    else { consumedPreparations++; addCost(consumedCost, value.cost); }
  }
  const selected = retained.length <= LINK_LIMIT ? retained : [...retained.slice(0, LINK_LIMIT / 2), ...retained.slice(-LINK_LIMIT / 2)];
  return { capacity: SAMPLE_LIMIT, identityMapCapacity: IDENTITY_LIMIT, linkLimit: LINK_LIMIT, ...links,
    unacceptedIntents, supersededUnacceptedIntents, consumedPreparations, unconsumedPreparations, incompletePreparations,
    costs: { consumed: consumedCost, unconsumed: unconsumedCost, expiredUnconsumed: { ...expiredUnconsumedCost, unknown: { ...expiredUnconsumedCost.unknown } } }, knownResourceRevisions,
    retainedIntents: intentRing.filter(Boolean).length, retainedPreparations: retained.length,
    linkSampleTruncated: retained.length > LINK_LIMIT, latency: Object.fromEntries(Object.entries(latency).map(([key, value]) => [key, summarize(value)])),
    links: selected.map(value => ({ prepareToken: value.id, intentSequence: value.intent, scopeGeneration: value.scope,
      kind: value.kind, resourceRevision: value.resourceRevision, startedRelativeMs: value.started, finishedRelativeMs: value.finished,
      elapsedMs: value.cost.elapsedMs, elapsedStatus: value.cost.status, completed: value.completed, requests: value.requests, paintAttempts: value.paints,
      firstConsumedRelativeMs: value.consumed, consumed: value.used, firstAcceptedRelativeMs: value.accepted, firstAcceptedObserved: value.acceptedOnce, syntheticPublications: value.synthetic,
      duplicatePresents: value.duplicates, intentRelativeMs: getIntent(value.intent)?.wall ?? null,
      intentFirstAcceptedRelativeMs: getIntent(value.intent)?.firstAccepted ?? null, intentFirstAcceptedObserved: getIntent(value.intent)?.acceptedOnce ?? null,
      intentSuperseded: getIntent(value.intent)?.superseded ?? null })) };
}
export const r17Probe = {
  now,
  configureBinding(value: Binding) {
    if (active || armed || !MODES.includes(value.mode) || !(value.buildGeneration === null || revision(value.buildGeneration)) ||
      !(value.buildSourceSha256 === null || /^[a-f0-9]{64}$/.test(value.buildSourceSha256))) return false;
    configuration = { mode: value.mode, buildGeneration: value.buildGeneration, buildSourceSha256: value.buildSourceSha256 }; return true;
  },
  start(selected: CaseKey) {
    stop(); caseKey = selected; runId = `r17-${++sequence}-${Math.random().toString(36).slice(2, 12)}`;
    clockEpoch = clockReads = invalidClockReads = backwardClockReads = 0; previousClock = null;
    binding = { ...configuration, windowId: sequence }; armedAt = now(); sealed = terminalSealed = false;
    startAt = null; metricsClock = terminalClock = null;
    metricsSealRelativeMs = terminalSealRelativeMs = recordingStartRelativeMs = null; controls = controlFacts(); controlsAtSeal = controlFacts();
    observations = { tm: scalarFacts(), page: scalarFacts(), scene: scalarFacts(), memo: scalarFacts() };
    counters = Object.fromEntries(COUNTERS.map(key => [key, 0])) as Record<Counter, number>;
    stageElapsed = Object.fromEntries(STAGES.map(key => [key, sample()])) as Record<Stage, Samples>;
    timing = { nativeCallbackMs: sample(), acceptedGapMs: sample(), intentToAcceptedWallMs: sample() };
    times = { intent: timeFacts(), prepared: timeFacts(), painted: timeFacts(), accepted: timeFacts() };
    originInstant = null; latestIntent = null; previousAcceptedWall = null; lastRequestedMinusAcceptedMs = maximumRequestedMinusAcceptedMs = null;
    windowElapsed = { elapsedMs: null, status: "notObserved" }; scene = freshScene(); viewport = freshViewport();
    // Memo envelopes can survive a recorder restart. Keep numeric identities
    // unique for this runtime lifetime; their existing COUNT_LIMIT guards fail
    // closed instead of reusing an identity from a previous run.
    scopeGeneration = 1; latestIntentSequence = null;
    intentRing = new Array(SAMPLE_LIMIT); prepareRing = new Array(SAMPLE_LIMIT);
    stateIds = new WeakMap(); frames = new WeakMap(); stateEntries = frameEntries = 0; links = freshLinks(); expiredUnconsumedCost = coverage();
    latency = { intentToFirstAcceptedMs: sample(), unsupersededIntentToFirstAcceptedMs: sample(), supersededIntentToFirstAcceptedMs: sample() };
    armed = true;
    arm = setTimeout(() => { arm = undefined; armed = false; active = true; startAt = now(); recordingStartRelativeMs = relative(startAt);
      deadline = setTimeout(() => stop("limit"), 45000); }, 1000);
  },
  stop,
  status: () => armed ? "armed" : active ? "recording" : runId ? "stopped" : "empty",
  control(name: Control, result: boolean | null = null) {
    if (!runId || terminalSealed || !CONTROL_NAMES.includes(name)) return false;
    const value = controls[name], at = relative(); value.calls = add(value.calls);
    if (value.calls === 1) value.firstRelativeMs = at;
    value.lastRelativeMs = at; value.lastResult = typeof result === "boolean" ? result : null; return true;
  },
  controlResult(name: "pauseAttempt", result: boolean | null) {
    // Report the actual guarded callback result without inventing a second
    // attempt or a successful Pause. Unknown remains null.
    if (!runId || terminalSealed || name !== "pauseAttempt" || !controls.pauseAttempt.calls) return false;
    controls.pauseAttempt.lastResult = typeof result === "boolean" ? result : null; return true;
  },
  scalars(owner: "tm" | "page" | "scene" | "memo", source: unknown) {
    if (!runId || sealed || !object(source) || !Object.hasOwn(observations, owner)) return false;
    const values: Record<string, number | boolean | null> = {};
    const input = source as Record<string, unknown>;
    const countKeys = owner === "tm" ? TM_COUNTS : owner === "page" ? PAGE_COUNTS : owner === "memo" ? MEMO_COUNTS : SCENE_COUNTS;
    for (const key of countKeys) values[key] = revision(input[key]) ? input[key] as number : null;
    for (const key of owner === "page" ? PAGE_NUMBERS : []) values[key] = typeof input[key] === "number" && Number.isFinite(input[key]) && (input[key] as number) >= 0 && (input[key] as number) <= COUNT_LIMIT ? input[key] as number : null;
    for (const key of owner === "tm" ? ["retired", "available"] : owner === "page" ? ["enableDebug"] : owner === "memo" ? [] : ["frozen", "retired"]) values[key] = typeof input[key] === "boolean" ? input[key] as boolean : null;
    const facts = observations[owner], capture = { relativeMs: relative(), values };
    facts.captures = add(facts.captures); facts.first ??= capture; facts.last = capture; return true;
  },
  measure<T>(stage: Stage, work: () => T, after?: (result: T) => void): T {
    if (!active) return work();
    const started = now(); try { const result = work(); after?.(result); return result; } finally { if (active) record(stageElapsed[stage], interval(started, now())); }
  },
  // Legacy hook name only; v3 exports elapsed time, never thread CPU time.
  // Pass the opaque Stamp from this runtime's now(), not another clock value.
  cpuSince(stage: Stage, started: Stamp) { if (active) record(stageElapsed[stage], interval(started && typeof started === "object" ? started : null, now())); },
  count(name: Counter) { if (active && Object.hasOwn(counters, name)) counters[name] = add(counters[name]); },
  intent(state: { at: string }) {
    if (!active) return null;
    counters.timeIntentPublications = add(counters.timeIntentPublications); eventTime(times.intent, state.at);
    const stamp = now(), at = Date.parse(state.at); if (Number.isFinite(at)) latestIntent = { at, stamp };
    const existing = stateIds.get(state); if (existing !== undefined) return existing;
    if (intentSequence >= COUNT_LIMIT) return null;
    const previous = getIntent(latestIntentSequence);
    if (previous && !previous.acceptedOnce && !previous.superseded) { previous.superseded = true; links.supersededBeforeFirstAccepted = add(links.supersededBeforeFirstAccepted); }
    const next = ++intentSequence, slot = (next - 1) % SAMPLE_LIMIT, retired = intentRing[slot];
    if (retired && !retired.acceptedOnce) links.expiredUnacceptedIntents = add(links.expiredUnacceptedIntents);
    intentRing[slot] = { id: next, scope: scopeGeneration, stamp, wall: relative(stamp), firstAccepted: null, acceptedOnce: false, superseded: false };
    latestIntentSequence = next; rememberState(state, next); links.intentsCreated = add(links.intentsCreated); return next;
  },
  intentSequence(state: unknown): number | null {
    if (!active || !object(state)) return null;
    const value = stateIds.get(state);
    if (value === undefined || !getIntent(value)) { links.unknownIntentLookups = add(links.unknownIntentLookups); return null; }
    return value;
  },
  scopeChanged() { if (!active || scopeGeneration >= COUNT_LIMIT) return null; latestIntentSequence = null; return ++scopeGeneration; },
  prepareStarted(sequence: number | null, kind: "presentation" = "presentation", resourceRevision: number | null = null): number | null {
    if (!active || prepareSequence >= COUNT_LIMIT || kind !== "presentation") return null;
    const intent = id(sequence) ? getIntent(sequence) : undefined;
    const next = ++prepareSequence, slot = (next - 1) % SAMPLE_LIMIT, retired = prepareRing[slot];
    if (retired) {
      // After eviction a future consumer can no longer be linked: this cost is
      // explicitly unresolved, never silently added to proven wasted work.
      if (retired.completed === null) links.expiredIncompletePreparations = add(links.expiredIncompletePreparations);
      if (!retired.used) { links.expiredUnconsumedPreparations = add(links.expiredUnconsumedPreparations); addCost(expiredUnconsumedCost, retired.cost); }
    }
    const stamp = now();
    prepareRing[slot] = { id: next, scope: scopeGeneration, intent: intent?.scope === scopeGeneration ? intent.id : null,
      kind, resourceRevision: revision(resourceRevision) ? resourceRevision : null, stamp, started: relative(stamp), finished: null,
      cost: { elapsedMs: null, status: "notObserved" }, completed: null,
      requests: 0, paints: 0, consumed: null, used: false, accepted: null, acceptedOnce: false, synthetic: 0, duplicates: 0 };
    links.preparationsStarted = add(links.preparationsStarted); return next;
  },
  prepareFinished(token: number | null, completed = true) {
    if (!active) return;
    const value = getPreparation(token); if (!value) { links.prepareFinishUnknown = add(links.prepareFinishUnknown); return; }
    if (value.completed !== null) { links.prepareFinishDuplicate = add(links.prepareFinishDuplicate); return; }
    const stamp = now(); value.finished = relative(stamp); value.completed = completed;
    value.cost = interval(value.stamp, stamp);
    links.preparationsFinished = add(links.preparationsFinished);
  },
  request(frame: unknown, token: number | null, sequence: number | null) {
    if (!active || !object(frame)) return false;
    let preparation = getPreparation(token), intent = getIntent(sequence);
    if (intent?.scope !== scopeGeneration) intent = undefined;
    if (preparation && (preparation.scope !== scopeGeneration || preparation.intent !== (intent?.id ?? null))) { links.linkageMismatches = add(links.linkageMismatches); preparation = undefined; intent = undefined; }
    links.requests = add(links.requests);
    if (!preparation) links.requestsWithUnknownPreparation = add(links.requestsWithUnknownPreparation); else preparation.requests = add(preparation.requests);
    if (!intent) links.requestsWithUnknownIntent = add(links.requestsWithUnknownIntent);
    rememberFrame(frame, { token: preparation?.id ?? null, intent: intent?.id ?? null, scope: scopeGeneration, attempt: null, accepted: false }); return true;
  },
  inheritFrame(resolved: unknown, original: unknown) {
    if (!active || !object(resolved) || !object(original)) return false;
    const value = frames.get(original); if (!value) return false;
    if (resolved !== original) { rememberFrame(resolved, { ...value }); links.inheritedFrames = add(links.inheritedFrames); } return true;
  },
  prepared(frame: any) { if (active) { counters.preparedRequests = add(counters.preparedRequests); eventTime(times.prepared, frame?.frameAt); } },
  paintStarted(frame: any) {
    if (!active) return; counters.paintAttempts = add(counters.paintAttempts); eventTime(times.painted, frame?.frameAt);
    if (!object(frame)) return;
    const facts = frames.get(frame) ?? { token: null, intent: null, scope: scopeGeneration, attempt: null, accepted: false };
    facts.attempt = now(); rememberFrame(frame, facts);
    const value = getPreparation(facts.token); if (value) { value.paints = add(value.paints); if (!value.used) value.consumed = relative(); value.used = true; }
  },
  callback(frame: any) {
    if (!active) return; counters.nativeCallbacks = add(counters.nativeCallbacks);
    const started = object(frame) ? frames.get(frame)?.attempt : null;
    record(timing.nativeCallbackMs, interval(started ?? null, now()));
  },
  tiles(count: number) { if (active && Number.isSafeInteger(count) && count >= 0) { scene.selectedTilesMin = Math.min(scene.selectedTilesMin, count); scene.selectedTilesMax = Math.max(scene.selectedTilesMax, count); } },
  sceneFinished(data: any, frameAt: unknown, base: any, supplement: any, width: number, height: number, fov: number, mode: string, bsc: number, sao: number) {
    if (!active) return;
    counters.sceneFinishes = add(counters.sceneFinishes); counters.bscSubmittedStars = add(counters.bscSubmittedStars, bsc); counters.saoSubmittedStars = add(counters.saoSubmittedStars, sao);
    const baseRows = base?.pointCount ?? base?.points?.length ?? 0, saoRows = supplement?.pointCount ?? supplement?.points?.length ?? 0;
    scene.baseRowsMin = Math.min(scene.baseRowsMin, baseRows); scene.baseRowsMax = Math.max(scene.baseRowsMax, baseRows);
    scene.saoRowsMin = Math.min(scene.saoRowsMin, saoRows); scene.saoRowsMax = Math.max(scene.saoRowsMax, saoRows);
    publicIdentifier(scene.catalogVersions, data?.skyScene?.catalog?.catalogVersion); publicIdentifier(scene.saoPublicationHashes, supplement?.publicationHash);
    const geometry = data?.observationFrames?.find((value: any) => value.at === frameAt);
    publicIdentifier(scene.modelAlgorithms, geometry?.modelAlgorithmVersion); publicIdentifier(scene.modes, mode);
    viewport.widthMin = Math.min(viewport.widthMin, width); viewport.widthMax = Math.max(viewport.widthMax, width);
    viewport.heightMin = Math.min(viewport.heightMin, height); viewport.heightMax = Math.max(viewport.heightMax, height);
    viewport.fovMin = Math.min(viewport.fovMin, fov); viewport.fovMax = Math.max(viewport.fovMax, fov);
  },
  syntheticAccepted(frame: unknown) { if (active) acceptedIdentity(frame, true); },
  accepted(frame: any, snapshot: any) {
    if (!active) return; acceptedIdentity(frame, false);
    const wall = now(); counters.acceptedCopies = add(counters.acceptedCopies); eventTime(times.accepted, frame?.frameAt);
    if (previousAcceptedWall !== null) record(timing.acceptedGapMs, interval(previousAcceptedWall, wall)); previousAcceptedWall = wall;
    for (const value of snapshot?.objects ?? []) {
      if (typeof value.reference === "string" && value.reference.startsWith("HR:")) counters.acceptedBscObjects = add(counters.acceptedBscObjects);
      if (typeof value.reference === "string" && value.reference.startsWith("SAO:")) counters.acceptedSaoObjects = add(counters.acceptedSaoObjects);
    }
    // Kept unchanged for continuity; this legacy conditional sample is NOT the
    // new first-accepted distribution and may include repeated final presents.
    if (latestIntent) {
      const accepted = Date.parse(frame?.frameAt); if (Number.isFinite(accepted)) {
        lastRequestedMinusAcceptedMs = latestIntent.at - accepted;
        maximumRequestedMinusAcceptedMs = maximumRequestedMinusAcceptedMs === null ? lastRequestedMinusAcceptedMs : Math.max(maximumRequestedMinusAcceptedMs, lastRequestedMinusAcceptedMs);
        if (accepted === latestIntent.at) record(timing.intentToAcceptedWallMs, interval(latestIntent.stamp, wall));
      }
    }
  },
  snapshot() {
    if (!sealed) { stop(); metricsSealRelativeMs = relative(); controlsAtSeal = cloneControls(controls) as Record<Control, ControlFacts>; metricsClock = clockFacts(); sealed = true; }
    return { schemaVersion: "starward-r17-phone-probe-v3", variant, runId, caseKey, clock: { ...metricsClock! },
      window: { startDelayMs: 1000, durationLimitMs: 45000, elapsedMs: windowElapsed.elapsedMs, elapsedStatus: windowElapsed.status, reason }, sampleLimit: SAMPLE_LIMIT,
      counters: { ...counters }, stageElapsed: Object.fromEntries(STAGES.map(stage => [stage, summarize(stageElapsed[stage])])),
      timing: Object.fromEntries(Object.entries(timing).map(([key, value]) => [key, summarize(value)])),
      time: { ...Object.fromEntries(Object.entries(times).map(([key, value]) => [key, summarizeTime(value)])), lastRequestedMinusAcceptedMs, maximumRequestedMinusAcceptedMs },
      scene: { baseRowsMin: finiteMinimum(scene.baseRowsMin), baseRowsMax: scene.baseRowsMax, saoRowsMin: finiteMinimum(scene.saoRowsMin), saoRowsMax: scene.saoRowsMax,
        selectedTilesMin: finiteMinimum(scene.selectedTilesMin), selectedTilesMax: scene.selectedTilesMax,
        catalogVersions: [...scene.catalogVersions], saoPublicationHashes: [...scene.saoPublicationHashes], modelAlgorithms: [...scene.modelAlgorithms], modes: [...scene.modes] },
      viewport: Object.fromEntries(Object.entries(viewport).map(([key, value]) => [key, finiteMinimum(value)])),
      binding: { ...binding }, controls: { recordingStartRelativeMs, sealRelativeMs: metricsSealRelativeMs, events: cloneControls(controlsAtSeal) },
      observations: { tm: cloneScalar(observations.tm), page: cloneScalar(observations.page), scene: cloneScalar(observations.scene), memo: cloneScalar(observations.memo) }, linkage: summarizeLinks() };
  },
  terminalSnapshot() {
    if (!sealed || !runId) return null;
    if (!terminalSealed) { terminalSealRelativeMs = relative(); terminalClock = clockFacts(); terminalSealed = true; }
    return { schemaVersion: "starward-r17-phone-probe-v3-terminal", variant, runId, binding: { ...binding }, clock: { ...terminalClock! },
      metricsSeal: { relativeMs: metricsSealRelativeMs, recordingStartRelativeMs, startDelayMs: 1000, durationLimitMs: 45000,
        elapsedMs: windowElapsed.elapsedMs, elapsedStatus: windowElapsed.status, reason },
      controls: { sealRelativeMs: terminalSealRelativeMs, events: cloneControls(controls) } };
  },
};
function cloneScalar(value: ScalarFacts) {
  const clone = (item: ScalarCapture | null) => item === null ? null : { relativeMs: item.relativeMs, values: { ...item.values } };
  return { captures: value.captures, first: clone(value.first), last: clone(value.last) };
}
