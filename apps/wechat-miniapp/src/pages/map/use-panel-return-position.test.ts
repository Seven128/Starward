import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import type { MapPanelReturnPosition } from "./sky-return-state";

/** This checks production scroll commands; it does not simulate native layout. */
function hookHarness(restorePosition: MapPanelReturnPosition) {
  const cells: any[] = [];
  let cursor = 0, dirty = false;
  const effects: (() => void)[] = [];
  const ticks: (() => void)[] = [], queries: ((results: unknown[]) => void)[] = [];
  const commands: number[] = [];
  let nativeTop = restorePosition.top;
  let nativeBlocks = [{ id: "moon-source", top: 2200, height: 44 }];
  let layout: { scrollId: string; inset: number; revision: object } | undefined;
  const taro = {
    nextTick(callback: () => void) { ticks.push(callback); },
    createSelectorQuery() {
      const query = { select() { return query; }, selectAll() { return query; }, boundingClientRect() { return query; },
        scrollOffset() { return query; }, node() { return query; }, exec(callback: (results: unknown[]) => void) { queries.push(callback); } };
      return query;
    },
  };
  const equal = (a: unknown[] | undefined, b: unknown[]) => Boolean(a && a.length === b.length && a.every((x, i) => Object.is(x, b[i])));
  const react = {
    useRef(initial: unknown) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useState(initial: unknown) {
      const i = cursor++; cells[i] ??= { value: initial };
      return [cells[i].value, (next: unknown) => {
        if (Object.is(next, cells[i].value)) return;
        cells[i].value = next; dirty = true;
      }];
    },
    useCallback(callback: unknown) { return callback; },
    useEffect(callback: () => void, deps: unknown[]) {
      const i = cursor++;
      if (!equal(cells[i]?.deps, deps)) {
        const previous = cells[i]; cells[i] = { deps };
        effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = callback(); });
      }
    },
  };
  const evaluate = (path: string, dependencies: Record<string, unknown>) => {
    const exports: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText, { exports, setTimeout, clearTimeout, require: (name: string) => dependencies[name] ?? {} });
    return exports;
  };
  const shared = evaluate("../../components/spot-media-gallery-position.ts", { react });
  const { usePanelReturnPosition } = evaluate("./use-panel-return-position.ts", {
    react, "@tarojs/taro": { default: taro }, "@/components/spot-media-gallery-position": shared,
  });
  const records: MapPanelReturnPosition[] = [];
  let identity = restorePosition.identity, galleryIdentity = restorePosition.galleryIdentity, ready = false, visible = true;
  return {
    records,
    commands,
    unmount() { cells.forEach(cell => cell?.cleanup?.()); },
    setLayout(top: number, anchors = nativeBlocks) {
      nativeTop = top; nativeBlocks = anchors;
      layout = { scrollId: "document", inset: 40, revision: {} };
    },
    async flushNative() {
      ticks.splice(0).forEach(callback => callback());
      queries.splice(0).forEach(callback => callback([
        { top: 100 }, { scrollTop: nativeTop }, nativeBlocks.map(block => ({ ...block, top: block.top - nativeTop + 100 })),
        { node: { scrollTo({ top }: { top: number }) { commands.push(top); nativeTop = top; } } },
      ]));
      await Promise.resolve();
    },
    setReady(value: boolean) { ready = value; },
    setVisible(value: boolean) { visible = value; },
    setIdentity(value: string, gallery: string) { identity = value; galleryIdentity = gallery; },
    render() {
      let owner: any;
      for (let attempt = 0; attempt < 10; attempt++) {
        cursor = 0; dirty = false;
        owner = usePanelReturnPosition(identity, galleryIdentity, { restorePosition, ready, visible, layout,
          onPositionChange: (value: MapPanelReturnPosition) => records.push({ ...value }) });
        effects.splice(0).forEach(effect => effect());
        if (!dirty) return owner;
      }
      assert.fail("hook did not settle");
    },
  };
}

const position = { identity: "spot:a", top: 471.5, galleryIdentity: "spot:a:one|two", left: 198.3 };

