import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createContributionOperationOwner } from "../contribution/command-lock";

function declaration(file: string, name: string, kind = ts.ScriptKind.TS) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, kind);
  let found: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText(source) === name) found = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(found, name);
  return found.getText(source).replace(/^export /u, "");
}

function evaluate(code: string, values: Record<string, unknown> = {}) {
  return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, { Error, ...values });
}

const localFailureMessage = evaluate(declaration("../../utils/presentation.ts", "localFailureMessage") + "\nlocalFailureMessage;");
const errorMessage = evaluate(declaration("../../services/api-client.ts", "MiniappApiError") + "\n" + declaration("../../services/api-client.ts", "errorMessage") + "\nerrorMessage;", { localFailureMessage });
const mediaMimeType = evaluate(declaration("../contribution/contribution-model.ts", "mediaMimeType") + "\nmediaMimeType;");
const mediaFileName = evaluate(declaration("../contribution/contribution-model.ts", "mediaFileName") + "\nmediaFileName;");
const appendFormalMedia = evaluate(declaration("./formal-media-selection.ts", "appendFormalMedia") + "\nappendFormalMedia;");
const addPhotoSource = "const " + declaration("./index.tsx", "assertEditorOwner", ts.ScriptKind.TSX) + ";\nconst " + declaration("./index.tsx", "addPhoto", ts.ScriptKind.TSX) + ";\naddPhoto;";

function fixture() {
  let settle!: (result: unknown, failed?: boolean) => void;
  let nativeCalls = 0;
  const notices: Array<{ title: string }> = [];
  const effects: string[] = [];
  const busy: boolean[] = [];
  const mediaBusy = { current: false };
  const notificationVisible = { current: true };
  const notify = evaluate("const " + declaration("./index.tsx", "notify", ts.ScriptKind.TSX) + ";\nnotify;", {
    notificationVisible, useCallback: (action: unknown) => action, publish: (notice: { title: string }) => notices.push(notice),
  });
  let account = "owner:a", reset = 0;
  const operations = createContributionOperationOwner(() => ({ userId: account, ownerId: account, reset, page: "page", target: "formal" }), value => {
    if (!value) { mediaBusy.current = false; busy.push(false); }
  });
  const input = { detail: "保留尚未提交的文字", site: [] };
  const intent = { intentId: "intent:a", revision: 1, uploads: [{ uploadId: "upload:a", state: "PENDING", kind: "site", mimeType: "image/png", declaredByteSize: 30 }] };
  const Taro = { chooseImage: async (options: unknown) => {
    nativeCalls++;
    assert.equal(JSON.stringify(options), JSON.stringify({ count: 1, sizeType: ["compressed"], sourceType: ["album", "camera"] }));
    return new Promise((resolve, reject) => { settle = (result, failed = false) => failed ? reject(result) : resolve(result); });
  } };
  const choosePlatformImages = evaluate(declaration("../../services/platform-image.ts", "choosePlatformImages") + "\nchoosePlatformImages;", { Taro });
  let uploadFails = false;
  const run = evaluate(addPhotoSource, {
    baseline: { spotId: "spot:a", revision: 1 }, busy: false, uploading: false, submitted: false,
    submitBusy: { current: false }, mediaBusy, operations, editorOwner: { current: "owner:a" },
    currentDraftUserId: () => account, useAppStore: { getState: () => ({ accountOwnerId: account }) },
    mediaHandoff: { confirm: async () => true }, rightsConfirmed: true, MEDIA_RIGHTS_MODAL: {},
    Taro, choosePlatformImages, uploadIntent: intent, sessionAttempt: { current: null },
    completionSource: { current: null }, completedPreviewSources: { current: {} },
    setRightsConfirmed: () => effects.push("rights"), setUploading: (value: boolean) => busy.push(value),
    setUploadIntent: () => effects.push("intent"), setSessionUnconfirmed: () => effects.push("uncertain"),
    createFormalUploadIntent: async () => { assert.fail("existing intent must remain"); },
    createFormalContributionUpload: async () => { assert.fail("existing pending session must remain"); },
    readBase64: async () => { effects.push("read"); return "photo"; }, mediaMimeType, mediaFileName,
    completeFormalContributionUpload: async () => { effects.push("complete"); if (uploadFails) throw new Error("upload_failed"); return { data: intent }; },
    setPreviewPaths: () => effects.push("preview"),
    setMediaSelection: (update: (value: typeof input) => unknown) => { update(input); effects.push("selection"); },
    appendFormalMedia, syncMediaProposal: () => effects.push("proposal"),
    notify, errorMessage,
  });
  return { run, notices, effects, busy, mediaBusy, input,
    operations, hide: () => { notificationVisible.current = false; operations.hide(); }, show: () => { notificationVisible.current = true; operations.show(); },
    switchAccount: (value: string) => { account = value; reset++; operations.observe(); },
    captureSettler: () => settle,
    get nativeCalls() { return nativeCalls; }, failUpload() { uploadFails = true; },
    settle: (result: unknown, failed = false) => settle(result, failed),
    async entered(count = 1) {
      for (let i = 0; i < 20 && nativeCalls < count; i++) await Promise.resolve();
      assert.equal(nativeCalls, count);
    },
  };
}

