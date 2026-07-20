import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createNotificationToolsRuntime } from "./runtime";

describe("notification tools runtime", () => {
  it("persists one queued channel delivery and replays it idempotently", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-notification-runtime-"));
    const invocations: string[] = [];
    try {
      const runtime = await createNotificationToolsRuntime({ dataDir, boundary: { async invoke(request) { invocations.push(request.kind); return { status: "accepted", kind: request.kind }; } } });
      const request = { outcome: "notifications-and-toolbox", actorId: "user-1", operation: "notification.rule-create", idempotencyKey: "rule-1", payload: { token: "rule-1", grid: "cn-44" } } as const;
      const first = await runtime.execute(request);
      expect(first.sideEffects.map((effect) => effect.kind)).toEqual(["sqlite", "queue", "channel"]);
      expect((await runtime.execute(request)).status).toBe("replayed");
      expect(invocations).toEqual(["notification-channel"]);
      await runtime.close();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
