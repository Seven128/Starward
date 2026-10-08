import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { mediaIsRenderable } from "./spot-panel-media";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("sample media is visible only in the explicit fixture lane", () => {
  const sample = TEST_PUBLISHED_SPOT.media[0]!;
  assert.equal(mediaIsRenderable(sample), false);
  assert.equal(mediaIsRenderable(sample, true), true);
  assert.equal(mediaIsRenderable({ ...sample, state: "EXPIRED" }, true), false);
  assert.equal(mediaIsRenderable({ ...sample, license: "" }, true), false);
});

test("site and facility photo entry retain the actual scrolled document before mounting the viewer", async () => {
  const source = ts.createSourceFile("spot-panel.tsx", readFileSync(new URL("./spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let openPhoto = "", onScroll = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openPhoto") openPhoto = `const ${node.getText(source)};`;
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === "ScrollView" && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "id" && ts.isStringLiteral(attribute.initializer!) && attribute.initializer.text === "spot-panel-scroll")) {
      const attribute = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "onScroll") as ts.JsxAttribute;
      onScroll = `const recordScroll = ${(attribute.initializer as ts.JsxExpression).expression!.getText(source)};`;
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(openPhoto && onScroll);
  for (const kind of [null, "parking", "toilet"]) {
    const commands: Array<{ kind: string; top?: number }> = [];
    let top = 0;
    const handlers = vm.runInNewContext(ts.transpileModule(onScroll + openPhoto + "\n({ recordScroll, openPhoto });", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      visible: true, spot: { spotId: "spot:a" }, lastScroll: { current: { spotId: "spot:a", top: 0 } }, extent: "large",
      terrainOffset: { current: null }, astronomyOffset: { current: null }, scrollMeasureTimer: { current: null },
      setTimeout: () => 1, clearTimeout() {}, setLayoutVersion() {}, setSection() {}, setSectionRequest() {}, setScrollAnchor() {},
      galleryPosition: { remember() {} }, setViewerKind() {}, setViewerIndex: () => commands.push({ kind: "open" }),
      onPhotoIntent: async () => true, currentPhotoScope: { current: "spot:a:photos" },
      documentPosition: { record(value: number) { top = value; }, remember() { commands.push({ kind: "scroll", top }); } },
      setRestoredScrollTop: (top: number) => commands.push({ kind: "scroll", top }),
    });
    handlers.recordScroll({ detail: { scrollTop: 440 } }); handlers.openPhoto(kind, 0);
    await Promise.resolve();
    assert.deepEqual(commands, [{ kind: "scroll", top: 440 }, { kind: "open" }]);
  }
});
