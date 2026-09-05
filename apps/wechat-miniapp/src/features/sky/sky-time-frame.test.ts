import assert from "node:assert/strict";
import test from "node:test";
import { exactSkyTimeFrame } from "./sky-time-frame.ts";

const committed = "2026-09-05T13:00:00.000Z";
const preview = "2026-09-05T13:20:26.000Z";

test("sky frame selection never substitutes the nearest available instant", () => {
  const frames = [{ at: preview, direction: 120 }];
  assert.equal(exactSkyTimeFrame(frames, committed), undefined);
  assert.equal(exactSkyTimeFrame(frames, preview), frames[0]);
});

test("preview and cancellation select matching target and star identities without state", () => {
  const targets = [{ at: committed, direction: 100 }, { at: preview, direction: 120 }];
  const stars = [{ at: committed, points: [1] }, { at: preview, points: [2] }];
  for (const at of [committed, preview, committed]) {
    assert.equal(exactSkyTimeFrame(targets, at)?.at, at);
    assert.equal(exactSkyTimeFrame(stars, at)?.at, at);
  }
  assert.notEqual(exactSkyTimeFrame(targets, committed)?.direction, exactSkyTimeFrame(targets, preview)?.direction);
  assert.deepEqual(exactSkyTimeFrame(stars, committed)?.points, [1]);
});

test("missing legacy target frames, duplicate identities and invalid times fail closed", () => {
  assert.equal(exactSkyTimeFrame(undefined, committed), undefined);
  assert.equal(exactSkyTimeFrame([{ at: committed }, { at: committed }], committed), undefined);
  assert.equal(exactSkyTimeFrame([{ at: "bad" }], "bad"), undefined);
  assert.equal(exactSkyTimeFrame([{ at: committed }], undefined), undefined);
});
