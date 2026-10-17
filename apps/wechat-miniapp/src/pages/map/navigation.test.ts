import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { pendingProposalContextLocation, samePendingProposalIntent } from "./private-contribution-transition";

const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

test("map navigation respects travel warning cancellation and changing selection", async () => {
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "onPanelNavigate") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  for (const scenario of ["confirm", "cancel", "changed", "hidden", "failed", "redCancel"] as const) {
    const epoch = { current: 0 }, calls: string[] = [];
    let selectedSpotId = "spot:a";
    const navigate = vm.runInNewContext(ts.transpileModule(declaration + "\nonPanelNavigate;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      navigationEpoch: epoch,
      selected: { spotId: "spot:a", visibilityPolicy: "PUBLIC_EXACT", gcj02: { latitude: 22, longitude: 114 } },
      spotDetail: { accessAndSafety: { openness: "CLOSED", restrictions: ["关闭"], guidance: [] } },
      useAppStore: { getState: () => ({ selectedSpotId }) },
      navigationHandoff: { confirm: async () => {
        if (scenario === "redCancel") { calls.push("handoff"); return false; }
        return true;
      } },
      notify: () => calls.push("notice"), errorMessage: () => "unavailable",
      Taro: {
        showModal: async () => {
          calls.push("warning");
          if (scenario === "changed") selectedSpotId = "spot:b";
          if (scenario === "hidden") epoch.current++;
          if (scenario === "failed") throw new Error("unavailable");
          return { confirm: scenario !== "cancel" };
        },
        openLocation: async () => calls.push("open"),
      },
    }) as () => Promise<void>;
    await navigate();
    assert.deepEqual(calls, scenario === "confirm" ? ["warning", "open"] : scenario === "failed" ? ["warning", "notice"] : scenario === "redCancel" ? ["handoff"] : ["warning"]);
  }
});

