import assert from "node:assert/strict";
import test from "node:test";
import { elasticPosition, elasticSpringFrames, elasticVelocityFactor } from "./elastic-motion";

test("shared sheet resistance is continuous, bounded and reduces release velocity", () => {
  assert.equal(elasticPosition(220, 220, 700), 220);
  assert.equal(elasticPosition(700, 220, 700), 700);
  assert.equal(elasticPosition(148, 220, 700), 184);
  assert.equal(elasticPosition(772, 220, 700), 736);
  assert.ok(elasticPosition(-100000, 220, 700) > 148);
  assert.ok(elasticPosition(100000, 220, 700) < 772);
  assert.equal(elasticVelocityFactor(220, 220, 700), 1);
  assert.equal(elasticVelocityFactor(148, 220, 700), 0.25);
});

test("spring begins at the visible overshoot and converges at the selected anchor", () => {
  const frames = elasticSpringFrames({ from: 736, to: 700, velocity: -0.5 });
  assert.equal(frames[0]?.height, 736);
  assert.equal(frames.at(-1)?.height, 700);
  assert.ok(frames.reduce((sum, frame) => sum + frame.duration, 0) <= 650);
});
