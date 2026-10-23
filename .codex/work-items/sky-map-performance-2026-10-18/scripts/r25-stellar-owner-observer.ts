// TASK ONLY. Bounded witnesses at the real SAO cache/aggregate owners. A live
// witness is not a retaining root, and this is not a whole-heap object graph.
type Ref = { deref(): object | undefined };
type RefConstructor = new (value: object) => Ref;
type Life = "alive" | "collected" | "unknown";
type Entry = { transform: object };
type Span = { cached: object };
type TileWitness = {
  id: number; writes: number; replacements: number;
  key: Ref | null; firstEntry: Ref | null; latestObservedEntry: Ref | null;
  firstTransform: Ref | null; latestObservedTransform: Ref | null;
  firstIsLatestObserved: boolean;
};
type AggregateWitness = { id: number; ref: Ref | null; firstEntryTileIds: number[] };
const TILES = 8, AGGREGATES = 8, MAX = 1e12;
const object = (value: unknown): value is object => value !== null &&
  (typeof value === "object" || typeof value === "function");
const freeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export function createR25StellarOwnerObserver(options: { WeakRef?: RefConstructor | null } = {}) {
  const RefClass = Object.prototype.hasOwnProperty.call(options, "WeakRef") ? options.WeakRef
    : (globalThis as unknown as { WeakRef?: RefConstructor }).WeakRef;
  let supported = false;
  try { const value = {}; supported = typeof RefClass === "function" && new RefClass(value).deref() === value; }
  catch { /* Capability is reported explicitly. */ }
  let tracking = false, released = true;
  let tiles: TileWitness[] = [], aggregates: AggregateWitness[] = [];
  // Only the first eight selected keys enter these maps. Values are scalars or
  // records of WeakRefs; no callback, product entry, tile or span is a value.
  let tileIds = new WeakMap<object, TileWitness>();
  let firstEntryIds = new WeakMap<object, number[]>();
  let aggregateIds = new WeakMap<object, number>();
  const emptyDiagnostics = () => ({ tileCalls: 0, unselectedTileCalls: 0, aggregateCalls: 0,
    unselectedAggregateCalls: 0, rejectedCalls: 0, referenceErrors: 0, refsCreated: 0, overflow: false });
  let diagnostics = emptyDiagnostics();
  type Counter = Exclude<keyof typeof diagnostics, "overflow">;
  const count = (key: Counter) => {
    if (diagnostics[key] >= MAX) diagnostics.overflow = true;
    else diagnostics[key]++;
  };
  const increment = (value: number) => {
    if (value >= MAX) { diagnostics.overflow = true; return MAX; }
    return value + 1;
  };
  const reference = (value: object): Ref | null => {
    try { const ref = new RefClass!(value); count("refsCreated"); return ref; }
    catch { count("referenceErrors"); return null; }
  };
  const life = (ref: Ref | null): Life => {
    if (!ref) return "unknown";
    try { return ref.deref() === undefined ? "collected" : "alive"; }
    catch { count("referenceErrors"); return "unknown"; }
  };
  function release() {
    tracking = false; released = true; tiles = []; aggregates = [];
    tileIds = new WeakMap(); firstEntryIds = new WeakMap(); aggregateIds = new WeakMap();
  }
  return {
    start() {
      if (!released) return false;
      release(); diagnostics = emptyDiagnostics(); released = false; tracking = supported;
      return supported;
    },
    stopTracking() { tracking = false; },
    release,
    // Read-only weak identity lookup for the bounded outer-owner observation.
    // An absent ID says unselected, not collected; release clears this index.
    aggregateId(value: object): number | null { return aggregateIds.get(value) ?? null; },
    observeTile(tile: object, entry: Entry) {
      if (!tracking || !supported) return;
      count("tileCalls");
      try {
        if (!object(tile) || !object(entry) || !object(entry.transform)) { count("rejectedCalls"); return; }
        const existing = tileIds.get(tile);
        if (existing) {
          existing.writes = increment(existing.writes);
          // The immediately preceding value may be kept alive for this job by
          // deref(). Never dereference the initial value here on each frame.
          // Only the known bounded eight most recent values are touched.
          if (existing.latestObservedEntry) {
            try {
              if (existing.latestObservedEntry.deref() !== entry)
                existing.replacements = increment(existing.replacements);
            } catch { count("referenceErrors"); }
          }
          existing.latestObservedEntry = reference(entry);
          existing.latestObservedTransform = reference(entry.transform);
          existing.firstIsLatestObserved = firstEntryIds.get(entry)?.includes(existing.id) ?? false;
          return;
        }
        if (tiles.length >= TILES) { count("unselectedTileCalls"); return; }
        const id = tiles.length + 1;
        const firstEntry = reference(entry), firstTransform = reference(entry.transform);
        const witness: TileWitness = { id, writes: 1, replacements: 0, key: reference(tile), firstEntry,
          latestObservedEntry: firstEntry, firstTransform, latestObservedTransform: firstTransform,
          firstIsLatestObserved: true };
        const memberships = firstEntryIds.get(entry);
        if (memberships) memberships.push(id); else firstEntryIds.set(entry, [id]);
        tileIds.set(tile, witness); tiles.push(witness);
      } catch { count("rejectedCalls"); }
    },
    observeAggregate(aggregate: object, entries: readonly Span[]) {
      if (!tracking || !supported) return;
      count("aggregateCalls");
      try {
        if (!object(aggregate) || !Array.isArray(entries)) { count("rejectedCalls"); return; }
        if (aggregateIds.has(aggregate)) return;
        if (aggregates.length >= AGGREGATES) { count("unselectedAggregateCalls"); return; }
        const ids = new Set<number>();
        for (const span of entries) {
          if (!object(span) || !("cached" in span) || !object(span.cached)) { count("rejectedCalls"); return; }
          for (const id of firstEntryIds.get(span.cached) ?? []) ids.add(id);
        }
        const id = aggregates.length + 1;
        aggregateIds.set(aggregate, id);
        aggregates.push({ id, ref: reference(aggregate), firstEntryTileIds: [...ids].sort((a, b) => a - b) });
      } catch { count("rejectedCalls"); }
    },
    snapshot() {
      // All returned fields are scalars or fresh arrays. In particular the
      // original spans and entry objects cannot escape through this receipt.
      const tileStates = tiles.map(item => ({ id: item.id, writes: item.writes, replacements: item.replacements,
        key: life(item.key), firstEntry: life(item.firstEntry), latestObservedEntry: life(item.latestObservedEntry),
        firstTransform: life(item.firstTransform), latestObservedTransform: life(item.latestObservedTransform),
        firstIsLatestObserved: item.firstIsLatestObserved }));
      const aggregateStates = aggregates.map(item => ({ id: item.id, alive: life(item.ref), firstEntryTileIds: [...item.firstEntryTileIds] }));
      return freeze({ schemaVersion: "starward-r25-stellar-owners-v1" as const,
        capability: supported ? "supported" as const : "unsupported" as const,
        semantics: "sampled-owner-identity-not-retaining-roots-not-whole-heap" as const,
        tracking, released, policy: { tiles: TILES, aggregates: AGGREGATES },
        diagnostics: { ...diagnostics }, tiles: tileStates, aggregates: aggregateStates });
    },
  };
}
