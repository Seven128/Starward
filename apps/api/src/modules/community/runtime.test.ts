import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCommunityRuntime } from "./runtime";

describe("community runtime", () => {
  it("persists sanitized media workflow and an object-store receipt idempotently", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-community-runtime-"));
    const invocations: string[] = [];
    try {
      const runtime = await createCommunityRuntime({ dataDir, boundary: { async invoke(request) { invocations.push(request.kind); return { status: "quarantined", kind: request.kind }; } } });
      const request = { outcome: "community-contribution", actorId: "user-1", operation: "community.media-contribute", idempotencyKey: "media-1", payload: { token: "media-1", removedMetadata: ["gps", "deviceSerial"] } } as const;
      const first = await runtime.execute(request);
      const artifact = first.sideEffects.find((effect) => effect.kind === "object-store");
      const artifactPath = artifact && "path" in artifact ? String(artifact.path) : "";
      expect(first.status).toBe("succeeded");
      expect(await readFile(join(dataDir, artifactPath), "utf8")).toContain("media-1");
      expect((await runtime.execute(request)).status).toBe("replayed");
      expect(invocations).toEqual(["object-store"]);
      await runtime.close();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
