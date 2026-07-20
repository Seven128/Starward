import { describe, expect, it, vi } from "vitest";
import { createSkyClient } from "./sky-client";

const query = { latitude: 22.529, longitude: 113.9468, elevationM: 0, timezone: "Asia/Shanghai", at: "2026-08-12T16:40:00.000Z", target: "milky-way-core" as const };
const response = {
  schemaVersion: "starward-sky-context-v1", state: "partial", generatedAt: query.at,
  algorithm: { name: "Astronomy Engine", version: "v1", coordinateSystem: "WGS84", refraction: "normal" },
  context: query, catalog: { loadedChunk: "bright", deferredChunks: ["deep"], magnitudeLimit: 4 },
  objects: [], selectedTarget: null, trajectory: [], bestTargetTime: null, horizon: null, warnings: [],
};

describe("sky client", () => {
  it("requests the versioned live sky endpoint and validates the envelope", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json" } }));
    await expect(createSkyClient({ baseUrl: "http://api.test/", fetcher }).get(query)).resolves.toMatchObject({ schemaVersion: "starward-sky-context-v1" });
    expect(fetcher.mock.calls[0][0]).toContain("/v1/sky?");
  });

  it("rejects invalid response shapes and missing configuration", async () => {
    await expect(createSkyClient({ baseUrl: "http://api.test", fetcher: async () => new Response("{}", { status: 200 }) }).get(query)).rejects.toThrow("sky_response_invalid");
    await expect(createSkyClient({ baseUrl: "", fetcher: vi.fn() }).get(query)).rejects.toThrow("sky_api_base_url_missing");
  });
});
