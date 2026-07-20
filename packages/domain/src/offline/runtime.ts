import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../contracts/src/runtime/durable-business-runtime";

export function createFieldRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "field-offline-safety",
    operation: "field.pack-and-report",
    sideEffects: ["sqlite", "filesystem"],
    boundaries: [],
  }, options);
}
