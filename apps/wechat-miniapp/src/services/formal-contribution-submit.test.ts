import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createMutationRetry } from "./mutation-retry";

function actualFormalSubmit() {
  const source = ts.createSourceFile("formal-feedback-mutations.ts", readFileSync(new URL("../content/spot-feedback/formal-feedback-mutations.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "submitFormalContribution");
  const retry = source.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(value => value.name.getText(source) === "retryFormalSubmit"));
  assert.ok(declaration);
  assert.ok(retry);
  return ts.transpileModule(retry.getText(source) + "\n" + declaration.getText(source).replace(/^export /, "") + "\nsubmitFormalContribution;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

test("formal feedback retries an uncertain receipt with its original key and account", async () => {
  let owner = "account:a";
  let keyNumber = 0;
  const requests: { owner: string; key: string; body: unknown }[] = [];
  const receipt = { data: { state: "PENDING_REVIEW", submissionId: "feedback:one" } };
  const submit = vm.runInNewContext(actualFormalSubmit(), {
    currentDraftUserId: () => owner,
    ensureContributionOwner: async () => owner,
    idempotencyKey: () => `key:${++keyNumber}`,
    createMutationRetry,
    sendSubmission: async (body: unknown, key: string, expectedOwner: string) => {
      requests.push({ owner: expectedOwner, key, body });
      if (requests.length === 1) throw new Error("receipt unknown");
      return receipt;
    },
  }) as (input: unknown) => Promise<typeof receipt>;
  const input = { kind: "CORRECTION", baseline: { revision: 1 }, proposal: { fields: { name: "新地点" } } };
  await assert.rejects(submit(input), /receipt unknown/);
  assert.equal(await submit(input), receipt);
  assert.equal(requests[1]?.key, requests[0]?.key);
  assert.deepEqual(requests.slice(0, 2).map(request => request.owner), ["account:a", "account:a"]);
  await submit(input);
  assert.notEqual(requests[2]?.key, requests[1]?.key, "confirmed receipt must release its retry key");
  owner = "account:b";
  await submit(input);
  assert.notEqual(requests[3]?.key, requests[2]?.key, "another account must not reuse the key");
});

test("formal feedback cannot apply a receipt after the active account changes", async () => {
  let owner = "account:a";
  const submit = vm.runInNewContext(actualFormalSubmit(), {
    currentDraftUserId: () => owner,
    ensureContributionOwner: async () => "account:a",
    createMutationRetry, idempotencyKey: () => "key:one",
    sendSubmission: async (_body: unknown, _key: string, expectedOwner: string) => {
      assert.equal(expectedOwner, "account:a");
      owner = "account:b";
      return { data: { state: "PENDING_REVIEW" } };
    },
  }) as (input: unknown) => Promise<unknown>;
  await assert.rejects(submit({ baseline: { revision: 1 } }), /账号已变化/);
});

test("formal submission transport applies the receipt only to its initiating account", async () => {
  const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "submitFormalContribution");
  assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nsubmitFormalContribution;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let owner = "account:a";
  let invalidations = 0;
  const submit = vm.runInNewContext(code, {
    currentDraftUserId: () => owner,
    requestOperation: async (_key: string, _operation: string, options: { idempotencyKey: string }, _retry: boolean, expectedOwner: string) => {
      assert.equal(options.idempotencyKey, "key:bound");
      assert.equal(expectedOwner, "account:a");
      owner = "account:b";
      return { data: { state: "PENDING_REVIEW" } };
    },
    invalidateApiCache: () => { invalidations++; },
    miniappQueryClient: { invalidateQueries: async () => { invalidations++; } },
  }) as (input: unknown, key: string, owner: string) => Promise<unknown>;
  await assert.rejects(submit({ baseline: { revision: 1 } }, "key:bound", "account:a"), /账号已变化/);
  assert.equal(invalidations, 0);
});

test("feedback submit takes a synchronous busy lock until the first request settles", async () => {
  const source = ts.createSourceFile("feedback.tsx", readFileSync(new URL("../content/spot-feedback/index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "submit") declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(declaration);
  const code = ts.transpileModule(`const ${declaration.getText(source)};\nsubmit;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let rejectFirst: (error: Error) => void = () => undefined;
  let calls = 0;
  let submitted = false;
  const notices: { title: string; tone: string }[] = [];
  const submit = vm.runInNewContext(code, {
    baseline: { revision: 1 }, proposal: { fields: { name: "新地点" } }, hasChanges: true, busy: false, uploading: false, sessionUnconfirmed: false,
    submitted: false, activeConflicts: [], resolutions: {}, mediaProposal: {}, rightsConfirmed: true,
    uploadIntent: null, activeSubmissionId: "", resubmissionRevision: null,
    MiniappApiError: class extends Error {},
    submitBusy: { current: false }, mediaBusy: { current: false }, setBusy: () => undefined, setSubmitted: (value: boolean) => { submitted = value; },
    setActiveSubmissionId: () => undefined,
    assertEditorOwner: () => undefined,
    setConflicts: () => undefined, notify: (notice: { title: string; tone: string }) => { notices.push(notice); }, errorMessage: (error: Error) => error.message,
    submitFormalContribution: async () => {
      calls++;
      if (calls === 1) return new Promise((_resolve, reject) => { rejectFirst = reject; });
      return { data: { state: "SUBMITTED", submission: { submissionId: "contribution:one", formalFeedback: null } } };
    },
  }) as () => Promise<void>;
  const first = submit();
  await submit();
  assert.equal(calls, 1, "a second tap before rerender must not dispatch another write");
  rejectFirst(new Error("receipt unknown"));
  await first;
  assert.equal(notices[0]?.title, "提交结果未确认");
  assert.equal(notices[0]?.tone, "warning");
  await submit();
  assert.equal(calls, 2, "a failed attempt must release the busy lock");
  assert.equal(submitted, true);
});

test("formal photo handoff locks other photos and submit before native selection settles", async () => {
  const source = ts.createSourceFile("feedback.tsx", readFileSync(new URL("../content/spot-feedback/index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = new Map<string, ts.VariableDeclaration>();
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ["addPhoto", "submit"].includes(node.name.getText(source))) found.set(node.name.getText(source), node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(found.size, 2);
  const code = ts.transpileModule([...found.values()].map(node => `const ${node.getText(source)};`).join("\n") + "\n({ addPhoto, submit });", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let resolveHandoff: (value: boolean) => void = () => undefined;
  const handoff = new Promise<boolean>(resolve => { resolveHandoff = resolve; });
  let handoffs = 0;
  let submissions = 0;
  const api = vm.runInNewContext(code, {
    baseline: { revision: 1, spotId: "spot:test" }, proposal: { fields: { name: "新地点" } }, hasChanges: true,
    busy: false, uploading: false, sessionUnconfirmed: false, submitted: false, rightsConfirmed: true, uploadIntent: null,
    mediaBusy: { current: false }, submitBusy: { current: false },
    assertEditorOwner: () => undefined,
    mediaHandoff: { confirm: () => { handoffs++; return handoff; } },
    setUploading: () => undefined, setBusy: () => undefined, setSubmitted: () => undefined, setConflicts: () => undefined,
    activeConflicts: [], resolutions: {}, mediaProposal: {}, activeSubmissionId: "", resubmissionRevision: null,
    submitFormalContribution: async () => { submissions++; return { data: { state: "PENDING_REVIEW" } }; },
    notify: () => undefined, MiniappApiError: class extends Error {}, errorMessage: (error: Error) => error.message,
  }) as { addPhoto: (kind: string) => Promise<void>; submit: () => Promise<void> };
  const first = api.addPhoto("site");
  const second = api.addPhoto("site");
  assert.equal(handoffs, 1, "the second tap must not open another media handoff");
  await api.submit();
  assert.equal(submissions, 0, "feedback cannot submit while photo selection is open");
  resolveHandoff(false);
  await Promise.all([first, second]);
  await api.submit();
  assert.equal(submissions, 1, "cancelled photo selection releases the lock");
});

test("formal photo completion failure keeps the created session and retries its pending upload", async () => {
  const source = ts.createSourceFile("feedback.tsx", readFileSync(new URL("../content/spot-feedback/index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "addPhoto") declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(declaration);
  const code = ts.transpileModule(`const ${declaration.getText(source)};\naddPhoto;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const intent = { intentId: "intent:one", revision: 1, uploads: [] };
  const pending = { uploadId: "upload:one", state: "PENDING", kind: "site", mimeType: "image/png", declaredByteSize: 16 };
  const created = { ...intent, revision: 2, uploads: [pending] };
  const completed = { ...intent, revision: 3, uploads: [{ ...pending, state: "UPLOADED" }] };
  const retained: unknown[] = [];
  const notices: string[] = [];
  let dataBase64 = "Zm9ybWFsLWltYWdl";
  const base = {
    baseline: { revision: 1, spotId: "spot:test" }, busy: false, uploading: false, submitted: false,
    rightsConfirmed: true, mediaHandoff: { confirm: async () => true },
    Taro: { chooseImage: async () => ({ tempFiles: [{ path: "image.png", size: 16 }] }) },
    mediaFileName: () => "image.png", mediaMimeType: () => "image/png", readBase64: async () => dataBase64,
    setUploading: () => undefined, setRightsConfirmed: () => undefined,
    sessionAttempt: { current: null }, completionSource: { current: null }, setSessionUnconfirmed: () => undefined,
    assertEditorOwner: () => undefined,
    setUploadIntent: (value: unknown) => { retained.push(value); },
    setPreviewPaths: () => undefined, setMediaSelection: () => undefined, appendFormalMedia: (current: unknown) => current,
    notify: (notice: { title: string }) => { notices.push(notice.title); }, errorMessage: (error: Error) => error.message,
  };
  const first = vm.runInNewContext(code, {
    ...base, uploadIntent: null, mediaBusy: { current: false }, submitBusy: { current: false },
    createFormalUploadIntent: async () => ({ data: intent }),
    createFormalContributionUpload: async () => ({ data: created }),
    completeFormalContributionUpload: async () => { throw new Error("receipt unknown"); },
  }) as (kind: string) => Promise<void>;
  await first("site");
  assert.deepEqual(retained, [intent, created], "both confirmed stages must remain available for recovery");
  assert.deepEqual(notices, ["图片尚未完成上传"]);
  let newSessions = 0;
  let completedId = "";
  let synced: unknown;
  const retry = vm.runInNewContext(code, {
    ...base, uploadIntent: created, mediaBusy: { current: false }, submitBusy: { current: false },
    createFormalUploadIntent: async () => { newSessions++; throw new Error("unexpected intent"); },
    createFormalContributionUpload: async () => { newSessions++; throw new Error("unexpected session"); },
    completeFormalContributionUpload: async (_intentId: string, uploadId: string) => { completedId = uploadId; return { data: completed }; },
    syncMediaProposal: (value: unknown) => { synced = value; },
  }) as (kind: string) => Promise<void>;
  dataBase64 = "different-image";
  await retry("site");
  assert.equal(completedId, "", "same-size replacement cannot complete an uncertain upload");
  dataBase64 = "Zm9ybWFsLWltYWdl";
  await retry("site");
  assert.equal(newSessions, 0);
  assert.equal(completedId, "upload:one");
  assert.equal(synced, completed);
});

test("lost photo-session receipt reuses the first request despite a new WeChat temporary filename", async () => {
  const source = ts.createSourceFile("feedback.tsx", readFileSync(new URL("../content/spot-feedback/index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "addPhoto") declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(declaration);
  const code = ts.transpileModule(`const ${declaration.getText(source)};\naddPhoto;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const intent = { intentId: "intent:one", revision: 1, uploads: [] };
  const pending = { uploadId: "upload:one", state: "PENDING", kind: "site", mimeType: "image/png", declaredByteSize: 16 };
  const created = { ...intent, revision: 2, uploads: [pending] };
  const completed = { ...intent, revision: 3, uploads: [{ ...pending, state: "UPLOADED" }] };
  const sessionAttempt = { current: null as null | { input: unknown } };
  const completionSource = { current: null };
  const uncertain: boolean[] = [];
  const requests: unknown[] = [];
  let filePath = "first.png";
  const base = {
    baseline: { revision: 1, spotId: "spot:test" }, busy: false, uploading: false, submitted: false,
    rightsConfirmed: true, mediaHandoff: { confirm: async () => true },
    Taro: { chooseImage: async () => ({ tempFiles: [{ path: filePath, size: 16 }] }) },
    mediaFileName: (path: string) => path, mediaMimeType: () => "image/png",
    readBase64: async (path: string) => path === "different.png" ? "other-image" : "same-image",
    sessionAttempt, completionSource, setSessionUnconfirmed: (value: boolean) => uncertain.push(value),
    mediaBusy: { current: false }, submitBusy: { current: false },
    setUploading: () => undefined, assertEditorOwner: () => undefined,
    setUploadIntent: () => undefined, setPreviewPaths: () => undefined, setMediaSelection: () => undefined,
    appendFormalMedia: (current: unknown) => current, syncMediaProposal: () => undefined,
    notify: () => undefined, errorMessage: (error: Error) => error.message,
    createFormalUploadIntent: async () => ({ data: intent }),
  };
  const first = vm.runInNewContext(code, {
    ...base, uploadIntent: null,
    createFormalContributionUpload: async (_id: string, input: unknown) => { requests.push(input); throw new Error("receipt unknown"); },
  }) as (kind: string) => Promise<void>;
  await first("site");
  assert.equal(uncertain.at(-1), true);
  assert.ok(sessionAttempt.current);

  const retry = vm.runInNewContext(code, {
    ...base, uploadIntent: intent,
    createFormalContributionUpload: async (_id: string, input: unknown) => { requests.push(input); return { data: created }; },
    completeFormalContributionUpload: async () => ({ data: completed }),
  }) as (kind: string) => Promise<void>;
  filePath = "different.png";
  await retry("site");
  assert.equal(requests.length, 1, "a different picture cannot replace an uncertain session");
  filePath = "second.png";
  await retry("site");
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1], requests[0], "the changed temporary filename must not change the replay request");
  assert.equal(uncertain.at(-1), false);
  assert.equal(sessionAttempt.current, null);
});

test("account switch during native photo handoff cannot upload the old editor's media", async () => {
  const source = ts.createSourceFile("feedback.tsx", readFileSync(new URL("../content/spot-feedback/index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "addPhoto") declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(declaration);
  const code = ts.transpileModule(`const ${declaration.getText(source)};\naddPhoto;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let owner = "account:a";
  let resolveHandoff: (value: boolean) => void = () => undefined;
  const handoff = new Promise<boolean>(resolve => { resolveHandoff = resolve; });
  let choices = 0;
  let writes = 0;
  const notices: string[] = [];
  const addPhoto = vm.runInNewContext(code, {
    baseline: { revision: 1, spotId: "spot:test" }, busy: false, uploading: false, submitted: false,
    mediaBusy: { current: false }, submitBusy: { current: false }, uploadIntent: null,
    sessionAttempt: { current: null }, setSessionUnconfirmed: () => undefined,
    assertEditorOwner: () => { if (owner !== "account:a") throw new Error("账号已变化"); },
    mediaHandoff: { confirm: () => handoff },
    setUploading: () => undefined,
    Taro: { chooseImage: async () => { choices++; return { tempFiles: [] }; } },
    createFormalUploadIntent: async () => { writes++; return { data: {} }; },
    notify: (notice: { title: string }) => { notices.push(notice.title); }, errorMessage: (error: Error) => error.message,
  }) as (kind: string) => Promise<void>;
  const pending = addPhoto("site");
  owner = "account:b";
  resolveHandoff(true);
  await pending;
  assert.equal(choices, 0);
  assert.equal(writes, 0);
  assert.deepEqual(notices, ["图片尚未完成上传"]);
});
