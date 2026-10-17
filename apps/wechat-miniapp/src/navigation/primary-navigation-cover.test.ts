import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { isPrimaryPageRoute } from "./primary-navigation";

test("cover leases bind the real primary Page, release only their original instance and are idempotent", () => {
  const calls: Array<[string, string, boolean]> = [];
  const bar = (name: string) => ({ cover: (owner: string, active: boolean) => calls.push([name, owner, active]) });
  const first = bar("map"), second = bar("my");
  let page = { route: "pages/map/index", getTabBar: () => first };
  const module = { exports: {} as { retainPrimaryNavigationCover(): () => void } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./primary-navigation-cover.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: (name: string) => name === "@tarojs/taro"
    ? { getCurrentPages: () => [page] } : { isPrimaryPageRoute } });
  const retain = module.exports.retainPrimaryNavigationCover, event = retain(), photo = retain();
  assert.equal(calls.length, 2); assert.notEqual(calls[0]![1], calls[1]![1]);
  page = { route: "pages/my/index", getTabBar: () => second };
  event(); event(); photo();
  assert.deepEqual(calls.map(([name, , active]) => [name, active]), [["map", true], ["map", true], ["map", false], ["map", false]]);
  page = { route: "content/settings/index", getTabBar: () => second }; retain()();
  assert.equal(calls.length, 4, "a child page cannot cover its hidden parent's navigation");
});
