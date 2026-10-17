import assert from "node:assert/strict";
import test from "node:test";
import { gcj02ToWgs84, gcj02ToWgs84RasterBranches, wgs84ToGcj02, wgs84ToGcj02RasterBranches,
  distanceMeters } from "@starward/coordinate-system";

test("raster branch selection preserves the canonical GCJ inverse at mainland and identity locations", () => {
  for (const [lat, lon, expected] of [[22.6, 114.1, "SHIFTED"], [22.3, 114.1, "IDENTITY"], [35.6, 139.7, "IDENTITY"]] as const) {
    const input = { lat, lon, system: "GCJ-02" as const }, branches = gcj02ToWgs84RasterBranches(input);
    assert.equal(branches.selected, expected);
    assert.deepEqual(gcj02ToWgs84(input), branches.selected === "SHIFTED" ? branches.shifted : branches.identity);
    const normal = wgs84ToGcj02({ lat, lon, system: "WGS84" });
    const forward = wgs84ToGcj02RasterBranches({ lat, lon, system: "WGS84" });
    assert.deepEqual(normal, expected === "SHIFTED" ? forward.shifted : forward.identity);
  }
});

test("the shifted raster geometry stays continuous across the canonical footprint discontinuity", () => {
  let prior: ReturnType<typeof gcj02ToWgs84RasterBranches> | undefined;
  const branches = new Set<string>();
  for (let step = 0; step <= 1000; step++) {
    const current = gcj02ToWgs84RasterBranches({ lat: 22.49 + step * .0001, lon: 114.1, system: "GCJ-02" });
    branches.add(current.selected);
    if (prior) assert.ok(distanceMeters(prior.shifted, current.shifted) < 20);
    prior = current;
  }
  assert.equal(branches.size, 2, "the regression must actually cross the footprint edge");
});
