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
    const initial=skyStarAppearance(mag,270);
    let previousAlpha = initial?.opacity ?? 0;
    let previousRadius = initial?.radiusPx ?? 0;
    let maximumStep = 0;
    for (let fov = 269.99; fov >= SKY_MIN_VERTICAL_FOV_DEG; fov -= 0.01) {
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

test("normal local views reveal existing ninth-magnitude identities while wide and deferred observation stay bounded", () => {
  // SAO 128842 is supplied at visual magnitude 9 and visible in the matched
  // 10.8-degree reference. It previously vanished before reaching the GPU.
  const local = skyStarAppearance(9,10.8,-25,32);
  assert.ok(local && local.opacity > .5 && local.radiusPx < 1.2);
  assert.equal(skyStarAppearance(9,45,-25,32),null);
  assert.equal(skyStarAppearance(9,10.8,undefined,undefined,"OBSERVATION"),null);
  for (const mag of [0,3,6,7,9])
    assert.deepEqual(skyStarAppearance(mag,45),skyStarAppearance(mag,45,undefined,undefined,"OBSERVATION"));
  for (const fov of [90,115,185,264.4]) {
    assert.ok(skyStarAppearance(6.3,fov,-25,32),'ordinary wide views retain supplied bright-catalogue stars');
    assert.equal(skyStarAppearance(6.3,fov,-25,32,'OBSERVATION'),null,'deferred red display keeps its previous depth');
    assert.equal(skyStarAppearance(6.3,fov,-12,32),null,'the deeper night overview cannot bypass twilight');
  }
});

test("invalid photometry or projection cannot produce non-finite GPU geometry", () => {
  for (const mag of [NaN, Infinity, -Infinity]) assert.equal(skyStarAppearance(mag, 45), null);
  for (const fov of [NaN, Infinity, -1, 0, 360]) assert.equal(skyStarAppearance(2, fov), null);
  for (const sun of [NaN, Infinity, -91, 91]) assert.equal(skyStarAppearance(2, 45, sun), null);
  for (const altitude of [NaN, Infinity, -91, 91])
    assert.equal(skyStarAppearance(2, 45, -25, altitude), null);
});

test("full-sphere display joins the horizon continuously without extending physical air mass below ground", () => {
  const samples = [-90, -45, -15, -10, -1, -.000001, 0, .000001];
  for (const altitude of samples) assert(skyStarAppearance(2, 45, -25, altitude));
  assert.equal(referenceAtmosphericTransmission(-45), 0);
  assert.equal(referenceAtmosphericTransmission(0), 0);
  assert.equal(skyStarAppearance(2, 45, -25, -15)!.opacity, skyStarAppearance(2, 45)!.opacity);
  assert(Math.abs(skyStarAppearance(2, 45, -25, -.000001)!.opacity -
    skyStarAppearance(2, 45, -25, .000001)!.opacity) < 1e-7);
  assert(skyStarAppearance(2, 45, -25, -10)!.opacity > skyStarAppearance(2, 45, -25, -1)!.opacity);
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

test("late nautical display retains supplied fourth-magnitude identities seen in the matched wide field", () => {
  // Public Singapore / HR224, 2026-10-16T11:42:41Z: the matched reference
  // contains these existing catalogue magnitudes while the old 4.49 cut
  // removed them before drawing. This is display contrast, not eye visibility.
  const sun = -13.175699349046937;
  for (const fov of [45,120,264.4]) {
    const ordinary = skyStarAppearance(4.9,fov,sun,45);
    assert.ok(ordinary && ordinary.opacity > .5,"supplied fourth-magnitude stars reach a readable point");
    assert.equal(skyStarAppearance(6.3,fov,sun,45),null,"twilight still withholds the faint night layer");
    assert.equal(skyStarAppearance(4.9,fov,sun,45,"OBSERVATION"),null,"deferred red display keeps its original twilight rule");
  }
});
