import assert from "node:assert/strict";
import test from "node:test";
import {
  analysisLayerEnabled,
  toggleAnalysisLayer,
  independentMapLayerPolygons,
  lightLayerContentState,
  mapSceneLayerForOverlay,
} from "./map-layer-selection.ts";

test("each analysis layer toggles independently, including a genuinely empty selection", () => {
  let selection = toggleAnalysisLayer("NONE", "LIGHT");
  assert.equal(selection, "LIGHT");
  selection = toggleAnalysisLayer(selection, "TOTAL_CLOUD");
  assert.equal(selection, "LIGHT_AND_CLOUD");
  assert.equal(analysisLayerEnabled(selection, "LIGHT"), true);
  assert.equal(analysisLayerEnabled(selection, "TOTAL_CLOUD"), true);
  selection = toggleAnalysisLayer(selection, "LIGHT");
  assert.equal(selection, "TOTAL_CLOUD");
  selection = toggleAnalysisLayer(selection, "TOTAL_CLOUD");
  assert.equal(selection, "NONE");
  assert.equal(analysisLayerEnabled(selection, "LIGHT"), false);
  assert.equal(analysisLayerEnabled(selection, "TOTAL_CLOUD"), false);
  assert.equal(toggleAnalysisLayer("OPPORTUNITY", "LIGHT"), "LIGHT_AND_CLOUD", "legacy cloud meaning survives an independent toggle");
});

test("marker Scene does not duplicate independent overlay reads or send client composition as a service kind", () => {
  for (const selection of ["NONE", "LIGHT", "TOTAL_CLOUD", "OPPORTUNITY", "LIGHT_AND_CLOUD"] as const)
    assert.equal(mapSceneLayerForOverlay(selection), "NORMAL");
});

test("composition keeps static annual light and the exact cloud frame, then retires only the closed layer", () => {
  const polygon = (fillColor: string) => ({ points: [{ latitude: 1, longitude: 2 }], strokeColor: fillColor, fillColor, strokeWidth: 0 });
  const light = { kind: "LIGHT_POLLUTION", polygons: [polygon("annual")] } as any;
  const cloud = { kind: "CLOUD", polygons: [polygon("old-cloud")] } as any;
  const cloudFrame = { dynamicLayer: { kind: "CLOUD", state: "FRESH", polygons: [polygon("selected-hour")] } } as any;
  const render = (overlay: Parameters<typeof independentMapLayerPolygons>[0]["overlay"]) =>
    independentMapLayerPolygons({ overlay, light, cloud, cloudFrame });
  assert.deepEqual(render("LIGHT_AND_CLOUD").map(p => [p.fillColor, p.zIndex]), [["annual", 1], ["selected-hour", 2]]);
  assert.deepEqual(render("LIGHT").map(p => p.fillColor), ["annual"]);
  assert.deepEqual(render("TOTAL_CLOUD").map(p => p.fillColor), ["selected-hour"]);
  assert.deepEqual(render("NONE"), []);
  cloudFrame.dynamicLayer = null;
  assert.deepEqual(render("LIGHT_AND_CLOUD").map(p => p.fillColor), ["annual"], "unavailable cloud leaves independent annual light intact");
});

test("light layer keeps real empty, stale empty, and request failure distinct", () => {
  assert.equal(lightLayerContentState({ pending: false, failed: false, hasData: true, unavailable: true }), "EMPTY");
  assert.equal(lightLayerContentState({ pending: false, failed: true, hasData: true, unavailable: true }), "STALE");
  assert.equal(lightLayerContentState({ pending: false, failed: true, hasData: false, unavailable: false }), "ERROR");
  assert.equal(lightLayerContentState({ pending: true, failed: false, hasData: false, unavailable: false }), "LOADING");
  assert.equal(lightLayerContentState({ pending: false, failed: false, hasData: true, unavailable: false }), "READY");
});
