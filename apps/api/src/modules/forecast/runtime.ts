import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createForecastRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "forecast-and-astronomy",
    operation: "forecast.resolve",
    sideEffects: ["sqlite"],
    boundaries: ["weather", "astronomy"],
  }, options);
}
