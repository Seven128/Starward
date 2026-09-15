import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function harness() {
  const ast = ts.createSourceFile("hook.ts", readFileSync(new URL("./use-terrain-overlay.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useTerrainOverlay")!;
  const states: any[] = [], dependencies: any[][] = [], cleanups: any[] = [];
  const requests: { url: string; signal: AbortSignal; resolve(value: string): void; reject(error: Error): void }[] = [];
  let stateIndex = 0, effectIndex = 0, pending: (() => void)[] = [], retries = 0;
  let data = { imageUrl: "/v2/terrain/assets/tile.png", publicationId: "publication:a" };
  const fn = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + ";useTerrainOverlay;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    downloaded: new Map(), AbortController,
    useState(value: any) { const index = stateIndex++; if (!(index in states)) states[index] = value;
      return [states[index], (next: any) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useMemo: (compute: () => unknown) => compute(),
    useEffect(effect: () => unknown, deps: any[]) { const index = effectIndex++; const prior = dependencies[index];
      if (!prior || deps.some((value, n) => value !== prior[n])) pending.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      dependencies[index] = deps; },
    useResourceQuery: () => ({ data: { data }, isError: false, isPending: false, refetch: async () => { retries++; return { data }; } }),
    getTerrainOverlay() {},
    downloadTerrainAsset: (url: string, signal: AbortSignal) => new Promise<string>((resolve, reject) => requests.push({ url, signal, resolve, reject })),
    isMiniappRequestCancelled: (error: Error) => error.message === "cancelled",
  });
  return {
    requests, get retries() { return retries; }, setPublication(id: string) { data = { ...data, publicationId: id }; },
    render(enabled = true, imageEnabled = true) { const input = { purpose: "SPOT", center: { latitude: 22, longitude: 114 }, radiusKm: 5 };
      stateIndex = effectIndex = 0; fn(input, enabled, imageEnabled); pending.splice(0).forEach(effect => effect());
      stateIndex = effectIndex = 0; return fn(input, enabled, imageEnabled); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}
const settle = () => new Promise<void>(resolve => setImmediate(resolve));

test("retry redownloads a failed terrain image when the metadata URL has not changed", async () => {
  const h = harness(); h.render(); h.requests[0]!.reject(new Error("offline")); await settle();
  let result = h.render(); assert.ok(result.imageError); assert.equal(result.imagePath, null);
  await result.refetch(); result = h.render();
  assert.equal(h.retries, 1); assert.equal(h.requests.length, 2);
  assert.equal(result.imagePending, true);
  h.requests[1]!.resolve("/local/recovered.png"); await settle();
  result = h.render(); assert.equal(result.imagePath, "/local/recovered.png"); assert.equal(result.imageError, null);
  h.unmount();
});

test("publication changes invalidate the same URL; cancelled late downloads cannot replace the current result", async () => {
  const h = harness(); h.render(); h.setPublication("publication:b"); h.render();
  assert.equal(h.requests[0]!.signal.aborted, true);
  h.requests[1]!.resolve("/local/new.png"); await settle();
  h.requests[0]!.resolve("/local/old.png"); await settle();
  assert.equal(h.render().imagePath, "/local/new.png");
  h.setPublication("publication:c"); const result = h.render();
  assert.equal(h.requests.length, 3); assert.equal(result.imagePath, null);
  h.unmount(); assert.equal(h.requests[2]!.signal.aborted, true);
});

test("light-only and hidden consumers do not download or expose terrain images", async () => {
  const h = harness(); assert.equal(h.render(true, false).imagePending, false); assert.equal(h.requests.length, 0);
  h.render(); assert.equal(h.requests.length, 1);
  const hidden = h.render(false); assert.equal(h.requests[0]!.signal.aborted, true);
  h.requests[0]!.resolve("/local/late.png"); await settle();
  assert.equal(hidden.imagePath, null); assert.equal(h.render(false).imagePath, null);
  h.unmount();
});

test("a decoded image failure evicts the matching local path and a retry downloads it again", async () => {
  const h = harness(); h.render();
  h.requests[0]!.resolve("/local/decoded-bad.png"); await settle();
  let result = h.render(); assert.equal(result.imagePath, "/local/decoded-bad.png");
  result.reportImageFailure(new Error("decode failed"), "/local/decoded-bad.png");
  result = h.render(); assert.equal(result.imagePath, null); assert.ok(result.imageError);
  await result.refetch(); result = h.render();
  assert.equal(h.requests.length, 2); assert.equal(result.imagePending, true);
  h.requests[1]!.resolve("/local/decoded-good.png"); await settle();
  result = h.render(); assert.equal(result.imagePath, "/local/decoded-good.png"); assert.equal(result.imageError, null);
  h.unmount();
});

test("a late failure from an old publication cannot evict the current decoded image", async () => {
  const h = harness(); h.render();
  h.requests[0]!.resolve("/local/old.png"); await settle();
  h.setPublication("publication:b"); h.render();
  h.requests[1]!.resolve("/local/current.png"); await settle();
  let result = h.render(); assert.equal(result.imagePath, "/local/current.png");
  result.reportImageFailure(new Error("late old failure"), "/local/old.png");
  result = h.render(); assert.equal(result.imagePath, "/local/current.png"); assert.equal(result.imageError, null);
  h.unmount();
});
