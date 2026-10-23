// TASK ONLY normal-path counters. No native method replacement, cache,
// payload, frame, result, surface or context is retained by this observer.
const limit = 1e12;
let nativeGlyphCalls = 0, lifetimeNativeGlyphCalls = 0, observationResets = 0;
let nativeCopies = 0, readyNativeCopies = 0, retired = true;
let lifetimeNativeCopies = 0, lifetimeReadyNativeCopies = 0;
export function r17NormalMeasuredText<T>(result: T): T {
  nativeGlyphCalls = Math.min(limit, nativeGlyphCalls + 1);
  lifetimeNativeGlyphCalls = Math.min(limit, lifetimeNativeGlyphCalls + 1);
  return result;
}
export function r17NormalSurfaceReady() { retired = false; }
export function r17NormalSurfaceRetired() { retired = true; }
export function r17NormalCopyReturned(ready: boolean) {
  nativeCopies = Math.min(limit, nativeCopies + 1);
  lifetimeNativeCopies = Math.min(limit, lifetimeNativeCopies + 1);
  if (ready) {
    readyNativeCopies = Math.min(limit, readyNativeCopies + 1);
    lifetimeReadyNativeCopies = Math.min(limit, lifetimeReadyNativeCopies + 1);
  }
}
export function r17ResetNormalObservation() {
  nativeGlyphCalls = nativeCopies = readyNativeCopies = 0;
  observationResets = Math.min(limit, observationResets + 1);
}
export function r17NormalTextStats() {
  // Cache-specific fields are absent and export as null, not invented zeros.
  // nativeGlyphCalls counts returned native measureText calls, including whole strings.
  return { nativeGlyphCalls, lifetimeNativeGlyphCalls, observationResets, retired, available: true };
}
export function r17NormalSceneStats() {
  return { nativeCopies, readyNativeCopies, frozen: false, retired,
    syntheticBegins: 0, syntheticFinishes: 0, syntheticPublications: 0 };
}

// Finite r9 lifecycle receipt, separate from the sealed 15s metrics protocol.
// Only these declared scalars are copied. No native object, reader, frame,
// product timestamp string or teardown callback is accepted or retained.
type NativeFacts = {
  nodePresent: boolean; displayPresent: boolean; selectionDisplayPresent: boolean;
  nodeWidth: number | null; nodeHeight: number | null;
  displayWidth: number | null; displayHeight: number | null;
  selectionWidth: number | null; selectionHeight: number | null;
  selectionLayerPresent: boolean; contextPresent: boolean; contextLost: boolean | null;
};
type StepResult = "not-attempted" | "attempted" | "absent" | "unavailable" | "returned" | "threw";
type RetireSteps = Record<"selection" | "contextExtension" | "contextLoss" | "nodeWidth" | "nodeHeight" | "displayWidth" | "displayHeight", StepResult>;
type Binding = { buildGeneration: number; buildSourceSha256: string };
type SurfaceReceipt = { id: number; createdAtMs: number | null; readyAtMs: number | null; ready: NativeFacts | null;
  retireAttemptAtMs: number | null; retireCompletedAtMs: number | null;
  outcome: "attempted" | "returned" | "threw" | null; steps: RetireSteps | null; after: NativeFacts | null };
const copyCounts = () => ({ nativeCopies, readyNativeCopies, lifetimeNativeCopies, lifetimeReadyNativeCopies, observationResets });
type CopyCounts = ReturnType<typeof copyCounts>;
type RunReceipt = { playOrdinal: number; startedAtMs: number | null; start: CopyCounts;
  pauseReturnedAtMs: number | null; pauseResult: boolean | null; pause: CopyCounts | null };
