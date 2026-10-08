import assert from "node:assert/strict";
import test from "node:test";
import { panelDragHeight, panelSpringFrames } from "./panel-spring";

test("small resists a downward pull without closing while large holds its upper boundary", () => {
  assert.equal(panelDragHeight(608, 156, 661), 608);
  assert.equal(panelDragHeight(748, 156, 661), 661);
  const pulled = panelDragHeight(120, 156, 661);
  assert.ok(pulled < 156 && pulled > 120, "small must move with resistance rather than stay fixed");
  assert.ok(panelDragHeight(-100000, 156, 661) > 84, "the pull remains bounded and cannot hide the panel");
  const frames = panelSpringFrames({ from: pulled, to: 156, velocity: 0, min: 156, max: 661 });
  assert.equal(frames[0]?.height, pulled, "release begins at the drawn compressed height");
  assert.equal(frames.at(-1)?.height, 156, "release restores the complete small document");
});

test("release already at a snap does not install a no-op CSS animation", () => {
  assert.deepEqual(panelSpringFrames({ from: 661, to: 661, velocity: 0, min: 156, max: 661 }),
    [{ height: 661, duration: 0 }]);
});

test("a compressed release can approach another anchor without jumping to small", () => {
  for (const [from, target, velocity] of [[184, 350, 0.2], [156, 700, 0.04]]) {
    const frames = panelSpringFrames({ from: from!, to: target!, velocity: velocity!, min: 220, max: 700 });
    assert.equal(frames[0]!.height, from);
    assert.ok(frames[1]!.height > from! && frames[1]!.height < 220,
      "the first moving sample must retain the below-small approach rather than hard-clamp it");
    assert.equal(frames.at(-1)!.height, target);
    assert.ok(frames.every(frame => frame.height >= from! && frame.height <= 700));
  }
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
    assert.ok(frames.reduce((sum, frame) => sum + frame.duration, 0) <= 280);
  }
  assert.equal(forward.at(-1)!.height, 600);
  assert.equal(reversed.at(-1)!.height, 600);
  const regrab = panelSpringFrames({ ...base, from: forward[4]!.height, to: 350, velocity: -0.5 });
  assert.equal(regrab[0]!.height, forward[4]!.height);
  assert.equal(regrab.at(-1)!.height, 350);
});

test("all panel releases retire by 280ms while keeping the release velocity across an accelerated solver clock", () => {
  for (const from of [136, 181, 368, 480, 650, 661.475]) for (const to of [181, 368, 661.475]) for (const velocity of [-3, 0, 3]) {
    const frames = panelSpringFrames({ from, to, velocity, min: 181, max: 661.475 });
    assert.ok(frames.reduce((sum, frame) => sum + frame.duration, 0) <= 280);
    assert.equal(frames[0]!.height, from === to ? to : from);
    assert.equal(frames.at(-1)!.height, to);
    if (frames.length < 2 || from < 181 || from === to) continue;
    const rate = 16 / frames[1]!.duration;
    // Independently reproduce the existing solver's first 4 integration steps.
    let height = from, speed = velocity / rate * 1000;
    for (let step = 0; step < 4; step++) { speed += (-420 * (height - to) - 34 * speed) * .004; height += speed * .004; }
    assert.ok(Math.abs(frames[1]!.height - Math.max(181, Math.min(661.475, height))) < 1e-8,
      "accelerating time must scale the initial solver velocity inversely, rather than amplify the finger velocity");
  }
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
