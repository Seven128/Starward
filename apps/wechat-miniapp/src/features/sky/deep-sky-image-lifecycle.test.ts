import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyDeepSkyImageIntersectsView, type SkyTargetImageView } from "./sky-target-image-visibility";
import { createSkyViewBasis } from "./sky-view-projection";
import { deepSkyImageLevelForFov } from "./sky-zoom";
import { publishedDeepSkyDiscovery } from "./deep-sky-image-test-support";
import { registerSkyNativeImageLifetime, skyNativeImageIsCurrent } from "./sky-artwork-loader";

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
const { image: _image, canvasGeneration: _generation, ...coarseFile } = coarse;

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
  const bindings = { deepSkyImageFileRef: { current: null }, canvasDeepSkyImageRef: { current: null },
    deepSkyRecoveryFileRef: { current: null }, storeDeepSkyImageAsset() {}, storeCanvasDeepSkyImage() {} };
  const requested = callbackWith("setDeepSkyImageAsset", bindings), decoded = callbackWith("setCanvasDeepSkyImage", bindings);
  requested(a); decoded(a); requested(b); assert.deepEqual(removed, []);
  requested(c); assert.deepEqual(removed, ["failed-fine"]);
  decoded(c); assert.deepEqual(removed, ["failed-fine", "coarse"]);
  requested(null); assert.deepEqual(removed, ["failed-fine", "coarse"], "decoded file remains owned for canvas recovery");
  decoded(null); assert.deepEqual(removed, ["failed-fine", "coarse", "retry-fine"]);
});

test("same public filename never merges ownership of distinct publication leases", () => {
  const removed: string[] = [];
  const a = { tempFilePath: "/same-public.png", release() { removed.push("a"); } };
  const b = { tempFilePath: "/same-public.png", release() { removed.push("b"); } };
  const bindings = { deepSkyImageFileRef: { current: null }, canvasDeepSkyImageRef: { current: null },
    deepSkyRecoveryFileRef: { current: null }, storeDeepSkyImageAsset() {}, storeCanvasDeepSkyImage() {} };
  const requested = callbackWith("setDeepSkyImageAsset", bindings), decoded = callbackWith("setCanvasDeepSkyImage", bindings);
  requested(a); decoded(a); requested(b); assert.deepEqual(removed, []);
  decoded(b); assert.deepEqual(removed, ["a"]);
  requested(null); decoded(null); assert.deepEqual(removed, ["a", "b"]);
});

test("replacing or retiring a selected bitmap fences its native lifetime while a pending fine file preserves coarse", () => {
  const bindings = { deepSkyImageFileRef: { current: null }, canvasDeepSkyImageRef: { current: null as any },
    deepSkyRecoveryFileRef: { current: null as any }, storeDeepSkyImageAsset() {}, storeCanvasDeepSkyImage() {} };
  const requested = callbackWith("setDeepSkyImageAsset", bindings), decoded = callbackWith("setCanvasDeepSkyImage", bindings);
  const retire = callbackWith("retireDeepSkyDecode", bindings) as () => void;
  // A compatible file provider need not implement isCurrent; native ownership
  // must still end when pixels are replaced, independently of retained bytes.
  const image = () => ({ onload: null, onerror: null });
  const first = image(), next = image();
  const a = { reference: "M:51", level: "MEDIUM", tempFilePath: "/medium.jpg", release() {} };
  const b = { ...a, level: "DETAIL", tempFilePath: "/detail.jpg" };
  requested(a); decoded({ ...a, image: first, canvasGeneration: 1, retireNative: registerSkyNativeImageLifetime(first, () => true) });
  requested(b); assert.equal(skyNativeImageIsCurrent(first), true, "fine-file demand keeps the actually presented coarse bitmap");
  decoded({ ...b, image: next, canvasGeneration: 1, retireNative: registerSkyNativeImageLifetime(next, () => true) });
  assert.equal(skyNativeImageIsCurrent(first), false, "replaced queued coarse bitmap is retired even when file bytes remain valid");
  assert.equal(skyNativeImageIsCurrent(next), true);
  assert.equal("retireNative" in bindings.deepSkyRecoveryFileRef.current, false, "recovery metadata does not retain native lifetime ownership");
  retire(); retire(); assert.equal(skyNativeImageIsCurrent(next), false);
  assert.equal(bindings.canvasDeepSkyImageRef.current, null);
});

