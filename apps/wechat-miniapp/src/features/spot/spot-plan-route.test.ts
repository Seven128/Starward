import assert from "node:assert/strict";
import test from "node:test";
import type { ObservationPlan, SpotId } from "@starward/miniapp-contracts";
import { spotPlanRoute, spotIdFromPlanRoute } from "./spot-plan-route";
import { planDraftKey, planDraftBelongsTo } from "../../services/local-draft-keys";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("formal spot plan entry preserves zero, one and multiple associated plans", () => {
  const spotId = "spot:one" as SpotId;
  const plan = { planId: "plan:one", spotId } as ObservationPlan;
  const other = { planId: "plan:other", spotId: "spot:other" } as ObservationPlan;
  assert.deepEqual(spotPlanRoute(spotId, [other]), { count: 0, label: "去这观星", url: "/content/plan/edit/index?new=1&spotId=spot%3Aone" });
  assert.equal(spotPlanRoute(spotId, [other, plan]).url, "/content/plan/detail/index?planId=plan%3Aone");
  assert.equal(spotPlanRoute(spotId, [plan, { ...plan, planId: "plan:two" as never }]).url, "/content/plan/list/index?spotId=spot%3Aone");
  assert.equal(spotIdFromPlanRoute("spot%3Aone"), spotId);
  assert.equal(spotIdFromPlanRoute("%broken"), null);
});

test("new drafts for different spot openers cannot overwrite each other or a generic draft", () => {
  const keys = [planDraftKey("a", null), planDraftKey("a", null, "spot:one"), planDraftKey("a", null, "spot:two")];
  assert.equal(new Set(keys).size, 3);
  for (const key of keys) { assert.ok(key); assert.equal(planDraftBelongsTo(key, "a"), true); assert.equal(planDraftBelongsTo(key, "b"), false); }
  assert.equal(planDraftKey("a", "plan:one", "spot:one"), planDraftKey("a", "plan:one"));
});

test("the actual plan entry retires host geometry as async labels, counts and recovery change", () => {
  const source = ts.createSourceFile("spot-plan-entry.tsx", readFileSync(new URL("./spot-plan-entry.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const body = source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(source).replace(/^export /u, "")).join("\n");
  let query: { data?: { data: { plans: ObservationPlan[] } }; isError?: boolean } = {};
  const dependencies: (unknown[] | undefined)[] = [];
  let effectIndex = 0, layoutChanges = 0;
  const onLayoutChange = () => { layoutChanges++; };
  const render = vm.runInNewContext(ts.transpileModule(body + "\nSpotPlanEntry;", { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    React: { createElement: (type: string, props: object, ...children: unknown[]) => ({ type, props, children }) }, Button: "Button", Text: "Text", Taro: {},
    useId: () => "entry:a", useRef: (current: unknown) => ({ current }), useState: (value: unknown) => [value, () => {}],
    useDidShow() {}, useDidHide() {}, currentDraftUserId: () => "owner:a", useResourceQuery: () => query, spotPlanRoute,
    useEffect(callback: () => void, next?: unknown[]) {
      const previous = dependencies[effectIndex];
      if (!next || !previous || next.length !== previous.length || next.some((value, index) => !Object.is(value, previous[index]))) callback();
      dependencies[effectIndex++] = next && [...next];
    },
  });
  const draw = () => { effectIndex = 0; return render({ spotId: "spot:one", onLayoutChange }); };
  assert.equal(draw().children[0].children.join(""), "↗　正在读取计划"); assert.equal(layoutChanges, 1);
  draw(); assert.equal(layoutChanges, 1, "unchanged parent renders cannot create a geometry loop");
  query = { data: { data: { plans: [] } } };
  assert.equal(draw().children[0].children.join(""), "↗　去这观星"); assert.equal(layoutChanges, 2);
  query = { data: { data: { plans: [{ planId: "plan:one", spotId: "spot:one" } as ObservationPlan] } } };
  const populated = draw();
  assert.equal(populated.children[0].children.join(""), "↗　观星计划"); assert.equal(populated.children[1].children.join(""), "1 个计划　›"); assert.equal(layoutChanges, 3);
  query.isError = true;
  assert.equal(draw().children[0].children.join(""), "↗　计划暂不可用，点击重试"); assert.equal(layoutChanges, 4);
  query.isError = false; draw(); assert.equal(layoutChanges, 5);
  draw(); assert.equal(layoutChanges, 5);
});
