// Fixed scalar addition to the existing bounded checkpoint owner. Historical
// schemas remain unchanged; no function source, keys, payloads or raw objects.
import { R26_MEMORY_CHECKPOINT_SCHEMA, validateR26MemoryCheckpoint } from './r26-memory-checkpoint-protocol.mjs';
export const R27_MEMORY_CHECKPOINT_SCHEMA = 'starward-r27-memory-checkpoint-v1';
const MAX = 1e12;
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= MAX;
const diagnostics = ['beginRenderCalls', 'finishRenderCalls', 'pageCallbackCalls', 'queryWrapperCalls', 'queryOwnerCalls',
  'aggregateCalls', 'unterminatedRenders', 'finishWithoutRender', 'outsideRenderAggregates', 'missingPageCallbacks',
  'unscopedCallbackCalls', 'unmatchedPageCallbacks', 'duplicatePageCallbacks', 'duplicateWrappers', 'duplicateQueries',
  'missingQueryOwners', 'duplicateAggregates', 'unselectedAggregates', 'invalidCalls', 'invalidIds', 'lookupErrors',
  'refsCreated', 'referenceErrors', 'ownerReadCalls', 'ownerReadErrors', 'invalidOwnerStates'];
const life = v => ['alive', 'collected', 'unknown'].includes(v);
export function validateR27QueryCallbacks(v) {
  if (!object(v, ['schemaVersion', 'capability', 'semantics', 'active', 'tracking', 'released', 'policy', 'diagnostics', 'samples']) ||
    v.schemaVersion !== 'starward-r27-query-callback-v1' || !['supported', 'unsupported'].includes(v.capability) ||
    v.semantics !== 'same-render-association-and-actual-query-option-not-closure-edge' ||
    !['active', 'tracking', 'released'].every(key => typeof v[key] === 'boolean') || v.released === v.active || v.tracking && !v.active ||
    !object(v.policy, ['samples', 'sites']) || v.policy.samples !== 8 || v.policy.sites !== 1 ||
    !object(v.diagnostics, [...diagnostics, 'overflow']) || !diagnostics.every(key => count(v.diagnostics[key])) ||
    typeof v.diagnostics.overflow !== 'boolean' || !Array.isArray(v.samples) || v.samples.length > 8 ||
    v.released && v.samples.length || new Set(v.samples.map(sample => sample?.aggregateId)).size !== v.samples.length) return false;
  return v.samples.every(sample => object(sample, ['aggregateId', 'site', 'association', 'renderId', 'renderCompleted',
    'pageCallback', 'queryWrapper', 'queryOwner', 'queryInCache', 'currentOptionMatches']) &&
    Number.isSafeInteger(sample.aggregateId) && sample.aggregateId >= 1 && sample.aggregateId <= 8 &&
    sample.site === 'fine-target-queryFn' && ['render', 'outside-render'].includes(sample.association) &&
    typeof sample.renderCompleted === 'boolean' &&
    (sample.association === 'render' ? count(sample.renderId) && sample.renderId >= 1
      : sample.renderId === null && sample.renderCompleted === false) &&
    ['pageCallback', 'queryWrapper', 'queryOwner'].every(key => life(sample[key])) &&
    (sample.queryInCache === null || typeof sample.queryInCache === 'boolean') &&
    (sample.currentOptionMatches === null || typeof sample.currentOptionMatches === 'boolean') &&
    (sample.queryOwner === 'alive' || sample.queryInCache === null && sample.currentOptionMatches === null) &&
    (sample.queryWrapper === 'alive' || sample.currentOptionMatches === null) &&
    (v.capability !== 'unsupported' || ['pageCallback', 'queryWrapper', 'queryOwner'].every(key => sample[key] === 'unknown') &&
      sample.queryInCache === null && sample.currentOptionMatches === null));
}
export function validateR27QueryCallbackLinks(v) {
  return object(v, ['schemaVersion', 'observation']) && v.schemaVersion === 'starward-r27-query-callback-links-v1' &&
    (v.observation === null || object(v.observation, ['phase', 'checkpointClockElapsedMs', 'value']) &&
      ['active-5', 'drain-10'].includes(v.observation.phase) &&
      (v.observation.checkpointClockElapsedMs === null || count(v.observation.checkpointClockElapsedMs) && v.observation.checkpointClockElapsedMs <= 120000) &&
      validateR27QueryCallbacks(v.observation.value));
}
export function validateR27MemoryCheckpoint(v) {
  try {
    if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 32768 ||
      !object(v, ['schemaVersion', 'variant', 'runId', 'sequence', 'observation', 'owners', 'ownerLinks', 'queryCallbacks']) ||
      v.schemaVersion !== R27_MEMORY_CHECKPOINT_SCHEMA || !validateR27QueryCallbackLinks(v.queryCallbacks)) return false;
    const { queryCallbacks, ...legacy } = v;
    if (!validateR26MemoryCheckpoint({ ...legacy, schemaVersion: R26_MEMORY_CHECKPOINT_SCHEMA })) return false;
    const observed = queryCallbacks.observation;
    return !observed || observed.value.samples.every(sample => sample.aggregateId <= v.owners.aggregates.length) &&
      (observed.checkpointClockElapsedMs === null || v.observation.clock.invalid ||
        observed.checkpointClockElapsedMs <= v.observation.clock.elapsedMs);
  } catch { return false; }
}
