import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { facilityPhotos } from "../../utils/spot-media";

function mount() {
  const source = ts.createSourceFile("gallery.tsx", readFileSync(new URL("./use-facility-gallery.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useFacilityGallery")!;
  const hides: (() => void)[] = [], cleanups: (() => void)[] = [], refs: Array<{ current: any }> = [], calls: string[] = [], selected: any[] = [];
  let accept!: (value: boolean) => void, stateIndex = 0;
  const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + ";useFacilityGallery;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    React: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    NativeBackBoundary: "Back", SpotImageViewer: "Viewer", FACILITY_LABEL: { PARKING: "停车" }, facilityPhotos,
    __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: false,
    useState: (initial: unknown) => { const index = stateIndex++; return [initial, (value: unknown) => { if (index === 0) selected.push(value); }]; },
    useRef: (current: unknown) => { const ref = { current }; refs.push(ref); return ref; }, useCallback: (fn: unknown) => fn,
    useEffect: (fn: () => (() => void) | undefined) => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); },
    useDidHide: (fn: () => void) => hides.push(fn), useDidShow() {},
    useSpotMediaDocumentPosition: () => ({ remember: () => calls.push("remember"), record() {} }),
    PHOTO_VIEWER_HANDOFF: { title: "照片可能较亮", detail: "真实颜色" },
    useRedLightHandoff: () => ({ active: false, warning: null, confirm: () => { calls.push("confirm"); return new Promise<boolean>(resolve => { accept = resolve; }); } }),
  });
  const gallery = hook({ identity: "article:A", name: "地点A", enabled: true, formalMedia: { parking: ["parking"] }, media: [{
    id: "parking", localPath: "parking.jpg", thumbnailPath: "parking.jpg", license: "owned", isSiteSpecific: true, state: "FRESH",
  }] });
  selected.length = 0;
  return { gallery, calls, selected, accept: (value: boolean) => accept(value),
    hide: () => hides.forEach(fn => fn()), unmount: () => cleanups.forEach(fn => fn()),
    changePublication: () => { refs.find(ref => typeof ref.current === "string")!.current = "a-new-publication"; } };
}

test("facility photo consent retains the exact reading position and opens only after acceptance", async () => {
  const page = mount(); page.gallery.open("PARKING", "#actual-source");
  assert.deepEqual(page.calls, ["remember", "confirm"]); assert.equal(page.selected.length, 0);
  page.accept(true); await Promise.resolve();
  assert.equal(page.selected.length, 1); assert.equal(page.selected[0].source, "#actual-source");
  const cancelled = mount(); cancelled.gallery.open("PARKING", "#other-source"); cancelled.accept(false); await Promise.resolve();
  assert.equal(cancelled.selected.length, 0);
});

test("a delayed photo confirmation cannot open after publication change or page departure", async () => {
  for (const retire of ["changePublication", "hide", "unmount"] as const) {
    const page = mount(); page.gallery.open("PARKING", "#source"); page[retire](); page.selected.length = 0;
    page.accept(true); await Promise.resolve(); assert.equal(page.selected.length, 0, retire);
  }
});
