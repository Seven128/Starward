import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import type * as ReactTypes from "react";
import { fileURLToPath } from "node:url";
import { pagePresentationForTest } from "../navigation/page-presentation-test-support";

const require = createRequire(import.meta.url);
const React = require(fileURLToPath(new URL("../../node_modules/react/index.js", import.meta.url))) as typeof ReactTypes;

// Whole production wrapper, presentation context and native container owner.
// The shared renderer replaces only native PageContainer and lifecycle ports.
async function mountBoundary(initial: { active: boolean; onBack: () => void | Promise<void>; nativeMapContent?: ReactTypes.ReactNode }) {
  let current: any = null, mounts = 0, props = initial;
  function PageContainer(value: any) {
    const identity = React.useRef<object | null>(null);
    if (!identity.current) { identity.current = {}; mounts++; }
    current = { ...value, identity: identity.current };
    React.useEffect(() => () => { if (current?.identity === identity.current) current = null; }, []);
    return React.createElement("view", { "data-native-container": true }, value.children);
  }
  const h = await pagePresentationForTest({
    modules: { "@tarojs/components": { PageContainer, View: "view" } },
    ...(process.env.NATIVE_BACK_BOUNDARY_SOURCE ? { sourceOverrides: {
      "components/native-back-boundary.tsx": readFileSync(process.env.NATIVE_BACK_BOUNDARY_SOURCE, "utf8"),
    } } : {}),
  });
  const NativeBackBoundary = h.load("components/native-back-boundary.tsx").NativeBackBoundary;
  function Fixture() { return h.create(NativeBackBoundary, props); }
  await h.render(Fixture);
  return {
    get current() { return current; }, get mounts() { return mounts; },
    get warnings() { return h.warnings.map(args => args[0]); },
    async render(next: typeof initial) { props = next; await h.render(); },
    event: h.update,
    async settle() { await h.settle(); await h.expire(); await h.settle(); },
    hide: h.hide, show: h.show, cycle: h.cycle, close: h.dispose,
  };
}

test("auxiliary Back mounts shown, consumes one leave and remounts a fresh shown native layer", async () => {
  let commands = 0, complete!: () => void;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const props = { active: true, onBack: () => { commands++; return pending; } };
  const owner = await mountBoundary(props);
  try {
    const first = owner.current;
    assert.equal(first.style.position, "fixed", "the invisible Back slot stays outside the caller's flex layout");
    assert.equal(first?.show, true, "the first mounted native frame must already be shown");
    await owner.event(() => { first.onBeforeLeave(); first.onAfterLeave(); });
    assert.equal(commands, 1);
    assert.equal(Boolean(owner.current), false, "consumed auxiliary layer unmounts while the command is pending");
    await owner.event(complete); await owner.settle();
    assert.equal(owner.current?.show, true);
    assert.notEqual(owner.current.identity, first.identity);
    await owner.event(() => first.onAfterLeave());
    assert.equal(commands, 1, "a late event from the retired layer cannot consume its replacement");
    await owner.render({ ...props, active: false });
    assert.equal(Boolean(owner.current), false);
  } finally { await owner.close(); }
});

test("hidden auxiliary pages retire pending commands and can return to one fresh boundary", async () => {
  let commands = 0, complete!: () => void;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const owner = await mountBoundary({ active: true, onBack: () => { commands++; return pending; } });
  try {
    const first = owner.current;
    await owner.event(() => first.onBeforeLeave());
    await owner.hide(); await owner.event(complete); await owner.settle();
    assert.equal(Boolean(owner.current), false);
    await owner.event(() => first.onAfterLeave()); assert.equal(commands, 1);
    await owner.show(); await owner.settle();
    assert.equal(owner.current?.show, true);
    assert.notEqual(owner.current.identity, first.identity);
  } finally { await owner.close(); }
});

test("inactive/reactivated auxiliary owners cannot be rearmed by an old command", async () => {
  let complete!: () => void, commands = 0;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const props = { active: true, onBack: () => { commands++; return pending; } };
  const owner = await mountBoundary(props);
  try {
    const first = owner.current;
    await owner.event(() => first.onBeforeLeave());
    await owner.render({ ...props, active: false });
    await owner.render(props);
    const next = owner.current;
    await owner.event(complete); await owner.settle();
    assert.equal(owner.current.identity, next.identity);
    await owner.event(() => first.onAfterLeave()); assert.equal(commands, 1);
  } finally { await owner.close(); }
});

