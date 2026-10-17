import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const actionSource = () => readFileSync(new URL("./spot-panel-actions.tsx", import.meta.url), "utf8");
function harness(source = actionSource()) {
  let now = 0, serial = 0, cursor = 0, reduced = false, systemReduced = false;
  let mode = "DAY";
  let largeText = false;
  let props = { spotName: "当前点", favorite: false, favoritePending: false, cloudReady: true, visible: true,
    onFavorite: () => {}, onCloud: () => {}, onShare: () => {} };
  let pendingEffect: (() => (() => void)) | undefined;
  let cleanup: (() => void) | undefined, previousDeps: unknown[] | undefined;
  let hide: () => void, show: () => void;
  const slots: any[] = [], timers = new Map<number, { at: number; run: () => void }>();
  const exports: any = {};
  const jsx = (type: unknown, value: any) => ({ type, props: value });
  vm.runInNewContext(ts.transpileModule(source, {
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
        : name.includes("use-reduced-motion") ? { useReducedMotion: () => reduced || systemReduced }
        : name.includes("app-store") ? { useAppStore: (select: (state: unknown) => unknown) => select({ mode, preferences: { reducedMotion: reduced, largeText } }) }
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
    change(next: Partial<typeof props>, reduce = reduced, system = systemReduced) { reduced = reduce; systemReduced = system; props = { ...props, ...next }; render(); },
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
    frameAt(ms: number) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      assert.ok(next, "a real motion frame must be pending");
      timers.delete(next[0]); now = ms; next[1].run();
      return scene().params.progress as number;
    },
    favorite, scene, render, pending: () => timers.size, unmount: () => cleanup?.(),
    mode(value: string) { mode = value; render(); },
    largeText(value: boolean) { largeText = value; render(); },
    hide() { hide!(); render(); }, show() { show!(); render(); },
  };
}

test("system input settles an in-flight backdrop without changing the favorite intent", () => {
  const h = harness(); h.change({ favorite: true }); h.advance(80);
  assert.ok(h.scene().params.progress > 0 && h.scene().params.progress < 1);
  h.change({}, false, true);
  assert.equal(h.scene().params.progress, 1); assert.equal(h.pending(), 0);
  assert.equal(h.scene().params.breathing, false);
  assert.equal(h.favorite().props.children[1].props.active, true);
  h.change({}, false, false); h.advance(400);
  assert.equal(h.scene().params.progress, 1); assert.equal(h.pending(), 0);
});

test("favorite backdrop passes continuously through its readable middle and reverses from the painted value", () => {
  const h = harness();
  h.change({ favorite: true });
  const mid = h.advance(176);
  assert.ok(mid > .4 && mid < .6, "a target-colored background jump fails this oracle");
  const layers = h.scene().rendered.props.children;
  assert.equal(layers[0].props.style.opacity, Math.max(0, 1 - 2 * mid));
  assert.equal(layers[1].props.style.opacity, Math.max(0, 2 * mid - 1));
  assert.equal(h.favorite().props.className.includes("night-contrast"), mid >= .5);
  assert.equal(h.favorite().props.children[2].props.className, undefined, "the label has no temporary box");
  h.change({ favorite: false });
  assert.equal(h.scene().params.progress, mid, "retarget without an endpoint reset");
  assert.equal(h.pending(), 1, "the interrupted forward timer cannot write later");
  const reverse = h.advance(64);
  assert.ok(reverse > 0 && reverse < mid);
  assert.equal(h.favorite().props.className.includes("night-contrast"), false);
  h.advance(400);
  assert.equal(h.scene().params.progress, 0);
  assert.equal(h.scene().rendered.props.children[0].props.style.opacity, 1);
  assert.equal(h.pending(), 0);
  h.change({ favorite: true }); h.advance(368);
  assert.equal(h.scene().params.progress, 1);
  assert.equal(h.scene().rendered.props.children[1].props.style.opacity, 1);
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

// Calculate the paint from the component's actual layer alpha and source
// palette. This is a contrast regression, not a native rendering verdict.
function checkMovingContrast(h: ReturnType<typeof harness>, exactTime?: number) {
  const style = readFileSync(new URL("./spot-panel-actions.scss", import.meta.url), "utf8");
  const middle = style.match(/spot-action-scene--readable-day\s*\{\s*background:\s*(#[\da-f]{6})/i)?.[1];
  assert.ok(middle);
  const palette = readFileSync(new URL("./index.scss", import.meta.url), "utf8");
  const inkChannels = (hex: string) => {
    const full = hex.length === 4 ? '#' + [...hex.slice(1)].map(value => value + value).join('') : hex;
    return [1, 3, 5].map(offset => parseInt(full.slice(offset, offset + 2), 16));
  };
  const darkInk = style.match(/spot-panel__action--transition-dark\s*\{\s*color:\s*(#[\da-f]+);/i)?.[1];
  const lightInk = palette.match(/spot-panel__action--favorite\.spot-panel__action--night-contrast\s*\{\s*color:\s*(#[\da-f]+);/i)?.[1];
  assert.ok(darkInk); assert.ok(lightInk);
  const stops = (name: string) => {
    const declaration = palette.match(new RegExp(`--spot-action-${name}-surface:([^;]+);`))?.[1];
    assert.ok(declaration);
    const colors = declaration.match(/#[\da-f]{6}/gi);
    assert.equal(colors?.length, 2);
    return colors!.map(color => [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16)));
  };
  const luminance = (channels: number[]) => channels.map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
  const base = [1, 3, 5].map(offset => parseInt(middle.slice(offset, offset + 2), 16));
  const day = stops("day"), night = stops("night");
  h.change({ favorite: true });
  for (let step = 0; step < (exactTime === undefined ? 22 : 1); step++) {
    const progress = exactTime === undefined ? h.advance(16) : h.frameAt(exactTime);
    if (progress <= 0 || progress >= 1) continue;
    const layers = h.scene().rendered.props.children;
    const dayAlpha = layers[0].props.style.opacity as number;
    const nightAlpha = layers[1].props.style.opacity as number;
    const isLightInk = h.favorite().props.className.includes("night-contrast");
    if (!isLightInk) assert.ok(h.favorite().props.className.includes("transition-dark"));
    const foreground = luminance(inkChannels(isLightInk ? lightInk : darkInk));
    for (const dayStop of day) for (const nightStop of night) {
      const channels = base.map((channel, index) => {
        const under = channel * (1 - dayAlpha) + dayStop[index]! * dayAlpha;
        return under * (1 - nightAlpha) + nightStop[index]! * nightAlpha;
      });
      const light = luminance(channels);
      const ratio = (Math.max(light, foreground) + .05) / (Math.min(light, foreground) + .05);
      assert.ok(ratio >= 4.5, `moving label contrast ${ratio} at progress ${progress}`);
    }
  }
}

test("moving label contrast rejects the old simultaneous bright/dark crossfade", () => {
  checkMovingContrast(harness());
  for (const time of [179.999, 180, 180.001]) checkMovingContrast(harness(), time);
  const original = actionSource();
  const mutated = original
    .replace('readableDay ? Math.max(0, 1 - 2 * progress) : 1 - progress', '1 - progress')
    .replace('readableDay ? Math.max(0, 2 * progress - 1) : progress', 'progress');
  assert.notEqual(mutated, original, "bounded mutation must affect the real scene owner");
  assert.throws(() => checkMovingContrast(harness(mutated)), /moving label contrast/);
});

test("other themes keep their original scene trajectory and point field", () => {
  const h = harness();
  const dayPoints = h.scene().rendered.props.children[1].props.children;
  for (const point of dayPoints) {
    const left = parseFloat(point.props.style.left);
    const top = parseFloat(point.props.style.top);
    assert.ok(left < 30 || top <= 2 || top >= 94, "bright DAY stars avoid the label's central band");
  }
  h.largeText(true);
  assert.ok(h.scene().rendered.props.children[1].props.children.every((node: any) => parseFloat(node.props.style.left) < 30));
  h.mode("NIGHT"); h.change({ favorite: true });
  const mid = h.advance(176);
  const layers = h.scene().rendered.props.children;
  assert.equal(layers[0].props.style.opacity, 1 - mid);
  assert.equal(layers[1].props.style.opacity, mid);
  assert.equal(h.favorite().props.className.includes("transition-dark"), false);
  assert.notDeepEqual(dayPoints.map((node: any) => node.props.style.top), layers[1].props.children.map((node: any) => node.props.style.top));
  h.mode("OBSERVATION");
  assert.equal(h.scene().params.dayContrast, false);
  assert.equal(h.favorite().props.className.includes("transition-dark"), false);
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
