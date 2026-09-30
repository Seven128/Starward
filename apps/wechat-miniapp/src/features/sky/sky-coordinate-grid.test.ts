import assert from "node:assert/strict";
import test from "node:test";
import { drawSkyScene } from "./sky-scene-render";
import { createSkyViewBasis } from "./sky-view-projection";
import type { SkyRenderSurface, SkyLineSegment } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import { OBSERVATION_FRAME_FORMAT, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { skyEquatorialGrid } from "./sky-equatorial-grid";
import { createSkyGridTracer } from "./sky-grid-projection";
import { skyHorizontalDirection } from "./sky-view-projection";

const at = "2026-09-28T16:00:00.000Z";
const report = { hourly: [{ at }], skyScene: { state: "UNAVAILABLE", frames: [] }, targetFrames: [] } as unknown as ResolvedSkyReport;

function render(grids: { horizontal: boolean; equatorial: boolean }, data = report, mode = "NIGHT", selectedAt = at) {
  const strokes: { lines: readonly SkyLineSegment[]; color: string }[] = [];
  const surface = new Proxy({}, { get: (_, key) => key === "segments"
    ? (lines: readonly SkyLineSegment[], color: string) => strokes.push({ lines, color }) : () => true }) as SkyRenderSurface;
  const args: unknown[] = [surface, data, selectedAt, null, null, 390, 844, mode,
    undefined, undefined, 267.8, null, createSkyViewBasis(0, 180, 0)!];
  args.length = 35; // Existing landscape argument remains at index 34.
  args.push(grids);
  (drawSkyScene as unknown as (...args: unknown[]) => void)(...args);
  return strokes;
}

test("turning both coordinate grids off removes their strokes while retaining the geometric horizon", () => {
  const off = render({ horizontal: false, equatorial: false });
  assert.equal(off.length, 1);
  assert.equal(off[0]!.lines.length, 180);
  assert.deepEqual(render({ horizontal: true, equatorial: false }).map(stroke => stroke.lines.length), [180, 360, 540]);
});

test("an unavailable exact observation frame never displays an old equatorial grid", () => {
  assert.equal(render({ horizontal: false, equatorial: true }).length, 1);
});

function observerFrame(latitude: number, siderealDegrees: number, instant = at): SkyObservationFrame {
  const phi = latitude * Math.PI / 180, theta = siderealDegrees * Math.PI / 180;
  return { format: OBSERVATION_FRAME_FORMAT, at: instant, observer: { latitude, longitude: 0, elevationM: 0 },
    equatorialToEnu: [-Math.sin(theta), Math.cos(theta), 0,
      -Math.sin(phi) * Math.cos(theta), -Math.sin(phi) * Math.sin(theta), Math.cos(phi),
      Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), Math.sin(phi)] };
}

function distance(lines: readonly SkyLineSegment[], x: number, y: number) {
  return Math.min(...lines.map(([ax, ay, bx, by]) => {
    const dx = bx - ax, dy = by - ay, square = dx * dx + dy * dy;
    const fraction = square ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / square)) : 0;
    return Math.hypot(ax + fraction * dx - x, ay + fraction * dy - y);
  }));
}

test("equatorial curves cross analytically known directions even between base samples at 0.05°", () => {
  const frame = observerFrame(45, 0);
  // RA=0 is due south at upper transit; declination 0/30 have altitude 45/75.
  for (const [altitude, layer] of [[45, "equator"], [75, "parallels"]] as const) {
    const grid = skyEquatorialGrid(frame, createSkyViewBasis(180, 90 + altitude, 0)!, 390, 844, 0.05);
    assert.ok(distance(grid[layer], 195, 422) < 0.5);
  }
  // RA=30° and dec=0 have a known non-sampled point on the same meridian.
  const ra = 30 * Math.PI / 180, dec = 20.5 * Math.PI / 180, q = Math.SQRT1_2;
  const east = Math.cos(dec) * Math.sin(ra), north = q * (Math.sin(dec) - Math.cos(dec) * Math.cos(ra));
  const up = q * (Math.sin(dec) + Math.cos(dec) * Math.cos(ra));
  const basis = createSkyViewBasis(Math.atan2(east, north) * 180 / Math.PI, 90 + Math.asin(up) * 180 / Math.PI, 0)!;
  assert.ok(distance(skyEquatorialGrid(frame, basis, 390, 844, 0.05).meridians, 195, 422) < 0.5);
});

