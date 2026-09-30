import { panelDragHeight, panelSpringFrames } from "./panel-spring";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { panelReleaseStartHeight, panelReleaseVelocity, releasePanelExtent, readPanelSnapGeometry, type PanelSnapGeometry } from "./panel-snap";
import { elasticVelocityFactor } from "@/components/elastic-motion";

test("panel cancellation and multi-touch never commit a pending drag", () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["onHandleTouchStart", "onHandleTouchMove", "onHandleTouchEnd", "onHandleTouchCancel", "animatePanelExtent", "onPanelExtent"];
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, names.length);
  const commits: string[] = [], offsets: number[] = [];
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
  const handlers = vm.runInNewContext(ts.transpileModule(`(() => { ${declarations.join("\n")} return { ${names.join(",")} }; })()`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    Date: { now: () => now },
    stopPanelSpring: () => {}, panelSpringFrames,
    springTarget: { current: null }, springRequest: { current: 0 }, setPanelSettling: () => {},
    panelSpring: { current: { start: (_host: unknown, _frames: unknown, complete: () => void) => complete() } },
    panelSpringStyle: () => ({}), panelCssSequence: { current: 0 }, setPanelCssMotion: () => {},
    useAppStore: { getState: () => ({ preferences: { reducedMotion: false } }) },
    panelDrag: { current: null }, panelSnapCache, panelGeometryIdentity: "formal:spot:a", panelViewportSize: () => ({ width: 390, height: 844 }), bottomPresentation: "spot-panel", panelExtent: "medium", panelSettling: false,
    setPanelExtent: (value: string) => commits.push(value), setPanelDragOffset: (value: number) => offsets.push(value),
    setPanelDragging: (value: boolean) => { dragging = value; },
    Taro: { createSelectorQuery: () => query, nextTick: () => {}, getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844 }) }, panelDragHeight, panelReleaseStartHeight, panelReleaseVelocity, releasePanelExtent, readPanelSnapGeometry, elasticVelocityFactor,
  }) as Record<string, (event?: unknown) => void>;
  const touch = (y: number, count = 1) => ({ touches: Array.from({ length: count }, () => ({ clientY: y })) });
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
});