let receiptBinding: Binding | null = null, receiptWriter: ((key: string, value: object) => void) | undefined;
let receiptSession = "", receiptSessionStartedAt: number | null = null;
let surfaceSequence = 0, surfacesReady = 0, retireAttempts = 0, retireCompletions = 0, rejectedEvents = 0;
let storageWriteAttempts = 0, storageWriteFailures = 0;
let lastSurface: SurfaceReceipt | null = null, lastRun: RunReceipt | null = null;
const increment = (value: number) => Math.min(limit, value + 1);
const wall = () => { try { const value = Date.now(); return Number.isSafeInteger(value) && value >= 0 ? value : null; } catch { return null; } };
const scalarNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= limit ? value : null;
function nativeFacts(value: NativeFacts): NativeFacts {
  return { nodePresent: value.nodePresent === true, displayPresent: value.displayPresent === true,
    selectionDisplayPresent: value.selectionDisplayPresent === true,
    nodeWidth: scalarNumber(value.nodeWidth), nodeHeight: scalarNumber(value.nodeHeight),
    displayWidth: scalarNumber(value.displayWidth), displayHeight: scalarNumber(value.displayHeight),
    selectionWidth: scalarNumber(value.selectionWidth), selectionHeight: scalarNumber(value.selectionHeight),
    selectionLayerPresent: value.selectionLayerPresent === true, contextPresent: value.contextPresent === true,
    contextLost: typeof value.contextLost === "boolean" ? value.contextLost : null };
}
function writeReceipt(event: "initialized" | "ready" | "retire-attempt" | "retire-complete") {
  if (!receiptBinding || !receiptWriter) return;
  storageWriteAttempts = increment(storageWriteAttempts);
  try {
    receiptWriter(`starward.r17.normal-surface-retirement.v1.${receiptBinding.buildSourceSha256}`, {
      schemaVersion: "starward-r17-normal-surface-retirement-v1", binding: { ...receiptBinding },
      sessionId: receiptSession, sessionStartedAtMs: receiptSessionStartedAt, event,
      clock: { source: "Date.now", unit: "ms", kind: "wall-stamps", monotonic: false, effectiveResolutionMs: null },
      counts: { constructionAttempts: surfaceSequence, ready: surfacesReady, retireAttempts, retireCompletions, rejectedEvents },
      storage: { writeAttempt: storageWriteAttempts, priorWriteFailures: storageWriteFailures },
      surface: lastSurface === null ? null : { ...lastSurface, ready: lastSurface.ready && { ...lastSurface.ready },
        steps: lastSurface.steps && { ...lastSurface.steps }, after: lastSurface.after && { ...lastSurface.after } },
      normalRun: lastRun === null ? null : { ...lastRun, start: { ...lastRun.start }, pause: lastRun.pause && { ...lastRun.pause } },
      copyCounts: copyCounts(), coverage: "last-surface-and-last-armed-normal-play-only-no-retainer-or-GPU-residency-proof",
    });
  } catch { storageWriteFailures = increment(storageWriteFailures); }
}
export function r17ConfigureNormalRetirementObservation(binding: Binding, write: (key: string, value: object) => void) {
  try {
    if (receiptBinding || !Number.isSafeInteger(binding.buildGeneration) || binding.buildGeneration < 0 ||
      !/^[a-f0-9]{64}$/.test(binding.buildSourceSha256) || typeof write !== "function") return false;
    receiptBinding = { buildGeneration: binding.buildGeneration, buildSourceSha256: binding.buildSourceSha256 };
    receiptWriter = write; receiptSessionStartedAt = wall();
    receiptSession = `${receiptSessionStartedAt ?? "unknown"}-${Math.random().toString(36).slice(2, 14)}`;
    writeReceipt("initialized"); return true;
  } catch { return false; }
}
export function r17NormalSurfaceCreatedReceipt() {
  try {
    if (!receiptBinding || surfaceSequence >= limit) return 0;
    surfaceSequence++;
    lastSurface = { id: surfaceSequence, createdAtMs: wall(), readyAtMs: null, ready: null,
      retireAttemptAtMs: null, retireCompletedAtMs: null, outcome: null, steps: null, after: null };
    return surfaceSequence;
  } catch { return 0; }
}
export function r17NormalSurfaceReadyReceipt(id: number, facts: NativeFacts) {
  try {
    if (!lastSurface || id !== lastSurface.id || lastSurface.ready !== null || lastSurface.outcome !== null) { rejectedEvents = increment(rejectedEvents); return; }
    lastSurface.readyAtMs = wall(); lastSurface.ready = nativeFacts(facts); surfacesReady = increment(surfacesReady);
    writeReceipt("ready");
  } catch { /* an unavailable optional observation cannot block the product */ }
}
export function r17NormalSurfaceRetirementStartedReceipt(id: number) {
  try {
    if (!lastSurface || id !== lastSurface.id || lastSurface.outcome !== null) { rejectedEvents = increment(rejectedEvents); return; }
    lastSurface.retireAttemptAtMs = wall(); lastSurface.outcome = "attempted"; retireAttempts = increment(retireAttempts);
    writeReceipt("retire-attempt");
  } catch { /* optional observation */ }
}
export function r17NormalSurfaceRetirementFinishedReceipt(id: number, facts: NativeFacts, steps: RetireSteps, returned: boolean) {
  try {
    if (!lastSurface || id !== lastSurface.id || lastSurface.outcome !== "attempted") { rejectedEvents = increment(rejectedEvents); return; }
    lastSurface.retireCompletedAtMs = wall(); lastSurface.outcome = returned ? "returned" : "threw";
    lastSurface.steps = { selection: steps.selection, contextExtension: steps.contextExtension, contextLoss: steps.contextLoss,
      nodeWidth: steps.nodeWidth, nodeHeight: steps.nodeHeight, displayWidth: steps.displayWidth, displayHeight: steps.displayHeight };
    lastSurface.after = nativeFacts(facts); retireCompletions = increment(retireCompletions);
    writeReceipt("retire-complete");
  } catch { /* optional observation */ }
}
export function r17NormalPlayStartedReceipt(playOrdinal: number) {
  try {
    if (!receiptBinding || !Number.isSafeInteger(playOrdinal) || playOrdinal <= 0 || playOrdinal > limit) return;
    lastRun = { playOrdinal, startedAtMs: wall(), start: copyCounts(), pauseReturnedAtMs: null, pauseResult: null, pause: null };
  } catch { /* optional observation */ }
}
export function r17NormalPauseResultReceipt(playOrdinal: number, result: boolean | null | undefined) {
  try {
    if (!lastRun || lastRun.playOrdinal !== playOrdinal || lastRun.pause !== null) { rejectedEvents = increment(rejectedEvents); return; }
    lastRun.pauseReturnedAtMs = wall(); lastRun.pauseResult = typeof result === "boolean" ? result : null; lastRun.pause = copyCounts();
  } catch { /* optional observation */ }
}

