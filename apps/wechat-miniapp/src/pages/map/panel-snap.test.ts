import assert from "node:assert/strict";
import test from "node:test";
import { nearestPanelExtent, panelIdentityMinimumHeight, panelReleaseStartHeight, panelReleaseVelocity, previousPanelExtent, releasePanelExtent, panelHeightProgress, readPanelSnapGeometry } from "./panel-snap";

test("small anchor reserves complete native identity above fixed actions", () => {
  // The escaped WEAPP case: 156px obscured the address under the 50px action lane.
  assert.equal(panelIdentityMinimumHeight([{ height: 20 }, { height: 102.1 }, { height: 50 }]), 181);
  // A wrapped title or extra status must extend the content floor, not truncate it.
  assert.equal(panelIdentityMinimumHeight([{ height: 20 }, { height: 162.1 }, { height: 50 }]), 241);
  assert.equal(panelIdentityMinimumHeight([{ height: 20 }, { height: 64 }, { height: 50 }]), 142);
  for (const rows of [[], [null, {}, {}], [20, 0, 50], [20, NaN, 50], [20, -1, 50]]) {
    assert.equal(panelIdentityMinimumHeight(Array.isArray(rows) && typeof rows[0] === "number" ? rows.map(height => ({ height })) : rows), null);
  }
});

test("formal small anchor includes the actual plan, recovery and route span above fixed actions", () => {
  const rows = [
    { top: 400, height: 20 },
    { top: 420, height: 78 },
    { height: 50 },
    { top: 572, height: 66.5 },
  ];
  assert.equal(panelIdentityMinimumHeight(rows), 297,
    "the plan entry and its gaps between identity and route cannot disappear from the small floor");
  for (const extra of [30, 60, 160]) {
    assert.equal(panelIdentityMinimumHeight([rows[0], rows[1], rows[2], { top: 572 + extra, height: 66.5 }]), 297 + extra,
      "wrapped plan labels and real recovery cards extend the measured prefix");
  }
  assert.equal(panelIdentityMinimumHeight([rows[0], { top: 420, height: 138 }, rows[2], { top: 632, height: 66.5 }]), 357);
  assert.equal(panelIdentityMinimumHeight([rows[0], rows[1], rows[2], { top: 572, height: 106.5 }]), 337,
    "wrapped route facts remain above the action lane");
  assert.equal(panelIdentityMinimumHeight(rows.map((row, index) => index === 2 ? row : { ...row, top: row.top! - 800 })), 297,
    "scrolling the retained document changes coordinates, not its content floor");
  for (const route of [null, { top: NaN, height: 66 }, { top: 490, height: 66 }, { top: 572, height: 0 }]) {
    assert.equal(panelIdentityMinimumHeight([...rows.slice(0, 3), route]), null,
      "a formal point cannot install an identity-only floor when its required route measurement is invalid");
  }
});

test("release starts at the last bounded drag frame when native measurement is stale", () => {
  const geometry = { small: 156, medium: 368, large: 661, startHeight: 368 };
  assert.equal(panelReleaseStartHeight(geometry, 661, 700), 661);
  assert.equal(panelReleaseStartHeight(geometry, 608, 368), 608);
  assert.equal(panelReleaseStartHeight(geometry, 608, 609), 609);
  assert.equal(panelReleaseStartHeight(geometry, 661, undefined), 661);
  assert.equal(panelReleaseStartHeight(geometry, 132, 156), 132,
    "a stale small anchor cannot erase the currently drawn lower pull");
  assert.equal(panelReleaseStartHeight(geometry, 132, 132), 132);
});

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
