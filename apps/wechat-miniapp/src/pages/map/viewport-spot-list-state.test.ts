import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { createViewportSpotPresentation, projectViewportSpots, viewportSpotAnimationDelay,
  viewportSpotMotionDuration, viewportSpotPage, viewportSpotPageCount } from "./viewport-spot-list-state";

const bounds = { west: 113, east: 115, south: 22, north: 24 };
const spot = (id: number, longitude = 114, latitude = 23): SpotSummary => ({ ...TEST_PUBLISHED_SPOT,
  spotId: `spot:viewport-${id}` as SpotSummary["spotId"], name: `地点${id}`, gcj02: { ...TEST_PUBLISHED_SPOT.gcj02, longitude, latitude } });
const result = (key: string, ids: number[]) => projectViewportSpots(key, ids.map(id => spot(id)), bounds)!;

function harness() {
  let now = 0;
  const tasks = new Set<{ at: number; callback(): void }>();
  const callbacks: Array<() => void> = [];
  const owner = createViewportSpotPresentation({
    setTimeout(callback, delay) {
      const task = { at: now + delay, callback };
      tasks.add(task); callbacks.push(callback); return task;
    },
    clearTimeout(handle) { tasks.delete(handle as { at: number; callback(): void }); },
  });
  const commit = () => {
    const state = owner.getSnapshot(); owner.presentationCommitted(state.transition, state.phase);
  };
  const start = (index?: number) => {
    const state = owner.getSnapshot();
    owner.animationStarted(state.transition, state.phase, index ?? (state.phase === "leaving" ? viewportSpotPage(state).length - 1 : 0));
  };
  const end = (index: number) => {
    const state = owner.getSnapshot(); owner.animationEnded(state.transition, state.phase, index);
  };
  const finish = () => {
    const state = owner.getSnapshot();
    viewportSpotPage(state).forEach((_, index) => owner.animationEnded(state.transition, state.phase, index));
  };
  const advance = (ms: number) => {
    now += ms;
    for (const task of [...tasks]) if (task.at <= now) { tasks.delete(task); task.callback(); }
  };
  return { owner, commit, start, end, finish, advance, tasks, callbacks };
}

test("native bounds determine visible places; unknown coverage is not empty and display caps preserve real identities", () => {
  const entries = [spot(1, 113, 22), spot(2, 115, 24), spot(3, 112.9), spot(4, 114, 24.1), spot(1)];
  const projected = projectViewportSpots("view-a", entries, bounds)!;
  assert.deepEqual(projected.spots.map(item => item.spotId), ["spot:viewport-1", "spot:viewport-2"]);
  assert.equal(projected.spots[0], entries[0]);
  assert.equal(projected.total, 2);
  assert.equal(projectViewportSpots("view-a", entries, null), null);
  assert.equal(projectViewportSpots("view-a", entries, { ...bounds, east: bounds.west }), null);
  const capped = projectViewportSpots("view-b", Array.from({ length: 28 }, (_, id) => spot(id)), bounds)!;
  assert.equal(capped.total, 28);
  assert.equal(capped.spots.length, 20);
  assert.equal(viewportSpotPageCount(capped), 5);
});

test("four old cards leave bottom to top completely before the new top-to-bottom entry", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  h.owner.configure("b", true, false); h.owner.receive(result("b", [5, 6, 7, 8]));
  assert.equal(h.owner.getSnapshot().phase, "leaving");
  assert.deepEqual([0, 1, 2, 3].map(index => viewportSpotAnimationDelay("leaving", index, 4)), [105, 70, 35, 0]);
  h.advance(500); // No React/native presentation has happened yet.
  assert.equal(h.owner.getSnapshot().result?.requestKey, "a");
  h.commit(); h.start(); h.advance(viewportSpotMotionDuration(4) - 1);
  h.end(3); h.end(2); h.end(1);
  assert.equal(h.owner.getSnapshot().result?.requestKey, "a");
  h.advance(1); h.end(0);
  assert.equal(h.owner.getSnapshot().result?.requestKey, "b");
  assert.equal(h.owner.getSnapshot().phase, "entering");
  assert.deepEqual([0, 1, 2, 3].map(index => viewportSpotAnimationDelay("entering", index, 4)), [0, 35, 70, 105]);
  assert.equal(h.owner.selectedSpot("spot:viewport-5"), null);
  h.commit(); h.start(); h.advance(viewportSpotMotionDuration(4)); h.finish();
  assert.equal(h.owner.getSnapshot().phase, "idle");
  assert.equal(h.owner.selectedSpot("spot:viewport-5")?.name, "地点5");
});

