import type { createCommunityRuntime } from "./runtime";

export type AwaitedCommunityRuntime = Awaited<ReturnType<typeof createCommunityRuntime>>;
