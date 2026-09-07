import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("native picker cancellation is quiet while genuine picker failures remain errors", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "chooseImage");
  assert.ok(declaration);
  let failure: unknown = { errMsg: "chooseImage:fail cancel" };
  const choose = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nchooseImage;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    Error,
    Taro: { chooseImage: async () => { throw failure; } },
  });
  assert.equal(await choose(1), null);
  failure = new Error("chooseImage:fail cancel");
  assert.equal(await choose(1), null);
  failure = { errMsg: "chooseImage:fail permission denied" };
  await assert.rejects(choose(1), (error) => error === failure);
});

test("media recovery validates pending selection and replaces only the requested expired upload", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "uploadSelectedFile");
  assert.ok(declaration);
  const original = { uploadId: "upload:old", state: "PENDING", mimeType: "image/png", declaredByteSize: 30 };
  const other = { ...original, uploadId: "upload:other", state: "UPLOADED" };
  const replacement = { ...original, uploadId: "upload:new" };
  const working = { submissionId: "draft:a", revision: 4, media: [other, original] };
  const calls: unknown[] = [];
  let size = 40;
  const upload = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nuploadSelectedFile;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    validateMediaFile: () => ({ originalName: "photo.png", mimeType: "image/png", byteSize: size }),
    createContributionUpload: async (id: string, input: unknown) => { calls.push({ id, input }); return { data: { ...working, revision: 5, media: [other, replacement] } }; },
    readBase64: async () => { calls.push("read"); return "bytes"; },
    completeContributionUpload: async (_id: string, id: string) => { calls.push(id); return { data: { ...working, revision: 6 } }; },
  });
  const form = { phase: "UPLOAD", applyDraft() { assert.fail("upload receipts must not overwrite editable fields"); }, applyMediaDraft() {} };
  await assert.rejects(upload(form, working, { path: "photo.png" }, original, () => {}), /续传需要重新选择原来的图片/);
  assert.deepEqual(calls, []);
  size = 30;
  await upload(form, working, { path: "photo.png" }, original, () => {});
  assert.deepEqual(calls, ["read", "upload:old"]);
  calls.length = 0;
  await upload(form, working, { path: "photo.png" }, { ...original, state: "EXPIRED" }, () => {});
  assert.equal(JSON.stringify(calls[0]), JSON.stringify({ id: "draft:a", input: { originalName: "photo.png", mimeType: "image/png", byteSize: 30, expectedRevision: 4, replaceUploadId: "upload:old" } }));
  assert.deepEqual(calls.slice(1), ["read", "upload:new"]);
});

test("retrying an existing image keeps its revision and the unsaved form intact", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter((node) => ts.isFunctionDeclaration(node) && ["activeDraft", "createRetryMedia"].includes(node.name?.text ?? ""));
  assert.equal(declarations.length, 2);
  const target = { uploadId: "upload:original", state: "PENDING" };
  const draft = { submissionId: "draft:a", revision: 4, media: [target] };
  const requests: unknown[] = [];
  let picked = 0;
  let accountValid = true;
  const create = vm.runInNewContext(ts.transpileModule(declarations.map((node) => node.getText(source)).join("\n") + "\ncreateRetryMedia;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    contributionSubmissionState: () => "DRAFT",
    chooseImage: async () => { picked++; return { tempFiles: [{ path: "original.png", size: 30 }] }; },
    uploadSelectedFile: async (_form: unknown, working: unknown, _file: unknown, upload: unknown) => { requests.push({ working, upload }); },
    errorMessage: () => "账号变化",
  });
  const form = {
    draft, rightsConfirmed: true, detail: "尚未保存的文字",
    formInput() { assert.fail("retry must not save the whole form"); },
    setUploading() {}, announce() {}, history: { refetch: async () => {} },
  };
  const retry = create(form, () => { if (!accountValid) throw new Error("changed"); });
  await retry(target.uploadId);
  assert.deepEqual(requests, [{ working: draft, upload: target }]);
  assert.equal(form.detail, "尚未保存的文字");
  assert.equal(draft.revision, 4);
  accountValid = false;
  await retry(target.uploadId);
  assert.equal(requests.length, 1);
  form.rightsConfirmed = false;
  await retry(target.uploadId);
  assert.equal(picked, 2, "unconfirmed rights must not open a picker");
});

test("uploaded media distinguishes missing size from a reported zero", () => {
  const source = ts.createSourceFile("media.tsx", readFileSync(new URL("./contribution-media-history.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "mediaStateText");
  assert.ok(declaration);
  const describe = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\nmediaStateText;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {});
  for (const state of ["UPLOADED", "ATTACHED"]) {
    for (const byteSize of [undefined, null, NaN, Infinity, -1]) {
      const label = describe({ state, byteSize });
      assert.ok(label.includes("大小暂不可用"));
      assert.ok(!label.includes("0 KB"));
      assert.ok(label.includes(state === "ATTACHED" ? "已关联证据" : "已就绪"));
    }
    assert.ok(describe({ state, byteSize: 0 }).includes("0 KB"));
    assert.ok(describe({ state, byteSize: 2048 }).includes("2 KB"));
  }
});
