import assert from "node:assert/strict";
import test from "node:test";
import type { SkyTarget } from "@starward/miniapp-contracts";
import { projectSkyTarget } from "./sky-scene-projection";
import { createSkyViewBasis, projectSkyDirection } from "./sky-view-projection";

const target = {
  targetId: "target:jupiter", displayName: "木星", type: "PLANET",
  direction: "123°", azimuthDeg: 123.256789, altitudeDeg: 36.123456,
} as SkyTarget;
const basis = createSkyViewBasis(123.256789, 90 + 36.123456, 0)!;

test("high-magnification target geometry uses numeric coordinates, independently of display text", () => {
  const expected = projectSkyDirection(target.azimuthDeg!, target.altitudeDeg!, basis, 390, 844, 1.5)!;
  assert.ok(expected, "the known target must lie inside the test viewport");
  for (const direction of ["123°", "东南", "任意已本地化的显示文案"]) {
    const actual = projectSkyTarget({ ...target, direction }, null, null, 390, 844, 1.5, basis);
    assert.ok(actual, "a valid coordinate cannot disappear when its label changes");
    assert.ok(Math.hypot(actual.x - expected.x, actual.y - expected.y) < 1e-8,
      "rounding a bearing into display text must not displace the projected target");
  }
  const rounded = projectSkyDirection(Math.round(target.azimuthDeg!), Math.round(target.altitudeDeg!), basis, 390, 844, 1.5)!;
  assert.ok(Math.hypot(rounded.x - expected.x, rounded.y - expected.y) > 100,
    "this regression input must expose the previous integer-coordinate error");
});

test("missing, malformed, out-of-range and below-horizon geometry never borrows display-text coordinates", () => {
  for (const change of [
    { azimuthDeg: undefined }, { azimuthDeg: null }, { azimuthDeg: NaN },
    { azimuthDeg: -1 }, { azimuthDeg: 360 }, { azimuthDeg: "123.456789" },
    { altitudeDeg: undefined }, { altitudeDeg: null }, { altitudeDeg: Infinity },
    { altitudeDeg: 91 }, { altitudeDeg: -0.01 },
  ]) {
    assert.equal(projectSkyTarget({ ...target, ...change } as SkyTarget, null, null, 390, 844, 45, basis), null);
  }
});
