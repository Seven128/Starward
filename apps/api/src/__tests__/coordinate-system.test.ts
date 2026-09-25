import { describe, expect, it } from "vitest";
import { createMapCoordinateView, gcj02ToWgs84, wgs84ToGcj02 } from "../../../../packages/coordinate-system/src/index";

describe("WGS84 / GCJ-02 boundary", () => {
  it("converts Shenzhen for display and keeps authoritative astronomy coordinates unchanged", () => {
    const result = createMapCoordinateView({ authoritative: { lat: 22.529, lon: 113.9468, system: "WGS84" } });
    expect(result.display.system).toBe("GCJ-02");
    expect(result.display.lat).not.toBe(22.529);
    expect(result.astronomyInput).toEqual({ lat: 22.529, lon: 113.9468, system: "WGS84" });
    expect(result.roundTripErrorMeters).toBeLessThan(0.2);
    expect(result.displayOnly).toBe(true);
  });

  it("does not apply the mainland transform outside its declared region", () => {
    const source = { lat: 35.6812, lon: 139.7671, system: "WGS84" as const };
    const display = wgs84ToGcj02(source);
    expect(display).toEqual({ ...source, system: "GCJ-02" });
    expect(gcj02ToWgs84(display)).toEqual(source);
  });

  it("keeps a WeChat selected Islamabad point stable despite the old rectangular overlap", () => {
    const source = { lat: 33.6833, lon: 73.05, system: "WGS84" as const };
    const display = wgs84ToGcj02(source);
    expect(display).toEqual({ ...source, system: "GCJ-02" });
    expect(gcj02ToWgs84({ ...source, system: "GCJ-02" })).toEqual(source);
  });

  it("separates nearby unaffected locations from mainland display points", () => {
    for (const [lat, lon] of [[27.7172, 85.324], [22.3, 114.2], [25.03, 121.56], [37.5665, 126.978]]) {
      const point = { lat, lon, system: "WGS84" as const };
      expect(wgs84ToGcj02(point)).toEqual({ ...point, system: "GCJ-02" });
      expect(gcj02ToWgs84({ ...point, system: "GCJ-02" })).toEqual(point);
    }
    for (const [lat, lon] of [[29.65, 91.1], [19.5, 109.8], [45.8, 126.5]]) {
      const point = { lat, lon, system: "WGS84" as const };
      const display = wgs84ToGcj02(point);
      expect(display.lat).not.toBe(lat);
      expect(createMapCoordinateView({ authoritative: point }).roundTripErrorMeters).toBeLessThan(0.2);
    }
  });

  it("never publishes a shifted display point whose inverse is lost at the footprint edge", () => {
    const point = { lat: 47.291317096637314, lon: 134.3485125158005, system: "WGS84" as const };
    expect(createMapCoordinateView({ authoritative: point }).roundTripErrorMeters).toBeLessThan(0.2);
  });
});
