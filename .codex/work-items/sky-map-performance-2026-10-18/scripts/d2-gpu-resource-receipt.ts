// TASK ONLY. Appended to the existing normal-surface receipt owner in the
// current GPU observation copy. No renderer, frame, callback or native handle
// is stored. Fixed phase slots are written only at real product boundaries.
type D2GpuPhase = "ready" | "play-start" | "active-30" | "paused" | "before-retire" | "after-retire";
type D2GpuScalar = number | boolean | null;
type D2GpuFacts = { disposed: boolean; disposeAttempts: number; disposeReturned: number; disposeThrew: number;
  textures: Record<string, D2GpuScalar>; contributions: Record<string, D2GpuScalar> };
type D2GpuSample = { phase: D2GpuPhase; atMs: number | null; frameAtMs: number | null; facts: D2GpuFacts };
const d2GpuPhases: readonly D2GpuPhase[] = ["ready", "play-start", "active-30", "paused", "before-retire", "after-retire"];
let d2GpuSurfaceId = 0, d2GpuPlayAt: number | null = null, d2GpuPlaying = false, d2GpuPlayCount = 0;
let d2GpuPending: "play-start" | "paused" | null = null;
let d2GpuRejected = 0;
let d2GpuSamples: Partial<Record<D2GpuPhase, D2GpuSample>> = {};
function d2GpuNewSurface(id: number) {
  d2GpuSurfaceId = id; d2GpuPlayAt = null; d2GpuPlaying = false; d2GpuPlayCount = 0;
  d2GpuPending = null; d2GpuSamples = {}; d2GpuRejected = 0;
}
function d2GpuScalarObject(value: unknown): Record<string, D2GpuScalar> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const fields = Object.getOwnPropertyDescriptors(value), keys = Object.keys(fields);
  if (!keys.length || keys.length > 64) return null;
  const result: Record<string, D2GpuScalar> = {};
  for (const key of keys) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,63}$/.test(key)) return null;
    const field = fields[key];
    if (!field || !("value" in field)) return null;
    const scalar: unknown = field.value;
    if (scalar !== null && typeof scalar !== "boolean" &&
      !(typeof scalar === "number" && Number.isFinite(scalar) && scalar >= 0 && scalar <= limit)) return null;
    result[key] = scalar as D2GpuScalar;
  }
  return result;
}
function d2GpuCopyFacts(value: unknown): D2GpuFacts | null {
  if (!value || typeof value !== "object") return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const field = (key: string): unknown => descriptors[key] && "value" in descriptors[key]! ? descriptors[key]!.value : undefined;
  const disposed = field("disposed"), attempts = scalarNumber(field("disposeAttempts"));
  const returned = scalarNumber(field("disposeReturned")), threw = scalarNumber(field("disposeThrew"));
  const textures = d2GpuScalarObject(field("textures")), contributions = d2GpuScalarObject(field("contributions"));
  if (typeof disposed !== "boolean" || attempts === null || returned === null || threw === null || !textures || !contributions) return null;
  return { disposed, disposeAttempts: attempts, disposeReturned: returned, disposeThrew: threw, textures, contributions };
}
function d2GpuReceipt() {
  const samples = d2GpuPhases.flatMap(phase => {
    const sample = d2GpuSamples[phase];
    return sample ? [{ ...sample, facts: { ...sample.facts, textures: { ...sample.facts.textures },
      contributions: { ...sample.facts.contributions } } }] : [];
  });
  return { surfaceId: d2GpuSurfaceId, playCount: d2GpuPlayCount, rejected: d2GpuRejected, samples,
    coverage: "last-surface-fixed-logical-owner-samples-no-gpu-completion-or-physical-bytes" };
}
export function r17NormalGpuSurfaceId() { return d2GpuSurfaceId; }
export function r17NormalGpuPlayStarted() {
  if (!d2GpuSurfaceId || d2GpuPlayCount) return;
  d2GpuPlayCount = 1; d2GpuPlayAt = wall(); d2GpuPlaying = true; d2GpuPending = "play-start";
}
export function r17NormalGpuPaused() {
  if (!d2GpuSurfaceId || !d2GpuPlaying) return;
  d2GpuPlaying = false; d2GpuPending = "paused";
}
export function r17NormalGpuSnapshotPhase(id: number, sceneReady: boolean): D2GpuPhase | null {
  if (id !== d2GpuSurfaceId || !id || !sceneReady || d2GpuSamples["after-retire"]) return null;
  if (d2GpuPending && !d2GpuSamples[d2GpuPending]) return d2GpuPending;
  if (!d2GpuSamples.ready) return "ready";
  const now = wall();
  // The existing D2 active-30 / 90 s observation window is unchanged. This is
  // a decision sample, not a product performance budget or a playback timer.
  if (d2GpuPlaying && !d2GpuSamples["active-30"] && now !== null && d2GpuPlayAt !== null &&
    now - d2GpuPlayAt >= 30000 && now - d2GpuPlayAt <= 90000) return "active-30";
  return null;
}
export function r17NormalGpuRecord(id: number, phase: D2GpuPhase, value: unknown, frameAt: unknown = null) {
  try {
    if (!id || id !== d2GpuSurfaceId || !d2GpuPhases.includes(phase) || d2GpuSamples[phase]) {
      d2GpuRejected = increment(d2GpuRejected); return;
    }
    const facts = d2GpuCopyFacts(value);
    if (!facts) { d2GpuRejected = increment(d2GpuRejected); return; }
    const parsedAt = typeof frameAt === "string" ? Date.parse(frameAt) : NaN;
    const frameAtMs = Number.isSafeInteger(parsedAt) ? parsedAt : null;
    d2GpuSamples[phase] = { phase, atMs: wall(), frameAtMs, facts };
    if (d2GpuPending === phase) d2GpuPending = null;
    writeReceipt("gpu-snapshot");
  } catch { d2GpuRejected = increment(d2GpuRejected); }
}
