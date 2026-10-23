import { describe, expect, it } from "vitest";
import { SpotTrustService, discloseSpotCoordinate, type SpotFact, type SpotRecord } from "../modules/spots/spot-trust-service";

const spot: SpotRecord = {
  id: "spot-secret", ownerId: "owner-1", name: "受邀地点", coordinate: { lat: 22.529123, lon: 113.946812, system: "WGS84" },
  visibility: "invite_only", status: "open", statusReason: null, updatedAt: "2026-08-12T10:00:00Z",
};
const anonymous = { userId: null, verified: false, roles: [], invitedSpotIds: [] };

describe("spot coordinate visibility", () => {
  it("uses the same approximate disclosure for every uninvited exit and never serializes the exact point", async () => {
    const service = new SpotTrustService({ load: async () => ({ spot, facts: [] }) }, () => new Date("2026-08-12T12:00:00Z"));
    const detail = await service.getDetail(spot.id, anonymous);
    expect(detail.coordinate).toMatchObject({ level: "approximate", exact: false, coordinate: { lat: 22.53, lon: 113.95 } });
    expect(detail.actions.filter((item) => item.action !== "share").every((item) => !item.allowed && item.coordinateLevel === "approximate")).toBe(true);
    expect(JSON.stringify(detail)).not.toContain("22.529123");
    expect(JSON.stringify(detail)).not.toContain("113.946812");
  });

  it("reveals exact coordinates only after the invite policy succeeds", () => {
    const disclosure = discloseSpotCoordinate(spot, { ...anonymous, userId: "guest-1", invitedSpotIds: [spot.id] });
    expect(disclosure).toMatchObject({ level: "exact", exact: true, coordinate: spot.coordinate });
  });

  it("does not disclose a private record or hidden coordinate to an unrelated reader", async () => {
    for (const visibility of ["private", "hidden"] as const) {
      const privateSpot = { ...spot, visibility };
      const service = new SpotTrustService({ load: async () => ({ spot: privateSpot, facts: [] }) });
      await expect(service.getDetail(spot.id, anonymous)).rejects.toThrow("spot_not_found");
      expect(discloseSpotCoordinate(privateSpot, anonymous)).toMatchObject({ level: "hidden", coordinate: null, exact: false });
    }
  });

  it("permits the private owner and authorized admin, and preserves verified-only coordinate policy", async () => {
    const service = new SpotTrustService({ load: async () => ({ spot: { ...spot, visibility: "private" }, facts: [] }) });
    await expect(service.getDetail(spot.id, { ...anonymous, userId: spot.ownerId })).resolves.toMatchObject({ id: spot.id, coordinate: { exact: true, coordinate: spot.coordinate } });
    await expect(service.getDetail(spot.id, { ...anonymous, userId: "admin", roles: ["spot-admin"] })).resolves.toMatchObject({ coordinate: { exact: true } });
    expect(discloseSpotCoordinate({ ...spot, visibility: "verified_only" }, anonymous)).toMatchObject({ level: "approximate", exact: false });
    expect(discloseSpotCoordinate({ ...spot, visibility: "verified_only" }, { ...anonymous, verified: true })).toMatchObject({ level: "exact", exact: true });
  });

  it("rejects a repository result with another identity", async () => {
    const service = new SpotTrustService({ load: async () => ({ spot, facts: [] }) });
    await expect(service.getDetail("spot-b", anonymous)).rejects.toThrow("spot_source_identity_mismatch");
  });
});

describe("spot fact trust", () => {
  it("keeps unknown separate from false and blocks on unresolved safety conflict", async () => {
    const facts: SpotFact[] = [
      { id: "f1", key: "parking.open", value: true, state: "known", sourceType: "admin-verified", sourceLabel: "现场核验", observedAt: "2026-08-01T00:00:00Z", expiresAt: null, version: "v1", safetyRelevant: true },
      { id: "f2", key: "parking.open", value: false, state: "temporary-unavailable", sourceType: "verified-contribution", sourceLabel: "雨后实况", observedAt: "2026-08-12T11:00:00Z", expiresAt: "2026-08-13T00:00:00Z", version: "v2", safetyRelevant: true },
      { id: "f3", key: "toilet.open", value: null, state: "unknown", sourceType: "admin-verified", sourceLabel: "待确认", observedAt: "2026-08-01T00:00:00Z", expiresAt: null, version: "v1", safetyRelevant: false },
    ];
    const service = new SpotTrustService({ load: async () => ({ spot: { ...spot, visibility: "public_exact" }, facts }) }, () => new Date("2026-08-12T12:00:00Z"));
    const detail = await service.getDetail(spot.id, anonymous);
    expect(detail.facts.find((fact) => fact.key === "parking.open")).toMatchObject({ state: "conflict", value: false, safetyConservative: true });
    expect(detail.facts.find((fact) => fact.key === "toilet.open")).toMatchObject({ state: "unknown", value: null });
    expect(detail.actions.find((item) => item.action === "navigate")).toMatchObject({ allowed: false, reason: "存在未解决的安全冲突" });
  });

  it("never lets a high score or user acknowledgement reopen a closed spot", async () => {
    const service = new SpotTrustService({ load: async () => ({ spot: { ...spot, visibility: "public_exact", status: "closed", statusReason: "官方封路" }, facts: [] }) });
    const detail = await service.getDetail(spot.id, anonymous);
    expect(detail.actions.find((item) => item.action === "navigate")).toMatchObject({ allowed: false, reason: "官方封路" });
  });
});