test("native retirement keeps only recovery metadata and later replacement releases the coarse file", () => {
  const removed: string[] = [], shown: unknown[] = [];
  const file = (tempFilePath: string) => ({ reference: "M:31", level: "OVERVIEW", fieldDegrees: 4,
    tempFilePath, release() { removed.push(tempFilePath); } });
  const old = file("old-coarse"), fine = file("new-fine");
  const bindings = { deepSkyImageFileRef: { current: null }, canvasDeepSkyImageRef: { current: null as any },
    deepSkyRecoveryFileRef: { current: null as any }, storeDeepSkyImageAsset() {}, storeCanvasDeepSkyImage(value: unknown) { shown.push(value); } };
  const requested = callbackWith("setDeepSkyImageAsset", bindings), decoded = callbackWith("setCanvasDeepSkyImage", bindings);
  const retire = callbackWith("retireDeepSkyDecode", bindings) as () => void;
  const bitmap = { onload() {}, onerror() {} };
  requested(old); decoded({ ...old, image: bitmap, canvasGeneration: 1 }); requested(fine);
  retire(); retire();
  assert.equal(bindings.canvasDeepSkyImageRef.current, null);
  assert.equal(shown.at(-1), null); assert.deepEqual(removed, []);
  assert.equal(bitmap.onload, null); assert.equal(bitmap.onerror, null);
  assert.equal(bindings.deepSkyRecoveryFileRef.current.tempFilePath, old.tempFilePath);
  assert.equal("image" in bindings.deepSkyRecoveryFileRef.current, false);
  assert.equal("canvasGeneration" in bindings.deepSkyRecoveryFileRef.current, false);
  decoded({ ...fine, image: { onload: null, onerror: null }, canvasGeneration: 2 });
  assert.deepEqual(removed, [old.tempFilePath]);
  requested(null); decoded(null);
  assert.deepEqual(removed, [old.tempFilePath, fine.tempFilePath]);
});

