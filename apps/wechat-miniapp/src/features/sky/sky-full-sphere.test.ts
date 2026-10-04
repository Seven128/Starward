import assert from "node:assert/strict";
import test from "node:test";
import { drawSkyScene } from "./sky-scene-render";
import { resolveSkySceneFrame, type ResolvedSkyReport, type ResolvedStellarScene } from "./sky-stellar-scene";
import { createSkyViewBasis, projectSkyDirection } from "./sky-view-projection";
import { pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking";
import type { SkyRenderSurface } from "./sky-render-surface";
import { skyLandscapeViewOpacity } from "./sky-landscape-visibility";
import { skyLandscapeMaskWithOpacity, skyLandscapeMaskCoversRayHull, skyLandscapeMaskOccludes,
  createSkyPanoramaMask } from "./sky-landscape-mask";
import { selectSkyLandscapeImageResources } from "./sky-landscape-resources";
import { unprojectSkyPoint, skyHorizontalDirection } from "./sky-view-projection";
import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";
import type { SaoIndexPublication, SaoTilePublication } from "@starward/miniapp-contracts";
import { resolveSkyStellarSupplement, currentStellarSupplement } from "./sky-stellar-supplement-scene";

const at = "2026-10-02T13:00:00.000Z";
const identity = { format: "bsc5p-stellar-geometry-v1", referenceAt: "2000-01-01T12:00:00.000Z",
  catalogVersion: "full-sphere-fixture", catalogHash: "a".repeat(64) };
const observer = { latitude: 0, longitude: 0, elevationM: 0 };
const scene = { format: "stellar-scene-v2", state: "AVAILABLE", observer,
  catalog: { ...identity, magnitudeLimit: 5, entries: [
    { sourceId: "HR:1", objectRef: "HR:1", displayName: "Below", magnitude: 1, colorIndex: null },
  ] },
  publication: { ...identity, rows: [["HR:1", "Below", 1, null, 0, Math.SQRT1_2, -Math.SQRT1_2, 0, 0, 0]] },
  frames: [{ at, state: "AVAILABLE", geometry: { ...identity, at, observer,
    julianYears: (Date.parse(at) - Date.parse(identity.referenceAt)) / (365.25 * 86400000),
    equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] } }],
} as unknown as ResolvedStellarScene;
const report = { hourly: [{ at, sunAzimuthDeg: 270, sunAltitudeDeg: -24 }],
  skyScene: scene, targetFrames: [] } as unknown as ResolvedSkyReport;

function render(altitude: number) {
  const basis = createSkyViewBasis(0, 90 + altitude, 0)!;
  let snapshot: SkyPickSnapshot | null = null;
  const discs: unknown[][] = [], lines: unknown[][] = [], landscape: unknown[][] = [];
  const surface = new Proxy({}, { get: (_target, key) => (...args: unknown[]) => {
    if (key === "disc") discs.push(args);
    if (key === "segments") lines.push(args);
    if (key === "landscape") landscape.push(args);
    return true;
  } }) as SkyRenderSurface;
  const args = Array(35).fill(undefined);
  args.splice(0, 7, surface, report, at, null, null, 390, 844);
  args[7] = "NIGHT"; args[8] = (value: SkyPickSnapshot | null) => { snapshot = value; };
  args[10] = 270; args[12] = basis; args[34] = { enabled: true };
  (drawSkyScene as (...args: any[]) => void)(...args);
  assert(snapshot);
  return { snapshot: snapshot as SkyPickSnapshot, discs, lines, landscape,
    point: projectSkyDirection(0, -45, basis, 390, 844, 270)! };
}

test("the exact catalog frame retains a below-horizon star for full-sphere browsing", () => {
  const frame = resolveSkySceneFrame(scene, at)!;
  assert.equal(frame.points?.length, 1);
  assert.equal(frame.points![0]![2], -45);
  assert.equal(resolveSkySceneFrame(scene, at), frame, "gestures reuse the exact time transform");
});

