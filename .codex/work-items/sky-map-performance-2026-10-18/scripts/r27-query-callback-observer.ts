// TASK ONLY. One known queryFn site, joined to the existing first-eight
// aggregate IDs. Same-render association is not a callback-to-aggregate edge.
type Ref = { deref(): object | undefined };
type RefConstructor = new (value: object) => Ref;
type Life = "alive" | "collected" | "unknown";
type Refs = { page: Ref | null; wrapper: Ref | null; query: Ref | null };
type Render = Refs & { id: number; pageRegistered: boolean; wrapperRegistered: boolean; queryRegistered: boolean };
type Sample = Refs & { aggregateId: number; renderId: number | null;
  association: "render" | "outside-render"; renderCompleted: boolean };
type OwnerState = { inCache: boolean | null; currentOptionMatches: boolean | null };
const SAMPLE_LIMIT = 8, MAX = 1e12;
const object = (value: unknown): value is object => value !== null &&
  (typeof value === "object" || typeof value === "function");
const emptyRefs = (): Refs => ({ page: null, wrapper: null, query: null });
const freeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export function createR27QueryCallbackObserver(options: {
  aggregateId: (value: object) => number | null;
  readQueryOwner: (query: object, wrapper: Function | undefined) => OwnerState;
  WeakRef?: RefConstructor | null;
}) {
  // Both ports must be fixed diagnostic owners, never a closure over a render,
  // product frame or callback. No product reference is a strong index value.
  const aggregateId = options.aggregateId, readQueryOwner = options.readQueryOwner;
  const RefClass = Object.prototype.hasOwnProperty.call(options, "WeakRef") ? options.WeakRef
    : (globalThis as unknown as { WeakRef?: RefConstructor }).WeakRef;
  let supported = false;
  try { const value = {}; supported = typeof RefClass === "function" && new RefClass(value).deref() === value; }
  catch { /* Missing capability is unknown liveness, never collection. */ }
  let active = false, tracking = false, current: Render | null = null, renderId = 0;
  let samples: Sample[] = [];
  const freshDiagnostics = () => ({ beginRenderCalls: 0, finishRenderCalls: 0, pageCallbackCalls: 0,
    queryWrapperCalls: 0, queryOwnerCalls: 0, aggregateCalls: 0, unterminatedRenders: 0,
    finishWithoutRender: 0, outsideRenderAggregates: 0, missingPageCallbacks: 0,
    unscopedCallbackCalls: 0, unmatchedPageCallbacks: 0, duplicatePageCallbacks: 0,
    duplicateWrappers: 0, duplicateQueries: 0, missingQueryOwners: 0,
    duplicateAggregates: 0, unselectedAggregates: 0, invalidCalls: 0, invalidIds: 0,
    lookupErrors: 0, refsCreated: 0, referenceErrors: 0, ownerReadCalls: 0,
    ownerReadErrors: 0, invalidOwnerStates: 0, overflow: false });
  let diagnostics = freshDiagnostics();
  type Counter = Exclude<keyof typeof diagnostics, "overflow">;
  const count = (key: Counter) => {
    if (diagnostics[key] >= MAX) diagnostics.overflow = true;
    else diagnostics[key]++;
  };
  const reference = (value: object): Ref | null => {
    if (!supported) return null;
    try {
      const ref = new RefClass!(value);
      if (!ref || typeof ref.deref !== "function") throw Error("invalid_weak_reference");
      count("refsCreated"); return ref;
    } catch { count("referenceErrors"); return null; }
  };
  const read = (ref: Ref | null, kind: "function" | "object"): { life: Life; value: object | undefined } => {
    if (!ref) return { life: "unknown", value: undefined };
    try {
      const value = ref.deref();
      if (value === undefined) return { life: "collected", value: undefined };
      if (!object(value) || (kind === "function" && typeof value !== "function")) {
        count("referenceErrors"); return { life: "unknown", value: undefined };
      }
      return { life: "alive", value };
    } catch { count("referenceErrors"); return { life: "unknown", value: undefined }; }
  };
  const matchesPage = (fn: Function): boolean => !!current && typeof fn === "function" &&
    read(current.page, "function").value === fn;
  function release() {
    active = tracking = false; current = null; samples = []; renderId = 0;
  }
  return {
    // Activation is independent of WeakRef support. Unsupported references can
    // still be associated with an original ID, with explicit unknown liveness.
    start() {
      if (active) return false;
      release(); diagnostics = freshDiagnostics(); active = tracking = true; return true;
    },
    stopTracking() { tracking = false; },
    release,
    beginRender() {
      if (!active || !tracking) return;
      count("beginRenderCalls");
      if (current) count("unterminatedRenders");
      current = null;
      if (samples.length >= SAMPLE_LIMIT) return;
      if (renderId >= MAX) { diagnostics.overflow = true; return; }
      current = { id: ++renderId, ...emptyRefs(), pageRegistered: false,
        wrapperRegistered: false, queryRegistered: false };
    },
    finishRender<T>(value: T): T {
      if (!active) return value;
      count("finishRenderCalls");
      if (!current) { count("finishWithoutRender"); return value; }
      for (const sample of samples) if (sample.renderId === current.id) sample.renderCompleted = true;
      current = null;
      // In particular, never retain, enumerate or freeze the returned ReactNode.
      return value;
    },
    pageCallback<T extends Function>(fn: T): T {
      if (!active || !tracking || samples.length >= SAMPLE_LIMIT) return fn;
      count("pageCallbackCalls");
      if (typeof fn !== "function") { count("invalidCalls"); return fn; }
      if (!current) { count("unscopedCallbackCalls"); return fn; }
      if (current.pageRegistered) { count("duplicatePageCallbacks"); return fn; }
      current.pageRegistered = true; current.page = reference(fn); return fn;
    },
    // A pure identity gate for the shared hook. An unrelated query must not
    // trigger a QueryCache lookup or create any extra callback/owner witness.
    observesPageCallback(fn: Function): boolean {
      return active && tracking && samples.length < SAMPLE_LIMIT && matchesPage(fn);
    },
    queryWrapper<T extends Function>(pageFn: Function, wrapper: T): T {
      if (!active || !tracking || samples.length >= SAMPLE_LIMIT) return wrapper;
      count("queryWrapperCalls");
      if (typeof pageFn !== "function" || typeof wrapper !== "function") { count("invalidCalls"); return wrapper; }
      if (!matchesPage(pageFn)) { count("unmatchedPageCallbacks"); return wrapper; }
      if (current!.wrapperRegistered) { count("duplicateWrappers"); return wrapper; }
      current!.wrapperRegistered = true; current!.wrapper = reference(wrapper); return wrapper;
    },
    queryOwner(pageFn: Function, query: object | undefined): void {
      if (!active || !tracking || samples.length >= SAMPLE_LIMIT) return;
      count("queryOwnerCalls");
      if (typeof pageFn !== "function" || (query !== undefined && !object(query))) { count("invalidCalls"); return; }
      if (!matchesPage(pageFn)) { count("unmatchedPageCallbacks"); return; }
      if (query === undefined) { count("missingQueryOwners"); return; }
      if (current!.queryRegistered) { count("duplicateQueries"); return; }
      current!.queryRegistered = true; current!.query = reference(query);
    },
    aggregate(value: object): void {
      if (!active || !tracking) return;
      count("aggregateCalls");
      if (!object(value)) { count("invalidCalls"); return; }
      let id: number | null;
      try { id = aggregateId(value); }
      catch { count("lookupErrors"); return; }
      if (id === null) { count("unselectedAggregates"); return; }
      if (!Number.isSafeInteger(id) || id < 1 || id > SAMPLE_LIMIT) { count("invalidIds"); return; }
      if (samples.some(sample => sample.aggregateId === id)) { count("duplicateAggregates"); return; }
      if (!current) count("outsideRenderAggregates");
      else if (!current.pageRegistered) count("missingPageCallbacks");
      // Copy only these WeakRefs at first selection. Later registration must not
      // retroactively invent a creation-render association for this aggregate.
      samples.push({ aggregateId: id, renderId: current?.id ?? null,
        association: current ? "render" : "outside-render", renderCompleted: false,
        page: current?.page ?? null, wrapper: current?.wrapper ?? null, query: current?.query ?? null });
    },
    snapshot() {
      const states = samples.map(sample => {
        const page = read(sample.page, "function"), wrapper = read(sample.wrapper, "function"), query = read(sample.query, "object");
        let queryInCache: boolean | null = null, currentOptionMatches: boolean | null = null;
        if (query.value !== undefined) {
          count("ownerReadCalls");
          try {
            const state = readQueryOwner(query.value, wrapper.value as Function | undefined);
            if (!state || typeof state !== "object") { count("invalidOwnerStates"); }
            else {
              if (state.inCache === null || typeof state.inCache === "boolean") queryInCache = state.inCache;
              else count("invalidOwnerStates");
              if (state.currentOptionMatches !== null && typeof state.currentOptionMatches !== "boolean") count("invalidOwnerStates");
              else if (wrapper.value !== undefined) currentOptionMatches = state.currentOptionMatches;
            }
          } catch { count("ownerReadErrors"); }
        }
        return { aggregateId: sample.aggregateId, site: "fine-target-queryFn" as const,
          association: sample.association, renderId: sample.renderId, renderCompleted: sample.renderCompleted,
          pageCallback: page.life, queryWrapper: wrapper.life, queryOwner: query.life,
          queryInCache, currentOptionMatches };
      });
      return freeze({ schemaVersion: "starward-r27-query-callback-v1" as const,
        capability: supported ? "supported" as const : "unsupported" as const,
        semantics: "same-render-association-and-actual-query-option-not-closure-edge" as const,
        active, tracking, released: !active, policy: { samples: SAMPLE_LIMIT, sites: 1 },
        diagnostics: { ...diagnostics }, samples: states });
    },
  };
}
