import assert from "node:assert/strict";
import test from "node:test";
import { skyGalacticImageWindow } from "./sky-galactic-image-window";
import { galacticEquirectUv } from "./sky-galactic-band";
import { skyArtworkViewBounds } from "./sky-artwork-visibility";
import { createSkyViewBasis, unprojectSkyPoint, type SkyViewBasis } from "./sky-view-projection";

const width = 390, height = 844, imageWidth = 2048, imageHeight = 1024;
const band = { pole: [0, 0, 1] as const, center: [1, 0, 0] as const, strength: 1 };
function camera(longitude: number, roll: number): SkyViewBasis {
  const right = [Math.sin(longitude), -Math.cos(longitude), 0], up = [0, 0, 1];
  return { forward: [Math.cos(longitude), Math.sin(longitude), 0],
    right: right.map((n, i) => n * Math.cos(roll) + up[i]! * Math.sin(roll)) as unknown as SkyViewBasis["right"],
    up: up.map((n, i) => n * Math.cos(roll) - right[i]! * Math.sin(roll)) as unknown as SkyViewBasis["up"] };
}

test("filter neighbours across a seam just outside the viewport retain the opposite source edge", () => {
  const roll = Math.atan(height / width);
  const radius = skyArtworkViewBounds({ basis: camera(0, roll), verticalFovDeg: 85 }, width, height)!.radius;
  const longitude = Math.PI - radius - 2 * Math.PI * .5 / imageWidth;
  const view = { basis: camera(longitude, roll), verticalFovDeg: 85 };
  const ray = unprojectSkyPoint(0, 0, view.basis, width, height, 85)!;
  const [u] = galacticEquirectUv(ray, band.pole, band.center);
  assert(Math.abs(u * imageWidth - .5) < 1e-6, "the viewport itself stops half a source texel short of the seam");
  const filteredU = ((u - 1.2 / imageWidth) % 1 + 1) % 1;
  assert(filteredU * imageWidth > imageWidth - 2, "the existing filter samples the opposite edge");
  const window = skyGalacticImageWindow(view, width, height, band, imageWidth, imageHeight);
  assert.equal(window.x, 0); assert.equal(window.width, imageWidth);
});

test("a finite local view encloses original LINEAR/filter samples while pole and dome keep longitude", () => {
  const view = { basis: camera(0, .4), verticalFovDeg: 45, center: { x: 137, y: 351 } };
  const window = skyGalacticImageWindow(view, width, height, band, imageWidth, imageHeight);
  assert(window.width * window.height < imageWidth * imageHeight, "preserve a useful original-pixel crop");
  for (const [x, y] of [[0, 0], [width, 0], [0, height], [width, height], [width / 2, height / 2]]) {
    const ray = unprojectSkyPoint(x!, y!, view.basis, width, height, view.verticalFovDeg, view.center)!;
    const uv = galacticEquirectUv(ray, band.pole, band.center);
    for (const du of [-1.2, 1.2]) for (const dv of [-1.2, 1.2]) {
      const sourceX = (((uv[0] + du / imageWidth) % 1 + 1) % 1) * imageWidth;
      const sourceY = Math.max(0, Math.min(1, uv[1] + dv / imageHeight)) * imageHeight;
      assert(sourceX - .5 >= window.x && sourceX + .5 < window.x + window.width);
      assert(sourceY - .5 >= window.y && sourceY + .5 < window.y + window.height);
    }
  }
  for (const verticalFovDeg of [45, 274.9]) {
    const poleView = { basis: createSkyViewBasis(0, 180, 0)!, verticalFovDeg };
    const result = skyGalacticImageWindow(poleView, width, height, band, imageWidth, imageHeight);
    assert.equal(result.x, 0); assert.equal(result.width, imageWidth);
  }
});
