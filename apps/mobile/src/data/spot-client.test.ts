import { describe, expect, it, vi } from "vitest";
import { createSpotClient } from "./spot-client";

describe("spot client", () => {
  it("loads an actor-filtered trust detail", async () => {
    const body = { id: "osm-1", name: "候选", status: "caution", statusReason: "待核验", updatedAt: "2026-07-20T00:00:00Z", coordinate: { level: "approximate", coordinate: { lat: 22.5, lon: 114, system: "WGS84" }, exact: false, reason: "近似" }, facts: [], actions: [], trust: { verifiedSources: 0, conflicts: [], fieldVerificationRequired: true } };
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify(body), { status: 200 }));
    await expect(createSpotClient({ baseUrl: "http://127.0.0.1:4318", fetcher }).get("osm-1")).resolves.toMatchObject({ id: "osm-1", coordinate: { exact: false } });
    expect(String(fetcher.mock.calls[0][0])).toContain("/v1/spots/osm-1");
    await expect(createSpotClient({ baseUrl: "http://127.0.0.1:4318", fetcher }).get("osm-2")).rejects.toThrow("spot_response_identity_mismatch");
  });

  it("fails closed without an API endpoint", async () => {
    await expect(createSpotClient({ baseUrl: "" }).get("osm-1")).rejects.toThrow("spot_api_base_url_missing");
  });

  it("does not issue an implicit-current request when no identity is supplied", async () => {
    const fetcher = vi.fn();
    await expect(createSpotClient({ baseUrl: "http://127.0.0.1:4318", fetcher }).get("")).rejects.toThrow("spot_id_required");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
