import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createQualityRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "quality-release-observability",
    operation: "quality.restore-drill",
    sideEffects: ["sqlite", "artifact"],
    boundaries: ["telemetry"],
  }, options);
}
