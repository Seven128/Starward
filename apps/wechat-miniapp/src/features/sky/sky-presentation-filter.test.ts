import assert from "node:assert/strict";
import test from "node:test";
import { createSkyPresentationFilter } from "./sky-presentation-filter";
import { createSkyViewBasis, validBasis } from "./sky-view-projection";
import type { SkyOrientationSnapshot } from "./sky-orientation-controller";

function sample(degrees: number, at: number, revision = 0, beta = 90, gamma = 0): SkyOrientationSnapshot {
  const basis = createSkyViewBasis(degrees, beta, gamma)!;
  return { presentationRevision: revision, state: "READY", reason: "", telemetry: { accuracy: null, sampledAt: null },
    alignment: { epoch: 1, ready: true, mode: "auto", view: basis },
    pose: { alphaDeg: degrees, betaDeg: beta, gammaDeg: gamma, headingDeg: degrees, basis, sampledAt: at } };
}
const heading = (s: SkyOrientationSnapshot) => s.pose!.headingDeg!;
const difference = (a: number, b: number) => Math.abs((a - b + 540) % 360 - 180);

test("small stationary tremor is attenuated without suppressing a deliberate turn", () => {
  const filter = createSkyPresentationFilter(); filter(sample(0, 0));
  let maximum = 0;
  for (let i = 1; i <= 180; i++) {
    const result = filter(sample(0.3 * Math.sin(i / 60 * 2 * Math.PI * 8), i * 1000 / 60));
    if (i > 60) maximum = Math.max(maximum, difference(heading(result), 0));
  }
  assert.ok(maximum < 0.09, `tremor amplitude ${maximum}`);
  let result = sample(0, 3000);
  for (let i = 1; i <= 60; i++) result = filter(sample(i, 3000 + i * 1000 / 60));
  assert.ok(difference(heading(result), 60) < 3, `turn lag ${heading(result)}`);
  let last = difference(heading(result), 60);
  for (let i = 1; i <= 60; i++) {
    const error = difference(heading(filter(sample(60, 4000 + i * 1000 / 60))), 60);
    assert.ok(error <= last + 1e-8, "must converge without overshoot or pull-back"); last = error;
  }
  assert.ok(last < 0.01);
});

test("north seam, tilt and poles preserve a rigid shortest-arc view", () => {
  const filter = createSkyPresentationFilter(); filter(sample(359, 0));
  const result = filter(sample(1, 16));
  assert.ok(difference(heading(result), 0) < 1.01);
  for (let i = 2; i < 300; i++) {
    const next = filter(sample(i * 2 % 360, i * 16, 0, i % 180, i % 90));
    assert.ok(validBasis(next.pose!.basis));
    assert.deepEqual(next.pose!.basis, next.alignment.view);
  }
});

test("control transitions reset history and duplicate telemetry cannot advance it", () => {
  const filter = createSkyPresentationFilter(); filter(sample(0, 0));
  const moving = filter(sample(30, 16));
  const freeze = { ...sample(heading(moving), 16, 1),
    alignment: { ...moving.alignment, mode: "editing" as const } };
  const frozen = filter(freeze);
  assert.deepEqual(frozen.pose!.basis, freeze.pose!.basis);
  const confirmed = filter(sample(heading(moving), 32, 2));
  for (let i = 1; i <= 20; i++) {
    assert.ok(difference(heading(filter(sample(heading(moving), 32 + i * 16, 2))), heading(confirmed)) < 1e-8);
  }
  const current = filter(sample(80, 400, 2));
  assert.deepEqual(filter(sample(80, 400, 2)).pose!.basis, current.pose!.basis);
  assert.deepEqual(filter(sample(90, 399, 2)).pose!.basis, current.pose!.basis);
  const cancelled = sample(110, 410, 3);
  assert.deepEqual(filter(cancelled).pose!.basis, cancelled.pose!.basis);
  const resumed = sample(20, 1200, 4);
  assert.deepEqual(filter(resumed).pose!.basis, resumed.pose!.basis);
});

test("sampling frequency does not materially change tracking lag", () => {
  const ends = [30, 60, 120].map(hz => {
    const filter = createSkyPresentationFilter(); filter(sample(0, 0));
    let result = sample(0, 0);
    for (let i = 1; i <= hz; i++) result = filter(sample(60 * i / hz, 1000 * i / hz));
    return heading(result);
  });
  assert.ok(Math.max(...ends) - Math.min(...ends) < 0.5, String(ends));
});
