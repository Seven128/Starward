import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { OBSERVATION_FRAME_FORMAT, type SkyObservationFrame } from "@starward/miniapp-contracts";
import * as opticalContracts from "@starward/miniapp-contracts";
import { registerSkyArtworkPlane, skyArtworkUvAtDirection } from "./sky-artwork-registration";
import { skyArtworkRasterBounds } from "./sky-artwork-raster-bounds";
import { artworkIntersectsView } from "./sky-artwork-visibility";
import { skyOpticalPixelMagnification } from "./sky-optical-pixel-sampling";
import { skyTargetOpticalLevelForView } from "./sky-sdss-optical-selection";
import { skyTargetOpticalFieldRegistrations, type SkyTargetOpticalView } from "./sky-target-optical-visibility";
import { createSkyViewBasis, unprojectSkyPoint, type SkyVector } from "./sky-view-projection";

const at = "2026-10-03T13:00:00.000Z";
const observation: SkyObservationFrame = { at, format: OBSERVATION_FRAME_FORMAT,
  observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
const realGeometry = JSON.parse(readFileSync(new URL("./sky-prepared-optical-registration.fixture.json", import.meta.url), "utf8"));
// The actual existing center/field geometry with the measured v2 decoded grids.
// Selection does not admit a transport publication or certify photo quality.
const publication = { objectRef: "M:51", imageVersion: "prepared-optical-v2", center: realGeometry.center,
  orientation: "north-up/east-left", levels: Object.fromEntries(Object.entries(realGeometry.levels).map(([level, value]) => [level,
    { ...(value as object), pixels: level === "OVERVIEW" ? 512 : 1024, crpixFitsOneBased: level === "OVERVIEW" ? 256.5 : 512.5 }])) } as any;
const heading = (90 - publication.center.raDeg + 360) % 360;
const footprint = (fov: number, dpr = 1, azOffset = 0): SkyTargetOpticalView => ({
  at, report: { hourly: [{ at }], observationFrames: [observation] } as any,
  width: 390, height: 844, drawingWidth: 390 * dpr, drawingHeight: 844 * dpr,
  view: { basis: createSkyViewBasis(heading + azOffset, 90 + publication.center.decDeg, 0)!, verticalFovDeg: fov },
});

test("sampling uses the decoded grid and actual rounded backing store, not an angular M51 ratio", () => {
  const view = footprint(.2);
  const field = skyTargetOpticalFieldRegistrations(publication, view).OVERVIEW!;
  const base = skyOpticalPixelMagnification(field, 512, view)!;
  assert(base > 1 && Number.isFinite(base));
  const doubled = skyOpticalPixelMagnification(field, 512, footprint(.2, 2))!;
  assert(Math.abs(doubled / base - 2) < 1e-8);
  assert(Math.abs(skyOpticalPixelMagnification(field, 1024, view)! / base - .5) < 1e-8);
  const rounded = { ...view, drawingWidth: 1171, drawingHeight: 2533 };
  assert(skyOpticalPixelMagnification(field, 512, rounded)! > base * 3);
  assert.equal(skyTargetOpticalLevelForView(publication, view), "MEDIUM");
  assert.equal(skyTargetOpticalLevelForView(publication, footprint(.2, 3)), "DETAIL");
  assert.equal(skyTargetOpticalLevelForView(publication, footprint(1)), "OVERVIEW");
  assert.equal(skyTargetOpticalLevelForView(publication, footprint(.01)), "DETAIL",
    "the finite finest grid can remain magnified; selection does not fabricate detail");
});

test("analytic plane sampling agrees with independent native ray differences in a rolled offset wide view", () => {
  const half = Math.tan(.22 * Math.PI / 360);
  const field = registerSkyArtworkPlane(([[0, 0], [1, 0], [0, 1]] as const).map(uv => ({ uv,
    point: [-2 * half * (uv[0] - .5), 1, -2 * half * (uv[1] - .5)] as SkyVector })))!;
  const view: SkyTargetOpticalView = { width: 390, height: 844, drawingWidth: 1171, drawingHeight: 2533,
    report: undefined, at: undefined,
    view: { basis: createSkyViewBasis(25, 100, 35)!, verticalFovDeg: 90, center: { x: 160, y: 500 } } };
  const h = 1e-3, sx = view.drawingWidth! / view.width, sy = view.drawingHeight! / view.height;
  const uv = (x: number, y: number) => skyArtworkUvAtDirection(field,
    unprojectSkyPoint(x, y, view.view.basis, view.width, view.height, view.view.verticalFovDeg, view.view.center)!)!;
  const values: number[] = [];
  const box = skyArtworkRasterBounds(field, view.view, view.width, view.height, view.drawingWidth!, view.drawingHeight!);
  const left = box ? box.x / sx : 0, rightEdge = box ? (box.x + box.width) / sx : view.width;
  const top = box ? (view.drawingHeight! - box.y - box.height) / sy : 0;
  const bottom = box ? (view.drawingHeight! - box.y) / sy : view.height;
  for (const x of [left, (left + rightEdge) / 2, rightEdge]) for (const y of [top, (top + bottom) / 2, bottom]) {
    const right = uv(x + h / sx, y), left = uv(x - h / sx, y);
    const down = uv(x, y + h / sy), up = uv(x, y - h / sy);
    const a = 512 * (right[0] - left[0]) / (2 * h), b = 512 * (down[0] - up[0]) / (2 * h);
    const c = 512 * (right[1] - left[1]) / (2 * h), d = 512 * (down[1] - up[1]) / (2 * h);
    const trace = a * a + b * b + c * c + d * d, det = a * d - b * c;
    const largest = Math.sqrt((trace + Math.sqrt(Math.max(0, trace * trace - 4 * det * det))) / 2);
    values.push(largest / Math.abs(det));
  }
  const measured = skyOpticalPixelMagnification(field, 512, view)!;
  assert(Number.isFinite(measured));
  assert(Math.abs(measured / Math.max(...values) - 1) < 1e-5,
    "the actual stereographic/TAN map, including anisotropy, must replace a narrow-field angle approximation");
});

test("refinement requires the finer footprint to intersect; a coarse exterior stays available", () => {
  const view = footprint(.05, 1, .15);
  const fields = skyTargetOpticalFieldRegistrations(publication, view);
  assert(fields.OVERVIEW && fields.MEDIUM && fields.DETAIL);
  assert.equal(skyTargetOpticalLevelForView(publication, view), "OVERVIEW");
  assert.equal(skyTargetOpticalLevelForView(publication, footprint(.05, 1, 90)), null);
});

test("reverse selection has pixel headroom and unknown geometry does not retire an existing level", () => {
  const overview = skyTargetOpticalLevelForView(publication, footprint(.5));
  assert.equal(overview, "OVERVIEW");
  const medium = skyTargetOpticalLevelForView(publication, footprint(.2), overview);
  assert.equal(medium, "MEDIUM");
  // Derive the reverse boundary from this real source, not the historical .16°.
  let near = footprint(.5);
  for (let fov = .5; fov > .1; fov -= .002) {
    const candidate = footprint(fov), fields = skyTargetOpticalFieldRegistrations(publication, candidate);
    const demand = skyOpticalPixelMagnification(fields.OVERVIEW!, 512, candidate)!;
    if (demand > .88 && demand < .96) { near = candidate; break; }
  }
  assert.equal(skyTargetOpticalLevelForView(publication, near), "OVERVIEW");
  assert.equal(skyTargetOpticalLevelForView(publication, near, "MEDIUM"), "MEDIUM");
  assert.equal(skyTargetOpticalLevelForView(publication, near, "DETAIL"), "MEDIUM",
    "a reverse move across two levels can release the unnecessarily fine grid");
  assert.equal(skyTargetOpticalLevelForView(publication, footprint(1), "MEDIUM"), "OVERVIEW");
  const missing = { ...near, drawingWidth: undefined };
  assert.equal(skyTargetOpticalLevelForView(publication, missing), "OVERVIEW");
  assert.equal(skyTargetOpticalLevelForView(publication, missing, "MEDIUM"), "MEDIUM");
  assert.equal(skyTargetOpticalLevelForView(publication, { ...near, at: "2026-10-03T14:00:00.000Z" }, "MEDIUM"), "MEDIUM");
});

test("bounded angle-only and no-headroom mutations fail the escaped pixel-density and round-trip cases", () => {
  const text = readFileSync(new URL("./sky-sdss-optical-selection.ts", import.meta.url), "utf8");
  const evaluate = (source: string) => {
    const exports: any = {};
    const bindings: Record<string, unknown> = {
      "@starward/miniapp-contracts": opticalContracts,
      "./sky-artwork-visibility": { artworkIntersectsView },
      "./sky-optical-pixel-sampling": { skyOpticalPixelMagnification },
      "./sky-target-optical-visibility": { skyTargetOpticalFieldRegistrations },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require(name: string) { assert(name in bindings, name); return bindings[name]; } });
    return exports.skyTargetOpticalLevelForView;
  };
  const needle = '  if (!footprint) return previous ?? "OVERVIEW";';
  assert.equal(text.split(needle).length, 2);
  // This reproduces the old M51 angular-only .16/.065 policy at a valid center.
  const angular = evaluate(text.replace(needle, '  if (footprint) return footprint.view.verticalFovDeg > .16 ? "OVERVIEW" : footprint.view.verticalFovDeg > .065 ? "MEDIUM" : "DETAIL";\n' + needle));
  assert.equal(angular(publication, footprint(.2, 1)), angular(publication, footprint(.2, 3)));
  assert.notEqual(angular(publication, footprint(.2, 3)), skyTargetOpticalLevelForView(publication, footprint(.2, 3)));
  const noHeadroom = evaluate(text.replace("chosen.magnification! > .8", "chosen.magnification! > Number.POSITIVE_INFINITY"));
  assert.equal(noHeadroom(publication, footprint(.4), "MEDIUM"), "OVERVIEW");
  assert.equal(skyTargetOpticalLevelForView(publication, footprint(.4), "MEDIUM"), "MEDIUM");
});
