import type { createItineraryRuntime } from "./runtime";
export type AwaitedItineraryRuntime = Awaited<ReturnType<typeof createItineraryRuntime>>;
