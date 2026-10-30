// TASK ONLY. Source-bound callbacks and explicit image claims, not a native
// decoder census, physical residency, retaining graph or memory reservation.
// The module starts before artwork requests; Play never resets its baseline.
// Logical image totals cover this request owner's declared claims only. A
// texture or another consumer may still hold the same image after that claim
// retires; zero here never asserts that every JS/native holder has released it.
const MAX = 1e12;
type Attempt = { brand: object; created: boolean; source: boolean; detached: boolean; callback: boolean };
type Claim = { width: number; height: number; pixels: number; owners: number };
const noop = () => {};
// Keep the returned closure outside the call which receives an image. It can
// retain only scalar claim metadata and the existing owner's retirement fn.
function together(retire: () => void, observedRetire: () => void) {
  return () => { try { retire(); } finally { observedRetire(); } };
}
export function createD2DecodeObservation() {
  const brand = {};
  let images: WeakMap<object, Claim> | null = null;
  try { images = new WeakMap<object, Claim>(); } catch { /* explicitly unavailable */ }
  let overflow = false, rejectedEvents = 0, dimensionConflicts = 0, duplicateRetirements = 0, untrackedImageClaims = 0;
  const decode = { createAttempts: 0, createReturned: 0, sourceAttempts: 0,
    caughtSyncBeforeSource: 0, caughtSyncAfterSource: 0, loadCallbacks: 0, errorCallbacks: 0,
    callbacksAfterDetach: 0, duplicateCallbacks: 0, ownedCallbacks: 0, detachedWithoutCallback: 0 };
  const resident = { registeredClaims: 0, retiredClaims: 0, uniqueRegistrations: 0, uniqueRetirements: 0,
    logicalClaims: 0, logicalImages: 0, logicalPixels: 0, maxLogicalImages: 0, maxLogicalPixels: 0,
    observedMaxWidth: 0, observedMaxHeight: 0 };
  const add = (value: number, amount = 1) => {
    if (value > MAX - amount) { overflow = true; return MAX; }
    return value + amount;
  };
  const subtract = (value: number, amount = 1) => {
    if (value < amount) { rejectedEvents = add(rejectedEvents); return 0; }
    return value - amount;
  };
  const valid = (value: Attempt | null): value is Attempt => Boolean(value && value.brand === brand);
  const reject = () => { rejectedEvents = add(rejectedEvents); };
  function claimRetirement(claim: Claim) {
    let retired = false;
    return () => {
      if (retired) { duplicateRetirements = add(duplicateRetirements); return; }
      retired = true;
      resident.retiredClaims = add(resident.retiredClaims);
      resident.logicalClaims = subtract(resident.logicalClaims);
      claim.owners = subtract(claim.owners);
      if (claim.owners === 0) {
        resident.uniqueRetirements = add(resident.uniqueRetirements);
        resident.logicalImages = subtract(resident.logicalImages);
        resident.logicalPixels = subtract(resident.logicalPixels, claim.pixels);
      }
    };
  }
  function imageClaim(image: object, width: number, height: number): () => void {
    try {
      if (!image || typeof image !== "object" || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
        || width <= 0 || height <= 0 || width > MAX / height) { reject(); return noop; }
      if (!images) { untrackedImageClaims = add(untrackedImageClaims); return noop; }
      let claim = images.get(image);
      if (claim && (claim.width !== width || claim.height !== height)) {
        dimensionConflicts = add(dimensionConflicts); return noop;
      }
      if (!claim) { claim = { width, height, pixels: width * height, owners: 0 }; images.set(image, claim); }
      resident.registeredClaims = add(resident.registeredClaims);
      resident.logicalClaims = add(resident.logicalClaims);
      if (claim.owners === 0) {
        resident.uniqueRegistrations = add(resident.uniqueRegistrations);
        resident.logicalImages = add(resident.logicalImages);
        resident.logicalPixels = add(resident.logicalPixels, claim.pixels);
        resident.maxLogicalImages = Math.max(resident.maxLogicalImages, resident.logicalImages);
        resident.maxLogicalPixels = Math.max(resident.maxLogicalPixels, resident.logicalPixels);
      }
      claim.owners = add(claim.owners);
      resident.observedMaxWidth = Math.max(resident.observedMaxWidth, width);
      resident.observedMaxHeight = Math.max(resident.observedMaxHeight, height);
      return claimRetirement(claim);
    } catch { reject(); return noop; }
  }
  return {
    createAttempt(): Attempt {
      decode.createAttempts = add(decode.createAttempts);
      return { brand, created: false, source: false, detached: false, callback: false };
    },
    created(value: Attempt) {
      try {
        if (!valid(value) || value.created || value.detached) { reject(); return; }
        value.created = true; decode.createReturned = add(decode.createReturned);
      } catch { reject(); }
    },
    sourceAttempt(value: Attempt) {
      try {
        if (!valid(value) || !value.created || value.source || value.detached) { reject(); return; }
        value.source = true; decode.sourceAttempts = add(decode.sourceAttempts);
        decode.ownedCallbacks = add(decode.ownedCallbacks);
      } catch { reject(); }
    },
    callback(value: Attempt, kind: "load" | "error") {
      try {
        if (!valid(value) || !value.source || !["load", "error"].includes(kind)) { reject(); return; }
        if (value.callback) { decode.duplicateCallbacks = add(decode.duplicateCallbacks); return; }
        value.callback = true;
        if (kind === "load") decode.loadCallbacks = add(decode.loadCallbacks);
        else decode.errorCallbacks = add(decode.errorCallbacks);
        if (value.detached) decode.callbacksAfterDetach = add(decode.callbacksAfterDetach);
        else decode.ownedCallbacks = subtract(decode.ownedCallbacks);
      } catch { reject(); }
    },
    caughtSync(value: Attempt) {
      try {
        if (!valid(value)) { reject(); return; }
        // A synchronous callback can throw inside src assignment. Do not claim
        // this count identifies the native setter or a native completion.
        if (value.source) decode.caughtSyncAfterSource = add(decode.caughtSyncAfterSource);
        else decode.caughtSyncBeforeSource = add(decode.caughtSyncBeforeSource);
      } catch { reject(); }
    },
    detached(value: Attempt | null) {
      if (value === null) return;
      try {
        if (!valid(value)) { reject(); return; }
        if (value.detached) return;
        value.detached = true;
        if (value.source && !value.callback) {
          decode.ownedCallbacks = subtract(decode.ownedCallbacks);
          // Cumulative fact at detach; never interpreted as current native
          // in-flight count. A retained callback may later report completion.
          decode.detachedWithoutCallback = add(decode.detachedWithoutCallback);
        }
      } catch { reject(); }
    },
    imageClaim,
    withImageRetirement(retire: () => void, image: object, width: number, height: number) {
      return together(retire, imageClaim(image, width, height));
    },
    snapshot() {
      return { schemaVersion: "starward-d2-decode-logical-v1" as const,
        coverage: "instrumented-artwork-request-since-module-load" as const,
        semantics: "callbacks-and-explicit-image-claims-not-native-inflight-or-physical-bytes" as const,
        imageIdentity: images ? "weak-map" as const : "unavailable" as const,
        diagnostics: { overflow, rejectedEvents, dimensionConflicts, duplicateRetirements, untrackedImageClaims },
        decode: { ...decode }, images: { ...resident } };
    },
  };
}
export const d2DecodeObservation = createD2DecodeObservation();
