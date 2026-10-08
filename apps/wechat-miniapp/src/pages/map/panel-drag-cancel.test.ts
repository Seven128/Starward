import { panelDragHeight, panelDragOriginHeight, panelSpringFrames, type PanelSpringFrame } from "./panel-spring";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { panelReleaseStartHeight, panelReleaseVelocity, releasePanelExtent, readPanelSnapGeometry, type PanelSnapGeometry } from "./panel-snap";
import { elasticVelocityFactor } from "@/components/elastic-motion";

test("panel cancellation and multi-touch never commit a pending drag", async t => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["onHandleTouchStart", "onHandleTouchMove", "onHandleTouchEnd", "onHandleTouchCancel", "invalidatePanelGeometry", "animatePanelExtent", "onPanelExtent"];
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, names.length);
  const commits: string[] = [], offsets: number[] = [];
  const springs: PanelSpringFrame[][] = [];
  let dragging = false;
  let now = 0;
  let delayed = false;
  const pending: ((rows: unknown[]) => void)[] = [];
  const geometryRows = [{ height: 350 }, { height: 220 }, { height: 350 }, { height: 700 }];
  let selectedNodes = 0;
  const panelSnapCache = { current: null as null | { identity: string; width: number; height: number; geometry: PanelSnapGeometry } };
  const query = { select: () => { selectedNodes++; return query; }, boundingClientRect: () => query, exec: (callback: (rows: unknown[]) => void) => {
    const panelOnly = selectedNodes === 1;
    selectedNodes = 0;
    const deliver = (rows: unknown[]) => callback(panelOnly
      ? [{ height: geometryRows[0]!.height - (offsets.at(-1) ?? 0) }]
      : rows);
    if (delayed) pending.push(deliver); else deliver(geometryRows);
  } };
  const environment = {
    Date: { now: () => now },
    stopPanelSpring: () => {}, panelSpringFrames,
    springTarget: { current: null }, springRequest: { current: 0 }, setPanelSettling: () => {},
    panelSpring: { current: { start: (_host: unknown, frames: PanelSpringFrame[], complete: () => void) => { springs.push(frames); complete(); } } },
    panelSpringStyle: () => ({}), panelCssSequence: { current: 0 }, setPanelCssMotion: () => {},
    getReducedMotion: () => false, panelHasMedia: true,
    panelDrag: { current: null }, panelSnapCache, panelGeometryIdentity: "formal:spot:a", panelViewportSize: () => ({ width: 390, height: 844 }), bottomPresentation: "spot-panel", panelExtent: "medium", panelSettling: false,
    setPanelExtent: (value: string) => commits.push(value), setPanelDragOffset: (value: number) => offsets.push(value),
    setPanelDragging: (value: boolean) => { dragging = value; },
    Taro: { createSelectorQuery: () => query, nextTick: () => {}, getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844 }) }, panelDragHeight, panelDragOriginHeight, panelReleaseStartHeight, panelReleaseVelocity, releasePanelExtent, readPanelSnapGeometry, elasticVelocityFactor,
  };
  const handlers = vm.runInNewContext(ts.transpileModule(`(() => { ${declarations.join("\n")} return { ${names.join(",")} }; })()`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, environment) as Record<string, (event?: unknown) => void>;
  const touch = (y: number, count = 1) => ({ touches: Array.from({ length: count }, () => ({ clientY: y })) });
  await t.test("handle owns document scrolling while initial geometry is still pending", () => {
    delayed = true;
    handlers.onHandleTouchStart!(touch(100));
    try {
      assert.equal(dragging, true, "the native document must stop scrolling from the accepted handle start");
    } finally {
      handlers.onHandleTouchCancel!();
      pending.shift()!(geometryRows);
      delayed = false;
    }
    assert.equal(dragging, false, "cancellation releases scrolling and late geometry cannot reacquire it");
  });
  await t.test("identity layout or resize retires an in-flight drag before new anchors", () => {
    delayed = true;
    handlers.onHandleTouchStart!(touch(100));
    handlers.onHandleTouchMove!(touch(60));
    handlers.invalidatePanelGeometry!();
    pending.shift()!(geometryRows);
    handlers.onHandleTouchEnd!();
    assert.equal(dragging, false);
    assert.equal(offsets.at(-1), 0);
    assert.equal(panelSnapCache.current, null);
    assert.deepEqual(commits, [], "late geometry and release must not commit against the retired layout");
    delayed = false;
  });
  for (const cancellation of ["cancel", "second-finger", "multi-start"]) {
    handlers.onHandleTouchStart!(touch(100, cancellation === "multi-start" ? 2 : 1));
    handlers.onHandleTouchMove!(touch(60));
    if (cancellation === "cancel") handlers.onHandleTouchCancel!();
    if (cancellation === "second-finger") handlers.onHandleTouchMove!(touch(40, 2));
    handlers.onHandleTouchEnd!();
    assert.deepEqual(commits, []);
    assert.equal(offsets.at(-1), 0);
  }
  delayed = true;
  panelSnapCache.current = null;
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(-400));
  pending.shift()!(geometryRows);
  assert.equal(offsets.at(-1), geometryRows[2]!.height - geometryRows[3]!.height,
    "a fast move before native geometry returns cannot render above the large top stop");
  handlers.onHandleTouchCancel!();
  delayed = false;
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(-100));
  const visibleOffset = offsets.at(-1);
  assert.ok(visibleOffset! < 0);
  delayed = true;
  panelSnapCache.current = null;
  handlers.onHandleTouchStart!(touch(100));
  assert.equal(offsets.at(-1), visibleOffset, "a second touch keeps the visible frame until native geometry arrives");
  assert.equal(dragging, true);
  handlers.onHandleTouchCancel!();
  pending.shift()!(geometryRows);
  delayed = false;
  assert.equal(offsets.at(-1), 0);
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(93));
  assert.equal(offsets.at(-1), 0, "sub-threshold motion does not move the panel");
  handlers.onHandleTouchEnd!();
  assert.deepEqual(commits, []);
  handlers.onHandleTouchStart!({ touches: [{ clientY: 100, identifier: 1 }] });
  handlers.onHandleTouchMove!({ touches: [{ clientY: 60, identifier: 2 }] });
  handlers.onHandleTouchEnd!();
  assert.deepEqual(commits, [], "replacement touch cannot take over a drag");
  assert.equal(offsets.at(-1), 0);
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(70));
  handlers.onHandleTouchMove!(touch(100));
  assert.equal(offsets.at(-1), 0);
  assert.equal(dragging, true, "returning to origin keeps the active drag free of settling animation");
  handlers.onHandleTouchEnd!();
  assert.equal(dragging, false);
  assert.deepEqual(commits, []);
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(-200));
  handlers.onHandleTouchEnd!();
  assert.deepEqual(commits, ["large"]);
  delayed = true;
  panelSnapCache.current = null;
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(-200));
  handlers.onHandleTouchCancel!();
  pending.shift()!(geometryRows);
  handlers.onHandleTouchEnd!();
  assert.deepEqual(commits, ["large"], "late geometry cannot revive a cancelled gesture");
  panelSnapCache.current = null;
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(-200));
  handlers.onHandleTouchEnd!();
  assert.deepEqual(commits, ["large"], "release waits for pending native geometry");
  handlers.onHandleTouchMove!(touch(500));
  pending.shift()!(geometryRows);
  pending.shift()!(geometryRows);
  assert.equal(commits.length, 2, "a still-current release completes once geometry arrives");
  delayed = false;
  handlers.onHandleTouchStart!({ touches: [{ clientY: 100, identifier: 3 }] });
  handlers.onHandleTouchMove!({ touches: [{ clientY: 80, identifier: 3 }] });
  handlers.onHandleTouchEnd!({ changedTouches: [{ clientY: 500, identifier: 2 }] });
  assert.equal(commits.length, 2, "another finger's release cannot finish this drag");
  handlers.onHandleTouchEnd!({ changedTouches: [{ clientY: -200, identifier: 3 }] });
  assert.equal(commits.length, 3, "final release completes the matching gesture once");
  const countBeforeHorizontal = commits.length;
  handlers.onHandleTouchStart!({ touches: [{ clientX: 100, clientY: 100 }] });
  handlers.onHandleTouchMove!({ touches: [{ clientX: 140, clientY: 80 }] });
  handlers.onHandleTouchMove!({ touches: [{ clientX: 140, clientY: -300 }] });
  handlers.onHandleTouchEnd!();
  assert.equal(commits.length, countBeforeHorizontal, "horizontal intent cannot later become panel drag");
  handlers.onHandleTouchStart!({ touches: [{ clientX: 100, clientY: 100 }] });
  handlers.onHandleTouchEnd!({ changedTouches: [{ clientX: 500, clientY: -200 }] });
  assert.equal(commits.length, countBeforeHorizontal, "release without move events still rejects horizontal intent");
  handlers.onHandleTouchStart!({ touches: [{ clientX: 100, clientY: 100 }] });
  handlers.onHandleTouchMove!({ touches: [{ clientX: 102, clientY: 70 }] });
  handlers.onHandleTouchMove!({ touches: [{ clientX: 500, clientY: -200 }] });
  handlers.onHandleTouchEnd!();
  assert.equal(commits.length, countBeforeHorizontal + 1, "confirmed vertical drag retains ownership after lateral movement");
  now = 1000;
  handlers.onHandleTouchStart!(touch(100));
  now = 1020;
  handlers.onHandleTouchMove!(touch(70));
  handlers.onHandleTouchEnd!();
  assert.equal(commits.at(-1), "large", "short fast upward release uses momentum in the production handler");
  now = 2000;
  handlers.onHandleTouchStart!(touch(100));
  now = 2020;
  handlers.onHandleTouchMove!(touch(70));
  now = 2250;
  handlers.onHandleTouchEnd!();
  assert.equal(commits.at(-1), "medium", "holding before release discards old momentum");
  geometryRows[0]!.height = 480;
  panelSnapCache.current = null;
  now = 3000;
  handlers.onHandleTouchStart!(touch(100));
  assert.equal(offsets.at(-1), -130, "re-grab freezes the measured intermediate height rather than the logical anchor");
  now = 3100;
  handlers.onHandleTouchMove!(touch(80));
  assert.equal(offsets.at(-1), -150, "continued drag stays attached to the measured presentation height");
  handlers.onHandleTouchCancel!();
  delayed = true;
  pending.length = 0;
  panelSnapCache.current = { identity: "formal:spot:a", width: 390, height: 844, geometry: { small: 220, medium: 350, large: 700, startHeight: 350 } };
  handlers.onHandleTouchStart!(touch(100));
  handlers.onHandleTouchMove!(touch(70));
  assert.equal(offsets.at(-1), -30, "a warmed resting panel must follow the first native move before another geometry callback");
  handlers.onHandleTouchCancel!();
  pending.length = 0;
  geometryRows[0]!.height = 350;
  delayed = true;
  const beforeSupersededExtent = commits.length;
  handlers.onPanelExtent!("large");
  handlers.onPanelExtent!("medium");
  pending.shift()!(geometryRows);
  assert.equal(commits.length, beforeSupersededExtent, "choosing the current extent cancels an older pending expansion");
  const panel = readFileSync(new URL("./spot-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /onTouchCancel=\{onHandleTouchCancel\}/u);

  for (const geometrySource of ["cached", "immediate", "delayed"] as const) {
    await t.test(`small downward drag resists with ${geometrySource} geometry and releases continuously`, () => {
      environment.panelExtent = "small";
      geometryRows[0]!.height = 220;
      delayed = geometrySource === "delayed";
      pending.length = 0;
      panelSnapCache.current = geometrySource === "cached"
        ? { identity: "formal:spot:a", width: 390, height: 844, geometry: { small: 220, medium: 350, large: 700, startHeight: 220 } }
        : null;
      const commitCount = commits.length;
      now += 1000;
      handlers.onHandleTouchStart!(touch(100));
      now += 40;
      handlers.onHandleTouchMove!(touch(260));
      if (delayed) pending.shift()!(geometryRows);
      const firstPull = offsets.at(-1)!;
      assert.ok(firstPull > 0 && firstPull < 72 && firstPull < 160, "small follows a downward pull with bounded resistance");
      now += 40;
      handlers.onHandleTouchMove!(touch(500));
      assert.ok(offsets.at(-1)! > firstPull && offsets.at(-1)! < 72, "further pulling approaches the bound without crossing it");
      now += 40;
      handlers.onHandleTouchMove!(touch(80));
      assert.equal(offsets.at(-1), -20, "reversing upward follows the pointer without a dead zone");
      now += 40;
      handlers.onHandleTouchMove!(touch(130));
      assert.ok(offsets.at(-1)! > 0 && offsets.at(-1)! < 30, "reversing down resumes resistance without hiding the panel");
      const releaseHeight = 220 - offsets.at(-1)!;
      const springCount = springs.length;
      now += 150;
      handlers.onHandleTouchEnd!();
      if (delayed) pending.shift()!(geometryRows);
      assert.equal(commits.length, commitCount + 1);
      assert.equal(commits.at(-1), "small", "release below small returns to small and never closes");
      assert.equal(springs.length, springCount + 1);
      const frames = springs.at(-1)!;
      assert.equal(frames[0]!.height, releaseHeight, "the first spring frame equals the last drawn compressed height");
      assert.equal(frames.at(-1)!.height, 220);
      assert.ok(frames.every(frame => frame.height >= releaseHeight && frame.height <= 220));
      assert.equal(offsets.at(-1), 0);
    });
  }
  await t.test("an interrupted collapse can be re-grabbed above small and continues into lower resistance", () => {
    environment.panelExtent = "small";
    environment.panelSettling = true;
    delayed = false;
    geometryRows[0]!.height = 300;
    panelSnapCache.current = null;
    handlers.onHandleTouchStart!(touch(100));
    assert.equal(offsets.at(-1), -80, "re-grab keeps the intermediate native height");
    handlers.onHandleTouchMove!(touch(120));
    assert.equal(offsets.at(-1), -60, "downward movement above small remains available");
    handlers.onHandleTouchMove!(touch(260));
    assert.ok(offsets.at(-1)! > 0 && offsets.at(-1)! < 72, "the same gesture crosses small with bounded resistance");
    handlers.onHandleTouchCancel!();
  });
  await t.test("re-grabbing below small preserves the live frame and permits reversal", () => {
    environment.panelExtent = "small";
    environment.panelSettling = true;
    delayed = false;
    geometryRows[0]!.height = 184;
    panelSnapCache.current = null;
    handlers.onHandleTouchStart!(touch(100));
    assert.equal(offsets.at(-1), 36, "the compressed frame is not resisted a second time at touch-down");
    handlers.onHandleTouchMove!(touch(110));
    assert.ok(offsets.at(-1)! > 36 && offsets.at(-1)! < 46, "continued downward movement starts at the recovered physical origin");
    handlers.onHandleTouchMove!(touch(10));
    assert.equal(offsets.at(-1), -18, "upward reversal crosses small without a new origin or dead zone");
    const countBeforeCancel = commits.length;
    handlers.onHandleTouchCancel!();
    assert.equal(offsets.at(-1), 0);
    assert.equal(commits.length, countBeforeCancel);
  });
  await t.test("re-grabbing below small without moving resumes the original anchor continuously", () => {
    environment.panelExtent = "small";
    environment.panelSettling = true;
    delayed = false;
    geometryRows[0]!.height = 184;
    panelSnapCache.current = null;
    handlers.onHandleTouchStart!(touch(100));
    assert.equal(offsets.at(-1), 36);
    const springCount = springs.length;
    handlers.onHandleTouchEnd!();
    assert.equal(springs.length, springCount + 1, "touch-down interrupts the return but cannot erase its remaining distance");
    assert.equal(springs.at(-1)![0]!.height, 184);
    assert.equal(springs.at(-1)!.at(-1)!.height, 220);
  });
  await t.test("a release preceding re-grab geometry starts from the native frame that was drawn", () => {
    environment.panelExtent = "small";
    environment.panelSettling = true;
    delayed = true;
    pending.length = 0;
    geometryRows[0]!.height = 184;
    panelSnapCache.current = null;
    const springCount = springs.length;
    now += 1000;
    handlers.onHandleTouchStart!(touch(100));
    now += 100;
    handlers.onHandleTouchMove!(touch(110));
    handlers.onHandleTouchEnd!();
    pending.shift()!(geometryRows);
    pending.shift()!(geometryRows);
    assert.equal(springs.length, springCount + 1);
    assert.equal(springs.at(-1)![0]!.height, 184, "an undrawn pointer sample cannot replace the live compressed height");
    assert.equal(springs.at(-1)!.at(-1)!.height, 220);
    delayed = false;
  });
});
