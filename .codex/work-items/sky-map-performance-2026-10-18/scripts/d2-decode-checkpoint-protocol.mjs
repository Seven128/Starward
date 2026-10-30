// Versioned scalar extension of the original checkpoint, not a relaxed v1.
import { R25_MEMORY_CHECKPOINT_SCHEMA, validateR25MemoryCheckpoint } from './r25-memory-checkpoint-protocol.mjs';
export const D2_DECODE_CHECKPOINT_SCHEMA = 'starward-r25-memory-checkpoint-v2';
const MAX = 1e12;
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= MAX;
const decodeKeys = ['createAttempts', 'createReturned', 'sourceAttempts', 'caughtSyncBeforeSource', 'caughtSyncAfterSource',
  'loadCallbacks', 'errorCallbacks', 'callbacksAfterDetach', 'duplicateCallbacks', 'ownedCallbacks', 'detachedWithoutCallback'];
const imageKeys = ['registeredClaims', 'retiredClaims', 'uniqueRegistrations', 'uniqueRetirements', 'logicalClaims',
  'logicalImages', 'logicalPixels', 'maxLogicalImages', 'maxLogicalPixels', 'observedMaxWidth', 'observedMaxHeight'];
export function validateD2DecodeObservation(v) {
  try {
    if (!object(v, ['schemaVersion', 'coverage', 'semantics', 'imageIdentity', 'diagnostics', 'decode', 'images'])
      || v.schemaVersion !== 'starward-d2-decode-logical-v1'
      || v.coverage !== 'instrumented-artwork-request-since-module-load'
      || v.semantics !== 'callbacks-and-explicit-image-claims-not-native-inflight-or-physical-bytes'
      || !['weak-map', 'unavailable'].includes(v.imageIdentity)
      || !object(v.diagnostics, ['overflow', 'rejectedEvents', 'dimensionConflicts', 'duplicateRetirements', 'untrackedImageClaims'])
      || typeof v.diagnostics.overflow !== 'boolean'
      || !['rejectedEvents', 'dimensionConflicts', 'duplicateRetirements', 'untrackedImageClaims'].every(key => count(v.diagnostics[key]))
      || !object(v.decode, decodeKeys) || !decodeKeys.every(key => count(v.decode[key]))
      || !object(v.images, imageKeys) || !imageKeys.every(key => count(v.images[key]))) return false;
    if (v.imageIdentity === 'unavailable' && imageKeys.some(key => v.images[key] !== 0)) return false;
    if (v.diagnostics.overflow) return true; // gauges explicitly lost exact coverage after saturation.
    const d = v.decode, i = v.images, callbacks = d.loadCallbacks + d.errorCallbacks;
    return d.createReturned <= d.createAttempts && d.sourceAttempts <= d.createReturned && callbacks <= d.sourceAttempts
      && d.callbacksAfterDetach <= callbacks && d.callbacksAfterDetach <= d.detachedWithoutCallback
      && d.ownedCallbacks === d.sourceAttempts - callbacks - d.detachedWithoutCallback + d.callbacksAfterDetach
      && i.retiredClaims <= i.registeredClaims && i.logicalClaims === i.registeredClaims - i.retiredClaims
      && i.uniqueRetirements <= i.uniqueRegistrations && i.logicalImages === i.uniqueRegistrations - i.uniqueRetirements
      && i.logicalImages <= i.logicalClaims && i.logicalImages <= i.maxLogicalImages && i.logicalPixels <= i.maxLogicalPixels
      && (i.logicalImages === 0 ? i.logicalPixels === 0 : i.logicalPixels >= i.logicalImages)
      && (i.uniqueRegistrations === 0 ? i.observedMaxWidth === 0 && i.observedMaxHeight === 0
        : i.observedMaxWidth > 0 && i.observedMaxHeight > 0);
  } catch { return false; }
}
export function validateD2DecodeCheckpoint(v) {
  try {
    if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 32768
      || !object(v, ['schemaVersion', 'variant', 'runId', 'sequence', 'observation', 'owners', 'decode'])
      || v.schemaVersion !== D2_DECODE_CHECKPOINT_SCHEMA || !validateD2DecodeObservation(v.decode)) return false;
    const { decode: ignored, ...base } = v;
    return validateR25MemoryCheckpoint({ ...base, schemaVersion: R25_MEMORY_CHECKPOINT_SCHEMA });
  } catch { return false; }
}
