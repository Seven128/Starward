// TASK ONLY. Reuses the existing weak IDs and checkpoint transport. These are
// the two public package entrypoints verified against the installed renderer.
import { eventSource } from "@tarojs/runtime";
import { internalInstanceKey } from "@tarojs/react";
import { createR26AggregateUseObserver } from "./r26-aggregate-use-observer";
import { inspectR26FiberOwners } from "./r26-fiber-owner-observer";

export function createR26MemoryOwnerLinks(aggregateId: (value: object) => number | null) {
  const uses = createR26AggregateUseObserver({ aggregateId });
  let active = false, activeScanned = false, drainScanned = false;
  let framework: { phase: "active-5" | "drain-10"; checkpointClockElapsedMs: number | null; lookupFailed: boolean;
    observation: ReturnType<typeof inspectR26FiberOwners> } | null = null;
  return {
    start() { active = true; activeScanned = drainScanned = false; framework = null; uses.start(); },
    stopTracking() { uses.stopTracking(); },
    release() { active = false; uses.release(); },
    use: uses.use,
    slot: uses.slot,
    snapshot(phase: string, checkpointClockElapsedMs: number | null) {
      if (active && (phase === "active-5" && !activeScanned || phase === "drain-10" && !drainScanned)) {
        if (phase === "active-5") activeScanned = true; else drainScanned = true;
        let lookupFailed = false;
        const nodes: object[] = [];
        try {
          // Only the two declared Sky canvases; do not enumerate unrelated
          // application or framework objects through the global registry.
          for (const id of ["spot-night-sky-scene", "spot-night-sky-scene-selection"]) {
            const node = eventSource.get(id);
            if (node && typeof node === "object") nodes.push(node);
          }
        } catch { lookupFailed = true; }
        framework = { phase: phase as "active-5" | "drain-10", checkpointClockElapsedMs, lookupFailed,
          observation: inspectR26FiberOwners({ nodes, fiberKey: internalInstanceKey, aggregateId }) };
      }
      return { schemaVersion: "starward-r26-owner-links-v1" as const, uses: uses.snapshot(), framework };
    },
  };
}
