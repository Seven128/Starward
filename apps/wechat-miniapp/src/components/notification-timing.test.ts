import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("floating notice pauses its remaining reading time and gives a full interval after returning to view", () => {
  const source = readFileSync(new URL("./notification.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("notification.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "FloatingNotification");
  assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(ast).replace(/^export /u, ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  let now = 0;
  let visible = true;
  let dismissals = 0;
  let hook = 0;
  const state: unknown[] = [];
  const effects = new Map<number, { dependencies: readonly unknown[]; cleanup?: () => void }>();
  const pending: Array<{ index: number; callback: () => void | (() => void); dependencies: readonly unknown[] }> = [];
  const timers = new Map<number, { due: number; callback: () => void }>();
  let nextTimerId = 0;

  const FloatingNotification = vm.runInNewContext(`${code}\nFloatingNotification`, {
    React: { createElement: (type: unknown, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props, children }) },
    View: "View",
    NotificationComponent: "NotificationComponent",
    floatingNotificationNodeId: () => "notice-one",
    useFloatingNotificationVisibility: () => visible,
    useState: (initial: unknown) => {
      const index = hook++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value: unknown) => { state[index] = value; }];
    },
    useRef: (initial: unknown) => {
      const index = hook++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
    useEffect: (callback: () => void | (() => void), dependencies: readonly unknown[]) => {
      pending.push({ index: hook++, callback, dependencies });
    },
    Date: { now: () => now },
    setTimeout: (callback: () => void, delay: number) => {
      const id = ++nextTimerId;
      timers.set(id, { due: now + delay, callback });
      return id;
    },
    clearTimeout: (id: number) => { timers.delete(id); },
  });
  const notification = { id: "notice-one", action: undefined };
  const render = () => {
    hook = 0; pending.length = 0;
    const tree = FloatingNotification({ notification, onDismiss: () => { dismissals++; } });
    for (const next of pending) {
      const prior = effects.get(next.index);
      if (prior && prior.dependencies.length === next.dependencies.length && prior.dependencies.every((value, index) => Object.is(value, next.dependencies[index]))) continue;
      prior?.cleanup?.();
      const cleanup = next.callback();
      effects.set(next.index, { dependencies: next.dependencies, ...(cleanup ? { cleanup } : {}) });
    }
    return tree;
  };
  const advance = (milliseconds: number) => {
    const target = now + milliseconds;
    while (true) {
      const next = [...timers.entries()].sort((a, b) => a[1].due - b[1].due)[0];
      if (!next || next[1].due > target) break;
      now = next[1].due;
      timers.delete(next[0]);
      next[1].callback();
    }
    now = target;
  };

  let tree = render();
  advance(1500);
  tree.props.onTouchStart(); render();
  advance(5000);
  assert.equal(dismissals, 0, "a held notice does not expire");
  tree.props.onTouchEnd(); tree = render();
  advance(1499);
  assert.equal(tree.props.className, "notification-slot");
  advance(1); tree = render();
  assert.match(tree.props.className, /notification-slot--closing/u, "only the remaining 1.5 seconds run after release");
  advance(160);
  assert.equal(dismissals, 1);

  // A fresh instance represents the same notice after leaving and returning to view.
  effects.forEach(effect => effect.cleanup?.()); effects.clear(); state.length = 0; timers.clear();
  dismissals = 0; visible = true; tree = render();
  advance(1500); visible = false; render();
  advance(5000); visible = true; tree = render();
  advance(2999); assert.equal(tree.props.className, "notification-slot");
  advance(1); tree = render();
  assert.match(tree.props.className, /notification-slot--closing/u, "returning to view gives a full reading interval");
});
