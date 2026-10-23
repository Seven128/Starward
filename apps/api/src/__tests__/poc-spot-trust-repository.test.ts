import { describe, expect, it, vi } from "vitest";
import { PocSpotTrustRepository } from "../modules/spots/poc-spot-trust-repository";
import { SpotTrustService } from "../modules/spots/spot-trust-service";

const source = {
  findById: vi.fn(async (id: string) => id !== "osm-42" ? null : ({
    id: "osm-42", name: "开放候选", coordinate: { lat: 40.12345, lon: 116.23456, system: "WGS84" as const },
    status: "provisional" as const, facilities: ["parking"], verificationAt: null, mapState: "insufficient" as const, imageUrl: null,
    source: { label: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/node/42", licenseId: "ODbL-1.0", fetchedAt: "2026-07-20T12:00:00Z" },
    factsBoundary: "未现场验证",
    })),
};

describe("POC spot trust repository", () => {
  it("converts public POI discovery into approximate, blocked, source-bearing trust detail", async () => {
    source.findById.mockClear();
    const service = new SpotTrustService(new PocSpotTrustRepository(source));
    const detail = await service.getDetail("osm-42", { userId: null, verified: false, roles: [], invitedSpotIds: [] });
    expect(detail).toMatchObject({ id: "osm-42", status: "caution", coordinate: { level: "approximate", exact: false } });
    expect(detail.actions.find((item) => item.action === "navigate")).toMatchObject({ allowed: false });
    expect(detail.facts.find((item) => item.key === "parking")?.sources[0]).toMatchObject({ sourceLabel: "OpenStreetMap contributors", version: "ODbL-1.0" });
    expect(detail.facts.find((item) => item.key === "field_verification")?.safetyConservative).toBe(true);
    expect(source.findById).toHaveBeenCalledExactlyOnceWith("osm-42");
    expect(detail.coordinate.coordinate).toEqual({ lat: 40.12, lon: 116.23, system: "WGS84" });
  });

  it("does not resolve current or a missing id to another candidate", async () => {
    const service = new SpotTrustService(new PocSpotTrustRepository(source));
    const actor = { userId: null, verified: false, roles: [], invitedSpotIds: [] };
    await expect(service.getDetail("current", actor)).rejects.toThrow("spot_not_found");
    await expect(service.getDetail("osm-999", actor)).rejects.toThrow("spot_not_found");
  });
});
