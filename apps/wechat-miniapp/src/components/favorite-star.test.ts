import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function harness() {
  let now = 0, serial = 0, progress = 0, reduced = false, systemReduced = false;
  let pendingEffect: (() => (() => void)) | undefined;
  let cleanup: (() => void) | undefined;
  const live = { current: 0 }, timers = new Map<number, { at: number; run: () => void }>();
  const exports: any = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./selected-card-star.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date: { now: () => now },
    setTimeout: (run: () => void, delay: number) => { timers.set(++serial, { at: now + delay, run }); return serial; },
    clearTimeout: (id: number) => timers.delete(id),
    require: (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "react" ? {
      useRef: () => live, useState: () => [progress, (next: number) => { progress = next; }],
      useEffect: (effect: () => (() => void)) => { pendingEffect = effect; },
    } : name.includes("use-reduced-motion") ? { useReducedMotion: () => reduced || systemReduced } : name.includes("app-store") ? { useAppStore: (select: (state: unknown) => unknown) => select({ mode: "DAY", preferences: { reducedMotion: reduced } }) } : {},
  });
  let visible = true;
  const render = (active: boolean) => exports.FavoriteStar({ active, visible });
  return {
    change(active: boolean, reduce = false, shown = true, system = false) { reduced = reduce; systemReduced = system; visible = shown; cleanup?.(); render(active); cleanup = pendingEffect!(); },
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at; timers.delete(next[0]); next[1].run();
      }
      now = end; return progress;
    },
    render, progress: () => progress, pending: () => timers.size, unmount: () => cleanup?.(),
  };
}

test("favorite motion reverses from its visible progress without a jump or stale timer", () => {
  const h = harness(); h.change(true);
  const mid = h.advance(400); assert.ok(mid > .4 && mid < .6);
  h.change(false); assert.equal(h.progress(), mid);
  assert.equal(h.pending(), 1, "the interrupted forward timer is released");
  const reverse = h.advance(100); assert.ok(reverse < mid && reverse > 0);
  h.advance(820); assert.equal(h.progress(), 0); assert.equal(h.pending(), 0);
  h.change(true); h.advance(840); assert.equal(h.progress(), 1);
  const rotor = h.render(true).props.children[1];
  assert.equal(rotor.props.style.transform, "rotate(360deg) scale(0.94)");
});

test("a hidden Map consumer settles its icon and cancels the interrupted timer", () => {
  const h = harness(); h.change(true); h.advance(240);
  assert.ok(h.progress() > 0 && h.progress() < 1);
  h.change(true, false, false);
  assert.equal(h.progress(), 1); assert.equal(h.pending(), 0);
  assert.equal(h.render(true).props.children[1].props.style.transform, "none");
  h.change(false, false, false);
  assert.equal(h.progress(), 0); assert.equal(h.pending(), 0);
  h.change(false, false, true); h.advance(1000);
  assert.equal(h.progress(), 0); assert.equal(h.pending(), 0);
});

test("reduced motion settles immediately and unmount cancels in-flight work", () => {
  const h = harness(); h.change(true, true);
  assert.equal(h.progress(), 1); assert.equal(h.pending(), 0);
  const nodes = h.render(true).props.children;
  assert.equal(nodes[1].props.style.transform, "none");
  for (const satellite of nodes[2]) assert.equal(satellite.props.style.transform, "none");
  h.change(false); h.advance(100); const before = h.progress();
  h.unmount(); h.advance(1000); assert.equal(h.progress(), before); assert.equal(h.pending(), 0);
});

test("system reduction settles the shared star even while the account preference is false", () => {
  const h = harness(); h.change(true, false, true, true);
  assert.equal(h.progress(), 1);
  assert.equal(h.pending(), 0);
  assert.equal(h.render(true).props.children[1].props.style.transform, "none");
});