test("a later viewport takes over an exit and rejects both stale replies and retired phase callbacks", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  h.owner.configure("b", true, false); h.owner.receive(result("b", [5])); h.commit();
  const retired = h.callbacks[0]!;
  h.owner.configure("c", true, false);
  assert.equal(h.tasks.size, 1); // Continue the already-visible exit without flashing the old cards back.
  assert.equal(h.owner.receive(result("b", [5])), false);
  h.owner.receive(result("c", [9, 10]));
  assert.equal(h.owner.getSnapshot().result?.requestKey, "a");
  h.advance(viewportSpotMotionDuration(4)); h.finish();
  assert.equal(h.owner.getSnapshot().result?.requestKey, "c");
  retired();
  assert.equal(h.owner.getSnapshot().phase, "entering");
  h.commit(); h.advance(viewportSpotMotionDuration(2)); h.finish();
  assert.deepEqual(viewportSpotPage(h.owner.getSnapshot()).map(item => item.name), ["地点9", "地点10"]);
});

test("a fresher accepted result replaces the pending result without restarting the same exit", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  h.owner.configure("b", true, false); h.owner.receive(result("b", [5])); h.commit();
  h.advance(100); h.owner.receive(result("b", [6, 7]));
  assert.equal(h.tasks.size, 1);
  h.advance(165); h.finish();
  assert.deepEqual(viewportSpotPage(h.owner.getSnapshot()).map(item => item.name), ["地点6", "地点7"]);
});

test("unchanged card appearance still refreshes the selected place's coordinates without resetting its page or motion", () => {
  const h = harness();
  const first = result("a", [1, 2, 3, 4, 5]);
  h.owner.configure("a", true, false); h.owner.receive(first); h.owner.goToPage(1); h.commit();
  const before = h.owner.getSnapshot();
  const latestSpot = { ...first.spots[4]!, gcj02: { ...first.spots[4]!.gcj02, longitude: 114.5 } };
  const refreshed = projectViewportSpots("a", [...first.spots.slice(0, 4), latestSpot], bounds)!;
  assert.equal(refreshed.revision, first.revision, "navigation-only fields do not replay card motion");
  assert.equal(h.owner.receive(refreshed), true);
  assert.equal(h.owner.getSnapshot().page, 1);
  assert.equal(h.owner.getSnapshot().phase, "paging");
  assert.equal(h.owner.getSnapshot().transition, before.transition);
  assert.equal(h.tasks.size, 1);
  h.finish();
  assert.equal(h.owner.selectedSpot(latestSpot.spotId), latestSpot, "selection must pass the latest complete business object to Map");
  const latestAgain = { ...latestSpot, gcj02: { ...latestSpot.gcj02, latitude: 23.5 } };
  const idle = h.owner.getSnapshot();
  h.owner.receive(projectViewportSpots("a", [...first.spots.slice(0, 4), latestAgain], bounds));
  assert.equal(h.owner.getSnapshot().phase, "idle");
  assert.equal(h.owner.getSnapshot().transition, idle.transition);
  assert.equal(h.owner.selectedSpot(latestAgain.spotId), latestAgain);
});

test("a pending page with unchanged card appearance uses the latest place object when it enters", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  const incoming = result("b", [5]);
  h.owner.configure("b", true, false); h.owner.receive(incoming); h.commit();
  const leaving = h.owner.getSnapshot();
  const latestSpot = { ...incoming.spots[0]!, gcj02: { ...incoming.spots[0]!.gcj02, longitude: 114.5 } };
  const latest = projectViewportSpots("b", [latestSpot], bounds)!;
  assert.equal(latest.revision, incoming.revision);
  assert.equal(h.owner.receive(latest), true);
  assert.equal(h.owner.getSnapshot().transition, leaving.transition);
  assert.equal(h.tasks.size, 1);
  h.finish(); h.finish();
  assert.equal(h.owner.selectedSpot(latestSpot.spotId), latestSpot);
});

test("pagination is bounded, preserves the real last page and never selects an invisible place", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4, 5]));
  assert.equal(h.owner.goToPage(1), true);
  assert.deepEqual(viewportSpotPage(h.owner.getSnapshot()).map(item => item.spotId), ["spot:viewport-5"]);
  assert.equal(h.owner.goToPage(2), false);
  assert.equal(h.owner.goToPage(-1), false);
  assert.equal(h.owner.selectedSpot("spot:viewport-1"), null);
  h.commit(); h.advance(180); h.finish();
  assert.equal(h.owner.selectedSpot("spot:viewport-5")?.spotId, "spot:viewport-5");
  h.owner.configure("b", true, false);
  assert.equal(h.owner.selectedSpot("spot:viewport-5"), null);
});

