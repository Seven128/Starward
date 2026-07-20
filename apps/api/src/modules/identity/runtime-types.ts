import type { createIdentityRuntime } from "./runtime";
export type AwaitedIdentityRuntime = Awaited<ReturnType<typeof createIdentityRuntime>>;
