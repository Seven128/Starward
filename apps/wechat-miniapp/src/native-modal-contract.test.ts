import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

test("all literal native modal actions fit WeChat's four-character limit", () => {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(root, { recursive: true })
    .map(String)
    .filter((entry) => /\.(?:ts|tsx)$/u.test(entry) && !entry.endsWith(".test.ts"));
  const offenders: string[] = [];
  for (const relative of files) {
    const absolute = path.join(root, relative);
    const source = ts.createSourceFile(relative, readFileSync(absolute, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) &&
          (node.name.text === "confirmText" || node.name.text === "cancelText") &&
          ts.isStringLiteralLike(node.initializer) && [...node.initializer.text].length > 4) {
        offenders.push(`${relative}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}:${node.name.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(offenders, []);
});
