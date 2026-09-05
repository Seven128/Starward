import assert from "node:assert/strict";
import test from "node:test";

import {
  calibrateSkyHeadingOffset,
  createSkyViewBasis,
  projectSkyDirection,
  resolveSkyHeading,
  type SkyViewBasis,
  type SkyVector,
} from "./sky-view-projection.ts";

const EPSILON = 1e-9;

function close(actual: number, expected: number, tolerance = EPSILON): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function closeVector(actual: SkyVector, expected: SkyVector): void {
  actual.forEach((value, index) => close(value, expected[index]!));
}

function dot(left: SkyVector, right: SkyVector): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function norm(value: SkyVector): number {
  return Math.hypot(...value);
}

function assertOrthonormal(basis: SkyViewBasis): void {
  close(norm(basis.right), 1);
  close(norm(basis.up), 1);
  close(norm(basis.forward), 1);
  close(dot(basis.right, basis.up), 0);
  close(dot(basis.right, basis.forward), 0);
  close(dot(basis.up, basis.forward), 0);
}

test("upright cardinal headings map ENU camera basis correctly", () => {
  const north = createSkyViewBasis(0, 90, 0);
  const east = createSkyViewBasis(90, 90, 0);
  const south = createSkyViewBasis(180, 90, 0);
  const west = createSkyViewBasis(270, 90, 0);
  assert.ok(north && east && south && west);
  closeVector(north.right, [1, 0, 0]);
  closeVector(north.up, [0, 0, 1]);
  closeVector(north.forward, [0, 1, 0]);
  closeVector(east.right, [0, -1, 0]);
  closeVector(east.forward, [1, 0, 0]);
  closeVector(south.right, [-1, 0, 0]);
  closeVector(south.forward, [0, -1, 0]);
  closeVector(west.right, [0, 1, 0]);
  closeVector(west.forward, [-1, 0, 0]);
  assertOrthonormal(north);
  assertOrthonormal(east);
});

test("flat, face-down and gamma-tilted poses preserve real 3D direction", () => {
  const faceDown = createSkyViewBasis(0, 180, 0);
  const faceUp = createSkyViewBasis(0, 0, 0);
  const rolled = createSkyViewBasis(0, 90, 90);
  assert.ok(faceDown && faceUp && rolled);
  closeVector(faceDown.right, [1, 0, 0]);
  closeVector(faceDown.up, [0, -1, 0]);
  closeVector(faceDown.forward, [0, 0, 1]);
  closeVector(faceUp.forward, [0, 0, -1]);
  closeVector(rolled.right, [0, 1, 0]);
  closeVector(rolled.up, [0, 0, 1]);
  closeVector(rolled.forward, [-1, 0, 0]);
  assertOrthonormal(faceDown);
  assertOrthonormal(rolled);
});

test("compound heading, beta and gamma use the declared rotation order", () => {
  const compound = createSkyViewBasis(37, 72, -18);
  assert.ok(compound);
  closeVector(compound.right, [
    0.5826785083667678,
    -0.8070731867545121,
    0.09549150281252629,
  ]);
  closeVector(compound.up, [
    0.18597106962413537,
    0.24679194491591758,
    0.9510565162951535,
  ]);
  closeVector(compound.forward, [
    0.7911387470920214,
    0.536401535369293,
    -0.29389262614623657,
  ]);
  assertOrthonormal(compound);
});

test("heading wraps while beta and gamma reject impossible platform ranges", () => {
  const wrapped = createSkyViewBasis(360, 90, 0);
  const negativeWrapped = createSkyViewBasis(-360, 90, 0);
  assert.ok(wrapped && negativeWrapped);
  closeVector(wrapped.forward, [0, 1, 0]);
  closeVector(negativeWrapped.forward, [0, 1, 0]);
  assert.equal(createSkyViewBasis(Number.NaN, 90, 0), null);
  assert.equal(createSkyViewBasis(0, -180.001, 0), null);
  assert.equal(createSkyViewBasis(0, 180.001, 0), null);
  assert.equal(createSkyViewBasis(0, 90, -90.001), null);
  assert.equal(createSkyViewBasis(0, 90, 90.001), null);
});

