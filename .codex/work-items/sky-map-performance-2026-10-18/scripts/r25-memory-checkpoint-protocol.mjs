// One independently durable checkpoint, not a whole heap snapshot. Historical
// v1 lifetime receipts remain supported by their unchanged validator.
import { validateR25MemoryLifetime } from './r25-memory-lifetime-protocol.mjs';
export const R25_MEMORY_CHECKPOINT_SCHEMA = 'starward-r25-memory-checkpoint-v1';
const MAX = 1e12;
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= MAX;
const live = v => ['alive', 'collected', 'unknown'].includes(v);
export function validateR25StellarOwners(v) {
  if (!object(v, ['schemaVersion', 'capability', 'semantics', 'tracking', 'released', 'policy', 'diagnostics', 'tiles', 'aggregates']) ||
    v.schemaVersion !== 'starward-r25-stellar-owners-v1' || !['supported', 'unsupported'].includes(v.capability) ||
    v.semantics !== 'sampled-owner-identity-not-retaining-roots-not-whole-heap' ||
    typeof v.tracking !== 'boolean' || typeof v.released !== 'boolean' || v.released && v.tracking ||
    !object(v.policy, ['tiles', 'aggregates']) || v.policy.tiles !== 8 || v.policy.aggregates !== 8 ||
    !object(v.diagnostics, ['tileCalls', 'unselectedTileCalls', 'aggregateCalls', 'unselectedAggregateCalls',
      'rejectedCalls', 'referenceErrors', 'refsCreated', 'overflow']) || typeof v.diagnostics.overflow !== 'boolean' ||
    !['tileCalls', 'unselectedTileCalls', 'aggregateCalls', 'unselectedAggregateCalls', 'rejectedCalls', 'referenceErrors', 'refsCreated']
      .every(key => count(v.diagnostics[key])) || v.diagnostics.unselectedTileCalls > v.diagnostics.tileCalls ||
    v.diagnostics.unselectedAggregateCalls > v.diagnostics.aggregateCalls ||
    !Array.isArray(v.tiles) || v.tiles.length > 8 || !Array.isArray(v.aggregates) || v.aggregates.length > 8) return false;
  if ((v.capability === 'unsupported' || v.released) && (v.tiles.length || v.aggregates.length || v.tracking)) return false;
  if (!v.tiles.every((tile, index) => object(tile, ['id', 'writes', 'replacements', 'key', 'firstEntry', 'latestObservedEntry',
    'firstTransform', 'latestObservedTransform', 'firstIsLatestObserved']) && tile.id === index + 1 &&
    count(tile.writes) && tile.writes >= 1 && count(tile.replacements) && tile.replacements < tile.writes &&
    ['key', 'firstEntry', 'latestObservedEntry', 'firstTransform', 'latestObservedTransform'].every(key => live(tile[key])) &&
    typeof tile.firstIsLatestObserved === 'boolean')) return false;
  return v.aggregates.every((aggregate, index) => object(aggregate, ['id', 'alive', 'firstEntryTileIds']) &&
    aggregate.id === index + 1 && live(aggregate.alive) && Array.isArray(aggregate.firstEntryTileIds) &&
    aggregate.firstEntryTileIds.length <= v.tiles.length && aggregate.firstEntryTileIds.every((id, entryIndex, ids) =>
      Number.isSafeInteger(id) && id >= 1 && id <= v.tiles.length && (!entryIndex || id > ids[entryIndex - 1])));
}
export function validateR25MemoryCheckpoint(v) {
  try {
    if (Buffer.byteLength(JSON.stringify(v), 'utf8') > 32768 ||
      !object(v, ['schemaVersion', 'variant', 'runId', 'sequence', 'observation', 'owners']) ||
      v.schemaVersion !== R25_MEMORY_CHECKPOINT_SCHEMA || v.variant !== 'baseline' ||
      !Number.isSafeInteger(v.sequence) || v.sequence < 1 || v.sequence > 10 ||
      !validateR25MemoryLifetime(v.observation) || v.runId !== v.observation.runId ||
      v.variant !== v.observation.variant || v.observation.checkpoints.length !== 1 || !validateR25StellarOwners(v.owners)) return false;
    const point = v.observation.checkpoints[0];
    if ((v.sequence === 1) !== (point.phase === 'baseline')) return false;
    return v.observation.clock.invalid || point.relativeMs !== null && point.relativeMs <= v.observation.clock.elapsedMs;
  } catch { return false; }
}
