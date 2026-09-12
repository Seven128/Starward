import assert from "node:assert/strict";
import test from "node:test";
import { nearestPanelExtent, panelReleaseVelocity, previousPanelExtent, releasePanelExtent, panelHeightProgress, readPanelSnapGeometry } from "./panel-snap";

test("system Back steps through panel extents before closing the small panel", () => {
  assert.equal(previousPanelExtent("large"), "medium");
  assert.equal(previousPanelExtent("medium"), "small");
  assert.equal(previousPanelExtent("small"), null);
});

test("native panel anchors validate ordering and project actual distances", () => {
  const geometry = readPanelSnapGeometry([480, 240, 360, 700].map(height => ({ height })))!;
  assert.ok(geometry);
  assert.equal(geometry.startHeight, 480);
  assert.equal(nearestPanelExtent(geometry, 680, "medium"), "large");
  assert.equal(nearestPanelExtent(geometry, 250, "large"), "small");
  assert.equal(nearestPanelExtent(geometry, 352, "medium"), "medium");
  assert.equal(nearestPanelExtent(geometry, 300, "medium"), "medium");
  assert.equal(panelHeightProgress(geometry, 360), 0.5);
  assert.equal(panelHeightProgress(geometry, 530), 0.75);
  assert.equal(panelHeightProgress(geometry, 900), 1);
  assert.equal(panelHeightProgress(geometry, 0), 0);
  for (const rows of [[], [null, {}, {}, {}], [100, 300, 200, 500].map(height => ({ height })), [100, 200, 200, 500].map(height => ({ height }))]) assert.equal(readPanelSnapGeometry(rows), null);
});


test("release uses recent velocity, ignores a held gesture and clamps anchor projection", () => {
  const geometry = { small: 220, medium: 350, large: 700, startHeight: 350 };
  assert.equal(releasePanelExtent(geometry, 390, "medium", -1), "large");
  assert.equal(releasePanelExtent(geometry, 320, "medium", 1), "small");
  assert.equal(releasePanelExtent(geometry, 390, "medium", 0), "medium");
  assert.equal(releasePanelExtent(geometry, 390, "medium", NaN), "medium");
  assert.equal(releasePanelExtent(geometry, 690, "large", -100), "large");
  assert.equal(panelReleaseVelocity([{ y: 100, at: 0 }, { y: 60, at: 40 }], 40), -1);
  assert.equal(panelReleaseVelocity([{ y: 100, at: 0 }, { y: 60, at: 40 }], 200), 0);
  assert.equal(panelReleaseVelocity([{ y: 100, at: 40 }, { y: 60, at: 40 }], 40), 0);
  assert.equal(panelReleaseVelocity([{ y: 0, at: 0 }, { y: 1000, at: 20 }], 20), 3);
});
