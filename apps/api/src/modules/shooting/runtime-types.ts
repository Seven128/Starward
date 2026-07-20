import type { createShootingRuntime } from "./runtime";

export type AwaitedShootingRuntime = Awaited<ReturnType<typeof createShootingRuntime>>;
