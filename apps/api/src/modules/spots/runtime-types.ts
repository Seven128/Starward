import type { createSpotTrustRuntime } from "./runtime";

export type AwaitedSpotTrustRuntime = Awaited<ReturnType<typeof createSpotTrustRuntime>>;
