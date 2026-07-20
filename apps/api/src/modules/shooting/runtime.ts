import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createShootingRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "shooting-assistant",
    operation: "shooting.plan",
    sideEffects: ["sqlite"],
    boundaries: ["weather", "astronomy"],
  }, options);
}
