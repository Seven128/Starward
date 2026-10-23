// TASK ONLY. Known Taro 4.2.1 / React 18.3.1 ownership fields, not a heap walker.
// The caller supplies only the two exact Sky canvas nodes from eventSource.get.
// No observed object or callback escapes this synchronous scalar observation.
export const R26_FIBER_OWNER_SCHEMA = "starward-r26-fiber-owners-v1";
export const R26_FIBER_POLICY = Object.freeze({ entrances: 2, ancestors: 32, fibers: 32,
  hooksPerFiber: 1024, updatesPerQueue: 32, valueObjects: 4096, valueDepth: 6,
  arrayItems: 32, matches: 24, descriptorReads: 32768 });
type Entrance = "sky-canvas" | "sky-selection";
type Branch = "host-linked" | "alternate";
type ValueKey = "current" | "frame" | "stellarSupplement" | "value";
type ValuePath = Array<ValueKey | number>;
type RootField = "memoizedState" | "baseState" | "queue.lastRenderedState" |
  "baseQueue.eagerState" | "queue.pending.eagerState" | "queue.interleaved.eagerState";
type Match = { aggregateId: number; entrance: Entrance; ancestorDepth: number; branch: Branch;
  hookIndex: number; field: RootField; updateIndex: number | null; valuePath: ValuePath };
const keys: readonly ValueKey[] = ["current", "frame", "stellarSupplement", "value"];
const object = (value: unknown): value is object => value !== null && typeof value === "object";
const freeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
};

