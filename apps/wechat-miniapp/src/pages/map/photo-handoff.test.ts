import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function handler(file: string, name: string, context: object) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer;
    if (name === "photo-click" && ts.isJsxOpeningElement(node) && node.attributes.properties.some(attribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "id" && attribute.getText(source).includes("spot-media-source"))) {
      const click = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "onClick") as ts.JsxAttribute;
      expression = (click.initializer as ts.JsxExpression).expression;
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(expression, `${file}: real photo handler`);
  return vm.runInNewContext(ts.transpileModule(`const fn = ${expression.getText(source)}; fn;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context) as (...args: any[]) => unknown;
}

function deferred() {
  let resolve!: (accepted: boolean) => void;
  const promise = new Promise<boolean>(done => { resolve = done; });
  return { promise, resolve };
}

for (const [file, name] of [["spot-panel.tsx", "openPhoto"], ["pending-proposal-panel.tsx", "photo-click"]]) {
  test(`${file}: the warning retains the live source before rerendering an older return command`, async () => {
    for (const kind of file === "spot-panel.tsx" ? [null, "parking"] : [null]) for (const accepted of [false, true]) {
      const d = deferred(), effects: unknown[] = [];
      // A previous viewer returned to 12; ordinary native scrolling then reached
      // the facility at 457.6 without replacing the explicit return prop.
      let documentTop = 457.6, returnTop = 12, galleryLeft = 80.8, returnLeft = 0;
      const fn = handler(file!, name!, {
        onPhotoIntent: () => {
          effects.push("intent");
          documentTop = returnTop;
          galleryLeft = returnLeft;
          return d.promise;
        },
        currentPhotoScope: { current: "original-photos" }, currentMediaScope: { current: "original-photos" },
        documentPosition: { remember: () => { returnTop = documentTop; effects.push("document"); } },
        galleryPosition: { remember: () => { returnLeft = galleryLeft; effects.push("gallery"); } },
        setSectionRequest: (value: unknown) => effects.push(["section", value]), setScrollAnchor: (value: unknown) => effects.push(["anchor", value]),
        setViewerKind: (value: unknown) => effects.push(["kind", value]), setViewerIndex: (value: unknown) => effects.push(["index", value]),
        loadMedia: (index: number) => effects.push(["load", index]), index: 1, photo: { state: "ready" },
      });
      fn(kind, 1);
      assert.equal(documentTop, 457.6, "the warning must not replay the previous photo's reading offset");
      assert.equal(galleryLeft, 80.8, "the warning preserves the live thumbnail crop");
      const retained = ["document", "gallery", "intent"];
      assert.deepEqual(effects, retained, "only position retention precedes permission; no viewer, section or media effect");
      d.resolve(accepted); await d.promise; await Promise.resolve();
      if (!accepted) assert.deepEqual(effects, retained, "cancel keeps the same source without opening or loading a photo");
      else assert.ok(effects.some(value => JSON.stringify(value) === '["index",1]'));
    }
  });
  test(`${file}: a late accepted intent cannot open a replaced photo list`, async () => {
    const d = deferred(), scope = { current: "original-photos" }, effects: unknown[] = [];
    const fn = handler(file!, name!, {
      onPhotoIntent: () => d.promise, currentPhotoScope: scope, currentMediaScope: scope,
      documentPosition: { remember: () => effects.push("document") }, galleryPosition: { remember: () => effects.push("gallery") },
      setSectionRequest: () => effects.push("section"), setScrollAnchor: () => effects.push("anchor"),
      setViewerKind: () => effects.push("kind"), setViewerIndex: () => effects.push("index"), loadMedia: () => effects.push("load"),
      index: 1, photo: { state: "ready" },
    });
    fn(null, 1); const retained = [...effects];
    scope.current = "replacement-photos"; d.resolve(true); await d.promise; await Promise.resolve();
    assert.deepEqual(effects, retained, "a replaced list receives no late viewer or media effects");
  });
}

test("Map photo confirmation belongs to the original account, selection, panel and visible page lifetime", async () => {
  for (const retire of ["none", "hidden", "account", "spot", "proposal", "close", "selection-ABA", "account-reset-ABA"]) {
    const d = deferred(); let owner = "user:A", spot = "spot:A", resetVersion = 3;
    const generation = { current: 4 }, epoch = { current: 3 }, proposal = { current: { submissionId: "submission:A" } };
    const presentation = { current: "spot-panel" };
    const fn = handler("index.tsx", "onPanelPhotoIntent", {
      pageVisible: true, bottomPresentationRef: presentation, privateTransitionGeneration: generation, navigationEpoch: epoch,
      currentDraftUserId: () => owner, useAppStore: { getState: () => ({ selectedSpotId: spot, mapResetVersion: resetVersion }) }, selectedProposalRef: proposal,
      photoHandoff: { confirm: () => d.promise }, PHOTO_VIEWER_HANDOFF: { detail: "original-color photos" },
    });
    const result = fn() as Promise<boolean>;
    if (retire === "hidden") epoch.current++;
    if (retire === "account") owner = "user:B";
    if (retire === "spot") spot = "spot:B";
    if (retire === "proposal") proposal.current = { submissionId: "submission:B" };
    if (retire === "close") presentation.current = "none";
    if (retire === "selection-ABA") generation.current += 2;
    if (retire === "account-reset-ABA") resetVersion += 2;
    d.resolve(true); assert.equal(await result, retire === "none", retire);
  }
});
