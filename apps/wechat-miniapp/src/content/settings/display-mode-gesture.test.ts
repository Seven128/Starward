import assert from "node:assert/strict";
import test from "node:test";
import { moveModeDrag, releasedMode, tappedMode, type ModeDrag } from "./display-mode-gesture";

const start = (origin = 0): ModeDrag => ({
  x: 0, y: 0, lastX: 0, lastAt: 0, origin, position: origin,
  step: 100, velocity: 0, axis: "pending",
});

test("tap advances the current station and selects another station directly", () => {
  assert.equal(tappedMode("DAY", "DAY"), "NIGHT");
  assert.equal(tappedMode("NIGHT", "NIGHT"), "OBSERVATION");
  assert.equal(tappedMode("OBSERVATION", "OBSERVATION"), "DAY");
  assert.equal(tappedMode("DAY", "OBSERVATION"), "OBSERVATION");
});

test("sub-threshold movement and vertical intent never commit a mode", () => {
  const drag = start();
  moveModeDrag(drag, 7, 3, 10);
  assert.equal(drag.axis, "pending");
  moveModeDrag(drag, 8, 20, 20);
  moveModeDrag(drag, 150, 21, 30);
  assert.equal(drag.axis, "vertical");
  assert.equal(releasedMode(drag, "DAY", 35), "DAY");
});

test("drag follows position, reverses, clamps and commits at most one station", () => {
  const drag = start();
  moveModeDrag(drag, 180, 0, 200);
  assert.equal(drag.position, 1.8);
  assert.equal(releasedMode(drag, "DAY", 201), "NIGHT");
  moveModeDrag(drag, 20, 0, 400);
  assert.equal(drag.position, .2);
  assert.equal(releasedMode(drag, "DAY", 401), "DAY");
  moveModeDrag(drag, -400, 0, 600);
  assert.equal(drag.position, 0);
});

test("recent release velocity matters but a stopped finger does not retain a fling", () => {
  const drag = start(1);
  moveModeDrag(drag, 20, 0, 20);
  assert.equal(releasedMode(drag, "NIGHT", 21), "OBSERVATION");
  assert.equal(releasedMode(drag, "NIGHT", 200), "NIGHT");
});

test("a gesture before layout measurement cannot commit a guessed station", () => {
  const drag = { ...start(), step: 0 };
  moveModeDrag(drag, 200, 0, 20);
  assert.equal(drag.axis, "horizontal");
  assert.equal(releasedMode(drag, "DAY", 21), "DAY");
  assert.ok(Number.isFinite(drag.position));
});
