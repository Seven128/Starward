import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the page's actual effects, including their dependency cleanup.
const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function effectWith(marker: string) {
  let effect: ts.CallExpression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes(marker)) effect = node;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(effect, marker);
  const js = ts.transpileModule(`({run: ${effect.arguments[0]!.getText(source)}, deps: ${effect.arguments[1]!.getText(source)}})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let previous: unknown[] | undefined;
  let cleanup: (() => void) | undefined;
  return (bindings: Record<string, unknown>) => {
    const current = vm.runInNewContext(js, bindings) as { run(): void | (() => void); deps: unknown[] };
    if (!previous || current.deps.some((value, index) => !Object.is(value, previous![index]))) {
      cleanup?.(); cleanup = current.run() || undefined; previous = [...current.deps];
    }
  };
}
const entry = { objectRef: "M:31", displayName: "M31" };
const coarse = { reference: "M:31", level: "OVERVIEW", fieldDegrees: 4, tempFilePath: "/m31-overview.jpg", image: {}, canvasGeneration: 1, release() {} };
const fine = { ...coarse, level: "DETAIL", tempFilePath: "/m31-detail.jpg" };

function callbackWith(name: string, bindings: Record<string, unknown>) {
  let callback: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer && ts.isCallExpression(node.initializer)) callback = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source); assert(callback, name);
  return vm.runInNewContext(ts.transpileModule(`(${callback.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, bindings) as (value: unknown) => void;
}

test("file owners keep usable coarse recovery data but release replaced and cleared files", () => {
  const removed: string[] = [];
  const file = (tempFilePath: string) => { let released = false; return { tempFilePath, release() { if (!released) { released = true; removed.push(tempFilePath); } } }; };
  const a = file("coarse"), b = file("failed-fine"), c = file("retry-fine");
  const bindings = { deepSkyImageFileRef: { current: null }, canvasDeepSkyImageRef: { current: null }, storeDeepSkyImageAsset() {}, storeCanvasDeepSkyImage() {} };
  const requested = callbackWith("setDeepSkyImageAsset", bindings), decoded = callbackWith("setCanvasDeepSkyImage", bindings);
  requested(a); decoded(a); requested(b); assert.deepEqual(removed, []);
  requested(c); assert.deepEqual(removed, ["failed-fine"]);
  decoded(c); assert.deepEqual(removed, ["failed-fine", "coarse"]);
  requested(null); assert.deepEqual(removed, ["failed-fine", "coarse"], "decoded file remains owned for canvas recovery");
  decoded(null); assert.deepEqual(removed, ["failed-fine", "coarse", "retry-fine"]);
});

test("hiding cancels an image request and showing restarts only the current level", () => {
  const render = effectWith("return startDeepSkyImageRequest");
  let requests = 0, cancels = 0;
  const bindings = {
    pageVisible: true, selectedDeepSkyEntry: entry, desiredDeepSkyImageLevel: "DETAIL", deepSkyImageAsset: coarse, deepSkyImageRetry: 0,
    deepSkyImageFailureRef: { current: null }, setDeepSkyImageAsset() {}, setDeepSkyImageState() {}, recordAcceptanceDiagnostic() {},
    Taro: { env: { USER_DATA_PATH: "/data" } }, deepSkyImageUrl: () => "/image",
    startDeepSkyImageRequest: () => { requests++; return () => { cancels++; }; },
  };
  render(bindings); assert.equal(requests, 1);
  render({ ...bindings, pageVisible: false }); assert.equal(cancels, 1); assert.equal(requests, 1);
  render(bindings); assert.equal(requests, 2);
});

function decoder() {
  const render = effectWith("const image = node.createImage()");
  const images: { onload?: (() => void) | null; onerror?: (() => void) | null; src?: string }[] = [];
  let painted: unknown = coarse;
  let state = "LOADING";
  const bindings = {
    pageVisible: true, selectedDeepSkyEntry: entry, desiredDeepSkyImageLevel: "DETAIL", deepSkyImageAsset: fine,
    deepSkyImageFailureRef: { current: null }, canvasNodeRevision: 1, canvasNodeRef: { current: { createImage() { const image = {}; images.push(image); return image; } } },
    canvasGenerationRef: { current: 1 }, canvasDeepSkyImageRef: { current: coarse as unknown },
    setCanvasDeepSkyImage(value: unknown) { painted = typeof value === "function" ? value(painted) : value; bindings.canvasDeepSkyImageRef.current = painted; },
    setDeepSkyImageState(value: string) { state = value; },
  };
  return { render, bindings, images, get painted() { return painted; }, get state() { return state; } };
}

test("failed fine decode and retry keep the coarse image until successful replacement", () => {
  const h = decoder(); h.render(h.bindings);
  assert.equal(h.painted, coarse); h.images[0]!.onerror?.();
  assert.equal(h.painted, coarse); assert.equal(h.state, "ERROR");
  h.render({ ...h.bindings, deepSkyImageAsset: null }); assert.equal(h.painted, coarse);
  h.render(h.bindings); h.images[1]!.onload?.();
  assert.equal((h.painted as typeof fine).tempFilePath, fine.tempFilePath); assert.equal(h.state, "READY");
});

test("hidden decoding cannot publish late pixels or erase the retained view", () => {
  const h = decoder(); h.render(h.bindings); const late = h.images[0]!.onload!;
  h.render({ ...h.bindings, pageVisible: false }); late();
  assert.equal(h.painted, coarse);
  h.render(h.bindings); assert.equal(h.images.length, 2);
  h.images[1]!.onload?.(); assert.equal((h.painted as typeof fine).tempFilePath, fine.tempFilePath);
});

test("a retained coarse level cannot mark a pending fine request ready", () => {
  const h = decoder(); h.render({ ...h.bindings, deepSkyImageAsset: coarse });
  assert.equal(h.painted, coarse); assert.equal(h.images.length, 0); assert.equal(h.state, "LOADING");
});

test("show before native canvas reconstruction retains coarse recovery until re-decode", () => {
  const h = decoder(); h.render(h.bindings); h.images[0]!.onerror?.();
  h.render({ ...h.bindings, pageVisible: false, canvasNodeRef: { current: null } });
  h.render({ ...h.bindings, canvasNodeRef: { current: null } });
  assert.equal(h.painted, coarse, "show must not release the last usable file while the node is absent");
  h.bindings.canvasGenerationRef.current = 2;
  h.render({ ...h.bindings, canvasNodeRevision: 2 });
  assert.equal(h.images[1]!.src, coarse.tempFilePath);
  h.images[1]!.onload?.(); h.images[2]!.onerror?.();
  assert.equal((h.painted as typeof coarse).tempFilePath, coarse.tempFilePath);
  assert.equal((h.painted as typeof coarse).canvasGeneration, 2);
  assert.equal(h.state, "ERROR");
});

test("resuming a failed decode starts a new loading transition before success or failure", () => {
  const h = decoder(); h.render(h.bindings); h.images[0]!.onerror?.();
  assert.equal(h.state, "ERROR");
  h.render({ ...h.bindings, pageVisible: false });
  h.render(h.bindings); assert.equal(h.state, "LOADING");
  assert.equal(h.bindings.deepSkyImageFailureRef.current, null);
  h.images[1]!.onerror?.(); assert.equal(h.state, "ERROR");
  assert.equal(h.painted, coarse);
});

test("switching object cannot retain the previous object's pixels", () => {
  const h = decoder(); h.render({ ...h.bindings, selectedDeepSkyEntry: { objectRef: "M:42" }, deepSkyImageAsset: null });
  assert.equal(h.painted, null);
});

test("native generation changes reject queued decode before React cleanup", () => {
  const h = decoder(); h.render(h.bindings);
  h.bindings.canvasGenerationRef.current = 2;
  h.images[0]!.onload?.(); h.images[0]!.onerror?.();
  assert.equal(h.painted, coarse); assert.equal(h.state, "LOADING");
});

test("synchronous native decoder failures are retryable and coarse failure cannot prevent fine decode", () => {
  const createFailure = decoder();
  createFailure.bindings.canvasNodeRef.current.createImage = () => { throw new Error("native image unavailable"); };
  assert.doesNotThrow(() => createFailure.render(createFailure.bindings));
  assert.equal(createFailure.state, "ERROR"); assert.equal(createFailure.painted, coarse);

  const sourceFailure = decoder();
  const image = { onload: null, onerror: null };
  Object.defineProperty(image, "src", { set() { throw new Error("native source unavailable"); } });
  sourceFailure.bindings.canvasNodeRef.current.createImage = () => image;
  assert.doesNotThrow(() => sourceFailure.render(sourceFailure.bindings));
  assert.equal(sourceFailure.state, "ERROR"); assert.equal(image.onload, null); assert.equal(image.onerror, null);

  const fallbackFailure = decoder(); let creates = 0;
  fallbackFailure.bindings.canvasGenerationRef.current = 2;
  fallbackFailure.bindings.canvasNodeRef.current.createImage = () => {
    if (++creates === 1) throw new Error("coarse unavailable");
    const value = {}; fallbackFailure.images.push(value); return value;
  };
  assert.doesNotThrow(() => fallbackFailure.render({ ...fallbackFailure.bindings, canvasNodeRevision: 2 }));
  assert.equal(creates, 2); fallbackFailure.images[0]!.onload?.();
  assert.equal(fallbackFailure.state, "READY"); assert.equal((fallbackFailure.painted as typeof fine).tempFilePath, fine.tempFilePath);
});

test("new native canvas redecodes retained coarse pixels and late coarse cannot replace fine", () => {
  const h = decoder();
  h.bindings.canvasGenerationRef.current = 2;
  h.render({ ...h.bindings, canvasNodeRevision: 2 });
  assert.equal(h.images.length, 2);
  h.images[0]!.onload?.();
  assert.notEqual((h.painted as typeof coarse).image, coarse.image);
  assert.equal((h.painted as typeof coarse).canvasGeneration, 2);
  assert.equal((h.painted as typeof coarse).tempFilePath, coarse.tempFilePath);
  assert.equal(h.state, "LOADING");
  h.images[1]!.onerror?.(); assert.equal(h.state, "ERROR");
  assert.equal((h.painted as typeof coarse).tempFilePath, coarse.tempFilePath);

  const fineFirst = decoder(); fineFirst.bindings.canvasGenerationRef.current = 2;
  fineFirst.render({ ...fineFirst.bindings, canvasNodeRevision: 2 });
  fineFirst.images[1]!.onload?.(); fineFirst.images[0]!.onload?.();
  assert.equal((fineFirst.painted as typeof fine).tempFilePath, fine.tempFilePath);
  assert.equal(fineFirst.state, "READY");
});

test("hidden image errors do not enqueue a notification on another page", () => {
  const render = effectWith('title: "深空影像数据异常"');
  const notices: unknown[] = [];
  const bindings = { pageVisible: false, deepSkyImageState: "ERROR", selectedDeepSkyEntry: entry, desiredDeepSkyImageLevel: "DETAIL", deepSkyImageFailureRef: { current: "deep-sky-image:M:31:DETAIL" }, notify: (value: unknown) => notices.push(value) };
  render(bindings); assert.equal(notices.length, 0);
  render({ ...bindings, pageVisible: true }); assert.equal(notices.length, 1);
});

test("a previous image error cannot be relabelled for a new object or hidden image mode", () => {
  const renderRequest = effectWith("return startDeepSkyImageRequest");
  const renderNotice = effectWith('title: "深空影像数据异常"');
  const notices: unknown[] = [];
  const failure = { current: "deep-sky-image:M:31:DETAIL" as string | null };
  const bindings = { pageVisible: true, selectedDeepSkyEntry: { objectRef: "M:42", displayName: "M42" }, desiredDeepSkyImageLevel: "DETAIL", deepSkyImageAsset: null, deepSkyImageRetry: 0,
    deepSkyImageFailureRef: failure, deepSkyImageState: "ERROR", setDeepSkyImageAsset() {}, setDeepSkyImageState() {}, recordAcceptanceDiagnostic() {},
    Taro: { env: { USER_DATA_PATH: "/data" } }, deepSkyImageUrl: () => "/image", startDeepSkyImageRequest: () => () => {}, notify: (value: unknown) => notices.push(value) };
  // Both effects receive the same commit's ERROR closure despite the queued LOADING update.
  renderRequest(bindings); renderNotice(bindings); assert.equal(notices.length, 0);
  failure.current = "deep-sky-image:M:42:DETAIL";
  renderNotice({ ...bindings, desiredDeepSkyImageLevel: null }); assert.equal(notices.length, 0);
});
