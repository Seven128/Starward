import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { contributionRecordPrimaryAction, resolveContributionEditorRecord } from "./contribution-record-model";
import { contributionValidationAnchor } from "./validation-anchor";
import type { ContributionForm } from "./use-contribution-form";
import type { ContributionSubmission } from "@starward/miniapp-contracts";

type Node = { type: string; props: Record<string, unknown>; children: unknown[] };
const parsed = ts.createSourceFile("editor.tsx", readFileSync(new URL("./contribution-editor.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "ContributionEditor")!.getText(parsed).replace("export ", "");
const modelSource = ts.createSourceFile("model.ts", readFileSync(new URL("./contribution-model.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const stateDeclaration = modelSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "contributionSubmissionState")!.getText(modelSource).replace("export ", "");
const contributionSubmissionState = vm.runInNewContext(ts.transpileModule(stateDeclaration + "\ncontributionSubmissionState;", {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText);
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("children" in value)) return [];
  return [value as Node, ...(value as Node).children.flatMap(nodes)];
}
function render(form: ContributionForm, props: Record<string, unknown> = {}, source = declaration) {
  const inert = ["View", "Text", "Button", "ScrollView", "NotificationRegion", "CustomNav", "StatusPanel", "SoftButton", "SelectionTabs",
    "SpotDocumentFields", "ContributionRecordDetail", "ContributionActions", "ContributionDeleteDraftAction", "ContributionHistory", "ContributionContextSection",
    "ContributionEvidenceSection", "ContributionLocationSection", "ContributionMediaSection", "ContributionCandidateAddressControl",
    "ContributionCandidateCoordinateConsent", "ToggleField"];
  const component = vm.runInNewContext(ts.transpileModule(source + "\nContributionEditor;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, jsxFactory: "h", jsxFragmentFactory: "Fragment" },
  }).outputText, {
    ...Object.fromEntries(inert.map(name => [name, name])), Fragment: "Fragment",
    h: (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => ({ type, props: props ?? {}, children }),
    useThemeClass: () => "theme-day", useContributionForm: () => form, useContributionCommands: () => ({}),
    useRef: (current: unknown) => ({ current }), useState: (value: unknown) => [value, () => {}],
    useCallback: (callback: unknown) => callback, useEffect() {}, useDidShow() {}, useDidHide() {},
    currentDraftUserId: () => "owner", contributionRecordPrimaryAction, contributionSubmissionState, resolveContributionEditorRecord, contributionValidationAnchor,
    useNativeEditorLeaveGuard: () => ({}), contributionSavedState: () => "已保存", SPOT_DOCUMENT_CHAPTERS: [["place", "地点"]],
    useSpotDocumentNavigation: () => ({ chapter: "place", anchor: "", jump() {}, scrollTo() {}, onScroll() {} }),
  });
  return nodes(component({ ...(props.embedded ? {} : { renderRecordDetail: (item: unknown, onBack: unknown) =>
    ({ type: "ContributionRecordDetail", props: { item, onBack }, children: [] }) }), ...props }));
}
function form(state = "PENDING_REVIEW", available = true): ContributionForm {
  const item = { submissionId: "contribution:test", kind: "NEW_SPOT_PROPOSAL", submissionState: state, revision: 2, media: [] } as unknown as ContributionSubmission;
  return { owner: "owner", ownerChanged: false, forceNew: false, requestedSubmissionId: item.submissionId,
    draft: null, phase: "FORM", kind: "NEW_SPOT_PROPOSAL", currentMedia: [], candidateMediaPreviews: {}, candidateFields: {},
    capabilities: {}, history: { data: { data: { submissions: available ? [item] : [] } } },
  } as unknown as ContributionForm;
}
function noEditor(output: Node[]) {
  assert(!output.some(node => ["SpotDocumentFields", "ContributionActions", "ContributionHistory"].includes(node.type)));
}

test("standalone route uses the form-owned requested identity and renders pending content read-only", () => {
  const output = render(form());
  noEditor(output);
  assert(output.some(node => node.type === "ContributionRecordDetail"));
  const oldRoute = declaration.replace("form.requestedSubmissionId || form.draft?.submissionId", "submissionId || form.draft?.submissionId");
  assert.throws(() => noEditor(render(form(), {}, oldRoute)), "the escaped route-identity regression must be detected");
});
test("missing or changed-account requested records never become a new editable form", () => {
  noEditor(render(form("PENDING_REVIEW", false)));
  noEditor(render({ ...form(), ownerChanged: true }));
  noEditor(render({ ...form(), owner: null }));
});
test("successful submit leaves a frozen record while explicit editable and embedded consumers retain their contracts", () => {
  const submitted = form();
  submitted.draft = submitted.history.data!.data.submissions[0]!;
  submitted.phase = "HISTORY";
  submitted.requestedSubmissionId = "";
  noEditor(render(submitted));
  assert(render(form("REJECTED")).some(node => node.type === "SpotDocumentFields"));
  assert(render(submitted, { embedded: true }).some(node => node.type === "SpotDocumentFields"));
});

test("rejected new-place editing keeps its public review reason before the complete editable fields", () => {
  const rejected = form("REJECTED");
  rejected.history.data!.data.submissions[0]!.review = { reason: "请补充入口照片" } as ContributionSubmission["review"];
  const output = render(rejected);
  const review = output.findIndex(node => node.props.className === "contribution-review-note");
  const fields = output.findIndex(node => node.type === "SpotDocumentFields");
  assert(review >= 0 && review < fields);
  assert(output.some(node => node.children.includes("请补充入口照片")));
});

test("embedded terminal receipts freeze editing while pending first-submit still returns through its existing callback", () => {
  for (const state of ["ACCEPTED", "WITHDRAWN"]) {
    const terminal = form(state);
    terminal.draft = terminal.history.data!.data.submissions[0]!;
    terminal.phase = "HISTORY";
    noEditor(render(terminal, { embedded: true }));
  }
  const pending = form();
  pending.draft = pending.history.data!.data.submissions[0]!;
  pending.phase = "HISTORY";
  assert(render(pending, { embedded: true }).some(node => node.type === "SpotDocumentFields"));
});
