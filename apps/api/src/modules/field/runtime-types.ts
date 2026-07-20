import type { createFieldRuntime } from "@starward/domain/offline/runtime";

export type AwaitedFieldRuntime = Awaited<ReturnType<typeof createFieldRuntime>>;
