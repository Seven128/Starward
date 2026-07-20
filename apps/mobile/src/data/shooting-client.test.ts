import { describe, expect, it, vi } from "vitest";
import { createShootingClient } from "./shooting-client";
const result = { deterministic: true, settings: {}, risks: [], alternatives: [], confidence: 0.8, missingConditions: [], ruleVersion: "rules", provenance: { conditionsCapturedAt: "2026-01-01T00:00:00Z", sourceVersions: [] } };
describe("shooting client", () => {
  it("validates deterministic preview responses", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ schemaVersion: "starward-shooting-preview-v1", phone: { result }, camera: { result } }), { status: 200 }));
    await expect(createShootingClient({ baseUrl: "http://api", fetcher }).get({ latitude: 1 })).resolves.toMatchObject({ schemaVersion: "starward-shooting-preview-v1" });
    expect(String(fetcher.mock.calls[0][0])).toContain("/v1/shooting-plans?");
  });
});
