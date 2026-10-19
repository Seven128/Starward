// TASK ONLY normal-path counters. No native method replacement, cache,
// payload, frame, result, surface or context is retained by this observer.
const limit = 1e12;
let nativeGlyphCalls = 0, lifetimeNativeGlyphCalls = 0, observationResets = 0;
let nativeCopies = 0, readyNativeCopies = 0, retired = true;
export function r17NormalMeasuredText<T>(result: T): T {
  nativeGlyphCalls = Math.min(limit, nativeGlyphCalls + 1);
  lifetimeNativeGlyphCalls = Math.min(limit, lifetimeNativeGlyphCalls + 1);
  return result;
}
export function r17NormalSurfaceReady() { retired = false; }
export function r17NormalSurfaceRetired() { retired = true; }
export function r17NormalCopyReturned(ready: boolean) {
  nativeCopies = Math.min(limit, nativeCopies + 1);
  if (ready) readyNativeCopies = Math.min(limit, readyNativeCopies + 1);
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