test("Map preserves its foreground child and before-leave protocol through close and rearm", async () => {
  let childMounts = 0, childUnmounts = 0, commands = 0;
  function Content() { React.useEffect(() => { childMounts++; return () => { childUnmounts++; }; }, []); return React.createElement("span", null, "event"); }
  const props = { active: false, onBack: () => { commands++; }, nativeMapContent: React.createElement(Content) };
  const owner = await mountBoundary(props);
  try {
    const identity = owner.current.identity;
    assert.equal(owner.current.show, false);
    await owner.render({ ...props, active: true }); await owner.settle();
    const open = owner.current;
    assert.equal(open.show, true); assert.equal(open.position, "center"); assert.equal(open.zIndex, 1200);
    assert.equal(typeof open.onAfterLeave, "function");
    await owner.event(() => open.onAfterEnter());
    await owner.event(() => { open.onBeforeLeave(); open.onBeforeLeave(); });
    assert.equal(commands, 1); await owner.settle();
    assert.equal(owner.current.show, false, "Map waits for native exit as well as the command");
    await owner.event(() => open.onAfterLeave()); await owner.settle();
    assert.equal(owner.current.show, true); assert.equal(owner.current.identity, identity);
    await owner.event(() => owner.current.onBeforeLeave());
    assert.equal(commands, 1, "delayed leave remains fenced until native entry is acknowledged");
    await owner.event(() => owner.current.onAfterEnter());
    await owner.render(props); await owner.settle();
    assert.equal(owner.current.show, false); assert.equal(owner.current.identity, identity);
    assert.equal(childMounts, 1); assert.equal(childUnmounts, 0);
  } finally { await owner.close(); }
  assert.equal(childUnmounts, 1);
});

test("Map programmatic retirement rejects hidden successors and waits for native entry before Back", async () => {
  let commands = 0;
  const props = { active: true, onBack: () => { commands++; }, nativeMapContent: React.createElement("span", null, "event") };
  const owner = await mountBoundary(props);
  try {
    await owner.settle();
    const first = owner.current;
    await owner.event(() => first.onAfterEnter());
    await owner.render({ ...props, active: false });
    assert.equal(owner.current.show, false);
    await owner.render(props);
    const hiddenSuccessor = owner.current;
    assert.equal(hiddenSuccessor.show, false);
    await owner.event(() => { first.onBeforeLeave(); hiddenSuccessor.onBeforeLeave(); });
    assert.equal(commands, 0, "programmatic leave cannot become a new command before rearming");

    await owner.settle();
    const entering = owner.current;
    assert.equal(entering.show, true);
    await owner.event(() => { hiddenSuccessor.onBeforeLeave(); entering.onBeforeLeave(); });
    assert.equal(commands, 0, "show=true does not authorize Back before the matching native afterEnter");
    await owner.event(() => entering.onAfterEnter());
    await owner.event(() => { entering.onBeforeLeave(); entering.onBeforeLeave(); });
    assert.equal(commands, 1, "one acknowledged native entry accepts one Back command");

    await owner.event(() => entering.onAfterLeave()); await owner.settle();
    const rearmed = owner.current;
    assert.equal(rearmed.show, true);
    await owner.event(() => rearmed.onBeforeLeave());
    assert.equal(commands, 1, "a consumed generation needs a new native entry acknowledgement");
    await owner.event(() => rearmed.onAfterEnter());
    await owner.event(() => { rearmed.onBeforeLeave(); rearmed.onBeforeLeave(); });
    assert.equal(commands, 2);
    assert.equal(owner.current.identity, first.identity);
    assert.equal(owner.mounts, 1, "all programmatic transitions retain the same native Map subtree");
  } finally { await owner.close(); }
});

test("failed commands report no private error detail and unmount cancels pending rearm", async () => {
  const owner = await mountBoundary({ active: true, onBack: () => { throw new Error("private detail"); } });
  try {
    await owner.event(() => owner.current.onBeforeLeave());
    await owner.settle();
    assert.deepEqual(owner.warnings, ["native_back_command_failed"]);
    assert.equal(owner.current?.show, true);
  } finally { await owner.close(); }
});

for (const map of [false, true]) test(`${map ? "Map" : "auxiliary"} rapid hide/show fences old leave before React commits`, async () => {
  let commands = 0;
  const owner = await mountBoundary({ active: true, onBack: () => { commands++; },
    ...(map ? { nativeMapContent: React.createElement("span", null, "event") } : {}) });
  try {
    await owner.settle();
    const old = owner.current;
    if (map) await owner.event(() => old.onAfterEnter());
    await owner.cycle(() => old.onBeforeLeave());
    assert.equal(commands, 0, "synchronous lifecycle ownership precedes the next render");
    await owner.settle();
    const current = owner.current;
    await owner.event(() => old.onBeforeLeave());
    assert.equal(commands, 0, "retained callbacks stay retired after show");
    assert.equal(current.show, true);
    assert.equal(current.identity === old.identity, map, "only Map preserves its foreground subtree");
    if (map) await owner.event(() => current.onAfterEnter());
    await owner.event(() => current.onBeforeLeave());
    assert.equal(commands, 1);
  } finally { await owner.close(); }
});
