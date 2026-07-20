import type { createQualityRuntime } from "./runtime";

export type AwaitedQualityRuntime = Awaited<ReturnType<typeof createQualityRuntime>>;
