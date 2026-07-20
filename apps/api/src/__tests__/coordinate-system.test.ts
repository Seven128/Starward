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
});
