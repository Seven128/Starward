import assert from "node:assert/strict";
import test from "node:test";
import { panelSpringFrames } from "./panel-spring";

test("spring preserves initial height, follows release direction and settles exactly within bounds", () => {
  const base = { from: 400, to: 600, velocity: 1, min: 220, max: 700 };
  const forward = panelSpringFrames(base);
  const reversed = panelSpringFrames({ ...base, velocity: -2 });
  assert.equal(forward[0]!.height, 400);
  assert.ok(forward[1]!.height > 400);
  assert.ok(reversed[1]!.height < 400, "opposing release velocity is not discarded");
  for (const frames of [forward, reversed, panelSpringFrames({ ...base, from: 690, to: 700, velocity: 3 }), panelSpringFrames({ ...base, from: 225, to: 220, velocity: -3 })]) {
    assert.ok(frames.every(frame => Number.isFinite(frame.height)));
    assert.ok(frames.reduce((sum, frame) => sum + frame.duration, 0) <= 650);
  }
  assert.equal(forward.at(-1)!.height, 600);
  assert.equal(reversed.at(-1)!.height, 600);
  const regrab = panelSpringFrames({ ...base, from: forward[4]!.height, to: 350, velocity: -0.5 });
  assert.equal(regrab[0]!.height, forward[4]!.height);
  assert.equal(regrab.at(-1)!.height, 350);
});

test("reduced motion settles without animation and invalid geometry produces no frames", () => {
  const input = { from: 350, to: 700, velocity: 1, min: 220, max: 700 };
  assert.deepEqual(panelSpringFrames({ ...input, reducedMotion: true }), [{ height: 700, duration: 0 }]);
  assert.deepEqual(panelSpringFrames({ ...input, from: NaN }), []);
  assert.deepEqual(panelSpringFrames({ ...input, min: 800 }), []);
});
