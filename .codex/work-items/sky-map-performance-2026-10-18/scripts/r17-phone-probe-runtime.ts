// Task-only source template. The builder copies this into an isolated staging
// tree. It is never imported by the normal application source or configuration.
const variant = "__VARIANT__" as "baseline" | "candidate";
const SAMPLE_LIMIT = 2048;
const STAGES = ["presentation", "base", "selection", "supplement", "constellations", "draw", "nativePaintOwner", "displayCopy", "publishAccepted"] as const;
const COUNTERS = ["timeIntentPublications", "preparedRequests", "paintAttempts", "nativeCallbacks", "acceptedCopies", "sceneFinishes", "glDrawSubmissions", "bscSubmittedStars", "saoSubmittedStars", "acceptedBscObjects", "acceptedSaoObjects", "failedFrames", "invalidations"] as const;
type CaseKey = "wide-camera" | "wide-time" | "wide-play" | "narrow-camera" | "narrow-time" | "narrow-play";
type Stage = typeof STAGES[number];
type Counter = typeof COUNTERS[number];
type Samples = { calls: number; totalMs: number; minMs: number; maxMs: number; values: number[] };
type TimeFacts = { events: number; values: Set<number>; first: number | null; last: number | null; minimum: number | null; maximum: number | null; overflow: boolean };
const sample = (): Samples => ({ calls: 0, totalMs: 0, minMs: Infinity, maxMs: 0, values: [] });
const timeFacts = (): TimeFacts => ({ events: 0, values: new Set(), first: null, last: null, minimum: null, maximum: null, overflow: false });
const hasPerformanceClock = typeof performance !== "undefined" && typeof performance.now === "function";
const now = () => hasPerformanceClock ? performance.now() : Date.now();
let active = false, armed = false, startAt = 0, elapsedMs = 0, sequence = 0, runId = "", caseKey: CaseKey = "wide-camera";
let reason: "limit" | "manual" = "manual", arm: ReturnType<typeof setTimeout> | undefined, deadline: ReturnType<typeof setTimeout> | undefined;
let counters = Object.fromEntries(COUNTERS.map(key => [key, 0])) as Record<Counter, number>;
let cpu = Object.fromEntries(STAGES.map(key => [key, sample()])) as Record<Stage, Samples>;
let timing = { nativeCallbackMs: sample(), acceptedGapMs: sample(), intentToAcceptedWallMs: sample() };
let times = { intent: timeFacts(), prepared: timeFacts(), painted: timeFacts(), accepted: timeFacts() };
let originInstant: number | null = null, latestIntent: { at: number; wall: number } | null = null, previousAcceptedWall: number | null = null;
let lastRequestedMinusAcceptedMs: number | null = null, maximumRequestedMinusAcceptedMs: number | null = null;
let attempts = new WeakMap<object, number>();
let scene = { baseRowsMin: Infinity, baseRowsMax: 0, saoRowsMin: Infinity, saoRowsMax: 0, selectedTilesMin: Infinity, selectedTilesMax: 0,
  catalogVersions: new Set<string>(), saoPublicationHashes: new Set<string>(), modelAlgorithms: new Set<string>(), modes: new Set<string>() };
let viewport = { widthMin: Infinity, widthMax: 0, heightMin: Infinity, heightMax: 0, fovMin: Infinity, fovMax: 0 };
const record = (target: Samples, value: number) => {
  if (!Number.isFinite(value) || value < 0) return;
  target.calls++; target.totalMs += value; target.minMs = Math.min(target.minMs, value); target.maxMs = Math.max(target.maxMs, value);
  if (target.values.length < SAMPLE_LIMIT) target.values.push(value);
};
const summarize = (value: Samples) => {
  const ordered = [...value.values].sort((a, b) => a - b);
  return { calls: value.calls, totalMs: value.totalMs, minMs: value.calls ? value.minMs : 0, maxMs: value.maxMs,
    keptSamples: ordered.length, p50Ms: ordered.length ? ordered[Math.floor(ordered.length * .5)]! : 0,
    p95Ms: ordered.length ? ordered[Math.floor(ordered.length * .95)]! : 0, overflow: value.calls > SAMPLE_LIMIT };
};
function eventTime(target: TimeFacts, at: unknown) {
  if (typeof at !== "string") return;
  const instant = Date.parse(at); if (!Number.isFinite(instant)) return;
  originInstant ??= instant;
  target.events++; target.first ??= instant; target.last = instant;
  target.minimum = target.minimum === null ? instant : Math.min(target.minimum, instant);
  target.maximum = target.maximum === null ? instant : Math.max(target.maximum, instant);
  if (target.values.size < SAMPLE_LIMIT) target.values.add(instant); else if (!target.values.has(instant)) target.overflow = true;
}
const summarizeTime = (value: TimeFacts) => ({ events: value.events, distinct: value.values.size,
  firstRelativeMs: value.first === null || originInstant === null ? null : value.first - originInstant,
  lastRelativeMs: value.last === null || originInstant === null ? null : value.last - originInstant,
  minRelativeMs: value.minimum === null || originInstant === null ? null : value.minimum - originInstant,
  maxRelativeMs: value.maximum === null || originInstant === null ? null : value.maximum - originInstant,
  overflow: value.overflow });
