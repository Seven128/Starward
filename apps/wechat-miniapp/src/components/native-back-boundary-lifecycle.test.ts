import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function boundary() {
  const source = readFileSync(new URL("./native-back-boundary.tsx", import.meta.url), "utf8");
  const slots: any[] = [], effects: { run: () => void | (() => void); deps: unknown[]; slot: number }[] = [];
  let cursor = 0, timerId = 0, disposed = false, lateWrites = 0;
  const timers = new Map<number, () => void>();
  const module = { exports: {} as any };
  const element = (type: unknown, props: unknown) => ({ type, props });
  const warnings: string[] = [];
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, {
    module, exports: module.exports,
    require: (name: string) => name === "@tarojs/components" ? { PageContainer: "PageContainer", View: "View" }
      : name === "react/jsx-runtime" ? { jsx: element, jsxs: element }
      : {
        useRef(initial: unknown) { return slots[cursor++] ??= { current: initial }; },
        useState(initial: unknown) {
          const slot = cursor++;
          if (!(slot in slots)) slots[slot] = initial;
          return [slots[slot], (next: unknown) => { if (disposed) lateWrites++; slots[slot] = next; }];
        },
        useEffect(run: () => void | (() => void), deps: unknown[]) {
          const slot = cursor++, previous = slots[slot];
          if (!previous || deps.some((value, i) => value !== previous.deps[i])) effects.push({ run, deps, slot });
        },
      },
    setTimeout(callback: () => void) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id: number) { timers.delete(id); },
    console: { warn(message: string) { warnings.push(message); } },
  });
  return {
    render(props: { active: boolean; onBack: () => void | Promise<void>; nativeMapContent?: unknown }) {
      cursor = 0;
      const result = module.exports.NativeBackBoundary(props);
      for (const effect of effects.splice(0)) {
        slots[effect.slot]?.cleanup?.();
        slots[effect.slot] = { deps: effect.deps, cleanup: effect.run() };
      }
      return result;
    },
    advance() {
      for (const [id, callback] of [...timers]) { timers.delete(id); callback(); }
    },
    unmount() { disposed = true; for (const slot of slots) slot?.cleanup?.(); },
    timers, warnings, get lateWrites() { return lateWrites; },
  };
}

test("default native Back owners wait for presentation, deduplicate leave events and rearm after declined close", async () => {
  const owner = boundary();
  let commands = 0, complete!: () => void;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const props = { active: true, onBack: () => { commands++; return pending; } };
  assert.equal(owner.render(props), null);
  assert.equal(owner.render(props).props.show, false, "one mounted hidden frame precedes native presentation");
  owner.advance();
  const open = owner.render(props).props;
  assert.equal(open.show, true);
  open.onBeforeLeave(); open.onAfterLeave();
  assert.equal(commands, 1, "one physical leave event issues one caller command");
  assert.equal(owner.render(props).props.show, false);
  complete(); await new Promise(resolve => setImmediate(resolve));
  owner.advance(); assert.equal(owner.render(props).props.show, true, "a declined/busy close keeps native Back available");
  const inactive = { ...props, active: false };
  owner.render(inactive); owner.advance();
  assert.equal(owner.render(inactive), null);
});

test("Map retains its event modal subtree while inactive and rearms one foreground Back owner", async () => {
  const owner = boundary(), content = { eventModal: "same mounted subtree" };
  let commands = 0;
  const props = { active: false, nativeMapContent: content, onBack: () => { commands++; } };
  const hidden = owner.render(props).props;
  assert.equal(hidden.children, content);
  assert.equal(hidden.show, false);
  owner.render({ ...props, active: true }); owner.advance();
  const open = owner.render({ ...props, active: true }).props;
  assert.equal(open.show, true); assert.equal(open.children, content);
  assert.equal(open.position, "center"); assert.equal(open.zIndex, 1200);
  assert.equal(open.onAfterLeave, undefined, "Map uses its existing before-leave callback timing");
  open.onBeforeLeave(); open.onBeforeLeave(); assert.equal(commands, 1);
  await new Promise(resolve => setImmediate(resolve)); owner.advance();
  assert.equal(owner.render({ ...props, active: true }).props.show, true);
  owner.render(props); owner.advance();
  const closed = owner.render(props).props;
  assert.equal(closed.children, content, "inactive Map never unmounts its event presence owner");
  closed.onBeforeLeave(); assert.equal(commands, 1);
});

test("an unresolved or failed Back command cannot rearm or write after unmount", async () => {
  for (const failure of [false, true]) {
    const owner = boundary();
    let complete!: () => void;
    const pending = new Promise<void>(resolve => { complete = resolve; });
    const props = { active: true, onBack: () => { if (failure) throw new Error("private detail"); return pending; } };
    owner.render(props); owner.advance();
    owner.render(props).props.onBeforeLeave(); owner.unmount(); complete();
    await new Promise(resolve => setImmediate(resolve)); owner.advance();
    assert.equal(owner.timers.size, 0); assert.equal(owner.lateWrites, 0);
    assert.deepEqual(owner.warnings, failure ? ["native_back_command_failed"] : []);
  }
});
