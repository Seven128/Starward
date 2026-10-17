import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { CONTRIBUTION_FORMAL_FIELD_KEYS, type ContributionSubmission } from "@starward/miniapp-contracts";
import { contributionRecordChangeSummary, contributionRecordStatus } from "./contribution-record-model";

function feedback(): ContributionSubmission {
  const baseline = { fields: Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map(key => [key, null])),
    media: { parking: ["photo:old"], toilet: [], site: [] } };
  const accepted = { baseline, proposal: { fields: { detail: "已经放弃的现场修改" }, media: {} },
    resolvedBaseline: baseline, resolvedProposal: { fields: { hours: "18:00—次日06:00" }, media: { parking: [] } } };
  return { kind: "CORRECTION", submissionId: "contribution:summary", submissionState: "ACCEPTED", state: "ACCEPTED",
    publicationImpact: "ACTIVE_REVISION_UPDATED", updatedAt: "2026-10-09T00:00:00.000Z",
    formalFeedback: { ...accepted, resolvedProposal: { fields: { toiletNote: "未提交的工作副本" }, media: {} } },
    attempts: [{ snapshot: { formalFeedback: accepted } }], review: null } as unknown as ContributionSubmission;
}

const ast = ts.createSourceFile("records.tsx", readFileSync(new URL("./contribution-records.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let element = "";
const visit = (node: ts.Node) => {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(prop => ts.isJsxAttribute(prop)
    && prop.name.getText(ast) === "data-control" && prop.initializer?.getText(ast) === '"contribution-records"')) element = node.getText(ast);
  ts.forEachChild(node, visit);
};
visit(ast); assert.ok(element);
function render(item: ContributionSubmission) {
  const tree = vm.runInNewContext(ts.transpileModule(`(${element})`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText, {
    React: { createElement: (type: string, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", Text: "Text", Button: "Button", SelectionTabs: "SelectionTabs", StatusPanel: "StatusPanel",
    ContributionSpotIdentityCard: "ContributionSpotIdentityCard", ContributionRecordStatus: "ContributionRecordStatus",
    group: "FEEDBACK", activeFilter: "ALL", filters: [["ALL", "全部"]], confirmedEmpty: false, visible: [item],
    form: { history: { isPending: false, isError: false, refreshError: null, data: { dataState: "FRESH" } } },
    contributionRecordStatus, contributionRecordChangeSummary, contributionSubmissionState: (value: ContributionSubmission) => value.submissionState,
    displayBeijingTimestamp: () => "10/09 08:00", renderRecordActions: () => null,
  });
  const text = (node: any): string => node == null || typeof node === "boolean" ? ""
    : Array.isArray(node) ? node.map(text).join("") : typeof node === "object" ? text(node.children) : String(node);
  return text(tree);
}

test("feedback summary keeps only frozen accepted fields and explicit photo removal", () => {
  assert.deepEqual(contributionRecordChangeSummary(feedback()), [
    { key: "field:hours", label: "开放时间" }, { key: "photo:parking", label: "停车照片" },
  ]);
  const legacy = feedback();
  legacy.attempts = [];
  delete legacy.formalFeedback;
  assert.deepEqual(contributionRecordChangeSummary(legacy), []);
});

test("summary preserves legacy differences, clearing values and reordered photos without inventing empty changes", () => {
  const item = feedback();
  const frozen = item.attempts[0]?.snapshot.formalFeedback;
  assert.ok(frozen);
  const baseline = { ...frozen.baseline, fields: { ...frozen.baseline.fields, contact: "原联系" },
    media: { parking: ["photo:one", "photo:two"] as never, toilet: [], site: [] } };
  const legacy = { ...item, attempts: [], formalFeedback: { baseline,
    proposal: { fields: { contact: "", detail: "" }, media: { parking: ["photo:two", "photo:one"] as never } },
    resolvedProposal: { fields: {}, media: {} } } } as ContributionSubmission;
  assert.deepEqual(contributionRecordChangeSummary(legacy), [
    { key: "field:contact", label: "场地联系" }, { key: "photo:parking", label: "停车照片" },
  ]);
});

test("actual record-list JSX presents the accepted summary and excludes discarded and working-copy fields", () => {
  const text = render(feedback());
  assert.match(text, /开放时间.*停车照片/);
  assert.doesNotMatch(text, /补充说明|洗手间说明/);
});
