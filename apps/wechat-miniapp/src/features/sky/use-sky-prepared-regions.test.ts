import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { sameSkyOpticalInput } from "./sky-sdss-optical-completion";
import { skyPreparedRegionSelections } from "./sky-prepared-region-selection";

/** Controlled React lifecycle boundary, not native or image-quality evidence.
 * It executes the complete collection and child component; the existing loader
 * is the explicit boundary rather than duplicating its cache or retry rules. */
function harness(selectRegions: (...args: any[]) => unknown = (items: unknown[]) => items) {
  let activeScope: ReturnType<typeof scope>;
  function scope() {
    const slots: any[] = []; let cursor = 0, effects: (() => void)[] = [];
    const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
    return { slots, index: () => cursor++,
      run<T>(call: () => T) { cursor = 0; activeScope = this; return call(); },
      effect(call: () => void | (() => void), deps: unknown[]) {
        const index = cursor++, previous = slots[index];
        if (previous && same(previous.deps, deps)) return;
        effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: call() }; });
      }, flush() { const pending = effects; effects = []; pending.forEach(call => call()); },
      dispose() { effects = []; slots.forEach(slot => slot?.cleanup?.()); }, same,
    };
  }
  const react = {
    useRef(value: unknown) { const i = activeScope.index(); return activeScope.slots[i] ??= { current: value }; },
    useMemo(call: () => unknown, deps: unknown[]) {
      const i = activeScope.index(), old = activeScope.slots[i];
      if (!old || !activeScope.same(old.deps, deps)) activeScope.slots[i] = { deps, value: call() };
      return activeScope.slots[i].value;
    },
    useState(initial: unknown) {
      const owner = activeScope, i = owner.index();
      if (!owner.slots[i]) owner.slots[i] = { value: typeof initial === "function" ? initial() : initial };
      return [owner.slots[i].value, (next: any) => { owner.slots[i].value = typeof next === "function" ? next(owner.slots[i].value) : next; }];
    },
    useEffect(call: () => void | (() => void), deps: unknown[]) { activeScope.effect(call, deps); },
    useCallback(call: () => unknown, deps: unknown[]) { return react.useMemo(() => call, deps); },
  };
  const jsx = (type: unknown, props: unknown, key: unknown) => ({ type, props, key });
  const selections = [{ kind: "prepared-native-optical-v1", reference: "REGION:first", publicationHash: "a".repeat(64) }];
  const queries: unknown[][] = []; let retries = 0, failures = 0;
  const loaded = { image: null, renderedLevel: null, renderedAsset: null, publication: undefined, coarser: null, fallback: null,
    requested: true, loading: true, failed: false, refreshFailed: false, updateFailed: false,
    retry() { retries++; return true; }, failedImage() { failures++; } };
  const bindings: Record<string, unknown> = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "./sky-sdss-optical-completion": { sameSkyOpticalInput },
    "./sky-sdss-optical-frame": { skyTargetOpticalFrame: () => null },
    "./sky-prepared-region-selection": { skyPreparedRegionSelections: selectRegions },
    "./use-sky-target-optical": { useSkyTargetOptical(...args: unknown[]) { queries.push(args); return loaded; } },
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-sky-prepared-regions.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name: string) { assert(name in bindings, name); return bindings[name]; } });
  const use = exports.useSkyPreparedRegions;
  const parent = scope(), canvas = {}, footprint = { view: { verticalFovDeg: .1 } };
  const render = (revision = 1, active = true, paused = false, currentFootprint = footprint) =>
    parent.run(() => use(selections, currentFootprint, canvas, revision, active, paused));
  const consumer = scope(); let redraws = 0;
  const consume = (result: ReturnType<typeof render>) => {
    consumer.run(() => react.useEffect(() => { redraws++; }, [result.frames])); consumer.flush();
  };
  return { render, consume, redraws: () => redraws, footprint, scope, queries, loaded, canvas, selections,
    retries: () => retries, failures: () => failures };
}

test("equivalent region footprints do not resubmit an unchanged empty scene", () => {
  const h = harness(skyPreparedRegionSelections);
  const first = h.render(); assert.equal(first.frames.length, 0); h.consume(first);
  h.consume(h.render(1, true, false, { ...h.footprint, view: { ...h.footprint.view } }));
  assert.equal(h.redraws(), 1, "a presentation-state render must not restart the native writer with the same empty regions");
});

test("a camera change without drawable regions does not resubmit the accepted scene", () => {
  const h = harness(skyPreparedRegionSelections);
  h.consume(h.render());
  h.consume(h.render(1, true, false, { ...h.footprint, view: { verticalFovDeg: 60 } }));
  assert.equal(h.redraws(), 1, "publishing a new accepted FOV must not submit another empty-region frame");
});

test("collection uses the same exact loader without a pick and guards late scope, cleanup and recovery", () => {
  const h = harness(), child = h.scope(); let result = h.render();
  const firstResource = result.resources[0];
  child.run(() => firstResource.type(firstResource.props)); child.flush();
  result = h.render(); assert.equal(result.bindings.length, 1); assert.equal(result.frames.length, 0);
  assert.deepEqual(h.queries[0]!.slice(0, 7), [h.selections[0]!.kind, h.selections[0]!.reference, .1, h.canvas, 1, true, h.selections[0]!.publicationHash]);
  assert.equal(result.retry(h.selections[0]!.publicationHash), true); assert.equal(h.retries(), 1);
  result.failedImage({}); assert.equal(h.failures(), 1);
  result = h.render(1, true, true); result.retry(h.selections[0]!.publicationHash); assert.equal(h.retries(), 1);
  result = h.render(2); assert.equal(result.bindings.length, 0);
  firstResource.props.onBinding(`${h.selections[0]!.kind}:${h.selections[0]!.reference}:${h.selections[0]!.publicationHash}:1`,
    { selection: h.selections[0], canvas: h.canvas, revision: 1 });
  assert.equal(h.render(2).bindings.length, 0, "a late old Canvas cannot return to the current frame");
  const secondResource = h.render(2).resources[0], replacement = h.scope();
  replacement.run(() => secondResource.type(secondResource.props)); replacement.flush();
  child.dispose(); assert.equal(h.render(2).bindings.length, 1, "old cleanup cannot remove the replacement edition owner");
  result = h.render(2, false); assert.equal(result.bindings.length, 0); assert.equal(result.resources.length, 0);
  result.retry(h.selections[0]!.publicationHash); result.failedImage({}); assert.equal(h.retries(), 1); assert.equal(h.failures(), 1);
  replacement.dispose();
});