test("private proposal entry preserves the current candidate and rejects obsolete resolve results", async () => {
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "onProposalCloud") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(declaration);
  for (const scenario of ["success", "missing-location", "no-consent", "changed", "hidden", "owner-changed", "failed", "late-failed"] as const) {
    const epoch = { current: 0 }, proposal = { current: { submissionId: "contribution:owned" } as { submissionId: string } | null };
    const original = { localDate: "2026-10-11", selectedAtUtc: "2026-10-11T13:00:01.527Z", eventInstanceId: null, targetProfile: "DAILY" };
    const resolved = { ...original, contextId: "ctx:candidate", timezone: "Asia/Shanghai", contextFingerprint: "proposal:2",
      schemaVersion: "observation-context-v3", location: { kind: "PENDING_PROPOSAL", displayName: "候选名称" },
      privateProposal: { ownerId: "user:owner", submissionId: "contribution:owned", attemptId: "attempt:current", attemptBaseRevision: 1 } };
    const calls: string[] = []; let payload: any, navigation: string | undefined, accepted: unknown;
    let finish!: (value: { dataState: string; data: typeof resolved }) => void, fail!: (error: Error) => void;
    const response = new Promise<{ dataState: string; data: typeof resolved }>((resolve, reject) => { finish = resolve; fail = reject; });
    const entry = vm.runInNewContext(ts.transpileModule(declaration + "\nonProposalCloud;", {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText, {
      navigationEpoch: epoch, selectedProposalRef: proposal,
      pendingProposalContextLocation, samePendingProposalIntent, currentDraftUserId: () => "user:owner",
      skyEntry: {prepare: () => ({isCurrent: () => true, cancelPreparation() {}})},
      useAppStore: { getState: () => ({ observationContext: original }) },
      currentTimezoneHint: () => "Asia/Shanghai", localDateForNow: () => "2026-10-11",
      resolveObservationContext: (input: unknown) => { calls.push("resolve"); payload = input; return response; },
      setObservationContext: (context: unknown) => { calls.push("accept"); accepted = context; },
      openSkyPage: (url: string, _entry: string, _preparation: unknown, accept: () => void) => { accept(); calls.push("navigate"); navigation = url; },
      notify: () => calls.push("notice"), errorMessage: () => "unavailable", isMiniappRequestCancelled: () => false,
    }) as (submission: Record<string, unknown>) => Promise<void>;
    const submission = { submissionId: "contribution:owned", revision: 2, preciseLocationConsent: scenario !== "no-consent",
      kind: "NEW_SPOT_PROPOSAL", submissionState: "PENDING_REVIEW", publicationImpact: "CANDIDATE_UPDATED",
      attempts: [{ attemptId: "attempt:current", baseRevision: 1, snapshot: { preciseLocationConsent: true,
        candidateLocation: scenario === "missing-location" ? null : { displayName: "候选名称" } } }],
      candidateLocation: scenario === "missing-location" ? null : { displayName: "来源名", wgs84: { system: "WGS84", latitude: 22.588, longitude: 114.302 } },
      candidateProfile: { fields: { name: "候选名称" } },
    };
    proposal.current = submission;
    const work = entry(submission);
    if (scenario === "changed") proposal.current = { submissionId: "contribution:other" };
    if (scenario === "hidden" || scenario === "late-failed") epoch.current++;
    if (scenario === "owner-changed") proposal.current = null;
    if (scenario === "failed" || scenario === "late-failed") fail(new Error("unavailable"));
    else if (scenario !== "missing-location" && scenario !== "no-consent") finish({ dataState: "FRESH", data: resolved });
    await work;
    assert.deepEqual(calls, scenario === "success" ? ["resolve", "accept", "navigate"] :
      scenario === "missing-location" || scenario === "no-consent" ? ["notice"] : scenario === "failed" ? ["resolve", "notice"] : ["resolve"]);
    if (payload) {
      assert.equal(payload.location.kind, "PENDING_PROPOSAL"); assert.equal(payload.location.submissionId, submission.submissionId);
      assert.equal(payload.location.attemptId, "attempt:current"); assert.equal(payload.location.attemptBaseRevision, 1);
      assert.equal(payload.location.wgs84, undefined, "the frozen server-owned proposal supplies its coordinates");
      assert.equal(payload.selectedAt, original.selectedAtUtc); assert.equal(payload.localDate, original.localDate);
    }
    if (scenario === "success") {
      assert.equal(accepted, resolved); assert.ok(navigation?.startsWith("/sky/detail/index?"));
      const route = new URL(navigation!, "https://fixture.invalid").searchParams;
      assert.equal(route.get("spotId"), submission.submissionId); assert.equal(route.get("locationName"), "候选名称");
      assert.equal(route.get("contextId"), resolved.contextId); assert.equal(route.get("selectedAt"), original.selectedAtUtc);
      assert.equal(route.get("dataRevision"), "proposal:2");
    } else { assert.equal(accepted, undefined); assert.equal(navigation, undefined); }
  }
});

test("return from private Sky keeps the same owner's candidate panel without retaining a foreign selection", () => {
  let callback = "", selectedExpression = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "selectedProposal") selectedExpression = node.initializer!.getText(source);
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" &&
      node.arguments[0]?.getText(source).includes("lastHandledSelectedId.current = null")) callback = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(callback && selectedExpression);
  for (const scenario of ["own", "foreign", "none"] as const) {
    const submission = { submissionId: "contribution:owned" }, state = scenario === "none" ? null : { owner: "user:one", submission };
    const scope = { selectedSpotId: null, pageVisible: false, bottomPresentation: "spot-panel", selectedProposalState: state,
      currentContributionOwner: scenario === "foreign" ? "user:two" : "user:one", selectedProposal: null as unknown,
      lastHandledSelectedId: { current: "spot:previous" as string | null }, setBottomPresentation(value: string) { this.bottomPresentation = value; } };
    const context = vm.createContext({ ...scope, setBottomPresentation: (value: string) => { context.bottomPresentation = value; } });
    context.selectedProposal = vm.runInContext(ts.transpileModule(selectedExpression, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    const effect = vm.runInContext(ts.transpileModule(callback, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context) as () => void;
    effect(); context.pageVisible = true; effect();
    assert.equal(context.bottomPresentation, scenario === "own" ? "spot-panel" : "none", scenario);
    assert.equal(context.selectedProposal, scenario === "own" ? submission : null);
    assert.equal(context.lastHandledSelectedId.current, null);
  }
});
