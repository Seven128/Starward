import assert from "node:assert/strict";
import test from "node:test";
import { panelDragHeight, panelSpringFrames } from "./panel-spring";

test("dragging beyond the large snap holds its top boundary before release", () => {
  assert.equal(panelDragHeight(608, 156, 661), 608);
  assert.equal(panelDragHeight(748, 156, 661), 661);
  assert.ok(panelDragHeight(120, 156, 661) < 156, "the lower edge retains bounded elastic feedback");
});

test("release already at a snap does not install a no-op CSS animation", () => {
  assert.deepEqual(panelSpringFrames({ from: 661, to: 661, velocity: 0, min: 156, max: 661 }),
    [{ height: 661, duration: 0 }]);
});

test("spring preserves initial height, follows release direction and settles exactly within bounds", () => {
  const base = { from: 400, to: 600, velocity: 1, min: 220, max: 700 };
  const forward = panelSpringFrames(base);
  const reversed = panelSpringFrames({ ...base, velocity: -2 });
  assert.equal(forward[0]!.height, 400);
  assert.ok(forward[1]!.height > 400);
  assert.ok(reversed[1]!.height < 400, "opposing release velocity is not discarded");
  for (const frames of [forward, reversed, panelSpringFrames({ ...base, from: 690, to: 700, velocity: 3 }), panelSpringFrames({ ...base, from: 225, to: 220, velocity: -3 })]) {
    assert.ok(frames.every(frame => Number.isFinite(frame.height)));
    assert.ok(frames.slice(1).every(frame => frame.height >= base.min && frame.height <= base.max));
    assert.ok(frames.reduce((sum, frame) => sum + frame.duration, 0) <= 650);
  }
  assert.equal(forward.at(-1)!.height, 600);
  assert.equal(reversed.at(-1)!.height, 600);
  const regrab = panelSpringFrames({ ...base, from: forward[4]!.height, to: 350, velocity: -0.5 });
  assert.equal(regrab[0]!.height, forward[4]!.height);
  assert.equal(regrab.at(-1)!.height, 350);
});

test("boundary snaps never overshoot and recoil after a fast release or an elastic pull", () => {
  for (const [from, to, velocity] of [[350, 700, 3], [690, 700, 3], [730, 700, -1], [350, 220, -3], [190, 220, 1]]) {
    const frames = panelSpringFrames({ from: from!, to: to!, velocity: velocity!, min: 220, max: 700 });
    assert.equal(frames[0]!.height, from);
    assert.equal(frames.at(-1)!.height, to);
    assert.ok(frames.slice(1).every(frame => from! > to! ? frame.height >= to! : frame.height <= to!), `${from} to ${to} crossed the destination`);
    if (from! > 700) assert.ok(frames.every(frame => frame.height <= from!), "release must not expand farther than the user's pull");
    if (from! < 220) assert.ok(frames.every(frame => frame.height >= from!), "release must not collapse farther than the user's pull");
  }
});

test("reduced motion settles without animation and invalid geometry produces no frames", () => {
  const input = { from: 350, to: 700, velocity: 1, min: 220, max: 700 };
  assert.deepEqual(panelSpringFrames({ ...input, reducedMotion: true }), [{ height: 700, duration: 0 }]);
  assert.deepEqual(panelSpringFrames({ ...input, from: NaN }), []);
  assert.deepEqual(panelSpringFrames({ ...input, min: 800 }), []);
});
