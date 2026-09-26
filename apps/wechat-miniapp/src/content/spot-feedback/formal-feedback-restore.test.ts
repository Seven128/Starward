import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { CONTRIBUTION_FORMAL_FIELD_KEYS, resolveContributionFormalRebase } from "@starward/miniapp-contracts";
import { formalFeedbackFrozenView } from "../contribution/formal-feedback-snapshot.ts";
import { createFormalMediaSelection } from "./formal-media-selection.ts";
import { emptySpotDocumentValues } from "../spot-document.ts";

for (const historical of [false, true]) test(`feedback editor restores ${historical ? "legacy authored" : "accepted"} snapshot before checking latest formal version`, () => {
  const source = ts.createSourceFile("feedback.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const helpers = source.statements.filter(node => ts.isFunctionDeclaration(node) && ["valuesFrom", "mediaKindOf"].includes(node.name?.text ?? ""));
  let effect: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("setResubmissionRevision(record.revision)")) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(effect);
  const fields = Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map(key => [key, null]));
  const original = { spotId: "spot:restore", revision: 1, fields: { ...fields, name: "原点名", parkingNote: "原说明" }, media: { site: ["media:old"], parking: [], toilet: [] } };
  const accepted = { ...original, revision: 2, fields: { ...original.fields, parkingNote: "已采用正式说明" }, media: { ...original.media, site: ["media:current"] } };
  const prior = { baseline: original, proposal: { fields: { parkingNote: "已放弃修改", detail: "保留的现场说明" }, media: { site: ["media:old"] } },
    ...(historical ? {} : { resolvedBaseline: accepted }), resolvedProposal: { fields: { detail: "保留的现场说明" }, media: {} } };
  const latest = historical ? original : accepted;
  const updates: Record<string, any> = {};
  const setters = Object.fromEntries(["Baseline", "Values", "ResubmissionRevision", "ReviewReason", "ActiveSubmissionId", "PriorMedia", "MediaSelection", "RightsConfirmed", "CurrentBaseline", "Conflicts"].map(key => [`set${key}`, (value: unknown) => { updates[key] = value; }]));
  const code = helpers.map(node => node.getText(source)).join("\n") + `\n(${effect.getText(source)})();`;
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ...setters, CONTRIBUTION_FORMAL_FIELD_KEYS, emptySpotDocumentValues, formalFeedbackFrozenView, createFormalMediaSelection, resolveContributionFormalRebase,
    baseline: null, query: { data: { data: latest } }, history: { data: { data: { submissions: [] } } }, accountOwnerId: "owner:a", currentDraftUserId: () => "owner:a", editorOwner: { current: null }, submissionId: "submission:prior",
    requestedFeedback: { status: "READY", record: { submissionId: "submission:prior", revision: 7, formalFeedback: prior, media: [], rightsConfirmed: true, review: { reason: "请补充说明" } } },
  });
  assert.equal(updates.Baseline.revision, historical ? 1 : 2);
  assert.equal(updates.Values.parkingNote, historical ? "已放弃修改" : "已采用正式说明");
  assert.equal(updates.Values.detail, "保留的现场说明");
  assert.deepEqual(updates.MediaSelection.site, historical ? ["media:old"] : ["media:current"]);
  assert.equal(updates.Conflicts.length, 0);
  assert.equal(updates.ResubmissionRevision, 7);
});
