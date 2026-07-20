import type { createNightReportRuntime } from "./runtime";

export type AwaitedNightReportRuntime = Awaited<ReturnType<typeof createNightReportRuntime>>;
