import type { createMapRouteRuntime } from "./runtime";

export type AwaitedMapRouteRuntime = Awaited<ReturnType<typeof createMapRouteRuntime>>;
