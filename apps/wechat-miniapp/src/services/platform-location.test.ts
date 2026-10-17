import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { normalizePlatformLocation } from "./platform-location-result";

const source = ts.createSourceFile("location.ts", readFileSync(new URL("./platform-location.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "choosePlatformLocation")!;
function fixture() {
  let resolve!: (value: unknown) => void, reject!: (error: unknown) => void;
  let mode = "DAY", current = true, calls = 0;
  const wait = new Promise((yes, no) => { resolve = yes; reject = no; });
  const choose = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "; choosePlatformLocation;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    Error, Taro: { chooseLocation: () => { calls++; return wait; } },
    useAppStore: { getState: () => ({ mode }) }, normalizePlatformLocation,
  });
  return { choose: (allowUnthemedHandoff = false) => choose({ isCurrent: () => current, allowUnthemedHandoff }),
    resolve, reject, calls: () => calls, retire: () => { current = false; }, observation: () => { mode = "OBSERVATION"; } };
}

test("native cancellation is a quiet null before display translation, for object and Error results", async () => {
  for (const error of [{ errMsg: "chooseLocation:fail cancel" }, new Error("chooseLocation:fail cancel")]) {
    const f = fixture(), result = f.choose(); f.reject(error);
    assert.equal(await result, null); assert.equal(f.calls(), 1);
  }
});

test("permission, unknown and malformed failures retain the original rejection", async () => {
  for (const error of [{ errMsg: "chooseLocation:fail permission denied" }, { errMsg: "chooseLocation:fail cancellation unavailable" },
    { errMsg: "otherApi:fail cancel" }, { errMsg: 0 }, new Error("chooseLocation:fail unavailable"), null, "unavailable"]) {
    const f = fixture(), result = f.choose(); f.reject(error);
    await assert.rejects(result, actual => actual === error);
  }
});

test("success keeps the selected GCJ02 identity and normalized WGS84", async () => {
  const f = fixture(), result = f.choose();
  const raw = { latitude: 22.5, longitude: 113.5, name: "所选地点", address: "" };
  f.resolve(raw);
  assert.deepEqual(await result, normalizePlatformLocation(raw));
});

test("retired calls and unapproved observation handoff never open the picker", async () => {
  const old = fixture(); old.retire(); assert.equal(await old.choose(), null); assert.equal(old.calls(), 0);
  const red = fixture(); red.observation(); assert.equal(await red.choose(), null); assert.equal(red.calls(), 0);
  const approved = red.choose(true); red.resolve({ latitude: 0, longitude: 0 }); assert.ok(await approved); assert.equal(red.calls(), 1);
});

test("late successful selection remains null after its owner retires", async () => {
  const f = fixture(), result = f.choose(); f.retire(); f.resolve({ latitude: 22.5, longitude: 113.5 });
  assert.equal(await result, null);
});

test("normalizer failure is not classified as native cancellation", async () => {
  const f = fixture(), result = f.choose(); f.resolve({ latitude: 100, longitude: 113 });
  await assert.rejects(result);
});
