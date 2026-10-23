// Exact task-only additions to the real owner. Inputs/returns, math, cache writes
// and aggregate closures remain unchanged; no copied catalogue or span history.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('r25_stellar_owner_boundary_changed:' + label);
  return source.replace(before, after);
}
export function addR25StellarOwnerObservation(source) {
  source = 'import { r25MemoryTile, r25MemoryAggregate } from "./r25-memory-lifetime-adapter";\n' + source;
  source = one(source, '      cached={geometry,transform,pointAt};transformed.set(tile,cached);',
    '      cached={geometry,transform,pointAt};transformed.set(tile,cached);\n      r25MemoryTile(tile,cached);', 'actual_tile_cache_write');
  return one(source, '  return resolved;', '  r25MemoryAggregate(resolved,spans);\n  return resolved;', 'actual_aggregate_membership');
}
