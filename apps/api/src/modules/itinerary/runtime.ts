import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";
export function createItineraryRuntime(options: DurableBusinessRuntimeOptions) { return createDurableBusinessRuntime({ outcome: "itinerary-and-collaboration", operation: "itinerary.create", sideEffects: ["sqlite"], boundaries: [] }, options); }
