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
