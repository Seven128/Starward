import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("platform-image.ts", readFileSync(new URL("./platform-image.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "choosePlatformImages");
assert.ok(declaration);
const code = ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\nchoosePlatformImages;", {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
const chooseWith = (chooseImage: (options: unknown) => Promise<unknown>) =>
  vm.runInNewContext(code, { Error, Taro: { chooseImage } });

test("native image cancellation is a quiet null before display translation", async () => {
  for (const failure of [{ errMsg: "chooseImage:fail cancel" }, new Error("chooseImage:fail cancel")]) {
    const choose = chooseWith(async () => { throw failure; });
    assert.equal(await choose(1), null);
  }
});

test("non-cancellation picker failures retain their identity", async () => {
  for (const failure of [{ errMsg: "chooseImage:fail permission denied" },
    { errMsg: "chooseImage:fail cancellation unavailable" }, { errMsg: "otherApi:fail cancel" },
    { errMsg: 0 }, new Error("chooseImage:fail unavailable"), null, "chooseImage:fail cancel"]) {
    const choose = chooseWith(async () => { throw failure; });
    await assert.rejects(choose(1), error => error === failure);
  }
});

test("supported selection counts preserve native source options and the successful result", async () => {
  const result = { tempFilePaths: ["photo.png"], tempFiles: [{ path: "photo.png", size: 30 }] };
  for (const count of [1, 2, 3]) {
    const choose = chooseWith(async options => {
      assert.equal(JSON.stringify(options), JSON.stringify({ count, sizeType: ["compressed"], sourceType: ["album", "camera"] }));
      return result;
    });
    assert.equal(await choose(count), result);
  }
});
