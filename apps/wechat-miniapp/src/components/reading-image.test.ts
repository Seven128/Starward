import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("native photo failure retries only that image and ignores the retired decode callback", () => {
  const source = ts.createSourceFile("media.tsx", readFileSync(new URL("./reading-image.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "ReadingImageState")!;
  const states: any[] = [], refs: any[] = []; let stateIndex = 0, refIndex = 0, mounted = false, cleanup: (() => void) | undefined;
  const component = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + ";ReadingImageState;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    React: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", Text: "Text", Image: "Image", LoadingIndicator: "Loading", SoftButton: "Button",
    mediaSource: (path: string) => path,
    useState: (initial: unknown) => { const index = stateIndex++; if (!(index in states)) states[index] = initial;
      return [states[index], (value: unknown) => { states[index] = value; }]; },
    useRef: (initial: unknown) => refs[refIndex++] ??= { current: initial },
    useEffect: (fn: () => () => void) => { if (!mounted) { mounted = true; cleanup = fn(); } },
  });
  const media = { id: "owned-photo", localPath: "same-photo.jpg", alt: "当前文章照片", caption: "完整说明", photographer: "作者", license: "许可原文", isSiteSpecific: true };
  const render = () => { stateIndex = 0; refIndex = 0; return component({ src: media.localPath, alt: media.alt }); };
  const nodes = (tree: any): any[] => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.children)];
  let tree = render(); const firstImage = nodes(tree).find(node => node.type === "Image");
  assert.ok(nodes(tree).some(node => node.type === "Loading"));
  firstImage.props.onError(); tree = render();
  assert.match(JSON.stringify(tree), /照片暂时无法显示/);
  nodes(tree).find(node => node.type === "Button").props.onClick();
  firstImage.props.onLoad(); tree = render();
  assert.ok(nodes(tree).some(node => node.type === "Loading"), "the old image cannot settle its replacement");
  const replacement = nodes(tree).find(node => node.type === "Image");
  assert.equal(replacement.props.src, firstImage.props.src); assert.notEqual(replacement.props.key, firstImage.props.key);
  replacement.props.onLoad(); tree = render();
  assert.ok(!nodes(tree).some(node => node.type === "Loading")); assert.doesNotMatch(JSON.stringify(tree), /照片暂时无法显示/);
  cleanup!(); replacement.props.onError(); assert.equal(states[0], "ready", "an unmounted image cannot change state");
});
