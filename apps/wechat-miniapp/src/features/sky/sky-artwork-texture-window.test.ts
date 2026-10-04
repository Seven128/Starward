import assert from "node:assert/strict";
import test from "node:test";
import { registerSkyArtwork, skyArtworkUvAtDirection } from "./sky-artwork-registration";
import { skyArtworkTextureWindow } from "./sky-artwork-texture-window";
import { createSkyViewBasis, unprojectSkyPoint, type SkyVector, type SkyViewBasis } from "./sky-view-projection";

const width = 390, height = 844, camera = createSkyViewBasis(65, 110, 0)!;
function plane(basis = camera) {
  const ray = (x: number, y: number): SkyVector => {
    const vector = basis.forward.map((value, i) => value + x * basis.right[i]! + y * basis.up[i]!);
    return vector.map(value => value / Math.hypot(...vector)) as unknown as SkyVector;
  };
  return registerSkyArtwork([{ uv: [0, 0], direction: ray(-1.2, .9) },
    { uv: [1, 0], direction: ray(1.2, .9) }, { uv: [1, 1], direction: ray(1.2, -.9) }])!;
}

test("registered original-pixel window encloses curved, rolled and offset samples with filter neighbours", () => {
  const roll = .61;
  const rolled: SkyViewBasis = { forward: camera.forward,
    right: camera.right.map((value, i) => value * Math.cos(roll) + camera.up[i]! * Math.sin(roll)) as unknown as SkyVector,
    up: camera.up.map((value, i) => value * Math.cos(roll) - camera.right[i]! * Math.sin(roll)) as unknown as SkyVector };
  const registration = plane();
  for (const view of [{ basis: camera, verticalFovDeg: 25 },
    { basis: rolled, verticalFovDeg: 45, center: { x: 119, y: 309 } }]) {
    const window = skyArtworkTextureWindow(registration, view, width, height, 512, 512)!;
    assert(window && window.width * window.height < 512 * 512, "a useful original-pixel crop, not a no-op");
    for (let y = 0; y <= height; y += height / 48) for (let x = 0; x <= width; x += width / 24) {
      const direction = unprojectSkyPoint(x, y, view.basis, width, height, view.verticalFovDeg, view.center)!;
      const uv = skyArtworkUvAtDirection(registration, direction)!;
      if (uv.some(value => value < 0 || value > 1)) continue;
      for (const [value, origin, extent] of [[uv[0], window.x, window.width], [uv[1], window.y, window.height]]) {
        const pixel = Math.max(0, Math.min(511, value! * 512 - .5));
        assert(Math.floor(pixel) >= origin! && Math.ceil(pixel) < origin! + extent!, "retain both LINEAR source neighbours");
      }
    }
  }
});

test("wide, opposite-plane and numerically uncertain views retain the complete source", () => {
  const registration = plane();
  assert.equal(skyArtworkTextureWindow(registration, { basis: camera, verticalFovDeg: 274.9 }, width, height, 512, 512), undefined);
  const opposite: SkyViewBasis = { forward: camera.forward.map(value => -value) as unknown as SkyVector,
    right: camera.right.map(value => -value) as unknown as SkyVector, up: camera.up };
  assert.equal(skyArtworkTextureWindow(registration, { basis: opposite, verticalFovDeg: 25 }, width, height, 512, 512), undefined);
  const cancelling = { ...registration, rows: [[1, 0, 1e-8], [-1, 1, 0], [0, -1, 0]] as const };
  assert.equal(skyArtworkTextureWindow(cancelling, { basis: camera, verticalFovDeg: 25 }, width, height, 512, 512), undefined);
  assert.equal(skyArtworkTextureWindow(registration, { basis: camera, verticalFovDeg: 25 }, width, height, NaN, 512), undefined);
});
