import assert from "node:assert/strict";
import test from "node:test";
import { createSkyStarTransitions, type SkyTransitionStar } from "./sky-star-transition";

const star: SkyTransitionStar = { reference: "HR:1", displayName: "one", kind: "STAR", magnitude: 1,
  azimuthDeg: 30, altitudeDeg: 60, radiusPx: 2, color: "#FFFFFF", opacity: .92, named: true };
const scope = { context: {}, at: "2026-10-13T13:00:00.000Z", mode: "NIGHT" };
const catalog = {};

test("accepted star appearance fades in, exits, reverses from its current value and then stops", () => {
  const owner = createSkyStarTransitions();
  const frame = (now: number, visible: boolean) => {
    const value = owner.prepare(scope, now), layer = value.layer("bsc", catalog);
    const point = visible ? layer.point(star) : null, exits = layer.exits();
    assert(value.commit());
    return { opacity: Number((point?.opacity ?? exits[0]?.opacity ?? 0).toFixed(12)), animating: value.animating };
  };
  assert.deepEqual(frame(0, true), { opacity: 0, animating: true });
  assert.deepEqual(frame(80, true), { opacity: .46, animating: true });
  assert.deepEqual(frame(160, true), { opacity: .92, animating: false });
  assert.deepEqual(frame(1000, false), { opacity: .92, animating: true });
  assert.deepEqual(frame(1040, false), { opacity: .69, animating: true });
  assert.deepEqual(frame(1040, true), { opacity: .69, animating: true });
  assert.deepEqual(frame(1120, true), { opacity: .805, animating: true });
  assert.deepEqual(frame(1200, true), { opacity: .92, animating: false });
  assert.deepEqual(frame(2000, false), { opacity: .92, animating: true });
  assert.deepEqual(frame(2160, false), { opacity: 0, animating: false });
  assert.deepEqual(frame(3000, true), { opacity: 0, animating: true });
  assert.deepEqual(frame(3160, true), { opacity: .92, animating: false });
});

test("time changes keep only fresh coordinates, invalid layers and Context cannot retain exiting stars", () => {
  const owner = createSkyStarTransitions();
  const first = owner.prepare(scope, 0, true);
  first.layer("bsc", catalog).point(star); first.commit();
  const later = owner.prepare({ ...scope, at: "2026-10-13T14:00:00.000Z" }, 80);
  const layer = later.layer("bsc", catalog);
  assert.deepEqual(layer.exits(), [], "old-time rays cannot fade over the new sky");
  const moved = layer.point({ ...star, azimuthDeg: 50 });
  assert.equal(moved.azimuthDeg, 50); assert.equal(moved.opacity, .92);
  later.commit();
  for (const value of [owner.prepare({ ...scope, context: {} }, 100), owner.prepare(scope, 100)]) {
    assert.deepEqual(value.layer("bsc", null).exits(), []);
  }
  const changed = owner.prepare({ ...scope, context: {} }, 110);
  assert.equal(changed.layer("bsc", catalog).point(star).opacity, 0);
  assert.deepEqual(changed.layer("sao", "different-publication").exits(), []);
});

test("rejected completion cannot change the accepted fade or revive a retired Canvas", () => {
  const owner = createSkyStarTransitions();
  const first = owner.prepare(scope, 0);
  first.layer("bsc", catalog).point(star); first.commit();
  const rejected = owner.prepare(scope, 40);
  rejected.layer("bsc", catalog).point(star);
  const next = owner.prepare(scope, 80);
  assert(Math.abs(next.layer("bsc", catalog).point(star).opacity - .46) < 1e-12);
  next.commit(); assert.equal(rejected.commit(), false);
  const stale = owner.prepare(scope, 160);
  stale.layer("bsc", catalog).point(star);
  owner.reset(); assert.equal(stale.commit(), false);
  const reduced = owner.prepare(scope, 200, true);
  assert.equal(reduced.layer("bsc", catalog).point(star).opacity, .92);
  assert.equal(reduced.animating, false);
});
