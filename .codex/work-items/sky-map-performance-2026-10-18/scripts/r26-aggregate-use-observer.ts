// TASK ONLY. Match the existing first-eight aggregate IDs at real product
// boundaries. No product object, frame, callback or history is retained here.
export const R26_AGGREGATE_USES = ["request", "paint", "accepted"] as const;
export const R26_AGGREGATE_SLOTS = ["lifecycle-latest", "draw-preparation", "accepted-command"] as const;
type Use = typeof R26_AGGREGATE_USES[number];
type Slot = typeof R26_AGGREGATE_SLOTS[number];
type Match = { state: "empty" | "selected" | "unselected" | "unknown"; id: number | null };
type SlotState = { slot: Slot; state: Match["state"] | "unobserved"; aggregateId: number | null;
  updates: number; selectedUpdates: number; clears: number };
const SAMPLE_LIMIT = 8, MAX = 1e12;
const freshUses = () => ({ request: 0, paint: 0, accepted: 0 });
const freshSamples = () => Array.from({ length: SAMPLE_LIMIT }, (_, index) => ({ id: index + 1, ...freshUses() }));
const freshSlots = (): SlotState[] => R26_AGGREGATE_SLOTS.map(slot => ({ slot, state: "unobserved", aggregateId: null,
  updates: 0, selectedUpdates: 0, clears: 0 }));
const freeze = <T>(value: T): T => { if (value && typeof value === "object") {
  for (const child of Object.values(value)) freeze(child); Object.freeze(value);
} return value; };

export function createR26AggregateUseObserver(options: { aggregateId: (value: object) => number | null }) {
  // This lookup must close over only the existing weak identity map, not a
  // product frame or an array of samples. Only its scalar result is retained.
  const aggregateId = options.aggregateId;
  let active = false, tracking = false, samples = freshSamples(), slots = freshSlots();
  const freshDiagnostics = () => ({ useCalls: freshUses(), slotCalls: 0, emptyUses: 0, unselectedUses: 0,
    unknownUses: 0, invalidCalls: 0, invalidValues: 0, lookupErrors: 0, invalidIds: 0, overflow: false });
  let diagnostics = freshDiagnostics();
  const add = (value: number) => { if (value >= MAX) { diagnostics.overflow = true; return MAX; } return value + 1; };
  function match(value: unknown): Match {
    if (value === null || value === undefined) return { state: "empty", id: null };
    if (typeof value !== "object" && typeof value !== "function") {
      diagnostics.invalidValues = add(diagnostics.invalidValues); return { state: "unknown", id: null };
    }
    let id: number | null;
    try { id = aggregateId(value); }
    catch { diagnostics.lookupErrors = add(diagnostics.lookupErrors); return { state: "unknown", id: null }; }
    if (id === null) return { state: "unselected", id: null };
    if (!Number.isSafeInteger(id) || id < 1 || id > SAMPLE_LIMIT) {
      diagnostics.invalidIds = add(diagnostics.invalidIds); return { state: "unknown", id: null };
    }
    return { state: "selected", id };
  }
  return {
    start() {
      if (active) return false;
      active = tracking = true; samples = freshSamples(); slots = freshSlots(); diagnostics = freshDiagnostics(); return true;
    },
    // Pause stops workload attribution. Exact owner slot writes/clears still
    // occur during drain and retirement, so those remain observable until end.
    stopTracking() { tracking = false; },
    release() { active = tracking = false; },
    use(kind: Use, value: unknown) {
      if (!active || !tracking) return;
      if (!R26_AGGREGATE_USES.includes(kind)) { diagnostics.invalidCalls = add(diagnostics.invalidCalls); return; }
      diagnostics.useCalls[kind] = add(diagnostics.useCalls[kind]);
      const found = match(value);
      if (found.state === "selected") {
        const sample = samples[found.id! - 1]!; sample[kind] = add(sample[kind]);
      } else if (found.state === "empty") diagnostics.emptyUses = add(diagnostics.emptyUses);
      else if (found.state === "unselected") diagnostics.unselectedUses = add(diagnostics.unselectedUses);
      else diagnostics.unknownUses = add(diagnostics.unknownUses);
    },
    slot(slot: Slot, value: unknown) {
      if (!active) return;
      const index = R26_AGGREGATE_SLOTS.indexOf(slot);
      if (index < 0) { diagnostics.invalidCalls = add(diagnostics.invalidCalls); return; }
      diagnostics.slotCalls = add(diagnostics.slotCalls);
      const found = match(value), current = slots[index]!;
      current.state = found.state; current.aggregateId = found.id; current.updates = add(current.updates);
      if (found.state === "selected") current.selectedUpdates = add(current.selectedUpdates);
      if (found.state === "empty") current.clears = add(current.clears);
    },
    snapshot() {
      return freeze({ schemaVersion: "starward-r26-aggregate-use-v1" as const,
        semantics: "reserved-sample-id-usage-and-observed-owner-slots-not-liveness-not-retaining-roots" as const,
        active, tracking, policy: { samples: SAMPLE_LIMIT, slots: 3 },
        diagnostics: { ...diagnostics, useCalls: { ...diagnostics.useCalls } },
        // These are eight reserved IDs, not a claim all eight objects exist.
        // Join with the same run's actual owner sample list before interpreting.
        samples: samples.map(sample => ({ ...sample })), slots: slots.map(slot => ({ ...slot })) });
    },
  };
}
