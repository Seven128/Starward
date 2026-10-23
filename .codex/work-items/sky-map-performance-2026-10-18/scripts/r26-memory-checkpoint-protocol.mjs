// Fixed scalar extension of the qualified checkpoint route. Historical packets
// keep their validators and meanings; no arbitrary graph or property export.
import { validateR25MemoryCheckpoint, R25_MEMORY_CHECKPOINT_SCHEMA } from './r25-memory-checkpoint-protocol.mjs';
export const R26_MEMORY_CHECKPOINT_SCHEMA = 'starward-r26-memory-checkpoint-v1';
const MAX = 1e12;
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= MAX;
const sampleId = v => Number.isSafeInteger(v) && v >= 1 && v <= 8;
const kinds = ['request', 'paint', 'accepted'];
const slots = ['lifecycle-latest', 'draw-preparation', 'accepted-command'];
function uses(v) {
  if (!object(v, ['schemaVersion', 'semantics', 'active', 'tracking', 'policy', 'diagnostics', 'samples', 'slots']) ||
    v.schemaVersion !== 'starward-r26-aggregate-use-v1' ||
    v.semantics !== 'reserved-sample-id-usage-and-observed-owner-slots-not-liveness-not-retaining-roots' ||
    typeof v.active !== 'boolean' || typeof v.tracking !== 'boolean' || v.tracking && !v.active ||
    !object(v.policy, ['samples', 'slots']) || v.policy.samples !== 8 || v.policy.slots !== 3 ||
    !object(v.diagnostics, ['useCalls', 'slotCalls', 'emptyUses', 'unselectedUses', 'unknownUses', 'invalidCalls',
      'invalidValues', 'lookupErrors', 'invalidIds', 'overflow']) || typeof v.diagnostics.overflow !== 'boolean' ||
    !object(v.diagnostics.useCalls, kinds) || !kinds.every(key => count(v.diagnostics.useCalls[key])) ||
    !['slotCalls', 'emptyUses', 'unselectedUses', 'unknownUses', 'invalidCalls', 'invalidValues', 'lookupErrors', 'invalidIds']
      .every(key => count(v.diagnostics[key])) || !Array.isArray(v.samples) || v.samples.length !== 8 ||
    !v.samples.every((row, i) => object(row, ['id', ...kinds]) && row.id === i + 1 && kinds.every(key => count(row[key]))) ||
    !Array.isArray(v.slots) || v.slots.length !== 3) return false;
  return v.slots.every((row, i) => object(row, ['slot', 'state', 'aggregateId', 'updates', 'selectedUpdates', 'clears']) &&
    row.slot === slots[i] && ['unobserved', 'empty', 'selected', 'unselected', 'unknown'].includes(row.state) &&
    (row.state === 'selected' ? sampleId(row.aggregateId) : row.aggregateId === null) &&
    ['updates', 'selectedUpdates', 'clears'].every(key => count(row[key])) && row.selectedUpdates <= row.updates &&
    row.clears <= row.updates && (row.state !== 'unobserved' || row.updates === 0));
}
const policy = { entrances: 2, ancestors: 32, fibers: 32, hooksPerFiber: 1024, updatesPerQueue: 32,
  valueObjects: 4096, valueDepth: 6, arrayItems: 32, matches: 24, descriptorReads: 32768 };
const coverageKeys = ['nodeInputs', 'uniqueNodes', 'skyEntrances', 'hostFibers', 'functionFibers', 'hooks',
  'queueUpdates', 'valueObjects', 'descriptorReads', 'accessorSkipped', 'descriptorErrors', 'invalidFields',
  'matchErrors', 'iteratorErrors', 'opaqueFunctions'];
const truncationKeys = ['entrances', 'ancestors', 'fibers', 'hooks', 'updates', 'values', 'depth', 'arrayItems', 'matches', 'descriptors'];
const fieldKeys = ['memoizedState', 'baseState', 'queue.lastRenderedState', 'baseQueue.eagerState',
  'queue.pending.eagerState', 'queue.interleaved.eagerState'];