// TASK ONLY r19 request -> existing latest-frame coalescing -> paint admission.
// Bits: 1 input/resource effect, 2 unknown, 4 camera, 8 stars, 16 names,
// 32 images. The last four bits describe the original continuation condition.
// A union says which requests reached one pending admission, not which inputs
// were painted or why their content changed. No clock/string matching occurs.
export function createR19DrawReasons() {
  const identityLimit = 256, ringCapacity = 32;
  let selected = false, running = false, identities = new WeakMap<object, number>(), identityCount = 0;
  let requests = 0, paints = 0, mergedRequests = 0, inheritedFrames = 0;
  let identityRotations = 0, invalidReasons = 0, unknownFramePaints = 0;
  let requestMasks = new Array<number>(64).fill(0), paintMasks = new Array<number>(64).fill(0);
  let entries: [number, number, number | null, number | null][] = [];
  let lastPaintMask = 2;
  const object = (value: unknown): value is object => value !== null && typeof value === "object";
  const id = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= limit;
  const remember = (frame: object, mask: number) => {
    if (!identities.has(frame)) {
      if (identityCount >= identityLimit) { identities = new WeakMap(); identityCount = 0; identityRotations = increment(identityRotations); }
      identityCount++;
    }
    identities.set(frame, mask);
  };
  const maskOf = (frame: unknown) => object(frame) ? identities.get(frame) ?? 2 : 2;
  return {
    start(allow: boolean) {
      selected = running = allow; identities = new WeakMap(); identityCount = 0;
      requests = paints = mergedRequests = inheritedFrames = identityRotations = invalidReasons = unknownFramePaints = 0;
      lastPaintMask = 2;
      requestMasks = new Array<number>(64).fill(0); paintMasks = new Array<number>(64).fill(0); entries = [];
    },
    stop() { running = false; identities = new WeakMap(); identityCount = 0; },
    request(frame: unknown, reason: number) {
      if (!running || !object(frame) || requests >= limit) return;
      const valid = Number.isInteger(reason) && (reason === 1 || reason === 2 || reason > 0 && reason <= 60 && reason % 4 === 0);
      const mask = valid ? reason : 2;
      if (!valid) invalidReasons = increment(invalidReasons);
      requests++; requestMasks[mask] = requestMasks[mask]! + 1; remember(frame, mask);
    },
    merge(frame: unknown, pending: unknown) {
      if (!running || !object(frame) || !object(pending)) return;
      // Called only when the real lifecycle already has dirty/latest work.
      // Copy numbers into the replacement; never mutate the old in-flight frame.
      remember(frame, maskOf(frame) | maskOf(pending)); mergedRequests = increment(mergedRequests);
    },
    inherit(resolved: unknown, original: unknown) {
      if (!running || !object(resolved) || !object(original) || resolved === original) return;
      remember(resolved, maskOf(original)); inheritedFrames = increment(inheritedFrames);
    },
    replay(frame: unknown) {
      // Reset/retry can repaint retained data without a new page request.
      // Keep any pending causes, but do not present the replay as a fresh effect.
      if (running && object(frame)) remember(frame, maskOf(frame) | 2);
    },
    paint(frame: unknown, intent: number | null, preparation: number | null) {
      if (!running || paints >= limit) return;
      const known = object(frame) ? identities.get(frame) : undefined, mask = known ?? 2;
      if (known === undefined) unknownFramePaints = increment(unknownFramePaints);
      paints++; paintMasks[mask] = paintMasks[mask]! + 1;
      lastPaintMask = mask;
      entries[(paints - 1) % ringCapacity] = [paints, mask, id(intent) ? intent : null, id(preparation) ? preparation : null];
    },
    // Scalar admission only. r20 reads this immediately around the original
    // synchronous port.paint call; it never retains the frame or its contents.
    paintFacts(): readonly [number, number] | null { return running && paints ? [paints, lastPaintMask] : null; },
    attach<T extends { schemaVersion: string }>(payload: T) {
      if (!selected) return payload;
      return { ...payload, schemaVersion: "starward-r19-phone-probe-draw-reasons-v1", drawReasons: {
        schemaVersion: "starward-r19-draw-reasons-v1", metricsSchema: payload.schemaVersion,
        meaning: "request-causes-unioned-at-existing-pending-frame-paint-admission-not-pixels-or-wasted-work",
        identityLimit, ringCapacity, requests, paints, mergedRequests, inheritedFrames,
        identityRotations, invalidReasons, unknownFramePaints,
        requestMasks: [...requestMasks], paintMasks: [...paintMasks],
        dropped: Math.max(0, paints - ringCapacity),
        entries: [...entries].sort((a, b) => a[0] - b[0]).map(row => [...row]),
      } };
    },
  };
}

