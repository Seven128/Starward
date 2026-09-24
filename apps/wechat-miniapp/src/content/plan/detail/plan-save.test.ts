import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { planContextIdentity } from "../../../services/plan-save-retry";
import { parsePlanReminders, resolvePlanTiming, type PlanTravel } from "@starward/miniapp-contracts";
import { planTravelNeedsExplicitOrigin } from "./plan-travel";

function runtime(changeAccount = false) {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "save") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  class Conflict extends Error { code = "CONFLICT"; }
  const calls: string[] = [], submitted: number[] = [];
  const context = {
    parsePlanReminders, resolvePlanTiming, planTravelNeedsExplicitOrigin, reminders: [],
    planContextIdentity,
    PlanSaveRecoveryError: class extends Error {},
    mutationBusy: { current: false }, conflictPlan: null as unknown,
    activePlanId: "plan" as string | null, activePlan: { planId: "plan", revision: 9, spotId: "spot",
      contextSnapshot: { schemaVersion: "observation-context-snapshot-v2", routeOrigin: null } } as unknown,
    scopedDraftUserId: () => "owner" as string | null,
    activeContext: { contextId: "context", location: {}, routeOrigin: null as { displayName: string } | null },
    resolvePlanSaveSpotId: () => "spot", selectedSpotId: "spot", formalSpots: [],
    localDate: "2026-09-06", localTime: "22:00", timezone: "Asia/Shanghai", notes: "my draft",
    timing: { endLocalDate: "2026-09-07", endLocalTime: "02:00", departureLocalDate: "2026-09-06", departureLocalTime: "20:00" },
    travel: { origin: "深圳", mode: "DRIVING" } as PlanTravel, eventOccurrenceIds: [],
    draftBaseRevision: { current: 2 },
    setSaving() {}, planDraftKey: () => "draft", MiniappApiError: Conflict,
    saveObservationPlan: async (_plan: unknown, _context: unknown, revision: number) => {
      submitted.push(revision);
      if (changeAccount) context.scopedDraftUserId = () => null;
      throw new Conflict();
    },
    planQuery: { refetch: async () => { calls.push("refetch"); return { data: { plans: [{ planId: "plan", revision: 10, notes: "server" }] } }; } },
    replacePlans: () => calls.push("replace"),
    setConflictPlan: (plan: unknown) => { context.conflictPlan = plan; },
    announce: () => calls.push("notice"), errorMessage: () => "error",
    showFieldError: (field: string) => calls.push(`field:${field}`),
  };
  const save = vm.runInNewContext(ts.transpileModule(declaration + "\nsave;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, context) as () => Promise<void>;
  return { save, context, calls, submitted };
}

test("saving uses the draft revision and requires review after conflict without modifying input", async () => {
  const page = runtime();
  await page.save();
  assert.deepEqual(page.submitted, [2]);
  assert.equal(page.context.draftBaseRevision.current, 2);
  assert.equal(page.context.notes, "my draft");
  assert.equal((page.context.conflictPlan as { revision: number }).revision, 10);
  await page.save();
  assert.deepEqual(page.submitted, [2]);
  assert.equal(page.context.mutationBusy.current, false);
});

test("a conflict arriving after account change cannot refresh or replace the new account's plans", async () => {
  const page = runtime(true);
  await page.save();
  assert.deepEqual(page.calls, []);
  assert.equal(page.context.conflictPlan, null);
  assert.equal(page.context.mutationBusy.current, false);
});

test("incomplete timing preserves the draft and never dispatches a save", async () => {
  const page = runtime();
  page.context.timing.endLocalTime = "";
  await page.save();
  assert.deepEqual(page.submitted, []);
  assert.equal(page.context.timing.endLocalTime, "");
  assert.equal(page.context.notes, "my draft");
  assert.deepEqual(page.calls, ["field:timing"]);
});

test("an unconfirmed map origin in a restored new-plan draft cannot be saved as departure", async () => {
  for (const origin of ["当前地图中心", "本次授权位置", "深圳湾海滨公园"]) {
    const page = runtime();
    page.context.activePlanId = null;
    page.context.activePlan = null;
    page.context.activeContext.routeOrigin = { displayName: origin };
    page.context.travel = { origin, mode: "DRIVING" };
    await page.save();
    assert.deepEqual(page.submitted, []);
    assert.deepEqual(page.calls, ["field:travel"]);
    assert.equal(page.context.travel.origin, origin);
  }
});

test("explicitly edited departure text is not mistaken for an old automatic Map default", async () => {
  const page = runtime();
  page.context.activePlanId = null;
  page.context.activePlan = null;
  page.context.activeContext.routeOrigin = { displayName: "当前地图中心" };
  page.context.travel = { origin: "当前地图中心", mode: "DRIVING", originLocation: null };
  await page.save();
  assert.deepEqual(page.submitted, [2]);
});

test("dedicated editor opens the saved plan without a back stack or when back navigation fails", async () => {
  for (const scenario of ["back", "direct", "back-fails", "all-navigation-fails"] as const) {
    const page = runtime();
    let saved = 0, back = 0, detail = 0, cleared = 0, suspended = 0, restored = 0;
    Object.assign(page.context, {
      dedicatedEditor: true,
      saveObservationPlan: async () => ({ data: { planId: "plan", revision: 3 } }),
      savePlan: () => { saved++; }, clearPlanDraft: () => { cleared++; return true; },
      setRecoveredLocalDraft() {}, hydratedPlanId: { current: "plan" }, newPlanRequested: { current: false },
      setActivePlanId() {}, setEditing() {}, checklist: {}, planChecklistStorageKey: () => "checklist",
      nativeLeaveGuard: {
        suspendForProgrammaticLeave: () => { suspended++; },
        restoreAfterFailedProgrammaticLeave: () => { restored++; },
      },
      Taro: {
        setStorageSync() {},
        getCurrentPages: () => scenario === "direct" || scenario === "all-navigation-fails" ? [{}] : [{}, {}],
        navigateBack: async () => { back++; if (scenario === "back-fails") throw new Error("navigation_failed"); },
        redirectTo: async ({ url }: { url: string }) => {
          detail++;
          assert.equal(url, "/content/plan/detail/index?planId=plan");
          if (scenario === "all-navigation-fails") throw new Error("detail_failed");
        },
      },
    });
    await page.save();
    assert.equal(saved, 1); assert.equal(cleared, 1);
    assert.equal(back, scenario === "back" || scenario === "back-fails" ? 1 : 0);
    assert.equal(detail, scenario === "back" ? 0 : 1);
    assert.equal(suspended, 1);
    assert.equal(restored, scenario === "all-navigation-fails" ? 1 : 0);
    assert.equal(page.context.draftBaseRevision.current, 3);
    assert.equal(page.context.mutationBusy.current, false);
    assert.deepEqual(page.calls, scenario === "all-navigation-fails" ? ["notice", "notice"] : ["notice"]);
  }
});
