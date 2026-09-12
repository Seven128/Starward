import assert from "node:assert/strict";
import test from "node:test";
import { projectSpotPanelResource } from "./spot-panel-resource-projection";

test("a disabled formal-spot query does not render a perpetual loading or error state", () => {
  assert.deepEqual(projectSpotPanelResource(false, {
    isPending: true,
    error: new Error("stale query error"),
    refreshError: new Error("stale refresh error"),
    dataState: "STALE_USABLE",
  }), { pending: false, error: null, stale: false });
});

test("an enabled formal-spot query preserves its visible resource state", () => {
  const error = new Error("request failed");
  assert.deepEqual(projectSpotPanelResource(true, {
    isPending: false,
    error,
    refreshError: null,
    dataState: "STALE_USABLE",
  }), { pending: false, error, stale: true });
});
