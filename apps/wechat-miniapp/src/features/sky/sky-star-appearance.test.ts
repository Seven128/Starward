import assert from "node:assert/strict";
import test from "node:test";
import { referenceAtmosphericTransmission, skyStarAppearance } from "./sky-star-appearance";
import { SKY_MIN_VERTICAL_FOV_DEG } from "./sky-zoom";

test("catalog-independent star sizes preserve magnitude order without coarse bright discs", () => {
  for (const fov of [SKY_MIN_VERTICAL_FOV_DEG, 0.15, 0.25, 1.5, 6, 15, 45, 120, 270]) {
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
    for (let fov = 270; fov >= SKY_MIN_VERTICAL_FOV_DEG; fov -= 0.01) {
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
  for (const sun of [NaN, Infinity, -91, 91]) assert.equal(skyStarAppearance(2, 45, sun), null);
  for (const altitude of [NaN, Infinity, -1, 0, 91])
    assert.equal(skyStarAppearance(2, 45, -25, altitude), null);
});

test("reference air mass attenuates low stars continuously without changing their catalog magnitude or size", () => {
  let previous = 0;
  for (let altitude = 0.1; altitude <= 90; altitude += 0.1) {
    const transmission = referenceAtmosphericTransmission(altitude);
    assert.ok(transmission + 1e-12 >= previous && transmission <= 1);
    previous = transmission;
  }
  assert.ok(referenceAtmosphericTransmission(0.1) < 0.1);
  assert.ok(referenceAtmosphericTransmission(5) < 0.5);
  assert.ok(referenceAtmosphericTransmission(60) > 0.98);
  const zenith = skyStarAppearance(2, 45, -25, 90)!;
  const low = skyStarAppearance(2, 45, -25, 5)!;
  assert.equal(low.radiusPx, zenith.radiusPx);
  assert.ok(low.opacity < zenith.opacity / 2);
  assert.deepEqual(skyStarAppearance(2, 45, -25), skyStarAppearance(2, 45),
    "callers without an exact geometric altitude retain the pre-existing display rule");
});

test("civil, nautical and astronomical twilight reveal faint stars after bright ones", () => {
  const fov=45;
  assert.equal(skyStarAppearance(-1.46,fov,0),null,"a day sky does not paint Sirius as a visible star");
  assert.ok(skyStarAppearance(-1.46,fov,-6),"the brightest stars emerge by civil twilight");
  assert.equal(skyStarAppearance(3,fov,-6),null,"faint stars must not emerge first");
  assert.ok(skyStarAppearance(3,fov,-12),"nautical twilight reveals more of the same catalog");
  assert.equal(skyStarAppearance(6,fov,-12),null);
  assert.ok(skyStarAppearance(6,fov,-18),"astronomical twilight restores the FOV-based night layer");
  assert.deepEqual(skyStarAppearance(6,fov,-25),skyStarAppearance(6,fov),"darkness does not alter catalog-independent appearance");
  let previous=0;
  for(let altitude=0;altitude>=-18;altitude-=.05){
    const opacity=skyStarAppearance(1,fov,altitude)?.opacity??0;
    assert.ok(opacity+1e-12>=previous,"the same star cannot dim as the Sun descends");
    previous=opacity;
  }
});
