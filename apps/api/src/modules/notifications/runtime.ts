import { createDurableBusinessRuntime, type DurableBusinessRuntimeOptions } from "../../../../../packages/contracts/src/runtime/durable-business-runtime";

export function createNotificationToolsRuntime(options: DurableBusinessRuntimeOptions) {
  return createDurableBusinessRuntime({
    outcome: "notifications-and-toolbox",
    operation: "notification.rule-create",
    sideEffects: ["sqlite", "queue", "channel"],
    boundaries: ["notification-channel"],
  }, options);
}
