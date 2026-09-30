import assert from "node:assert/strict";
import test from "node:test";
import { createSkyPanoramaMask, skyPanoramaAlpha, skyLandscapeMaskCoversRayHull } from "./sky-landscape-mask";
import { paintedSkyPointVisible, pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking";
import { createSkyViewBasis, skyHorizontalDirection } from "./sky-view-projection";
import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";

function fixture(alpha: Uint8Array, width = 8, height = 8) {
  return createSkyPanoramaMask({ projection: { seamAzimuthDeg: 0 } } as SkyLandscapeManifestData,
    { image: { width, height } } as SkyLandscapeResource, alpha);
}

test("panorama LINEAR alpha wraps the real first/last texels and keeps partial transparency", () => {
  const alpha = new Uint8Array(64).fill(0); for (let y = 0; y < 8; y++) alpha[y * 8 + 7] = 255;
  const mask = fixture(alpha);
  assert.equal(skyPanoramaAlpha(mask, skyHorizontalDirection(0, 0)!), 127.5);
  assert.equal(skyPanoramaAlpha(mask, skyHorizontalDirection(22.5, 0)!), 0);
  assert.equal(skyPanoramaAlpha(mask, skyHorizontalDirection(337.5, 0)!), 255);
});

test("all opaque corner samples cannot erase an interior sky hole or its image source", () => {
  const alpha = new Uint8Array(64).fill(255); alpha[2 * 8 + 4] = 0;
  const mask = fixture(alpha);
  const hull = [skyHorizontalDirection(157.5, 10)!, skyHorizontalDirection(247.5, 10)!,
    skyHorizontalDirection(247.5, 60)!, skyHorizontalDirection(157.5, 60)!];
  assert.equal(skyPanoramaAlpha(mask, skyHorizontalDirection(202.5, 33.75)!), 0, "actual open interior texel");
  assert.ok(hull.every(ray => skyPanoramaAlpha(mask, ray) === 255));
  assert.equal(skyLandscapeMaskCoversRayHull(mask, hull), false);
  assert.equal(skyLandscapeMaskCoversRayHull(fixture(new Uint8Array(64).fill(255)), hull), true);
});

test("completed image mask replaces old tree geometry for labels, point picks and off/failure", () => {
  const basis = createSkyViewBasis(324.462322, 100, 0)!;
  const snapshot: SkyPickSnapshot = { frameAt: "t", catalogVersion: "v", catalogHash: "h", width: 390, height: 844,
    view: { basis, verticalFovDeg: 5, landscape: fixture(new Uint8Array(64)) },
    objects: [{ reference: "HR:1", displayName: "test", kind: "STAR", magnitude: 1, x: 195, y: 422 }] };
  const tap = { frameAt: "t", catalogVersion: "v", catalogHash: "h", x: 195, y: 422 };
  assert.equal(paintedSkyPointVisible(snapshot, 195, 422), true, "transparent photograph must not inherit the old tree");
  assert.equal(pickPaintedSkyObjects(snapshot, tap).length, 1);
  snapshot.view!.landscape = fixture(new Uint8Array(64).fill(255));
  assert.equal(paintedSkyPointVisible(snapshot, 195, 422), false);
  assert.equal(pickPaintedSkyObjects(snapshot, tap).length, 0);
  snapshot.view!.landscape = null;
  assert.equal(pickPaintedSkyObjects(snapshot, tap).length, 1);
});
