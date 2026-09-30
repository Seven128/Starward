import test from "node:test";
import assert from "node:assert/strict";
import { deepSkyAuxiliaryOpacity } from "./sky-deep-auxiliary-visibility.ts";

test("a painted deep-sky image replaces its catalog aid gradually as its real angular footprint grows", () => {
  const fovs = [15, 6, 2.2, 1.7, 1].map(fov => deepSkyAuxiliaryOpacity(fov, 844, 11, true));
  assert.equal(fovs[0], 1);
  for (let index = 1; index < fovs.length; index++)
    assert.ok(fovs[index]! <= fovs[index - 1]!, "zoom must not brighten an image-backed ring");
  assert.ok(fovs[2]! > 0 && fovs[2]! < 1);
  assert.equal(fovs.at(-1), 0);
  assert.deepEqual([1, 1.7, 2.2, 6, 15].map(fov => deepSkyAuxiliaryOpacity(fov, 844, 11, true)),
    [...fovs].reverse(), "widening restores the same catalog aid");
});

test("missing or failed imagery and unknown angular size retain a visible catalog identity", () => {
  for (const major of [null, 0, Number.NaN])
    assert.equal(deepSkyAuxiliaryOpacity(0.5, 844, major, true), 1);
  assert.equal(deepSkyAuxiliaryOpacity(0.5, 844, 11, false), 1);
  assert.equal(deepSkyAuxiliaryOpacity(Number.NaN, 844, 11, true), 1);
});