test("an unmounted panel cannot overwrite the next owner's saved document or finish source navigation", async () => {
  const h = hookHarness(position); h.setReady(true);
  const departed = h.render();
  departed.document.record(position.top); departed.gallery.onScroll({ detail: { scrollLeft: position.left } });
  departed.document.record(740); departed.gallery.onScroll({ detail: { scrollLeft: 250 } });
  h.setLayout(740);
  const pendingSource = departed.document.prepareSourceNavigation();
  const count = h.records.length;
  h.unmount();
  departed.document.takeOver();
  assert.equal(departed.document.record(0), false);
  assert.equal(departed.gallery.onScroll({ detail: { scrollLeft: 0 } }), false);
  assert.equal(await pendingSource, false);
  await h.flushNative();
  assert.equal(h.records.length, count);
  assert.equal(h.records.at(-1)?.top, 740); assert.equal(h.records.at(-1)?.left, 250);
});

test("the remounted panel waits for its content then restores both scroll axes once", () => {
  const h = hookHarness(position);
  let owner = h.render();
  assert.equal(owner.document.returnTop, undefined);
  assert.equal(owner.gallery.returnLeft, 0);
  owner.document.record(0); owner.gallery.onScroll({ detail: { scrollLeft: 0 } });
  assert.equal(h.records.length, 0, "empty first-layout events cannot overwrite the suspended reading position");
  h.setReady(true); owner = h.render();
  assert.equal(owner.document.returnTop, position.top);
  assert.equal(owner.gallery.returnLeft, position.left);
  owner.document.record(position.top); owner.gallery.onScroll({ detail: { scrollLeft: position.left } });
  owner.document.record(600); owner.gallery.onScroll({ detail: { scrollLeft: 240 } });
  h.setReady(false); h.render(); h.setReady(true); owner = h.render();
  assert.equal(h.records.at(-1)?.top, 600);
  assert.equal(h.records.at(-1)?.left, 240);
  owner.document.remember(); owner.gallery.remember(); owner = h.render();
  assert.equal(owner.document.returnTop, 600);
  assert.equal(owner.gallery.returnLeft, 240, "later viewer returns use current scroll rather than the old Sky snapshot");
});

test("a retained native page freezes both offsets while hidden and restores after its content returns", () => {
  const h = hookHarness(position);
  h.setReady(true);
  let owner = h.render();
  owner.document.record(position.top); owner.gallery.onScroll({ detail: { scrollLeft: position.left } });
  owner.document.record(913.4); owner.gallery.onScroll({ detail: { scrollLeft: 240 } });
  const departed = owner;
  h.setVisible(false); h.setReady(false); owner = h.render();
  owner.document.record(0); owner.gallery.onScroll({ detail: { scrollLeft: 0 } });
  h.setVisible(true); owner = h.render();
  owner.document.record(0); owner.gallery.onScroll({ detail: { scrollLeft: 0 } });
  h.setReady(true); owner = h.render();
  owner.document.record(0); owner.gallery.onScroll({ detail: { scrollLeft: 0 } });
  departed.document.record(0); departed.gallery.onScroll({ detail: { scrollLeft: 0 } });
  assert.equal(owner.document.returnTop, 913.4, "hidden and incomplete-layout zero events cannot replace the source reading position");
  assert.equal(owner.gallery.returnLeft, 240);
  assert.equal(h.records.at(-1)?.top, 913.4, "late layout events after issuing the command cannot corrupt the next snapshot");
  owner.document.record(913.4); owner.gallery.onScroll({ detail: { scrollLeft: 240 } });
  departed.document.takeOver(); departed.document.record(0); departed.gallery.onScroll({ detail: { scrollLeft: 0 } });
  assert.equal(h.records.at(-1)?.top, 913.4, "a departed callback remains obsolete even after the current native position is acknowledged");
  owner.document.record(950); owner.document.remember(); owner = h.render();
  assert.equal(owner.document.returnTop, 950, "ordinary scrolling takes ownership after restoration");
});

