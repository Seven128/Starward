import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAdminRuntime } from "./runtime";

describe("admin runtime", () => {
  it("persists job replay and audit receipts without duplicate writes", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-admin-runtime-"));
    try {
      const runtime = await createAdminRuntime({ dataDir });
      const request = { outcome: "admin-data-operations", actorId: "admin-1", operation: "admin.job-replay", idempotencyKey: "job-1", payload: { token: "job-1", correlationId: "corr-1" } } as const;
      const first = await runtime.execute(request);
      expect(first.sideEffects.map((effect) => effect.kind)).toEqual(["sqlite", "audit"]);
      expect((await runtime.execute(request)).status).toBe("replayed");
      await runtime.close();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