function publicIdentifier(target: Set<string>, value: unknown) {
  if (target.size < 8 && typeof value === "string" && /^[A-Za-z0-9_.:+/-]{1,160}$/.test(value)) target.add(value);
}
const finiteMinimum = (value: number) => Number.isFinite(value) ? value : 0;
function stop(nextReason: "limit" | "manual" = "manual") {
  const wasRunning = active || armed;
  if (active) elapsedMs = Math.max(0, now() - startAt);
  active = armed = false; if (wasRunning) reason = nextReason;
  if (arm !== undefined) clearTimeout(arm);
  if (deadline !== undefined) clearTimeout(deadline);
  arm = deadline = undefined;
}
export const r17Probe = {
  now,
  start(selected: CaseKey) {
    stop(); caseKey = selected; runId = `r17-${++sequence}-${Math.random().toString(36).slice(2, 12)}`;
    counters = Object.fromEntries(COUNTERS.map(key => [key, 0])) as Record<Counter, number>;
    cpu = Object.fromEntries(STAGES.map(key => [key, sample()])) as Record<Stage, Samples>;
    timing = { nativeCallbackMs: sample(), acceptedGapMs: sample(), intentToAcceptedWallMs: sample() };
    times = { intent: timeFacts(), prepared: timeFacts(), painted: timeFacts(), accepted: timeFacts() };
    originInstant = null; latestIntent = null; previousAcceptedWall = null; lastRequestedMinusAcceptedMs = maximumRequestedMinusAcceptedMs = null;
    attempts = new WeakMap(); elapsedMs = 0;
    scene = { baseRowsMin: Infinity, baseRowsMax: 0, saoRowsMin: Infinity, saoRowsMax: 0, selectedTilesMin: Infinity, selectedTilesMax: 0,
      catalogVersions: new Set(), saoPublicationHashes: new Set(), modelAlgorithms: new Set(), modes: new Set() };
    viewport = { widthMin: Infinity, widthMax: 0, heightMin: Infinity, heightMax: 0, fovMin: Infinity, fovMax: 0 };
    armed = true;
    arm = setTimeout(() => { arm = undefined; armed = false; active = true; startAt = now();
      deadline = setTimeout(() => stop("limit"), 45000); }, 1000);
  },
  stop,
  status: () => armed ? "armed" : active ? "recording" : runId ? "stopped" : "empty",
  measure<T>(stage: Stage, work: () => T, after?: (result: T) => void): T {
    if (!active) return work();
    const started = now(); try { const result = work(); after?.(result); return result; } finally { if (active) record(cpu[stage], now() - started); }
  },
  cpuSince(stage: Stage, started: number) { if (active) record(cpu[stage], now() - started); },
  count(name: Counter) { if (active) counters[name]++; },
  intent(state: { at: string }) {
    if (!active) return; counters.timeIntentPublications++; eventTime(times.intent, state.at);
    const at = Date.parse(state.at); if (Number.isFinite(at)) latestIntent = { at, wall: now() };
  },
  prepared(frame: any) { if (active) { counters.preparedRequests++; eventTime(times.prepared, frame?.frameAt); } },
  paintStarted(frame: any) {
    if (!active) return; counters.paintAttempts++; eventTime(times.painted, frame?.frameAt);
    if (frame && typeof frame === "object") attempts.set(frame, now());
  },
  callback(frame: any) {
    if (!active) return; counters.nativeCallbacks++;
    const started = frame && attempts.get(frame); if (started !== undefined) record(timing.nativeCallbackMs, now() - started);
  },
  tiles(count: number) { if (active && Number.isSafeInteger(count) && count >= 0) {
    scene.selectedTilesMin = Math.min(scene.selectedTilesMin, count); scene.selectedTilesMax = Math.max(scene.selectedTilesMax, count);
  } },
  sceneFinished(data: any, frameAt: unknown, base: any, supplement: any, width: number, height: number, fov: number, mode: string, bsc: number, sao: number) {
    if (!active) return;
    counters.sceneFinishes++; counters.bscSubmittedStars += bsc; counters.saoSubmittedStars += sao;
    // The compatibility fallback reads the original complete array only where
    // the original baseline lacks the candidate's optional cheap count.
    const baseRows = base?.pointCount ?? base?.points?.length ?? 0, saoRows = supplement?.pointCount ?? supplement?.points?.length ?? 0;
    scene.baseRowsMin = Math.min(scene.baseRowsMin, baseRows); scene.baseRowsMax = Math.max(scene.baseRowsMax, baseRows);
    scene.saoRowsMin = Math.min(scene.saoRowsMin, saoRows); scene.saoRowsMax = Math.max(scene.saoRowsMax, saoRows);
    publicIdentifier(scene.catalogVersions, data?.skyScene?.catalog?.catalogVersion);
    publicIdentifier(scene.saoPublicationHashes, supplement?.publicationHash);
    const geometry = data?.observationFrames?.find((value: any) => value.at === frameAt);
    publicIdentifier(scene.modelAlgorithms, geometry?.modelAlgorithmVersion); publicIdentifier(scene.modes, mode);
    viewport.widthMin = Math.min(viewport.widthMin, width); viewport.widthMax = Math.max(viewport.widthMax, width);
    viewport.heightMin = Math.min(viewport.heightMin, height); viewport.heightMax = Math.max(viewport.heightMax, height);
    viewport.fovMin = Math.min(viewport.fovMin, fov); viewport.fovMax = Math.max(viewport.fovMax, fov);
  },
  accepted(frame: any, snapshot: any) {
    if (!active) return; const wall = now(); counters.acceptedCopies++; eventTime(times.accepted, frame?.frameAt);
    if (previousAcceptedWall !== null) record(timing.acceptedGapMs, wall - previousAcceptedWall);
    previousAcceptedWall = wall;
    for (const object of snapshot?.objects ?? []) {
      if (typeof object.reference === "string" && object.reference.startsWith("HR:")) counters.acceptedBscObjects++;
      if (typeof object.reference === "string" && object.reference.startsWith("SAO:")) counters.acceptedSaoObjects++;
    }
    if (latestIntent) {
      const accepted = Date.parse(frame?.frameAt); if (Number.isFinite(accepted)) {
        lastRequestedMinusAcceptedMs = latestIntent.at - accepted;
        maximumRequestedMinusAcceptedMs = maximumRequestedMinusAcceptedMs === null ? lastRequestedMinusAcceptedMs : Math.max(maximumRequestedMinusAcceptedMs, lastRequestedMinusAcceptedMs);
        if (accepted === latestIntent.at) record(timing.intentToAcceptedWallMs, wall - latestIntent.wall);
      }
    }
  },
  snapshot() {
    stop();
    return { schemaVersion: "starward-r17-phone-probe-v1", variant, runId, caseKey, clock: hasPerformanceClock ? "performance.now" : "Date.now",
      window: { startDelayMs: 1000, durationLimitMs: 45000, elapsedMs, reason }, sampleLimit: SAMPLE_LIMIT,
      counters: { ...counters }, cpu: Object.fromEntries(STAGES.map(stage => [stage, summarize(cpu[stage])])),
      timing: Object.fromEntries(Object.entries(timing).map(([key, value]) => [key, summarize(value)])),
      time: { ...Object.fromEntries(Object.entries(times).map(([key, value]) => [key, summarizeTime(value)])), lastRequestedMinusAcceptedMs, maximumRequestedMinusAcceptedMs },
      scene: { baseRowsMin: finiteMinimum(scene.baseRowsMin), baseRowsMax: scene.baseRowsMax,
        saoRowsMin: finiteMinimum(scene.saoRowsMin), saoRowsMax: scene.saoRowsMax,
        selectedTilesMin: finiteMinimum(scene.selectedTilesMin), selectedTilesMax: scene.selectedTilesMax,
        catalogVersions: [...scene.catalogVersions], saoPublicationHashes: [...scene.saoPublicationHashes], modelAlgorithms: [...scene.modelAlgorithms], modes: [...scene.modes] },
      viewport: Object.fromEntries(Object.entries(viewport).map(([key, value]) => [key, finiteMinimum(value)])) };
  },
};
