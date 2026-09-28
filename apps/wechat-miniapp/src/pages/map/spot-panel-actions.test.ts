import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function harness() {
  let now = 0, serial = 0, cursor = 0, reduced = false;
  let props = { spotName: "当前点", favorite: false, favoritePending: false, cloudReady: true, visible: true,
    onFavorite: () => {}, onCloud: () => {}, onShare: () => {} };
  let pendingEffect: (() => (() => void)) | undefined;
  let cleanup: (() => void) | undefined, previousDeps: unknown[] | undefined;
  let hide: () => void, show: () => void;
  const slots: any[] = [], timers = new Map<number, { at: number; run: () => void }>();
  const exports: any = {};
  const jsx = (type: unknown, value: any) => ({ type, props: value });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./spot-panel-actions.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date: { now: () => now },
    setTimeout: (run: () => void, delay: number) => { timers.set(++serial, { at: now + delay, run }); return serial; },
    clearTimeout: (id: number) => timers.delete(id),
    require: (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "react" ? {
      useRef(value: any) { const index = cursor++; return slots[index] ??= { current: value }; },
      useState(value: any) { const index = cursor++; slots[index] ??= value; return [slots[index], (next: any) => { slots[index] = next; }]; },
      useEffect(effect: () => (() => void), deps: unknown[]) {
        if (!previousDeps || deps.some((value, index) => value !== previousDeps![index])) pendingEffect = effect;
        previousDeps = deps;
      },
    } : name === "@tarojs/taro" ? { useDidHide: (callback: () => void) => { hide = callback; }, useDidShow: (callback: () => void) => { show = callback; } }
      : name === "@tarojs/components" ? { Button: "button", Text: "text", View: "view" }
        : name.includes("app-store") ? { useAppStore: (select: (state: unknown) => unknown) => select({ preferences: { reducedMotion: reduced } }) }
          : name.includes("selected-card-star") ? { FavoriteStar: "favorite-star" } : {},
  });
  const render = () => {
    cursor = 0;
    const node = exports.SpotPanelActions(props);
    if (pendingEffect) {
      cleanup?.(); cleanup = pendingEffect(); pendingEffect = undefined;
    }
    return node;
  };
  const favorite = () => render().props.children[0];
  const scene = (index = 0) => {
    const child = render().props.children[index].props.children[0];
    return { params: child.props, rendered: child.type(child.props) };
  };
  render();
  return {
    change(next: Partial<typeof props>, reduce = reduced) { reduced = reduce; props = { ...props, ...next }; render(); },
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at; timers.delete(next[0]); next[1].run();
      }
      now = end;
      return scene().params.progress as number;
    },
    favorite, scene, render, pending: () => timers.size, unmount: () => cleanup?.(),
    hide() { hide!(); render(); }, show() { show!(); render(); },
  };
}

test("favorite backdrop has real complementary intermediate opacity and reverses from the painted value", () => {
  const h = harness();
  h.change({ favorite: true });
  const mid = h.advance(176);
  assert.ok(mid > .4 && mid < .6, "a target-colored background jump fails this oracle");
  const layers = h.scene().rendered.props.children;
  assert.equal(layers[0].props.style.opacity, 1 - mid);
  assert.equal(layers[1].props.style.opacity, mid);
  assert.ok(h.favorite().props.className.includes("night-contrast"));
  h.change({ favorite: false });
  assert.equal(h.scene().params.progress, mid, "retarget without an endpoint reset");
  assert.equal(h.pending(), 1, "the interrupted forward timer cannot write later");
  const reverse = h.advance(64);
  assert.ok(reverse > 0 && reverse < mid);
  assert.equal(h.favorite().props.className.includes("night-contrast"), false);
  h.advance(400);
  assert.equal(h.scene().params.progress, 0);
  assert.equal(h.pending(), 0);
  h.change({ favorite: true }); h.advance(368);
  assert.equal(h.scene().params.progress, 1);
});

test("hidden owner, page lifecycle, reduced preference and unmount release backdrop work", () => {
  const h = harness(); h.change({ favorite: true }); h.advance(80);
  h.hide();
  assert.equal(h.scene().params.progress, 1); assert.equal(h.pending(), 0);
  assert.equal(h.favorite().props.children[1].props.visible, false, "the shared meteor receives the same visibility boundary");
  assert.equal(h.scene().params.breathing, false); assert.equal(h.scene(1).params.breathing, false);
  h.change({ favorite: false }); assert.equal(h.scene().params.progress, 0);
  h.show(); assert.equal(h.scene(1).params.breathing, true);
  assert.equal(h.favorite().props.children[1].props.visible, true);
  h.change({ favorite: true }); h.advance(80);
  h.change({ visible: false }); assert.equal(h.pending(), 0); assert.equal(h.scene().params.progress, 1);
  h.change({ visible: true, favorite: false }, true);
  assert.equal(h.scene().params.progress, 0); assert.equal(h.pending(), 0);
  assert.equal(h.scene(1).params.breathing, false);
  h.change({ favorite: true }, false); h.advance(64);
  const before = h.scene().params.progress;
  h.unmount(); h.advance(1000);
  assert.equal(h.scene().params.progress, before); assert.equal(h.pending(), 0);
});

test("scene variants retain independent star fields, original actions and disabled cloud semantics", () => {
  const h = harness();
  const favoriteNight = h.scene().rendered.props.children[1].props.children;
  const cloudNight = h.scene(1).rendered.props.children[1].props.children;
  assert.equal(favoriteNight.length, 8); assert.equal(cloudNight.length, 8);
  assert.notDeepEqual(favoriteNight.map((node: any) => node.props.style.left), cloudNight.map((node: any) => node.props.style.left));
  assert.equal(h.scene().rendered.props.children[0].props.children.length, 2);
  assert.equal(h.scene(1).params.progress, 1);
  assert.equal(h.scene().params.breathing, false, "invisible favorite night field is paused");
  const actions = h.render().props.children;
  assert.deepEqual(Array.from(actions, (node: any) => node.props["data-control"]), ["spot-favorite-action", "spot-cloud-stargazing-action", "spot-share-action"]);
  h.change({ cloudReady: false, favoritePending: true });
  assert.equal(h.render().props.children[1].props.disabled, true);
  assert.equal(h.scene(1).params.breathing, false);
  assert.equal(h.favorite().props.ariaLabel, "正在保存当前点");
});