export function validateR26FiberOwners(v) {
  if (!object(v, ['schemaVersion', 'contract', 'semantics', 'capability', 'status', 'currentCommit',
    'policy', 'coverage', 'truncated', 'clock', 'matches']) || v.schemaVersion !== 'starward-r26-fiber-owners-v1' ||
    v.contract !== 'taro-4.2.1-react-18.3.1-known-hook-fields-v1' ||
    v.semantics !== 'known-strong-edges-not-whole-heap-not-retaining-root-or-leak-verdict' ||
    !['available', 'unavailable'].includes(v.capability) ||
    !['invalid-configuration', 'entrance-unavailable', 'matched', 'no-match-in-covered-fields'].includes(v.status) ||
    v.currentCommit !== 'unresolved-host-linked-is-not-current' ||
    !object(v.policy, Object.keys(policy)) || !Object.entries(policy).every(([key, value]) => v.policy[key] === value) ||
    !object(v.coverage, coverageKeys) || !coverageKeys.every(key => count(v.coverage[key])) ||
    v.coverage.nodeInputs > 2 || v.coverage.uniqueNodes > 2 || v.coverage.skyEntrances > 2 || v.coverage.hostFibers > 2 ||
    v.coverage.functionFibers > 32 || v.coverage.hooks > 32768 || v.coverage.valueObjects > 4096 || v.coverage.descriptorReads > 32768 ||
    !object(v.truncated, truncationKeys) || !truncationKeys.every(key => typeof v.truncated[key] === 'boolean') ||
    !object(v.clock, ['source', 'kind', 'elapsedMs', 'status']) || v.clock.source !== 'Date.now' || v.clock.kind !== 'wall-elapsed' ||
    !['valid', 'below-resolution', 'invalid'].includes(v.clock.status) ||
    (v.clock.status === 'valid' ? !count(v.clock.elapsedMs) || v.clock.elapsedMs < 1 || v.clock.elapsedMs > 120000 : v.clock.elapsedMs !== null) ||
    !Array.isArray(v.matches) || v.matches.length > 24) return false;
  if ((v.capability === 'available') !== (v.coverage.hostFibers > 0) ||
    (v.status === 'matched') !== (v.matches.length > 0) ||
    (v.capability === 'unavailable' ? !['invalid-configuration', 'entrance-unavailable'].includes(v.status)
      : !['matched', 'no-match-in-covered-fields'].includes(v.status))) return false;
  return v.matches.every(row => object(row, ['aggregateId', 'entrance', 'ancestorDepth', 'branch', 'hookIndex', 'field', 'updateIndex', 'valuePath']) &&
    sampleId(row.aggregateId) && ['sky-canvas', 'sky-selection'].includes(row.entrance) &&
    count(row.ancestorDepth) && row.ancestorDepth < 32 && ['host-linked', 'alternate'].includes(row.branch) &&
    count(row.hookIndex) && row.hookIndex < 1024 && fieldKeys.includes(row.field) &&
    (row.field.endsWith('eagerState') ? count(row.updateIndex) && row.updateIndex < 32 : row.updateIndex === null) &&
    Array.isArray(row.valuePath) && row.valuePath.length <= 6 && row.valuePath.every(key =>
      ['current', 'frame', 'stellarSupplement', 'value'].includes(key) || Number.isSafeInteger(key) && key >= 0 && key < 32));
}
export function validateR26OwnerLinks(v) {
  if (!object(v, ['schemaVersion', 'uses', 'framework']) || v.schemaVersion !== 'starward-r26-owner-links-v1' || !uses(v.uses)) return false;
  return v.framework === null || object(v.framework, ['phase', 'checkpointClockElapsedMs', 'lookupFailed', 'observation']) &&
    (v.framework.checkpointClockElapsedMs === null || count(v.framework.checkpointClockElapsedMs) && v.framework.checkpointClockElapsedMs <= 120000) &&
    ['active-5', 'drain-10'].includes(v.framework.phase) && typeof v.framework.lookupFailed === 'boolean' &&
    validateR26FiberOwners(v.framework.observation);
}
export function validateR26MemoryCheckpoint(v) {
  try {
    if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 32768 ||
      !object(v, ['schemaVersion', 'variant', 'runId', 'sequence', 'observation', 'owners', 'ownerLinks']) ||
      v.schemaVersion !== R26_MEMORY_CHECKPOINT_SCHEMA || !validateR26OwnerLinks(v.ownerLinks)) return false;
    const { ownerLinks, ...legacy } = v;
    if (!validateR25MemoryCheckpoint({ ...legacy, schemaVersion: R25_MEMORY_CHECKPOINT_SCHEMA })) return false;
    const selected = v.owners.aggregates.length;
    return ownerLinks.uses.samples.every(row => row.id <= selected || kinds.every(key => row[key] === 0)) &&
      ownerLinks.uses.slots.every(row => row.aggregateId === null || row.aggregateId <= selected) &&
      (ownerLinks.framework === null || ownerLinks.framework.observation.matches.every(row => row.aggregateId <= selected));
  } catch { return false; }
}
