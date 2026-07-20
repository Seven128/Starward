import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createIdentityRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({ outcome: "identity-profile-privacy", operation: "profile.update", sideEffects: ["sqlite"], boundaries: [] }, options);
}
