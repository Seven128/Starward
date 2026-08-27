import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_FILTER_STATE,
  cloneFilterState,
} from "@starward/miniapp-contracts";
import { TEST_SPOTS } from "@starward/miniapp-contracts/test-fixtures";
import {
  addBoundedSearchHistory,
  applyFilterDraft,
  beginFilterDraft,
  cancelFilterDraft,
  enterObservationMode,
  exitObservationMode,
  restorePriorMode,
  restoreStartupMode,
  revertFilterDraft,
  toggleFavoriteRelation,
  toggleFilterDraft,
} from "./app-transitions";

test("filter draft is discarded on cancel and committed only on apply", () => {
  const initial = cloneFilterState(EMPTY_FILTER_STATE);
  const opened = beginFilterDraft(initial);
  const toggled = toggleFilterDraft(opened.draftFilters, "lightPollution");
  assert.deepEqual(toggled.draftFilters.LIGHT_POLLUTION, ["lightPollution"]);

  const cancelled = cancelFilterDraft(initial);
  assert.deepEqual(cancelled.draftFilters.LIGHT_POLLUTION, []);

  const reverted = revertFilterDraft(opened.filterSnapshot);
  assert.equal(reverted.filterSheetOpen, true);
  assert.deepEqual(reverted.draftFilters.LIGHT_POLLUTION, []);

  const applied = applyFilterDraft(toggled.draftFilters);
  assert.deepEqual(applied.committedFilters.LIGHT_POLLUTION, [
    "lightPollution",
  ]);
  assert.deepEqual(applied.filterSnapshot.LIGHT_POLLUTION, [
    "lightPollution",
  ]);
  assert.equal(applied.filterSheetOpen, false);
});

test("observation mode restores the exact prior day or night mode", () => {
  const entered = enterObservationMode("NIGHT");
  assert.equal(entered.mode, "OBSERVATION");
  assert.equal(entered.priorMode, "NIGHT");
  const exited = exitObservationMode("NIGHT", {
    defaultPlace: "深圳",
    locationPreference: "ASK_ONCE",
    experience: "BEGINNER",
    maxDriveMinutes: 180,
    requiredFacilities: [],
    equipment: "未设置",
    capturePreference: "目视",
    displayMode: "DAY",
    notificationEnabled: false,
    departureConditionReminder: false,
    contributionStatusReminder: false,
    largeText: false,
    reducedMotion: false,
  });
  assert.equal(exited.mode, "NIGHT");
  assert.equal(exited.preferences.displayMode, "NIGHT");
  assert.equal(restorePriorMode("OBSERVATION", "NIGHT"), "NIGHT");
  assert.equal(restorePriorMode("OBSERVATION"), "DAY");
  assert.equal(restoreStartupMode("OBSERVATION", "NIGHT"), "NIGHT");
  assert.equal(restoreStartupMode("OBSERVATION", "DAY"), "DAY");
  assert.equal(restoreStartupMode("NIGHT", "DAY"), "NIGHT");
  assert.equal(restoreStartupMode(undefined), "DAY");
});

test("search history is deduplicated, newest-first and bounded", () => {
  let history: string[] = [];
  for (let index = 0; index < 10; index += 1)
    history = addBoundedSearchHistory(history, `地点 ${index}`);
  history = addBoundedSearchHistory(history, "地点 5");
  assert.equal(history.length, 8);
  assert.equal(history[0], "地点 5");
  assert.equal(history.filter((item) => item === "地点 5").length, 1);
});

test("favorite state is a stable relation to a formal spot id", () => {
  const spotId = TEST_SPOTS[0]!.spotId;
  const added = toggleFavoriteRelation([], spotId);
  assert.equal(added.favorite, true);
  assert.deepEqual(added.favoriteIds, [spotId]);
  const removed = toggleFavoriteRelation(added.favoriteIds, spotId);
  assert.equal(removed.favorite, false);
  assert.deepEqual(removed.favoriteIds, []);
});