test("a real touch can cancel an incomplete restoration without withdrawing the native position command", () => {
  const h = hookHarness(position);
  h.setReady(true); let owner = h.render();
  owner.document.record(position.top); owner.gallery.onScroll({ detail: { scrollLeft: position.left } });
  owner.document.record(620); owner.gallery.onScroll({ detail: { scrollLeft: 260 } });
  h.setVisible(false); h.render(); h.setVisible(true); owner = h.render();
  owner.document.takeOver(); owner = h.render();
  assert.equal(owner.document.returnTop, 620, "ordinary touches must not remove scrollTop and reset native scroll");
  owner.document.record(650); owner.gallery.onScroll({ detail: { scrollLeft: 270 } });
  assert.equal(h.records.at(-1)?.top, 650);
  assert.equal(h.records.at(-1)?.left, 270);
});

test("a replaced location or media set rejects old restoration and late scroll callbacks", () => {
  const h = hookHarness(position);
  const old = h.render();
  h.setIdentity("spot:b", "spot:b:new"); h.setReady(true);
  let current = h.render();
  old.document.record(700); old.gallery.onScroll({ detail: { scrollLeft: 280 } });
  current.document.remember(); current.gallery.remember(); current = h.render();
  assert.equal(current.document.returnTop, 0);
  assert.equal(current.gallery.returnLeft, 0);
  assert.equal(h.records.length, 0);

  const changedMedia = hookHarness(position);
  changedMedia.render();
  changedMedia.setIdentity(position.identity, "spot:a:different-photo"); changedMedia.setReady(true);
  const restored = changedMedia.render();
  assert.equal(restored.document.returnTop, position.top);
  assert.equal(restored.gallery.returnLeft, 0, "old pixel crop must not select another photo set");
});

test("a source checkpoint uses one native batch and follows its entrance through later layout changes", async () => {
  const h = hookHarness(position);
  h.setReady(true); h.setLayout(1800);
  let owner = h.render(); await h.flushNative(); owner = h.render();
  // The last event may predate a native adjustment. The checkpoint must use
  // the native top from its own rect batch, not the old event's 471.5.
  const checkpoint = owner.document.prepareSourceNavigation("moon-source");
  await h.flushNative(); await checkpoint;
  assert.equal(h.records.at(-1)?.top, 1800);
  assert.equal(h.records.at(-1)?.anchor?.offset, 400);
  h.setVisible(false); h.render();
  h.setLayout(0, [{ id: "moon-source", top: 2000, height: 44 }]);
  h.setVisible(true); owner = h.render();
  owner.document.record(0);
  await h.flushNative(); owner = h.render();
  assert.equal(owner.document.returnTop, 1600);
  assert.equal(h.commands.at(-1), 1600, "restore the entrance's viewport offset after preceding content shrank");
  owner.document.record(1600);
  h.setLayout(1600, [{ id: "moon-source", top: 2300, height: 44 }]); h.render();
  await h.flushNative(); owner = h.render();
  assert.equal(owner.document.returnTop, 1900, "a numeric ack does not finish the later asynchronous layout return");
  // Same React prop, different actual native position: a real enhanced command
  // must be sent again without an invented offset or removing scrollTop.
  h.setLayout(1700, [{ id: "moon-source", top: 2300, height: 44 }]); h.render();
  await h.flushNative(); owner = h.render();
  assert.equal(owner.document.returnTop, 1900);
  assert.equal(h.commands.at(-1), 1900);
  assert.equal(h.commands.length, 3);
});

test("touch and a newer layout retire in-flight reading corrections", async () => {
  const saved = { ...position, anchor: { id: "moon-source", offset: 400 } };
  const h = hookHarness(saved); h.setReady(true); h.setLayout(0);
  let owner = h.render(); await h.flushNative(); owner = h.render();
  const before = h.commands.length;
  h.setLayout(1800, [{ id: "moon-source", top: 2600, height: 44 }]); owner = h.render();
  owner.document.takeOver(); owner.document.record(1840);
  await h.flushNative(); owner = h.render();
  assert.equal(h.commands.length, before, "a late geometry response cannot move a user who took over");
  assert.equal(h.records.at(-1)?.top, 1840);

  h.setVisible(false); h.render(); h.setVisible(true); h.setLayout(0); h.render();
  h.setLayout(50, [{ id: "moon-source", top: 2700, height: 44 }]); h.render();
  await h.flushNative(); h.render();
  assert.equal(h.commands.length, before + 1, "only the latest layout may issue its correction");
});
