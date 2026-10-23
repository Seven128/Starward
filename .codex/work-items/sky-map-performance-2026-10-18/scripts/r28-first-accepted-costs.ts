// TASK ONLY. Existing clocks and the real first-accepted gate own observation.
// Weak keys never escape; attempts and retained rows contain only scalars.
export const R28_FIRST_ACCEPTED_STAGES = ["nativePaintOwner", "draw", "bscTraversal", "saoTraversal",
  "rendererSubmit", "displayCopy", "publishAccepted", "nativeCallback"] as const;
export type R28FirstAcceptedStage = typeof R28_FIRST_ACCEPTED_STAGES[number];
const UNKNOWN = ["belowResolution", "clockUnavailable", "clockDiscontinuity", "outOfRange", "notObserved"] as const;
type Unknown = typeof UNKNOWN[number];
export type R28Interval = { elapsedMs: number | null; status: "valid" | Unknown };
type UnknownCounts = [number, number, number, number, number];
type Cost = [number, number, number, UnknownCounts, number];
type CacheCounts = [number, number, number];
type Identity = { intentSequence: number; prepareToken: number; canvasOwner: number; canvasGeneration: number };
type Attempt = Identity & { run: number; paintOrdinal: number; accepted: boolean; scopeAmbiguous: boolean;
  costs: Cost[]; cache: { bsc: CacheCounts; sao: CacheCounts } };
type Row = { order: number; attempt: Attempt; superseded: boolean };
const CAPACITY = 8, IDENTITY_LIMIT = 256, LIMIT = 1e12;
const object = (value: unknown): value is object => value !== null && typeof value === "object";
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= LIMIT;
const positive = (value: unknown): value is number => count(value) && value > 0;
const increment = (value: number) => Math.min(LIMIT, value + 1);
const cost = (): Cost => [0, 0, 0, [0, 0, 0, 0, 0], 0];
const copyCost = (value: Cost): Cost => [value[0], value[1], value[2], [...value[3]], value[4]];
const counters = () => ({ paints: 0, firstAccepted: 0, missingFirstAccepted: 0, evictedRows: 0,
  identityRotations: 0, unboundCosts: 0, nestedScopes: 0, invalidIntervals: 0, invalidIdentities: 0, duplicateAccepted: 0 });

