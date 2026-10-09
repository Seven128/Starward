import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { parseLocalContributionDraft } from "./local-draft";
import { contributionDraftKey } from "../../services/local-draft-keys";
import { candidateDocumentProposal, candidateIntakeFromProfile } from "./candidate-document";
import { emptySpotDocumentValues, spotDocumentValuesFromProposal } from "../spot-document";
import { emptyCandidateIntake } from "@starward/miniapp-contracts";
import { calendarDateInTimezone, clockTimeInTimezone } from "../../utils/zoned-date";
import { confirmEditorLeave } from "../../hooks/editor-leave";

test("cached requested draft cannot erase recovery loaded earlier in the same effect commit", () => {
  const localSource = ts.createSourceFile("local.ts", readFileSync(new URL("./use-local-draft.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = localSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useLocalContributionDraft");
  const source = ts.createSourceFile("form.ts", readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let requestedEffect = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("appliedRequestedDraft.current =")) requestedEffect = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(declaration && requestedEffect);
  const empty = { schema: 1, baseSubmissionId: null, baseRevision: null, spotId: "", spotName: "", kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"], date: "2026-10-06", time: "11:00", detail: "", candidateName: "", candidateRegion: "", latitude: "", longitude: "", rightsConfirmed: false, preciseLocationConsent: false };
  const pending = { ...empty, baseSubmissionId: "contribution:saved", baseRevision: 10, candidateName: "本机未保存名称", latitude: "22.5", longitude: "114.5", preciseLocationConsent: true,
    candidateProfile: candidateDocumentProposal(emptySpotDocumentValues(), {}, { ...emptyCandidateIntake(), openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN", contact: { ...emptyCandidateIntake().contact, kind: "UNKNOWN" } }) };
  for (const recoveryExists of [true, false]) {
    let stored: unknown = recoveryExists ? pending : undefined, applied = 0, cursor = 0, stateCursor = 0, effects: Array<() => unknown> = [];
    const refs: Array<{ current: unknown }> = [], states: unknown[] = [];
    const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(localSource).replace(/^export /, "") + "\nuseLocalContributionDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      Taro: { getStorageSync: () => stored, setStorageSync: (_key: string, item: unknown) => { stored = item; }, removeStorageSync: () => { stored = undefined; } },
      currentDraftUserId: () => "a", contributionDraftKey, parseLocalContributionDraft,
      useRef: (current: unknown) => refs[cursor++] ?? (refs[cursor - 1] = { current }),
      useState: (initial: unknown) => { const index = stateCursor++; if (!(index in states)) states[index] = initial; return [states[index], (next: unknown) => { states[index] = next; }]; },
      useEffect: (effect: () => unknown) => effects.push(effect), useDidHide() {}, setTimeout: () => 1, clearTimeout() {},
    });
    const context = vm.createContext({ requestedSubmissionId: "contribution:saved", matchingDraft: { submissionId: "contribution:saved" }, draft: null, appliedRequestedDraft: { current: "" }, localDraft: null as ReturnType<typeof import("./use-local-draft").useLocalContributionDraft> | null,
      applyDraft: () => { applied++; context.localDraft!.markSaved({ ...empty, baseSubmissionId: "contribution:saved", baseRevision: 10 } as never); },
    });
    const autoApply = vm.runInContext(ts.transpileModule(`(${requestedEffect});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
    const render = () => { cursor = 0; stateCursor = 0; effects = []; context.localDraft = hook(empty, "", false); effects.forEach(effect => effect()); autoApply(); return context.localDraft!; };
    render();
    assert.equal(applied, recoveryExists ? 0 : 1, "a captured null recovery state must not authorize clearing a loaded copy");
    assert.equal(stored, recoveryExists ? pending : undefined, "all unsaved fields must survive automatic remote loading");
    const settled = render();
    assert.equal(Boolean(settled.recovery), recoveryExists, "the next render must offer the preserved recovery copy");
    if (recoveryExists) { settled.clear(); render(); assert.equal(applied, 1, "explicit discard permits normal remote loading"); assert.equal(stored, undefined); }
    render(); assert.equal(applied, 1, "the requested remote draft is applied only once");
  }
});

test("hiding a feedback page flushes its own input and never overwrites an unrestored copy", () => {
  const source = ts.createSourceFile("local.ts", readFileSync(new URL("./use-local-draft.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "useLocalContributionDraft");
  assert.ok(declaration);
  const input = {
    schema: 1, baseSubmissionId: null, baseRevision: null, spotId: "", spotName: "",
    kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"], date: "", time: "", detail: "未保存输入",
    candidateName: "", candidateRegion: "", latitude: "", longitude: "", rightsConfirmed: false, preciseLocationConsent: false,
  };
  const run = (stored: unknown, switchAccount: boolean, suspended = false) => {
    let owner = "a";
    const writes: unknown[] = [];
    const effects: Array<() => unknown> = [];
    let hide = () => {};
    const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nuseLocalContributionDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      Taro: { getStorageSync: () => stored, setStorageSync: (key: unknown, value: unknown) => writes.push({ key, value }) },
      currentDraftUserId: () => owner, contributionDraftKey, parseLocalContributionDraft,
      useRef: (current: unknown) => ({ current }), useState: (value: unknown) => [value, () => {}],
      useEffect: (effect: () => unknown) => effects.push(effect), useDidHide: (callback: () => void) => { hide = callback; },
      setTimeout: () => 1, clearTimeout() {},
    });
    hook(input, "spot:route", suspended);
    effects.forEach((effect) => effect());
    if (switchAccount) owner = "b";
    hide();
    return writes;
  };
  assert.deepEqual(run(null, false), [{ key: contributionDraftKey("a", "spot:route"), value: input }]);
  assert.deepEqual(run(null, true), []);
  assert.deepEqual(run(input, false), []);
  assert.deepEqual(run(null, false, true), []);
});

test("partial field edits survive hiding and reverting an empty form removes the old copy", () => {
  const source = ts.createSourceFile("local.ts", readFileSync(new URL("./use-local-draft.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "useLocalContributionDraft");
  assert.ok(declaration);
  const empty = {
    schema: 1, baseSubmissionId: null, baseRevision: null, spotId: "", spotName: "",
    kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"], date: "2026-09-06", time: "11:00", detail: "",
    candidateName: "", candidateRegion: "", latitude: "", longitude: "", rightsConfirmed: false, preciseLocationConsent: false,
  };
  let stored: unknown;
  let hide = () => {};
  const refs: Array<{ current: unknown }> = [];
  let cursor = 0;
  let effects: Array<() => unknown> = [];
  const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nuseLocalContributionDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    Taro: { getStorageSync: () => stored, setStorageSync: (_key: string, value: unknown) => { stored = value; }, removeStorageSync: () => { stored = undefined; } },
    currentDraftUserId: () => "a", contributionDraftKey, parseLocalContributionDraft,
    useRef: (current: unknown) => refs[cursor++] ?? (refs[cursor - 1] = { current }),
    useState: (value: unknown) => [value, () => {}],
    useEffect: (effect: () => unknown) => effects.push(effect), useDidHide: (callback: () => void) => { hide = callback; },
    setTimeout: () => 1, clearTimeout() {},
  });
  const render = (input: unknown) => { cursor = 0; effects = []; const result = hook(input, "", false); effects.forEach((effect) => effect()); hide(); return result; };
  render(empty);
  assert.equal(stored, undefined);
  for (const change of [{ candidateRegion: "深圳" }, { topics: ["PARKING"] }, { time: "23:30" }, { spotId: "spot:selected", spotName: "选中的地点" }]) {
    const edited = { ...empty, ...change };
    assert.equal(render(edited).hasUnsavedChanges, true);
    assert.deepEqual(stored, edited);
    render(empty);
    assert.equal(stored, undefined);
  }
  const saved = { ...empty, baseSubmissionId: "contribution:saved", baseRevision: 4, detail: "已经保存的服务端内容" };
  const current = render(empty);
  current.markSaved(saved);
  assert.equal(render(saved).hasUnsavedChanges, false);
  assert.equal(stored, undefined, "adopted server content must not become an unsaved recovery copy");
  const edited = { ...saved, detail: "服务端保存之后的新编辑" };
  render(edited);
  assert.deepEqual(stored, edited, "later unsaved edits still survive page hiding");
  assert.equal(render(saved).hasUnsavedChanges, false);
  assert.equal(stored, undefined, "reverting to the saved content clears the recovery copy");
  const mediaReceipt = render(saved);
  mediaReceipt.advanceSavedRevision(saved.baseSubmissionId, 5);
  const afterMedia = { ...saved, baseRevision: 5 };
  assert.equal(render(afterMedia).hasUnsavedChanges, false);
  assert.equal(stored, undefined, "a media-only revision must not create an unsaved copy");
  const duringUpload = { ...afterMedia, detail: "上传期间编辑的文字" };
  const uploading = render(duringUpload);
  uploading.advanceSavedRevision(saved.baseSubmissionId, 6);
  const afterUpload = { ...duringUpload, baseRevision: 6 };
  assert.equal(render(afterUpload).hasUnsavedChanges, true);
  assert.deepEqual(stored, afterUpload, "a media receipt must preserve concurrent unsaved text");
  const reverted = { ...saved, baseRevision: 6 };
  const baseline = render(reverted);
  assert.equal(stored, undefined);
  baseline.advanceSavedRevision("contribution:other", 7);
  baseline.advanceSavedRevision(saved.baseSubmissionId, 3);
  render(reverted);
  assert.equal(stored, undefined, "unrelated or older receipts must not move the saved baseline");
});

test("explicitly discarded edits stay retired through pending timers, hiding and unmount, while later edits remain recoverable", () => {
  const source = ts.createSourceFile("local.ts", readFileSync(new URL("./use-local-draft.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useLocalContributionDraft");
  assert.ok(declaration);
  const empty = { schema: 1, baseSubmissionId: null, baseRevision: null, spotId: "", spotName: "", kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"], date: "", time: "", detail: "", candidateName: "", candidateRegion: "", latitude: "", longitude: "", rightsConfirmed: false, preciseLocationConsent: false };
  for (const remote of [false, true]) {
    let owner = "a", failRemoval = false, stored: unknown, cursor = 0, stateCursor = 0, hide = () => {}, effects: Array<() => unknown> = [], timers: Array<() => void> = [];
    const refs: Array<{ current: unknown }> = [], states: unknown[] = [], cleanups: Array<() => void> = [];
    const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nuseLocalContributionDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      Taro: { getStorageSync: () => stored, setStorageSync: (_key: string, input: unknown) => { stored = input; }, removeStorageSync: () => { if (failRemoval) throw Error("storage unavailable"); stored = undefined; } },
      currentDraftUserId: () => owner, contributionDraftKey, parseLocalContributionDraft,
      useRef: (current: unknown) => refs[cursor++] ?? (refs[cursor - 1] = { current }),
      useState: (initial: unknown) => { const index = stateCursor++; if (!(index in states)) states[index] = initial; return [states[index], (next: unknown) => { states[index] = next; }]; },
      useEffect: (effect: () => unknown) => effects.push(effect), useDidHide: (callback: () => void) => { hide = callback; },
      setTimeout: (callback: () => void) => { timers.push(callback); return timers.length; }, clearTimeout() {},
    });
    const render = (input: unknown) => { cursor = 0; stateCursor = 0; effects = []; const result = hook(input, "", false); effects.forEach(effect => { const cleanup = effect(); if (typeof cleanup === "function") cleanups.push(cleanup as () => void); }); return result; };
    const saved = remote ? { ...empty, baseSubmissionId: "contribution:saved", baseRevision: 11, detail: "远端已保存内容" } : empty;
    render(empty).markSaved(saved);
    const edited = { ...saved, detail: "明确放弃的输入" }, current = render(edited);
    hide(); assert.deepEqual(stored, edited);
    failRemoval = true;
    assert.equal(current.discardChanges(), false, "failed removal must keep input and refuse discard");
    hide(); assert.deepEqual(stored, edited);
    failRemoval = false; owner = "b";
    assert.equal(current.discardChanges(), false, "a late confirmation cannot remove another owner's copy");
    assert.deepEqual(stored, edited); owner = "a";
    assert.equal(current.discardChanges(), true);
    timers.forEach(timer => timer()); hide(); cleanups.forEach(cleanup => cleanup());
    assert.equal(stored, undefined, "discarded content must not be resurrected by lifecycle flushes");
    render(edited); timers.forEach(timer => timer()); hide();
    assert.equal(stored, undefined, "unchanged rendering after failed navigation must not resurrect the discarded copy");
    const nextEdit = { ...edited, detail: "离页失败后继续编辑" };
    render(nextEdit); hide(); assert.deepEqual(stored, nextEdit, "later edits still get a recovery copy");
    render(edited); hide(); assert.deepEqual(stored, edited, "returning to the same text after a new edit is a new intent");
  }
});

for (const [name, candidateProfile, datedLocation] of [
  ["PostgreSQL jsonb profile key order", JSON.parse('{"media":{},"fields":{"name":"未选址的草稿"},"intake":{"contact":{"kind":null,"number":"","source":"","purpose":"","publicPermissionConfirmed":false},"version":1,"openness":null,"legalEntry":null,"nightSafety":null}}'), false],
  ["legacy profile without structured intake", { fields: { name: "未选址的草稿", openness: "开放" }, media: {} }, false],
  ["profile name and address before selecting coordinates", { fields: { name: "未选址的草稿", address: "自测区域说明" }, media: {} }, false],
  ["legacy draft without profile", undefined, false],
  ["dated legacy draft with coordinates", undefined, true],
] as const) {
  test(`opening a saved incomplete draft stays clean with ${name}`, () => {
    const source = ts.createSourceFile("form.ts", readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
    let applyText = "", currentValueText = "";
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === "applyDraft") applyText = node.initializer!.getText(source);
      if (ts.isCallExpression(node) && node.expression.getText(source) === "useLocalContributionDraft") currentValueText = node.arguments[0]!.getText(source);
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert.ok(applyText && currentValueText);
    const localSource = ts.createSourceFile("local.ts", readFileSync(new URL("./use-local-draft.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
    const declaration = localSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "useLocalContributionDraft");
    assert.ok(declaration);
    let stored: unknown, hide = () => {}, cursor = 0, effects: Array<() => unknown> = [];
    const refs: Array<{ current: unknown }> = [];
    const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(localSource).replace(/^export /, "") + "\nuseLocalContributionDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      Taro: { getStorageSync: () => stored, setStorageSync: (_key: string, value: unknown) => { stored = value; }, removeStorageSync: () => { stored = undefined; } },
      currentDraftUserId: () => "a", contributionDraftKey, parseLocalContributionDraft,
      useRef: (current: unknown) => refs[cursor++] ?? (refs[cursor - 1] = { current }), useState: (value: unknown) => [value, () => {}],
      useEffect: (effect: () => unknown) => effects.push(effect), useDidHide: (callback: () => void) => { hide = callback; }, setTimeout: () => 1, clearTimeout() {},
    });
    const context = vm.createContext({
      draft: null, boundSpotId: "", boundSpotName: "", kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"], date: "2026-10-06", time: "11:00", detail: "",
      candidateName: "", candidateRegion: "", latitude: "", longitude: "", rightsConfirmed: false, preciseLocationConsent: false,
      candidateFields: emptySpotDocumentValues(), candidateIntake: emptyCandidateIntake(), candidateMedia: {},
      candidateDocumentProposal, candidateIntakeFromProfile, spotDocumentValuesFromProposal, calendarDateInTimezone, clockTimeInTimezone,
    });
    for (const field of ["draft", "pendingSubmission", "conflictDraft", "boundSpotId", "boundSpotName", "kind", "topics", "detail", "rightsConfirmed", "preciseLocationConsent", "candidateFields", "candidateIntake", "candidateMedia", "candidateMediaPreviews", "date", "time", "candidateName", "candidateRegion", "candidatePlaceLabel", "latitude", "longitude", "phase"])
      context[`set${field[0]!.toUpperCase()}${field.slice(1)}`] = (value: unknown) => { context[field] = value; };
    const form = vm.runInContext(ts.transpileModule(`({ apply: ${applyText}, current: () => (${currentValueText}) });`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
    const render = () => { cursor = 0; effects = []; const result = hook(form.current(), "", false); effects.forEach(effect => effect()); hide(); return result; };
    context.localDraft = render();
    form.apply({ submissionId: "contribution:saved", revision: 1, spotId: null, spotNameSnapshot: null, kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"], observedAt: datedLocation ? "2026-06-01T19:04:00Z" : null, detail: "", rightsConfirmed: false, preciseLocationConsent: false,
      candidateLocation: datedLocation ? { displayName: "坐标草稿", region: "深圳", wgs84: { system: "WGS84", latitude: 22.55, longitude: 114.06 } } : null, candidateProfile });
    assert.equal(render().hasUnsavedChanges, false, "a saved remote draft must leave without a discard confirmation");
    assert.equal(stored, undefined, "opening unchanged remote content must not create a false recovery copy");
    assert.equal(form.current().candidateName, context.candidateFields.name, "the restored visible name must also reach coordinate draft saving");
    assert.equal(form.current().candidateRegion, context.candidateFields.address, "the restored visible address must reach the same draft input");
    if (datedLocation) {
      assert.equal(form.current().date, "2026-06-02");
      assert.equal(form.current().time, "03:04");
      assert.equal(form.current().latitude, "22.55");
      assert.equal(form.current().longitude, "114.06");
    }
    const restoredFields = context.candidateFields;
    context.candidateFields = { ...restoredFields, name: "之后修改的名称" };
    assert.equal(render().hasUnsavedChanges, true, "real later field edits still require the leave guard");
    assert.ok(stored, "real later edits retain their local recovery copy");
    context.candidateFields = restoredFields;
    assert.equal(render().hasUnsavedChanges, false, "reverting the field removes the need to discard anything");
    assert.equal(stored, undefined, "reverting the field clears the recovery copy");
  });
}

test("records do not consume editor recovery copies or block Back while standalone editing retains recovery", async () => {
  const editorSource = ts.createSourceFile("editor.tsx", readFileSync(new URL("./contribution-editor.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let formOptions = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(editorSource) === "useContributionForm") formOptions = node.arguments[0]!.getText(editorSource);
    ts.forEachChild(node, visit);
  };
  visit(editorSource);
  assert.ok(formOptions);
  const localSource = ts.createSourceFile("local.ts", readFileSync(new URL("./use-local-draft.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = localSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useLocalContributionDraft");
  assert.ok(declaration);
  const value = { schema: 1, baseSubmissionId: null, baseRevision: null, spotId: "", spotName: "", kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"], date: "2026-10-06", time: "11:00", detail: "", candidateName: "", candidateRegion: "", latitude: "", longitude: "", rightsConfirmed: false, preciseLocationConsent: false };
  for (const [name, managesRecords, embedded, expectedReads] of [["records", true, false, 0], ["standalone", false, false, 1], ["embedded", false, true, 0]] as const) {
    const options = vm.runInNewContext(ts.transpileModule(`(${formOptions});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, { forceNew: undefined, submissionId: undefined, managesRecords, embedded });
    const pending = { ...value, detail: "需要保留并在编辑页恢复的现场说明" };
    let stored: unknown = pending, reads = 0, writes = 0, removals = 0, cursor = 0, stateCursor = 0, hide = () => {}, effects: Array<() => unknown> = [];
    const refs: Array<{ current: unknown }> = [], states: unknown[] = [];
    const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(localSource).replace(/^export /, "") + "\nuseLocalContributionDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      Taro: { getStorageSync: () => { reads++; return stored; }, setStorageSync: (_key: string, item: unknown) => { writes++; stored = item; }, removeStorageSync: () => { removals++; stored = undefined; } },
      currentDraftUserId: () => "a", contributionDraftKey, parseLocalContributionDraft,
      useRef: (current: unknown) => refs[cursor++] ?? (refs[cursor - 1] = { current }),
      useState: (initial: unknown) => { const index = stateCursor++; if (!(index in states)) states[index] = initial; return [states[index], (next: unknown) => { states[index] = next; }]; },
      useEffect: (effect: () => unknown) => effects.push(effect), useDidHide: (callback: () => void) => { hide = callback; }, setTimeout: () => 1, clearTimeout() {},
    });
    const render = () => { cursor = 0; stateCursor = 0; effects = []; const result = hook(value, "", false, !options.disableLocalPersistence); effects.forEach(effect => effect()); return result; };
    render();
    const result = render();
    hide();
    assert.equal(reads, expectedReads, `${name} must use only its own persistence responsibility`);
    assert.equal(writes, 0);
    assert.equal(removals, 0);
    assert.equal(stored, pending, `${name} must preserve the unrestored editor copy`);
    assert.equal(Boolean(result.recovery), expectedReads > 0);
    assert.equal(await confirmEditorLeave({ busy: Boolean(result.recovery), dirty: result.hasUnsavedChanges, confirm: () => assert.fail("unchanged content must not show a discard modal") }), expectedReads === 0, `${name} must keep its correct leave behavior`);
  }
});
