import assert from "node:assert/strict";
import test from "node:test";
import { createOrientationRulerLayout, orientationRulerProjection } from "./orientation-ruler-layout";

// Actual desktop layout reported by the root-owned public SDK observation.
// The scrollLeft prop (583.44) is deliberately not the native offset below.
const nativeSample = [{ left: 194.7, width: 1 }, { left: -396, width: 17 },
  { left: -379, width: 17 }, { scrollLeft: 583.200012 }];
const near = (actual: number, expected: number, message = `${actual} != ${expected}`) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, message);

test("actual adjacent centers and native offset align the selected tick, including fractional cadence", () => {
  const p = orientationRulerProjection(nativeSample)!;
  near(p.stepPx, 17); near(p.zeroOffsetPx, .500012);
  // Translation must cancel: a different current native scroll position
  // cannot change the content-space origin derived from the same layout.
  const shifted = orientationRulerProjection([{ left: 194.7, width: 1 }, { left: -312.5, width: 17 },
    { left: -295.5, width: 17 }, { scrollLeft: 499.700012 }])!;
  near(shifted.zeroOffsetPx, p.zeroOffsetPx);
  const fractional = orientationRulerProjection([{ left: 190, width: 1 }, { left: -20, width: 17.25 },
    { left: -2.75, width: 17.25 }, { scrollLeft: 250 }])!;
  near(fractional.stepPx, 17.25); near(fractional.zeroOffsetPx, 48.125);
});

test("programmatic positions and drag fractions use the same measured projection", () => {
  const callbacks: Array<(values: readonly unknown[]) => void> = [];
  const layout = createOrientationRulerLayout(callback => callbacks.push(callback), () => true, () => {});
  near(layout.left(33, 17.68), 583.44);
  layout.measure(); callbacks.shift()!(nativeSample);
  near(layout.left(33, 17.68), 561.500012);
  assert.equal(layout.measured, true);
  assert.equal(layout.aligned(561.4222412109375, 33), true, "the selected center falls inside the measured axis width");
  assert.equal(layout.aligned(583.44, 33), false, "the nominal cadence's displaced center cannot qualify entry");
  near(layout.index(565.750012, 17.68), 33.25);
  near(layout.left(layout.index(565.750012, 17.68), 17.68), 565.750012);
  assert.equal(layout.left(-1, 17.68), 0, "native offsets remain nonnegative");
});

test("retirement, changed layout and blocked gestures reject late reads without publishing", () => {
  const callbacks: Array<(values: readonly unknown[]) => void> = [], guards: Array<() => boolean> = [];
  let allowed = true, resolutions = 0;
  const layout = createOrientationRulerLayout((callback, current) => { callbacks.push(callback); guards.push(current); },
    () => allowed, () => { resolutions++; });
  for (const boundary of ["retire", "invalidate", "blocked"] as const) {
    layout.invalidate(); layout.measure();
    const callback = callbacks.shift()!, current = guards.shift()!;
    if (boundary === "blocked") allowed = false; else layout[boundary]();
    assert.equal(current(), false); callback(nativeSample);
    assert.equal(resolutions, 0, boundary); near(layout.left(33, 17.68), 583.44);
    allowed = true;
  }
  layout.measure(); callbacks.shift()!(nativeSample); assert.equal(resolutions, 1);
  layout.invalidate(true);
  near(layout.index(565.750012, 17.68), 33.25, "a resized held drag keeps its existing conversion until retirement");
  layout.invalidate(); near(layout.left(33, 17.68), 583.44);
});

test("missing or invalid layout has one bounded retry and can recover at a later boundary", () => {
  const callbacks: Array<(values: readonly unknown[]) => void> = [];
  let reads = 0, resolutions = 0;
  const layout = createOrientationRulerLayout(callback => { reads++; callbacks.push(callback); }, () => true,
    () => { resolutions++; });
  layout.measure(); layout.measure(); assert.equal(reads, 1, "one in-flight observation");
  callbacks.shift()!([]); assert.equal(reads, 2);
  callbacks.shift()!([{}, null]); assert.equal(reads, 2); assert.equal(resolutions, 1);
  near(layout.left(33, 17.68), 583.44);
  layout.measure(); callbacks.shift()!(nativeSample); assert.equal(resolutions, 2);
  layout.measure(); assert.equal(reads, 3, "accepted layout is reused without further queries");
  for (const values of [[], [null, ...nativeSample.slice(1)], [...nativeSample.slice(0, 3), { scrollLeft: NaN }],
    [nativeSample[0], nativeSample[1], nativeSample[1], nativeSample[3]]]) assert.equal(orientationRulerProjection(values), null);
});
