import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadFunction(name: string, scope: Record<string, unknown>) {
  const source = readFileSync(new URL("./notification-visibility.ts", import.meta.url), "utf8");
  const ast = ts.createSourceFile("visibility.ts", source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node);
  return vm.runInNewContext(ts.transpileModule(node.getText(ast).replace(/^export /, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText + `\n${name}`, scope);
}

test("floating node identity is selector-safe and changes with each replacement", () => {
  const id = loadFunction("floatingNotificationNodeId", {});
  const original = { id: "weather:地点/#a", createdAt: 123, occurrences: 1 };
  const name = id(original);
  assert.match(name, /^[a-z][a-z0-9_-]+$/);
  assert.notEqual(name, id({ ...original, occurrences: 2 }));
  assert.notEqual(name, id({ ...original, id: "weather_地点/#a" }));
  assert.notEqual(name, id({ ...original, createdAt: 124 }));
});

test("native viewport observation retains unseen entries and disconnects before late callbacks", () => {
  let value = false, cleanup: (() => void) | undefined, nextTick: (() => void) | undefined;
  let changed: ((result: { intersectionRatio?: number }) => void) | undefined;
  const refs: string[] = []; let disconnects = 0;
  const observer = { relativeTo(selector: string) { refs.push(selector); return observer; },
    relativeToViewport() { refs.push("viewport"); return observer; },
    observe(selector: string, callback: typeof changed) { refs.push(selector); changed = callback; },
    disconnect() { disconnects++; } };
  const nativePage = {};
  const hook = loadFunction("useFloatingNotificationVisibility", {
    useState: () => [value, (next: boolean) => { value = next; }],
    useEffect: (effect: () => () => void) => { cleanup = effect(); },
    Taro: { nextTick: (callback: () => void) => { nextTick = callback; },
      getCurrentInstance: () => ({ page: nativePage }),
      createIntersectionObserver: (page: unknown) => { assert.equal(page, nativePage); return observer; } },
  });
  hook("notice-one"); assert.equal(value, false); nextTick!();
  assert.deepEqual(refs, [".notification-host__scroll", "viewport", "#notice-one"]);
  changed!({ intersectionRatio: 0.5 }); assert.equal(value, false);
  changed!({ intersectionRatio: 1 }); assert.equal(value, true);
  changed!({ intersectionRatio: 0 }); assert.equal(value, false);
  cleanup!(); changed!({ intersectionRatio: 1 }); assert.equal(value, false); assert.equal(disconnects, 1);
  hook("notice-two"); cleanup!(); nextTick!(); assert.equal(refs.length, 3, "unmount before native commit must not observe");
});

test("missing native observer retains a manually dismissible entry instead of inventing visibility", () => {
  let value = true;
  const hook = loadFunction("useFloatingNotificationVisibility", {
    useState: () => [value, (next: boolean) => { value = next; }], useEffect: (effect: () => unknown) => effect(),
    Taro: { nextTick: (callback: () => void) => callback(), getCurrentInstance: () => ({ page: {} }),
      createIntersectionObserver: () => { throw new Error("unavailable"); } },
  });
  hook("notice-one"); assert.equal(value, false);
});
