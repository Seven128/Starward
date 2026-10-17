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
      if (!equal(cells[i]?.deps, deps)) { cells[i] = { deps }; effects.push(callback); }
    },
  };
  const evaluate = (path: string, dependencies: Record<string, unknown>) => {
    const exports: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText, { exports, require: (name: string) => dependencies[name] ?? {} });
    return exports;
  };
  const shared = evaluate("../../components/spot-media-gallery-position.ts", { react });
  const { usePanelReturnPosition } = evaluate("./use-panel-return-position.ts", {
    react, "@/components/spot-media-gallery-position": shared,
  });
  const records: MapPanelReturnPosition[] = [];
  let identity = restorePosition.identity, galleryIdentity = restorePosition.galleryIdentity, ready = false;
  return {
    records,
    setReady(value: boolean) { ready = value; },
    setIdentity(value: string, gallery: string) { identity = value; galleryIdentity = gallery; },
    render() {
      let owner: any;
      for (let attempt = 0; attempt < 10; attempt++) {
        cursor = 0; dirty = false;
        owner = usePanelReturnPosition(identity, galleryIdentity, { restorePosition, ready,
          onPositionChange: (value: MapPanelReturnPosition) => records.push({ ...value }) });
        effects.splice(0).forEach(effect => effect());
        if (!dirty) return owner;
      }
      assert.fail("hook did not settle");
    },
  };
}

const position = { identity: "spot:a", top: 471.5, galleryIdentity: "spot:a:one|two", left: 198.3 };

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
  owner.document.record(600); owner.gallery.onScroll({ detail: { scrollLeft: 240 } });
  h.setReady(false); h.render(); h.setReady(true); owner = h.render();
  assert.equal(h.records.at(-1)?.top, 600);
  assert.equal(h.records.at(-1)?.left, 240);
  owner.document.remember(); owner.gallery.remember(); owner = h.render();
  assert.equal(owner.document.returnTop, 600);
  assert.equal(owner.gallery.returnLeft, 240, "later viewer returns use current scroll rather than the old Sky snapshot");
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
