import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan, SpotId } from "@starward/miniapp-contracts";
import { planEditorTimezone } from "./plan-editor-timezone";

const spot = (spotId: string, timezone: "Asia/Shanghai" | "Asia/Hong_Kong") => ({ spotId: spotId as SpotId, timezone });
const saved = { spotId: "spot:main" as SpotId, contextSnapshot: { timezone: "Asia/Shanghai" } } as ObservationPlan;

test("editing uses the selected destination's timezone for the visible time label and validation", () => {
  const timezone = planEditorTimezone({
    editing: true,
    selectedSpotId: "spot:hk" as SpotId,
    formalSpots: [spot("spot:main", "Asia/Shanghai"), spot("spot:hk", "Asia/Hong_Kong")],
    activePlan: saved,
    contextTimezone: "Asia/Shanghai",
    contextSpotId: saved.spotId,
  });
  assert.equal(timezone, "Asia/Hong_Kong");
});

test("saved plan display and temporarily unavailable destination retain the saved timezone", () => {
  for (const editing of [false, true]) {
    assert.equal(planEditorTimezone({ editing, selectedSpotId: saved.spotId, formalSpots: [], activePlan: saved, contextTimezone: "Asia/Hong_Kong", contextSpotId: null }), "Asia/Shanghai");
  }
});

test("an unselected new plan and an unrelated context never claim a destination timezone", () => {
  assert.equal(planEditorTimezone({ editing: true, selectedSpotId: null, formalSpots: [spot("spot:main", "Asia/Shanghai")], activePlan: null, contextTimezone: "Asia/Hong_Kong", contextSpotId: null }), null);
  assert.equal(planEditorTimezone({ editing: true, selectedSpotId: "spot:other" as SpotId, formalSpots: [], activePlan: saved, contextTimezone: "Asia/Hong_Kong", contextSpotId: saved.spotId }), null);
});

test("a matching formal observation context can supply the selected spot timezone while its list is unavailable", () => {
  assert.equal(planEditorTimezone({ editing: true, selectedSpotId: "spot:hk" as SpotId, formalSpots: [], activePlan: null, contextTimezone: "Asia/Hong_Kong", contextSpotId: "spot:hk" as SpotId }), "Asia/Hong_Kong");
});
