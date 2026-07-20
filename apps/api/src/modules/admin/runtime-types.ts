import type { createAdminRuntime } from "./runtime";

export type AwaitedAdminRuntime = Awaited<ReturnType<typeof createAdminRuntime>>;
