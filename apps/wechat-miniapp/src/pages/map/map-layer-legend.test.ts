import assert from "node:assert/strict";
import test from "node:test";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_FIXED_SCALE, nightLightDisplayLegend, nightLightFixedLegend } from "@starward/miniapp-contracts";
import { projectMapLayerLegend, type MapLayerLegendData } from "./map-layer-legend";

function fixedLayer(): MapLayerLegendData {
  const policy = NIGHT_LIGHT_FIXED_SCALE;
  // Only the legend owner's consumed fields; not an API/publication fixture.
  return { kind: "LIGHT_POLLUTION", legend: nightLightFixedLegend(),
    raster: { methodVersion: policy.methodVersion, styleVersion: policy.styleVersion, unit: policy.unit } };
}

test("compact annual legend retains all five physical ranges and colours with one explicit shared unit", () => {
  const layer = fixedLayer(), before = structuredClone(layer);
  const result = projectMapLayerLegend(layer, "DAY");
  assert.equal(result.heading, "年度夜光 · nW/cm²/sr");
  assert.deepEqual(result.items.map(item => item.text), ["很低 · 0–0.5", "较低 · >0.5–2", "中等 · >2–10", "较高 · >10–40", "很高 · >40"]);
  assert.deepEqual(result.items.map(item => item.color), layer.legend.map(item => item.color));
  assert.deepEqual(layer, before, "display grouping must not change canonical scientific values");
});

test("confirmed contrast display uses its own colours without changing fixed scientific ranges", () => {
  const layer = fixedLayer();
  layer.raster!.styleVersion = NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion;
  layer.legend = nightLightDisplayLegend(NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion);
  const result = projectMapLayerLegend(layer, "DAY");
  assert.equal(result.heading, "年度夜光 · nW/cm²/sr");
  assert.deepEqual(result.items.map(item => item.text), projectMapLayerLegend(fixedLayer(), "DAY").items.map(item => item.text));
  assert.deepEqual(result.items.map(item => item.color), layer.legend.map(item => item.color));
  assert.notDeepEqual(result.items.map(item => item.color), nightLightFixedLegend().map(item => item.color));
});

test("unknown scale or changed content retains full labels and units without pretending to be the fixed five bands", () => {
  for (const change of [
    (layer: MapLayerLegendData) => { layer.raster!.methodVersion = "future-method"; },
    (layer: MapLayerLegendData) => { layer.raster!.styleVersion = "future-style"; },
    (layer: MapLayerLegendData) => { layer.legend = [{ ...layer.legend[0]!, range: "0–1 other-unit" }, ...layer.legend.slice(1)]; },
    (layer: MapLayerLegendData) => { layer.legend = [{ ...layer.legend[0]!, label: "其他含义" }, ...layer.legend.slice(1)]; },
    (layer: MapLayerLegendData) => { layer.legend = [{ ...layer.legend[0]!, color: "#ffffff" }, ...layer.legend.slice(1)]; },
    (layer: MapLayerLegendData) => { layer.legend = layer.legend.slice(1); },
  ]) {
    const layer = fixedLayer(); change(layer);
    const result = projectMapLayerLegend(layer, "DAY");
    assert.equal(result.heading, null);
    assert.deepEqual(result.items.map(item => item.text), layer.legend.map(item => `${item.label} · ${item.range}`));
  }
});

test("cloud, legacy relative light and absent coverage preserve their existing legend meaning", () => {
  const cloud: MapLayerLegendData = { kind: "CLOUD", legend: [{ label: "少云", color: "#5C8F97", range: "0–30%" }] };
  assert.deepEqual(projectMapLayerLegend(cloud, "DAY"), { heading: null, items: [{ text: "少云 · 0–30%", color: "#5C8F97" }] });
  const legacy: MapLayerLegendData = { kind: "LIGHT_POLLUTION", legend: [{ label: "相对较低", color: "#87714A", range: "本区间相对值" }] };
  assert.deepEqual(projectMapLayerLegend(legacy, "DAY"), { heading: null, items: [{ text: "相对较低", color: "#87714A" }] });
  assert.deepEqual(projectMapLayerLegend(null, "DAY"), { heading: null, items: [] });
  const empty = fixedLayer(); empty.legend = [];
  assert.deepEqual(projectMapLayerLegend(empty, "DAY"), { heading: null, items: [] });
});

test("the DAY-only adopted revision leaves NIGHT and OBSERVATION legends unchanged", () => {
  const layer = fixedLayer();
  const original = { heading: null, items: layer.legend.map(item => ({ color: item.color, text: `${item.label} · ${item.range}` })) };
  for (const mode of ["NIGHT", "OBSERVATION"] as const) assert.deepEqual(projectMapLayerLegend(layer, mode), original);
});