test("formal photo cancellation is quiet, preserves input, and releases the real media lock", async () => {
  for (const failure of [{ errMsg: "chooseImage:fail cancel" }, new Error("chooseImage:fail cancel")]) {
    const f = fixture();
    const pending = f.run("site");
    await f.entered();
    await f.run("site");
    assert.equal(f.nativeCalls, 1);
    f.settle(failure, true);
    await pending;
    assert.equal(f.notices.length, 0);
    assert.deepEqual(f.effects, []);
    assert.deepEqual(f.busy, [true, false]);
    assert.equal(f.mediaBusy.current, false);
    assert.equal(f.input.detail, "保留尚未提交的文字");
    const retry = f.run("site");
    await f.entered(2);
    f.settle({ errMsg: "chooseImage:fail permission denied" }, true);
    await retry;
    assert.deepEqual(f.notices.map(value => value.title), ["图片尚未完成上传"]);
  }
});

test("formal photo successful selection retains upload, preview and proposal effects", async () => {
  const f = fixture();
  const pending = f.run("site");
  await f.entered();
  f.settle({ tempFilePaths: ["photo.png"], tempFiles: [{ path: "photo.png", size: 30 }] });
  await pending;
  assert.deepEqual(f.effects, ["read", "complete", "preview", "selection", "proposal"]);
  assert.deepEqual(f.notices, []);
  assert.equal(f.mediaBusy.current, false);
  assert.equal(f.input.detail, "保留尚未提交的文字");
});

test("a downstream upload failure is visible and does not replace retained input", async () => {
  const f = fixture();
  f.failUpload();
  const pending = f.run("site");
  await f.entered();
  f.settle({ tempFilePaths: ["photo.png"], tempFiles: [{ path: "photo.png", size: 30 }] });
  await pending;
  assert.deepEqual(f.effects, ["read", "complete"]);
  assert.deepEqual(f.notices.map(value => value.title), ["图片尚未完成上传"]);
  assert.equal(f.mediaBusy.current, false);
  assert.equal(f.input.detail, "保留尚未提交的文字");
});

test("old formal picker across A-B-A cannot upload or release a fresh A picker", async () => {
  const f = fixture(), old = f.run("site");
  await f.entered(); const settleOld = f.captureSettler();
  f.switchAccount("owner:b"); f.switchAccount("owner:a");
  const next = f.run("site"); await f.entered(2);
  settleOld({ tempFiles: [{ path: "old.png", size: 30 }] }); await old;
  assert.deepEqual(f.effects, []); assert.deepEqual(f.notices, []);
  assert.equal(f.mediaBusy.current, true, "old finally cannot unlock the successor");
  f.settle({ tempFiles: [{ path: "new.png", size: 30 }] }); await next;
  assert.deepEqual(f.effects, ["read", "complete", "preview", "selection", "proposal"]);
  assert.equal(f.mediaBusy.current, false); assert.equal(f.input.detail, "保留尚未提交的文字");
});

test("both known native hide/show orders keep current photo selection; unmount suppresses late failure", async () => {
  for (const showFirst of [false, true]) {
    const f = fixture(), pending = f.run("site"); await f.entered();
    f.hide(); if (showFirst) f.show();
    f.settle({ tempFiles: [{ path: "photo.png", size: 30 }] }); await pending;
    if (!showFirst) f.show();
    assert.deepEqual(f.effects, ["read", "complete", "preview", "selection", "proposal"]);
  }
  const f = fixture(), pending = f.run("site"); await f.entered(); f.operations.dispose();
  f.settle({ errMsg: "chooseImage:fail permission denied" }, true); await pending;
  assert.deepEqual(f.notices, []); assert.deepEqual(f.effects, []);
  assert.deepEqual(f.busy, [true], "unmounted editor receives no late state release");
});

test("native error callback before show cannot enqueue hidden feedback; after show remains actionable", async () => {
  for (const showFirst of [false, true]) {
    const f = fixture(), pending = f.run("site"); await f.entered(); f.hide();
    if (showFirst) f.show();
    f.settle({ errMsg: "chooseImage:fail permission denied" }, true); await pending;
    assert.deepEqual(f.notices.map(value => value.title), showFirst ? ["图片尚未完成上传"] : []);
    if (!showFirst) f.show();
    assert.equal(f.mediaBusy.current, false); assert.equal(f.input.detail, "保留尚未提交的文字");
  }
});
