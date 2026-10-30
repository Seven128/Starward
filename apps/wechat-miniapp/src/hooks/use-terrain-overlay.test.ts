import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { DISPLAY_RASTER_GRID, displayRasterWindowBounds, displayRasterWindowForBounds } from "@starward/coordinate-system";
import { createRasterImageResources, type RasterImageDescriptor } from "../services/raster-image-resources.ts";
import { normalizeTerrainOverlayRequest, terrainOverlayRequestIdentity, terrainOverlayRequestWindow } from "../services/terrain-overlay-request.ts";
import { terrainCoverageForRequest, terrainPreviewForRequest, terrainRequestForCoverage } from "./terrain-overlay-coverage.ts";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { rasterImageDiagnostic } from "../services/raster-image-diagnostic";

function harness(liveMetadata = false) {
  const ast = ts.createSourceFile("hook.ts", readFileSync(process.env.TERRAIN_OVERLAY_TEST_SOURCE ?? new URL("./use-terrain-overlay.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = ast.statements.filter(node => ts.isFunctionDeclaration(node))
    .map(node => node.getText(ast).replace(/^export /, "")).join("\n");
  const imageAst = ts.createSourceFile("image.ts", readFileSync(new URL("./use-raster-image.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const imageDeclaration = imageAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "useRasterImage")!;
  const states: any[] = [], dependencies: any[][] = [], cleanups: any[] = [];
  const requests: { input: RasterImageDescriptor; url: string; signal: AbortSignal; resolve(value: string): void; reject(error: Error): void }[] = [];
  const diagnostics: unknown[][] = [];
  const resources = createRasterImageResources({
    download: (input, signal) => new Promise<string>((resolve, reject) => requests.push({ input, url: input.url, signal, resolve, reject }))
      .then(path => ({ path, bytes: 1 })),
    remove: async () => undefined,
  }, { maximumFiles: 8, maximumBytes: 16, maximumConcurrent: 2 });
  let stateIndex = 0, effectIndex = 0, queryIndex = 0, pending: (() => void)[] = [], retries = 0, nextTimer = 0;
  const timers = new Map<number, () => void>();
  let options: any, requestedInput: TerrainOverlayRequest | undefined;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const observers: QueryObserver<any>[] = [], unsubscribes: (() => void)[] = [];
  type MetadataRequest = { input: TerrainOverlayRequest; signal: AbortSignal; resolve(value: any): void; reject(error: Error): void };
  const metadataRequests: MetadataRequest[] = [], previewRequests: MetadataRequest[] = [];
  let fetching = false, retryOptions: any;
  let data: any = { imageUrl: "/v2/terrain/assets/tile.png", publicationId: "publication:a", lightPollution: { state: "PARTIAL", cells: [{ id: "independent-light" }] } };
  const fn = vm.runInNewContext(ts.transpileModule(imageDeclaration.getText(imageAst).replace(/^export /, "") + "\n" + declarations + ";useTerrainOverlay;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    mapRasterFiles: resources, AbortController, terrainCoverageForRequest, terrainPreviewForRequest, terrainRequestForCoverage,
    rasterImageDiagnostic, reportRuntimeError: (...args: unknown[]) => diagnostics.push(args),
    normalizeTerrainOverlayRequest, terrainOverlayRequestIdentity, terrainOverlayRequestWindow,
    useState(value: any) { const index = stateIndex++; if (!(index in states)) states[index] = value;
      return [states[index], (next: any) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useRef(value: any) { const index = stateIndex++; if (!(index in states)) states[index] = { current: value }; return states[index]; },
    useMemo: (compute: () => unknown) => compute(),
    useEffect(effect: () => unknown, deps: any[]) { const index = effectIndex++; const prior = dependencies[index];
      if (!prior || deps.some((value, n) => value !== prior[n])) pending.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      dependencies[index] = deps; },
    useResourceQuery: (value: any) => {
      const index = queryIndex++, isFine = value.queryKey[0] === "terrain-overlay";
      if (isFine) options = value;
      if (liveMetadata) {
        const queryOptions = { ...value, queryFn: ({ signal }: { signal: AbortSignal }) => value.queryFn(signal),
          staleTime: typeof value.staleTime === "function" ? (query: any) => value.staleTime(query.state.data) : value.staleTime };
        if (!observers[index]) {
          observers[index] = new QueryObserver(client, queryOptions);
          unsubscribes[index] = observers[index]!.subscribe(() => undefined);
        } else observers[index]!.setOptions(queryOptions);
        const result = observers[index]!.getCurrentResult();
        return { ...result, ...(result.data ? { error: null, isError: false, refreshError: result.error ?? undefined } : {}),
          refetch: () => observers[index]!.refetch() };
      }
      if (!isFine) return { data: undefined, isError: false, isPending: true, isFetching: false };
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
      return liveMetadata ? new Promise((resolve, reject) => metadataRequests.push({ input, signal, resolve, reject })) : Promise.resolve({ data });
    },
    getTerrainOverlayPreview: (input: TerrainOverlayRequest, signal: AbortSignal) =>
      new Promise((resolve, reject) => previewRequests.push({ input, signal, resolve, reject })),
    isMiniappRequestCancelled: (error: Error) => error.message === "cancelled",
  });
  return {
    requests, resources, metadataRequests, previewRequests, diagnostics, get retries() { return retries; }, setPublication(id: string) { data = { ...data, publicationId: id }; },
    setFailure() { data = { ...data, imageUrl: null, failureCode: "TERRAIN_READ_FAILED" }; },
    setFetching(value: boolean) { fetching = value; }, get retryOptions() { return retryOptions; },
    setData(value: any) { data = value; },
    get queryKey() { return options.queryKey.join(":"); },
    queryInput() { options.queryFn(); return requestedInput; },
    freshness() { return options.staleTime({ data }); },
    runTimers() { const scheduled = [...timers.values()]; timers.clear(); scheduled.forEach(callback => callback()); },
    render(enabled = true, imageEnabled = true, input: TerrainOverlayRequest = {
      purpose: "SPOT", center: { system: "GCJ02", latitude: 22, longitude: 114 }, radiusKm: 5 }, allowPreview: boolean | ((identity: string) => boolean) = true) {
      stateIndex = effectIndex = queryIndex = 0; fn(input, enabled, imageEnabled, allowPreview); pending.splice(0).forEach(effect => effect());
      stateIndex = effectIndex = queryIndex = 0; return fn(input, enabled, imageEnabled, allowPreview); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); unsubscribes.forEach(unsubscribe => unsubscribe()); client.clear(); void resources.close(); },
  };
}
const settle = () => new Promise<void>(resolve => setImmediate(resolve));

test("closing terrain retires pending metadata and images; a late reply cannot restore the closed layer", async () => {
  const h = harness(true);
  try {
    const input = viewport();
    h.render(true, true, input);
    const first = h.metadataRequests[0]!;
    assert.equal(first.signal.aborted, false);
    const off = h.render(false, false, input);
    assert.equal(first.signal.aborted, true);
    assert.equal(off.candidate, null);
    first.resolve(publication(input, "late-closed")); await settle();
    assert.equal(h.render(false, false, input).candidate, null);
    assert.equal(h.requests.length, 0, "closed metadata must not start an image download");
    h.render(true, true, input);
    assert.equal(h.metadataRequests.length, 2, "reopening retains a usable real demand");
    assert.equal(h.metadataRequests[1]!.signal.aborted, false);
  } finally { h.unmount(); }
});

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
const previewPublication = (input: TerrainOverlayRequest, id = "parent") => {
  const result = publication(input, id), fine = terrainOverlayRequestWindow(input)!;
  return { data: { ...result.data, preview: { requestedZoom: fine.zoom, imageZoom: fine.zoom - 1 } } };
};

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

test("a ready parent supplies initial imagery while the independent fine read and download continue", async () => {
  const h = harness(true), input = viewport();
  try {
    h.render(true, true, input); await settle();
    assert.equal(h.metadataRequests.length, 1); assert.equal(h.previewRequests.length, 1);
    h.previewRequests[0]!.resolve(previewPublication(input)); await settle();
    let result = h.render(true, true, input); await settle();
    assert.equal(h.requests[0]!.url, "/v2/terrain/assets/parent.png");
    h.requests[0]!.resolve("/local/parent.png"); await settle();
    result = h.render(true, true, input);
    assert.equal(result.candidate.imagePath, "/local/parent.png");
    assert.ok(result.candidate.data.preview); assert.equal(result.data, undefined); assert.equal(result.isPending, true);
    assert.equal(result.imagePath, null, "the fine image contract does not silently become a parent");
    h.metadataRequests[0]!.resolve(publication(input, "fine")); await settle();
    result = h.render(true, true, input); await settle();
    assert.equal(result.candidate.imagePath, "/local/parent.png", "fine metadata alone does not withdraw usable imagery");
    assert.equal(h.requests[1]!.url, "/v2/terrain/assets/fine.png");
    h.requests[1]!.resolve("/local/fine.png"); await settle();
    result = h.render(true, true, input);
    assert.equal(result.candidate.imagePath, "/local/fine.png"); assert.equal(result.candidate.data.preview, undefined);
    assert.equal(result.data.data.publicationId, "fine"); assert.equal(h.metadataRequests.length, 1);
  } finally { h.unmount(); }
});

test("fine imagery arriving first retires a pending preview and ignores its late response", async () => {
  const h = harness(true), input = viewport();
  try {
    h.render(true, true, input); await settle();
    h.metadataRequests[0]!.resolve(publication(input, "fine")); await settle();
    h.render(true, true, input); await settle();
    h.requests[0]!.resolve("/local/fine.png"); await settle();
    assert.equal(h.render(true, true, input).candidate.imagePath, "/local/fine.png");
    assert.equal(h.previewRequests[0]!.signal.aborted, true);
    h.previewRequests[0]!.resolve(previewPublication(input, "late-parent")); await settle();
    assert.equal(h.render(true, true, input).candidate.imagePath, "/local/fine.png");
    assert.equal(h.requests.length, 1, "a late parent cannot allocate another image or lower the displayed detail");
  } finally { h.unmount(); }
});

test("same-window preview shares its request, while viewport changes and hiding cancel only its own readers", async () => {
  const h = harness(true), input = viewport(), jitter = viewport(.2, .02), crossed = viewport(.2, .5);
  try {
    h.render(true, true, input); await settle();
    h.render(true, true, jitter); await settle();
    assert.equal(h.previewRequests.length, 1);
    h.previewRequests[0]!.resolve(previewPublication(input)); await settle();
    h.render(true, true, jitter); await settle();
    assert.equal(h.requests.length, 1);
    h.render(true, true, crossed); await settle();
    assert.equal(h.requests[0]!.signal.aborted, true, "the old viewport's parent download is released");
    assert.equal(h.previewRequests.length, 2);
    h.requests[0]!.resolve("/local/old-parent.png"); await settle();
    assert.equal(h.render(true, true, crossed).candidate, null);
    h.render(false, false, crossed); await settle();
    assert.equal(h.previewRequests[1]!.signal.aborted, true, "hide unsubscribes from the optional metadata read");
    h.previewRequests[1]!.resolve(previewPublication(crossed, "hidden-parent")); await settle();
    assert.equal(h.render(false, false, crossed).candidate, null);
    assert.equal(h.requests.length, 1);
  } finally { h.unmount(); }
});

test("a missing parent or an older server's preview failure leaves the normal fine result intact", async () => {
  for (const missing of [true, false]) {
    const h = harness(true), input = viewport();
    try {
      h.render(true, true, input); await settle();
      if (missing) h.previewRequests[0]!.resolve({ data: { ...publication(input, "none").data, state: "UNAVAILABLE", imageUrl: null } });
      else h.previewRequests[0]!.reject(new Error("HTTP 404"));
      await settle();
      let result = h.render(true, true, input);
      assert.equal(result.isError, false); assert.equal(result.candidate, null); assert.equal(h.requests.length, 0);
      h.metadataRequests[0]!.resolve(publication(input, "fine")); await settle();
      h.render(true, true, input); await settle();
      h.requests[0]!.resolve("/local/fine.png"); await settle();
      result = h.render(true, true, input);
      assert.equal(result.candidate.imagePath, "/local/fine.png"); assert.equal(result.isError, false);
      assert.equal(h.metadataRequests.length, 1); assert.equal(h.previewRequests.length, 1);
    } finally { h.unmount(); }
  }
});

test("a fine failure preserves the ready parent and its actual bounds without relabeling it as completed", async () => {
  const h = harness(true), input = viewport();
  try {
    h.render(true, true, input); await settle();
    const parent = previewPublication(input);
    h.previewRequests[0]!.resolve(parent); await settle();
    h.render(true, true, input); await settle();
    h.requests[0]!.resolve("/local/parent.png"); await settle();
    h.render(true, true, input);
    h.metadataRequests[0]!.reject(new Error("fine offline")); await settle();
    const result = h.render(true, true, input);
    assert.equal(result.isError, true); assert.equal(result.data, undefined);
    assert.equal(result.candidate.imagePath, "/local/parent.png");
    assert.deepEqual(result.candidate.data.imageBoundsGcj02, parent.data.imageBoundsGcj02);
    assert.ok(result.candidate.data.preview);
  } finally { h.unmount(); }
});

test("retrying an old image failure joins another reader's valid replacement download", async () => {
  const h = harness();
  let replacement: ReturnType<typeof h.resources.acquire> | undefined;
  try {
    h.render(); await settle();
    h.requests[0]!.reject(new Error("offline")); await settle();
    const failed = h.render(); assert.ok(failed.imageError);
    replacement = h.resources.acquire(h.requests[0]!.input);
    const recovered = replacement.promise.catch(error => { throw error; });
    // Always observe the promise, including cleanup after a failed assertion.
    void recovered.catch(() => undefined);
    await settle(); assert.equal(h.requests.length, 2);
    failed.retryImage(); h.render(); await settle();
    assert.equal(h.requests.length, 2, "retry must not retire an independent pending file and start a third transfer");
    h.requests[1]!.resolve("/local/recovered.png"); await recovered; await settle();
    const current = h.render();
    assert.equal(current.imagePath, "/local/recovered.png");
    assert.equal(current.imageError, null);
    assert.equal(h.resources.snapshot().activeReaders, 2);
  } finally { replacement?.release(); h.unmount(); }
});

test("a native failure of the parent retries that image without changing the pending fine read", async () => {
  const h = harness(true), input = viewport();
  try {
    h.render(true, true, input); await settle();
    h.previewRequests[0]!.resolve(previewPublication(input)); await settle();
    h.render(true, true, input); await settle();
    h.requests[0]!.resolve("/local/bad-parent.png"); await settle();
    let result = h.render(true, true, input);
    result.reportRasterImageFailure(new Error("parent decode failed"), "/local/bad-parent.png");
    result = h.render(true, true, input);
    assert.equal(result.candidate, null); assert.equal(result.imageError, null); assert.equal(result.isPending, true);
    result.retryImage(); h.render(true, true, input); await settle();
    assert.equal(h.requests.length, 2); assert.equal(h.requests[1]!.url, "/v2/terrain/assets/parent.png");
    h.requests[1]!.resolve("/local/recovered-parent.png"); await settle();
    result = h.render(true, true, input);
    assert.equal(result.candidate.imagePath, "/local/recovered-parent.png");
    assert.equal(h.metadataRequests.length, 1); assert.equal(h.metadataRequests[0]!.signal.aborted, false);
  } finally { h.unmount(); }
});

test("a fresh layer-sheet result, a retained native target, and Spot consumers do not request a parent", async () => {
  const h = harness(true), input = viewport();
  try {
    h.render(true, false, input); await settle();
    h.metadataRequests[0]!.resolve(publication(input, "prefetched")); await settle();
    h.render(true, false, input); h.render(true, true, input); await settle();
    assert.equal(h.previewRequests.length, 0); assert.equal(h.requests.length, 1);
    h.render(true, true, viewport(.2, .5), false); await settle();
    assert.equal(h.previewRequests.length, 0, "the existing native target stays until the new fine image is ready");
    h.render(); await settle();
    assert.equal(h.previewRequests.length, 0, "Spot preserves its point/radius path");
  } finally { h.unmount(); }
});

test("live installation admission can enable a cross-coverage parent and revoke it without restarting the fine read", async () => {
  const h = harness(true), input = viewport();
  let allowed = false;
  const admission = (identity: string) => { assert.equal(identity, terrainOverlayRequestIdentity(input)); return allowed; };
  try {
    h.render(true, true, input, admission); await settle();
    assert.equal(h.metadataRequests.length, 1); assert.equal(h.previewRequests.length, 0);
    allowed = true; h.render(true, true, input, admission); await settle();
    assert.equal(h.previewRequests.length, 1, "an actual native ack may qualify the existing viewport's optional read");
    h.previewRequests[0]!.resolve(previewPublication(input)); await settle();
    h.render(true, true, input, admission); await settle();
    assert.equal(h.requests.length, 1);
    allowed = false; h.render(true, true, input, admission); await settle();
    assert.equal(h.requests[0]!.signal.aborted, true, "returning inside valid native coverage retires the optional file reader");
    h.requests[0]!.resolve("/local/late-parent.png"); await settle();
    assert.equal(h.render(true, true, input, admission).candidate, null);
    assert.equal(h.metadataRequests.length, 1); assert.equal(h.metadataRequests[0]!.signal.aborted, false);
    h.metadataRequests[0]!.resolve(publication(input, "fine")); await settle();
    h.render(true, true, input, admission); await settle();
    h.requests[1]!.resolve("/local/fine.png"); await settle();
    assert.equal(h.render(true, true, input, admission).candidate.imagePath, "/local/fine.png");
    allowed = true;
    assert.equal(h.render(true, true, input, admission).candidate.imagePath, "/local/fine.png");
    assert.equal(h.previewRequests.length, 1, "fine completion permanently closes this identity's optional read");
  } finally { h.unmount(); }
});