test("the production Canvas release port retires deep-sky pixels on reset or GPU failure", () => {
  let releasePort: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "releaseContext") releasePort = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(releasePort);
  const bindings = { canvasNodeRef: { current: {} as object | null }, canvasGenerationRef: { current: 1 },
    artworkContributionRetryRef: { current: undefined },
    targetOpticalRetryRef: { current: undefined }, hipsRetryRef: { current: undefined },
    canvasDeepSkyImageRef: { current: { image: { onload() {}, onerror() {} } } as any },
    storeCanvasDeepSkyImage(value: unknown) { assert.equal(value, null); }, retireDeepSkyDecodeRef: { current: () => {} } };
  bindings.retireDeepSkyDecodeRef.current = callbackWith("retireDeepSkyDecode", bindings) as () => void;
  const release = vm.runInNewContext(ts.transpileModule(`(${releasePort.getText(source)})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, bindings) as (context: { dispose(): void }) => void;
  let released = false;
  release({ dispose() {
    assert.equal(bindings.canvasNodeRef.current, null);
    assert.equal(bindings.canvasDeepSkyImageRef.current, null);
    assert.equal(bindings.canvasGenerationRef.current, 2);
    released = true;
  } });
  assert.equal(released, true);
});

test("hiding cancels an image request and showing restarts only the current level", () => {
  const render = effectWith("return startDeepSkyImageRequest");
  let requests = 0, cancels = 0;
  const bindings = {
    pageVisible: true, selectedDeepSkyEntry: entry, desiredDeepSkyImageLevel: "DETAIL", deepSkyImageAsset: coarse, deepSkyImageRetry: 0,
    deepSkyImageFailureRef: { current: null }, setDeepSkyImageAsset() {}, setDeepSkyImageState() {}, recordAcceptanceDiagnostic() {},
    acquireDeepSkyImage() {}, beginDeepSkyImageDemand() {},
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
    deepSkyImageIntentRef: { current: { reference: entry.objectRef, level: "DETAIL" } as { reference: string; level: string } | null },
    deepSkyImageFailureRef: { current: null }, canvasNodeRevision: 1, canvasNodeRef: { current: { createImage() { const image = {}; images.push(image); return image; } } },
    canvasGenerationRef: { current: 1 }, canvasDeepSkyImageRef: { current: coarse as unknown },
    deepSkyRecoveryFileRef: { current: coarseFile as unknown },
    registerSkyNativeImageLifetime() {},
    setDeepSkyImageAsset() {},
    setCanvasDeepSkyImage(value: unknown) {
      painted = typeof value === "function" ? value(painted) : value;
      bindings.canvasDeepSkyImageRef.current = painted;
      if (painted) {
        const { image, canvasGeneration, ...file } = painted as typeof coarse;
        bindings.deepSkyRecoveryFileRef.current = file;
      } else bindings.deepSkyRecoveryFileRef.current = null;
    },
    retireDeepSkyDecode() { painted = null; bindings.canvasDeepSkyImageRef.current = null; },
    setDeepSkyImageState(value: string) { state = value; },
  };
  return { render, bindings, images, painted() { return painted; }, get state() { return state; } };
}

test("selected W3 uses the accepted footprint while preserving independent refinement intent", () => {
  const names = ["targetOpticalView", "currentDeepSkyDiscovery", "deepSkyImageInView", "desiredDeepSkyImageLevel"];
  const declarations = new Map<string, string>(); let paintedInput: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.set(node.name.getText(source), node.getText(source));
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "deepSkyImage" && node.initializer.getText(source).includes("canvasDeepSkyImage")) paintedInput = node.initializer;
    ts.forEachChild(node, visit);
  }; visit(source); assert.equal(declarations.size, names.length); assert(paintedInput);
  const publication = publishedDeepSkyDiscovery("M:42"), at = "2026-10-03T13:00:00.000Z";
  const report = { hourly: [{ at }], skyScene: { deepSky: { state: "AVAILABLE", catalog: {
    frame: "ICRS J2000", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: publication.objectRef }] },
    frames: [{ at, state: "AVAILABLE", points: [[0, 0, -10, 0, -9.9, 359.9, -10]] }] } } };
  const code = ts.transpileModule(names.map(name => `const ${declarations.get(name)};`).join("\n") +
    `\n({footprint: targetOpticalView, level: desiredDeepSkyImageLevel, painted: ${paintedInput.getText(source)}})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const acceptedCenter = { x: 190, y: 414 }, image = {};
  const input = { geometryReport: report, row: { at }, canvasSize: { width: 390, height: 844 },
    canvasNodeRef: { current: { width: 390, height: 844 } },
    currentViewBasis: createSkyViewBasis(0, 80, 0), presentedFov: .05, presentedCenter: acceptedCenter, verticalFovDeg: .2,
    selectedDeepSkyEntry: { objectRef: publication.objectRef }, deepSkyRegistrationReady: true, deepSkyImageDiscovery: publication,
    canvasDeepSkyImage: image, mode: "NIGHT", report: { data: { dataState: "FRESH" }, isError: false },
    useMemo: (read: () => unknown) => read(), skyDeepSkyImageIntersectsView, deepSkyImageLevelForFov };
  const near = vm.runInNewContext(code, input);
  assert.equal(near.footprint.report, report); assert.equal(near.footprint.view.basis, input.currentViewBasis);
  assert.equal(near.footprint.view.center, acceptedCenter); assert.equal(near.footprint.view.verticalFovDeg, .05);
  assert.equal(near.level, "DETAIL"); assert.equal(near.painted, image);
  const far = vm.runInNewContext(code, { ...input, currentViewBasis: createSkyViewBasis(90, 80, 0) });
  assert.equal(far.level, null); assert.equal(far.painted, null);
  const unknown = vm.runInNewContext(code, { ...input, currentViewBasis: createSkyViewBasis(90, 80, 0), geometryReport: undefined });
  assert.equal(unknown.level, "DETAIL"); assert.equal(unknown.painted, image);
  assert.equal(vm.runInNewContext(code, { ...input, verticalFovDeg: 16 }).level, null);
  assert.equal(vm.runInNewContext(code, { ...input, report: { data: { dataState: "STALE_USABLE" }, isError: false } }).level, "DETAIL");
  for (const dataState of ["EXPIRED", "UNAVAILABLE"])
    assert.equal(vm.runInNewContext(code, { ...input, report: { data: { dataState }, isError: false } }).level, null,
      "retained report geometry must not keep deep-sky demand after report validity ends");
  assert.equal(vm.runInNewContext(code, { ...input, report: { data: undefined, isError: true } }).level, null);
});

test("a ready deep-sky bitmap rejects a lost or changed selection scope before effect cleanup", () => {
  const h = decoder(); Object.assign(h.bindings, { registerSkyNativeImageLifetime });
  h.render(h.bindings); h.images[0]!.onload?.(); const ready = h.painted() as { image: object };
  assert.equal(skyNativeImageIsCurrent(ready.image), true);
  h.bindings.deepSkyImageIntentRef.current = null;
  assert.equal(skyNativeImageIsCurrent(ready.image), false, "a queued ready bitmap cannot outlive current image eligibility");
  h.bindings.deepSkyImageIntentRef.current = { reference: "M:42", level: "DETAIL" };
  assert.equal(skyNativeImageIsCurrent(ready.image), false);
});

test("discovery checks the latest view and cannot relabel stale selection metadata", () => {
  let predicate: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "onDiscovered") predicate = node.initializer;
    ts.forEachChild(node, visit);
  }; visit(source); assert(predicate);
  const at = "2026-10-03T13:00:00.000Z", publication = publishedDeepSkyDiscovery("M:42");
  const footprint: SkyTargetImageView = { report: { hourly: [{ at }], skyScene: { deepSky: { state: "AVAILABLE", catalog: {
    frame: "ICRS J2000", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: publication.objectRef }] },
    frames: [{ at, state: "AVAILABLE", points: [[0, 0, -10, 0, -9.9, 359.9, -10]] }] } } } as any,
    at, width: 390, height: 844, view: { basis: createSkyViewBasis(90, 80, 0)!, verticalFovDeg: .05 } };
  const states: string[] = [], metadata: unknown[] = [];
  const context = { deepSkyImageIntentRef: { current: { reference: publication.objectRef, level: "DETAIL" } as { reference: string; level: string } | null },
    deepSkyImageViewRef: { current: footprint }, desiredDeepSkyImageLevel: "DETAIL", skyDeepSkyImageIntersectsView,
    setDeepSkyImageDiscovery(value: unknown) { metadata.push(value); }, setDeepSkyImageState(value: string) { states.push(value); } };
  const read = vm.runInNewContext(ts.transpileModule(`(${predicate.getText(source)})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context) as (value: unknown) => boolean;
  assert.equal(read(publication), false); assert.equal(metadata[0], publication); assert.deepEqual(states, ["IDLE"]);
  context.deepSkyImageIntentRef.current = { reference: "M:31", level: "DETAIL" };
  assert.equal(read(publication), false); assert.equal(metadata.length, 1); assert.equal(states.length, 1);
  context.deepSkyImageIntentRef.current = { reference: publication.objectRef, level: "OVERVIEW" };
  assert.equal(read(publication), false); assert.equal(metadata.length, 1);
  context.deepSkyImageIntentRef.current = { reference: publication.objectRef, level: "DETAIL" };
  context.deepSkyImageViewRef.current = { ...footprint, report: undefined };
  assert.equal(read(publication), true); assert.equal(metadata.length, 2); assert.equal(states.length, 1);
});

test("a newly excluded family rejects queued decode before effect cleanup and releases both file slots", () => {
  const h = decoder(); h.render(h.bindings); const queued = h.images[0]!.onload;
  h.bindings.deepSkyImageIntentRef.current = null; queued?.();
  assert.equal(h.painted(), coarse); assert.equal(h.state, "LOADING", "queued fine decode must not become ready in the render/effect gap");
  h.render({ ...h.bindings, desiredDeepSkyImageLevel: null }); assert.equal(h.painted(), null);
  const request = effectWith("return startDeepSkyImageRequest"), released: string[] = [], states: string[] = [];
  const owners = { deepSkyImageFileRef: { current: null }, canvasDeepSkyImageRef: { current: null },
    deepSkyRecoveryFileRef: { current: null }, storeDeepSkyImageAsset() {}, storeCanvasDeepSkyImage() {} };
  const requested = callbackWith("setDeepSkyImageAsset", owners), decoded = callbackWith("setCanvasDeepSkyImage", owners);
  requested({ ...fine, release() { released.push("fine"); } });
  decoded({ ...coarse, release() { released.push("coarse"); } });
  request({ pageVisible: true, selectedDeepSkyEntry: entry, desiredDeepSkyImageLevel: null, deepSkyImageAsset: fine, deepSkyImageRetry: 0,
    deepSkyImageFailureRef: { current: null }, setDeepSkyImageAsset: requested, setDeepSkyImageState(value: string) { states.push(value); } });
  effectWith("const image = node.createImage()")({ ...h.bindings, desiredDeepSkyImageLevel: null, setCanvasDeepSkyImage: decoded });
  assert.deepEqual(released, ["fine", "coarse"]); assert.deepEqual(states, ["IDLE"]);
  assert.equal(owners.deepSkyImageFileRef.current, null); assert.equal(owners.deepSkyRecoveryFileRef.current, null);
});

test("report entry replacement keeps the same pending selected image demand", () => {
  const render = effectWith("return startDeepSkyImageRequest");
  let requests = 0, cancels = 0;
  const bindings = {
    pageVisible: true, selectedDeepSkyEntry: entry, desiredDeepSkyImageLevel: "DETAIL", deepSkyImageAsset: null, deepSkyImageRetry: 0,
    deepSkyImageFailureRef: { current: null }, setDeepSkyImageAsset() {}, setDeepSkyImageState() {}, recordAcceptanceDiagnostic() {},
    acquireDeepSkyImage() {}, beginDeepSkyImageDemand() {},
    startDeepSkyImageRequest: () => { requests++; return () => { cancels++; }; },
  };
  render(bindings);
  render({ ...bindings, selectedDeepSkyEntry: { ...entry, displayName: "仙女座星系" } });
  assert.equal(requests, 1, "the same reference and level keep their in-flight acquisition");
  assert.equal(cancels, 0);
  render({ ...bindings, selectedDeepSkyEntry: { objectRef: "M:42", displayName: "M42" } });
  assert.equal(requests, 2); assert.equal(cancels, 1, "a different object replaces the old demand");
  render({ ...bindings, selectedDeepSkyEntry: { objectRef: "M:42", displayName: "M42" }, deepSkyImageRetry: 1 });
  assert.equal(requests, 3); assert.equal(cancels, 2, "an explicit retry remains a new demand");
});

test("report entry replacement preserves pending and ready pixels but a new metadata lease still decodes", () => {
  const h = decoder(); h.render(h.bindings);
  const pending = h.images[0]!.onload;
  h.render({ ...h.bindings, selectedDeepSkyEntry: { ...entry } });
  assert.equal(h.images.length, 1, "entry object identity is not an image decode input");
  assert.equal(h.images[0]!.onload, pending, "report refresh cannot cancel the current decode");
  pending?.();
  const ready = h.painted(); assert.equal(h.state, "READY");
  h.render({ ...h.bindings, selectedDeepSkyEntry: { ...entry, displayName: "仙女座星系" } });
  assert.equal(h.images.length, 1); assert.equal(h.painted(), ready); assert.equal(h.state, "READY");
  const nextLease = { ...fine, publicationHash: "new-publication", fieldDegrees: 5, release() {} };
  h.render({ ...h.bindings, selectedDeepSkyEntry: { ...entry }, deepSkyImageAsset: nextLease });
  assert.equal(h.images.length, 2, "the same filename must not merge publication metadata owners");
  assert.equal(h.painted(), ready, "old valid pixels remain until the new lease decodes");
  h.images[1]!.onload?.();
  assert.notEqual(h.painted(), ready);
  assert.equal((h.painted() as typeof nextLease).publicationHash, "new-publication");
  assert.equal((h.painted() as typeof nextLease).fieldDegrees, 5);
});

test("report entry replacement cannot implicitly retry a failed fine decode", () => {
  const h = decoder(); h.render(h.bindings); h.images[0]!.onerror?.();
  h.render({ ...h.bindings, selectedDeepSkyEntry: { ...entry } });
  assert.equal(h.images.length, 1); assert.equal(h.state, "ERROR"); assert.equal(h.painted(), coarse);
  assert.equal(h.bindings.deepSkyImageFailureRef.current, "deep-sky-image:M:31:DETAIL");
  h.render({ ...h.bindings, deepSkyImageAsset: { ...fine, release() {} } });
  assert.equal(h.images.length, 2); assert.equal(h.state, "LOADING");
  h.images[1]!.onload?.(); assert.equal(h.state, "READY");
});

test("hide retires pixels and active recovery demand; show decodes the newly supplied file after the node gap", () => {
  const h = decoder(); h.render(h.bindings);
  const pending = h.images[0]!.onload;
  h.render({ ...h.bindings, pageVisible: false });
  assert.equal(h.painted(), null, "hidden native pixels cannot keep the old Canvas image graph");
  assert.equal(h.bindings.canvasDeepSkyImageRef.current, null);
  assert.equal(h.bindings.deepSkyRecoveryFileRef.current, null);
  pending?.(); assert.equal(h.painted(), null);
  h.bindings.canvasGenerationRef.current = 2;
  h.render({ ...h.bindings, canvasNodeRef: { current: null } });
  assert.equal(h.painted(), null); assert.equal(h.images.length, 1);
  assert.equal(h.bindings.deepSkyRecoveryFileRef.current, null, "show does not recreate an active recovery lease through the node gap");
  h.render({ ...h.bindings, canvasNodeRevision: 2 });
  assert.equal(h.images.length, 2, "only the newly supplied requested file decodes");
  h.images[1]!.onload?.();
  assert.equal((h.painted() as typeof fine).canvasGeneration, 2);
  assert.equal((h.painted() as typeof fine).tempFilePath, fine.tempFilePath);
  assert.notEqual((h.painted() as typeof fine).image, coarse.image);
  assert.equal(h.state, "READY");
});

test("failed fine decode and retry keep the coarse image until successful replacement", () => {
  const h = decoder(); h.render(h.bindings);
  assert.equal(h.painted(), coarse); h.images[0]!.onerror?.();
  assert.equal(h.painted(), coarse); assert.equal(h.state, "ERROR");
  h.render({ ...h.bindings, deepSkyImageAsset: null }); assert.equal(h.painted(), coarse);
  h.render(h.bindings); h.images[1]!.onload?.();
  assert.equal((h.painted() as typeof fine).tempFilePath, fine.tempFilePath); assert.equal(h.state, "READY");
});

test("lease retirement rejects a queued onload and cannot revive pixels in the same Canvas generation", () => {
  const h = decoder(); let live = true;
  const asset = { ...fine, isCurrent: () => live };
  h.render({ ...h.bindings, deepSkyImageAsset: asset });
  const onload = h.images[0]!.onload!; live = false; onload();
  assert.equal(h.painted(), coarse, "the retired fine file cannot replace independent valid coarse pixels");
  h.render({ ...h.bindings, canvasNodeRevision: 2, deepSkyImageAsset: asset });
  assert.equal(h.images.length, 2, "only the independent coarse recovery is decoded");
});

test("hidden decoding cannot publish late pixels or recreate active recovery demand", () => {
  const h = decoder(); h.render(h.bindings); const late = h.images[0]!.onload!;
  h.render({ ...h.bindings, pageVisible: false }); late();
  assert.equal(h.painted(), null);
  assert.equal(h.bindings.deepSkyRecoveryFileRef.current, null);
  h.render(h.bindings); assert.equal(h.images.length, 2);
  h.images[1]!.onload?.();
  assert.equal((h.painted() as typeof fine).tempFilePath, fine.tempFilePath);
});

test("a retained coarse level cannot mark a pending fine request ready", () => {
  const h = decoder(); h.render({ ...h.bindings, deepSkyImageAsset: coarse });
  assert.equal(h.painted(), coarse); assert.equal(h.images.length, 0); assert.equal(h.state, "LOADING");
});

test("show before native canvas reconstruction cannot restore retired recovery pixels", () => {
  const h = decoder(); h.render(h.bindings); h.images[0]!.onerror?.();
  h.render({ ...h.bindings, pageVisible: false, canvasNodeRef: { current: null } });
  h.render({ ...h.bindings, canvasNodeRef: { current: null } });
  assert.equal(h.painted(), null, "the node gap cannot retain the retired native bitmap");
  assert.equal(h.bindings.deepSkyRecoveryFileRef.current, null, "encoded cache reuse does not mean an active coarse lease");
  h.bindings.canvasGenerationRef.current = 2;
  h.render({ ...h.bindings, canvasNodeRevision: 2 });
  assert.equal(h.images[1]!.src, fine.tempFilePath);
  h.images[1]!.onload?.();
  assert.equal((h.painted() as typeof fine).tempFilePath, fine.tempFilePath);
  assert.equal((h.painted() as typeof fine).canvasGeneration, 2);
  assert.equal(h.state, "READY");
});

test("resuming a failed decode starts a new loading transition before success or failure", () => {
  const h = decoder(); h.render(h.bindings); h.images[0]!.onerror?.();
  assert.equal(h.state, "ERROR");
  h.render({ ...h.bindings, pageVisible: false });
  h.render(h.bindings); assert.equal(h.state, "LOADING");
  assert.equal(h.bindings.deepSkyImageFailureRef.current, null);
  h.images[1]!.onerror?.(); assert.equal(h.state, "ERROR");
  assert.equal(h.painted(), null, "hide retired the old coarse bitmap; failure cannot revive it");
});

test("switching object cannot retain the previous object's pixels", () => {
  const h = decoder(); h.render({ ...h.bindings, selectedDeepSkyEntry: { objectRef: "M:42" }, deepSkyImageAsset: null });
  assert.equal(h.painted(), null);
});

test("native generation changes reject queued decode before React cleanup", () => {
  const h = decoder(); h.render(h.bindings);
  h.bindings.canvasGenerationRef.current = 2;
  h.images[0]!.onload?.(); h.images[0]!.onerror?.();
  assert.equal(h.painted(), coarse); assert.equal(h.state, "LOADING");
});

test("synchronous native decoder failures are retryable and coarse failure cannot prevent fine decode", () => {
  const createFailure = decoder();
  createFailure.bindings.canvasNodeRef.current.createImage = () => { throw new Error("native image unavailable"); };
  assert.doesNotThrow(() => createFailure.render(createFailure.bindings));
  assert.equal(createFailure.state, "ERROR"); assert.equal(createFailure.painted(), coarse);

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
  assert.equal(fallbackFailure.state, "READY"); assert.equal((fallbackFailure.painted() as typeof fine).tempFilePath, fine.tempFilePath);
});

test("new native canvas redecodes retained coarse pixels and late coarse cannot replace fine", () => {
  const h = decoder();
  h.bindings.canvasGenerationRef.current = 2;
  h.render({ ...h.bindings, canvasNodeRevision: 2 });
  assert.equal(h.images.length, 2);
  h.images[0]!.onload?.();
  assert.notEqual((h.painted() as typeof coarse).image, coarse.image);
  assert.equal((h.painted() as typeof coarse).canvasGeneration, 2);
  assert.equal((h.painted() as typeof coarse).tempFilePath, coarse.tempFilePath);
  assert.equal(h.state, "LOADING");
  h.images[1]!.onerror?.(); assert.equal(h.state, "ERROR");
  assert.equal((h.painted() as typeof coarse).tempFilePath, coarse.tempFilePath);

  const fineFirst = decoder(); fineFirst.bindings.canvasGenerationRef.current = 2;
  fineFirst.render({ ...fineFirst.bindings, canvasNodeRevision: 2 });
  fineFirst.images[1]!.onload?.(); fineFirst.images[0]!.onload?.();
  assert.equal((fineFirst.painted() as typeof fine).tempFilePath, fine.tempFilePath);
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
    acquireDeepSkyImage() {}, beginDeepSkyImageDemand() {}, startDeepSkyImageRequest: () => () => {}, notify: (value: unknown) => notices.push(value) };
  // Both effects receive the same commit's ERROR closure despite the queued LOADING update.
  renderRequest(bindings); renderNotice(bindings); assert.equal(notices.length, 0);
  failure.current = "deep-sky-image:M:42:DETAIL";
  renderNotice({ ...bindings, desiredDeepSkyImageLevel: null }); assert.equal(notices.length, 0);
});
