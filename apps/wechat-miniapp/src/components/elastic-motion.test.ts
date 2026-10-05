import assert from "node:assert/strict";
import test from "node:test";
import { elasticPosition, elasticRawPosition, elasticSpringFrames, elasticVelocityFactor } from "./elastic-motion";

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

test("re-grabbing a resisted height preserves its presentation and local movement", () => {
  assert.equal(elasticRawPosition(184, 220, 700), 148);
  assert.equal(elasticRawPosition(736, 220, 700), 772);
  for (const visual of [149, 184, 219, 220, 350, 700, 736, 771]) {
    const raw = elasticRawPosition(visual, 220, 700);
    assert.ok(Math.abs(elasticPosition(raw, 220, 700) - visual) < 1e-8);
  }
  const origin = elasticRawPosition(184, 220, 700);
  const moved = elasticPosition(origin - 0.01, 220, 700);
  assert.ok(Math.abs((184 - moved) / 0.01 - 0.25) < 1e-4,
    "visible movement and release velocity share the resistance derivative");
  assert.ok(Number.isFinite(elasticRawPosition(148, 220, 700)), "a rounded asymptote stays finite");
});

test("spring begins at the visible overshoot and converges at the selected anchor", () => {
  const frames = elasticSpringFrames({ from: 736, to: 700, velocity: -0.5 });
  assert.equal(frames[0]?.height, 736);
  assert.equal(frames.at(-1)?.height, 700);
  assert.ok(frames.reduce((sum, frame) => sum + frame.duration, 0) <= 650);
});