export function inspectR26FiberOwners(options: {
  nodes: Iterable<unknown>; fiberKey: string; aggregateId: (value: object) => number | null; now?: () => number;
}) {
  const policy = R26_FIBER_POLICY, missing = {}, now = options.now ?? (() => Date.now());
  const coverage = { nodeInputs: 0, uniqueNodes: 0, skyEntrances: 0, hostFibers: 0,
    functionFibers: 0, hooks: 0, queueUpdates: 0, valueObjects: 0, descriptorReads: 0,
    accessorSkipped: 0, descriptorErrors: 0, invalidFields: 0, matchErrors: 0,
    iteratorErrors: 0, opaqueFunctions: 0 };
  const truncated = { entrances: false, ancestors: false, fibers: false, hooks: false,
    updates: false, values: false, depth: false, arrayItems: false, matches: false, descriptors: false };
  const matches: Match[] = [];
  const nodes = new Set<object>(), fibers = new Set<object>();
  const safeClock = () => { try { const n = now(); return Number.isSafeInteger(n) && n >= 0 ? n : null; } catch { return null; } };
  const started = safeClock();
  const configurationValid = typeof options.fiberKey === "string" && /^__reactFiber\$[a-z0-9]+$/.test(options.fiberKey) &&
    typeof options.aggregateId === "function";
  const read = (value: object, field: string): unknown => {
    if (coverage.descriptorReads >= policy.descriptorReads) { truncated.descriptors = true; return missing; }
    coverage.descriptorReads++;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (!descriptor) return missing;
      if (!("value" in descriptor)) { coverage.accessorSkipped++; return missing; }
      return descriptor.value;
    } catch { coverage.descriptorErrors++; return missing; }
  };
  const isObject = (value: unknown): value is object => value !== missing && object(value);

  function valueGraph(root: unknown, origin: Omit<Match, "aggregateId" | "valuePath">) {
    const seen = new Set<object>();
    const queue: Array<{ value: object; path: ValuePath }> = [];
    const enqueue = (value: unknown, path: ValuePath) => {
      if (typeof value === "function") { coverage.opaqueFunctions++; return; }
      if (!isObject(value) || seen.has(value)) return;
      if (path.length > policy.valueDepth) { truncated.depth = true; return; }
      if (coverage.valueObjects >= policy.valueObjects) { truncated.values = true; return; }
      seen.add(value); coverage.valueObjects++; queue.push({ value, path });
    };
    enqueue(root, []);
    for (let index = 0; index < queue.length && !truncated.descriptors; index++) {
      const item = queue[index]!;
      let id: number | null = null;
      try {
        const found = options.aggregateId(item.value);
        if (found !== null && (!Number.isSafeInteger(found) || found < 1 || found > 8)) coverage.matchErrors++;
        else id = found;
      } catch { coverage.matchErrors++; }
      if (id !== null) {
        if (matches.length >= policy.matches) truncated.matches = true;
        else matches.push({ aggregateId: id, ...origin, valuePath: item.path });
        // A matched aggregate is the target, not a new root to traverse.
        continue;
      }
      if (Array.isArray(item.value)) {
        const length = read(item.value, "length");
        if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) { coverage.invalidFields++; continue; }
        if (length > policy.arrayItems) truncated.arrayItems = true;
        for (let n = 0; n < Math.min(length, policy.arrayItems); n++)
          enqueue(read(item.value, String(n)), [...item.path, n]);
      } else {
        for (const key of keys) enqueue(read(item.value, key), [...item.path, key]);
      }
    }
    // No persistent closure keeps queue/seen or any observed object.
  }

  function updates(first: unknown, origin: Omit<Match, "aggregateId" | "valuePath" | "updateIndex">) {
    const seen = new Set<object>(); let update = first, index = 0;
    while (isObject(update) && !seen.has(update) && !truncated.descriptors) {
      if (index >= policy.updatesPerQueue) { truncated.updates = true; break; }
      seen.add(update); coverage.queueUpdates++;
      valueGraph(read(update, "eagerState"), { ...origin, updateIndex: index });
      update = read(update, "next"); index++;
    }
  }

  function inspectFiber(fiber: object, entrance: Entrance, ancestorDepth: number, branch: Branch) {
    if (fibers.has(fiber)) return;
    const tag = read(fiber, "tag");
    // FunctionComponent, ForwardRef, MemoComponent, SimpleMemoComponent.
    if (![0, 11, 14, 15].includes(tag as number)) return;
    if (fibers.size >= policy.fibers) { truncated.fibers = true; return; }
    fibers.add(fiber); coverage.functionFibers++;
    let hook = read(fiber, "memoizedState"), hookIndex = 0;
    const seen = new Set<object>();
    while (isObject(hook) && !seen.has(hook) && !truncated.descriptors) {
      if (hookIndex >= policy.hooksPerFiber) { truncated.hooks = true; break; }
      seen.add(hook); coverage.hooks++;
      const state = read(hook, "memoizedState"), next = read(hook, "next");
      if (state === missing || next === missing) { coverage.invalidFields++; break; }
      const origin = { entrance, ancestorDepth, branch, hookIndex };
      valueGraph(state, { ...origin, field: "memoizedState", updateIndex: null });
      valueGraph(read(hook, "baseState"), { ...origin, field: "baseState", updateIndex: null });
      updates(read(hook, "baseQueue"), { ...origin, field: "baseQueue.eagerState" });
      const q = read(hook, "queue");
      if (isObject(q)) {
        valueGraph(read(q, "lastRenderedState"), { ...origin, field: "queue.lastRenderedState", updateIndex: null });
        updates(read(q, "pending"), { ...origin, field: "queue.pending.eagerState" });
        updates(read(q, "interleaved"), { ...origin, field: "queue.interleaved.eagerState" });
      }
      hook = next; hookIndex++;
    }
  }

  if (configurationValid) {
    try {
      for (const node of options.nodes) {
        if (coverage.nodeInputs >= policy.entrances) { truncated.entrances = true; break; }
        coverage.nodeInputs++;
        if (!isObject(node) || nodes.has(node)) continue;
        nodes.add(node); coverage.uniqueNodes++;
        const props = read(node, "props"), id = isObject(props) ? read(props, "id") : missing;
        const entrance: Entrance | null = id === "spot-night-sky-scene" ? "sky-canvas" :
          id === "spot-night-sky-scene-selection" ? "sky-selection" : null;
        if (!entrance) continue;
        coverage.skyEntrances++;
        const host = read(node, options.fiberKey);
        if (!isObject(host) || read(host, "tag") !== 5 || read(host, "stateNode") !== node) { coverage.invalidFields++; continue; }
        coverage.hostFibers++;
        let ancestor: unknown = host, depth = 0;
        const seen = new Set<object>();
        while (isObject(ancestor) && !seen.has(ancestor) && !truncated.descriptors) {
          if (depth >= policy.ancestors) { truncated.ancestors = true; break; }
          seen.add(ancestor);
          inspectFiber(ancestor, entrance, depth, "host-linked");
          const alternate = read(ancestor, "alternate");
          if (isObject(alternate)) inspectFiber(alternate, entrance, depth, "alternate");
          ancestor = read(ancestor, "return"); depth++;
        }
      }
    } catch { coverage.iteratorErrors++; }
  }
  const finished = safeClock();
  const clockStatus = started === null || finished === null || finished < started || finished - started > 120000
    ? "invalid" as const : finished === started ? "below-resolution" as const : "valid" as const;
  const elapsedMs = clockStatus === "valid" ? finished! - started! : null;
  const available = configurationValid && coverage.hostFibers > 0;
  return freeze({ schemaVersion: R26_FIBER_OWNER_SCHEMA,
    contract: "taro-4.2.1-react-18.3.1-known-hook-fields-v1" as const,
    semantics: "known-strong-edges-not-whole-heap-not-retaining-root-or-leak-verdict" as const,
    capability: available ? "available" as const : "unavailable" as const,
    status: !configurationValid ? "invalid-configuration" as const : !available ? "entrance-unavailable" as const :
      matches.length ? "matched" as const : "no-match-in-covered-fields" as const,
    // A creation-time host link can point to either member of the pair. These
    // names distinguish the exact path, not the currently committed tree.
    currentCommit: "unresolved-host-linked-is-not-current" as const,
    policy, coverage, truncated, clock: { source: "Date.now" as const, kind: "wall-elapsed" as const,
      elapsedMs, status: clockStatus }, matches });
}
