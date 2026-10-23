import { describe, expect, it, vi } from "vitest";
import { createShootingClient } from "./shooting-client";
const result = { deterministic: true, settings: {}, risks: [], alternatives: [], confidence: 0.8, missingConditions: [], ruleVersion: "rules", provenance: { conditionsCapturedAt: "2026-01-01T00:00:00Z", sourceVersions: [] } };
const query = { latitude: 1, longitude: 2, scheduledAt: "2026-10-24T18:45:12.000Z", nightDate: "2026-10-24", timezone: "Asia/Shanghai", locationId: "spot-b", target: "milky-way-core", focalLengthMm: 24, acceptsStacking: true };
const input = { scheduledAt: query.scheduledAt, timezone: query.timezone, locationId: query.locationId, target: "milky-way" };
describe("shooting client", () => {
  it("validates deterministic preview responses", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ schemaVersion: "starward-shooting-preview-v1", context: query, phone: { result, input }, camera: { result, input } }), { status: 200 }));
    await expect(createShootingClient({ baseUrl: "http://api", fetcher }).get(query)).resolves.toMatchObject({ schemaVersion: "starward-shooting-preview-v1" });
    expect(String(fetcher.mock.calls[0][0])).toContain("/v1/shooting-plans?");
  });
  it("rejects a rounded service result instead of showing it as the selected exact time", async () => {
    const fetcher = async () => new Response(JSON.stringify({ schemaVersion: "starward-shooting-preview-v1", context: { ...query, scheduledAt: "2026-10-24T19:00:00.000Z" }, phone: { result, input }, camera: { result, input } }));
    await expect(createShootingClient({ baseUrl: "http://api", fetcher }).get(query)).rejects.toThrow("shooting_response_context_mismatch");
  });
});
