import { describe, expect, it } from "vitest";
import { PocSpotTrustRepository } from "../modules/spots/poc-spot-trust-repository";
import { SpotTrustService } from "../modules/spots/spot-trust-service";

const source = {
  search: async () => ({ items: [{
    id: "osm-42", name: "开放候选", coordinate: { lat: 22.6, lon: 114.0, system: "WGS84" as const }, distanceMeters: 10_000,
    status: "provisional" as const, facilities: ["parking"], verificationAt: null, mapState: "insufficient" as const, imageUrl: null,
    source: { label: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/node/42", licenseId: "ODbL-1.0", fetchedAt: "2026-07-20T12:00:00Z" },
    factsBoundary: "未现场验证",
  }], nextCursor: null }),
};

describe("POC spot trust repository", () => {
  it("converts public POI discovery into approximate, blocked, source-bearing trust detail", async () => {
    const service = new SpotTrustService(new PocSpotTrustRepository(source));
    const detail = await service.getDetail("current", { userId: null, verified: false, roles: [], invitedSpotIds: [] });
    expect(detail).toMatchObject({ id: "osm-42", status: "caution", coordinate: { level: "approximate", exact: false } });
    expect(detail.actions.find((item) => item.action === "navigate")).toMatchObject({ allowed: false });
    expect(detail.facts.find((item) => item.key === "parking")?.sources[0]).toMatchObject({ sourceLabel: "OpenStreetMap contributors", version: "ODbL-1.0" });
    expect(detail.facts.find((item) => item.key === "field_verification")?.safetyConservative).toBe(true);
  });
});
