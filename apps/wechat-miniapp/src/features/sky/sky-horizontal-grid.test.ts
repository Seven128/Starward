import assert from "node:assert/strict";
import test from "node:test";
import { skyHorizontalGrid } from "./sky-horizontal-grid";
import { createSkyViewBasis, projectSkyDirection } from "./sky-view-projection";
import { drawSkyScene } from "./sky-scene-render";
import type { SkyRenderSurface, SkyLineSegment } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";

const width = 390, height = 844;

function crossesCenter(lines: readonly SkyLineSegment[]) {
  return lines.some(([x1, y1, x2, y2]) => {
    const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (lengthSquared === 0) return false;
    const t = Math.max(0, Math.min(1, ((width / 2 - x1) * (x2 - x1) + (height / 2 - y1) * (y2 - y1)) / lengthSquared));
    return Math.hypot(x1 + t * (x2 - x1) - width / 2, y1 + t * (y2 - y1) - height / 2) < 0.5;
  });
}

test("alt-az grid joins each real horizon bearing to zenith in the full dome", () => {
  const basis = createSkyViewBasis(0, 180, 0)!;
  const grid = skyHorizontalGrid(basis, width, height, 267.8);
  assert.equal(grid.horizon.length, 180);
  assert.equal(grid.altitude.length, 360);
  assert.equal(grid.meridians.length, 540);
  for (let index = 0; index < 12; index++) {
    const bearing = index * 30;
    const horizon = projectSkyDirection(bearing, 0, basis, width, height, 267.8)!;
    const zenith = projectSkyDirection(bearing, 90, basis, width, height, 267.8)!;
    const first = grid.meridians[index * 45]!;
    const last = grid.meridians[index * 45 + 44]!;
    assert.ok(Math.hypot(first[0] - horizon.x, first[1] - horizon.y) < 1e-7);
    assert.ok(Math.hypot(last[2] - zenith.x, last[3] - zenith.y) < 1e-7);
  }
});

test("offscreen one-degree samples still render the correct grid crossing at minimum zoom", () => {
  const meridian = skyHorizontalGrid(createSkyViewBasis(0, 135.5, 0)!, width, height, 0.25);
  const altitude = skyHorizontalGrid(createSkyViewBasis(45.5, 120, 0)!, width, height, 0.25);
  assert.ok(crossesCenter(meridian.meridians), "north meridian crosses the view halfway between sampled altitudes");
  assert.ok(crossesCenter(altitude.altitude), "30° parallel crosses halfway between sampled bearings");
  for (const line of [...meridian.meridians, ...altitude.altitude]) {
    assert.ok(line.every(Number.isFinite));
    assert.ok(line[0] >= 0 && line[0] <= width && line[2] >= 0 && line[2] <= width);
    assert.ok(line[1] >= 0 && line[1] <= height && line[3] >= 0 && line[3] <= height);
  }
});

test("scene sends the same geographic grid through ordinary and warm-red palettes", () => {
  const at = "2026-09-23T00:00:00.000Z";
  const report = {hourly:[{at}],skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport;
  const basis = createSkyViewBasis(0, 180, 0)!;
  const calls: {lines: readonly SkyLineSegment[]; color: string; opacity: number}[] = [];
  const surface = new Proxy({}, {get: (_target, key) => key === "segments"
    ? (lines: readonly SkyLineSegment[], color: string, opacity = 1) => calls.push({lines, color, opacity})
    : () => true}) as SkyRenderSurface;
  for (const [mode, colors] of [["NIGHT", ["#536782", "#29374B", "#29374B"]],
    ["OBSERVATION", ["#7A1E18", "#240000", "#240000"]]] as const) {
    calls.length = 0;
    drawSkyScene(surface, report, at, null, null, width, height, mode, undefined, undefined, 267.8, null, basis);
    assert.deepEqual(calls.map(call => call.color), colors);
    assert.deepEqual(calls.map(call => call.lines.length), [180, 360, 540]);
    assert.equal(calls[2]!.opacity, 0.65);
  }
});
