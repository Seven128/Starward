import { testOperation } from "./operation-test-support";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { candidateIntakeIssues, emptyCandidateIntake, type ContributionCandidateIntake, type ContributionSubmission } from "@starward/miniapp-contracts";
import { emptySpotDocumentValues } from "../spot-document";
import { candidateDocumentProposal, candidateIntakeFromProfile, candidateIntakeFacts, CANDIDATE_INTAKE_ERRORS } from "./candidate-document";
import { parseLocalContributionDraft } from "./local-draft";
import { contributionSubmittedPlaceFacts } from "./contribution-record-model";
import { parseCoordinateInput } from "./coordinate-input";

function explicitUnknown(): ContributionCandidateIntake {
  return { ...emptyCandidateIntake(), openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN", contact: { ...emptyCandidateIntake().contact, kind: "UNKNOWN" } };
}
const local = { schema: 1, baseSubmissionId: null, baseRevision: null, spotId: "", spotName: "", kind: "NEW_SPOT_PROPOSAL", topics: [], date: "", time: "", detail: "", candidateName: "山顶", candidateRegion: "", latitude: "22.5", longitude: "114.5", rightsConfirmed: false, preciseLocationConsent: true };
test("legacy editing preserves selected access and private contact notes without inventing a night rating or public permission", () => {
  const old = { fields: { openness: "不开放", access: "禁止进入", safety: "旧风险说明", contact: "旧私人联系说明" }, media: {} };
  const intake = candidateIntakeFromProfile(old);
  assert.equal(intake.openness, "CLOSED"); assert.equal(intake.legalEntry, "PROHIBITED");
  assert.equal(intake.nightSafety, null); assert.equal(intake.contact.kind, null);
  assert.equal(intake.contact.publicPermissionConfirmed, false); assert.equal(intake.contact.legacyNote, old.fields.contact);
  const profile = candidateDocumentProposal({ ...emptySpotDocumentValues(), ...old.fields }, {}, intake);
  assert.equal(profile.fields.contact, undefined); assert.equal(profile.fields.safety, old.fields.safety);
  assert.equal(profile.intake?.contact.legacyNote, old.fields.contact);
  assert.equal(old.fields.contact, "旧私人联系说明");
});
test("explicit unknown and incomplete answers round-trip through the actual local parser while corrupt versions stay rejected", () => {
  const values = { ...emptySpotDocumentValues(), name: "山顶", safety: "待了解的风险" };
  const profile = candidateDocumentProposal(values, { site: ["upload:owned"] }, explicitUnknown());
  assert.deepEqual(parseLocalContributionDraft({ ...local, candidateProfile: profile })?.candidateProfile, profile);
  assert.deepEqual(candidateIntakeIssues(profile), []);
  const incomplete = candidateDocumentProposal(values, {}, emptyCandidateIntake());
  assert.deepEqual(parseLocalContributionDraft({ ...local, candidateProfile: incomplete })?.candidateProfile, incomplete);
  assert.equal(candidateIntakeIssues(incomplete).length, 4);
  assert.equal(parseLocalContributionDraft({ ...local, candidateProfile: { ...profile, intake: { ...profile.intake, version: 2 } } }), null);
});
test("all four contact meanings stay distinct and a public number retains purpose, permission and provenance", () => {
  for (const kind of ["PUBLIC_NUMBER", "NOT_APPLICABLE", "NO_PUBLIC_NUMBER", "UNKNOWN"] as const) {
    const intake = explicitUnknown(); intake.contact.kind = kind;
    if (kind === "PUBLIC_NUMBER") Object.assign(intake.contact, { number: "0755-12345678", purpose: "预约", publicPermissionConfirmed: true, source: "场地公开告示" });
    const profile = candidateDocumentProposal(emptySpotDocumentValues(), {}, intake);
    const facts = candidateIntakeFacts(profile);
    assert.equal(facts.find(item => item.key === "contact-answer")?.value, { PUBLIC_NUMBER: "有公开号码", NOT_APPLICABLE: "无门禁或管理方", NO_PUBLIC_NUMBER: "无公开号码", UNKNOWN: "不清楚" }[kind]);
    assert.equal(Boolean(profile.fields.contact), kind === "PUBLIC_NUMBER");
    assert.equal(facts.some(item => item.key === "contact-source"), kind === "PUBLIC_NUMBER");
  }
});
test("public-contact projection uses canonical trimmed facts without changing editable input", () => {
  const intake = explicitUnknown(); intake.contact = { kind: "PUBLIC_NUMBER", number: " 0755-12345678 ", purpose: " 预约 ", publicPermissionConfirmed: true, source: " 场地公开告示 " };
  const values = emptySpotDocumentValues(), before = JSON.stringify(intake);
  const profile = candidateDocumentProposal(values, {}, intake);
  assert.equal(profile.fields.contact, "0755-12345678（预约）");
  assert.equal(JSON.stringify(intake), before);
  intake.contact.number = " ";
  assert.equal(candidateDocumentProposal(values, {}, intake).fields.contact, undefined);
});
test("a legacy frozen attempt never borrows new working-copy intake or permission", () => {
  const profile = candidateDocumentProposal(emptySpotDocumentValues(), {}, explicitUnknown());
  const value = { kind: "NEW_SPOT_PROPOSAL", submissionState: "PENDING_REVIEW", candidateProfile: profile,
    attempts: [{ snapshot: { candidateProfile: { fields: { name: "原冻结名称" }, media: {} } } }] } as unknown as ContributionSubmission;
  assert.deepEqual(contributionSubmittedPlaceFacts(value)?.intakeFacts, []);
  value.attempts[0]!.snapshot.candidateProfile = profile;
  assert.equal(contributionSubmittedPlaceFacts(value)?.intakeFacts[0]?.value, "不清楚");
});

function productionFunction(file: string, name: string, scope: Record<string, unknown>) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  return vm.runInNewContext(ts.transpileModule(`${declaration.getText(source).replace(/^export\s/u, "")}\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
}
test("the real draft projection keeps valid coordinates without region/address and accepts incomplete intake for save", () => {
  const build = productionFunction("./contribution-model.ts", "buildDraftInput", { parseCoordinateInput, parseObservationInput: () => null });
  const values = { ...local, routeSpotId: "", hasFormalSpot: false, candidateProfile: candidateDocumentProposal(emptySpotDocumentValues(), {}, emptyCandidateIntake()) };
  const actual = build(values, () => { throw new Error("unexpected rejection"); });
  assert.equal(actual.candidateLocation.wgs84.latitude, 22.5); assert.equal(actual.candidateLocation.region, "");
  assert.equal(actual.candidateProfile.intake.openness, null);
  assert.equal(build({ ...values, latitude: "" }, () => {}).candidateLocation, null);
});
test("the real submit owner focuses incomplete intake, submits explicit unknown without address, and retries a pending receipt without saving or validating new edits", async () => {
  const requests: unknown[] = []; let saves = 0; let fail = true;
  class ApiError extends Error { statusCode = 422; }
  const create = productionFunction("./use-contribution-commands.ts", "createSubmit", { candidateIntakeIssues, CANDIDATE_INTAKE_ERRORS, parseCoordinateInput,
    MiniappApiError: ApiError, ContributionSubmitStorageError: class extends Error {}, errorMessage: (e: Error) => e.message,
    submitContribution: async (id: string, rev: number) => { requests.push([id, rev]); if (fail) throw new Error("lost receipt"); return { data: { submissionId: id, revision: rev + 1 } }; },
  });
  const fields = { ...emptySpotDocumentValues(), name: "山顶" };
  const form = { kind: "NEW_SPOT_PROPOSAL", candidateFields: fields, candidateProfile: candidateDocumentProposal(fields, {}, emptyCandidateIntake()), latitude: "22.5", longitude: "114.5", preciseLocationConsent: true,
    submitting: false, pendingSubmission: null as { submissionId: string; revision: number } | null, mediaNeedsRecovery: false,
    validationField: null as string | null, setValidationField(value: string) { this.validationField = value; },
    setSubmitting(value: boolean) { this.submitting = value; }, setPendingSubmission(value: typeof this.pendingSubmission) { this.pendingSubmission = value; },
    applyDraft() { this.pendingSubmission = null; }, history: { refetch: async () => {} }, announce() {},
  };
  const submit = () => create(form, async () => { saves++; return { submissionId: "contribution:original", revision: 7 }; }, testOperation())();
  await submit(); assert.equal(form.validationField, "contribution-intake-openness"); assert.equal(saves, 0);
  form.candidateProfile = candidateDocumentProposal(fields, {}, explicitUnknown()); await submit(); assert.equal(saves, 1);
  form.candidateProfile = candidateDocumentProposal(fields, {}, emptyCandidateIntake()); fail = false; await submit();
  assert.equal(saves, 1); assert.deepEqual(requests, [["contribution:original", 7], ["contribution:original", 7]]);
  assert.equal(form.pendingSubmission, null);
});
