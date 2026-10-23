// TASK ONLY. One fixed query site, original weak aggregate IDs and the existing
// two observation phases. The normal Query/cache/scheduling owners stay intact.
import { miniappQueryClient } from "../../services/query-client";
import { createR27QueryCallbackObserver } from "./r27-query-callback-observer";

function readQueryOwner(query: object, wrapper: Function | undefined) {
  const hash = Object.getOwnPropertyDescriptor(query, "queryHash");
  const options = Object.getOwnPropertyDescriptor(query, "options");
  const fn = options && "value" in options && options.value && typeof options.value === "object"
    ? Object.getOwnPropertyDescriptor(options.value, "queryFn") : undefined;
  return {
    inCache: hash && "value" in hash && typeof hash.value === "string"
      ? miniappQueryClient.getQueryCache().get(hash.value) === query : null,
    currentOptionMatches: wrapper && fn && "value" in fn && typeof fn.value === "function"
      ? fn.value === wrapper : null,
  };
}

export function createR27QueryCallbackLinks(aggregateId: (value: object) => number | null) {
  const observer = createR27QueryCallbackObserver({ aggregateId, readQueryOwner });
  let active = false, activeObserved = false, drainObserved = false;
  let observation: { phase: "active-5" | "drain-10"; checkpointClockElapsedMs: number | null;
    value: ReturnType<typeof observer.snapshot> } | null = null;
  return {
    start() { active = true; activeObserved = drainObserved = false; observation = null; observer.start(); },
    stopTracking: observer.stopTracking,
    release() { active = false; observer.release(); },
    beginRender: observer.beginRender,
    finishRender: observer.finishRender,
    pageCallback: observer.pageCallback,
    queryWrapper: observer.queryWrapper,
    aggregate: observer.aggregate,
    queryOwner(pageFn: Function, client: unknown, queryKey: readonly unknown[]) {
      if (!observer.observesPageCallback(pageFn)) return;
      // Do not enumerate unrelated queries or retain a private key. Only the
      // actual provider's fixed global client can certify this owner relation.
      let query: object | undefined;
      try {
        if (client === miniappQueryClient) {
          // useResourceQuery passes no per-call hash override. Use the same
          // provider defaults as useQuery, then read only that exact cache slot.
          const { queryHash } = miniappQueryClient.defaultQueryOptions({ queryKey });
          query = miniappQueryClient.getQueryCache().get(queryHash);
        }
      } catch { /* A failed diagnostic lookup stays an unknown owner. */ }
      observer.queryOwner(pageFn, query);
    },
    snapshot(phase: string, checkpointClockElapsedMs: number | null) {
      if (active && (phase === "active-5" && !activeObserved || phase === "drain-10" && !drainObserved)) {
        if (phase === "active-5") activeObserved = true; else drainObserved = true;
        observation = { phase: phase as "active-5" | "drain-10", checkpointClockElapsedMs, value: observer.snapshot() };
      }
      return { schemaVersion: "starward-r27-query-callback-links-v1" as const, observation };
    },
  };
}
