import assert from "node:assert/strict";
import test from "node:test";
import { skyStarAppearance } from "./sky-star-appearance";

test("catalog-independent star sizes preserve magnitude order without coarse bright discs", () => {
  for (const fov of [1.5, 6, 15, 45, 120, 270]) {
    let previous = Infinity;
    for (let mag = -2; mag <= 12; mag += 0.1) {
      const appearance = skyStarAppearance(mag, fov);
      if (!appearance) continue;
      assert.ok(appearance.radiusPx <= previous && appearance.radiusPx >= 0.85 && appearance.radiusPx < 2.7);
      assert.ok(appearance.opacity > 0 && appearance.opacity <= 0.92);
      previous = appearance.radiusPx;
    }
  }
  assert.ok(skyStarAppearance(5, 45)!.radiusPx > 1, "previous faint stars gain a modest size increase");
  assert.ok(skyStarAppearance(6.5, 45), "the full existing bright-star layer remains available at observing scale");
});

test("zoom progressively reveals faint points and reverses without discrete level jumps", () => {
  for (const mag of [6, 8, 10]) {
    let previousAlpha = 0;
    let previousRadius = 0;
    let maximumStep = 0;
    for (let fov = 270; fov >= 1.5; fov -= 0.01) {
      const a = skyStarAppearance(mag, fov);
      const alpha = a?.opacity ?? 0;
      assert.ok(alpha + 1e-12 >= previousAlpha);
      if (a && previousRadius) assert.ok(a.radiusPx + 1e-12 >= previousRadius);
      maximumStep = Math.max(maximumStep, alpha - previousAlpha);
      previousAlpha = alpha; previousRadius = a?.radiusPx ?? 0;
    }
    assert.ok(maximumStep < 0.015, `magnitude ${mag} fades continuously`);
    assert.ok(previousAlpha > 0.9);
  }
  assert.equal(skyStarAppearance(8, 45), null);
  assert.ok(skyStarAppearance(8, 6));
  assert.equal(skyStarAppearance(8, 45), null, "zooming back out does not retain a revealed layer");
});

test("invalid photometry or projection cannot produce non-finite GPU geometry", () => {
  for (const mag of [NaN, Infinity, -Infinity]) assert.equal(skyStarAppearance(mag, 45), null);
  for (const fov of [NaN, Infinity, -1, 0, 360]) assert.equal(skyStarAppearance(2, fov), null);
});
