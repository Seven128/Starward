import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { acknowledgePlanSave, createPlanSaveRetry, planContextIdentity, PlanSaveRecoveryError, PlanSaveReviewRequired, resolvePlanCreationId, samePlanSaveIntent, type PlanSaveInput } from "../../../services/plan-save-retry";
import { clearPlanDraft, clearUnchangedPlanDraft, parsePlanDraft, planDraftMatchesInput } from "./plan-draft";
import { parsePlanReminders, resolvePlanTiming, type PlanTravel } from "@starward/miniapp-contracts";
import { planTravelNeedsExplicitOrigin } from "./plan-travel";

function runtime(changeAccount = false) {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["save", "retainDraft", "confirmPlanConflict"].includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 3);
  class Conflict extends Error { code = "CONFLICT"; }
  const calls: string[] = [], submitted: number[] = [];
  const storage = new Map<string, unknown>();
  const context: Record<string, any> = {
    parsePlanReminders, resolvePlanTiming, planTravelNeedsExplicitOrigin, reminders: [],
    planContextIdentity,
    PlanSaveRecoveryError, PlanSaveReviewRequired, resolvePlanCreationId, parsePlanDraft, clearPlanDraft, clearUnchangedPlanDraft, planDraftMatchesInput, acknowledgePlanSave,
    Taro: { getStorageSync: (key: string) => storage.get(key), setStorageSync: (key: string, value: unknown) => { storage.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { storage.delete(key); } },
    appliedContextDefaults: { current: false }, draftScopePlanId: { current: null },
    creationPlanId: { current: null }, creationConfirmed: { current: false }, recoveredSaveReceipt: { current: null },
    hydratedPlanId: { current: null }, newPlanRequested: { current: true },
    setDraftStorageFailed() {}, setRecoveredLocalDraft() {}, setEditing() {}, setPendingSaveChoices() {},
    setSaveRecoveryError() {}, setSaveRecoveryReviewed() {}, dedicatedEditor: false,
    savePlan: (plan: unknown) => { context.activePlan = plan; },
    setActivePlanId: (id: string) => { context.activePlanId = id; },
    readDraft: () => parsePlanDraft(storage.get("draft")),
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
    planQuery: { refetch: async () => { calls.push("refetch"); return { dataState: "FRESH", data: { plans: [{ planId: "plan", revision: 10, notes: "server" }] } }; } },
    replacePlans: () => calls.push("replace"),
    setConflictPlan: (plan: unknown) => { context.conflictPlan = plan; },
    announce: () => calls.push("notice"), errorMessage: () => "error",
    showFieldError: (field: string) => calls.push(`field:${field}`),
  };
  const actions = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({save, retainDraft, confirmPlanConflict});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return { ...actions, context, calls, submitted, storage } as { save: () => Promise<void>; retainDraft: (patch: object) => boolean; confirmPlanConflict: () => void; context: Record<string, any>; calls: string[]; submitted: number[]; storage: Map<string, unknown> };
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

test("two save taps during an unresolved request dispatch once and preserve the draft after failure", async () => {
  const page = runtime();
  let rejectRequest: ((error: Error) => void) | undefined;
  let dispatched = 0;
  page.context.saveObservationPlan = async () => {
    dispatched++;
    return new Promise((_resolve, reject) => { rejectRequest = reject; });
  };
  const first = page.save();
  await page.save();
  assert.equal(dispatched, 1);
  assert.equal(page.context.mutationBusy.current, true);
  assert.equal(page.context.notes, "my draft");
  assert.ok(rejectRequest);
  rejectRequest(new Error("network receipt unknown"));
  await first;
  assert.equal(page.context.mutationBusy.current, false);
  assert.equal(page.context.notes, "my draft");
});

test("changing a new draft after a lost create receipt cannot create a second plan", async () => {
  const page = runtime();
  page.context.activePlanId = null;
  page.context.activePlan = null;
  page.context.draftBaseRevision.current = null as never;
  const plans = new Map<string, { planId: string; notes: string; revision: number }>();
  const receipts = new Map<string, { data: { planId: string; notes: string; revision: number } }>();
  let key = 0;
  let loseReceipt = true;
  const retry = createPlanSaveRetry(page.context.Taro, () => `lost-create:${++key}`, () => false);
  page.context.saveObservationPlan = async (plan: PlanSaveInput, observationContextId: string, expectedRevision: number | null) => {
    const input = { ...plan, observationContextId, expectedRevision, contextIdentity: "same-context" };
    const result = await retry("owner", input, async (requestKey, original) => {
      let receipt = receipts.get(requestKey);
      if (!receipt) {
        const previous = plans.get(original.planId);
        assert.equal(original.expectedRevision, previous?.revision ?? null);
        receipt = { data: { planId: original.planId, notes: original.notes, revision: (previous?.revision ?? 0) + 1 } };
        plans.set(original.planId, receipt.data);
        receipts.set(requestKey, receipt);
      }
      if (loseReceipt) { loseReceipt = false; throw new Error("committed but receipt lost"); }
      return receipt;
    });
    page.context.activePlan = { ...plans.get(result.input.planId), contextSnapshot: { schemaVersion: "observation-context-snapshot-v2", routeOrigin: null } };
    if (!samePlanSaveIntent(input, result.input)) throw new PlanSaveReviewRequired(result.input.planId, page.context.activePlan, result.result.data.revision, result.receipt);
    return { ...result.result, saveReceipt: result.receipt };
  };
  await page.save();
  assert.equal(plans.size, 1, "the first request really committed");
  page.context.notes = "same draft, corrected notes";
  await page.save();
  assert.equal(plans.size, 1, "editing this draft must not create another plan");
  assert.equal(page.context.notes, "same draft, corrected notes");
  assert.equal(page.context.conflictPlan.revision, 1);
  page.confirmPlanConflict();
  await page.save();
  assert.equal(plans.size, 1);
  assert.equal([...plans.values()][0]!.notes, "same draft, corrected notes");
  assert.equal([...plans.values()][0]!.revision, 2);
  assert.equal(page.storage.size, 0, "both the original draft scope and exact journal entry were cleared");
});

test("a conflict arriving after account change cannot refresh or replace the new account's plans", async () => {
  const page = runtime(true);
  await page.save();
  assert.deepEqual(page.calls, []);
  assert.equal(page.context.conflictPlan, null);
  assert.equal(page.context.mutationBusy.current, false);
});

test("saving an existing page cannot claim and clear another editor's earlier persisted change", async () => {
  const page = runtime();
  page.retainDraft({ notes: "another editor's unsaved B" });
  const before = JSON.stringify(page.storage.get("draft"));
  let submitted = "";
  page.context.saveObservationPlan = async (plan: { notes: string }) => {
    submitted = plan.notes;
    return { data: { planId: "plan", revision: 3 }, saveReceipt: { owner: "owner", planId: "plan", key: "test:save" } };
  };
  await page.save();
  assert.equal(submitted, "my draft");
  assert.equal(JSON.stringify(page.storage.get("draft")), before);
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
      savePlan: () => { saved++; }, clearUnchangedPlanDraft: () => { cleared++; return true; },
      setRecoveredLocalDraft() {}, hydratedPlanId: { current: "plan" }, newPlanRequested: { current: false },
      setActivePlanId() {}, setEditing() {}, checklist: {}, planChecklistStorageKey: () => "checklist",
      nativeLeaveGuard: {
        suspendForProgrammaticLeave: () => { suspended++; },
        restoreAfterFailedProgrammaticLeave: () => { restored++; },
      },
      Taro: {
        getStorageSync() {},
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
