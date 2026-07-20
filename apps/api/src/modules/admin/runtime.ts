import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createAdminRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "admin-data-operations",
    operation: "admin.job-replay",
    sideEffects: ["sqlite", "audit"],
    boundaries: [],
  }, options);
}
