import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("only the positioned Map editor opts into fixed native textarea placement", () => {
  const shared = readFileSync(new URL("./content/spot-document-fields.tsx", import.meta.url), "utf8");
  const contribution = readFileSync(new URL("./content/contribution/contribution-editor.tsx", import.meta.url), "utf8");
  const standalone = readFileSync(new URL("./content/spot-feedback/index.tsx", import.meta.url), "utf8");

  assert.match(shared, /textareaFixed\s*=\s*false/u);
  assert.match(shared, /fixed=\{textareaFixed\}/u);
  assert.match(contribution, /textareaFixed=\{embedded\}/u);
  assert.doesNotMatch(standalone, /textareaFixed=/u);
});
