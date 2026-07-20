import type { createNotificationToolsRuntime } from "./runtime";

export type AwaitedNotificationToolsRuntime = Awaited<ReturnType<typeof createNotificationToolsRuntime>>;
