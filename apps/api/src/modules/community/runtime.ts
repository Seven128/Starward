import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createCommunityRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "community-contribution",
    operation: "community.media-contribute",
    sideEffects: ["sqlite", "object-store"],
    boundaries: ["object-store"],
  }, options);
}
