import assert from "node:assert/strict";
import test from "node:test";
import { shouldOpenSpotForSelection } from "./spot-open-intent.ts";

test("reselecting the same formal spot is an open intent that restores medium", () => {
  const ready = {
    bottomPresentation: "spot-panel",
    detailContextReady: true,
    contextKind: "FORMAL_SPOT",
    contextSpotId: "spot:a",
    selectedSpotId: "spot:a",
  };
  assert.equal(shouldOpenSpotForSelection({ ...ready, explicitOpenRequested: false }), false);
  assert.equal(shouldOpenSpotForSelection({ ...ready, explicitOpenRequested: true }), true);
  assert.equal(shouldOpenSpotForSelection({ ...ready, explicitOpenRequested: false, bottomPresentation: "layer-sheet" }), false);
  assert.equal(shouldOpenSpotForSelection({ ...ready, explicitOpenRequested: false, bottomPresentation: "spot-editor" }), false);
  assert.equal(shouldOpenSpotForSelection({ ...ready, explicitOpenRequested: true, bottomPresentation: "layer-sheet" }), true);
});
