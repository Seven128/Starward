import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createQualityRuntime } from "./runtime";

describe("quality runtime", () => {
  it("persists restore evidence as sqlite state and a hashed artifact", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-quality-runtime-"));
    const invocations: string[] = [];
    try {
      const runtime = await createQualityRuntime({ dataDir, boundary: { async invoke(request) { invocations.push(request.kind); return { status: "recorded", kind: request.kind }; } } });
      const request = { outcome: "quality-release-observability", actorId: "operator-1", operation: "quality.restore-drill", idempotencyKey: "restore-1", payload: { token: "restore-1", rpoMinutes: 9, rtoMinutes: 41 } } as const;
      const first = await runtime.execute(request);
      const artifact = first.sideEffects.find((effect) => effect.kind === "artifact");
      const artifactPath = artifact && "path" in artifact ? String(artifact.path) : "";
      expect(first.sideEffects.map((effect) => effect.kind)).toEqual(["sqlite", "artifact"]);
      expect(await readFile(join(dataDir, artifactPath), "utf8")).toContain("restore-1");
      expect((await runtime.execute(request)).status).toBe("replayed");
      expect(invocations).toEqual(["telemetry"]);
      await runtime.close();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
