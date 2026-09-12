import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("section requests are consumed once and never replay for another spot", () => {
  const source = ts.createSourceFile("panel.tsx", readFileSync(new URL("./spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let setup = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("handledSectionRequest")) setup = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(setup);
  const timers = new Map<number, () => void>(), anchors: string[] = [];
  const positions: (number | undefined)[] = [];
  let serial = 0;
  const context = {
    sectionRequest: { id: "spot-panel-astronomy-anchor", spotId: "spot:a" },
    handledSectionRequest: { current: null as unknown }, extent: "large", spot: { spotId: "spot:a" },
    setScrollAnchor: (value: string) => anchors.push(value),
    setRestoredScrollTop: (value: number | undefined) => positions.push(value), settling: false,
    setTimeout: (callback: () => void) => { timers.set(++serial, callback); return serial; },
    clearTimeout: (id: number) => timers.delete(id),
  };
  const effect = vm.runInNewContext(ts.transpileModule(`(${setup});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context) as () => (() => void) | undefined;
  const flush = () => { for (const [id, callback] of timers) { timers.delete(id); callback(); } };
  context.settling = true;
  effect(); flush();
  assert.equal(positions.length, 0, "do not scroll against an expanding viewport");
  assert.equal(context.handledSectionRequest.current, null, "retain the request until settling completes");
  context.settling = false;
  effect(); flush();
  assert.equal(anchors.at(-1), "spot-panel-astronomy-anchor", "chapter jump reserves the visible 44px navigation rail above its heading");
  assert.equal(positions.at(-1), undefined, "a chapter jump clears any restored numeric offset");
  context.extent = "medium"; effect();
  context.extent = "large"; effect();
  assert.equal(timers.size, 0);
  context.spot = { spotId: "spot:b" }; effect();
  assert.equal(timers.size, 0);
  context.sectionRequest = { id: "spot-panel-document-start", spotId: "spot:b" };
  context.extent = "medium"; effect(); flush();
  assert.equal(anchors.at(-1), "spot-panel-document-start");
  context.sectionRequest = { id: "spot-panel-overview", spotId: "spot:b" };
  context.extent = "large";
  const cleanup = effect(); cleanup?.();
  assert.equal(timers.size, 0);
});

test("panel sections follow cached document geometry and ignore cancelled measurements", () => {
  const source = ts.createSourceFile("panel.tsx", readFileSync(new URL("./spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let setup = "", scroll = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("astronomyOffset.current = null")) setup = node.arguments[0].getText(source);
    if (ts.isJsxAttribute(node) && node.name.getText(source) === "onScroll" && node.initializer && ts.isJsxExpression(node.initializer)) scroll = node.initializer.expression!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(setup && scroll);
  const offset = { current: null as number | null }, sections: string[] = [];
  const callbacks: ((results: unknown[]) => void)[] = [];
  const timers = new Map<number, () => void>();
  let timerId = 0;
  const flushTimers = () => { for (const [id, callback] of timers) { timers.delete(id); callback(); } };
  let queries = 0, layoutRefreshes = 0;
  const query = { select: () => query, boundingClientRect: () => query, scrollOffset: () => query, exec: (callback: (results: unknown[]) => void) => callbacks.push(callback) };
  const { measure, onScroll } = vm.runInNewContext(ts.transpileModule(`({ measure: ${setup}, onScroll: ${scroll} });`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    visible: true, spot: { spotId: "spot:a" }, lastScroll: { current: { spotId: "spot:a", top: 0 } },
    scrollMeasureTimer: { current: null }, setLayoutVersion: () => { layoutRefreshes++; },
    settling: false, extent: "large", astronomyOffset: offset, SECTION_NAV_REVEAL_PX: 44, setSection: (value: string) => sections.push(value),
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
    Taro: { nextTick: (callback: () => void) => callback(), createSelectorQuery: () => { queries++; return query; } },
  }) as { measure(): () => void; onScroll(event: { detail: { scrollTop: number } }): void };
  const cleanup = measure();
  assert.equal(queries, 0, "do not measure the still-animating viewport");
  flushTimers();
  callbacks.shift()!([{ top: 100 }, { top: 700 }, { scrollTop: 50 }, { height: 44 }]);
  assert.equal(offset.current, 650);
  for (const scrollTop of [300, 649, 650, 900, 100]) onScroll({ detail: { scrollTop } });
  assert.deepEqual(sections, ["spot-panel-overview", "spot-panel-overview", "spot-panel-astronomy", "spot-panel-astronomy", "spot-panel-astronomy", "spot-panel-overview"]);
  assert.equal(queries, 1);
  assert.equal(layoutRefreshes, 0, "scroll frames must not trigger layout queries");
  flushTimers();
  assert.equal(layoutRefreshes, 1, "one settled-scroll refresh reconciles native anchor/layout timing");
  cleanup();
  const prior = sections.length;
  onScroll({ detail: { scrollTop: 900 } });
  assert.equal(sections.length, prior);
  const cancel = measure(); flushTimers(); cancel();
  callbacks.shift()!([{ top: 0 }, { top: 1 }, { scrollTop: 9 }, { height: 44 }]);
  assert.equal(offset.current, null);
  assert.equal(sections.length, prior);
  measure();
  flushTimers();
  callbacks.shift()!([{ top: 100, height: 600 }, { top: 700 }, { scrollTop: 50 }, { height: 44 }]);
  assert.equal(offset.current, 650, "chapter navigation appears when the next chapter reaches the reading boundary below its 44px rail");
  onScroll({ detail: { scrollTop: 605 } });
  assert.equal(sections.at(-1), "spot-panel-overview");
  onScroll({ detail: { scrollTop: 606 } });
  assert.equal(sections.at(-1), "spot-panel-astronomy");
  onScroll({ detail: { scrollTop: 200 } });
  assert.equal(sections.at(-1), "spot-panel-overview");
  const beforeCancel = queries;
  const cancelBeforeLayout = measure();
  cancelBeforeLayout();
  flushTimers();
  assert.equal(queries, beforeCancel, "a closed panel must not issue its delayed query");
});

test("return restores the captured scroll position and cannot replay across spots", () => {
  const source = ts.createSourceFile("panel.tsx", readFileSync(new URL("./spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let setup = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("wasVisible.current")) setup = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(setup);
  const timers = new Map<number, () => void>();
  const restored: (number | undefined)[] = [];
  let serial = 0;
  const context = {
    visible: false, wasVisible: { current: true }, spot: { spotId: "spot:a" },
    lastScroll: { current: { spotId: "spot:a", top: 620 } },
    setScrollAnchor: () => {}, setRestoredScrollTop: (top: number | undefined) => restored.push(top),
    setTimeout: (callback: () => void) => { timers.set(++serial, callback); return serial; },
    clearTimeout: (id: number) => timers.delete(id),
  };
  const effect = vm.runInNewContext(ts.transpileModule(`(${setup});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context) as () => (() => void) | undefined;
  const flush = () => { for (const [id, callback] of timers) { timers.delete(id); callback(); } };
  effect(); assert.equal(restored.at(-1), undefined);
  context.visible = true; effect();
  context.lastScroll.current.top = 0; flush();
  assert.equal(restored.at(-1), 620, "a native show/reset event must not replace the captured position");
  context.visible = false; effect(); context.visible = true;
  const cancel = effect(); cancel?.(); assert.equal(timers.size, 0);
  context.visible = false; effect(); context.visible = true; context.spot.spotId = "spot:b";
  effect(); assert.equal(timers.size, 0, "another spot must not inherit the old offset");
});
