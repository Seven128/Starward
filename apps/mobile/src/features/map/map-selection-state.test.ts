import { describe, expect, it } from "vitest";
import type { MapSpotPage, MapSpotSummary } from "@starward/contracts/map";
import { initialMapSelection, refreshMapSelection, selectMapSpot, selectRouteMode, type MapSelectionRefresh } from "./map-selection-state";

const original: MapSpotSummary = {
  id: "selected", name: "已选地点", coordinate: { lat: 31, lon: 121, system: "WGS84" }, distanceMeters: 1000,
  status: "verified", mapState: "recommended", facilities: [], verificationAt: null, imageUrl: null,
  source: { label: "本机测试", url: "https://example.invalid", licenseId: "test", fetchedAt: "2026-10-24T01:00:00Z" }, factsBoundary: "合成事实",
};
const updated: MapSpotSummary = { ...original, name: "当前事实", coordinate: { lat: 32, lon: 122, system: "WGS84" }, source: { ...original.source, fetchedAt: "2026-10-24T02:00:00Z" } };
const page: MapSpotPage = { items: [updated], nextCursor: null, context: { center: { lat: 30, lon: 120, system: "WGS84" }, radiusMeters: 100_000, limit: 20 }, generatedAt: "2026-10-24T03:00:00Z", status: "fresh" };

describe("Map selection refresh admission", () => {
  const state = selectMapSpot(initialMapSelection, original);
  const refresh: MapSelectionRefresh = { page, center: { lat: 30, lon: 120 }, selectedSpot: original, selectionGeneration: state.selectionGeneration };

  it("fences later choices including same-id replacement and ABA, while preserving independent route intent", () => {
    const aba = selectMapSpot(selectMapSpot(state, { ...original, id: "other" }), original);
    for (const later of [aba, selectMapSpot(state, { ...original, name: "后来的显式选择" }), selectMapSpot(state, { ...original, id: "other" })]) {
      expect(refreshMapSelection(later, refresh)).toBe(later);
    }
    expect(refreshMapSelection(selectRouteMode(state, "cycle"), refresh)).toMatchObject({ selectedSpot: updated, routeMode: "cycle" });
  });

  it("requires current range, usable Map coordinate and non-regressing supplied provenance", () => {
    const invalidItems = [
      { ...updated, source: { ...updated.source, fetchedAt: "2026-10-23T01:00:00Z" } },
      { ...updated, coordinate: { ...updated.coordinate, lat: Number.NaN } },
      { ...updated, source: { ...updated.source, fetchedAt: "unknown" } },
      // A detail coordinate disclosure is not the Map endpoint's WGS84 fact.
      { ...updated, coordinate: { level: "approximate", coordinate: updated.coordinate, exact: false } } as unknown as MapSpotSummary,
    ];
    for (const candidate of invalidItems) expect(refreshMapSelection(state, { ...refresh, page: { ...page, items: [candidate] } })).toBe(state);
    expect(refreshMapSelection(state, { ...refresh, center: { lat: 35, lon: 125 } })).toBe(state);
  });
});
