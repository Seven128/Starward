import assert from "node:assert/strict";
import test from "node:test";
import { terrainReliefRgba } from "./terrain-relief.ts";

const size = 9, rgb = [112, 139, 104] as const;
const alpha = (rgba: Uint8Array, row: number, column: number) => rgba[(row * size + column) * 4 + 3];

test("known level terrain does not paint an opaque rectangular wash", () => {
  const rgba = terrainReliefRgba(new Float32Array(size * size).fill(130), size, 30, rgb);
  for (let index = 3; index < rgba.length; index += 4) assert.equal(rgba[index], 0);
});

test("a real-height ridge retains geographic light-facing and shadow-facing slopes", () => {
  const ridge = Float32Array.from({ length: size * size }, (_, index) => 100 + (4 - Math.abs(index % size - 4)) * 30);
  const rgba = terrainReliefRgba(ridge, size, 30, rgb);
  assert.ok(alpha(rgba, 4, 6) > alpha(rgba, 4, 2) + 50,
    "with north-west illumination, the eastern face is the shadowed side");
  assert.ok(alpha(rgba, 4, 6) >= 90, "the shadow must survive ordinary basemap compositing");
  assert.ok(alpha(rgba, 4, 4) < alpha(rgba, 4, 6), "the symmetric crest is not an invented cliff");
});

test("missing data is hatched without inventing a cliff on adjacent known level ground", () => {
  const terrain = new Float32Array(size * size).fill(130);
  terrain[4 * size + 4] = Number.NaN;
  terrain[5 * size + 7] = Number.NaN;
  const rgba = terrainReliefRgba(terrain, size, 30, rgb);
  assert.equal(alpha(rgba, 4, 3), 0);
  assert.equal(alpha(rgba, 3, 4), 0);
  assert.equal(alpha(rgba, 5, 7), 90, "a missing stripe remains visibly different from a known flat pixel");
});
