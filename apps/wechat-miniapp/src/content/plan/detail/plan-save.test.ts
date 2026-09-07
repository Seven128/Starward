import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { planContextIdentity } from "../../../services/plan-save-retry";

function runtime(changeAccount = false) {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
    planContextIdentity,
    PlanSaveRecoveryError: class extends Error {},
    mutationBusy: { current: false }, conflictPlan: null as unknown,
    activePlanId: "plan", activePlan: { planId: "plan", revision: 9, spotId: "spot" },
    scopedDraftUserId: () => "owner" as string | null,
    activeContext: { contextId: "context", location: {} },
    resolvePlanSaveSpotId: () => "spot", selectedSpotId: "spot", formalSpots: [],
    localDate: "2026-09-06", localTime: "22:00", notes: "my draft",
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
