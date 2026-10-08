import assert from "node:assert/strict";
import test from "node:test";
import { panelSpringStyle, panelPresentationAtProgress, panelChromeTimeline, PANEL_CSS_STEPS } from "./panel-spring-style";
import { panelHeightProgress } from "./panel-snap";
const presentation = { geometry: { small: 220, medium: 350, large: 700, startHeight: 350 }, hasMedia: true };
test("CSS trajectory preserves endpoints, reversal and bounds without per-frame updates", () => {
  const frames = [{height: 350, offset: 0}, {height: 330, offset: .25}, {height: 700, offset: 1}];
  const style = panelSpringStyle(frames, 320, 1, presentation);
  assert.equal(style["--ph0"], "350px");
  assert.equal(style["--ph10"], "330px");
  assert.equal(style[`--ph${PANEL_CSS_STEPS}`], "700px");
  for (let i=0;i<=PANEL_CSS_STEPS;i++) { const height=parseFloat(style[`--ph${i}`]!); assert.ok(height>=330 && height<=700); }
  assert.equal(style["--psd"], "320ms");
  assert.notEqual(style["--phn"], panelSpringStyle(frames,320,2,presentation)["--phn"]);
});

test("release media, private spacing, image and chrome project the same live height through reversal", () => {
  const frames = [{ height: 350, offset: 0 }, { height: 630, offset: .25 }, { height: 700, offset: .5 }, { height: 350, offset: 1 }];
  const style = panelSpringStyle(frames, 400, 3, presentation);
  for (let i = 0; i <= PANEL_CSS_STEPS; i++) {
    const height = parseFloat(style[`--ph${i}`]!);
    const projected = panelPresentationAtProgress(panelHeightProgress(presentation.geometry, height), true);
    assert.equal(style[`--pmh${i}`], projected.style["--panel-media-height"]);
    assert.equal(style[`--pmr${i}`], String(projected.reveal));
    assert.equal(style[`--pmt${i}`], projected.style["--panel-media-margin-top"]);
    assert.equal(style[`--pmg${i}`], `${12 * projected.reveal}px`);
    assert.equal(style[`--pio${i}`], projected.style["--panel-media-image-offset"]);
    assert.equal(style[`--pis${i}`], projected.style["--panel-media-image-scale"]);
    assert.equal(style[`--pc${i}`], String(projected.chrome));
  }
  assert.equal(style["--pmr0"], "0"); assert.equal(style["--pc0"], "1");
  assert.equal(style["--pmr20"], "1"); assert.equal(style["--pc20"], "0");
  assert.equal(style["--pmr40"], "0"); assert.equal(style["--pc40"], "1");
  const noMedia = panelSpringStyle(frames, 400, 3, { ...presentation, hasMedia: false });
  for (let i = 0; i <= PANEL_CSS_STEPS; i++) { assert.equal(noMedia[`--pmh${i}`], "0rpx"); assert.equal(noMedia[`--pmr${i}`], "0"); }
});

test("media onset and chrome translation remain continuous and semantics follow every native opacity crossing", () => {
  assert.equal(panelPresentationAtProgress(.5, true).style["--panel-media-margin-top"], "0rpx");
  assert.ok(Math.abs(parseFloat(panelPresentationAtProgress(.501, true).style["--panel-media-margin-top"])) < .15);
  assert.ok(Math.abs(parseFloat(panelPresentationAtProgress(.88, true).style["--map-chrome-offset"]) + 5) < 1e-12);
  const style = panelSpringStyle([{height:350,offset:0},{height:700,offset:.5},{height:350,offset:1}], 280, 1, presentation);
  const timeline = panelChromeTimeline(style, 280);
  assert.deepEqual(timeline.map(frame => frame.hidden), [false, true, false]);
  for (const frame of timeline.slice(1)) {
    const index = frame.at / 280 * PANEL_CSS_STEPS;
    const left = Math.floor(index), fraction = index - left;
    const opacity = Number(style[`--pc${left}`]) * (1 - fraction) + Number(style[`--pc${left + 1}`]) * fraction;
    assert.ok(Math.abs(opacity - .08) < 1e-12, "retirement must occur at the opacity track's crossing, not the target extent");
  }
});