test("empty result is accepted after the full exit; missing or failed input does not erase prior readable cards", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  h.owner.configure("b", true, false);
  assert.equal(h.owner.receive(null), false);
  assert.equal(viewportSpotPage(h.owner.getSnapshot()).length, 4);
  h.owner.receive(result("b", [])); h.commit(); h.advance(265); h.finish();
  assert.equal(h.owner.getSnapshot().phase, "idle");
  assert.equal(h.owner.getSnapshot().result?.total, 0);
  assert.equal(viewportSpotPageCount(h.owner.getSnapshot().result), 0);
});

test("reduced motion settles the latest accepted result and resets an old last-page position", () => {
  const h = harness();
  h.owner.configure("a", true, true); h.owner.receive(result("a", [1, 2, 3, 4, 5]));
  h.owner.goToPage(1);
  h.owner.configure("b", true, false); h.owner.receive(result("b", [6])); h.commit();
  h.owner.configure("b", true, true);
  assert.equal(h.owner.getSnapshot().page, 0);
  assert.equal(h.owner.getSnapshot().phase, "idle");
  assert.equal(h.owner.selectedSpot("spot:viewport-6")?.name, "地点6");
  assert.equal(h.tasks.size, 0);
});

test("hiding or disposing releases the timer and retained places; a delayed completion cannot republish them", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  h.owner.configure("b", true, false); h.owner.receive(result("b", [5])); h.commit();
  const retired = h.callbacks[0]!;
  h.owner.configure("b", false, false); retired();
  assert.equal(h.tasks.size, 0);
  assert.equal(h.owner.getSnapshot().result, null);
  assert.equal(h.owner.receive(result("b", [5])), false);
  h.owner.configure("b", true, false); h.owner.receive(result("b", [5]));
  assert.equal(h.owner.getSnapshot().phase, "idle");
  h.owner.configure("c", true, false); h.owner.receive(result("c", [6])); h.commit();
  const latestCallback = h.callbacks.at(-1)!;
  h.owner.dispose(); latestCallback();
  assert.equal(h.tasks.size, 0);
  assert.equal(h.owner.getSnapshot().result, null);
});

test("a view requested during exit can wait for its own reply without resurrecting already-faded cards", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  h.owner.configure("b", true, false); h.owner.receive(result("b", [5])); h.commit();
  h.owner.configure("c", true, false); h.finish();
  assert.equal(h.owner.getSnapshot().phase, "waiting");
  assert.equal(h.tasks.size, 0);
  assert.equal(h.owner.receive(result("b", [5])), false);
  h.owner.receive(result("c", [6, 7]));
  assert.equal(h.owner.getSnapshot().phase, "entering");
  assert.deepEqual(viewportSpotPage(h.owner.getSnapshot()).map(item => item.name), ["地点6", "地点7"]);
});

test("missing animation endpoints have one finite recovery timer, while stale native events cannot finish a newer phase", () => {
  const h = harness();
  h.owner.configure("a", true, false); h.owner.receive(result("a", [1, 2, 3, 4]));
  h.owner.configure("b", true, false); h.owner.receive(result("b", [5]));
  const old = h.owner.getSnapshot(); h.commit(); h.start();
  h.advance(264); assert.equal(h.owner.getSnapshot().phase, "leaving");
  h.advance(33); assert.equal(h.owner.getSnapshot().phase, "entering");
  for (let index = 0; index < 4; index++) h.owner.animationEnded(old.transition, old.phase, index);
  assert.equal(h.owner.getSnapshot().phase, "entering");
  h.commit(); h.advance(192);
  assert.equal(h.owner.getSnapshot().phase, "idle");
  assert.equal(h.tasks.size, 0);
});

test("hide releases place objects while returning to the same accepted view preserves the chosen page", () => {
  const h = harness();
  const accepted = result("a", [1, 2, 3, 4, 5]);
  h.owner.configure("a", true, true); h.owner.receive(accepted); h.owner.goToPage(1);
  h.owner.configure("a", false, true);
  assert.equal(h.owner.getSnapshot().result, null);
  h.owner.configure("a", true, true); h.owner.receive(accepted);
  assert.equal(h.owner.getSnapshot().page, 1);
  assert.equal(h.owner.selectedSpot("spot:viewport-5")?.name, "地点5");
  h.owner.configure("a", false, true); h.owner.configure("b", true, true); h.owner.receive(result("b", [6]));
  assert.equal(h.owner.getSnapshot().page, 0);
});