test("perspective projection preserves angular scale and canvas handedness", () => {
  const basis = createSkyViewBasis(0, 90, 0);
  assert.ok(basis);
  const center = projectSkyDirection(0, 0, basis, 400, 800, 60);
  const top = projectSkyDirection(0, 30, basis, 400, 800, 60);
  const bottom = projectSkyDirection(0, -30, basis, 400, 800, 60);
  const eastward = projectSkyDirection(10, 0, basis, 400, 800, 60);
  const wrapped = projectSkyDirection(360, 0, basis, 400, 800, 60);
  assert.ok(center && top && bottom && eastward);
  close(center.x, 200);
  close(center.y, 400);
  close(top.x, 200);
  close(top.y, 0);
  close(bottom.x, 200);
  close(bottom.y, 800);
  close(eastward.y, 400);
  assert.ok(eastward.x > 200, "east must appear to the screen right");
  close(center.degrees, 0);
  close(bottom.altitude, -30);
  assert.ok(wrapped);
  close(wrapped.x, center.x);
  close(wrapped.y, center.y);
  close(wrapped.degrees, 0);
});

test("pole, frustum and behind-view directions return null rather than edge-clamped points", () => {
  const basis = createSkyViewBasis(0, 90, 0);
  assert.ok(basis);
  assert.equal(projectSkyDirection(180, 0, basis, 400, 800, 60), null);
  assert.equal(projectSkyDirection(0, 90, basis, 400, 800, 60), null);
  assert.equal(projectSkyDirection(90, 20, basis, 400, 800, 60), null);
  assert.equal(projectSkyDirection(0, 31, basis, 400, 800, 60), null);
  assert.equal(projectSkyDirection(0, -31, basis, 400, 800, 60), null);
  assert.equal(projectSkyDirection(350, 30, basis, 400, 800, 60), null);
});

test("aspect ratio changes horizontal field without changing vertical field", () => {
  const basis = createSkyViewBasis(0, 90, 0);
  assert.ok(basis);
  const portrait = projectSkyDirection(10, 20, basis, 400, 800, 60);
  const landscape = projectSkyDirection(10, 20, basis, 800, 400, 60);
  assert.ok(portrait && landscape);
  close(portrait.y, 143.9439580918919, 1e-8);
  close(landscape.y, 71.97197904594594, 1e-8);
  close(portrait.x, 322.1629157329115, 1e-8);
  close(landscape.x, 461.0814578664557, 1e-8);
  assert.ok(landscape.x < 800 && portrait.x < 400);
});

test("invalid projection input is rejected without hidden defaults or clamping", () => {
  const basis = createSkyViewBasis(0, 90, 0);
  assert.ok(basis);
  assert.equal(projectSkyDirection(Number.NaN, 0, basis, 400, 800, 60), null);
  assert.equal(projectSkyDirection(0, 91, basis, 400, 800, 60), null);
  assert.equal(projectSkyDirection(0, 0, basis, 0, 800, 60), null);
  assert.equal(projectSkyDirection(0, 0, basis, 400, 0, 60), null);
  assert.equal(projectSkyDirection(0, 0, basis, 400, 800, 0), null);
  assert.equal(projectSkyDirection(0, 0, basis, 400, 800, 180), null);
  assert.equal(
    projectSkyDirection(0, 0, { ...basis, right: [2, 0, 0] }, 400, 800, 60),
    null,
  );
  assert.equal(
    projectSkyDirection(
      0,
      0,
      { ...basis, forward: [0, -1, 0] },
      400,
      800,
      60,
    ),
    null,
  );
});

test("inverse-clockwise alpha calibration wraps and resolves with the declared sign", () => {
  assert.equal(calibrateSkyHeadingOffset(350, 20), 10);
  assert.equal(resolveSkyHeading(10, 20), 350);
  assert.equal(calibrateSkyHeadingOffset(10, -20), 350);
  assert.equal(resolveSkyHeading(350, -20), 10);
  assert.equal(resolveSkyHeading(calibrateSkyHeadingOffset(359, 359)!, 359), 359);
  assert.equal(calibrateSkyHeadingOffset(Number.NaN, 0), null);
  assert.equal(resolveSkyHeading(0, Number.POSITIVE_INFINITY), null);
});