test("the shared SAO tile transform retains the lower hemisphere and exact time identity", () => {
  // Geometry fixture exercises the admitted tile transform, not publication admission.
  const publication = { publicationHash: "b".repeat(64), index: { baseCatalogVersion: identity.catalogVersion,
    baseAssetSha256: identity.catalogHash, catalogHash: "c".repeat(64), catalogVersion: "sao-fixture" } } as unknown as SaoIndexPublication;
  const tile = { publicationHash: publication.publicationHash, tile: { catalogHash: publication.index.catalogHash,
    rows: [["SAO:1", 6.5, 0, Math.SQRT1_2, -Math.SQRT1_2, 0, 0, 0]] } } as unknown as SaoTilePublication;
  const frame = resolveSkyStellarSupplement(publication, [tile], scene, at)!;
  assert.deepEqual(frame.points, [["SAO:1", 6.5, 0, -45]]);
  assert.equal(currentStellarSupplement(frame, scene, at), frame);
  assert.equal(currentStellarSupplement(frame, scene, "2026-10-02T14:00:00.000Z"), null);
});

test("below-horizon star is drawn and pickable after ground fades, then hidden on return", () => {
  for (const altitude of [-45, 30, -45]) {
    const result = render(altitude);
    assert.equal(result.discs.length, 1, "real catalog star is submitted even behind the foreground");
    assert.equal(result.lines.length, 0, "ordinary defaults submit no auxiliary circles");
    const choices = pickPaintedSkyObjects(result.snapshot, { ...result.point, frameAt: at,
      catalogVersion: result.snapshot.catalogVersion, catalogHash: result.snapshot.catalogHash });
    assert.equal(choices.some(object => object.reference === "HR:1"), altitude < 0);
  }
});

test("landscape pass and completed mask share the same continuous viewport-center fade", () => {
  const result = render(0);
  assert.equal(result.landscape.length, 1);
  const opacity = (result.snapshot.view!.landscape as { opacity?: number }).opacity;
  assert.equal(opacity, .5);
  assert.equal(result.landscape[0]![4], opacity);
});

test("fade follows the actual offset and rolled viewport centre and preserves physical alpha", () => {
  const view = { basis: createSkyViewBasis(20, 100, 35)!, verticalFovDeg: 85,
    center: { x: 180, y: 497 } };
  const ray = unprojectSkyPoint(195, 422, view.basis, 390, 844, 85, view.center)!;
  const altitude = Math.asin(ray[2]) * 180 / Math.PI;
  const centered = { basis: createSkyViewBasis(0, 90 + altitude, 0)!, verticalFovDeg: 45 };
  assert(Math.abs(skyLandscapeViewOpacity(view, 390, 844) - skyLandscapeViewOpacity(centered, 390, 844)) < 1e-12);
  assert.notEqual(skyLandscapeViewOpacity(view, 390, 844), skyLandscapeViewOpacity(
    { basis: view.basis, verticalFovDeg: view.verticalFovDeg }, 390, 844));
  const publication = { projection: { seamAzimuthDeg: 0 } } as SkyLandscapeManifestData;
  const resource = { id: "overview", image: { width: 8, height: 8 } } as SkyLandscapeResource;
  const mask = createSkyPanoramaMask(publication, resource, new Uint8Array(64).fill(255));
  const behind = skyHorizontalDirection(0, -45)!;
  assert(skyLandscapeMaskOccludes(mask, behind));
  assert(skyLandscapeMaskCoversRayHull(mask, [behind]));
  const partial = skyLandscapeMaskWithOpacity(mask, .5);
  assert.equal(skyLandscapeMaskOccludes(partial, behind), false);
  assert.equal(skyLandscapeMaskCoversRayHull(partial, [behind]), false);
  assert.equal((partial as typeof mask).alpha, mask.alpha, "camera adaptation cannot mutate source coverage");
  const footprint = { view: { basis: createSkyViewBasis(0, 45, 0)!, verticalFovDeg: 45 }, width: 390, height: 844 };
  assert.deepEqual(selectSkyLandscapeImageResources([resource], new Map([[resource.id, mask]]), footprint), []);
  assert.deepEqual(selectSkyLandscapeImageResources([resource], new Map([[resource.id, mask]]), null), [resource]);
});