export function createR28FirstAcceptedCosts() {
  let selected = false, running = false, run = 0, lastCanvasOwner = 0, identityCount = 0;
  let identities = new WeakMap<object, Attempt>(), rows: Row[] = [], totals = counters();
  let scope: Attempt | null = null;
  // A numeric dynamic-work marker survives a re-entrant start/stop only until
  // that call returns. It prevents the old work's tail charging a new run.
  let executingRun: number | null = null;
  const currentWork = () => running && (executingRun === null || executingRun === run);
  const find = (frame: unknown) => object(frame) ? identities.get(frame) : undefined;
  const recordInto = (attempt: Attempt, stage: R28FirstAcceptedStage, value: R28Interval, threw: boolean) => {
    const index = R28_FIRST_ACCEPTED_STAGES.indexOf(stage);
    if (index < 0 || attempt.run !== run) return;
    const target = attempt.costs[index]!;
    if (target[0] >= LIMIT) return;
    target[0]++;
    if (threw) target[4]++;
    if (value?.status === "valid" && Number.isSafeInteger(value.elapsedMs) &&
      value.elapsedMs !== null && value.elapsedMs >= 1 && value.elapsedMs <= 60000 && target[2] + value.elapsedMs <= LIMIT) {
      target[1]++; target[2] += value.elapsedMs; return;
    }
    const reason = value && value.elapsedMs === null ? UNKNOWN.indexOf(value.status as Unknown) : -1;
    if (reason >= 0) target[3][reason] = target[3][reason]! + 1;
    else { target[3][4]++; totals.invalidIntervals = increment(totals.invalidIntervals); }
  };
  return {
    canvasOwner(): number | null {
      if (lastCanvasOwner >= LIMIT) return null;
      return ++lastCanvasOwner;
    },
    start(allow: boolean) {
      run++; selected = running = allow === true;
      identities = new WeakMap(); identityCount = 0; scope = null; rows = []; totals = counters();
    },
    stop() { running = false; identities = new WeakMap(); identityCount = 0; scope = null; run++; },
    begin(frame: unknown, facts: { intentSequence: number | null; prepareToken: number | null;
      canvasOwner: number | null; canvasGeneration: number | null } | null) {
      if (!currentWork()) return;
      if (totals.paints >= LIMIT) { if (object(frame)) identities.delete(frame); return; }
      totals.paints++;
      // The existing intent owner supplies null for an explicitly ineligible
      // continuation. Delete an old binding without allocating per-paint data.
      if (facts === null) { if (object(frame) && identities.delete(frame)) identityCount--; return; }
      if (!object(frame) || !facts || !positive(facts.intentSequence) || !positive(facts.prepareToken) ||
        !positive(facts.canvasOwner) || facts.canvasOwner > lastCanvasOwner || !count(facts.canvasGeneration)) {
        if (object(frame) && identities.delete(frame)) identityCount--;
        totals.invalidIdentities = increment(totals.invalidIdentities); return;
      }
      if (!identities.has(frame)) {
        if (identityCount >= IDENTITY_LIMIT) {
          identities = new WeakMap(); identityCount = 0;
          totals.identityRotations = increment(totals.identityRotations);
        }
        identityCount++;
      }
      identities.set(frame, { intentSequence: facts.intentSequence, prepareToken: facts.prepareToken,
        canvasOwner: facts.canvasOwner, canvasGeneration: facts.canvasGeneration, run,
        paintOrdinal: totals.paints, accepted: false, scopeAmbiguous: false,
        costs: R28_FIRST_ACCEPTED_STAGES.map(cost), cache: { bsc: [0, 0, 0], sao: [0, 0, 0] } });
    },
    withFrame<T>(frame: unknown, work: () => T): T {
      if (!running) return work();
      const owner = run, prior = scope, priorExecution = executingRun;
      const candidate = find(frame);
      const attempt = candidate?.run === owner ? candidate : null;
      // Same-attempt copy/publication can be called synchronously by done().
      // Only a different attempt makes attribution ambiguous.
      if (prior && attempt && prior !== attempt) {
        prior.scopeAmbiguous = attempt.scopeAmbiguous = true;
        totals.nestedScopes = increment(totals.nestedScopes);
      }
      scope = attempt; executingRun = owner;
      try { return work(); }
      finally {
        executingRun = priorExecution;
        if (run === owner && running) scope = prior;
      }
    },
    record(stage: R28FirstAcceptedStage, value: R28Interval, threw = false) {
      if (!currentWork()) return;
      if (!scope || scope.run !== run) {
        // A withFrame for an explicitly skipped/untracked frame is not a
        // missing observation of an eligible first response.
        if (executingRun === null) totals.unboundCosts = increment(totals.unboundCosts);
        return;
      }
      recordInto(scope, stage, value, threw);
    },
    recordFrame(frame: unknown, stage: R28FirstAcceptedStage, value: R28Interval, threw = false) {
      if (!currentWork()) return;
      const attempt = find(frame);
      // Unknown/stopped/previous-run callbacks never create a new association.
      if (attempt?.run === run) recordInto(attempt, stage, value, threw);
    },
    cache(kind: "bsc" | "sao", mode: "build" | "replay" | "bypass") {
      if (!currentWork() || !scope || scope.run !== run || (kind !== "bsc" && kind !== "sao")) return;
      const index = mode === "build" ? 0 : mode === "replay" ? 1 : mode === "bypass" ? 2 : -1;
      if (index !== -1) scope.cache[kind][index] = increment(scope.cache[kind][index]);
    },
    // The caller invokes this only after its actual first-intent acceptance
    // guard. Keeping the scalar attempt live fills a synchronous done() tail.
    accept(frame: unknown, superseded: boolean) {
      if (!currentWork() || totals.firstAccepted >= LIMIT) return;
      const attempt = find(frame);
      if (attempt?.accepted) {
        totals.duplicateAccepted = increment(totals.duplicateAccepted); return;
      }
      const order = ++totals.firstAccepted;
      if (!attempt || attempt.run !== run || typeof superseded !== "boolean") {
        totals.missingFirstAccepted = increment(totals.missingFirstAccepted); return;
      }
      attempt.accepted = true;
      if (rows.length === CAPACITY) { rows.shift(); totals.evictedRows = increment(totals.evictedRows); }
      rows.push({ order, attempt, superseded });
    },
    attach<T extends { schemaVersion: string }>(payload: T) {
      if (!selected) return payload;
      return { ...payload, schemaVersion: "starward-r28-phone-probe-first-accepted-costs-v1", firstAcceptedCosts: {
        schemaVersion: "starward-r28-first-accepted-costs-v1", metricsSchema: payload.schemaVersion,
        meaning: "existing-inclusive-wall-spans-at-first-accepted-identity-not-cpu-gpu-or-pixels",
        nesting: "submit-may-overlap-traversals-and-draw-native-owner-encloses-sync-paint-do-not-add",
        capacity: CAPACITY, identityLimit: IDENTITY_LIMIT, stages: [...R28_FIRST_ACCEPTED_STAGES], counters: { ...totals },
        rows: rows.map(({ order, attempt, superseded }) => ({ order, intentSequence: attempt.intentSequence,
          prepareToken: attempt.prepareToken, canvasOwner: attempt.canvasOwner, canvasGeneration: attempt.canvasGeneration,
          paintOrdinal: attempt.paintOrdinal, superseded, scopeAmbiguous: attempt.scopeAmbiguous,
          costs: attempt.costs.map(copyCost), cache: { bsc: [...attempt.cache.bsc], sao: [...attempt.cache.sao] } })),
      } };
    },
  };
}
