import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createNightReportRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "tonight-decision",
    operation: "night-report.create",
    sideEffects: ["sqlite"],
    boundaries: ["weather", "astronomy", "spot-search"],
  }, options);
}