test("polar full-dome curves remain in the visible hemisphere and the actual protected viewport", () => {
  const center = { x: 194, y: 450 };
  const basis = createSkyViewBasis(27, 180, 0)!;
  for (const latitude of [90, -90]) {
    const grid = skyEquatorialGrid(observerFrame(latitude, 0), basis, 390, 844, 267.8, center);
    for (const lines of [grid.equator, grid.parallels, grid.meridians]) {
      assert.ok(lines.length > 0);
      assert.ok(lines.every(line => line.every(Number.isFinite)));
      assert.ok(lines.every(([ax, ay, bx, by]) => ax >= 0 && bx >= 0 && ax <= 390 && bx <= 390 && ay >= 0 && by >= 0 && ay <= 844 && by <= 844));
    }
    // Exactly half the declination parallels are above either pole's horizon.
    assert.equal(grid.parallels.length, 360);
    assert.ok(distance(grid.meridians, center.x, center.y) < 0.01);
  }
});

test("a declination arc grazing the horizon stays visible even when both base samples are below it", () => {
  for (const sidereal of [0.2, 0.5, 0.8]) {
    const grid = skyEquatorialGrid(observerFrame(29.9999, sidereal), createSkyViewBasis(180, 90.0001, 0)!, 390, 844, 0.05);
    assert.ok(distance(grid.parallels, 195, 422) < 0.5, `visible -60° parallel at sidereal ${sidereal}°`);
  }
});

test("adjacent grid segments evaluate each shared endpoint once and release it between traces", () => {
  const calls = new Map<number, number>();
  let offset = 0;
  const trace = createSkyGridTracer(createSkyViewBasis(0, 180, 0)!, 390, 844, 267.8, undefined, (azimuth, altitude) => {
    calls.set(azimuth, (calls.get(azimuth) ?? 0) + 1);
    return skyHorizontalDirection(azimuth + offset, altitude);
  });
  const first = trace(4, index => [index, 0]);
  assert.equal(first.length, 4, "the complete visible horizon must still be drawn");
  for (let endpoint = 0; endpoint <= 4; endpoint++) assert.equal(calls.get(endpoint), 1, `endpoint ${endpoint}`);
  // A new trace must use its current direction owner, not a retained old frame.
  calls.clear(); offset = 90;
  const next = trace(4, index => [index, 0]);
  assert.equal(next.length, 4);
  assert.notDeepEqual(next, first);
  for (let endpoint = 0; endpoint <= 4; endpoint++) assert.equal(calls.get(endpoint), 1, `fresh endpoint ${endpoint}`);
});

test("scene uses each exact-time equatorial frame in ordinary and red modes without depending on stars", () => {
  const later = "2026-09-28T17:00:00.000Z";
  const data = { ...report, hourly: [{ at }, { at: later }], observationFrames: [observerFrame(45, 0), observerFrame(45, 15, later)] } as unknown as ResolvedSkyReport;
  const first = render({ horizontal: false, equatorial: true }, data);
  const next = render({ horizontal: false, equatorial: true }, data, "NIGHT", later);
  const red = render({ horizontal: false, equatorial: true }, data, "OBSERVATION");
  assert.equal(first.length, 4);
  assert.ok(first.slice(1).every(stroke => stroke.lines.length > 0));
  assert.notDeepEqual(first.slice(1).map(stroke => stroke.lines), next.slice(1).map(stroke => stroke.lines));
  assert.deepEqual(first.map(stroke => stroke.lines), red.map(stroke => stroke.lines));
  assert.deepEqual(red.slice(1).map(stroke => stroke.color), ["#6B211B", "#6B211B", "#6B211B"]);
  assert.equal(render({ horizontal: false, equatorial: true }, data, "NIGHT", "2026-09-28T18:00:00.000Z").length, 1);
  const mirrored = { ...data, observationFrames: data.observationFrames!.map(frame => ({ ...frame, equatorialToEnu: [-1, 0, 0, 0, 1, 0, 0, 0, 1] })) } as unknown as ResolvedSkyReport;
  assert.equal(render({ horizontal: false, equatorial: true }, mirrored).length, 1);
});
