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
  let stateIndex = 0, effectIndex = 0, pending: (() => void)[] = [], retries = 0, nextTimer = 0;
  const timers = new Map<number, () => void>();
  let options: any;
  let fetching = false, retryOptions: any;
  let data: any = { imageUrl: "/v2/terrain/assets/tile.png", publicationId: "publication:a", lightPollution: { state: "PARTIAL", cells: [{ id: "independent-light" }] } };
  const fn = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + ";useTerrainOverlay;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    downloaded: new Map(), AbortController,
    useState(value: any) { const index = stateIndex++; if (!(index in states)) states[index] = value;
      return [states[index], (next: any) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useRef(value: any) { const index = stateIndex++; if (!(index in states)) states[index] = { current: value }; return states[index]; },
    useMemo: (compute: () => unknown) => compute(),
    useEffect(effect: () => unknown, deps: any[]) { const index = effectIndex++; const prior = dependencies[index];
      if (!prior || deps.some((value, n) => value !== prior[n])) pending.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      dependencies[index] = deps; },
    useResourceQuery: (value: any) => { options = value; return { data: { data }, isError: false, isPending: false, isFetching: fetching,
      refetch: async (value: unknown) => { retries++; retryOptions = value; return { data }; } }; },
    setTimeout: (callback: () => void) => { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    getTerrainOverlay() {},
    downloadTerrainAsset: (url: string, signal: AbortSignal) => new Promise<string>((resolve, reject) => requests.push({ url, signal, resolve, reject })),
    isMiniappRequestCancelled: (error: Error) => error.message === "cancelled",
  });
  return {
    requests, get retries() { return retries; }, setPublication(id: string) { data = { ...data, publicationId: id }; },
    setFailure() { data = { ...data, imageUrl: null, failureCode: "TERRAIN_READ_FAILED" }; },
    setFetching(value: boolean) { fetching = value; }, get retryOptions() { return retryOptions; },
    freshness() { return options.staleTime({ data }); },
    runTimers() { const scheduled = [...timers.values()]; timers.clear(); scheduled.forEach(callback => callback()); },
    render(enabled = true, imageEnabled = true) { const input = { purpose: "SPOT", center: { latitude: 22, longitude: 114 }, radiusKm: 5 };
      stateIndex = effectIndex = 0; fn(input, enabled, imageEnabled); pending.splice(0).forEach(effect => effect());
      stateIndex = effectIndex = 0; return fn(input, enabled, imageEnabled); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}
const settle = () => new Promise<void>(resolve => setImmediate(resolve));

test("a partial 200 terrain failure stays retryable and retains independent light data", async () => {
  const h = harness(); h.render(); assert.equal(h.freshness(), 24 * 60 * 60 * 1000);
  h.setFailure(); let result = h.render();
  assert.equal(h.freshness(), 0, "a failed body is not a fresh day-long publication");
  assert.equal(result.data.data.lightPollution.cells[0].id, "independent-light");
  h.runTimers(); result = h.render(); h.runTimers();
  assert.equal(h.retries, 1, "persistent failure permits only one automatic recovery per viewport");
  assert.equal(h.retryOptions.cancelRefetch, false, "a concurrent manual recovery must not be cancelled by the timer");
  assert.equal(result.imagePath, null);
  h.unmount();
});

test("hiding a failed viewport cancels its scheduled metadata recovery", () => {
  const h = harness(); h.setFailure(); h.render(); h.render(false); h.runTimers();
  assert.equal(h.retries, 0);
  h.unmount();
});

test("manual recovery beginning before the timer prevents a second automatic request", () => {
  const h = harness(); h.setFailure(); h.render(); h.setFetching(true); h.render(); h.runTimers();
  assert.equal(h.retries, 0);
  h.unmount();
});

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
