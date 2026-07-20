import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createSpotTrustRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "spot-detail-and-trust",
    operation: "spot.detail",
    sideEffects: ["sqlite"],
    boundaries: ["spot-source"],
  }, options);
}
