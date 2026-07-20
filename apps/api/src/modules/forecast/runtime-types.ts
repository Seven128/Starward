import type { createForecastRuntime } from "./runtime";

export type AwaitedForecastRuntime = Awaited<ReturnType<typeof createForecastRuntime>>;
