import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createMapRouteRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "map-route-discovery",
    operation: "route.plan",
    sideEffects: ["sqlite", "native-invocation"],
    boundaries: ["route", "native-map"],
  }, options);
}
