// TASK ONLY. Weak witnesses for the two measured allocation owners, not a heap
// census or a retaining graph. No product object is stored strongly here.
export const R25_MEMORY_SITES = ["stellar-vectors", "stellar-positions", "stellar-directions",
  "stellar-transmissions", "gpu-upload-view", "gpu-upload-backing"] as const;
type Site = typeof R25_MEMORY_SITES[number];
type Ref = { deref(): object | undefined };
type RefConstructor = new (value: object) => Ref;
type Binding = { generation: number; sourceHash: string };
type Phase = "baseline" | "active-5" | "active-15" | "active-30" | "paused" | "retired" | "hidden" | "scope-ended" | "drain-10" | "drain-30" | "end";
type Event = "play" | "pause" | "retire" | "hide" | "scope";
const FIRST = 32, RECENT = 32, STRIDE = 16, MAX = 1e12, CHECKPOINTS = 10, EVENTS = 8;
const phases: readonly string[] = ["baseline", "active-5", "active-15", "active-30", "paused", "retired", "hidden", "scope-ended", "drain-10", "drain-30", "end"];
const events: readonly string[] = ["play", "pause", "retire", "hide", "scope"];
type Witness = { ordinal: number; at: number | null; quantity: number; ref: Ref };
type Counts = { allocations: number; totalQuantity: number; selected: number; evicted: number; first: Witness[]; recent: Witness[] };
const makeCounts = (): Counts => ({ allocations: 0, totalQuantity: 0, selected: 0, evicted: 0, first: [], recent: [] });
const countsMap = () => Object.fromEntries(R25_MEMORY_SITES.map(site => [site, makeCounts()])) as Record<Site, Counts>;
const deepFreeze = <T>(value: T): T => { if (value && typeof value === "object") {
  for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value);
} return value; };
export function createR25MemoryLifetimeObserver(options: { now?: () => number; WeakRef?: RefConstructor | null } = {}) {
  const now = options.now ?? (() => Date.now());
  const RefClass = Object.prototype.hasOwnProperty.call(options, "WeakRef") ? options.WeakRef
    : (globalThis as unknown as { WeakRef?: RefConstructor }).WeakRef;
  let supported = false;
  try { const value = {}; supported = typeof RefClass === "function" && new RefClass(value).deref() === value; } catch { /* optional */ }
  let binding: Binding | null = null, active = false, run = 0, runId = "";
  let base: number | null = null, previous: number | null = null, invalidClock = false;
  let reads = 0, invalidReads = 0, backwardReads = 0, outOfRangeReads = 0, overflow = false, rejectedTracks = 0, refErrors = 0;
  let checkpointOmitted = 0, eventOmitted = 0, refsCreated = 0;
  let sites = countsMap();
  let checkpoints: object[] = [], marks: { event: Event; relativeMs: number | null }[] = [];
  let sealed: ReturnType<typeof payload> | null = null;
  const add = (a: number, b = 1) => { if (a > MAX - b) { overflow = true; return MAX; } return a + b; };
  function time(): number | null {
    reads = add(reads);
    let value: number; try { value = now(); } catch { value = NaN; }
    if (!Number.isSafeInteger(value) || value < 0) { invalidReads = add(invalidReads); invalidClock = true; return null; }
    if (previous !== null && value < previous) { backwardReads = add(backwardReads); invalidClock = true; }
    previous = value;
    if (base === null) base = value;
    if (value - base > 120000) { outOfRangeReads = add(outOfRangeReads); invalidClock = true; }
    return invalidClock ? null : value - base;
  }
  function cohort(values: Witness[], at: number | null) {
    if (!supported) return null;
    let alive = 0, collected = 0, unknown = 0, aliveQuantity = 0, collectedQuantity = 0;
    let aliveAgeMin: number | null = null, aliveAgeMax: number | null = null, ageUnknown = 0;
    for (const item of values) {
      let present: boolean; try { present = item.ref.deref() !== undefined; }
      catch { unknown++; refErrors = add(refErrors); continue; }
      if (!present) { collected++; collectedQuantity = add(collectedQuantity, item.quantity); continue; }
      alive++; aliveQuantity = add(aliveQuantity, item.quantity);
      const age = at !== null && item.at !== null && at > item.at ? at - item.at : null;
      if (age === null) ageUnknown++;
      else { aliveAgeMin = aliveAgeMin === null ? age : Math.min(aliveAgeMin, age); aliveAgeMax = aliveAgeMax === null ? age : Math.max(aliveAgeMax, age); }
    }
    return { witnesses: values.length, alive, collected, unknown, aliveQuantity, collectedQuantity,
      ageMinMs: aliveAgeMin, ageMaxMs: aliveAgeMax, ageUnknown };
  }
  function checkpoint(phase: Phase): boolean {
    if (!active || !phases.includes(phase)) return false;
    // Keep the final slot for the terminal receipt even when lifecycle events
    // arrive together. An omitted intermediate point stays explicit.
    if (checkpoints.length >= CHECKPOINTS || phase !== "end" && checkpoints.length >= CHECKPOINTS - 1) {
      checkpointOmitted = add(checkpointOmitted); return false;
    }
    const at = time();
    checkpoints.push({ phase, relativeMs: at, sites: R25_MEMORY_SITES.map((site, siteIndex) => {
      const c = sites[site];
      return { siteIndex,
        allocations: c.allocations, totalQuantity: c.totalQuantity, selected: c.selected, evictedWitnesses: c.evicted,
        // Unselected hook calls are exactly allocations - selected; avoid
        // repeating this derived quantity in each bounded checkpoint.
        first: cohort(c.first, at), recent: cohort(c.recent, at) };
    }) });
    return true;
  }
  function mark(event: Event): boolean {
    if (!active || !events.includes(event)) return false;
    if (marks.length >= EVENTS) { eventOmitted = add(eventOmitted); return false; }
    marks.push({ event, relativeMs: time() }); return true;
  }
  function payload(elapsedMs: number | null) {
    return { schemaVersion: "starward-r25-memory-lifetime-v1" as const, variant: "baseline" as const, runId,
      binding: binding && { ...binding }, capability: supported ? "supported" as const : "unsupported" as const,
      semantics: "sampled-weak-liveness-not-retainers-not-whole-heap-not-leak-verdict" as const,
      sites: R25_MEMORY_SITES.map(site => ({ site, unit: site.startsWith("stellar-")
        ? "array-slots-not-heap-bytes" : "typed-byteLength-view-and-backing-overlap" })),
      policy: { first: FIRST, recent: RECENT, strideAfterFirst: STRIDE, checkpoints: CHECKPOINTS, events: EVENTS },
      clock: { source: "Date.now" as const, kind: "wall-elapsed" as const, effectiveResolutionMs: null,
        reads, invalidReads, backwardReads, outOfRangeReads, invalid: invalidClock, elapsedMs },
      diagnostics: { overflow, rejectedTracks, refErrors, refsCreated, checkpointOmitted, eventOmitted },
      events: marks, checkpoints };
  }
  const release = () => { for (const c of Object.values(sites)) { c.first = []; c.recent = []; } };
  return {
    configure(value: Binding) {
      if (active || binding || !Number.isSafeInteger(value.generation) || value.generation < 1 || !/^[a-f0-9]{64}$/.test(value.sourceHash)) return false;
      binding = { generation: value.generation, sourceHash: value.sourceHash }; return true;
    },
    capability: () => ({ weakRef: supported }),
    start() {
      if (!binding || active || run >= MAX - 1) return null;
      run++; runId = `r25-${run}-${Math.floor(Math.random() * 0x1_0000_0000).toString(36)}`;
      base = previous = null; invalidClock = overflow = false;
      reads = invalidReads = backwardReads = outOfRangeReads = rejectedTracks = refErrors = refsCreated = checkpointOmitted = eventOmitted = 0;
      sites = countsMap(); checkpoints = []; marks = []; sealed = null; active = true;
      time(); mark("play"); checkpoint("baseline"); return runId;
    },
    track(site: Site, value: object, quantity: number) {
      if (!active || !supported) return;
      try {
        if (!R25_MEMORY_SITES.includes(site) || !value || (typeof value !== "object" && typeof value !== "function") ||
          !Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX) { rejectedTracks = add(rejectedTracks); return; }
        const c = sites[site]; c.allocations = add(c.allocations); c.totalQuantity = add(c.totalQuantity, quantity);
        if (c.allocations > FIRST && (c.allocations - FIRST) % STRIDE !== 0) return;
        const ref = new RefClass!(value); refsCreated = add(refsCreated); c.selected = add(c.selected);
        const witness = { ordinal: c.allocations, at: time(), quantity, ref };
        if (c.allocations <= FIRST) c.first.push(witness);
        else { if (c.recent.length >= RECENT) { c.recent.shift(); c.evicted = add(c.evicted); } c.recent.push(witness); }
      } catch { refErrors = add(refErrors); }
    },
    mark, checkpoint,
    snapshot() {
      if (!active || !checkpoints.length) return null;
      const current = payload(time());
      // Copy the live arrays before freezing. Their entries contain only
      // scalars and are never edited; later marks/checkpoints must stay usable.
      return deepFreeze({ ...current, events: [...marks], checkpoints: checkpoints.slice(-1) });
    },
    seal() {
      if (sealed) return sealed;
      if (!active) return null;
      const elapsed = time(); active = false;
      // Checkpoint objects contain scalars only. Drop all weak witnesses before
      // exposing the stable immutable receipt; retry never re-observes objects.
      release(); sealed = deepFreeze(payload(elapsed)); return sealed;
    },
    stop() { active = false; release(); },
    active: () => active,
  };
}
