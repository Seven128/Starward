import assert from "node:assert/strict";
import test from "node:test";
import { NIGHT_LIGHT_FIXED_SCALE, nightLightFixedLegend } from "./night-light-fixed-scale.ts";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_LEGACY_DISPLAY, isNightLightDisplayStyle,
  nightLightDisplayBands, nightLightDisplayLegend } from "./night-light-display.ts";

test("display styles share fixed scientific bands while the default retains the original legend", () => {
  assert.equal(NIGHT_LIGHT_LEGACY_DISPLAY, NIGHT_LIGHT_FIXED_SCALE.styleVersion);
  assert.deepEqual(nightLightDisplayLegend(), nightLightFixedLegend());
  const contrasted = nightLightDisplayBands(NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion);
  assert.deepEqual(contrasted.map(({ id, label, range }) => ({ id, label, range })),
    NIGHT_LIGHT_FIXED_SCALE.bands.map(({ id, label, range }) => ({ id, label, range })));
  assert.deepEqual(nightLightDisplayLegend(NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion).map(item => item.range),
    nightLightFixedLegend().map(item => item.range));
});

test("contrast classes remain distinguishable from one another and from transparent missing data", () => {
  const bands = nightLightDisplayBands(NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion);
  assert.equal(new Set(bands.map(band => band.color)).size, 5);
  for (const [index, band] of bands.entries()) {
    assert.match(band.color, /^#[A-F0-9]{6}$/u);
    assert.ok(Number.isInteger(band.alpha) && band.alpha > 0 && band.alpha < 255);
    if (index) assert.ok(band.alpha > bands[index - 1]!.alpha);
  }
  assert.ok(bands[0]!.alpha < NIGHT_LIGHT_FIXED_SCALE.alpha, "valid low radiance must stop dominating the basemap");
});

test("unsupported display names do not silently acquire the contrast interpretation", () => {
  for (const value of [null, undefined, "", "future-style", [NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion], {}])
    assert.equal(isNightLightDisplayStyle(value), false);
  assert.throws(() => nightLightDisplayBands("future-style" as never), /nightlight_display_style_invalid/u);
});