// TASK ONLY r20 inclusive elapsed spans. Use the existing runtime's exact
// clock/interval semantics. Submit can flush inside star traversal; both sit
// inside draw. These known subtotals must NEVER be added or called CPU/GPU time.
type R20Interval = { elapsedMs: number | null; status: "valid" | "belowResolution" | "clockUnavailable" | "clockDiscontinuity" | "outOfRange" | "notObserved" };
type R20Stage = "draw" | "starTraversal" | "rendererSubmit";
export function createR20DrawCosts<Stamp>(now: () => Stamp, interval: (start: Stamp, end: Stamp) => R20Interval) {
  const stages = ["draw", "starTraversal", "rendererSubmit"] as const;
  const reasons = ["belowResolution", "clockUnavailable", "clockDiscontinuity", "outOfRange", "notObserved"] as const;
  const cost = () => ({ observedCalls: 0, validCalls: 0, unknownCalls: 0, knownSubtotalMs: 0, maxMs: null as number | null,
    threwCalls: 0, unknown: Object.fromEntries(reasons.map(reason => [reason, 0])) as Record<typeof reasons[number], number> });
  const stageCosts = () => Object.fromEntries(stages.map(stage => [stage, cost()])) as Record<R20Stage, ReturnType<typeof cost>>;
  const fresh = () => ["inputResourceEffect", "continuationOnly", "unknown"].map(kind => ({ kind, paints: 0, stages: stageCosts() }));
  let selected = false, running = false, generation = 0;
  let groups = fresh(), unbound = stageCosts();
  let scopedPaints = 0, missingAdmissionPaints = 0, nestedPaints = 0, scopeChangedSpans = 0, previousAdmission = 0;
  let scope: { generation: number; paint: number | null; group: number } | null = null;
  const record = (target: ReturnType<typeof cost>, value: R20Interval, threw: boolean) => {
    target.observedCalls = increment(target.observedCalls);
    if (threw) target.threwCalls = increment(target.threwCalls);
    if (value.status === "valid" && value.elapsedMs !== null) {
      target.validCalls = increment(target.validCalls);
      target.knownSubtotalMs = Math.min(limit, target.knownSubtotalMs + value.elapsedMs);
      target.maxMs = Math.max(target.maxMs ?? 0, value.elapsedMs);
    } else {
      target.unknownCalls = increment(target.unknownCalls);
      const reason = value.status === "valid" ? "notObserved" : value.status;
      target.unknown[reason] = increment(target.unknown[reason]);
    }
  };
  return {
    start(allow: boolean) {
      generation++; selected = running = allow; scope = null; groups = fresh(); unbound = stageCosts();
      scopedPaints = missingAdmissionPaints = nestedPaints = scopeChangedSpans = previousAdmission = 0;
    },
    stop() { running = false; scope = null; generation++; },
    paint<T>(facts: readonly [number, number] | null, work: () => T): T {
      if (!running) return work();
      const prior = scope, owner = generation;
      const valid = facts !== null && Number.isSafeInteger(facts[0]) && facts[0] > previousAdmission && facts[0] <= limit &&
        Number.isInteger(facts[1]) && facts[1] > 0 && facts[1] <= 63;
      if (!valid) missingAdmissionPaints = increment(missingAdmissionPaints);
      else previousAdmission = facts[0];
      if (prior) nestedPaints = increment(nestedPaints);
      const mask = valid ? facts[1] : 2;
      const group = prior || mask & 2 ? 2 : mask & 1 ? 0 : 1;
      scope = { generation: owner, paint: valid ? facts[0] : null, group };
      scopedPaints = increment(scopedPaints); groups[group]!.paints = increment(groups[group]!.paints);
      try { return work(); } finally { if (generation === owner) scope = prior; }
    },
    measure<T>(stage: R20Stage, work: () => T): T {
      if (!running) return work();
      const owner = generation, atStart = scope, started = now();
      let threw = true;
      try { const result = work(); threw = false; return result; }
      finally {
        // Stop/new-run cannot charge an old callback to the next run. Ordinary
        // synchronous stages keep their original return/throw and work order.
        if (running && generation === owner) {
          if (scope !== atStart) scopeChangedSpans = increment(scopeChangedSpans);
          const target = scope === atStart && atStart ? groups[atStart.group]!.stages[stage] : unbound[stage];
          record(target, interval(started, now()), threw);
        }
      }
    },
    attach<T extends { schemaVersion: string }>(payload: T) {
      if (!selected) return payload;
      const copyStages = (values: ReturnType<typeof stageCosts>) => Object.fromEntries(stages.map(stage =>
        [stage, { ...values[stage], unknown: { ...values[stage].unknown } }]));
      return { ...payload, schemaVersion: "starward-r20-phone-probe-draw-costs-v1", drawCosts: {
        schemaVersion: "starward-r20-draw-costs-v1", metricsSchema: payload.schemaVersion,
        meaning: "inclusive-wall-elapsed-synchronous-actual-paint-scope-not-CPU-GPU-or-pixels",
        nesting: "submit-may-overlap-starTraversal-both-inside-draw-do-not-add",
        classification: "unknown-bit-or-missing-first-then-effect-bit-else-continuation",
        scopedPaints, missingAdmissionPaints, nestedPaints, scopeChangedSpans,
        groups: groups.map(group => ({ kind: group.kind, paints: group.paints, stages: copyStages(group.stages) })),
        unbound: copyStages(unbound),
      } };
    },
  };
}
