import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { MEDIA_RIGHTS_MODAL } from "./media-rights-modal";

test("batch validation precedes draft writes and valid files use consecutive receipts", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = ["validateMediaFile", "createAddMedia"].map((name) => {
    const node = source.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
    assert.ok(node);
    return node.getText(source);
  });
  const run = async (sizes: number[], existing = 0, switched = false) => {
    const calls: string[] = [];
    const create = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\ncreateAddMedia;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      chooseImage: async (count: number) => { assert.equal(count, 3 - existing); return { tempFiles: sizes.map((size) => ({ path: "self.png", size })) }; },
      mediaFileName: (path: string) => path, mediaMimeType: () => "image/png", errorMessage: String,
      uploadSelectedFile: async (_form: unknown, receipt: { revision: number }) => { calls.push(`upload:${receipt.revision}`); return { revision: receipt.revision + 2 }; },
    });
    await create({ rightsConfirmed: true, currentMedia: Array(existing).fill({}),
      setUploading() {}, announce(tone: string) { calls.push(tone); },
      history: { refetch: async () => { calls.push("read"); } },
    }, async () => { calls.push("save"); return { revision: 1 }; }, () => { if (switched) throw new Error("owner changed"); }, async () => true)();
    return calls;
  };
  for (const sizes of [[1, 2, 3, 4], [100, -1], [NaN], [1.5], [0], [1_200_001]])
    assert.deepEqual(await run(sizes), ["error"]);
  assert.deepEqual(await run([10, 20], 2), ["error"]);
  assert.deepEqual(await run([10], 0, true), ["error"]);
  assert.deepEqual(await run([]), []);
  assert.deepEqual(await run([100, 200, 300]), ["save", "upload:1", "upload:3", "upload:5", "read", "success"]);
});

test("categorized media consent keeps native modal actions within WeChat's four-character limit", async () => {
  assert.ok([...MEDIA_RIGHTS_MODAL.confirmText].length <= 4);
  assert.ok([...MEDIA_RIGHTS_MODAL.cancelText].length <= 4);
  for (const relativePath of ["./use-contribution-commands.ts", "../spot-feedback/index.tsx"]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /Taro\.showModal\(MEDIA_RIGHTS_MODAL\)/u);
  }
});
