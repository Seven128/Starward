import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { DISPLAY_RASTER_GRID, displayRasterWindowBounds, displayRasterWindowForBounds } from "@starward/coordinate-system";
import { createRasterImageResources } from "../services/raster-image-resources.ts";
import { normalizeTerrainOverlayRequest, terrainOverlayRequestIdentity } from "../services/terrain-overlay-request.ts";
import { terrainCoverageForRequest, terrainRequestForCoverage } from "./terrain-overlay-coverage.ts";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";

function harness(liveMetadata = false) {
  const ast = ts.createSourceFile("hook.ts", readFileSync(process.env.TERRAIN_OVERLAY_TEST_SOURCE ?? new URL("./use-terrain-overlay.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useTerrainOverlay")!;
  const imageAst = ts.createSourceFile("image.ts", readFileSync(new URL("./use-raster-image.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const imageDeclaration = imageAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useRasterImage")!;
  const states: any[] = [], dependencies: any[][] = [], cleanups: any[] = [];
  const requests: { url: string; signal: AbortSignal; resolve(value: string): void; reject(error: Error): void }[] = [];
  const resources = createRasterImageResources({
    download: (input, signal) => new Promise<string>((resolve, reject) => requests.push({ url: input.url, signal, resolve, reject }))
      .then(path => ({ path, bytes: 1 })),
    remove: async () => undefined,
  }, { maximumFiles: 8, maximumBytes: 16, maximumConcurrent: 2 });
  let stateIndex = 0, effectIndex = 0, pending: (() => void)[] = [], retries = 0, nextTimer = 0;
  const timers = new Map<number, () => void>();
  let options: any, requestedInput: TerrainOverlayRequest | undefined;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  let observer: QueryObserver<any> | undefined, unsubscribe: (() => void) | undefined;
  const metadataRequests: { input: TerrainOverlayRequest; signal: AbortSignal; resolve(value: any): void }[] = [];
  let fetching = false, retryOptions: any;
  let data: any = { imageUrl: "/v2/terrain/assets/tile.png", publicationId: "publication:a", lightPollution: { state: "PARTIAL", cells: [{ id: "independent-light" }] } };
  const fn = vm.runInNewContext(ts.transpileModule(imageDeclaration.getText(imageAst).replace(/^export /, "") + "\n" + declaration.getText(ast).replace(/^export /, "") + ";useTerrainOverlay;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    mapRasterFiles: resources, AbortController, terrainCoverageForRequest, terrainRequestForCoverage,
    normalizeTerrainOverlayRequest, terrainOverlayRequestIdentity,
    useState(value: any) { const index = stateIndex++; if (!(index in states)) states[index] = value;
      return [states[index], (next: any) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useRef(value: any) { const index = stateIndex++; if (!(index in states)) states[index] = { current: value }; return states[index]; },
    useMemo: (compute: () => unknown) => compute(),
    useEffect(effect: () => unknown, deps: any[]) { const index = effectIndex++; const prior = dependencies[index];
      if (!prior || deps.some((value, n) => value !== prior[n])) pending.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      dependencies[index] = deps; },
    useResourceQuery: (value: any) => {
      options = value;
      if (liveMetadata) {
        const queryOptions = { ...value, queryFn: ({ signal }: { signal: AbortSignal }) => value.queryFn(signal),
          staleTime: (query: any) => value.staleTime(query.state.data) };
        if (!observer) { observer = new QueryObserver(client, queryOptions); unsubscribe = observer.subscribe(() => undefined); }
        else observer.setOptions(queryOptions);
        return { ...observer.getCurrentResult(), refetch: () => observer!.refetch() };
      }
      // The controlled response still belongs to the request the real hook
      // issues; image/recovery tests inject native I/O independently below.
      void value.queryFn();
      return { data: { data, request: requestedInput }, isError: false, isPending: false, isFetching: fetching,
        refetch: async (value: unknown) => { retries++; retryOptions = value; return { data }; } };
    },
    setTimeout: (callback: () => void) => { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    getTerrainOverlay(input: TerrainOverlayRequest, signal: AbortSignal) {
      requestedInput = input;
      return liveMetadata ? new Promise(resolve => metadataRequests.push({ input, signal, resolve })) : Promise.resolve({ data });
    },
    isMiniappRequestCancelled: (error: Error) => error.message === "cancelled",
  });
  return {
    requests, metadataRequests, get retries() { return retries; }, setPublication(id: string) { data = { ...data, publicationId: id }; },
    setFailure() { data = { ...data, imageUrl: null, failureCode: "TERRAIN_READ_FAILED" }; },
    setFetching(value: boolean) { fetching = value; }, get retryOptions() { return retryOptions; },
    setData(value: any) { data = value; },
    get queryKey() { return options.queryKey.join(":"); },
    queryInput() { options.queryFn(); return requestedInput; },
    freshness() { return options.staleTime({ data }); },
    runTimers() { const scheduled = [...timers.values()]; timers.clear(); scheduled.forEach(callback => callback()); },
    render(enabled = true, imageEnabled = true, input: TerrainOverlayRequest = {
      purpose: "SPOT", center: { system: "GCJ02", latitude: 22, longitude: 114 }, radiusKm: 5 }) {
      stateIndex = effectIndex = 0; fn(input, enabled, imageEnabled); pending.splice(0).forEach(effect => effect());
      stateIndex = effectIndex = 0; return fn(input, enabled, imageEnabled); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); unsubscribe?.(); client.clear(); void resources.close(); },
  };
}
const settle = () => new Promise<void>(resolve => setImmediate(resolve));

const workingBounds = displayRasterWindowBounds({ grid: DISPLAY_RASTER_GRID, zoom: 10, x: 836, y: 425,
  columns: 3, rows: 3, tilePixels: 256 });
function viewport(inset = .2, shift = 0): TerrainOverlayRequest {
  const width = workingBounds.east - workingBounds.west, height = workingBounds.north - workingBounds.south;
  const viewportBounds = { west: workingBounds.west + width * (inset + shift), east: workingBounds.east - width * (inset - shift),
    south: workingBounds.south + height * inset, north: workingBounds.north - height * inset };
  return { purpose: "MAP", viewportBounds, center: { system: "GCJ02", latitude: (viewportBounds.north + viewportBounds.south) / 2,
    longitude: (viewportBounds.east + viewportBounds.west) / 2 } };
}
const publication = (input: TerrainOverlayRequest, id: string) => ({ data: { purpose: "MAP", state: "AVAILABLE",
  publicationId: id, imageUrl: `/v2/terrain/assets/${id}.png`,
  imageBoundsGcj02: displayRasterWindowBounds(displayRasterWindowForBounds(normalizeTerrainOverlayRequest(input).viewportBounds!)),
  lightPollution: {} } });

test("same-window movement keeps one real pending metadata read, and cache coverage retains the actual issued rectangle", async () => {
  const h = harness(true), first = viewport(), jitter = viewport(.2, .02);
  try {
    h.render(true, false, first); await settle();
    const key = h.queryKey;
    h.render(true, false, jitter); await settle();
    assert.equal(h.queryKey, key);
    assert.equal(h.metadataRequests.length, 1, "a tiny move cannot cancel and restart the same product");
    assert.equal(h.metadataRequests[0]!.signal.aborted, false);
    h.metadataRequests[0]!.resolve(publication(first, "first")); await settle();
    const result = h.render(true, false, jitter);
    assert.deepEqual(result.data.request, normalizeTerrainOverlayRequest(first));
    assert.notDeepEqual(result.data.request.viewportBounds, jitter.viewportBounds,
      "the late response keeps its original queried rectangle instead of claiming the latest camera request");
    assert.equal(h.metadataRequests.length, 1);
  } finally { h.unmount(); }
});

test("crossing coverage rejects an old late response, while finer demand starts its own fixed level", async () => {
  const h = harness(true), first = viewport(), crossed = viewport(.2, .5), fine = viewport(.36, .5);
  try {
    h.render(true, false, first); await settle();
    const firstKey = h.queryKey;
    h.render(true, false, crossed); await settle();
    assert.notEqual(h.queryKey, firstKey); assert.equal(h.metadataRequests.length, 2);
    assert.equal(h.metadataRequests[0]!.signal.aborted, true);
    h.metadataRequests[1]!.resolve(publication(crossed, "crossed")); await settle();
    const current = h.render(true, false, crossed);
    assert.equal(current.data.data.publicationId, "crossed");
    h.metadataRequests[0]!.resolve(publication(first, "old-late")); await settle();
    assert.equal(h.render(true, false, crossed).data.data.publicationId, "crossed");
    const crossedKey = h.queryKey;
    h.render(true, false, fine); await settle();
    assert.notEqual(h.queryKey, crossedKey); assert.equal(h.metadataRequests.length, 3,
      "the covering coarse image cannot suppress a genuinely finer view");
  } finally { h.unmount(); }
  assert.equal(h.metadataRequests[2]!.signal.aborted, true, "unmount retires the last pending read");
});

test("returning to a still-fresh fixed window reuses its cached response with the original request", async () => {
  const h = harness(true), first = viewport(), crossed = viewport(.2, .5), revisit = viewport(.2, .02);
  try {
    h.render(true, false, first); await settle();
    h.metadataRequests[0]!.resolve(publication(first, "first")); await settle();
    h.render(true, false, first);
    h.render(true, false, crossed); await settle();
    h.metadataRequests[1]!.resolve(publication(crossed, "crossed")); await settle();
    h.render(true, false, crossed);
    const returned = h.render(true, false, revisit); await settle();
    assert.equal(returned.data.data.publicationId, "first");
    assert.equal(h.metadataRequests.length, 2, "a different centre inside the earlier window is still the same cached product");
    assert.deepEqual(returned.data.request, normalizeTerrainOverlayRequest(first));
  } finally { h.unmount(); }
});

test("Map movement within an accepted image keeps the real query key and original request until coverage is left", () => {
  const h = harness();
  const input: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02", latitude: 22, longitude: 114 },
    viewportBounds: { west: 113.99, east: 114.01, south: 21.99, north: 22.01 } };
  h.setData({ purpose: "MAP", state: "AVAILABLE", imageUrl: "/v2/terrain/assets/current.png", publicationId: "current",
    imageBoundsGcj02: { west: 113.97, east: 114.03, south: 21.97, north: 22.03 }, lightPollution: {} });
  h.render(true, false, input); const key = h.queryKey;
  const moved: TerrainOverlayRequest = { ...input, center: { ...input.center, longitude: 114.005 },
    viewportBounds: { ...input.viewportBounds, west: 113.995, east: 114.015 } };
  h.render(true, false, moved);
  assert.equal(h.queryKey, key);
  assert.deepEqual(h.queryInput(), input);
  const uncovered: TerrainOverlayRequest = { ...moved, center: { ...moved.center, longitude: 114.03 },
    viewportBounds: { ...moved.viewportBounds, west: 114.02, east: 114.04 } };
  h.render(true, false, uncovered);
  assert.notEqual(h.queryKey, key); assert.deepEqual(h.queryInput(), uncovered);
  h.unmount();
});

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
  const h = harness(); h.render(); await settle(); h.requests[0]!.reject(new Error("offline")); await settle();
  let result = h.render(); assert.ok(result.imageError); assert.equal(result.imagePath, null);
  await result.refetch(); result = h.render(); await settle();
  assert.equal(h.retries, 1); assert.equal(h.requests.length, 2);
  assert.equal(result.imagePending, true);
  h.requests[1]!.resolve("/local/recovered.png"); await settle();
  result = h.render(); assert.equal(result.imagePath, "/local/recovered.png"); assert.equal(result.imageError, null);
  h.unmount();
});

test("publication changes invalidate the same URL; cancelled late downloads cannot replace the current result", async () => {
  const h = harness(); h.render(); await settle(); h.setPublication("publication:b"); h.render(); await settle();
  assert.equal(h.requests[0]!.signal.aborted, true);
  h.requests[1]!.resolve("/local/new.png"); await settle();
  h.requests[0]!.resolve("/local/old.png"); await settle();
  assert.equal(h.render().imagePath, "/local/new.png");
  h.setPublication("publication:c"); const result = h.render(); await settle();
  assert.equal(h.requests.length, 3); assert.equal(result.imagePath, null);
  h.unmount(); assert.equal(h.requests[2]!.signal.aborted, true);
});

test("light-only and hidden consumers do not download or expose terrain images", async () => {
  const h = harness(); assert.equal(h.render(true, false).imagePending, false); assert.equal(h.requests.length, 0);
  h.render(); await settle(); assert.equal(h.requests.length, 1);
  const hidden = h.render(false); assert.equal(h.requests[0]!.signal.aborted, true);
  h.requests[0]!.resolve("/local/late.png"); await settle();
  assert.equal(hidden.imagePath, null); assert.equal(h.render(false).imagePath, null);
  h.unmount();
});

test("a decoded image failure evicts the matching local path and a retry downloads it again", async () => {
  const h = harness(); h.render();
  await settle();
  h.requests[0]!.resolve("/local/decoded-bad.png"); await settle();
  let result = h.render(); assert.equal(result.imagePath, "/local/decoded-bad.png");
  result.reportImageFailure(new Error("decode failed"), "/local/decoded-bad.png");
  result = h.render(); assert.equal(result.imagePath, null); assert.ok(result.imageError);
  await result.refetch(); result = h.render(); await settle();
  assert.equal(h.requests.length, 2); assert.equal(result.imagePending, true);
  h.requests[1]!.resolve("/local/decoded-good.png"); await settle();
  result = h.render(); assert.equal(result.imagePath, "/local/decoded-good.png"); assert.equal(result.imageError, null);
  h.unmount();
});

test("a late failure from an old publication cannot evict the current decoded image", async () => {
  const h = harness(); h.render();
  await settle();
  h.requests[0]!.resolve("/local/old.png"); await settle();
  h.setPublication("publication:b"); h.render(); await settle();
  h.requests[1]!.resolve("/local/current.png"); await settle();
  let result = h.render(); assert.equal(result.imagePath, "/local/current.png");
  result.reportImageFailure(new Error("late old failure"), "/local/old.png");
  result = h.render(); assert.equal(result.imagePath, "/local/current.png"); assert.equal(result.imageError, null);
  h.unmount();
});
