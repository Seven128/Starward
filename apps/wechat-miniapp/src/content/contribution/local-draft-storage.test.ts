import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { parseLocalContributionDraft } from "./local-draft";
import { contributionDraftKey } from "../../services/local-draft-keys";

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
