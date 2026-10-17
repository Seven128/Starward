import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { canAuthorizePlanReminder } from "./plan-reminder-status";

// Execute the actual page's mount condition, so bypassing it fails even while the flow's unit tests pass.
function pageGate() {
  const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const conditions: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isConditionalExpression(node) && ts.isJsxSelfClosingElement(node.whenTrue) && node.whenTrue.tagName.getText(source) === "PlanReminderSubscription")
      conditions.push(node.condition.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(conditions.length, 1);
  const base = { pageVisible: true, planOwner: "user:a", activePlan: { revision: 2 }, statusReminder: { notifyOnWechat: true },
    planQuery: { isPending: false, isError: false, refreshError: null, data: { dataState: "FRESH" } },
    selectedReminderNotification: { state: "AUTHORIZATION_REQUIRED", planRevision: 2, scheduleVersion: "v" }, canAuthorizePlanReminder };
  return (patch: Record<string, unknown> = {}) => Boolean(vm.runInNewContext(conditions[0]!, { ...base, ...patch }));
}

test("the production page never mounts authorization for gated/stale/hidden/failed or wrong-version state", () => {
  const allows = pageGate(); assert.equal(allows(), true);
  assert.equal(allows({ pageVisible: false }), false); assert.equal(allows({ planOwner: null }), false);
  assert.equal(allows({ activePlan: null }), false); assert.equal(allows({ statusReminder: { notifyOnWechat: false } }), false);
  for (const dataState of ["STALE_USABLE", "PARTIAL", "EXPIRED", "UNAVAILABLE", "ESTIMATED", "SAMPLE_DATA", undefined])
    assert.equal(allows({ planQuery: { data: { dataState } } }), false, String(dataState));
  for (const failure of [{ isPending: true }, { isError: true }, { refreshError: Error("offline") }])
    assert.equal(allows({ planQuery: { data: { dataState: "FRESH" }, ...failure } }), false);
  for (const state of ["CAPABILITY_UNAVAILABLE", "NOT_REQUESTED", "SCHEDULED", "SENT", "SKIPPED", "FAILED", "RESULT_UNKNOWN"])
    assert.equal(allows({ selectedReminderNotification: { state, planRevision: 2, scheduleVersion: "v" } }), false, state);
  assert.equal(allows({ selectedReminderNotification: { state: "AUTHORIZATION_REQUIRED", planRevision: 1, scheduleVersion: "v" } }), false);
});
