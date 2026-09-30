import assert from "node:assert/strict";
import test from "node:test";
import { registerSkyArtwork, type SkyArtworkAnchor } from "./sky-artwork-registration";
import { skyArtworkRasterBounds } from "./sky-artwork-raster-bounds";
import { createSkyViewBasis, projectSkyDirectionUnclipped, type SkyVector } from "./sky-view-projection";

const unit = (vector: SkyVector) => vector.map(value => value / Math.hypot(...vector)) as unknown as SkyVector;
const anchors: SkyArtworkAnchor[] = [
  { uv: [0, 0], direction: unit([-.4, .8, .3]) },
  { uv: [1, 0], direction: unit([.5, .8, .4]) },
  { uv: [0, 1], direction: unit([-.2, .4, .8]) },
];
const registration = registerSkyArtwork(anchors)!;

test("raster bound contains source interiors and curved edges under roll, offset and rounded DPR", () => {
  let bounded = 0, visible = 0;
  for (const roll of [-65, 0, 70]) for (const fov of [25, 85, 139, 267.8]) {
    const view = { basis: createSkyViewBasis(15, 125, roll)!, verticalFovDeg: fov, center: { x: 137, y: 351 } };
    const width = 390.4, height = 844, bufferWidth = 1171, bufferHeight = 2532;
    const box = skyArtworkRasterBounds(registration, view, width, height, bufferWidth, bufferHeight);
    if (box) bounded++;
    // Directions follow the original unit anchors' affine UV plane, not a
    // camera billboard or a four-corner screen rectangle.
    for (let iu = 0; iu <= 24; iu++) for (let iv = 0; iv <= 24; iv++) {
      const u = iu / 24, v = iv / 24;
      const ray = unit([0, 1, 2].map(axis => (1-u-v)*anchors[0]!.direction[axis]! +
        u*anchors[1]!.direction[axis]! + v*anchors[2]!.direction[axis]!) as unknown as SkyVector);
      const az = Math.atan2(ray[0], ray[1]) * 180 / Math.PI;
      const alt = Math.asin(ray[2]) * 180 / Math.PI;
      const pixel = projectSkyDirectionUnclipped(az, alt, view.basis, width, height, fov, view.center);
      if (!pixel || pixel.x < 0 || pixel.y < 0 || pixel.x >= width || pixel.y >= height) continue;
      visible++;
      if (!box) continue;
      const x = pixel.x * bufferWidth / width, y = bufferHeight - pixel.y * bufferHeight / height;
      assert.ok(x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height,
        `source clipped at ${u},${v},${roll},${fov}`);
    }
  }
  assert(bounded > 0); assert(visible > 1000);
});

test("antipode, wide and ill-conditioned uncertainty retain full raster; invalid sizes opt out", () => {
  const opposite = registration.bounds.center.map(value => -value) as unknown as SkyVector;
  const az = Math.atan2(opposite[0], opposite[1]) * 180 / Math.PI;
  const alt = Math.asin(opposite[2]) * 180 / Math.PI;
  const view = { basis: createSkyViewBasis(az, 90 + alt, 0)!, verticalFovDeg: 85 };
  assert.equal(skyArtworkRasterBounds(registration, view, 390, 844, 1170, 2532), null);
  assert.equal(skyArtworkRasterBounds({ ...registration, determinant: 1e-14 }, view, 390, 844, 1170, 2532), null);
  assert.equal(skyArtworkRasterBounds({ ...registration, bounds: { ...registration.bounds, radius: Math.PI } }, view, 390, 844, 1170, 2532), null);
  assert.equal(skyArtworkRasterBounds(registration, view, 390, 844, 0, 2532), null);
  assert.equal(skyArtworkRasterBounds(registration, view, 390, 844, 1170.5, 2532), null);
});

test("actual framebuffer dimensions bound the box and a useful source does not default to fullscreen", () => {
  const ray = registration.bounds.center;
  const view = { basis: createSkyViewBasis(Math.atan2(ray[0], ray[1])*180/Math.PI,
    90 + Math.asin(ray[2])*180/Math.PI, 30)!, verticalFovDeg: 139 };
  const box = skyArtworkRasterBounds(registration, view, 390, 844, 780, 1688)!;
  assert(box); assert(box.width * box.height < 780 * 1688 / 2);
  assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= 780 && box.y + box.height <= 1688);
});
