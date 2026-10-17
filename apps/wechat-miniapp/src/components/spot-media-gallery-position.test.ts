import assert from "node:assert/strict";
import test from "node:test";
import { photoRevealLeft } from "./spot-media-gallery-geometry.ts";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("paged photo reveals its own thumbnail while one-photo galleries stay fixed", () => {
  assert.equal(photoRevealLeft(0, 3, 320), 0);
  assert.ok((photoRevealLeft(2, 3, 320) ?? 0) > 320);
  assert.equal(photoRevealLeft(0, 1, 320), null);
  assert.equal(photoRevealLeft(3, 3, 320), null);
});

test("photo return centers the adopted strip inside its twelve-pixel edge padding", () => {
  // The 390px adopted strip has 366px inside its padding; its 68% photo is
  // 248.88px wide. Centering the second photo must command 198.32px.
  assert.ok(Math.abs(photoRevealLeft(1, 3, 390)! - 198.32) < 1e-9);
  assert.ok(Math.abs(photoRevealLeft(1, 3, 320)! - 161.92) < 1e-9);
});

test("viewer retention captures the current document without replaying ordinary events or another identity", () => {
  let state: number | undefined, ref: any, effect: () => void, currentIdentity = "spot:a";
  const commands: (number | undefined)[] = [], exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./spot-media-gallery-position.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name: string) => name === "react" ? {
    useRef: (value: unknown) => ref ??= { current: value },
    useState: () => [state, (value: number | undefined) => { state = value; commands.push(value); }],
    useCallback: (callback: unknown) => callback,
    useEffect: (callback: () => void) => { effect = callback; },
  } : {} });
  const render = () => exports.useSpotMediaDocumentPosition(currentIdentity);
  let owner = render(); effect!(); commands.length = 0;
  owner.record(440.4); owner.record(NaN); owner.record(-1);
  assert.deepEqual(commands, [], "user scroll records the exact offset without a native command");
  owner.remember(); owner = render();
  assert.equal(owner.returnTop, 440.4, "opening a viewer retains its actual source document");
  owner.record(440.4); assert.deepEqual(commands, [440.4], "native return events do not withdraw the retained prop");
  owner.record(550.8); owner.remember(); owner = render();
  assert.equal(owner.returnTop, 550.8, "a second entry captures the newly scrolled position");
  const old = owner;
  currentIdentity = "submission:b"; owner = render(); effect!(); owner = render();
  assert.equal(owner.returnTop, undefined);
  old.record(620); old.remember();
  assert.equal(render().returnTop, undefined, "old panel callbacks cannot restore another document");
  owner.record(12); owner.remember(); assert.equal(render().returnTop, 12);
});
